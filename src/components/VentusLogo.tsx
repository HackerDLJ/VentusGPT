import React from "react";

interface VentusLogoProps {
  className?: string;
  size?: number | string;
  variant?: "full" | "mark" | "icon";
  showText?: boolean;
  onClick?: () => void;
  title?: string;
}

/** Supplied VentusGPT brand mark: blue dot + rounded diagonal pill. */
export const VentusLogo: React.FC<VentusLogoProps> = ({
  className = "",
  size = 32,
  variant = "mark",
  showText = false,
  onClick,
  title = "VentusGPT",
}) => {
  const dimension = typeof size === "number" ? `${size}px` : size;
  const blue = "#2424FF";

  const Mark = () => (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="25" cy="24" r="13" fill={blue} />
      <rect
        x="40"
        y="19"
        width="18"
        height="70"
        rx="9"
        fill={blue}
        transform="rotate(30 49 54)"
      />
    </svg>
  );

  if (variant === "full") {
    return (
      <div
        className={`inline-flex items-center gap-4 select-none ${className}`}
        style={{ minHeight: dimension }}
        onClick={onClick}
        title={title}
      >
        <div className="shrink-0" style={{ width: dimension, height: dimension }}>
          <Mark />
        </div>
        <span className="font-semibold tracking-[-0.055em] text-[1.55em] text-current">
          VentusGPT
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative inline-flex items-center gap-2 select-none ${className}`}
      onClick={onClick}
      title={title}
    >
      <div className="shrink-0" style={{ width: dimension, height: dimension }}>
        <Mark />
      </div>
      {showText && (
        <span className="font-semibold tracking-[-0.045em] text-current">VentusGPT</span>
      )}
    </div>
  );
};
