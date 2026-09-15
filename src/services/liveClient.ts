import { WeatherData } from "../types";
import { checkWeatherThresholds, formatLiveCaptionAlert } from "./weatherAlertService";

/**
 * LiveClient: Robust client transport for VentusGPT Live Voice & Multimodal Assistant.
 * Uses HTTP Server-Sent Events (SSE) + HTTP POST for real-time bidirectional streaming.
 */

/**
 * Client tool function: Fetches comprehensive meteorological data from the mock weather API.
 */
export async function getWeatherForecast(location: string = "Chennai"): Promise<WeatherData> {
  const res = await fetch(`/api/weather/forecast?location=${encodeURIComponent(location)}`);
  if (!res.ok) {
    throw new Error(`Weather service returned HTTP ${res.status}`);
  }
  return (await res.json()) as WeatherData;
}

export interface LiveClientOptions {
  model?: string;
  voice?: string;
  systemInstruction?: string;
  targetLanguageCode?: string;
  history?: Array<{ role: string; text: string }>;
}

export interface LiveClientCallbacks {
  onReady: (info: { sessionId: string; model: string; voice: string }) => void;
  onAudioChunk: (base64Audio: string) => void;
  onModelText: (text: string) => void;
  onCaption: (caption: string) => void;
  onUserTranscription?: (text: string, finished: boolean) => void;
  onInterrupted: () => void;
  onTurnComplete: () => void;
  onToolInvoked: (tool: { id: string; name: string; args: any; status: string }) => void;
  onToolResult: (result: { id: string; name: string; result: any }) => void;
  onError: (errorMsg: string) => void;
  onClose: (reason?: string) => void;
}

export class LiveClient {
  private sessionId: string | null = null;
  private eventSource: EventSource | null = null;
  private callbacks: LiveClientCallbacks;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private currentLanguageCode: string = "en";

  // Queue to send audio without flooding HTTP connections
  private audioQueue: string[] = [];
  private isSendingAudio: boolean = false;

  constructor(callbacks: LiveClientCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Connect to Gemini Live
   */
  async connect(options: LiveClientOptions): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      this.disconnect();
    }

    this.isConnecting = true;
    this.currentLanguageCode = options.targetLanguageCode || "en";

    try {
      // 1. Start live session on server
      const startRes = await fetch("/api/live/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: options.model || "gemini-3.1-flash-live-preview",
          voice: options.voice || "Zephyr",
          systemInstruction: options.systemInstruction,
          targetLanguageCode: options.targetLanguageCode,
          history: options.history,
        }),
      });

      if (!startRes.ok) {
        let errMessage = "Failed to start live session";
        try {
          const errData = await startRes.json();
          errMessage = errData.error || errMessage;
        } catch {
          // ignore
        }
        throw new Error(errMessage);
      }

      const startData = await startRes.json();
      this.sessionId = startData.sessionId;

      // 2. Open Server-Sent Events stream for model responses
      const sseUrl = `/api/live/session/${this.sessionId}/events`;
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
      };

      this.eventSource.onmessage = (e) => {
        if (!e.data) return;
        try {
          const msg = JSON.parse(e.data);

          switch (msg.type) {
            case "ready":
              this.callbacks.onReady({
                sessionId: msg.sessionId || this.sessionId,
                model: msg.model || options.model || "gemini-3.1-flash-live-preview",
                voice: msg.voice || options.voice || "Zephyr",
              });
              break;

            case "audio":
              if (msg.audio) {
                this.callbacks.onAudioChunk(msg.audio);
              }
              break;

            case "model_text":
              if (msg.text) {
                this.callbacks.onModelText(msg.text);
              }
              break;

            case "caption":
              if (msg.text) {
                this.callbacks.onCaption(msg.text);
              }
              break;

            case "user_transcription":
              if (msg.text && this.callbacks.onUserTranscription) {
                this.callbacks.onUserTranscription(msg.text, !!msg.finished);
              }
              break;

            case "interrupted":
              this.callbacks.onInterrupted();
              break;

            case "turn_complete":
              this.callbacks.onTurnComplete();
              break;

            case "tool_invoked":
              this.callbacks.onToolInvoked({
                id: msg.id,
                name: msg.name,
                args: msg.args,
                status: msg.status || "executing",
              });
              break;

            case "tool_result": {
              this.callbacks.onToolResult({
                id: msg.id,
                name: msg.name,
                result: msg.result,
              });

              // Proactive Weather Threshold Alert Module
              if (msg.name === "getWeatherForecast" && msg.result) {
                const weatherData = msg.result as WeatherData;
                const alert = checkWeatherThresholds(weatherData) || weatherData.alert;
                if (alert && alert.active) {
                  const isTamil =
                    this.currentLanguageCode === "ta" || this.currentLanguageCode === "ta-IN";
                  const captionWarning = formatLiveCaptionAlert(alert, weatherData.location, isTamil);
                  console.warn("VentusGPT Proactive Severe Weather Alert Triggered:", captionWarning);
                  // Direct notification through the liveCaption system
                  this.callbacks.onCaption(captionWarning);
                }
              }
              break;
            }

            case "session_error":
              this.callbacks.onError(msg.error || "VentusGPT session error occurred.");
              break;

            case "session_closed":
              this.callbacks.onClose(msg.reason);
              this.disconnect();
              break;

            default:
              break;
          }
        } catch (parseErr) {
          console.error("Error parsing Live SSE event:", parseErr, e.data);
        }
      };

      this.eventSource.onerror = (err) => {
        // EventSource automatically retries if the connection drops.
        // Only trigger disconnect/error if it explicitly closes.
        if (this.eventSource && this.eventSource.readyState === EventSource.CLOSED) {
          console.warn("Live stream SSE connection closed:", err);
          if (this.isConnected) {
            this.callbacks.onClose("Live session ended");
          } else if (this.isConnecting) {
            this.callbacks.onError("Could not establish live connection. Verify network or API key.");
          }
          this.disconnect();
        } else {
          console.log("Live stream SSE reconnecting...");
        }
      };
    } catch (err: any) {
      this.isConnecting = false;
      this.isConnected = false;
      console.error("LiveClient connection error:", err);
      this.callbacks.onError(
        err.message || "Failed to start VentusGPT voice session. Verify your GEMINI_API_KEY."
      );
      this.disconnect();
    }
  }

  /**
   * Send microphone audio chunk (base64 PCM 16kHz)
   */
  sendAudioChunk(base64Pcm: string): void {
    if (!this.isConnected || !this.sessionId) return;

    // Cap queue length to avoid lag
    if (this.audioQueue.length > 5) {
      this.audioQueue.splice(0, this.audioQueue.length - 3);
    }
    this.audioQueue.push(base64Pcm);
    this.flushAudioQueue();
  }

  private async flushAudioQueue(): Promise<void> {
    if (this.isSendingAudio || this.audioQueue.length === 0 || !this.sessionId) {
      return;
    }

    this.isSendingAudio = true;
    const chunk = this.audioQueue.shift()!;

    try {
      await fetch(`/api/live/session/${this.sessionId}/input`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "audio",
          audio: chunk,
        }),
      });
    } catch (err) {
      console.error("Failed to send audio chunk:", err);
    } finally {
      this.isSendingAudio = false;
      if (this.audioQueue.length > 0) {
        setTimeout(() => this.flushAudioQueue(), 20);
      }
    }
  }

  /**
   * Send video / screen frame snapshot (base64 JPEG)
   */
  async sendVideoFrame(base64Jpeg: string): Promise<void> {
    if (!this.isConnected || !this.sessionId) return;

    try {
      await fetch(`/api/live/session/${this.sessionId}/input`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "video",
          video: base64Jpeg,
        }),
      });
    } catch (err) {
      console.error("Failed to send video frame:", err);
    }
  }

  /**
   * Send text prompt to the active session
   */
  async sendTextMessage(text: string): Promise<void> {
    if (!this.isConnected || !this.sessionId) return;

    try {
      await fetch(`/api/live/session/${this.sessionId}/input`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "text",
          text,
        }),
      });
    } catch (err) {
      console.error("Failed to send text message:", err);
    }
  }

  /**
   * Signal user interruption or end of audio turn
   */
  async sendInterrupt(): Promise<void> {
    if (!this.isConnected || !this.sessionId) return;
    this.audioQueue = []; // drop pending outgoing audio

    try {
      await fetch(`/api/live/session/${this.sessionId}/input`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "audio_end",
        }),
      });
    } catch (err) {
      console.error("Failed to send interrupt:", err);
    }
  }

  /**
   * Disconnect and clean up session
   */
  disconnect(): void {
    this.isConnected = false;
    this.isConnecting = false;
    this.audioQueue = [];

    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {
        // ignore
      }
      this.eventSource = null;
    }

    if (this.sessionId) {
      const idToStop = this.sessionId;
      this.sessionId = null;
      fetch(`/api/live/session/${idToStop}/stop`, {
        method: "POST",
      }).catch(() => {});
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Directly triggers the getWeatherForecast tool loop and proactively alerts
   * the user via liveCaption if severe thresholds (e.g. wind speed > 40 km/h) are breached.
   */
  async checkWeatherAndAlert(location: string = "Chennai"): Promise<WeatherData> {
    const isTamil = this.currentLanguageCode === "ta" || this.currentLanguageCode === "ta-IN";
    const toolId = "weather-" + Date.now();

    this.callbacks.onToolInvoked({
      id: toolId,
      name: "getWeatherForecast",
      args: { location },
      status: "executing",
    });

    try {
      const data = await getWeatherForecast(location);
      this.callbacks.onToolResult({
        id: toolId,
        name: "getWeatherForecast",
        result: data,
      });

      const alert = checkWeatherThresholds(data) || data.alert;
      if (alert && alert.active) {
        const captionAlert = formatLiveCaptionAlert(alert, data.location, isTamil);
        this.callbacks.onCaption(captionAlert);
      }
      return data;
    } catch (err: any) {
      this.callbacks.onToolResult({
        id: toolId,
        name: "getWeatherForecast",
        result: { error: err.message || "Failed to fetch weather forecast" },
      });
      throw err;
    }
  }
}
