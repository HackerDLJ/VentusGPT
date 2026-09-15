import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, Volume2, Sparkles, AlertCircle, Wrench, Radio } from "lucide-react";

interface AudioOrbProps {
  status: "disconnected" | "connecting" | "connected" | "error";
  isListening: boolean;
  isSpeaking: boolean;
  isThinking: boolean;
  activeTool: string | null;
  userVolume: number;
  modelVolume: number;
  isTamil?: boolean;
  onClick?: () => void;
}

export const AudioOrb: React.FC<AudioOrbProps> = ({
  status,
  isListening,
  isSpeaking,
  isThinking,
  activeTool,
  userVolume,
  modelVolume,
  isTamil = false,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Smooth visual volume refs for buttery physics
  const smoothedUserVol = useRef(0);
  const smoothedModelVol = useRef(0);
  const phaseRef = useRef(0);
  const breathPhase = useRef(0);

  // Derived state string for Framer Motion transitions
  const currentState =
    status !== "connected"
      ? status
      : activeTool
      ? "tool"
      : isThinking
      ? "thinking"
      : isSpeaking
      ? "speaking"
      : isListening
      ? "listening"
      : "idle";

  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Smooth volume interpolation using spring-like damping
      smoothedUserVol.current += (userVolume - smoothedUserVol.current) * 0.16;
      smoothedModelVol.current += (modelVolume - smoothedModelVol.current) * 0.16;

      const effectiveVol = Math.max(
        smoothedUserVol.current * 1.6,
        smoothedModelVol.current * 2.2
      );

      phaseRef.current += 0.035 + effectiveVol * 0.04;
      breathPhase.current += 0.02;

      // Gentle natural breathing radius
      const breath = Math.sin(breathPhase.current) * 3;
      const baseRadius = 64 + breath + effectiveVol * 36;

      // 1. Multi-layered Ambient Atmosphere Glow
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.2,
        centerX,
        centerY,
        baseRadius * 2.1
      );

      if (status === "connected") {
        if (activeTool) {
          glowGrad.addColorStop(0, "rgba(245, 158, 11, 0.4)");
          glowGrad.addColorStop(0.5, "rgba(217, 119, 6, 0.15)");
          glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        } else if (isSpeaking) {
          // Google Gemini celestial purple & aurora pink
          glowGrad.addColorStop(0, "rgba(168, 85, 247, 0.45)");
          glowGrad.addColorStop(0.4, "rgba(236, 72, 153, 0.2)");
          glowGrad.addColorStop(0.8, "rgba(59, 130, 246, 0.08)");
          glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        } else if (isListening) {
          // Electric Cyan & Gemini Azure
          glowGrad.addColorStop(0, "rgba(34, 211, 238, 0.45)");
          glowGrad.addColorStop(0.4, "rgba(59, 130, 246, 0.2)");
          glowGrad.addColorStop(0.8, "rgba(99, 102, 241, 0.08)");
          glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        } else {
          // Standby soft azure breath
          glowGrad.addColorStop(0, "rgba(129, 140, 248, 0.25)");
          glowGrad.addColorStop(0.5, "rgba(192, 132, 252, 0.1)");
          glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        }
      } else if (status === "connecting") {
        glowGrad.addColorStop(0, "rgba(96, 165, 250, 0.35)");
        glowGrad.addColorStop(0.6, "rgba(147, 197, 253, 0.1)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else if (status === "error") {
        glowGrad.addColorStop(0, "rgba(239, 68, 68, 0.35)");
        glowGrad.addColorStop(0.6, "rgba(220, 38, 38, 0.1)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else {
        glowGrad.addColorStop(0, "rgba(148, 163, 184, 0.2)");
        glowGrad.addColorStop(0.6, "rgba(100, 116, 139, 0.05)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      }

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 2.1, 0, Math.PI * 2);
      ctx.fill();

      // 2. Harmonic Fluid Blob with Silky Bezier Curve Interpolation
      const points = 16;
      const angleStep = (Math.PI * 2) / points;
      const coords: { x: number; y: number }[] = [];

      for (let i = 0; i < points; i++) {
        const angle = i * angleStep;
        // Harmonic waves
        const wave1 = Math.sin(angle * 3 + phaseRef.current) * (6 + effectiveVol * 16);
        const wave2 = Math.cos(angle * 2 - phaseRef.current * 0.8) * (4 + effectiveVol * 12);
        const r = baseRadius + wave1 + wave2;
        coords.push({
          x: centerX + Math.cos(angle) * r,
          y: centerY + Math.sin(angle) * r,
        });
      }

      // Draw smooth closed cardinal/bezier path
      ctx.save();
      ctx.beginPath();
      const firstMidX = (coords[0].x + coords[points - 1].x) / 2;
      const firstMidY = (coords[0].y + coords[points - 1].y) / 2;
      ctx.moveTo(firstMidX, firstMidY);

      for (let i = 0; i < points; i++) {
        const next = coords[(i + 1) % points];
        const midX = (coords[i].x + next.x) / 2;
        const midY = (coords[i].y + next.y) / 2;
        ctx.quadraticCurveTo(coords[i].x, coords[i].y, midX, midY);
      }
      ctx.closePath();

      // Inner Core Gradient
      const innerGrad = ctx.createLinearGradient(
        centerX - baseRadius,
        centerY - baseRadius,
        centerX + baseRadius,
        centerY + baseRadius
      );

      if (activeTool) {
        innerGrad.addColorStop(0, "#f59e0b");
        innerGrad.addColorStop(0.5, "#ec4899");
        innerGrad.addColorStop(1, "#6366f1");
      } else if (isSpeaking) {
        innerGrad.addColorStop(0, "#c084fc");
        innerGrad.addColorStop(0.4, "#8b5cf6");
        innerGrad.addColorStop(0.8, "#3b82f6");
        innerGrad.addColorStop(1, "#06b6d4");
      } else if (isListening) {
        innerGrad.addColorStop(0, "#22d3ee");
        innerGrad.addColorStop(0.5, "#3b82f6");
        innerGrad.addColorStop(1, "#8b5cf6");
      } else if (status === "connecting") {
        innerGrad.addColorStop(0, "#60a5fa");
        innerGrad.addColorStop(1, "#3b82f6");
      } else if (status === "error") {
        innerGrad.addColorStop(0, "#f87171");
        innerGrad.addColorStop(1, "#dc2626");
      } else {
        innerGrad.addColorStop(0, "#475569");
        innerGrad.addColorStop(0.5, "#334155");
        innerGrad.addColorStop(1, "#1e293b");
      }

      ctx.fillStyle = innerGrad;
      ctx.shadowColor = isSpeaking
        ? "rgba(168, 85, 247, 0.6)"
        : isListening
        ? "rgba(34, 211, 238, 0.6)"
        : "rgba(99, 102, 241, 0.3)";
      ctx.shadowBlur = 28 + effectiveVol * 28;
      ctx.fill();
      ctx.restore();

      // 3. Smooth Harmonic Soundwave Ripples (Google Gemini sound wave effect)
      if (effectiveVol > 0.05 || isSpeaking || isListening) {
        const ringsCount = 2;
        for (let rIdx = 0; rIdx < ringsCount; rIdx++) {
          const offset = (phaseRef.current * 20 + rIdx * 30) % 60;
          const rippleRadius = baseRadius + 12 + offset;
          const alpha = Math.max(0, 1 - offset / 60) * 0.45;

          ctx.strokeStyle = isSpeaking
            ? `rgba(192, 132, 252, ${alpha})`
            : `rgba(56, 189, 248, ${alpha})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [status, isListening, isSpeaking, isThinking, activeTool, userVolume, modelVolume]);

  return (
    <div
      id="gemini-audio-orb-container"
      className="relative flex flex-col items-center justify-center cursor-pointer select-none group"
      onClick={onClick}
    >
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
        {/* Subtle Ambient Aura with Framer Motion State Transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`ambient-aura-${currentState}`}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{
              opacity:
                currentState === "speaking"
                  ? 0.55
                  : currentState === "listening"
                  ? 0.45
                  : currentState === "thinking"
                  ? 0.5
                  : 0.25,
              scale:
                currentState === "speaking"
                  ? [1, 1.07, 1]
                  : currentState === "listening"
                  ? [1, 1.05, 1]
                  : currentState === "thinking"
                  ? [1, 1.04, 1]
                  : [1, 1.02, 1],
            }}
            exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.25 } }}
            transition={{
              duration:
                currentState === "speaking" ? 1.5 : currentState === "listening" ? 1.8 : 2.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`absolute inset-4 rounded-full blur-2xl pointer-events-none transition-colors duration-500 ${
              currentState === "speaking"
                ? "bg-purple-600/35"
                : currentState === "listening"
                ? "bg-cyan-500/30"
                : currentState === "thinking"
                ? "bg-blue-600/35"
                : currentState === "tool"
                ? "bg-amber-500/35"
                : "bg-indigo-600/20"
            }`}
          />
        </AnimatePresence>

        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className="w-full h-full transform transition-transform duration-300 group-hover:scale-105 relative z-10"
        />

        {/* Center Orb State Icon with Framer Motion Transitions */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <AnimatePresence mode="wait">
            {activeTool ? (
              <motion.div
                key="state-tool"
                initial={{ opacity: 0, scale: 0.8, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.8, rotate: 20 }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-950/70 backdrop-blur-md border border-amber-400/40 text-amber-200 shadow-xl"
              >
                <Wrench className="w-5 h-5 animate-spin text-amber-300" />
                <span className="text-[11px] font-semibold tracking-wide">
                  {activeTool}
                </span>
              </motion.div>
            ) : isSpeaking ? (
              <motion.div
                key="state-speaking"
                initial={{ opacity: 0, scale: 0.82, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.82, y: -6 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/60 backdrop-blur-md border border-purple-400/40 shadow-xl shadow-purple-950/40"
              >
                <Volume2 className="w-5 h-5 text-purple-200 animate-pulse" />
                <div className="flex items-end gap-0.5 h-3.5">
                  <motion.span
                    animate={{ height: ["4px", "14px", "6px"] }}
                    transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut" }}
                    className="w-0.5 bg-purple-300 rounded-full"
                  />
                  <motion.span
                    animate={{ height: ["8px", "16px", "10px"] }}
                    transition={{ repeat: Infinity, duration: 0.5, delay: 0.1, ease: "easeInOut" }}
                    className="w-0.5 bg-purple-200 rounded-full"
                  />
                  <motion.span
                    animate={{ height: ["5px", "13px", "4px"] }}
                    transition={{ repeat: Infinity, duration: 0.65, delay: 0.2, ease: "easeInOut" }}
                    className="w-0.5 bg-purple-300 rounded-full"
                  />
                </div>
                <span className="text-[11px] font-semibold text-purple-100 tracking-wide">
                  {isTamil ? "பேசுகிறது..." : "Speaking..."}
                </span>
              </motion.div>
            ) : isListening ? (
              <motion.div
                key="state-listening"
                initial={{ opacity: 0, scale: 0.82, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.82, y: -6 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 backdrop-blur-md border border-cyan-400/40 shadow-xl shadow-cyan-950/40"
              >
                <Mic className="w-5 h-5 text-cyan-200 animate-pulse" />
                <div className="flex items-end gap-0.5 h-3.5">
                  <motion.span
                    animate={{ height: ["4px", "12px", "4px"] }}
                    transition={{ repeat: Infinity, duration: 0.7, ease: "easeInOut" }}
                    className="w-0.5 bg-cyan-300 rounded-full"
                  />
                  <motion.span
                    animate={{ height: ["6px", "14px", "6px"] }}
                    transition={{ repeat: Infinity, duration: 0.55, delay: 0.15, ease: "easeInOut" }}
                    className="w-0.5 bg-cyan-200 rounded-full"
                  />
                  <motion.span
                    animate={{ height: ["3px", "10px", "3px"] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.25, ease: "easeInOut" }}
                    className="w-0.5 bg-cyan-300 rounded-full"
                  />
                </div>
                <span className="text-[11px] font-semibold text-cyan-100 tracking-wide">
                  {isTamil ? "கேட்கிறது..." : "Listening..."}
                </span>
              </motion.div>
            ) : isThinking ? (
              <motion.div
                key="state-thinking"
                initial={{ opacity: 0, scale: 0.82, rotate: -15 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.82, rotate: 15 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/60 backdrop-blur-md border border-blue-400/40 shadow-xl shadow-blue-950/40"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
                >
                  <Sparkles className="w-5 h-5 text-blue-200" />
                </motion.div>
                <span className="text-[11px] font-semibold text-blue-100 tracking-wide">
                  {isTamil ? "சிந்திக்கிறது..." : "Thinking..."}
                </span>
              </motion.div>
            ) : status === "error" ? (
              <motion.div
                key="state-error"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-950/70 border border-red-400/40 text-red-200"
              >
                <AlertCircle className="w-5 h-5 text-red-300" />
                <span className="text-[11px] font-semibold">
                  {isTamil ? "பிழை" : "Error"}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="state-idle"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ scale: [1, 1.05, 1], opacity: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  scale: { repeat: Infinity, duration: 3.2, ease: "easeInOut" },
                  opacity: { duration: 0.3 },
                }}
                className="flex flex-col items-center justify-center"
              >
                {/* VentusGPT Official Aerodynamic Chevron Mark */}
                <div className="w-12 h-12 flex items-center justify-center">
                  <svg
                    viewBox="0 0 1000 1000"
                    className="w-11 h-11 drop-shadow-lg"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="orbChevronGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFFFFF" />
                        <stop offset="25%" stopColor="#F1F5F9" />
                        <stop offset="60%" stopColor="#CBD5E1" />
                        <stop offset="100%" stopColor="#94A3B8" />
                      </linearGradient>
                      <linearGradient id="orbChevronGradLong" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFFFFF" />
                        <stop offset="20%" stopColor="#F8FAFC" />
                        <stop offset="55%" stopColor="#CBD5E1" />
                        <stop offset="100%" stopColor="#94A3B8" />
                      </linearGradient>
                    </defs>
                    <g transform="translate(170, 368) rotate(-45)">
                      <rect x="0" y="0" width="180" height="116" rx="30" ry="30" fill="url(#orbChevronGrad)" />
                      <rect x="0" y="144" width="360" height="116" rx="30" ry="30" fill="url(#orbChevronGrad)" />
                      <rect x="0" y="288" width="530" height="116" rx="30" ry="30" fill="url(#orbChevronGradLong)" />
                    </g>
                  </svg>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* State label badge with AnimatePresence text transition */}
      <div className="mt-3 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1e1f20]/90 border border-white/10 backdrop-blur-md text-xs font-medium text-slate-200 shadow-lg">
        <span
          className={`w-2 h-2 rounded-full transition-colors duration-300 ${
            status === "connected"
              ? activeTool
                ? "bg-amber-400 animate-ping"
                : isSpeaking
                ? "bg-purple-400 animate-pulse"
                : isListening
                ? "bg-cyan-400 animate-pulse"
                : isThinking
                ? "bg-blue-400 animate-pulse"
                : "bg-emerald-400"
              : status === "connecting"
              ? "bg-blue-400 animate-pulse"
              : status === "error"
              ? "bg-red-400"
              : "bg-slate-500"
          }`}
        />
        <AnimatePresence mode="wait">
          <motion.span
            key={currentState + (isTamil ? "-ta" : "-en")}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {status === "disconnected" && (isTamil ? "இணைக்க தயார் (தட்டவும்)" : "Ready to Connect")}
            {status === "connecting" && (isTamil ? "இணைக்கப்படுகிறது..." : "Connecting to VentusGPT...")}
            {status === "error" && (isTamil ? "இணைப்பு பிழை" : "Live Bridge Standby")}
            {status === "connected" && activeTool && `${isTamil ? "செயல்முறை" : "Tool"}: ${activeTool}`}
            {status === "connected" && !activeTool && isSpeaking && (isTamil ? "VentusGPT பேசுகிறது" : "VentusGPT Speaking")}
            {status === "connected" && !activeTool && !isSpeaking && isListening && (isTamil ? "உங்களை கேட்கிறது" : "Listening to you")}
            {status === "connected" && !activeTool && !isSpeaking && !isListening && isThinking && (isTamil ? "சிந்திக்கிறது..." : "VentusGPT Thinking...")}
            {status === "connected" && !activeTool && !isSpeaking && !isListening && !isThinking && (isTamil ? "நேரலை தயார்" : "VentusGPT Ready")}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
};
