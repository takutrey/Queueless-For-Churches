import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchPublicQueues, selectPublicQueues } from "../lib/QueueSlice";
import QueueCard from "../components/QueueCard";
import { EmptyState, ErrorState } from "../components/StateBlocks";

/**
 * There's no dedicated "queues for one church" public endpoint — only
 * GET /api/queues/public (all open queues, each with its church attached).
 * So this page reuses that same list and filters to the requested church
 * on the client. If a per-church endpoint is added later, swap the filter
 * below for a direct fetch keyed on churchId.
 */
export default function ChurchQueues() {
  const { churchId } = useParams();
  const dispatch = useDispatch();
  const { data: queues, status, error } = useSelector(selectPublicQueues);

  useEffect(() => {
    dispatch(fetchPublicQueues());
  }, [dispatch]);

  const churchQueues = useMemo(
    () =>
      queues.filter(
        (q) => q.churchId === churchId || q.church?.id === churchId,
      ),
    [queues, churchId],
  );

  const churchName = churchQueues[0]?.church?.name || "This church";
  const totalWaiting = churchQueues.reduce(
    (sum, q) => sum + (q.stats?.waiting ?? q.stats?.waitingCount ?? 0),
    0,
  );

  return (
    <>
      <section className="biz-hero">
        <div className="wrap">
          <Link
            to="/"
            className="crumb"
            style={{ color: "var(--text-on-ink-muted)" }}
          >
            ← All churches
          </Link>

          {status === "succeeded" && churchQueues.length > 0 && (
            <>
              <div className="biz-hero__eyebrow">Church</div>
              <h1 className="biz-hero__title">{churchName}</h1>
              <div className="stat-row">
                <div className="stat">
                  <div
                    className="stat__value tabular"
                    style={{ color: "var(--text-on-ink)" }}
                  >
                    {churchQueues.length}
                  </div>
                  <div
                    className="stat__label"
                    style={{ color: "var(--text-on-ink-muted)" }}
                  >
                    Open queues
                  </div>
                </div>
                <div className="stat">
                  <div
                    className="stat__value tabular"
                    style={{ color: "var(--text-on-ink)" }}
                  >
                    {totalWaiting}
                  </div>
                  <div
                    className="stat__label"
                    style={{ color: "var(--text-on-ink-muted)" }}
                  >
                    People waiting
                  </div>
                </div>
              </div>
            </>
          )}

          {status === "loading" && (
            <div className="biz-hero__eyebrow" style={{ marginTop: 8 }}>
              Loading…
            </div>
          )}
        </div>
      </section>

      <div className="wrap">
        {status === "loading" && (
          <div className="ticket-grid" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div className="skeleton-row" key={i} style={{ height: 120 }} />
            ))}
          </div>
        )}

        {status === "succeeded" && churchQueues.length > 0 && (
          <div className="ticket-grid">
            {churchQueues.map((queue) => (
              <QueueCard key={queue.id} queue={queue} showChurch={false} />
            ))}
          </div>
        )}

        {status === "succeeded" && churchQueues.length === 0 && (
          <EmptyState
            title="No open queues here right now"
            description="This church doesn't have any queues open at the moment. Check back later."
            action={
              <Link to="/" className="btn btn--ghost">
                Browse other churches
              </Link>
            }
          />
        )}

        {status === "failed" && (
          <ErrorState
            title="Couldn't load this church"
            description={error || "Please check your connection and try again."}
          />
        )}
      </div>
    </>
  );
}
