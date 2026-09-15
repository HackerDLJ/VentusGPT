export type LiveStatus = "disconnected" | "connecting" | "connected" | "error";

export type LiveModel = "gemini-3.1-flash-live-preview" | "gemini-3.5-transcribe-live";

export type VentusVoice = "Zephyr" | "Puck" | "Charon" | "Kore" | "Fenrir";
export type GeminiVoice = VentusVoice;

export type AssistantMode = "conversation" | "translate" | "vision" | "code_math" | "creative";

export type LiveLanguage = "auto" | "ta" | "en";

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: "general" | "reminder" | "action_item" | "idea";
  timestamp: string;
}

export interface GeneratedImageItem {
  id: string;
  prompt: string;
  imageUrl: string;
  timestamp: string;
}

export interface WebSource {
  title: string;
  uri: string;
}

export interface TranscriptItem {
  id: string;
  role: "user" | "model" | "system" | "tool";
  text: string;
  timestamp: string;
  toolName?: string;
  toolResult?: any;
  sources?: WebSource[];
  imageUrl?: string;
  audio?: string;
  userImage?: string;
}

export interface LiveSettings {
  model: LiveModel;
  voice: VentusVoice;
  systemInstruction: string;
  targetLanguageCode: string;
  language?: LiveLanguage;
  fps: number;
  mediaResolution?: "MEDIA_RESOLUTION_LOW" | "MEDIA_RESOLUTION_MEDIUM" | "MEDIA_RESOLUTION_HIGH";
}

export interface SevereWeatherAlert {
  active: boolean;
  severity: "WARNING" | "WATCH" | "ADVISORY";
  title: string;
  description: string;
  metric: string;
  currentValue: number | string;
  threshold: number | string;
  actionAdvice?: string;
}

export interface WeatherData {
  location: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  windSpeed: number; // km/h
  windGusts?: number; // km/h
  windDirection: string;
  humidity: number; // %
  barometricPressure: string; // e.g. "1004 hPa"
  precipitationProbability: number; // %
  uvIndex: number;
  timestamp: string;
  alert?: SevereWeatherAlert | null;
  summary?: string;
}
