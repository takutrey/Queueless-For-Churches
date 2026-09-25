import { useLayoutEffect, useRef, useState } from "react";

const SIZES = {
  lg: "w-12 h-16 text-3xl rounded-xl",
  md: "w-7 h-9 text-base rounded-lg",
  sm: "w-5 h-7 text-sm rounded-md",
};

let stylesInjected = false;
function ensureFlapStyles() {
  if (stylesInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.setAttribute("data-ql-split-flap", "true");
  style.textContent = `
    @keyframes ql-split-flap {
      0% { transform: rotateX(0deg); }
      50% { transform: rotateX(-90deg); opacity: 0.55; }
      51% { transform: rotateX(90deg); opacity: 0.55; }
      100% { transform: rotateX(0deg); opacity: 1; }
    }
    .ql-split-flap-tile { animation: ql-split-flap 420ms ease; }
    @media (prefers-reduced-motion: reduce) {
      .ql-split-flap-tile { animation: none; }
    }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

/**
 * Renders `value` as a row of airport-departure-board style tiles.
 * Only the characters that actually changed since the last render replay
 * the flip animation — unchanged characters stay still.
 *
 * Self-contained: injects its own @keyframes once on first mount, so it
 * doesn't depend on any tailwind.config.js animation entries.
 */
export default function SplitFlapBoard({ value, size = "md", className = "" }) {
  ensureFlapStyles();
  const chars = String(value ?? "").split("");
  const prevChars = useRef(chars);
  const flipCounts = useRef(chars.map(() => 0));
  const [, forceRender] = useState(0);

  useLayoutEffect(() => {
    const prev = prevChars.current;
    let changed = false;

    chars.forEach((ch, i) => {
      if (prev[i] !== ch) {
        flipCounts.current[i] = (flipCounts.current[i] || 0) + 1;
        changed = true;
      }
    });
    flipCounts.current = chars.map((_, i) => flipCounts.current[i] || 0);
    prevChars.current = chars;

    if (changed) forceRender((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div
      className={`flex gap-1 ${className}`}
      role="status"
      aria-label={String(value)}
    >
      {chars.map((ch, i) => (
        <div
          key={`${i}-${flipCounts.current[i] || 0}`}
          className={[
            SIZES[size],
            "ql-split-flap-tile relative flex items-center justify-center select-none",
            "bg-slate-900 text-white font-mono font-bold",
            "after:content-[''] after:absolute after:left-1 after:right-1",
            "after:top-1/2 after:h-px after:-translate-y-px after:bg-white/10",
          ].join(" ")}
          style={{ perspective: "200px" }}
        >
          {ch}
        </div>
      ))}
    </div>
  );
}
