import { Check } from "lucide-react";

const STEPS = [
  { key: "waiting", label: "Waiting" },
  { key: "called", label: "Called" },
  { key: "serving", label: "Serving" },
  { key: "completed", label: "Completed" },
];

export default function QueueProgressStepper({ status }) {
  const activeIndex = Math.max(
    STEPS.findIndex((s) => s.key === status),
    0,
  );

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-4">
        Queue progress
      </p>
      <div className="relative flex items-start justify-between">
        <div className="absolute left-0 right-0 top-3 h-0.5 bg-slate-100" />
        <div
          className="absolute left-0 top-3 h-0.5 bg-indigo-500 transition-all duration-500"
          style={{ width: `${(activeIndex / (STEPS.length - 1)) * 100}%` }}
        />
        {STEPS.map((step, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          return (
            <div
              key={step.key}
              className="relative z-10 flex flex-col items-center gap-2 flex-1"
            >
              <span
                className={[
                  "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors",
                  isDone
                    ? "bg-indigo-500 border-indigo-500"
                    : isActive
                      ? "bg-white border-indigo-500"
                      : "bg-white border-slate-200",
                ].join(" ")}
              >
                {isDone && <Check className="w-3.5 h-3.5 text-white" />}
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                )}
              </span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  isActive ? "text-indigo-600" : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
