import React from "react";

interface VentusLogoProps {
  className?: string;
  size?: number | string;
  variant?: "full" | "mark" | "icon";
  showText?: boolean;
  onClick?: () => void;
  title?: string;
}

/**
 * Official VentusGPT Project Logo Component
 * Reproduces the authentic 14-band slate-to-charcoal background,
 * 3 aerodynamic metallic silver-white chevron pill bars,
 * and high-contrast geometric VentusGPT branding.
 */
export const VentusLogo: React.FC<VentusLogoProps> = ({
  className = "",
  size = 32,
  variant = "mark",
  showText = false,
  onClick,
  title = "VentusGPT Logo",
}) => {
  const dimension = typeof size === "number" ? `${size}px` : size;

  if (variant === "full") {
    return (
      <div
        className={`relative inline-flex flex-col items-center select-none overflow-hidden rounded-2xl shadow-xl border border-white/10 ${className}`}
        style={{ width: dimension, height: dimension }}
        onClick={onClick}
        title={title}
      >
        <img
          src="/logo.svg"
          alt="VentusGPT Full Logo"
          className="w-full h-full object-cover rounded-2xl"
          draggable={false}
        />
      </div>
    );
  }

  // Standalone Chevron Mark / Avatar Icon
  return (
    <div
      className={`relative inline-flex items-center gap-2 select-none ${className}`}
      onClick={onClick}
      title={title}
    >
      <div
        className="relative flex items-center justify-center shrink-0 overflow-hidden rounded-lg shadow-md border border-white/10 bg-[#161920]"
        style={{ width: dimension, height: dimension }}
      >
        <svg
          viewBox="0 0 1000 1000"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="markBarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FFFFFF" />
              <stop offset="25%" stop-color="#F1F5F9" />
              <stop offset="60%" stop-color="#CBD5E1" />
              <stop offset="100%" stop-color="#94A3B8" />
            </linearGradient>
            <linearGradient id="markBarGradLong" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FFFFFF" />
              <stop offset="20%" stop-color="#F8FAFC" />
              <stop offset="55%" stop-color="#CBD5E1" />
              <stop offset="100%" stop-color="#94A3B8" />
            </linearGradient>
            <filter id="markDropShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.3" />
            </filter>
          </defs>

          {/* 14 Horizontal Slate Stripes */}
          <g id="bgStripes">
            <rect x="0" y="0" width="1000" height="72" fill="#545b6a" />
            <rect x="0" y="71.43" width="1000" height="72" fill="#4b5261" />
            <rect x="0" y="142.86" width="1000" height="72" fill="#424857" />
            <rect x="0" y="214.29" width="1000" height="72" fill="#3a404e" />
            <rect x="0" y="285.71" width="1000" height="72" fill="#323744" />
            <rect x="0" y="357.14" width="1000" height="72" fill="#2b303c" />
            <rect x="0" y="428.57" width="1000" height="72" fill="#242833" />
            <rect x="0" y="500.00" width="1000" height="72" fill="#1e222b" />
            <rect x="0" y="571.43" width="1000" height="72" fill="#181b23" />
            <rect x="0" y="642.86" width="1000" height="72" fill="#14161d" />
            <rect x="0" y="714.29" width="1000" height="72" fill="#101217" />
            <rect x="0" y="785.71" width="1000" height="72" fill="#0c0d12" />
            <rect x="0" y="857.14" width="1000" height="72" fill="#08090d" />
            <rect x="0" y="928.57" width="1000" height="72" fill="#050608" />
          </g>

          {/* Centered 3-pill Chevron Glyph */}
          <g transform="translate(170, 368) rotate(-45)" filter="url(#markDropShadow)">
            <rect x="0" y="0" width="180" height="116" rx="30" ry="30" fill="url(#markBarGrad)" />
            <rect x="0" y="144" width="360" height="116" rx="30" ry="30" fill="url(#markBarGrad)" />
            <rect x="0" y="288" width="530" height="116" rx="30" ry="30" fill="url(#markBarGradLong)" />
          </g>

          {/* Typography */}
          <text
            x="500"
            y="780"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize="112"
            fontWeight="800"
            letterSpacing="-2.5"
            fill="#FFFFFF"
          >
            VentusGPT
          </text>
        </svg>
      </div>

      {showText && (
        <span className="font-bold tracking-tight text-white flex items-center gap-1.5">
          VentusGPT
        </span>
      )}
    </div>
  );
};
