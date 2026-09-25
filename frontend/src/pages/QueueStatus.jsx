import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchQueueEntry,
  leaveQueue,
  rejoinQueue,
  selectConnection,
  selectQueueEntry,
} from "../lib/QueueSlice";
import useQueueSocket from "../hooks/useQueueSocket";
import CountdownRing from "../components/CountdownRing";
import { EntryStatusPill } from "../components/StatusPill";
import { ErrorState, LoadingState } from "../components/StateBlocks";

const ACTIVE_STATUSES = ["waiting", "standby", "called", "serving"];

export default function QueueStatus() {
  const { customerToken } = useParams();
  const location = useLocation();
  const dispatch = useDispatch();

  const { data: entry, status, error } = useSelector(selectQueueEntry);
  const { socketConnected } = useSelector(selectConnection);

  const [pulsing, setPulsing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [rejoining, setRejoining] = useState(false);
  const prevStatusRef = useRef(null);
  const justJoined = location.state?.justJoined;

  useEffect(() => {
    dispatch(fetchQueueEntry(customerToken));
  }, [dispatch, customerToken]);

  useQueueSocket({
    churchId: entry?.churchId,
    queueId: entry?.queueId,
    customerToken,
    entryStatus: entry?.status,
  });

  // Flash the ticket briefly whenever a live socket event changes its status
  useEffect(() => {
    if (!entry) return;
    if (prevStatusRef.current && prevStatusRef.current !== entry.status) {
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), 900);
      return () => clearTimeout(t);
    }
    prevStatusRef.current = entry.status;
  }, [entry?.status]);

  async function handleLeave() {
    setLeaving(true);
    await dispatch(leaveQueue(customerToken));
    setLeaving(false);
  }

  async function handleRejoin() {
    setRejoining(true);
    await dispatch(rejoinQueue(customerToken));
    setRejoining(false);
  }

  if (status === "loading" || status === "idle") {
    return <LoadingState label="Finding your ticket…" />;
  }

  if (status === "failed" || !entry) {
    return (
      <ErrorState
        title="Ticket not found"
        description={
          error || "This link may have expired. Check the one you were sent."
        }
        action={
          <Link to="/" className="btn btn--ghost">
            Browse open queues
          </Link>
        }
      />
    );
  }

  const isActive = ACTIVE_STATUSES.includes(entry.status);
  const canLeave = entry.status === "waiting";
  const peopleAhead = entry.peopleAhead ?? 0;
  const estimatedServiceMinutes =
    peopleAhead > 0 && entry.estimatedWaitTime
      ? entry.estimatedWaitTime / peopleAhead
      : 5;

  return (
    <section className="detail-page">
      <div className="wrap">
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 16 }}
        >
          <Link to="/" className="crumb">
            ← Back to queues
          </Link>
          <Link to="/my-tickets" className="crumb">
            My tickets →
          </Link>
        </div>
      </div>

      <div
        className={`stub ${justJoined ? "stamp" : ""} ${pulsing ? "stub--pulse" : ""}`}
      >
        <div className="stub__head">
          <div className="stub__biz">{entry.churchName}</div>
          <div className="stub__queue">{entry.queueName}</div>
          <div className="stub__number-label">Your ticket</div>
          <div className="stub__number tabular">{entry.ticketNumber}</div>
        </div>

        <div className="stub__body">
          <div className="stub__status">
            <EntryStatusPill status={entry.status} />
          </div>

          {isActive && (
            <>
              <CountdownRing
                peopleAhead={peopleAhead}
                estimatedServiceMinutes={estimatedServiceMinutes}
              />
              <div className="stub__meta">
                <div className="stat">
                  <div className="stat__value tabular">{peopleAhead}</div>
                  <div className="stat__label">Ahead of you</div>
                </div>
                <div className="stat">
                  <div className="stat__value tabular">
                    {entry.transferCount ?? 0}
                  </div>
                  <div className="stat__label">
                    Transfers ahead by staff choice
                  </div>
                </div>
              </div>
              {entry.status === "standby" && (
                <p className="field__hint">
                  You are on standby. Staff will call you when they are ready.
                </p>
              )}
              {entry.entryType === "transfer" && (
                <p className="field__hint">
                  You were transferred here. Staff call transfer customers at
                  their discretion.
                </p>
              )}
            </>
          )}

          {entry.status === "completed" && (
            <p className="state-block__desc">
              You've been served — thanks for using {entry.queueName}.
            </p>
          )}

          {entry.status === "skipped" && (
            <>
              <p className="state-block__desc">
                You were skipped by staff. You can rejoin this queue while it is
                open.
              </p>
              <div className="stub__actions">
                <button
                  type="button"
                  className="btn btn--primary btn--full"
                  onClick={handleRejoin}
                  disabled={rejoining}
                >
                  {rejoining ? "Rejoining…" : "Rejoin queue"}
                </button>
              </div>
            </>
          )}

          {entry.status === "left" && (
            <p className="state-block__desc">You left this queue.</p>
          )}

          {isActive && !socketConnected && (
            <p className="field__hint">Reconnecting live updates…</p>
          )}

          {canLeave && (
            <div className="stub__actions">
              <button
                type="button"
                className="btn btn--danger btn--full"
                onClick={handleLeave}
                disabled={leaving}
              >
                {leaving ? "Leaving…" : "Leave queue"}
              </button>
            </div>
          )}

          {!isActive && (
            <div className="stub__actions">
              <Link to="/" className="btn btn--ghost btn--full">
                Browse open queues
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
