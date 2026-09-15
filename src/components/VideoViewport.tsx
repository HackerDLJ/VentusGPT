import React, { useEffect, useRef, useState } from "react";
import { Camera, Monitor, Eye, X, RefreshCw, Maximize2, Minimize2 } from "lucide-react";

interface VideoViewportProps {
  mode: "camera" | "screen" | "none";
  onFrame: (base64Jpeg: string) => void;
  onClose: () => void;
  fps?: number;
}

export const VideoViewport: React.FC<VideoViewportProps> = ({
  mode,
  onFrame,
  onClose,
  fps = 1,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastSnapshot, setLastSnapshot] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: any = null;

    async function initMedia() {
      try {
        setError(null);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }

        let stream: MediaStream;
        if (mode === "camera") {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 960 },
              height: { ideal: 720 },
              facingMode: "user",
            },
            audio: false,
          });
        } else if (mode === "screen") {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: "monitor",
            },
            audio: false,
          });

          // Handle screen share ended by user
          stream.getVideoTracks()[0].onended = () => {
            onClose();
          };
        } else {
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStreamActive(true);
        }

        // Send frames at target FPS (e.g. 1 frame every 1000ms per Gemini guidelines)
        const frameIntervalMs = Math.max(800, Math.round(1000 / fps));
        intervalId = setInterval(() => {
          captureAndSendFrame();
        }, frameIntervalMs);
      } catch (err: any) {
        console.error("Error accessing video stream:", err);
        setError(err.message || "Failed to access video stream");
        setStreamActive(false);
      }
    }

    if (mode !== "none") {
      initMedia();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setStreamActive(false);
    };
  }, [mode, fps]);

  const captureAndSendFrame = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvasRef.current = canvas;
    }

    // Scale down image to max 1024x1024 as in the Python script thumbnail pattern
    let width = video.videoWidth || 640;
    let height = video.videoHeight || 480;
    const maxDim = 1024;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    // Get JPEG base64
    const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
    const base64Data = dataUrl.split(",")[1];

    if (base64Data) {
      onFrame(base64Data);
      setFrameCount((prev) => prev + 1);
      setLastSnapshot(dataUrl);
    }
  };

  if (mode === "none") return null;

  return (
    <div
      id="video-viewport"
      className={`relative rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-900/90 shadow-2xl transition-all duration-300 ${
        isExpanded
          ? "w-full max-w-4xl mx-auto h-[380px] sm:h-[480px]"
          : "w-full sm:w-80 h-52 sm:h-60"
      }`}
    >
      {/* Header bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-slate-950/90 to-transparent">
        <div className="flex items-center gap-2">
          {mode === "camera" ? (
            <Camera className="w-4 h-4 text-cyan-400" />
          ) : (
            <Monitor className="w-4 h-4 text-emerald-400" />
          )}
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            {mode === "camera" ? "Live Camera View" : "Screen Share Stream"}
          </span>
          {streamActive && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              1 FPS Live ({frameCount} frames sent)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="btn-take-snapshot"
            onClick={captureAndSendFrame}
            title="Send Instant Snapshot to VentusGPT"
            className="p-1 rounded-md text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-toggle-expand"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Minimize" : "Expand"}
            className="p-1 rounded-md text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors"
          >
            {isExpanded ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            id="btn-close-video"
            onClick={onClose}
            title="Stop Video Stream"
            className="p-1 rounded-md text-slate-300 hover:text-red-400 bg-slate-800/80 hover:bg-slate-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${
          mode === "camera" ? "scale-x-[-1]" : ""
        }`}
      />

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 bg-slate-900/95 text-center">
          <p className="text-xs text-red-400 font-medium mb-2">{error}</p>
          <button
            onClick={() => {
              setError(null);
            }}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Bottom overlay info */}
      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-slate-950/90 to-transparent flex items-center justify-between text-[11px] text-slate-300">
        <span className="flex items-center gap-1.5 truncate">
          <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>VentusGPT can see this feed in real time</span>
        </span>
        <button
          onClick={captureAndSendFrame}
          className="px-2 py-0.5 text-[10px] font-medium rounded bg-cyan-600/80 hover:bg-cyan-500 text-white transition-colors"
        >
          Look Now
        </button>
      </div>
    </div>
  );
};
