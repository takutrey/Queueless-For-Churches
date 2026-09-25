export function LoadingState({ label = "Loading…" }) {
  return (
    <div className="state-block" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p className="state-block__desc">{label}</p>
    </div>
  );
}

export function BoardSkeleton({ rows = 4 }) {
  return (
    <div className="board-list" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton-row" key={i} />
      ))}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="state-block">
      <p className="state-block__title">{title}</p>
      {description && <p className="state-block__desc">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, action }) {
  return (
    <div className="state-block">
      <p className="state-block__title">{title}</p>
      {description && <p className="state-block__desc">{description}</p>}
      {action}
    </div>
  );
}
