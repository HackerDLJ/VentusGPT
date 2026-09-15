import React from "react";
import { X, Sparkles, Sliders, Volume2, Languages, Cpu, Check, ShieldCheck } from "lucide-react";
import { VentusVoice, LiveModel, LiveSettings } from "../types";
import { VentusLogo } from "./VentusLogo";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: LiveSettings;
  onSaveSettings: (newSettings: LiveSettings) => void;
  isConnected: boolean;
  hasApiKey: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  isConnected,
  hasApiKey,
}) => {
  const [localSettings, setLocalSettings] = React.useState<LiveSettings>(settings);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  const languages = [
    { code: "ta", name: "தமிழ் (Tamil) - Featured" },
    { code: "en", name: "English (US / Global)" },
    { code: "es", name: "Spanish (Español)" },
    { code: "fr", name: "French (Français)" },
    { code: "de", name: "German (Deutsch)" },
    { code: "ja", name: "Japanese (日本語)" },
    { code: "zh", name: "Chinese (中文)" },
    { code: "hi", name: "Hindi (हिन्दी)" },
    { code: "it", name: "Italian (Italiano)" },
    { code: "pt", name: "Portuguese (Português)" },
    { code: "ko", name: "Korean (한국어)" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#1e1f20] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#131314]/80">
          <div className="flex items-center gap-2.5">
            <VentusLogo size={26} />
            <h2 className="text-sm font-semibold text-slate-100">
              VentusGPT Assistant Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs sm:text-sm text-slate-300">
          {/* Status banner */}
          <div className="p-3 rounded-xl bg-[#131314] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-xs font-medium text-slate-200">VentusGPT Voice & Chat Engine</p>
                <p className="text-[11px] text-slate-400">
                  {hasApiKey
                    ? "Full multimodal capabilities (Voice, Vision, Search Grounding, Tamil)"
                    : "No GEMINI_API_KEY detected"}
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                hasApiKey
                  ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"
                  : "bg-red-950 text-red-400 border border-red-800"
              }`}
            >
              {hasApiKey ? "READY" : "OFFLINE"}
            </span>
          </div>

          {/* Quick Tamil Activation Switch */}
          <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-600/30 flex items-center justify-center text-purple-300 font-bold text-sm">
                த
              </div>
              <div>
                <p className="text-xs font-semibold text-purple-200">
                  தமிழ் மொழி ஆதரவு (Tamil Language Support)
                </p>
                <p className="text-[11px] text-slate-400">
                  Chat, live voice responses & TTS synthesis in native Tamil
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setLocalSettings({
                  ...localSettings,
                  targetLanguageCode:
                    localSettings.targetLanguageCode === "ta" ? "en" : "ta",
                })
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                localSettings.targetLanguageCode === "ta"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-white/10 text-slate-300 hover:bg-white/15"
              }`}
            >
              {localSettings.targetLanguageCode === "ta" ? "இயக்கத்தில் (ON)" : "இயக்கு (Enable)"}
            </button>
          </div>

          {/* Voice Personality */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-purple-400" />
              Ventus Voice Tone
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(["Zephyr", "Puck", "Charon", "Kore", "Fenrir"] as VentusVoice[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setLocalSettings({ ...localSettings, voice: v })}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                    localSettings.voice === v
                      ? "bg-purple-600/30 border-purple-500 text-purple-200 shadow-sm"
                      : "bg-[#131314] border-white/10 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Target Language */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-emerald-400" />
              Primary Language Selection
            </label>
            <select
              value={localSettings.targetLanguageCode}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, targetLanguageCode: e.target.value })
              }
              className="w-full bg-[#131314] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Model Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              VentusGPT Live API Model
            </label>
            <select
              value={localSettings.model}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, model: e.target.value as LiveModel })
              }
              className="w-full bg-[#131314] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="gemini-3.1-flash-live-preview">
                gemini-3.1-flash-live-preview (Recommended: Ultra-fast Voice & Multimodal)
              </option>
              <option value="gemini-3.5-transcribe-live">
                gemini-3.5-transcribe-live (Specialized Speech Translation)
              </option>
            </select>
          </div>

          {/* System Instructions */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Custom Instructions
            </label>
            <textarea
              rows={3}
              value={localSettings.systemInstruction}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, systemInstruction: e.target.value })
              }
              className="w-full bg-[#131314] border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              placeholder="Guide VentusGPT's persona, tone, style, and behavior..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/10 bg-[#131314]/80">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 transition-colors shadow-lg shadow-purple-900/40"
          >
            <Check className="w-3.5 h-3.5" />
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
