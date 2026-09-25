/**
 * Shared loading / error / empty presentational states, used everywhere
 * a page waits on Redux data. Keeping these in one place means every
 * screen in the app feels the same while it loads, fails, or is empty —
 * important for a small PWA where screens are visited over and over.
 */

export function LoadingState({ label = "Loading..." }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 py-16">
      <span
        className="w-7 h-7 rounded-full border-2 border-line border-t-signal animate-spin"
        aria-hidden="true"
      />
      <p className="text-ink-soft text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}) {
  return (
    <div className="card text-center py-12">
      <div className="w-10 h-10 rounded-full bg-[#FBEAE7] text-coral flex items-center justify-center mx-auto mb-3 text-lg font-bold">
        !
      </div>
      <p className="text-coral font-bold">{title}</p>
      {message && <p className="text-ink-soft text-sm mt-1">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 text-sm font-bold text-signal hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = "○", title, message }) {
  return (
    <div className="info-panel text-center py-10 px-4">
      <div className="text-2xl mb-2 text-ink-soft" aria-hidden="true">
        {icon}
      </div>
      {title && <p className="font-bold text-sm mb-1">{title}</p>}
      {message && <p className="text-ink-soft text-sm">{message}</p>}
    </div>
  );
}
