import React, { useEffect, useRef } from "react";

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

export const AudioOrb: React.FC<AudioOrbProps> = ({ status, isListening, isSpeaking, isThinking, activeTool, userVolume, modelVolume, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const volume = useRef(0);

  useEffect(() => {
    let frame = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      volume.current += (Math.max(userVolume, modelVolume) - volume.current) * 0.16;
      const v = volume.current;
      const t = performance.now() / 1000;
      const w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2;
      const radius = 72 + v * 42 + Math.sin(t * 1.6) * 2;
      const blue = status === "error" ? "#ff4d5e" : "#2424FF";

      ctx.clearRect(0, 0, w, h);
      const glow = ctx.createRadialGradient(cx, cy, 12, cx, cy, radius * 2.2);
      glow.addColorStop(0, status === "connected" ? "rgba(36,36,255,.24)" : "rgba(120,120,150,.10)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, radius * 2.2, 0, Math.PI * 2); ctx.fill();

      ctx.beginPath();
      const points = 96;
      for (let i = 0; i <= points; i++) {
        const a = (i / points) * Math.PI * 2;
        const wave = Math.sin(a * 7 + t * 3) * (3 + v * 18) + Math.sin(a * 13 - t * 2) * (2 + v * 8);
        const r = radius + wave;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = blue;
      ctx.shadowColor = blue;
      ctx.shadowBlur = status === "connected" ? 28 + v * 35 : 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      if (isSpeaking || isListening || isThinking) {
        ctx.strokeStyle = "rgba(255,255,255,.22)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, radius + 18 + Math.sin(t * 2) * 4, 0, Math.PI * 2); ctx.stroke();
      }
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [status, isListening, isSpeaking, isThinking, userVolume, modelVolume]);

  const label = activeTool || (isThinking ? "Thinking" : isSpeaking ? "Speaking" : isListening ? "Listening" : status === "connecting" ? "Connecting" : status === "connected" ? "Ready" : "Start Ventus Live");

  return (
    <button type="button" onClick={onClick} className="relative flex flex-col items-center justify-center select-none bg-transparent border-0 outline-none group" aria-label="Ventus Live">
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
        <canvas ref={canvasRef} width={360} height={360} className="w-full h-full transition-transform duration-500 group-hover:scale-[1.025]" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-black/70 border border-white/15 backdrop-blur-md flex items-center justify-center">
              <span className="block w-3.5 h-3.5 rounded-full bg-[#2424FF] shadow-[0_0_22px_rgba(36,36,255,.9)]" />
            </div>
            <span className="text-[10px] uppercase tracking-[.22em] font-semibold text-white/75">{label}</span>
          </div>
        </div>
      </div>
      <span className="mt-1 text-[10px] tracking-[.18em] uppercase text-slate-500">Ventus Live</span>
    </button>
  );
};
