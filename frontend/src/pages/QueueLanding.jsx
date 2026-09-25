import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchPublicQueue, selectPublicQueue } from "../lib/QueueSlice";
import { QueueStatusPill } from "../components/StatusPill";
import { LoadingState, ErrorState } from "../components/StateBlocks";

export default function QueueLanding() {
  const { queueId: slugOrId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data, status, error } = useSelector(selectPublicQueue);

  useEffect(() => {
    dispatch(fetchPublicQueue(slugOrId));
  }, [dispatch, slugOrId]);

  if (status === "loading" || status === "idle") {
    return <LoadingState label="Loading queue…" />;
  }

  if (status === "failed" || !data?.queue) {
    return (
      <ErrorState
        title="Queue not found"
        description={error || "This queue may have been closed or removed."}
        action={
          <Link to="/" className="btn btn--ghost">
            Browse open queues
          </Link>
        }
      />
    );
  }

  const { queue, stats } = data;
  const waiting = stats?.waiting ?? stats?.waitingCount ?? 0;
  const canJoin = queue.status === "open" && queue.allowWalkIns;

  return (
    <section className="detail-page">
      <div className="wrap">
        <Link to="/" className="crumb">
          ← Back to queues
        </Link>

        <div className="split">
          <div className="landing-info">
            <QueueStatusPill status={queue.status} />
            <h1>{queue.name}</h1>
            <div className="landing-info__biz">{queue.church?.name}</div>
            {queue.description && (
              <p className="landing-info__desc">{queue.description}</p>
            )}
            <p
              className="join-code"
              aria-label={`Queue join code ${queue.joinCode}`}
            >
              Join code: <strong>{queue.joinCode}</strong>
            </p>

            <div className="stat-row">
              <div className="stat">
                <div className="stat__value tabular">{waiting}</div>
                <div className="stat__label">People waiting</div>
              </div>
              <div className="stat">
                <div className="stat__value tabular">
                  ~{queue.estimatedServiceTime}m
                </div>
                <div className="stat__label">Per person</div>
              </div>
              <div className="stat">
                <div className="stat__value tabular">
                  {queue.currentNumber > 0 ? `#${queue.currentNumber}` : "—"}
                </div>
                <div className="stat__label">Now serving</div>
              </div>
            </div>
          </div>

          <div className="surface-card join-card">
            <div className="join-card__title">
              {canJoin ? "Ready to join?" : "Not joinable right now"}
            </div>
            <p className="join-card__sub">
              {canJoin
                ? "You'll get a ticket number and can track your place from your phone."
                : queue.status === "paused"
                  ? "This queue is temporarily paused. Try again shortly."
                  : queue.status === "closed"
                    ? "This queue is closed for now."
                    : "This queue isn't accepting walk-ins at the moment."}
            </p>
            <button
              type="button"
              className="btn btn--primary btn--full"
              disabled={!canJoin}
              onClick={() => navigate(`/join/${queue.id}`)}
            >
              Get a ticket
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
