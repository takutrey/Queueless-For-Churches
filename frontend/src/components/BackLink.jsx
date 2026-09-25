import { useNavigate } from "react-router-dom";

/**
 * Consistent back-navigation affordance used across every page.
 * Defaults to browser-style "go back", or pass `to` for a fixed route
 * (useful when a page can be reached from more than one place).
 */
export default function BackLink({ to, label = "Back" }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => (to ? navigate(to) : navigate(-1))}
      className="inline-flex items-center gap-1 -ml-1.5 mb-4 px-1.5 py-1 rounded-lg text-ink-soft text-sm font-medium hover:text-ink hover:bg-[#EEEFF2] active:scale-[0.97] transition"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        className="flex-shrink-0"
        aria-hidden="true"
      >
        <path
          d="M10 3.5L5 8l5 4.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </button>
  );
}
