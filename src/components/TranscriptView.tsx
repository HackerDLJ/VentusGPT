import React, { useRef, useEffect, useState } from "react";
import {
  User,
  Sparkles,
  Search,
  ExternalLink,
  Code2,
  Image as ImageIcon,
  Copy,
  Trash2,
  Download,
  Volume2,
  VolumeX,
  Check,
  Loader2,
  Play,
  Pause,
  Wind,
  CloudRain,
  AlertTriangle,
  Thermometer,
  Droplets,
} from "lucide-react";
import { TranscriptItem } from "../types";
import { VentusLogo } from "./VentusLogo";

interface TranscriptViewProps {
  transcripts: TranscriptItem[];
  liveCaption: string | null;
  onClear: () => void;
  onPlayAudio?: (text: string) => void;
  onSelectPrompt?: (prompt: string) => void;
  isTamil?: boolean;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  transcripts,
  liveCaption,
  onClear,
  onPlayAudio,
  onSelectPrompt,
  isTamil = false,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts, liveCaption]);

  const copyItemText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAllTranscripts = () => {
    const text = transcripts
      .map((t) => `[${t.timestamp}] ${t.role.toUpperCase()}: ${t.text}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
  };

  const exportTranscript = () => {
    const data = JSON.stringify(transcripts, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ventusgpt-transcript-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTogglePlay = (id: string, text: string) => {
    if (playingId === id) {
      // Toggle off / pause
      setPlayingId(null);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    setPlayingId(id);

    if (onPlayAudio) {
      onPlayAudio(text);
    } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (isTamil) utterance.lang = "ta-IN";
      utterance.onend = () => setPlayingId(null);
      utterance.onerror = () => setPlayingId(null);
      window.speechSynthesis.speak(utterance);
    }

    // Dynamic timeout matching sentence length
    const words = text.trim().split(/\s+/).length;
    const durationMs = Math.max(3500, Math.min(30000, words * 380));
    setTimeout(() => {
      setPlayingId((curr) => (curr === id ? null : curr));
    }, durationMs);
  };

  const sampleTamilPrompts = [
    { label: "வணக்கம் VentusGPT!", prompt: "வணக்கம்! நீங்கள் யார்? உங்கள் அறிமுகத்தை தமிழில் கூறுங்கள்." },
    { label: "திருக்குறள்", prompt: "ஒரு நல்ல திருக்குறள் மற்றும் அதன் எளிய விளக்கத்தைக் கூறு." },
    { label: "வானிலை & செய்தி", prompt: "இன்றைய முக்கிய உலகச் செய்திகளை தமிழில் சுருக்கமாகக் கூறு." },
    { label: "கதை சொல்", prompt: "தமிழில் ஒரு சுவாரசியமான சிறுகதை கூறுங்கள்." },
  ];

  const sampleEnglishPrompts = [
    { label: "Who are you?", prompt: "Who are you? Introduce yourself." },
    { label: "Today's News", prompt: "What are the latest scientific discoveries this week?" },
    { label: "Creative Story", prompt: "Tell me a short science fiction story about space exploration." },
    { label: "Translate to Tamil", prompt: "Translate 'Welcome to our home, let us share a meal together' to poetic Tamil." },
  ];

  const suggestions = isTamil ? sampleTamilPrompts : sampleEnglishPrompts;

  return (
    <div
      id="transcript-container"
      className="flex flex-col h-full bg-[#1e1f20]/90 rounded-2xl border border-white/10 backdrop-blur-xl overflow-hidden shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#131314]/60">
        <div className="flex items-center gap-2">
          {/* Ventus Logo */}
          <VentusLogo size={20} />
          <h3 className="text-xs font-semibold text-slate-200 tracking-wide">
            {isTamil ? "உரையாடல் வரலாறு" : "Conversation & Activity"}
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-mono">
            {transcripts.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="btn-copy-transcript"
            onClick={copyAllTranscripts}
            title={isTamil ? "அனைத்தையும் நகலெடு" : "Copy full transcript"}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-export-transcript"
            onClick={exportTranscript}
            title={isTamil ? "பதிவிறக்கு" : "Export JSON"}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-clear-transcript"
            onClick={onClear}
            title={isTamil ? "அழி" : "Clear transcripts"}
            className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm scrollbar-thin scrollbar-thumb-slate-700">
        {transcripts.length === 0 && !liveCaption && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            {/* Official Full Project Logo */}
            <div className="mb-3">
              <VentusLogo
                variant="full"
                size={116}
                className="shadow-2xl hover:scale-105 transition-transform duration-300"
                title="VentusGPT Full Project Logo"
              />
            </div>
            <p className="text-sm font-semibold text-slate-200">
              {isTamil ? "VentusGPT-யுடன் தமிழில் பேசலாம் அல்லது கேட்கலாம்" : "Chat or talk with VentusGPT"}
            </p>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
              {isTamil
                ? "கீழுள்ள பரிந்துரைகளில் ஒன்றைத் தட்டவும் அல்லது உங்கள் கேள்வியை தமிழில் தட்டச்சு செய்யவும்."
                : "Type anything in English or Tamil, or click the mic to talk with VentusGPT."}
            </p>

            {/* Quick Suggestion Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-md">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectPrompt && onSelectPrompt(s.prompt)}
                  className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 text-xs text-slate-300 transition-all text-left flex items-center gap-1.5 group"
                >
                  <Sparkles className="w-3 h-3 text-purple-400 group-hover:rotate-12 transition-transform" />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {transcripts.map((item) => {
          const isUser = item.role === "user";
          const isTool = item.role === "tool";

          return (
            <div
              key={item.id}
              className={`flex items-start gap-2.5 ${
                isUser ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 overflow-hidden ${
                  isUser
                    ? "bg-gradient-to-tr from-cyan-600 to-blue-600 text-white"
                    : isTool
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "shadow-sm"
                }`}
              >
                {isUser ? (
                  <User className="w-3.5 h-3.5" />
                ) : isTool ? (
                  <Code2 className="w-3.5 h-3.5" />
                ) : (
                  <VentusLogo size={28} />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 group relative ${
                  isUser
                    ? "bg-[#2b2d31] text-slate-100 rounded-tr-sm border border-white/5"
                    : isTool
                    ? "bg-amber-950/30 border border-amber-800/40 text-amber-100 rounded-tl-sm"
                    : "bg-[#1e1f20] border border-white/10 text-slate-200 rounded-tl-sm shadow-md"
                }`}
              >
                {/* Meta Header */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    {isUser
                      ? isTamil
                        ? "நீங்கள்"
                        : "You"
                      : isTool
                      ? `கருவி: ${item.toolName}`
                      : "VentusGPT"}
                  </span>
                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] text-slate-500">{item.timestamp}</span>
                    <button
                      onClick={() => copyItemText(item.id, item.text)}
                      title="Copy text"
                      className="p-1 hover:text-white rounded"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    {!isUser && !isTool && (
                      <button
                        onClick={() => handleTogglePlay(item.id, item.text)}
                        title={isTamil ? "மீண்டும் கேட்க" : "Re-listen to answer"}
                        className={`p-1 rounded transition-colors flex items-center justify-center ${
                          playingId === item.id
                            ? "text-purple-400 bg-purple-950/60 ring-1 ring-purple-500"
                            : "hover:text-white text-slate-400"
                        }`}
                      >
                        {playingId === item.id ? (
                          <Pause className="w-3 h-3 fill-purple-400" />
                        ) : (
                          <Play className="w-3 h-3 fill-current" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* User attached image */}
                {item.userImage && (
                  <div className="mb-2 rounded-xl overflow-hidden border border-white/10 max-w-xs">
                    <img
                      src={item.userImage}
                      alt="User attachment"
                      className="w-full max-h-48 object-cover"
                    />
                  </div>
                )}

                {/* Body Text */}
                <p className="whitespace-pre-wrap leading-relaxed text-[13px] sm:text-sm font-normal">
                  {item.text}
                </p>

                {/* Re-listen Button for Previous Model Responses */}
                {!isUser && !isTool && (
                  <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
                    <button
                      onClick={() => handleTogglePlay(item.id, item.text)}
                      title={isTamil ? "இந்த பதிலை மீண்டும் கேட்கவும்" : "Re-listen to this answer"}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                        playingId === item.id
                          ? "bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-sm"
                          : "bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10"
                      }`}
                    >
                      {playingId === item.id ? (
                        <>
                          <Pause className="w-3 h-3 text-purple-400 fill-purple-400" />
                          <span>{isTamil ? "நிறுத்து" : "Playing..."}</span>
                          <span className="flex items-end gap-0.5 ml-1 h-3">
                            <span className="w-0.5 h-2 bg-purple-400 animate-pulse" />
                            <span className="w-0.5 h-3 bg-purple-300 animate-pulse delay-75" />
                            <span className="w-0.5 h-1.5 bg-purple-400 animate-pulse delay-150" />
                          </span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current text-purple-400" />
                          <span>{isTamil ? "மீண்டும் கேட்க" : "Re-listen"}</span>
                        </>
                      )}
                    </button>
                    <span className="text-[10px] text-slate-500">
                      {isTamil ? "குரல் பதில்" : "Assistant Response"}
                    </span>
                  </div>
                )}

                {/* Weather Forecast Card View */}
                {isTool && item.toolName === "getWeatherForecast" && item.toolResult && (
                  <div className="mt-3 p-3 rounded-xl bg-black/40 border border-cyan-500/30 text-slate-200">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <div className="flex items-center gap-1.5">
                        <Wind className="w-4 h-4 text-cyan-400" />
                        <span className="font-semibold text-xs text-white">
                          {item.toolResult.location || "Weather Forecast"}
                        </span>
                      </div>
                      <span className="text-[10px] text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
                        {item.toolResult.condition}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-[11px]">
                      <div className="p-1.5 rounded-lg bg-white/5">
                        <span className="text-slate-400 block text-[9px]">
                          {isTamil ? "வெப்பநிலை" : "Temperature"}
                        </span>
                        <span className="font-bold text-white text-xs">
                          {item.toolResult.temperature}°C
                        </span>
                      </div>
                      <div
                        className={`p-1.5 rounded-lg ${
                          item.toolResult.windSpeed > 40
                            ? "bg-amber-950/60 border border-amber-500/50 text-amber-200"
                            : "bg-white/5"
                        }`}
                      >
                        <span className="text-slate-400 block text-[9px]">
                          {isTamil ? "காற்றின் வேகம்" : "Wind Speed"}
                        </span>
                        <span className="font-bold text-xs flex items-center gap-1">
                          {item.toolResult.windSpeed} km/h
                          {item.toolResult.windSpeed > 40 && (
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                          )}
                        </span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white/5">
                        <span className="text-slate-400 block text-[9px]">
                          {isTamil ? "ஈரப்பதம்" : "Humidity"}
                        </span>
                        <span className="font-bold text-white text-xs">
                          {item.toolResult.humidity}%
                        </span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white/5">
                        <span className="text-slate-400 block text-[9px]">
                          {isTamil ? "அழுத்தம்" : "Pressure"}
                        </span>
                        <span className="font-bold text-white text-xs">
                          {item.toolResult.barometricPressure}
                        </span>
                      </div>
                    </div>

                    {item.toolResult.alert && item.toolResult.alert.active && (
                      <div className="mt-2 p-2 rounded-lg bg-red-950/50 border border-red-500/40 text-red-200 text-[10px]">
                        <span className="font-bold block flex items-center gap-1 text-red-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          {item.toolResult.alert.title}
                        </span>
                        <p className="mt-0.5 text-red-200/90 leading-tight">
                          {item.toolResult.alert.description}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Grounded Search Sources */}
                {item.sources && item.sources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-white/10">
                    <div className="flex items-center gap-1 text-[11px] text-cyan-400 font-medium mb-1.5">
                      <Search className="w-3 h-3" />
                      <span>{isTamil ? "ஆதாரங்கள்:" : "Sources:"}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.sources.map((src, i) => (
                        <a
                          key={i}
                          href={src.uri}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 text-[10px] bg-white/5 hover:bg-white/10 text-slate-300 px-2 py-1 rounded-lg border border-white/10 transition-colors"
                        >
                          <span className="truncate max-w-[150px]">{src.title || src.uri}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generated Image Preview */}
                {item.imageUrl && (
                  <div className="mt-2.5 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                    <img
                      src={item.imageUrl}
                      alt="Generated by VentusGPT"
                      className="w-full max-h-72 object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <div className="p-2 flex items-center justify-between text-[11px] text-slate-400 bg-[#131314]/80">
                      <span className="flex items-center gap-1 truncate">
                        <ImageIcon className="w-3 h-3 text-purple-400" />
                        {isTamil ? "உருவாக்கப்பட்ட படம்" : "Generated Visual"}
                      </span>
                      <a
                        href={item.imageUrl}
                        download="gemini-image.png"
                        className="text-purple-400 hover:text-purple-300 text-[10px] font-medium"
                      >
                        {isTamil ? "சேமி" : "Save"}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Live streaming subtitle caption */}
        {liveCaption && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-purple-900/50 text-purple-300 border border-purple-500/30">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-2.5 bg-purple-950/40 border border-purple-500/30 text-purple-100 animate-pulse">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-purple-400 block mb-0.5">
                {isTamil ? "நேரலை வசனம்" : "Live Subtitle"}
              </span>
              <p className="text-[13px]">{liveCaption}</p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
