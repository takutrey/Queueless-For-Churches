import { Link } from "react-router-dom";
import { QueueStatusPill } from "./StatusPill";

export default function QueueCard({ queue, showChurch = false }) {
  const waiting = queue.stats?.waiting ?? queue.stats?.waitingCount ?? 0;
  const est = waiting * (queue.estimatedServiceTime || 0);

  return (
    <Link to={`/q/${queue.slug || queue.id}`} className="ticket-card">
      <div className="ticket-card__top">
        <span
          className="ticket-card__notch ticket-card__notch--left"
          aria-hidden="true"
        />
        <span
          className="ticket-card__notch ticket-card__notch--right"
          aria-hidden="true"
        />
        {showChurch && queue.church?.name && (
          <div className="ticket-card__biz">{queue.church.name}</div>
        )}
        <div className="ticket-card__name">{queue.name}</div>
      </div>
      <div className="ticket-card__bottom">
        <QueueStatusPill status={queue.status} />
        <div className="ticket-card__wait">
          <strong className="tabular">{waiting}</strong> waiting
          {est > 0 && <> · ~{est}m</>}
        </div>
      </div>
    </Link>
  );
}
