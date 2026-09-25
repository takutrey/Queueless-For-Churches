const QUEUE_STATUS = {
  open: { label: "Open now", tone: "open" },
  paused: { label: "Paused", tone: "paused" },
  closed: { label: "Closed", tone: "closed" },
};

const ENTRY_STATUS = {
  waiting: { label: "Waiting", tone: "open" },
  standby: { label: "On standby", tone: "paused" },
  called: { label: "You're being called", tone: "paused" },
  serving: { label: "Now serving you", tone: "open" },
  completed: { label: "Completed", tone: "muted" },
  skipped: { label: "Skipped", tone: "closed" },
  left: { label: "Left queue", tone: "muted" },
};

export function QueueStatusPill({ status, className = "" }) {
  const meta = QUEUE_STATUS[status] || { label: status, tone: "muted" };
  return (
    <span className={`pill pill--${meta.tone} ${className}`}>
      <span className="pill__dot" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function EntryStatusPill({ status, className = "" }) {
  const meta = ENTRY_STATUS[status] || { label: status, tone: "muted" };
  return (
    <span className={`pill pill--${meta.tone} ${className}`}>
      <span className="pill__dot" aria-hidden="true" />
      {meta.label}
    </span>
  );
}
