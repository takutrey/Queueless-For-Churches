import { useEffect, useRef, useState } from "react";

const ITEM_H = 26;
const GAP = 8;
const STEP = ITEM_H + GAP;
const DEFAULT_VISIBLE_CAP = 4;
const EXIT_MS = 260;

function makeTokens(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `p-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
    removing: false,
  }));
}

/**
 * Turns an anonymous `peopleAhead` count (that's all the public API exposes —
 * see section 33 of the backend spec, no other customer's identity is ever
 * shared) into a row of dots. When the count drops, the front dot(s) animate
 * out and the rest — including the highlighted "you" marker — slide forward.
 */
function useQueueTokens(peopleAhead) {
  const [tokens, setTokens] = useState(() => makeTokens(peopleAhead));
  const prevAhead = useRef(peopleAhead);

  useEffect(() => {
    const prev = prevAhead.current;
    prevAhead.current = peopleAhead;
    if (peopleAhead === prev) return undefined;

    if (peopleAhead < prev) {
      const removeCount = prev - peopleAhead;
      setTokens((current) =>
        current.map((t, i) => (i < removeCount ? { ...t, removing: true } : t)),
      );
      const timer = setTimeout(() => {
        setTokens((current) => current.filter((t) => !t.removing));
      }, EXIT_MS);
      return () => clearTimeout(timer);
    }

    // Grew (e.g. someone else joined ahead of this ticket) — rare, just resync.
    setTokens(makeTokens(peopleAhead));
    return undefined;
  }, [peopleAhead]);

  return tokens;
}

export default function QueueLine({
  peopleAhead,
  transferCount = 0,
  standbyCount = 0,
  nowServingLabel,
  visibleCap = DEFAULT_VISIBLE_CAP,
}) {
  const tokens = useQueueTokens(peopleAhead);
  const removingCount = tokens.filter((t) => t.removing).length;
  const displayTokens = tokens.slice(0, visibleCap + removingCount);
  const survivingVisible = displayTokens.filter((t) => !t.removing).length;
  const overflowCount = Math.max(peopleAhead - visibleCap, 0);
  const youIndex = survivingVisible + (overflowCount > 0 ? 1 : 0);
  const trackHeight = (youIndex + 1) * STEP;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3.5">
        <p className="font-mono text-[11px] tracking-wider uppercase text-ink-soft">
          Your place in line
        </p>
        <span className="font-mono text-[13px] font-bold text-ink-soft">
          {peopleAhead} {peopleAhead === 1 ? "person ahead" : "ahead"}
        </span>
      </div>

      {(transferCount > 0 || standbyCount > 0) && (
        <p className="mb-3 text-xs text-ink-soft">
          {transferCount > 0 &&
            `${transferCount} transfer ${transferCount === 1 ? "customer" : "customers"} waiting for staff discretion.`}
          {transferCount > 0 && standbyCount > 0 ? " " : ""}
          {standbyCount > 0 &&
            `${standbyCount} customer${standbyCount === 1 ? "" : "s"} on standby.`}
        </p>
      )}

      <div className="flex items-center gap-2 mb-3">
        <span className="relative w-7 h-7 flex items-center justify-center rounded-full bg-teal text-white text-xs flex-shrink-0">
          <span className="absolute inset-0 rounded-full bg-teal motion-safe:animate-pulse-ring" />
          <span className="relative">●</span>
        </span>
        <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">
          {nowServingLabel}
        </span>
      </div>

      <div className="relative pl-3.5" style={{ minHeight: trackHeight }}>
        <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-line -translate-x-1/2" />

        {displayTokens.map((t, i) => (
          <div
            key={t.id}
            className={[
              "absolute left-0 w-[26px] h-[26px] rounded-full",
              "bg-[#DEDFE6] text-ink-soft flex items-center justify-center text-[11px] font-mono",
              "transition-transform duration-300 ease-out",
              t.removing ? "motion-safe:animate-dot-exit" : "",
            ].join(" ")}
            style={{ transform: `translateY(${i * STEP}px)` }}
          >
            •
          </div>
        ))}

        {overflowCount > 0 && (
          <div
            className="absolute left-0 h-[26px] px-2.5 rounded-full bg-[#EDEEF2] text-ink-soft flex items-center justify-center text-[11px] font-mono font-bold transition-transform duration-300 ease-out"
            style={{ transform: `translateY(${survivingVisible * STEP}px)` }}
          >
            +{overflowCount}
          </div>
        )}

        <div
          className="absolute left-0 h-7 px-3.5 rounded-2xl bg-ink text-white flex items-center gap-1.5 shadow-[0_0_0_4px_rgba(255,178,56,.28)] transition-transform duration-300 ease-out"
          style={{ transform: `translateY(${youIndex * STEP}px)` }}
        >
          <span className="text-amber text-[9px] font-mono tracking-wide">
            YOU
          </span>
        </div>
      </div>
    </div>
  );
}
