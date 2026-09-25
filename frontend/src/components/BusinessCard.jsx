import { Link } from "react-router-dom";

export default function ChurchCard({ church }) {
  return (
    <Link to={`/church/${church.id}`} className="church-card">
      <div className="church-card__name">{church.name}</div>
      <div className="church-card__row">
        <div className="church-card__count">
          <strong className="tabular">{church.queueCount}</strong>{" "}
          {church.queueCount === 1 ? "queue" : "queues"} open
        </div>
        <div className="church-card__waiting">
          <span className="tabular">{church.totalWaiting}</span> waiting
        </div>
      </div>
    </Link>
  );
}
