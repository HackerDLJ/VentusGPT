import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { VentusLogo } from "./VentusLogo";
import {
  Sprout,
  ShieldAlert,
  Cpu,
  Radio,
  AlertTriangle,
  CloudRain,
  Wind,
  Droplets,
  Thermometer,
  Phone,
  MessageSquare,
  Smartphone,
  CheckCircle,
  Check,
  Copy,
  Play,
  Pause,
  Layers,
  Database,
  Globe,
  RefreshCw,
  X,
  ChevronRight,
  Zap,
  Info,
  Volume2,
  Anchor,
  Plane,
  Building2,
  Send,
} from "lucide-react";
import {
  evaluateAgriculturalAdvisory,
  evaluateDisasterWarning,
  generateMultiChannelDelivery,
  AgriculturalAdvisory,
  DisasterWarning,
  MultiChannelPayload,
  AdvisoryDecision,
  DisasterSeverity,
} from "../services/advisoryEngine";

interface InnovationHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  isTamil: boolean;
  onTriggerLiveAlert?: (alertText: string) => void;
  onSendToVoiceStream?: (text: string) => void;
}

type TabKey = "agri" | "disaster" | "architecture" | "multichannel" | "mitigations";

export const InnovationHubModal: React.FC<InnovationHubModalProps> = ({
  isOpen,
  onClose,
  isTamil,
  onTriggerLiveAlert,
  onSendToVoiceStream,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>("agri");

  // Agricultural Advisory State
  const [agriLocation, setAgriLocation] = useState("Thanjavur (Cauvery Delta)");
  const [agriCrop, setAgriCrop] = useState("Paddy (Rice)");
  const [agriActivity, setAgriActivity] = useState("Pesticide Spraying");
  const [agriRainfall, setAgriRainfall] = useState(18);
  const [agriWind, setAgriWind] = useState(28);
  const [agriHumidity, setAgriHumidity] = useState(82);
  const [agriTemp, setAgriTemp] = useState(33);
  const [agriResult, setAgriResult] = useState<AgriculturalAdvisory | null>(null);

  // Disaster Warning State
  const [disasterLocation, setDisasterLocation] = useState("Chennai Coastal Belt");
  const [disasterType, setDisasterType] = useState<
    "CYCLONE_GALE" | "THUNDERSTORM_LIGHTNING" | "FLASH_FLOOD" | "STORM_SURGE"
  >("CYCLONE_GALE");
  const [disasterWind, setDisasterWind] = useState(68);
  const [disasterRainRate, setDisasterRainRate] = useState(38);
  const [disasterCape, setDisasterCape] = useState(1850);
  const [disasterResult, setDisasterResult] = useState<DisasterWarning | null>(null);

  // Multi-channel simulator state
  const [channelMode, setChannelMode] = useState<"agri" | "disaster">("agri");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Run initial evaluation
  useEffect(() => {
    recomputeAgri();
    recomputeDisaster();
  }, []);

  const recomputeAgri = () => {
    const res = evaluateAgriculturalAdvisory({
      location: agriLocation,
      crop: agriCrop,
      activity: agriActivity,
      rainfallMm: agriRainfall,
      windSpeedKmh: agriWind,
      humidityPct: agriHumidity,
      temperatureC: agriTemp,
    });
    setAgriResult(res);
  };

  const recomputeDisaster = () => {
    const res = evaluateDisasterWarning({
      location: disasterLocation,
      hazardType: disasterType,
      windSpeedKmh: disasterWind,
      gustSpeedKmh: Math.round(disasterWind * 1.3),
      rainfallRateMmH: disasterRainRate,
      capeIndexJkg: disasterCape,
    });
    setDisasterResult(res);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSimulateBroadcast = () => {
    if (!disasterResult) return;
    const text = isTamil
      ? `🚨 ${disasterResult.headlineTa} - ${disasterResult.summaryTa} அவசர உதவி எண்: 1070.`
      : `🚨 ${disasterResult.headlineEn} - ${disasterResult.summaryEn} Emergency helpline: 1070.`;

    if (onTriggerLiveAlert) {
      onTriggerLiveAlert(text);
    }
    onClose();
  };

  const handleSpeakText = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      if (isPlayingAudio) {
        setIsPlayingAudio(false);
        return;
      }
      setIsPlayingAudio(true);
      const utterance = new SpeechSynthesisUtterance(text);
      if (isTamil) utterance.lang = "ta-IN";
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!isOpen) return null;

  const currentPayload: MultiChannelPayload =
    channelMode === "agri" && agriResult
      ? generateMultiChannelDelivery(agriResult, false)
      : disasterResult
      ? generateMultiChannelDelivery(disasterResult, true)
      : generateMultiChannelDelivery(
          evaluateAgriculturalAdvisory({
            location: agriLocation,
            crop: agriCrop,
            activity: agriActivity,
            rainfallMm: agriRainfall,
            windSpeedKmh: agriWind,
          }),
          false
        );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-5xl bg-[#18191b] border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 bg-[#131314]/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <VentusLogo size={36} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {isTamil
                    ? "வெண்டஸ் புதுமை & முதன்மை கட்டமைப்பு மையம்"
                    : "VentusGPT Innovation & Flagship Architecture"}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-semibold uppercase">
                  RAG & Agromet Layer
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isTamil
                  ? "அரசு வானிலை ஆய்வு மைய (IMD) அடிப்படையிலான நிகழ்வு உந்துதல் முடிவெடுக்கும் தளம்"
                  : "Event-Driven Decision Layer with Deterministic RAG, Agromet Advisory & Rural Multi-Channel Delivery"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 py-2 bg-[#131314]/60 border-b border-white/5 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab("agri")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "agri"
                ? "bg-emerald-950/70 text-emerald-200 border border-emerald-500/50 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Sprout className="w-4 h-4 text-emerald-400" />
            <span>{isTamil ? "1. உழவர் ஆலோசனை" : "1. Flagship: Agricultural Advisory"}</span>
          </button>

          <button
            onClick={() => setActiveTab("disaster")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "disaster"
                ? "bg-red-950/70 text-red-200 border border-red-500/50 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>{isTamil ? "2. பேரிடர் எச்சரிக்கை" : "2. Flagship: Disaster Early Warning"}</span>
          </button>

          <button
            onClick={() => setActiveTab("architecture")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "architecture"
                ? "bg-purple-950/70 text-purple-200 border border-purple-500/50 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span>{isTamil ? "3. கணினி கட்டமைப்பு" : "3. Core System Architecture"}</span>
          </button>

          <button
            onClick={() => setActiveTab("multichannel")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "multichannel"
                ? "bg-blue-950/70 text-blue-200 border border-blue-500/50 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Smartphone className="w-4 h-4 text-blue-400" />
            <span>{isTamil ? "4. வாட்ஸ்அப் / SMS மாதிரி" : "4. Rural Multi-Channel Delivery"}</span>
          </button>

          <button
            onClick={() => setActiveTab("mitigations")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "mitigations"
                ? "bg-amber-950/70 text-amber-200 border border-amber-500/50 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>{isTamil ? "5. பாதுகாப்பு & வரைபடம்" : "5. Mitigations & Roadmap"}</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-slate-200 space-y-6">
          {/* TAB 1: AGRICULTURAL ADVISORY ENGINE */}
          {activeTab === "agri" && (
            <div className="space-y-5">
              {/* Strategic overview header */}
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                    <Sprout className="w-4 h-4" />
                    <span>
                      {isTamil
                        ? "முதன்மை பயன்பாடு 1: வேளாண் ஆலோசனை (\"What Next?\" முடிவெடுக்கும் தளம்)"
                        : "Flagship Use Case 1: Agricultural Agrometeorological Advisory (\"What Next?\" Engine)"}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    {isTamil
                      ? "வானிலை மாறிகளை (மழை, காற்று வேகம், ஈரப்பதம்) விவசாயப் பணிகளுக்கான (பூச்சிக்கொல்லி தெளிப்பு, பாசன நேரம்) தெளிவான வழிகாட்டுதலாக மாற்றுகிறது."
                      : "Translates verified meteorological variables into activity-specific guidance (e.g., pesticide spraying, irrigation timing, fertilizer application)."}
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-900/40 border border-emerald-500/40 text-[11px] text-emerald-300 font-mono">
                  IMD Mausamgram Grounded
                </div>
              </div>

              {/* Interactive Parameter Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-black/40 border border-white/10 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    {isTamil ? "பகுதி / பிரதேசம்:" : "Location / District:"}
                  </label>
                  <select
                    value={agriLocation}
                    onChange={(e) => {
                      setAgriLocation(e.target.value);
                      setTimeout(recomputeAgri, 50);
                    }}
                    className="w-full bg-[#1f2023] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    <option value="Thanjavur (Cauvery Delta)">Thanjavur (Cauvery Delta)</option>
                    <option value="Madurai Region">Madurai Region</option>
                    <option value="Coimbatore Western Agro-Zone">Coimbatore Western Agro-Zone</option>
                    <option value="Tiruchirappalli">Tiruchirappalli</option>
                    <option value="Tirunelveli Down South">Tirunelveli Down South</option>
                    <option value="Chennai Outskirts / Thiruvallur">Chennai Outskirts / Thiruvallur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    {isTamil ? "பயிர் வகை:" : "Crop Selection:"}
                  </label>
                  <select
                    value={agriCrop}
                    onChange={(e) => {
                      setAgriCrop(e.target.value);
                      setTimeout(recomputeAgri, 50);
                    }}
                    className="w-full bg-[#1f2023] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    <option value="Paddy (Rice)">Paddy / Rice (நெல்)</option>
                    <option value="Cotton">Cotton (பருத்தி)</option>
                    <option value="Sugarcane">Sugarcane (கரும்பு)</option>
                    <option value="Groundnut (Peanut)">Groundnut / Peanut (நிலக்கடலை)</option>
                    <option value="Vegetables (Tomato / Chilli)">Vegetables (தக்காளி / மிளகாய்)</option>
                    <option value="Banana / Horticultural">Banana / Plantain (வாழை)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    {isTamil ? "திட்டமிடப்பட்ட விவசாய பணி:" : "Planned Farm Activity:"}
                  </label>
                  <select
                    value={agriActivity}
                    onChange={(e) => {
                      setAgriActivity(e.target.value);
                      setTimeout(recomputeAgri, 50);
                    }}
                    className="w-full bg-[#1f2023] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    <option value="Pesticide Spraying">Pesticide / Fungicide Spraying</option>
                    <option value="Irrigation Timing">Irrigation Timing & Pumping</option>
                    <option value="Fertilizer Application">Top-Dress Fertilizer (Urea / NPK)</option>
                    <option value="Harvesting & Drying">Harvesting, Threshing & Drying</option>
                    <option value="Sowing & Transplanting">Sowing & Nursery Transplanting</option>
                  </select>
                </div>
              </div>

              {/* Physical Variables Sliders */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-black/30 border border-white/10 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>{isTamil ? "மழை அளவு:" : "Rainfall:"}</span>
                    <span className="text-cyan-300 font-bold">{agriRainfall} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={agriRainfall}
                    onChange={(e) => {
                      setAgriRainfall(Number(e.target.value));
                      setTimeout(recomputeAgri, 50);
                    }}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>{isTamil ? "காற்றின் வேகம்:" : "Wind Velocity:"}</span>
                    <span className="text-purple-300 font-bold">{agriWind} km/h</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="50"
                    value={agriWind}
                    onChange={(e) => {
                      setAgriWind(Number(e.target.value));
                      setTimeout(recomputeAgri, 50);
                    }}
                    className="w-full accent-purple-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>{isTamil ? "ஈரப்பதம்:" : "Humidity:"}</span>
                    <span className="text-blue-300 font-bold">{agriHumidity}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="98"
                    value={agriHumidity}
                    onChange={(e) => {
                      setAgriHumidity(Number(e.target.value));
                      setTimeout(recomputeAgri, 50);
                    }}
                    className="w-full accent-blue-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>{isTamil ? "வெப்பநிலை:" : "Temperature:"}</span>
                    <span className="text-amber-300 font-bold">{agriTemp}°C</span>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="45"
                    value={agriTemp}
                    onChange={(e) => {
                      setAgriTemp(Number(e.target.value));
                      setTimeout(recomputeAgri, 50);
                    }}
                    className="w-full accent-amber-400"
                  />
                </div>
              </div>

              {/* Output Advisory Card */}
              {agriResult && (
                <div
                  className={`p-5 rounded-2xl border transition-all ${
                    agriResult.decision === "HALT_POSTPONE"
                      ? "bg-red-950/30 border-red-500/40 text-red-100"
                      : agriResult.decision === "EXERCISE_CAUTION"
                      ? "bg-amber-950/30 border-amber-500/40 text-amber-100"
                      : "bg-emerald-950/30 border-emerald-500/40 text-emerald-100"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          agriResult.decision === "HALT_POSTPONE"
                            ? "bg-red-600 text-white"
                            : agriResult.decision === "EXERCISE_CAUTION"
                            ? "bg-amber-500 text-black"
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        {agriResult.decision.replace("_", " ")}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-white">
                        {isTamil ? agriResult.decisionTitleTa : agriResult.decisionTitleEn}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleSpeakText(isTamil ? agriResult.summaryTa : agriResult.summaryEn)
                        }
                        className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-purple-300" />
                        <span>{isPlayingAudio ? "Stop Voice" : isTamil ? "குரலில் கேட்க" : "Listen TTS"}</span>
                      </button>
                      {onSendToVoiceStream && (
                        <button
                          onClick={() => {
                            onSendToVoiceStream(
                              `What is the agrometeorological advisory for ${agriCrop} regarding ${agriActivity} in ${agriLocation}?`
                            );
                            onClose();
                          }}
                          className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isTamil ? "நேரலையில் கேட்க" : "Ask Live"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="mt-3 text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {isTamil ? agriResult.summaryTa : agriResult.summaryEn}
                  </p>

                  {/* Rules Triggered */}
                  {agriResult.rulesTriggeredEn.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                        {isTamil ? "காரணங்கள் / விதிகள்:" : "Triggered Physical Thresholds:"}
                      </span>
                      <ul className="space-y-1 text-xs">
                        {(isTamil ? agriResult.rulesTriggeredTa : agriResult.rulesTriggeredEn).map(
                          (rule, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <span>{rule}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Action Checklist & Optimal Window */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/10">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                        {isTamil ? "உகந்த எதிர்கால நேரம்:" : "Optimal Working Window:"}
                      </span>
                      <p className="text-xs font-semibold text-cyan-300">
                        {isTamil ? agriResult.optimalWindowTa : agriResult.optimalWindowEn}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                        {isTamil ? "உடனடி நடவடிக்கை வழிகாட்டல்:" : "Actionable Steps:"}
                      </span>
                      <ul className="space-y-1 text-xs">
                        {(isTamil ? agriResult.actionChecklistTa : agriResult.actionChecklistEn).map(
                          (step, idx) => (
                            <li key={idx} className="flex items-center gap-1.5 text-slate-200">
                              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>{step}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DISASTER PREPAREDNESS & WARNING ENGINE */}
          {activeTab === "disaster" && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-red-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    <span>
                      {isTamil
                        ? "முதன்மை பயன்பாடு 2: பேரிடர் முன்னெச்சரிக்கை மற்றும் தயாரிப்பு நிலை"
                        : "Flagship Use Case 2: Real-Time Disaster Preparedness & Warning Engine"}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    {isTamil
                      ? "புயல், தீவிர இடிமின்னல், திடீர் வெள்ளம் உள்ளிட்ட தீவிர வானிலை நிகழ்வுகளுக்கான நிகழ்நேர ஆரம்ப எச்சரிக்கைகள் மற்றும் அரசு துறைசார் வழிகாட்டுதல்கள்."
                      : "Real-time early warnings for extreme events (cyclones, convective thunderstorms, flash floods) with multi-tier NDMA/IMD color codes and sector protocols."}
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-red-900/40 border border-red-500/40 text-[11px] text-red-300 font-mono">
                  IMD / NDMA Protocols
                </div>
              </div>

              {/* Hazard Simulation Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                {[
                  {
                    id: "CYCLONE_GALE",
                    label: isTamil ? "புயல் & சூறாவளி" : "Cyclone & Gale Squall",
                    icon: Wind,
                    desc: "Wind > 65 km/h",
                  },
                  {
                    id: "THUNDERSTORM_LIGHTNING",
                    label: isTamil ? "இடி மின்னல் எச்சரிக்கை" : "Severe Thunderstorm",
                    icon: Zap,
                    desc: "CAPE > 1500 J/kg",
                  },
                  {
                    id: "FLASH_FLOOD",
                    label: isTamil ? "திடீர் வெள்ளப்பெருக்கு" : "Flash Flood / Inundation",
                    icon: CloudRain,
                    desc: "Rain > 35 mm/h",
                  },
                  {
                    id: "STORM_SURGE",
                    label: isTamil ? "கடல் சீற்றம் / அலைகள்" : "Coastal Storm Surge",
                    icon: Anchor,
                    desc: "Wave height > 2.5m",
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setDisasterType(item.id as any);
                      setTimeout(recomputeDisaster, 50);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      disasterType === item.id
                        ? "bg-red-950/60 border-red-500 text-white ring-1 ring-red-500"
                        : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs">{item.label}</span>
                      <item.icon className="w-4 h-4 text-red-400" />
                    </div>
                    <span className="text-[10px] text-slate-400">{item.desc}</span>
                  </button>
                ))}
              </div>

              {/* Sliders for disaster variables */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-black/40 border border-white/10 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>{isTamil ? "காற்றின் வேகம்:" : "Sustained Wind Speed:"}</span>
                    <span className="text-red-300 font-bold">{disasterWind} km/h</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="120"
                    value={disasterWind}
                    onChange={(e) => {
                      setDisasterWind(Number(e.target.value));
                      setTimeout(recomputeDisaster, 50);
                    }}
                    className="w-full accent-red-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>{isTamil ? "மழை பொழிவு விகிதம்:" : "Rainfall Intensity:"}</span>
                    <span className="text-cyan-300 font-bold">{disasterRainRate} mm/hr</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="90"
                    value={disasterRainRate}
                    onChange={(e) => {
                      setDisasterRainRate(Number(e.target.value));
                      setTimeout(recomputeDisaster, 50);
                    }}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>{isTamil ? "வளிமண்டல சீர்குலைவு (CAPE):" : "CAPE Convective Energy:"}</span>
                    <span className="text-amber-300 font-bold">{disasterCape} J/kg</span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="2800"
                    value={disasterCape}
                    onChange={(e) => {
                      setDisasterCape(Number(e.target.value));
                      setTimeout(recomputeDisaster, 50);
                    }}
                    className="w-full accent-amber-400"
                  />
                </div>
              </div>

              {/* Warning Result Box */}
              {disasterResult && (
                <div className="p-5 rounded-2xl bg-red-950/30 border border-red-500/50 text-slate-200">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wider ${
                          disasterResult.severity === "RED"
                            ? "bg-red-600 text-white animate-pulse"
                            : "bg-orange-500 text-white"
                        }`}
                      >
                        IMD {disasterResult.severity} ALERT
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-white">
                        {isTamil ? disasterResult.headlineTa : disasterResult.headlineEn}
                      </h4>
                    </div>

                    <button
                      onClick={handleSimulateBroadcast}
                      className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-red-900/40 transition-colors"
                    >
                      <Radio className="w-3.5 h-3.5 animate-pulse" />
                      <span>{isTamil ? "நேரலை எச்சரிக்கை ஒளிபரப்பு" : "Broadcast to Live Banner"}</span>
                    </button>
                  </div>

                  <p className="mt-3 text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {isTamil ? disasterResult.summaryTa : disasterResult.summaryEn}
                  </p>

                  {/* Physical Triggers */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10">
                    {disasterResult.triggerMetrics.map((m, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-black/40 border border-white/5 text-xs">
                        <span className="text-[10px] text-slate-400 block">{m.label}</span>
                        <span className="font-bold text-red-300 text-sm">{m.value}</span>
                        <span className="text-[9px] text-slate-500 block">Threshold: {m.threshold}</span>
                      </div>
                    ))}
                  </div>

                  {/* Sector Action Protocols */}
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                      {isTamil ? "துறைசார் அவசர வழிகாட்டுதல்கள் (Protocols):" : "Sector Action Protocols:"}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="font-bold text-cyan-300 flex items-center gap-1.5 mb-1">
                          <Anchor className="w-3.5 h-3.5" />
                          {isTamil ? "மீன்வளம் & கடல்சார் வழிகாட்டல்:" : "Marine & Fisheries:"}
                        </span>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          {isTamil
                            ? disasterResult.sectorProtocolsTa.marine
                            : disasterResult.sectorProtocolsEn.marine}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                          <Sprout className="w-3.5 h-3.5" />
                          {isTamil ? "விவசாயம் & கால்நடை பாதுகாப்பு:" : "Agriculture & Livestock:"}
                        </span>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          {isTamil
                            ? disasterResult.sectorProtocolsTa.agriculture
                            : disasterResult.sectorProtocolsEn.agriculture}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="font-bold text-purple-300 flex items-center gap-1.5 mb-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {isTamil ? "மின்சாரம் & கட்டமைப்பு:" : "Infrastructure & Power Grid:"}
                        </span>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          {isTamil
                            ? disasterResult.sectorProtocolsTa.infrastructure
                            : disasterResult.sectorProtocolsEn.infrastructure}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="font-bold text-red-300 flex items-center gap-1.5 mb-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          {isTamil ? "பொதுமக்கள் பாதுகாப்பு:" : "Public Safety & Evacuation:"}
                        </span>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          {isTamil
                            ? disasterResult.sectorProtocolsTa.publicSafety
                            : disasterResult.sectorProtocolsEn.publicSafety}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Phone className="w-3.5 h-3.5" />
                      {disasterResult.emergencyHelpline}
                    </span>
                    <span>Source: {disasterResult.dataSource}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CORE SYSTEM ARCHITECTURE (RAG + EVENT-DRIVEN DECISION LAYER) */}
          {activeTab === "architecture" && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30">
                <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span>
                    {isTamil
                      ? "முக்கிய கணினி கட்டமைப்பு: 5-அடுக்கு நிகழ்வு உந்துதல் முடிவு தளம் (Event-Driven RAG)"
                      : "Core System Architecture: 5-Tier Event-Driven Decision Layer"}
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  {isTamil
                    ? "கட்டுப்பாடற்ற எல்.எல்.எம் (LLM) கற்பனை எண்களை தவிர்த்து, அரசு அதிகாரப்பூர்வ தரவுகளை அடிப்படையாகக் கொண்ட Retrieval-Augmented Generation (RAG) கட்டமைப்பு."
                    : "The system operates as an event-driven decision layer built upon a Retrieval-Augmented Generation (RAG) framework rather than unconstrained LLM generation."}
                </p>
              </div>

              {/* 5-Tier Architecture Visual Flow */}
              <div className="space-y-3">
                {[
                  {
                    tier: "Tier 1: Ingress & Speech Tier",
                    titleTa: "அடுக்கு 1: பேச்சு மற்றும் உள்ளீடு அடுக்கு",
                    desc: "Accepts voice or text input in regional Indian languages (Tamil, Hindi, English). Powered by Bhashini APIs, Whisper, or Sarvam AI for Automatic Speech Recognition (ASR) and Text-to-Speech (TTS).",
                    badge: "Bhashini / Whisper / Sarvam AI",
                    icon: Radio,
                    color: "text-blue-400",
                    border: "border-blue-500/30",
                    bg: "bg-blue-950/20",
                  },
                  {
                    tier: "Tier 2: Intent & Entity Extraction",
                    titleTa: "அடுக்கு 2: நோக்கம் மற்றும் உள்ளடக்கப் பிரிப்பு",
                    desc: "Parses natural language queries to extract target location, timeframe, activity context (e.g. spraying, harvesting), and user domain persona (farmer vs. general public vs. disaster official).",
                    badge: "Regex + Semantic Entity Parser",
                    icon: Cpu,
                    color: "text-indigo-400",
                    border: "border-indigo-500/30",
                    bg: "bg-indigo-950/20",
                  },
                  {
                    tier: "Tier 3: Deterministic Retrieval Layer & Grounding Principle",
                    titleTa: "அடுக்கு 3: துல்லியமான வானிலை தரவு மீட்டெடுப்பு",
                    desc: "Fetches validated data from primary APIs: IMD Mausamgram/warnings, NOAA/NOMADS GFS/WRF model outputs, ISRO MOSDAC satellite feeds, and PostGIS spatial databases. CRITICAL GROUNDING PRINCIPLE: The LLM must NEVER independently invent weather numbers; it only interprets verified retrieved data.",
                    badge: "IMD Mausamgram / NOMADS / PostGIS",
                    icon: Database,
                    color: "text-emerald-400",
                    border: "border-emerald-500/40",
                    bg: "bg-emerald-950/25",
                  },
                  {
                    tier: 'Tier 4: Reasoning & Sector Advisory Engine ("What Next?" Engine)',
                    titleTa: "அடுக்கு 4: துறைசார் ஆலோசனை மற்றும் முடிவெடுக்கும் தளம்",
                    desc: "Rule-based logic coupled with LLM reasoning translates raw physical variables (e.g., 35mm rain, CAPE index, wind >40 km/h) into actionable recommendations (e.g., 'Halt spraying and clear drainage channels').",
                    badge: "NeMo Guardrails + Agromet Rules",
                    icon: Sprout,
                    color: "text-amber-400",
                    border: "border-amber-500/30",
                    bg: "bg-amber-950/20",
                  },
                  {
                    tier: "Tier 5: Multi-Channel Delivery Layer",
                    titleTa: "அடுக்கு 5: பன்முக விநியோக அடுக்கு",
                    desc: "Delivers responses through Web/Mobile interfaces, WhatsApp Business API (via Twilio sandbox), and low-bandwidth IVR/160-character SMS fallbacks for rural feature phone access.",
                    badge: "Web + WhatsApp + 160-char SMS + IVR",
                    icon: Smartphone,
                    color: "text-purple-400",
                    border: "border-purple-500/30",
                    bg: "bg-purple-950/20",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border ${item.border} ${item.bg} flex items-start gap-3.5`}
                  >
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 shrink-0">
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          {isTamil ? item.titleTa : item.tier}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-slate-300 font-mono">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modular Extensibility Section */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>
                    {isTamil
                      ? "கூடுதல் களங்களுக்கான மட்டு விரிவாக்கம் (Modular Extensibility):"
                      : "Modular Extensibility (Future Backend Modules):"}
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                    <span className="font-semibold text-cyan-300 flex items-center gap-1 mb-1">
                      <Anchor className="w-3.5 h-3.5" />
                      Marine & Fisheries
                    </span>
                    <p className="text-[11px] text-slate-400">
                      INCOIS ocean state forecasts, high swell warnings, potential fishing zones (PFZ) and sea surface temperatures.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                    <span className="font-semibold text-purple-300 flex items-center gap-1 mb-1">
                      <Plane className="w-3.5 h-3.5" />
                      Aviation & Airports
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Low-level wind shear alerts, runway crosswinds, convective sigmet advisories, and METAR/TAF ingest.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                    <span className="font-semibold text-amber-300 flex items-center gap-1 mb-1">
                      <Building2 className="w-3.5 h-3.5" />
                      Urban Smart Cities
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Micro-catchment rainfall runoff modeling, storm drainage gate operations, and heat island mitigation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MULTI-CHANNEL RURAL DELIVERY SIMULATOR */}
          {activeTab === "multichannel" && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    <span>
                      {isTamil
                        ? "கிராமப்புற பன்முக விநியோக மாதிரி (WhatsApp, 160-Char SMS, IVR)"
                        : "Rural Multi-Channel Delivery Simulator (WhatsApp, 160-Char SMS, IVR)"}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    {isTamil
                      ? "புதிய செயலியை பதிவிறக்க வேண்டிய அவசியமின்றி வாட்ஸ்அப் மற்றும் 2G சாதாரண பட்டன் போன்களுக்கான 160-எழுத்து SMS மாதிரி."
                      : "Delivers responses through WhatsApp Business API and low-bandwidth IVR / 160-character SMS fallbacks for rural feature phone access without app downloads."}
                  </p>
                </div>

                <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/10">
                  <button
                    onClick={() => setChannelMode("agri")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      channelMode === "agri" ? "bg-emerald-600 text-white" : "text-slate-400"
                    }`}
                  >
                    Agri Advisory
                  </button>
                  <button
                    onClick={() => setChannelMode("disaster")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      channelMode === "disaster" ? "bg-red-600 text-white" : "text-slate-400"
                    }`}
                  >
                    Disaster Alert
                  </button>
                </div>
              </div>

              {/* Side-by-Side Previews: WhatsApp vs 160-char SMS vs IVR */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. WhatsApp Business Sandbox Mockup */}
                <div className="p-4 rounded-2xl bg-[#0b141a] border border-emerald-500/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">VentusGPT Weather</span>
                          <span className="text-[9px] text-emerald-400">Verified Business Account</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500">Twilio Sandbox</span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#1f2c34] text-white text-xs whitespace-pre-line leading-relaxed shadow-sm font-sans">
                      {isTamil
                        ? currentPayload.whatsappMessageTa
                        : currentPayload.whatsappMessageEn}
                    </div>

                    {/* Interactive Quick-Replies */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {currentPayload.whatsappQuickReplies.map((btn, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded-full bg-[#1f2c34] border border-emerald-500/40 text-[10px] text-emerald-300 font-medium"
                        >
                          {btn}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
                    <button
                      onClick={() =>
                        handleCopy(
                          isTamil
                            ? currentPayload.whatsappMessageTa
                            : currentPayload.whatsappMessageEn,
                          "wa"
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] flex items-center gap-1 transition-colors"
                    >
                      {copiedKey === "wa" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "wa" ? "Copied!" : "Copy Payload"}</span>
                    </button>
                  </div>
                </div>

                {/* 2. Low-Bandwidth 160-Character SMS Fallback */}
                <div className="p-4 rounded-2xl bg-black/60 border border-cyan-500/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-white">160-Char Rural SMS</span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          (isTamil ? currentPayload.smsCharCountTa : currentPayload.smsCharCountEn) <= 160
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                            : "bg-red-950 text-red-300 border border-red-500/30"
                        }`}
                      >
                        {isTamil ? currentPayload.smsCharCountTa : currentPayload.smsCharCountEn} / 160 Chars
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-cyan-200 leading-normal">
                      {isTamil ? currentPayload.sms160Ta : currentPayload.sms160En}
                    </div>

                    <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
                      {isTamil
                        ? "GSM-7 என்கோடிங்: இன்டர்நெட் தேவையின்றி 2G சாதாரண பட்டன் போன்களுக்கு நேரடி SMS மூலம் வானிலை எச்சரிக்கை சென்றடைகிறது."
                        : "GSM-7 standard payload compliant with basic 2G feature phones. Functions even under internet blackouts or network throttling."}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
                    <button
                      onClick={() =>
                        handleCopy(
                          isTamil ? currentPayload.sms160Ta : currentPayload.sms160En,
                          "sms"
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] flex items-center gap-1 transition-colors"
                    >
                      {copiedKey === "sms" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "sms" ? "Copied!" : "Copy SMS"}</span>
                    </button>
                  </div>
                </div>

                {/* 3. PSTN IVR Voice Broadcast Simulator */}
                <div className="p-4 rounded-2xl bg-black/60 border border-purple-500/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-white">PSTN IVR Voice Stream</span>
                      </div>
                      <span className="text-[10px] text-purple-300">Toll-Free Kisan Service</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-purple-100 leading-relaxed italic">
                      "{isTamil ? currentPayload.ivrVoiceScriptTa : currentPayload.ivrVoiceScriptEn}"
                    </div>

                    <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
                      {isTamil
                        ? "பாமர விவசாயிகளுக்காக எளிய தொலைபேசி அழைப்பு வழியாக ஒலிக்கும் குரல் சேவை."
                        : "Simulated telephone audio bulletin for non-literate farmers via automated outbound dialing."}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                    <button
                      onClick={() =>
                        handleSpeakText(
                          isTamil ? currentPayload.ivrVoiceScriptTa : currentPayload.ivrVoiceScriptEn
                        )
                      }
                      className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isPlayingAudio ? "Stop Audio" : "Play IVR Audio"}</span>
                    </button>

                    <button
                      onClick={() =>
                        handleCopy(
                          isTamil ? currentPayload.ivrVoiceScriptTa : currentPayload.ivrVoiceScriptEn,
                          "ivr"
                        )
                      }
                      className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] flex items-center gap-1 transition-colors"
                    >
                      {copiedKey === "ivr" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: VULNERABILITIES & ENGINEERING MITIGATIONS + ROADMAP */}
          {activeTab === "mitigations" && (
            <div className="space-y-6">
              {/* Engineering Mitigation Matrix Table */}
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>
                    {isTamil
                      ? "முக்கிய சவால்கள் & பொறியியல் தீர்வுகள் (Key Vulnerabilities & Engineering Mitigations)"
                      : "Key Vulnerabilities & Engineering Mitigations"}
                  </span>
                </h3>
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40 text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5 text-slate-300 font-semibold">
                        <th className="p-3 w-1/4">Identified Risk / Limitation</th>
                        <th className="p-3 w-1/2">Engineering Mitigation</th>
                        <th className="p-3 w-1/4">Source / Architecture Layer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      <tr>
                        <td className="p-3 font-semibold text-red-300">LLM Hallucination</td>
                        <td className="p-3 text-slate-200">
                          Strict RAG with function calling; LLM receives retrieved numbers as immutable context and is barred from guessing weather values.
                        </td>
                        <td className="p-3 text-slate-400">NeMo Guardrails & Grounding Engine</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-amber-300">API Rate Limits & Restrictions</td>
                        <td className="p-3 text-slate-200">
                          Multi-tier fallback stack using Open-Meteo REST APIs and public NOAA/NOMADS GFS datasets when official IMD endpoints throttle.
                        </td>
                        <td className="p-3 text-slate-400">WeatherDataProvider Hierarchy</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-cyan-300">Response Latency</td>
                        <td className="p-3 text-slate-200">
                          Parallelized async retrieval/translation calls and sub-millisecond in-memory Redis caching of frequent district queries.
                        </td>
                        <td className="p-3 text-slate-400">FastAPI Async & Redis Layer</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-purple-300">Disaster Network Collapse</td>
                        <td className="p-3 text-slate-200">
                          Low-bandwidth 160-character GSM-7 SMS fallbacks and PSTN IVR outbound voice streams requiring zero mobile data/internet.
                        </td>
                        <td className="p-3 text-slate-400">Multi-Channel Delivery Layer</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-blue-300">Location Disambiguation</td>
                        <td className="p-3 text-slate-200">
                          GPS auto-geolocation as primary anchor, paired with conversational clarifying prompts for same-named Indian taluks/towns.
                        </td>
                        <td className="p-3 text-slate-400">PostGIS Spatial Database</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step-by-Step Development Roadmap */}
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>
                    {isTamil
                      ? "படி-படியாக உருவாக்கும் திட்ட வரைபடம் (Development Roadmap)"
                      : "Step-by-Step Development Roadmap"}
                  </span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-emerald-300">Phase 1: Setup & Data Pipeline</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                        Operational
                      </span>
                    </div>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      <li>• Unified WeatherDataProvider interface for IMD & NOMADS.</li>
                      <li>• Rate limit handling & source priority hierarchies.</li>
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-cyan-300">Phase 2: Core RAG & Advisory Engine</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                        Operational
                      </span>
                    </div>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      <li>• Strict function-calling isolation for query, retrieval, and synthesis.</li>
                      <li>• Activity-specific rule triggers for pesticide, water, and harvest.</li>
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-indigo-300">Phase 3: Multilingual & Voice</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                        Operational
                      </span>
                    </div>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      <li>• High-accuracy Tamil and English speech-to-text / text-to-speech.</li>
                      <li>• Domain-specific agrometeorological vocabulary glossary.</li>
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-purple-300">Phase 4: Proactive Alerting & Channels</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30">
                        Operational
                      </span>
                    </div>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      <li>• Threshold-triggered proactive push alerts (e.g. wind &gt;40km/h).</li>
                      <li>• WhatsApp sandbox & 160-char SMS rural accessibility.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#131314]/90 flex items-center justify-between shrink-0 text-xs text-slate-400">
          <span>VentusGPT • Team JATABELS Hackathon Innovation</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
          >
            {isTamil ? "மூடு" : "Close Hub"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
