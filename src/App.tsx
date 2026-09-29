import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  SlidersHorizontal,
  AlertTriangle,
  Languages,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { AudioOrb } from "./components/AudioOrb";
import { VideoViewport } from "./components/VideoViewport";
import { TranscriptView } from "./components/TranscriptView";
import { ToolsPanel } from "./components/ToolsPanel";
import { ControlBar } from "./components/ControlBar";
import { SettingsModal } from "./components/SettingsModal";
import { InnovationHubModal } from "./components/InnovationHubModal";
import { VentusLogo } from "./components/VentusLogo";
import { LogoModal } from "./components/LogoModal";
import { LiveAudioManager } from "./services/liveAudio";
import { LiveClient } from "./services/liveClient";
import {
  LiveStatus,
  AssistantMode,
  VentusVoice,
  LiveSettings,
  TranscriptItem,
  NoteItem,
  GeneratedImageItem,
  WeatherData,
} from "./types";
import {
  checkWeatherThresholds,
  formatLiveCaptionAlert,
} from "./services/weatherAlertService";

export default function App() {
  const [status, setStatus] = useState<LiveStatus>("disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(true);

  // Audio states
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [userVolume, setUserVolume] = useState(0);
  const [modelVolume, setModelVolume] = useState(0);

  // Tools & Video
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [videoMode, setVideoMode] = useState<"none" | "camera" | "screen">("none");
  const [mode, setMode] = useState<AssistantMode>("conversation");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Transcripts & Live Captions
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [liveCaption, setLiveCaption] = useState<string | null>(null);

  // Notes & Generated Images
  const [notes, setNotes] = useState<NoteItem[]>([
    {
      id: "note-1",
      title: "வணக்கம்! Welcome to VentusGPT",
      content:
        "தமிழில் பேசலாம் அல்லது தட்டச்சு செய்யலாம்! Ask: 'Search today top tech news' or 'ஒரு நல்ல திருக்குறள் சொல்' or 'Look at my camera'.",
      category: "general",
      timestamp: "Just now",
    },
  ]);
  const [images, setImages] = useState<GeneratedImageItem[]>([]);

  // Settings: default with Tamil support ready
  const [settings, setSettings] = useState<LiveSettings>({
    model: "gemini-3.1-flash-live-preview",
    voice: "Zephyr",
    systemInstruction:
      "You are VentusGPT, an intelligent, perceptive, articulate multimodal AI voice assistant created by Team JATABELS with native Tamil and English capabilities. When asked 'Who are you?' or about your identity, you must proudly state: 'I am VentusGPT, created by Team JATABELS.' When spoken to in Tamil, respond in natural, fluent, warm Tamil. When spoken to in English, respond in English. Keep answers direct and concise for voice conversations.",
    targetLanguageCode: "ta", // Default to Tamil
    fps: 1,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInnovationHubOpen, setIsInnovationHubOpen] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);

  const isTamil = settings.targetLanguageCode === "ta";

  // Audio Manager ref & Live Client ref
  const audioManagerRef = useRef<LiveAudioManager | null>(null);
  const liveClientRef = useRef<LiveClient | null>(null);
  const currentModelTurnIdRef = useRef<string | null>(null);

  // Verify health and API key on mount
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setHasApiKey(Boolean(data.hasApiKey));
      })
      .catch((err) => console.error("Health check error:", err));
  }, []);

  // Keyboard shortcut listener: Space to interrupt when speaking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        handleInterrupt();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSpeaking, status]);

  const addTranscript = useCallback(
    (
      role: "user" | "model" | "system" | "tool",
      text: string,
      extra?: Partial<TranscriptItem>
    ) => {
      const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const newItem: TranscriptItem = {
        id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
        role,
        text,
        timestamp: now,
        ...extra,
      };
      setTranscripts((prev) => [...prev, newItem]);
    },
    []
  );

  // Stop session
  const disconnectSession = useCallback(() => {
    if (liveClientRef.current) {
      liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }
    if (audioManagerRef.current) {
      audioManagerRef.current.cleanup();
      audioManagerRef.current = null;
    }
    setStatus("disconnected");
    setIsSpeaking(false);
    setIsListening(false);
    setIsThinking(false);
    setActiveTool(null);
    setUserVolume(0);
    setModelVolume(0);
    setLiveCaption(null);
  }, []);

  // Connect to Gemini Live session
  const connectSession = useCallback(async () => {
    try {
      setStatus("connecting");
      setErrorMessage(null);

      // Initialize Audio Manager
      const audioManager = new LiveAudioManager();
      audioManagerRef.current = audioManager;

      await audioManager.ensureOutputContext(
        (vol) => {
          setModelVolume(vol);
          if (vol > 0.05) {
            setIsSpeaking(true);
          }
        },
        () => {
          setIsSpeaking(false);
          setModelVolume(0);
        }
      );

      // Initialize Live Client
      const liveClient = new LiveClient({
        onReady: () => {
          setStatus("connected");
          setErrorMessage(null);
        },
        onAudioChunk: (base64Pcm) => {
          setIsThinking(false);
          setIsSpeaking(true);
          audioManager.queueAudioChunk(base64Pcm);
        },
        onModelText: (text) => {
          setLiveCaption((prev) => (prev ? prev + " " + text : text));
        },
        onCaption: (caption) => {
          setLiveCaption(caption);
        },
        onTurnComplete: () => {
          setLiveCaption((prev) => {
            if (prev) {
              addTranscript("model", prev);
            }
            return null;
          });
          setIsSpeaking(false);
          setIsThinking(false);
          currentModelTurnIdRef.current = null;
        },
        onInterrupted: () => {
          audioManager.interruptPlayback();
          setIsSpeaking(false);
          setLiveCaption(null);
          currentModelTurnIdRef.current = null;
        },
        onToolInvoked: (tool) => {
          setActiveTool(tool.name);
          setIsThinking(true);
        },
        onToolResult: (toolResult) => {
          setActiveTool(null);
          setIsThinking(false);

          if (toolResult.name === "saveNote" && toolResult.result?.success) {
            const newNote: NoteItem = {
              id: "note-" + Date.now(),
              title: toolResult.result.title || "Voice Note",
              content: toolResult.result.content || "",
              category: toolResult.result.category || "general",
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            };
            setNotes((prev) => [newNote, ...prev]);
            addTranscript(
              "tool",
              `Saved note: "${newNote.title}" - ${newNote.content}`,
              { toolName: "saveNote" }
            );
          } else if (toolResult.name === "searchWeb" && toolResult.result?.answer) {
            addTranscript("tool", toolResult.result.answer, {
              toolName: "Google Search",
              sources: toolResult.result.sources || [],
            });
          } else if (toolResult.name === "generateImage" && toolResult.result?.imageUrl) {
            const newImg: GeneratedImageItem = {
              id: "img-" + Date.now(),
              prompt: toolResult.result.prompt,
              imageUrl: toolResult.result.imageUrl,
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            };
            setImages((prev) => [newImg, ...prev]);
            addTranscript(
              "tool",
              `Generated image for prompt: "${toolResult.result.prompt}"`,
              {
                toolName: "generateImage",
                imageUrl: toolResult.result.imageUrl,
              }
            );
          } else if (toolResult.name === "executeCalculation" && toolResult.result?.result) {
            addTranscript(
              "tool",
              `Calculated result: ${toolResult.result.result}`,
              { toolName: "executeCalculation" }
            );
          } else if (toolResult.name === "getWeatherForecast" && toolResult.result) {
            const weather = toolResult.result as WeatherData;
            // Proactive Alert Module: check weather data thresholds (e.g., wind speed > 40km/h)
            const alert = checkWeatherThresholds(weather) || weather.alert;

            if (alert && alert.active) {
              const warningMessage = formatLiveCaptionAlert(
                alert,
                weather.location || "Local Area",
                isTamil
              );
              // Notify the user via the liveCaption system immediately
              setLiveCaption(warningMessage);

              // Keep warning visible in caption stream
              setTimeout(() => {
                setLiveCaption((curr) => (curr === warningMessage ? null : curr));
              }, 9000);
            }

            const weatherSummary =
              weather.summary ||
              `Weather for ${weather.location}: ${weather.temperature}°C, ${weather.condition}. Wind: ${weather.windSpeed} km/h (Gusts: ${weather.windGusts} km/h), Humidity: ${weather.humidity}%, Pressure: ${weather.barometricPressure}.${
                alert && alert.active ? ` ⚠️ SEVERE ALERT: ${alert.title}` : ""
              }`;

            addTranscript("tool", weatherSummary, {
              toolName: "getWeatherForecast",
              toolResult: weather,
            });
          } else if (toolResult.name === "getAgriculturalAdvisory" && toolResult.result) {
            const agri = toolResult.result;
            const caption = isTamil
              ? `🌾 வேளாண் ஆலோசனை (${agri.crop}): ${agri.decision === "PROCEED_SAFE" ? "பணி மேற்கொள்ளலாம்" : "பணியை ஒத்திவைக்கவும்"}`
              : `🌾 Agri Advisory (${agri.crop}): ${agri.decision === "PROCEED_SAFE" ? "Safe to proceed" : "Halt & Postpone"}`;
            setLiveCaption(caption);
            setTimeout(() => {
              setLiveCaption((curr) => (curr === caption ? null : curr));
            }, 8000);
            addTranscript("tool", `[Agrometeorological Advisory] ${agri.advice}`, {
              toolName: "getAgriculturalAdvisory",
              toolResult: agri,
            });
          } else if (toolResult.name === "getDisasterWarning" && toolResult.result) {
            const disaster = toolResult.result;
            const caption = isTamil
              ? `🚨 ${disaster.severity} எச்சரிக்கை: ${disaster.location} (${disaster.windSpeedKmh} கி.மீ/மணி காற்று)`
              : `🚨 ${disaster.severity} WARNING: ${disaster.location} (${disaster.windSpeedKmh} km/h wind)`;
            setLiveCaption(caption);
            setTimeout(() => {
              setLiveCaption((curr) => (curr === caption ? null : curr));
            }, 10000);
            addTranscript("tool", `[Disaster Early Warning] ${disaster.headline}`, {
              toolName: "getDisasterWarning",
              toolResult: disaster,
            });
          }
        },
        onError: (errMsg) => {
          console.error("Live session error:", errMsg);
          setErrorMessage(errMsg);
          setStatus("disconnected");
          disconnectSession();
        },
        onClose: () => {
          setStatus("disconnected");
        },
      });

      liveClientRef.current = liveClient;

      // System instruction with Tamil awareness and mode specialization
      const targetModel =
        mode === "translate" ? "gemini-3.5-transcribe-live" : settings.model;

      let modeSpecificPrompt = "";
      if (mode === "vision") {
        modeSpecificPrompt = "Focus intently on visual analysis from camera frames, screen shares, and uploaded images. Describe objects, read text, identify visual cues, and debug UI or diagrams with high precision.";
      } else if (mode === "translate") {
        modeSpecificPrompt = "Act as an instantaneous real-time bidirectional translator between Tamil (தமிழ்) and English. When speech or text is received in one language, immediately speak the natural, fluent translation in the other language.";
      } else if (mode === "code_math") {
        modeSpecificPrompt = "Act as a software engineer and mathematical computation assistant. Use executeCalculation tool for math, formulas, and data analysis. Provide concise, clean, working code explanations.";
      } else if (mode === "creative") {
        modeSpecificPrompt = "Act as a creative studio director. Proactively offer to create visual concepts, generate AI images using generateImage tool, and craft compelling stories and creative ideas.";
      }

      const fullInstruction = `${settings.systemInstruction} ${modeSpecificPrompt} Current primary language preference: ${
        settings.targetLanguageCode === "ta" ? "Tamil (தமிழ்)" : "English"
      }. If the user speaks or writes in Tamil, respond in Tamil script.`;

      await liveClient.connect({
        model: targetModel,
        voice: settings.voice,
        systemInstruction: fullInstruction,
        targetLanguageCode: settings.targetLanguageCode,
      });

      // Start microphone capture
      try {
        await audioManager.startMicrophone(
          (base64Pcm) => {
            if (liveClient.connected) {
              liveClient.sendAudioChunk(base64Pcm);
            }
          },
          (vol) => {
            setUserVolume(vol);
            setIsListening(vol > 0.08);
          }
        );
      } catch (micErr: any) {
        console.warn("Microphone access denied:", micErr);
        setErrorMessage(
          isTamil
            ? "மைக் அணுகல் மறுக்கப்பட்டது. நீங்கள் உரை வழியாக பேசலாம்."
            : "Microphone access was denied. You can continue chatting via text."
        );
      }
    } catch (err: any) {
      console.error("Failed to start Live session:", err);
      setErrorMessage(err.message || "Failed to start VentusGPT Live.");
      setStatus("disconnected");
    }
  }, [settings, mode, disconnectSession, addTranscript, isTamil]);

  // Toggle Connect
  const handleToggleConnect = () => {
    if (status === "connected" || status === "connecting") {
      disconnectSession();
    } else {
      connectSession();
    }
  };

  // Interrupt active speech
  const handleInterrupt = () => {
    if (audioManagerRef.current) {
      audioManagerRef.current.interruptPlayback();
    }
    setIsSpeaking(false);
    setLiveCaption(null);
    currentModelTurnIdRef.current = null;
    liveClientRef.current?.sendInterrupt();
  };

  // Toggle Mute
  const handleToggleMute = () => {
    if (audioManagerRef.current) {
      const nextMute = !isMuted;
      audioManagerRef.current.setMute(nextMute);
      setIsMuted(nextMute);
    }
  };

  // Toggle Camera View
  const handleToggleCamera = () => {
    setVideoMode((prev) => (prev === "camera" ? "none" : "camera"));
  };

  // Toggle Screen Share
  const handleToggleScreen = () => {
    setVideoMode((prev) => (prev === "screen" ? "none" : "screen"));
  };

  // Send Video Frame over LiveClient
  const handleVideoFrame = (base64Jpeg: string) => {
    if (liveClientRef.current?.connected) {
      liveClientRef.current.sendVideoFrame(base64Jpeg);
    }
  };

  // Send Text prompt: High-speed hybrid handling with optional image attachment
  const handleSendTextMessage = async (text: string, imageBase64?: string) => {
    addTranscript("user", text, {
      userImage: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : undefined,
    });

    if (liveClientRef.current?.connected) {
      if (imageBase64) {
        liveClientRef.current.sendVideoFrame(imageBase64);
      }
      liveClientRef.current.sendTextMessage(text);
      setIsThinking(true);
    } else {
      // Seamless direct VentusGPT chat without requiring Live WebSockets
      setIsThinking(true);
      try {
        const history = transcripts.slice(-6).map((t) => ({
          role: t.role === "user" ? "user" : "model",
          text: t.text,
        }));

        const res = await fetch("/api/gemini/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            imageBase64,
            language: settings.targetLanguageCode,
            voice: settings.voice,
            history,
            generateAudio: false,
          }),
        });

        const data = await res.json();
        if (data.text) {
          addTranscript("model", data.text, {
            sources: data.sources || [],
            audio: data.audio || undefined,
          });
        } else if (data.error) {
          addTranscript("system", "Error: " + data.error);
        }
      } catch (err: any) {
        console.error("Chat error:", err);
        addTranscript(
          "system",
          isTamil
            ? "மன்னிக்கவும், தகவல் தொடர்பில் சிக்கல் ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்."
            : "Network error sending prompt. Please try again."
        );
      } finally {
        setIsThinking(false);
      }
    }
  };

  // Play audio for any message on demand
  const handlePlayAudio = async (text: string) => {
    try {
      if (!audioManagerRef.current) {
        audioManagerRef.current = new LiveAudioManager();
      }
      await audioManagerRef.current.ensureOutputContext(
        (vol) => {
          setModelVolume(vol);
          setIsSpeaking(vol > 0.05);
        },
        () => {
          setIsSpeaking(false);
          setModelVolume(0);
        }
      );

      const res = await fetch("/api/gemini/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice: settings.voice,
          language: settings.targetLanguageCode,
        }),
      });

      const data = await res.json();
      if (data.audio && audioManagerRef.current) {
        setIsSpeaking(true);
        audioManagerRef.current.queueAudioChunk(data.audio);
      } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        if (isTamil) utterance.lang = "ta-IN";
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.error("Audio playback error:", e);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        if (isTamil) utterance.lang = "ta-IN";
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // Toggle Tamil mode
  const handleToggleTamil = () => {
    setSettings((prev) => ({
      ...prev,
      targetLanguageCode: prev.targetLanguageCode === "ta" ? "en" : "ta",
    }));
  };

  // Manual Image Generation
  const handleGenerateImageManual = async (prompt: string) => {
    setIsGeneratingImage(true);
    try {
      const res = await fetch("/api/gemini/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        const newImg: GeneratedImageItem = {
          id: "img-" + Date.now(),
          prompt,
          imageUrl: data.imageUrl,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setImages((prev) => [newImg, ...prev]);
        addTranscript("model", `Created image for: "${prompt}"`, {
          imageUrl: data.imageUrl,
        });
      }
    } catch (err: any) {
      console.error("Image generation error:", err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#131314] text-slate-100 flex flex-col antialiased selection:bg-purple-600 selection:text-white font-sans">
      {/* VentusGPT Top Header */}
      <header className="h-16 border-b border-white/5 bg-[#131314]/90 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {/* VentusGPT brand mark */}
          <button
            onClick={() => setIsLogoModalOpen(true)}
            className="group relative flex items-center justify-center focus:outline-none transition-transform hover:scale-105 active:scale-95"
            title={isTamil ? "முழு திட்ட லோகோவைக் காண்க" : "Click to view full VentusGPT project logo"}
          >
            <VentusLogo size={36} />
            <span className="sr-only">VentusGPT Full Logo</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-white flex items-center gap-1.5">
                <span>VentusGPT</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 font-medium">
                  by Team JATABELS
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {isTamil ? "Team JATABELS உருவாக்கிய AI குரல் உதவியாளர்" : "AI Voice & Weather Intelligence by Team JATABELS"}
            </p>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Tamil / English pill */}
          <button
            onClick={handleToggleTamil}
            title={isTamil ? "Switch to English" : "தமிழுக்கு மாற்றவும்"}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              isTamil
                ? "bg-purple-900/40 border-purple-500/50 text-purple-200"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Languages className="w-3.5 h-3.5 text-purple-400" />
            <span>{isTamil ? "தமிழ் (Tamil)" : "English"}</span>
          </button>

          {/* Connection Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1e1f20] border border-white/10 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                status === "connected"
                  ? "bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400"
                  : status === "connecting"
                  ? "bg-amber-400 animate-ping"
                  : "bg-slate-500"
              }`}
            />
            <span className="text-[11px] font-medium text-slate-300">
              {status === "connected"
                ? isTamil
                  ? "நேரலை இயங்குகிறது"
                  : "Live Active"
                : status === "connecting"
                ? isTamil
                  ? "இணைக்கிறது..."
                  : "Connecting..."
                : isTamil
                ? "தயார்"
                : "Ready"}
            </span>
          </div>

          {/* Mute toggle if connected */}
          {status === "connected" && (
            <button
              onClick={handleToggleMute}
              title={isMuted ? "Unmute" : "Mute"}
              className={`p-2 rounded-full border text-xs transition-all ${
                isMuted
                  ? "bg-red-950/60 border-red-800 text-red-300"
                  : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

          {/* Settings button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full bg-[#1e1f20] border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
            title="Open Assistant Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Innovation & Flagship Architecture Hub Button */}
          <button
            onClick={() => setIsInnovationHubOpen(true)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-950/70 via-purple-950/60 to-blue-950/70 border border-emerald-500/40 text-emerald-200 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-900/30 transition-all flex items-center gap-1.5 group"
            title="Open Innovation & Flagship Architecture Hub (Agricultural Advisory & Disaster Early Warning)"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-12 transition-transform" />
            <span className="hidden md:inline">
              {isTamil ? "🚀 புதுமை மையம்" : "🚀 Innovation Hub"}
            </span>
            <span className="md:hidden">🚀 Hub</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono hidden sm:inline">
              Agri+Disaster
            </span>
          </button>
        </div>
      </header>

      {/* Error notification banner if any */}
      {errorMessage && (
        <div className="bg-red-950/70 border-b border-red-800/40 px-4 py-2 text-xs text-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-200 text-xs font-semibold underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 overflow-hidden">
        {/* Left Column: VentusGPT Stage & Controls (7 cols on desktop) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Main Visualizer Stage */}
          <div className="flex-1 min-h-[380px] sm:min-h-[440px] bg-[#1e1f20]/60 rounded-3xl border border-white/10 backdrop-blur-2xl relative overflow-hidden flex flex-col items-center justify-center p-6 shadow-2xl">
            {/* Ambient Cosmic Lights */}
            <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Video Picture-in-Picture or Split View Overlay */}
            {videoMode !== "none" && (
              <div className="w-full mb-4">
                <VideoViewport
                  mode={videoMode}
                  onFrame={handleVideoFrame}
                  onClose={() => setVideoMode("none")}
                  fps={settings.fps}
                />
              </div>
            )}

            {/* Glowing VentusGPT Audio Reactive Orb */}
            <AudioOrb
              status={status}
              isListening={isListening}
              isSpeaking={isSpeaking}
              isThinking={isThinking}
              activeTool={activeTool}
              userVolume={userVolume}
              modelVolume={modelVolume}
              isTamil={isTamil}
              onClick={handleToggleConnect}
            />

            {/* Subtitle Banner */}
            <div className="w-full max-w-lg mt-4 min-h-[44px] flex items-center justify-center text-center px-4">
              {liveCaption ? (
                <div className="bg-[#131314]/90 border border-purple-500/40 px-4 py-2 rounded-2xl text-xs sm:text-sm text-purple-200 backdrop-blur-md shadow-lg">
                  <span className="text-[10px] uppercase font-bold text-purple-400 block mb-0.5">
                    {isTamil ? "நேரலை வசனம்" : "VentusGPT"}
                  </span>
                  "{liveCaption}"
                </div>
              ) : status === "connected" ? (
                <p className="text-xs text-slate-400 italic">
                  {isTamil
                    ? "மைக் வழியாக தமிழில் பேசுங்கள் அல்லது கேமரா/ஸ்கிரீன் பகிருங்கள்..."
                    : "Speak into your microphone or ask VentusGPT to look at your screen..."}
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  {isTamil
                    ? "நேரலை உரையாடலைத் தொடங்க நடுவில் உள்ள உருண்டையைத் தட்டவும்"
                    : "Click the orb or mic to connect VentusGPT"}
                </p>
              )}
            </div>
          </div>

          {/* Control Bar */}
          <ControlBar
            status={status}
            onToggleConnect={handleToggleConnect}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            videoMode={videoMode}
            onToggleCamera={handleToggleCamera}
            onToggleScreen={handleToggleScreen}
            onInterrupt={handleInterrupt}
            isSpeaking={isSpeaking}
            selectedVoice={settings.voice}
            onSelectVoice={(v) => setSettings({ ...settings, voice: v })}
            mode={mode}
            onSelectMode={(m) => setMode(m)}
            onSendTextMessage={handleSendTextMessage}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isTamil={isTamil}
            onToggleTamil={handleToggleTamil}
          />
        </div>

        {/* Right Column: Transcript Stream & Tools Panel (5 cols on desktop) */}
        <div className="lg:col-span-5 flex flex-col gap-4 min-h-[500px]">
          {/* Upper half: Conversation Feed */}
          <div className="flex-1 min-h-[340px]">
            <TranscriptView
              transcripts={transcripts}
              liveCaption={liveCaption}
              onClear={() => setTranscripts([])}
              onPlayAudio={handlePlayAudio}
              onSelectPrompt={handleSendTextMessage}
              isTamil={isTamil}
            />
          </div>

          {/* Lower half: Tools & Memory Board */}
          <div className="h-72">
            <ToolsPanel
              notes={notes}
              images={images}
              onDeleteNote={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
              onSendPrompt={handleSendTextMessage}
              onGenerateImageManual={handleGenerateImageManual}
              isGeneratingImage={isGeneratingImage}
              isTamil={isTamil}
              onOpenInnovationHub={() => setIsInnovationHubOpen(true)}
            />
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => setSettings(newSettings)}
        isConnected={status === "connected"}
        hasApiKey={hasApiKey}
      />

      {/* Flagship Innovation & Architecture Hub Modal */}
      <InnovationHubModal
        isOpen={isInnovationHubOpen}
        onClose={() => setIsInnovationHubOpen(false)}
        isTamil={isTamil}
        onTriggerLiveAlert={(alertText) => {
          setLiveCaption(alertText);
          setTimeout(() => {
            setLiveCaption((curr) => (curr === alertText ? null : curr));
          }, 9000);
        }}
        onSendToVoiceStream={(text) => handleSendTextMessage(text)}
      />

      {/* Official Project Full Logo Modal */}
      <LogoModal
        isOpen={isLogoModalOpen}
        onClose={() => setIsLogoModalOpen(false)}
        isTamil={isTamil}
      />
    </div>
  );
}
