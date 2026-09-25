const STATUS_STYLES = {
  open: "bg-emerald-50 text-emerald-700",
  paused: "bg-amber-50 text-amber-700",
  closed: "bg-slate-100 text-slate-500",
  full: "bg-rose-50 text-rose-700",
  waiting: "bg-indigo-50 text-indigo-700",
  called: "bg-amber-50 text-amber-700",
  serving: "bg-emerald-50 text-emerald-700",
  completed: "bg-sky-50 text-sky-700",
  skipped: "bg-rose-50 text-rose-700",
  left: "bg-slate-100 text-slate-500",
};

const DOT_STYLES = {
  open: "bg-emerald-500",
  paused: "bg-amber-500",
  closed: "bg-slate-400",
  full: "bg-rose-500",
  waiting: "bg-indigo-500",
  called: "bg-amber-500",
  serving: "bg-emerald-500",
  completed: "bg-sky-500",
  skipped: "bg-rose-500",
  left: "bg-slate-400",
};

export default function QueueStatusBadge({ status }) {
  const key = status || "waiting";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full ${
        STATUS_STYLES[key] || STATUS_STYLES.waiting
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${DOT_STYLES[key] || DOT_STYLES.waiting}`}
      />
      {key}
    </span>
  );
}
