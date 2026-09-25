import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchPublicQueues, selectPublicQueues } from "../lib/QueueSlice";
import QueueCard from "../components/QueueCard";
import { EmptyState, ErrorState } from "../components/StateBlocks";
import api from "../utils/axiosInstance";

function SearchIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });

export default function QueueBrowse() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data: queues, status, error } = useSelector(selectPublicQueues);
  const [query, setQuery] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [campaigns, setCampaigns] = useState([]);
  const [campaignStatus, setCampaignStatus] = useState("loading");

  useEffect(() => {
    dispatch(fetchPublicQueues());
  }, [dispatch]);

  useEffect(() => {
    let active = true;
    api
      .get("/campaigns/public")
      .then(({ data }) => {
        if (!active) return;
        setCampaigns(data.campaigns || []);
        setCampaignStatus("succeeded");
      })
      .catch(() => {
        if (active) setCampaignStatus("failed");
      });
    return () => {
      active = false;
    };
  }, []);

  const totalWaiting = useMemo(
    () =>
      queues.reduce(
        (sum, q) => sum + (q.stats?.waiting ?? q.stats?.waitingCount ?? 0),
        0,
      ),
    [queues],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return queues;
    const q = query.trim().toLowerCase();
    return queues.filter((queue) =>
      [queue.name, queue.church?.name, queue.joinCode]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [queues, query]);

  return (
    <>
      <section className="board">
        <div className="wrap">
          <div className="board__eyebrow">Live board</div>
          <h1 className="board__title">
            Join the line before you leave the house.
          </h1>
          <p className="board__lede">
            This church installation is set up for one church only. Open queues
            and campaigns are shown directly for this location.
          </p>

          <div className="stat-row">
            <div className="stat">
              <div className="stat__value tabular">{queues.length}</div>
              <div className="stat__label">Open queues</div>
            </div>
            <div className="stat">
              <div className="stat__value tabular">{campaigns.length}</div>
              <div className="stat__label">Open campaigns</div>
            </div>
            <div className="stat">
              <div className="stat__value tabular">{totalWaiting}</div>
              <div className="stat__label">People waiting</div>
            </div>
          </div>

          <div className="search-field">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search queues"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search queues"
            />
          </div>

          <form
            className="search-field"
            onSubmit={async (event) => {
              event.preventDefault();
              const code = joinCode.trim();
              if (!code) return;

              const normalized = code.toUpperCase();
              const matchingQueue = queues.find(
                (queue) => queue.joinCode?.toUpperCase() === normalized,
              );

              if (matchingQueue) {
                navigate(`/q/${matchingQueue.id}`);
                return;
              }

              try {
                const { data } = await api.get(
                  `/campaigns/public/${encodeURIComponent(code)}`,
                );
                if (data?.campaign?.slug) {
                  navigate(`/campaign/${data.campaign.slug}`);
                  return;
                }
              } catch {
                // fall through and open the legacy queue route below
              }

              navigate(`/q/${normalized}`);
            }}
          >
            <input
              type="text"
              placeholder="Enter a queue or campaign code"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              aria-label="Queue or campaign code"
              maxLength={12}
            />
            <button type="submit" className="btn btn--primary">
              Open
            </button>
          </form>
        </div>
      </section>

      <div className="wrap">
        <div className="section-head">
          <h2 className="section-heading">Open right now</h2>
          <span className="section-count">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        {status === "loading" && (
          <div className="church-grid" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="skeleton-row" key={i} style={{ height: 110 }} />
            ))}
          </div>
        )}

        {status === "failed" && (
          <ErrorState
            title="Couldn't load queues"
            description={error || "Please check your connection and try again."}
          />
        )}

        {status === "succeeded" && filtered.length === 0 && (
          <EmptyState
            title="No queues found"
            description="Try a different search, or check back — new queues open throughout the day."
          />
        )}

        {status === "succeeded" && filtered.length > 0 && (
          <div className="ticket-grid">
            {filtered.map((queue) => (
              <QueueCard key={queue.id} queue={queue} showChurch={false} />
            ))}
          </div>
        )}

        <div className="section-head campaign-list-head">
          <h2 className="section-heading">Pledge campaigns</h2>
          <span className="section-count">
            {campaignStatus === "loading"
              ? "Loading"
              : `${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {campaignStatus === "succeeded" && campaigns.length > 0 && (
          <div className="campaign-grid">
            {campaigns.map((campaign) => {
              const progress = Math.min(
                100,
                Number(campaign.progressPercentage || 0),
              );
              const accepting = campaign.status === "ACTIVE";
              return (
                <article className="public-campaign-card" key={campaign.id}>
                  <div className="public-campaign-card__topline">
                    <span className="campaign-card__status">
                      {accepting ? "Open for pledges" : campaign.status}
                    </span>
                    {campaign.churchName && <span>{campaign.churchName}</span>}
                  </div>
                  <h3>{campaign.title}</h3>
                  <p>
                    {campaign.description ||
                      "Support this church campaign with a pledge."}
                  </p>
                  <div className="campaign-card__amounts">
                    <strong>{money(campaign.totalPledged)}</strong>
                    <span>of {money(campaign.targetAmount)} pledged</span>
                  </div>
                  <div
                    className="campaign-card__progress"
                    aria-label={`${progress}% pledged`}
                  >
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <button
                    type="button"
                    className="btn btn--primary btn--full"
                    onClick={() => navigate(`/campaign/${campaign.slug}`)}
                  >
                    {accepting ? "Make a pledge" : "View campaign"}
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--full"
                    onClick={() => navigate(`/campaign/${campaign.slug}/live`)}
                  >
                    View live progress
                  </button>
                </article>
              );
            })}
          </div>
        )}

        {campaignStatus === "succeeded" && campaigns.length === 0 && (
          <p className="campaign-list-empty">
            No public pledge campaigns are available right now.
          </p>
        )}
      </div>
    </>
  );
}
