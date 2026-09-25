/**
 * Icon + value + label chip, used for "12 waiting", "~25 min wait", etc.
 * `tone` tints the icon well; leave default for neutral stats.
 */
const TONES = {
  neutral: "bg-[#F1F1F3] text-ink-soft",
  signal: "bg-signal/10 text-signal",
  teal: "bg-teal/10 text-teal",
  amber: "bg-amber/10 text-[#9A6300]",
  coral: "bg-coral/10 text-coral",
};

export default function StatPill({ icon, value, label, tone = "neutral" }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-paper px-3 py-2.5 flex-1 min-w-0">
      <span
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${TONES[tone] || TONES.neutral}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-mono font-bold text-[15px] leading-none truncate">
          {value}
        </p>
        <p className="text-ink-soft text-[11px] mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}
