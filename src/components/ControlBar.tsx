import React, { useState, useRef } from "react";
import {
  Mic,
  Camera,
  CameraOff,
  Monitor,
  Square,
  Send,
  Languages,
  Sparkles,
  Paperclip,
  X,
  Volume2,
  ChevronDown,
  Code2,
  Palette,
  Eye,
  MessageSquare,
} from "lucide-react";
import { VentusVoice, LiveStatus, AssistantMode } from "../types";

interface ControlBarProps {
  status: LiveStatus;
  onToggleConnect: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  videoMode: "none" | "camera" | "screen";
  onToggleCamera: () => void;
  onToggleScreen: () => void;
  onInterrupt: () => void;
  isSpeaking: boolean;
  selectedVoice: VentusVoice;
  onSelectVoice: (voice: VentusVoice) => void;
  mode: AssistantMode;
  onSelectMode: (mode: AssistantMode) => void;
  onSendTextMessage: (text: string, imageBase64?: string) => void;
  onOpenSettings: () => void;
  isTamil: boolean;
  onToggleTamil: () => void;
}

const VOICES: { id: VentusVoice; label: string; desc: string }[] = [
  { id: "Zephyr", label: "Zephyr", desc: "Warm & Balanced" },
  { id: "Puck", label: "Puck", desc: "Energetic & Upbeat" },
  { id: "Charon", label: "Charon", desc: "Deep & Authoritative" },
  { id: "Kore", label: "Kore", desc: "Gentle & Calm" },
  { id: "Fenrir", label: "Fenrir", desc: "Crisp & Focused" },
];

const MODES: { id: AssistantMode; label: string; labelTa: string; icon: any }[] = [
  { id: "conversation", label: "Conversation", labelTa: "உரையாடல்", icon: MessageSquare },
  { id: "vision", label: "Vision", labelTa: "காட்சி பகுப்பாய்வு", icon: Eye },
  { id: "translate", label: "Live Translate", labelTa: "நேரடி மொழிபெயர்ப்பு", icon: Languages },
  { id: "code_math", label: "Code & Math", labelTa: "குறியீடு & கணிதம்", icon: Code2 },
  { id: "creative", label: "Creative Studio", labelTa: "படைப்பாற்றல்", icon: Palette },
];

export const ControlBar: React.FC<ControlBarProps> = ({
  status,
  onToggleConnect,
  isMuted,
  onToggleMute,
  videoMode,
  onToggleCamera,
  onToggleScreen,
  onInterrupt,
  isSpeaking,
  selectedVoice,
  onSelectVoice,
  mode,
  onSelectMode,
  onSendTextMessage,
  onOpenSettings,
  isTamil,
  onToggleTamil,
}) => {
  const [inputText, setInputText] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedImage) return;
    onSendTextMessage(inputText.trim() || (isTamil ? "இந்த படத்தைப் பற்றி விளக்குங்கள்" : "Analyze this image"), attachedImage || undefined);
    setInputText("");
    setAttachedImage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      setAttachedImage(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div
      id="control-bar"
      className="w-full bg-[#1e1f20]/95 border border-white/10 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 backdrop-blur-2xl shadow-2xl transition-all"
    >
      {/* Attached image preview pill */}
      {attachedImage && (
        <div className="mb-2 flex items-center gap-2 p-1.5 bg-[#131314] rounded-xl border border-purple-500/30 w-fit animate-fadeIn">
          <img
            src={`data:image/jpeg;base64,${attachedImage}`}
            alt="Upload thumbnail"
            className="w-10 h-10 object-cover rounded-lg border border-white/10"
          />
          <div className="text-[11px] pr-2">
            <p className="text-slate-200 font-medium">{isTamil ? "படம் இணைக்கப்பட்டுள்ளது" : "Image attached"}</p>
            <p className="text-slate-400 text-[10px]">{isTamil ? "VentusGPT பகுப்பாய்வு செய்யும்" : "VentusGPT will inspect this"}</p>
          </div>
          <button
            type="button"
            onClick={() => setAttachedImage(null)}
            className="p-1 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top micro-bar: Mode selector, Voice selector, Tamil toggle */}
      <div className="flex items-center justify-between gap-1 mb-2 px-1 text-xs">
        {/* Assistant Mode Pills */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectMode(m.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap ${
                  active
                    ? "bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon className={`w-3 h-3 ${active ? "text-purple-400" : "text-slate-400"}`} />
                <span>{isTamil ? m.labelTa : m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Voice selector dropdown button */}
        <div className="relative shrink-0 hidden md:block">
          <button
            type="button"
            onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 border border-white/10 transition-colors"
          >
            <Volume2 className="w-3 h-3 text-purple-400" />
            <span className="font-medium">{selectedVoice}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {showVoiceDropdown && (
            <div className="absolute right-0 bottom-8 mb-1 w-44 bg-[#1e1f20] border border-white/10 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
              <div className="px-3 py-1 text-[10px] uppercase font-semibold text-slate-400 border-b border-white/5">
                Ventus Voice
              </div>
              {VOICES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    onSelectVoice(v.id);
                    setShowVoiceDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-white/5 transition-colors ${
                    selectedVoice === v.id ? "text-purple-300 bg-purple-600/20 font-medium" : "text-slate-300"
                  }`}
                >
                  <div>
                    <div>{v.label}</div>
                    <div className="text-[10px] text-slate-500">{v.desc}</div>
                  </div>
                  {selectedVoice === v.id && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main VentusGPT Floating Input Form */}
      <form onSubmit={handleSend} className="flex items-center gap-2">
        {/* Hidden file input for image uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Media Buttons: Image Attach, Camera, Screen */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Attach Image button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title={isTamil ? "படம் இணைக்கவும்" : "Attach image for visual inspection"}
            className={`p-2 sm:p-2.5 rounded-xl text-xs transition-all ${
              attachedImage
                ? "bg-purple-600/30 text-purple-300 border border-purple-500/50"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Camera toggle */}
          <button
            type="button"
            onClick={onToggleCamera}
            title={videoMode === "camera" ? "Turn off camera" : "Share live camera with VentusGPT"}
            className={`p-2 sm:p-2.5 rounded-xl text-xs transition-all ${
              videoMode === "camera"
                ? "bg-purple-600/30 text-purple-300 border border-purple-500/50"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            {videoMode === "camera" ? (
              <CameraOff className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
            ) : (
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>

          {/* Screen Share toggle */}
          <button
            type="button"
            onClick={onToggleScreen}
            title={videoMode === "screen" ? "Stop screen share" : "Share live screen with VentusGPT"}
            className={`hidden sm:flex p-2 sm:p-2.5 rounded-xl text-xs transition-all ${
              videoMode === "screen"
                ? "bg-purple-600/30 text-purple-300 border border-purple-500/50"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Text Input Field */}
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isTamil
                ? "VentusGPT-யிடம் தமிழில் கேளுங்கள் அல்லது பேசவும்..."
                : isConnected
                ? "Ask VentusGPT anything or speak aloud..."
                : "Ask VentusGPT anything in English or தமிழ்..."
            }
            className="w-full bg-[#131314]/80 border border-white/5 focus:border-purple-500/60 rounded-xl sm:rounded-2xl px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-all shadow-inner"
          />
        </div>

        {/* Quick Language Toggle Pill */}
        <button
          type="button"
          onClick={onToggleTamil}
          title={isTamil ? "Switch to English" : "தமிழுக்கு மாற்றவும்"}
          className={`shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
            isTamil
              ? "bg-purple-900/40 border-purple-500/60 text-purple-200"
              : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10"
          }`}
        >
          <Languages className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-semibold">{isTamil ? "தமிழ்" : "EN"}</span>
        </button>

        {/* Send text button if there is text or attached image */}
        {inputText.trim() || attachedImage ? (
          <button
            type="submit"
            className="p-2 sm:p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors shrink-0 shadow-md shadow-purple-900/30"
            title="Send prompt"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        ) : (
          /* Prominent VentusGPT Mic Button */
          <button
            type="button"
            onClick={onToggleConnect}
            title={
              isConnected
                ? "Disconnect VentusGPT"
                : isConnecting
                ? "Connecting..."
                : "Start VentusGPT Voice"
            }
            className={`p-2 sm:p-2.5 rounded-full transition-all shrink-0 flex items-center justify-center ${
              isConnected
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 ring-2 ring-purple-400/40 animate-pulse"
                : isConnecting
                ? "bg-blue-600 text-white animate-spin"
                : "bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/10"
            }`}
          >
            <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* Interrupt Button: appears when VentusGPT is actively speaking */}
        {isSpeaking && (
          <button
            type="button"
            onClick={onInterrupt}
            title="Interrupt VentusGPT (Spacebar)"
            className="p-2 rounded-xl bg-red-600/90 hover:bg-red-500 text-white text-xs font-semibold animate-pulse shrink-0 flex items-center gap-1"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span className="hidden md:inline text-[11px]">Stop</span>
          </button>
        )}
      </form>
    </div>
  );
};
