import { ArrowRight } from "lucide-react";

const VARIANTS = {
  primary:
    "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none",
  outline:
    "bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 disabled:text-slate-300 disabled:border-slate-100",
  ghost:
    "bg-transparent text-rose-600 hover:bg-rose-50 disabled:text-slate-300",
};

/**
 * `primary`/`disabled` keep the original boolean API working as before.
 * `variant` lets a caller opt into "outline" or "ghost" explicitly when the
 * default primary→outline/ghost inference isn't what's wanted.
 */
export default function QueueActionButton({
  label,
  onClick,
  primary = true,
  disabled = false,
  type = "button",
  variant,
  icon = true,
}) {
  const resolved =
    variant || (primary ? "primary" : disabled ? "outline" : "ghost");
  const showIcon = icon && resolved === "primary";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`group w-full mt-5 py-3.5 px-6 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANTS[resolved]}`}
    >
      <span>{label}</span>
      {showIcon && (
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      )}
    </button>
  );
}
