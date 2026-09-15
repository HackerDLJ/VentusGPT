import React from "react";
import { X, Download, ExternalLink, Check, Sparkles } from "lucide-react";
import { VentusLogo } from "./VentusLogo";

interface LogoModalProps {
  isOpen: boolean;
  onClose: () => void;
  isTamil?: boolean;
}

export const LogoModal: React.FC<LogoModalProps> = ({
  isOpen,
  onClose,
  isTamil = false,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopySvgUrl = () => {
    navigator.clipboard.writeText(window.location.origin + "/logo.svg");
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#18191b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#131314]/90">
          <div className="flex items-center gap-2">
            <VentusLogo size={22} />
            <h2 className="text-sm font-semibold text-white tracking-tight">
              {isTamil ? "திட்டத்தின் அதிகாரப்பூர்வ லோகோ" : "Official Project Logo"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center text-center">
          {/* Main Full Logo Visual */}
          <div className="relative group p-2 rounded-2xl bg-gradient-to-b from-white/10 to-transparent border border-white/10 shadow-2xl mb-5">
            <VentusLogo
              variant="full"
              size={280}
              className="rounded-xl shadow-2xl transition-transform duration-300 group-hover:scale-[1.02]"
              title="VentusGPT Full Logo"
            />
          </div>

          <h3 className="text-lg font-bold text-white tracking-tight mb-1">
            VentusGPT
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mb-5">
            {isTamil
              ? "Team JATABELS உருவாக்கிய வானிலை நுண்ணறிவு மற்றும் நேரலை AI குரல் உதவியாளர் பிராண்ட் அடையாளம்."
              : "Meteorological Intelligence & Live Multimodal Voice Assistant by Team JATABELS."}
          </p>

          {/* Design Specifications Grid */}
          <div className="w-full grid grid-cols-2 gap-2 text-left mb-5">
            <div className="p-2.5 rounded-xl bg-[#121315] border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                {isTamil ? "வடிவியல் கூறுகள்" : "Glyph Geometry"}
              </span>
              <p className="text-xs font-medium text-slate-200 mt-0.5">
                {isTamil ? "3 காற்று வேக பார்கள்" : "3 Aerodynamic Chevrons"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                -45° Pill Bars (W-Wing Flow)
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-[#121315] border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                {isTamil ? "வண்ணத் தட்டு" : "Color System"}
              </span>
              <p className="text-xs font-medium text-slate-200 mt-0.5">
                {isTamil ? "ஸ்லேட் முதல் கரி வரை" : "Slate to Deep Charcoal"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                14 Atmospheric Bands
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex items-center gap-2">
            <a
              href="/logo.svg"
              download="VentusGPT-Full-Logo.svg"
              className="flex-1 py-2.5 px-3 rounded-xl bg-white text-slate-900 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-100 active:scale-95 transition-all shadow-lg"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isTamil ? "SVG பதிவிறக்கு" : "Download SVG"}</span>
            </a>

            <button
              onClick={handleCopySvgUrl}
              className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              title="Copy SVG URL link"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">{isTamil ? "நகலெடுக்கப்பட்டது" : "Copied"}</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isTamil ? "இணைப்பு" : "Copy Link"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
