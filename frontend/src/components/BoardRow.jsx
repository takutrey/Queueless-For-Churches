import { Link } from "react-router-dom";

export default function BoardRow({ queue, index, showChurch = true }) {
  const waiting = queue.stats?.waiting ?? queue.stats?.waitingCount ?? 0;

  return (
    <Link to={`/q/${queue.slug || queue.id}`} className="board-row">
      <span className="board-row__num tabular">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="board-row__name">
        <span className="board-row__queue">{queue.name}</span>
        {showChurch && queue.church?.name && (
          <span className="board-row__biz">{queue.church.name}</span>
        )}
      </span>
      <span />
      <span className="board-row__wait">
        <strong className="tabular">{waiting}</strong> waiting
      </span>
    </Link>
  );
}
