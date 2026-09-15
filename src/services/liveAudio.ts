/**
 * Web Audio engine for Gemini Live API
 * Handles 16kHz microphone capture (PCM16) and 24kHz gapless model audio playback
 */

export class LiveAudioManager {
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;

  private activeSources: AudioBufferSourceNode[] = [];
  private nextStartTime: number = 0;
  private isMuted: boolean = false;

  private onAudioDataCallback: ((base64Pcm: string) => void) | null = null;
  private onUserVolumeCallback: ((volume: number) => void) | null = null;
  private onModelVolumeCallback: ((volume: number) => void) | null = null;
  private onPlaybackEndCallback: (() => void) | null = null;

  private outputAnalyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;

  constructor() {}

  /**
   * Initialize microphone capture (16,000 Hz)
   */
  async startMicrophone(
    onAudioData: (base64Pcm: string) => void,
    onUserVolume?: (volume: number) => void
  ): Promise<void> {
    this.onAudioDataCallback = onAudioData;
    this.onUserVolumeCallback = onUserVolume || null;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioCtx = new AudioCtxClass({ sampleRate: 16000 });

      if (this.inputAudioCtx.state === "suspended") {
        await this.inputAudioCtx.resume();
      }

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });

      this.inputSource = this.inputAudioCtx.createMediaStreamSource(this.micStream);
      // 2048 buffer size gives ~128ms packets at 16kHz
      this.scriptProcessor = this.inputAudioCtx.createScriptProcessor(2048, 1, 1);

      this.scriptProcessor.onaudioprocess = (event) => {
        if (this.isMuted) {
          if (this.onUserVolumeCallback) this.onUserVolumeCallback(0);
          return;
        }

        const channelData = event.inputBuffer.getChannelData(0);

        // Compute RMS volume for visualizer
        let sum = 0;
        for (let i = 0; i < channelData.length; i++) {
          sum += channelData[i] * channelData[i];
        }
        const rms = Math.sqrt(sum / channelData.length);
        if (this.onUserVolumeCallback) {
          // Normalize volume roughly between 0.0 and 1.0
          this.onUserVolumeCallback(Math.min(1, rms * 6));
        }

        // Convert Float32Array to 16-bit PCM little-endian
        const pcm16 = new Int16Array(channelData.length);
        for (let i = 0; i < channelData.length; i++) {
          const s = Math.max(-1, Math.min(1, channelData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Convert to base64
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = "";
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        if (this.onAudioDataCallback) {
          this.onAudioDataCallback(base64);
        }
      };

      this.inputSource.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.inputAudioCtx.destination);
    } catch (err) {
      console.error("Failed to start microphone:", err);
      throw err;
    }
  }

  /**
   * Initialize output audio context (24,000 Hz for Gemini Live audio)
   */
  async ensureOutputContext(
    onModelVolume?: (volume: number) => void,
    onPlaybackEnd?: () => void
  ): Promise<void> {
    this.onModelVolumeCallback = onModelVolume || null;
    this.onPlaybackEndCallback = onPlaybackEnd || null;

    if (!this.outputAudioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.outputAudioCtx = new AudioCtxClass({ sampleRate: 24000 });

      this.outputAnalyser = this.outputAudioCtx.createAnalyser();
      this.outputAnalyser.fftSize = 64;
      this.outputAnalyser.connect(this.outputAudioCtx.destination);

      this.startOutputVolumeMonitor();
    }

    if (this.outputAudioCtx.state === "suspended") {
      await this.outputAudioCtx.resume();
    }
  }

  private startOutputVolumeMonitor() {
    if (!this.outputAnalyser) return;
    const dataArray = new Uint8Array(this.outputAnalyser.frequencyBinCount);

    const checkVolume = () => {
      if (this.outputAnalyser && this.onModelVolumeCallback) {
        this.outputAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / (dataArray.length * 255);
        this.onModelVolumeCallback(avg);
      }
      this.animationFrameId = requestAnimationFrame(checkVolume);
    };

    checkVolume();
  }

  /**
   * Schedule incoming 24kHz PCM chunk for gapless, glitch-free playback
   */
  queueAudioChunk(base64Data: string): void {
    if (!this.outputAudioCtx) return;

    try {
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const audioBuffer = this.outputAudioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = audioBuffer;

      if (this.outputAnalyser) {
        source.connect(this.outputAnalyser);
      } else {
        source.connect(this.outputAudioCtx.destination);
      }

      const currentTime = this.outputAudioCtx.currentTime;
      if (this.nextStartTime < currentTime) {
        // Add minimal 30ms jitter buffer
        this.nextStartTime = currentTime + 0.03;
      }

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.activeSources.push(source);

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
        if (this.activeSources.length === 0 && this.onPlaybackEndCallback) {
          this.onPlaybackEndCallback();
        }
      };
    } catch (err) {
      console.error("Error decoding and playing audio chunk:", err);
    }
  }

  /**
   * Interrupt: cancel active audio sources and clear playback buffer immediately
   */
  interruptPlayback(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // ignore already stopped sources
      }
    }
    this.activeSources = [];
    this.nextStartTime = 0;
    if (this.onModelVolumeCallback) {
      this.onModelVolumeCallback(0);
    }
    if (this.onPlaybackEndCallback) {
      this.onPlaybackEndCallback();
    }
  }

  setMute(mute: boolean): void {
    this.isMuted = mute;
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((track) => {
        track.enabled = !mute;
      });
    }
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Cleanup everything
   */
  cleanup(): void {
    this.interruptPlayback();

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.inputSource) {
      this.inputSource.disconnect();
      this.inputSource = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.inputAudioCtx) {
      this.inputAudioCtx.close().catch(() => {});
      this.inputAudioCtx = null;
    }

    if (this.outputAudioCtx) {
      this.outputAudioCtx.close().catch(() => {});
      this.outputAudioCtx = null;
    }
  }
}
