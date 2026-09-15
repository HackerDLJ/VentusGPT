import React, { useState } from "react";
import {
  Bookmark,
  Image as ImageIcon,
  Sparkles,
  Search,
  Code2,
  Trash2,
  Send,
  Loader2,
  Languages,
  Eye,
  Plus,
  Copy,
  Check,
  Download,
  ExternalLink,
  Wind,
} from "lucide-react";
import { NoteItem, GeneratedImageItem } from "../types";

interface ToolsPanelProps {
  notes: NoteItem[];
  images: GeneratedImageItem[];
  onDeleteNote: (id: string) => void;
  onSendPrompt: (prompt: string) => void;
  onGenerateImageManual: (prompt: string) => Promise<void>;
  isGeneratingImage: boolean;
  isTamil?: boolean;
  onOpenInnovationHub?: () => void;
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({
  notes,
  images,
  onDeleteNote,
  onSendPrompt,
  onGenerateImageManual,
  isGeneratingImage,
  isTamil = false,
  onOpenInnovationHub,
}) => {
  const [activeTab, setActiveTab] = useState<"notes" | "gallery" | "prompts" | "tools">("notes");
  const [imagePrompt, setImagePrompt] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sampleVoicePromptsEn = [
    {
      category: "Vision & Screen",
      icon: Eye,
      prompt: "Look at my camera and describe what object I am holding.",
      desc: "Live camera vision stream",
    },
    {
      category: "Screen Coding",
      icon: Code2,
      prompt: "Inspect what is on my screen and tell me if there are any bugs or improvements.",
      desc: "Screen sharing live stream",
    },
    {
      category: "Web Search Grounding",
      icon: Search,
      prompt: "Search Google for the latest space discoveries and scientific milestones today.",
      desc: "Real-time search with sources",
    },
    {
      category: "Math & Code Execution",
      icon: Code2,
      prompt: "Calculate the monthly mortgage payment on a $450,000 loan at 6.5% interest over 30 years.",
      desc: "Code solver & math computation",
    },
    {
      category: "Smart Memory & Notes",
      icon: Bookmark,
      prompt: "Save a note: Prepare slides for the VentusGPT demo on Friday morning at 10 AM.",
      desc: "Autonomous voice note saving",
    },
    {
      category: "AI Visual Creation",
      icon: ImageIcon,
      prompt: "Generate an image of a cybernetic neon tiger in a rainy futuristic metropolis.",
      desc: "Imagen 3 / AI image synthesis",
    },
    {
      category: "Weather & Severe Wind Alert",
      icon: Wind,
      prompt: "What is the weather forecast and wind condition in Chennai right now?",
      desc: "Live forecast & proactive wind alert",
    },
    {
      category: "🌾 Agricultural Advisory (Flagship)",
      icon: Sparkles,
      prompt: "Can I spray pesticide on paddy in Thanjavur today, or should I postpone due to wind and rain?",
      desc: "Deterministic agromet decision engine",
    },
    {
      category: "🚨 Disaster Early Warning (Flagship)",
      icon: Wind,
      prompt: "What is the cyclone and severe gale warning status for the Chennai coastal belt?",
      desc: "Physical thresholds & multi-sector SOPs",
    },
  ];

  const sampleVoicePromptsTa = [
    {
      category: "காட்சி பகுப்பாய்வு",
      icon: Eye,
      prompt: "என் கேமரா காட்சியைப் பார்த்து என்ன இருக்கிறது என்று தமிழில் கூறுங்கள்.",
      desc: "நேரலை கேமரா பார்வை",
    },
    {
      category: "கூகிள் தேடல்",
      icon: Search,
      prompt: "இன்றைய முக்கிய உலக செய்திகளை கூகிளில் தேடி தமிழில் சுருக்கமாகக் கூறு.",
      desc: "நேரலை தேடல் & ஆதாரங்கள்",
    },
    {
      category: "திருக்குறள் & இலக்கியம்",
      icon: Sparkles,
      prompt: "அன்புடைமை அதிகாரத்தில் இருந்து ஒரு சிறந்த திருக்குறளும் அதன் எளிய பொருளும் கூறுக.",
      desc: "தமிழ் இலக்கிய அறிவு",
    },
    {
      category: "கணிதம் & கணக்கீடு",
      icon: Code2,
      prompt: "12,500 ரூபாய்க்கு 8% வட்டி வீதத்தில் 3 ஆண்டுகளுக்கு கூட்டு வட்டி என்ன?",
      desc: "கணித தீர்வு கணக்கீடு",
    },
    {
      category: "நேரலை குறிப்பு",
      icon: Bookmark,
      prompt: "ஒரு குறிப்பை சேமிக்கவும்: நாளை மாலை 4 மணிக்கு தமிழ் திட்ட விவாதம்.",
      desc: "தானியங்கி நினைவகம்",
    },
    {
      category: "படம் உருவாக்கம்",
      icon: ImageIcon,
      prompt: "பாரம்பரிய தஞ்சாவூர் ஓவிய பாணியில் ஒரு அழகான மயில் படத்தை உருவாக்கு.",
      desc: "AI கலை உருவாக்கம்",
    },
    {
      category: "வானிலை & புயல் எச்சரிக்கை",
      icon: Wind,
      prompt: "சென்னையில் தற்போதைய வானிலை மற்றும் காற்றின் வேகம் என்ன?",
      desc: "நேரலை வானிலை & தீவிர காற்று எச்சரிக்கை",
    },
    {
      category: "🌾 வேளாண் ஆலோசனை (புதுமை)",
      icon: Sparkles,
      prompt: "தஞ்சாவூரில் இன்று நெல் பயிருக்கு பூச்சிக்கொல்லி மருந்து தெளிக்கலாமா அல்லது ஒத்திவைக்கலாமா?",
      desc: "விதிமுறை சார்ந்த துல்லிய விவசாய முடிவு",
    },
    {
      category: "🚨 பேரிடர் முன்னெச்சரிக்கை (புதுமை)",
      icon: Wind,
      prompt: "சென்னை கடலோரப் பகுதிக்கான புயல் மற்றும் பலத்த காற்று எச்சரிக்கை நிலவரத்தை கூறு.",
      desc: "மீனவர் & துறைமுக பாதுகாப்பு நெறிமுறைகள்",
    },
  ];

  const prompts = isTamil ? sampleVoicePromptsTa : sampleVoicePromptsEn;

  const handleCreateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePrompt.trim() || isGeneratingImage) return;
    await onGenerateImageManual(imagePrompt.trim());
    setImagePrompt("");
  };

  const copyNoteText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      id="tools-panel"
      className="flex flex-col h-full bg-[#1e1f20]/90 rounded-2xl border border-white/10 backdrop-blur-xl overflow-hidden shadow-xl"
    >
      {/* Tab Navigation */}
      <div className="flex items-center border-b border-white/5 bg-[#131314]/60 p-1">
        <button
          onClick={() => setActiveTab("notes")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-xl transition-all ${
            activeTab === "notes"
              ? "bg-[#2b2d31] text-purple-300 shadow-sm border border-purple-500/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>
            {isTamil ? "குறிப்புகள்" : "Notes"} ({notes.length})
          </span>
        </button>

        <button
          onClick={() => setActiveTab("gallery")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-xl transition-all ${
            activeTab === "gallery"
              ? "bg-[#2b2d31] text-pink-300 shadow-sm border border-pink-500/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>
            {isTamil ? "படங்கள்" : "Gallery"} ({images.length})
          </span>
        </button>

        <button
          onClick={() => setActiveTab("prompts")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-xl transition-all ${
            activeTab === "prompts"
              ? "bg-[#2b2d31] text-cyan-300 shadow-sm border border-cyan-500/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isTamil ? "திறன்கள்" : "Capabilities"}</span>
        </button>

        {onOpenInnovationHub && (
          <button
            onClick={onOpenInnovationHub}
            className="flex items-center justify-center gap-1 py-1.5 px-3 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-900/50 via-purple-900/40 to-blue-900/50 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 hover:text-white transition-all shadow-sm shrink-0 ml-1"
            title="Open Innovation & Flagship Architecture Hub"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">
              {isTamil ? "புதுமை மையம்" : "Innovation Hub"}
            </span>
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-700">
        {/* 1. NOTES TAB */}
        {activeTab === "notes" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">
                {isTamil ? "நினைவக பலகை (தானியங்கி சேமிப்பு)" : "Memory Board (Voice Captured Notes)"}
              </span>
              <span className="text-[10px] text-slate-500">
                {isTamil ? 'சொல்லுங்கள் "VentusGPT, ஒரு குறிப்பை சேமி..."' : 'Say "VentusGPT, save a note..."'}
              </span>
            </div>

            {notes.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-30 text-purple-400" />
                <p className="text-xs font-medium text-slate-300">
                  {isTamil ? "இன்னும் குறிப்புகள் எதுவும் சேமிக்கப்படவில்லை" : "No notes saved yet"}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  {isTamil
                    ? 'VentusGPT-யிடம் பேசும்போது "ஒரு குறிப்பை சேமி" என்று கூறினால், அது தானாகவே இங்கே பட்டியலிடப்படும்!'
                    : 'Ask VentusGPT in voice: "Save a note: meeting tomorrow at 10 AM", and it will automatically appear here!'}
                </p>
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="p-3.5 rounded-xl bg-[#131314]/80 border border-white/10 hover:border-purple-500/40 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-semibold text-slate-100 group-hover:text-purple-300 transition-colors">
                      {note.title}
                    </h4>
                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyNoteText(note.id, `${note.title}\n${note.content}`)}
                        title="Copy note"
                        className="text-slate-400 hover:text-slate-200 p-1 rounded"
                      >
                        {copiedId === note.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        title="Delete note"
                        className="text-slate-400 hover:text-red-400 p-1 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[12px] text-slate-300 mt-1.5 leading-relaxed whitespace-pre-wrap">
                    {note.content}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[10px] text-slate-500">
                    <span className="px-2 py-0.5 rounded-full bg-white/5 text-purple-300 font-mono text-[9px] uppercase border border-white/5">
                      {note.category}
                    </span>
                    <span>{note.timestamp}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 2. GALLERY TAB */}
        {activeTab === "gallery" && (
          <div className="space-y-4">
            {/* Quick Generator form */}
            <form onSubmit={handleCreateImage} className="space-y-2">
              <label className="text-xs font-medium text-slate-300 block">
                {isTamil ? "AI மூலம் படம் உருவாக்கவும்" : "Generate Image with VentusGPT"}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder={
                    isTamil
                      ? "எ.கா. ஒரு எதிர்கால நியான் நகரம்..."
                      : "e.g. A serene mountain landscape in oil painting style..."
                  }
                  className="flex-1 bg-[#131314]/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={isGeneratingImage || !imagePrompt.trim()}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-md shadow-purple-900/30"
                >
                  {isGeneratingImage ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{isTamil ? "உருவாக்கு" : "Generate"}</span>
                </button>
              </div>
            </form>

            {/* Images Grid */}
            {images.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30 text-purple-400" />
                <p className="text-xs font-medium text-slate-300">
                  {isTamil ? "படங்கள் எதுவும் இல்லை" : "No images generated yet"}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  {isTamil
                    ? 'VentusGPT-யிடம் குரல் வழியாக "ஒரு படம் வரைக" என்று கேட்கவும் அல்லது மேலே தட்டச்சு செய்யவும்.'
                    : 'Ask VentusGPT in voice to generate an image or use the prompt bar above to create visual artwork.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="rounded-xl overflow-hidden border border-white/10 bg-[#131314]/80 group"
                  >
                    <img
                      src={img.imageUrl}
                      alt={img.prompt}
                      className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="p-2.5">
                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-tight">
                        {img.prompt}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5 text-[10px] text-slate-400">
                        <span>{img.timestamp}</span>
                        <a
                          href={img.imageUrl}
                          download="ventusgpt-art.png"
                          className="text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>{isTamil ? "பதிவிறக்கு" : "Download"}</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. CAPABILITIES / PROMPTS TAB */}
        {activeTab === "prompts" && (
          <div className="space-y-2.5">
            <div className="text-xs text-slate-400 font-medium mb-1">
              {isTamil
                ? "VentusGPT-யிடம் சோதிக்க ஒரு திறனைத் தேர்ந்தெடுக்கவும்:"
                : "Click any capability to try asking VentusGPT:"}
            </div>
            {prompts.map((p, idx) => {
              const Icon = p.icon;
              return (
                <button
                  key={idx}
                  onClick={() => onSendPrompt(p.prompt)}
                  className="w-full text-left p-3 rounded-xl bg-[#131314]/80 border border-white/10 hover:border-purple-500/50 hover:bg-[#1e1f20] transition-all flex items-start gap-3 group"
                >
                  <div className="p-2 rounded-lg bg-purple-950/60 text-purple-400 border border-purple-800/50 group-hover:bg-purple-900/60 transition-colors shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">
                        {p.category}
                      </span>
                      <span className="text-[9px] text-slate-500">{p.desc}</span>
                    </div>
                    <p className="text-xs text-slate-200 mt-1 group-hover:text-white transition-colors truncate">
                      "{p.prompt}"
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
