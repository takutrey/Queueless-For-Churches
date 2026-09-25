import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchPublicQueue,
  joinQueue,
  selectPublicQueue,
} from "../lib/QueueSlice";
import { LoadingState } from "../components/StateBlocks";
import { rememberTicket } from "../utils/ticketStorage";

export default function JoinQueue() {
  const { queueId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data, status: queueStatus } = useSelector(selectPublicQueue);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nameError, setNameError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchPublicQueue(queueId));
  }, [dispatch, queueId]);

  const queue = data?.queue;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");

    if (!name.trim()) {
      setNameError("Enter your name so staff know who to call.");
      return;
    }
    setNameError("");
    setSubmitting(true);

    const result = await dispatch(
      joinQueue({
        queueId,
        customerName: name.trim(),
        customerPhone: phone.trim(),
      }),
    );

    setSubmitting(false);

    if (joinQueue.fulfilled.match(result)) {
      rememberTicket(result.payload.customerToken);
      navigate(`/t/${result.payload.customerToken}`, {
        state: { justJoined: true },
      });
    } else {
      setSubmitError(
        result.payload || "Couldn't join the queue. Please try again.",
      );
    }
  }

  return (
    <section className="detail-page">
      <div className="wrap">
        <Link to={`/q/${queueId}`} className="crumb">
          ← Back
        </Link>

        <div
          className="landing-info"
          style={{ marginTop: 16, marginBottom: 8 }}
        >
          <div className="landing-info__biz">
            {queueStatus === "loading" ? "Loading…" : queue?.church?.name}
          </div>
          <h1 style={{ fontSize: "clamp(24px, 3.4vw, 34px)" }}>
            Get a ticket{queue ? ` for ${queue.name}` : ""}
          </h1>
          <p className="landing-info__desc">
            You'll get a ticket number right away and can watch your place in
            line update live, right from this browser.
          </p>
          {queue?.joinCode && (
            <p
              className="join-code"
              aria-label={`Queue join code ${queue.joinCode}`}
            >
              Join code: <strong>{queue.joinCode}</strong>
            </p>
          )}
        </div>

        <div
          className="surface-card join-card"
          style={{ maxWidth: 460, marginTop: 24 }}
        >
          {queueStatus === "loading" && !queue ? (
            <LoadingState label="Loading queue details…" />
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {submitError && (
                <div className="form-error-banner">{submitError}</div>
              )}

              <div className={`field ${nameError ? "field--error" : ""}`}>
                <label htmlFor="customerName">Your name</label>
                <input
                  id="customerName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tendai Moyo"
                  autoComplete="name"
                  autoFocus
                />
                {nameError && <div className="field__error">{nameError}</div>}
              </div>

              <div className="field">
                <label htmlFor="customerPhone">Phone number (optional)</label>
                <input
                  id="customerPhone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 077 123 4567"
                  autoComplete="tel"
                />
                <div className="field__hint">
                  We'll only use this if staff need to reach you about your
                  ticket.
                </div>
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--full"
                disabled={submitting}
              >
                {submitting ? "Getting your ticket…" : "Get my ticket"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
