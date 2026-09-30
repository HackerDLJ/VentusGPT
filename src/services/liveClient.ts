export interface LiveClientOptions {
  model?: string;
  voice?: string;
  systemInstruction?: string;
  targetLanguageCode?: string;
  history?: Array<{ role: string; text: string }>;
}

export interface LiveClientCallbacks {
  onReady: (info: { sessionId: string; model: string; voice: string }) => void;
  onAudioChunk: (audio: string) => void;
  onModelText: (text: string) => void;
  onCaption: (caption: string) => void;
  onUserTranscription?: (text: string, finished: boolean) => void;
  onInterrupted: () => void;
  onTurnComplete: () => void;
  onToolInvoked: (tool: { id: string; name: string; args: any; status: string }) => void;
  onToolResult: (result: { id: string; name: string; result: any }) => void;
  onError: (error: string) => void;
  onClose: (reason?: string) => void;
}

const IDENTITY = "I'm VentusGPT, created by Team JATABELS.";
const DEFAULT_MODEL = "gemini-3.8-live";
const DEFAULT_VOICE = "Zephyr";

export class LiveClient {
  private socket: WebSocket | null = null;
  private callbacks: LiveClientCallbacks;
  private isConnected = false;
  private isConnecting = false;
  private currentLanguageCode = "auto";

  constructor(callbacks: LiveClientCallbacks) {
    this.callbacks = callbacks;
  }

  async connect(options: LiveClientOptions) {
    this.disconnect();
    this.isConnecting = true;
    this.currentLanguageCode = options.targetLanguageCode || "auto";

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/api/live/ws`;

    const instruction = `${IDENTITY}
You are Ventus Live, the real-time conversational interface of VentusGPT.
Speak naturally, warmly and expressively. Sound like a real conversational partner, not a voice-over or a written report. Vary pacing and sentence length, use brief natural acknowledgements when they fit, and respond to the user's emotional tone without becoming theatrical.
Detect the user's language automatically. Reply in that language and switch languages immediately when the user switches. Tamil and English should sound natural and fluent, including mixed Tamil-English conversation. Do not translate unless asked.
Keep normal voice replies concise. Give structured detail only when the user asks for it.
${options.systemInstruction || ""}`;

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(url);
      this.socket = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({
          type: "start",
          model: options.model || DEFAULT_MODEL,
          voice: options.voice || DEFAULT_VOICE,
          systemInstruction: instruction,
          targetLanguageCode: options.targetLanguageCode || "auto",
          history: options.history || [],
        }));
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          switch (message.type) {
            case "backend_ready":
              break;
            case "ready":
              this.isConnected = true;
              this.isConnecting = false;
              this.callbacks.onReady({
                sessionId: "python-live-websocket",
                model: message.model || DEFAULT_MODEL,
                voice: message.voice || options.voice || DEFAULT_VOICE,
              });
              resolve();
              break;
            case "audio":
              if (message.audio) this.callbacks.onAudioChunk(message.audio);
              break;
            case "model_text":
              if (message.text) this.callbacks.onModelText(message.text);
              break;
            case "caption":
              if (message.text) this.callbacks.onCaption(message.text);
              break;
            case "user_transcription":
              if (message.text && this.callbacks.onUserTranscription) {
                this.callbacks.onUserTranscription(message.text, true);
              }
              break;
            case "interrupted":
              this.callbacks.onInterrupted();
              break;
            case "turn_complete":
              this.callbacks.onTurnComplete();
              break;
            case "interaction_status":
              if (message.status === "IN_PROGRESS") {
                this.callbacks.onToolInvoked({
                  id: "interaction",
                  name: "Thinking",
                  args: {},
                  status: "running",
                });
              }
              break;
            case "session_error":
              this.callbacks.onError(message.error || "Ventus Live session error");
              break;
          }
        } catch (error) {
          console.error("Ventus Live message error", error);
        }
      };

      socket.onerror = () => {
        const message = "Ventus Live could not connect to the Python backend.";
        this.isConnecting = false;
        if (!this.isConnected) reject(new Error(message));
        this.callbacks.onError(message);
      };

      socket.onclose = (event) => {
        const wasConnected = this.isConnected;
        this.isConnected = false;
        this.isConnecting = false;
        this.socket = null;
        if (!wasConnected) reject(new Error(event.reason || "Ventus Live connection closed"));
        else this.callbacks.onClose(event.reason || "Live session ended");
      };
    });
  }

  sendAudioChunk(base64Pcm: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "audio", audio: base64Pcm }));
    }
  }

  async sendVideoFrame(base64Jpeg: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "video", video: base64Jpeg }));
    }
  }

  async sendTextMessage(text: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "text", text }));
    }
  }

  async sendInterrupt() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "interrupt" }));
      this.socket.send(JSON.stringify({ type: "audio_end" }));
    }
  }

  disconnect() {
    this.isConnected = false;
    this.isConnecting = false;
    if (this.socket) {
      try {
        if (this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: "audio_end" }));
        }
        this.socket.close(1000, "Client disconnected");
      } catch {
        // Socket may already be closed.
      }
      this.socket = null;
    }
  }

  get connected() {
    return this.isConnected;
  }
}
