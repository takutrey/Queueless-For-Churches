/**
 * Row of equal-width stat boxes: an icon, a bold value, and a small label.
 * `stats` is an array of { icon, value, label }. Column count is derived
 * from the array length via inline style so any count (2, 3, 4...) works
 * without needing a matching Tailwind grid-cols-N class.
 */
export default function QueueStatGrid({ stats }) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
    >
      {stats.map((s, i) => (
        <div
          key={i}
          className="rounded-2xl bg-slate-50 border border-slate-100 px-3 py-4 flex flex-col items-center text-center gap-1.5"
        >
          <span className="text-indigo-500">{s.icon}</span>
          <span className="font-mono font-bold text-lg text-slate-900 leading-none">
            {s.value}
          </span>
          <span className="text-[11px] text-slate-500 leading-tight">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
