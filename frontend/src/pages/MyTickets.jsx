import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { fetchQueueEntry } from "../lib/QueueSlice";
import { EntryStatusPill } from "../components/StatusPill";
import { ErrorState, LoadingState } from "../components/StateBlocks";
import { getSavedTicketTokens } from "../utils/ticketStorage";

export default function MyTickets() {
  const dispatch = useDispatch();
  const [tickets, setTickets] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    const tokens = getSavedTicketTokens();

    if (!tokens.length) {
      setTickets([]);
      setStatus("succeeded");
      return () => {
        cancelled = true;
      };
    }

    Promise.all(
      tokens.map((customerToken) =>
        dispatch(fetchQueueEntry(customerToken))
          .unwrap()
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return;
      setTickets(results.filter(Boolean));
      setStatus("succeeded");
    });

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  if (status === "loading") {
    return <LoadingState label="Finding your tickets..." />;
  }

  return (
    <section className="detail-page">
      <div className="wrap">
        <Link to="/" className="crumb">
          &larr; Browse queues
        </Link>
        <div className="landing-info" style={{ marginTop: 16 }}>
          <div className="landing-info__biz">Your tickets</div>
          <h1>My tickets</h1>
          <p className="landing-info__desc">
            Tickets created in this browser stay here so you can come back to
            them without keeping the ticket page open.
          </p>
        </div>

        {!tickets.length ? (
          <ErrorState
            title="No saved tickets"
            description="Tickets you generate on this device will appear here."
            action={
              <Link to="/" className="btn btn--primary">
                Browse open queues
              </Link>
            }
          />
        ) : (
          <div className="ticket-list">
            {tickets.map((ticket) => (
              <Link
                key={ticket.customerToken}
                to={`/t/${ticket.customerToken}`}
                className="surface-card ticket-list__item"
              >
                <div>
                  <div className="ticket-list__number tabular">
                    {ticket.ticketNumber}
                  </div>
                  <div className="ticket-list__queue">
                    {ticket.churchName ? `${ticket.churchName} · ` : ""}
                    {ticket.queueName}
                  </div>
                </div>
                <div className="ticket-list__side">
                  <EntryStatusPill status={ticket.status} />
                  <span className="ticket-list__arrow" aria-hidden="true">
                    &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
