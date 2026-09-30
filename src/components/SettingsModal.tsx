import React from "react";
import { X, Sparkles, Volume2, Languages, Cpu, Check, ShieldCheck } from "lucide-react";
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
  hasApiKey,
}) => {
  const [localSettings, setLocalSettings] = React.useState<LiveSettings>(settings);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const languages = [
    { code: "auto", name: "Auto detect / multilingual" },
    { code: "ta", name: "தமிழ் (Tamil)" },
    { code: "en", name: "English" },
    { code: "hi", name: "Hindi (हिन्दी)" },
    { code: "ml", name: "Malayalam (മലയാളം)" },
    { code: "te", name: "Telugu (తెలుగు)" },
    { code: "kn", name: "Kannada (ಕನ್ನಡ)" },
    { code: "bn", name: "Bengali (বাংলা)" },
    { code: "mr", name: "Marathi (मराठी)" },
    { code: "es", name: "Spanish (Español)" },
    { code: "fr", name: "French (Français)" },
    { code: "de", name: "German (Deutsch)" },
    { code: "ja", name: "Japanese (日本語)" },
    { code: "zh", name: "Chinese (中文)" },
    { code: "ko", name: "Korean (한국어)" },
  ];

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-lg bg-[#0b0b0d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3">
            <VentusLogo size={28} />
            <div>
              <h2 className="text-sm font-semibold text-white">Ventus Live Settings</h2>
              <p className="text-[10px] text-slate-500">Voice, language and model controls</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto text-xs text-slate-300">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2424FF]" />
              <div>
                <p className="font-medium text-white">Python Live Backend</p>
                <p className="text-[11px] text-slate-500">
                  {hasApiKey ? "Gemini Live + native audio + multilingual conversation" : "GEMINI_API_KEY not detected"}
                </p>
              </div>
            </div>
            <span className={`text-[10px] px-2 py-1 rounded-full border ${hasApiKey ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" : "text-red-300 border-red-500/30 bg-red-500/10"}`}>
              {hasApiKey ? "READY" : "OFFLINE"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#2424FF]/10 border border-[#2424FF]/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#2424FF]/15 flex items-center justify-center text-[#8b8bff] font-bold">த</div>
              <div>
                <p className="text-xs font-semibold text-white">Tamil + multilingual voice</p>
                <p className="text-[11px] text-slate-500">Ventus automatically follows the language you speak.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLocalSettings({ ...localSettings, targetLanguageCode: localSettings.targetLanguageCode === "ta" ? "auto" : "ta" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${localSettings.targetLanguageCode === "ta" ? "bg-[#2424FF] text-white" : "bg-white/10 text-slate-300"}`}
            >
              {localSettings.targetLanguageCode === "ta" ? "தமிழ் ON" : "AUTO"}
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-white flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5 text-[#5f5fff]" /> Ventus Voice</label>
            <div className="grid grid-cols-5 gap-2">
              {(["Zephyr", "Puck", "Charon", "Kore", "Fenrir"] as VentusVoice[]).map((v) => (
                <button key={v} type="button" onClick={() => setLocalSettings({ ...localSettings, voice: v })} className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${localSettings.voice === v ? "bg-[#2424FF]/15 border-[#2424FF] text-white" : "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white"}`}>{v}</button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-white flex items-center gap-1.5"><Languages className="w-3.5 h-3.5 text-[#5f5fff]" /> Primary language preference</label>
            <select value={localSettings.targetLanguageCode} onChange={(e) => setLocalSettings({ ...localSettings, targetLanguageCode: e.target.value })} className="w-full bg-[#101014] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2424FF]">
              {languages.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-white flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-[#5f5fff]" /> Live model</label>
            <select value={localSettings.model} onChange={(e) => setLocalSettings({ ...localSettings, model: e.target.value as LiveModel })} className="w-full bg-[#101014] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2424FF]">
              <option value="gemini-3.8-live">Gemini 3.8 Live · current low-latency voice model</option>
              <option value="gemini-3.1-flash-live-preview">Gemini 3.1 Flash Live · legacy compatibility</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-white flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-[#5f5fff]" /> Custom instructions</label>
            <textarea rows={4} value={localSettings.systemInstruction} onChange={(e) => setLocalSettings({ ...localSettings, systemInstruction: e.target.value })} className="w-full bg-[#101014] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#2424FF]" placeholder="Guide VentusGPT's personality and behavior..." />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/10 bg-black/40">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2424FF] hover:bg-[#3535ff] text-white flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Apply</button>
        </div>
      </div>
    </div>
  );
};
