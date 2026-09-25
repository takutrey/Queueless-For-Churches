import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../utils/axiosInstance";
import { getSocket, joinCampaignRoom } from "../contexts/Socket";

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });

const cleanNumber = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

export default function PublicCampaign({ live = false }) {
  const { slug } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [amount, setAmount] = useState("");
  const [materialQuantities, setMaterialQuantities] = useState({});
  const [form, setForm] = useState({
    name: "",
    phone: "",
  });
  const [state, setState] = useState({
    loading: true,
    submitting: false,
    message: "",
    error: "",
  });
  const idempotencyKey = useRef(null);
  const refreshTimer = useRef(null);

  useEffect(() => {
    let active = true;
    let join;
    const socket = getSocket();
    const onUpdate = (payload) => {
      const nextCampaign =
        payload?.campaign ?? payload?.campaignData ?? payload;
      setCampaign((current) => {
        if (!current) return current;
        if (nextCampaign && typeof nextCampaign === "object") {
          return { ...current, ...nextCampaign };
        }
        return current;
      });
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(async () => {
        try {
          const { data } = await api.get(
            `/campaigns/public/${encodeURIComponent(slug)}`,
          );
          if (active) setCampaign(data.campaign);
        } catch {
          // Keep existing data if the refresh fails briefly.
        }
      }, 100);
    };

    api
      .get(`/campaigns/public/${encodeURIComponent(slug)}`)
      .then(({ data }) => {
        if (!active) return;
        const nextCampaign = data.campaign;
        setCampaign(nextCampaign);
        setMaterialQuantities(
          Object.fromEntries(
            (nextCampaign.items || [])
              .filter((item) => item.status !== "COMPLETED")
              .map((item) => [item.campaignItemId || item.id, ""]),
          ),
        );
        setState((current) => ({ ...current, loading: false, error: "" }));
        socket.connect();
        join = () =>
          joinCampaignRoom({
            churchId: nextCampaign.churchId,
            campaignId: nextCampaign.id,
          });
        if (socket.connected) join();
        else socket.once("connect", join);
      })
      .catch((error) =>
        setState({
          loading: false,
          submitting: false,
          message: "This campaign could not be found.",
          error:
            error.response?.data?.message ||
            "Check the campaign link or code and try again.",
        }),
      );

    socket.on("pledge-updated", onUpdate);
    socket.on("campaign:updated", onUpdate);
    socket.on("campaign:itemUpdated", onUpdate);
    socket.on("campaign:statusChanged", onUpdate);
    return () => {
      active = false;
      socket.off("pledge-updated", onUpdate);
      socket.off("campaign:updated", onUpdate);
      socket.off("campaign:itemUpdated", onUpdate);
      socket.off("campaign:statusChanged", onUpdate);
      if (join) socket.off("connect", join);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [slug]);

  const updateMaterialQuantity = (itemId, value) => {
    const nextValue = value === "" ? "" : String(value);
    setMaterialQuantities((current) => ({
      ...current,
      [itemId]: nextValue,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (state.submitting) return;

    const trimmedName = form.name.trim();
    const trimmedPhone = form.phone.trim();
    const numericAmount = cleanNumber(amount);
    const selectedItems = (campaign?.items || [])
      .filter((item) => item.status !== "COMPLETED")
      .map((item) => {
        const itemId = item.campaignItemId || item.id;
        const quantity = cleanNumber(materialQuantities[itemId] ?? "");
        return quantity && quantity > 0
          ? { campaignItemId: itemId, quantity }
          : null;
      })
      .filter(Boolean);

    if (!trimmedName || trimmedName.length < 2) {
      setState((current) => ({
        ...current,
        message: "Enter your name so the church can identify your pledge.",
        error: "",
      }));
      return;
    }
    if (!trimmedPhone) {
      setState((current) => ({
        ...current,
        message: "Enter a phone number so the church can follow up.",
        error: "",
      }));
      return;
    }
    if (
      (amount !== "" &&
        (!Number.isFinite(numericAmount) || numericAmount <= 0)) ||
      (amount === "" && selectedItems.length === 0)
    ) {
      setState((current) => ({
        ...current,
        message:
          amount === ""
            ? "Choose a pledge amount or add at least one material item."
            : "Enter a pledge amount greater than zero.",
        error: "",
      }));
      return;
    }
    if (amount === "" && selectedItems.length === 0) {
      setState((current) => ({
        ...current,
        message: "Choose a pledge amount or add at least one material item.",
        error: "",
      }));
      return;
    }

    if (!idempotencyKey.current) {
      idempotencyKey.current =
        window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    }

    setState((current) => ({
      ...current,
      submitting: true,
      message: "",
      error: "",
    }));

    try {
      const payload = {
        name: trimmedName,
        phone: trimmedPhone,
        ...(amount !== "" ? { monetaryAmount: amount } : {}),
        ...(selectedItems.length ? { items: selectedItems } : {}),
      };

      const { data } = await api.post(
        `/campaigns/public/${encodeURIComponent(slug)}/pledges`,
        payload,
        { headers: { "Idempotency-Key": idempotencyKey.current } },
      );

      setCampaign((current) =>
        current ? { ...current, ...data.totals } : current,
      );
      setAmount("");
      setMaterialQuantities(
        Object.fromEntries(
          (campaign?.items || [])
            .filter((item) => item.status !== "COMPLETED")
            .map((item) => [item.campaignItemId || item.id, ""]),
        ),
      );
      setForm({ name: "", phone: "" });
      idempotencyKey.current = null;
      setState({
        loading: false,
        submitting: false,
        message: "Thank you. Your pledge has been recorded successfully.",
        error: "",
      });
    } catch (error) {
      setState({
        loading: false,
        submitting: false,
        message: "We could not record your pledge.",
        error:
          error.response?.data?.message ||
          "Please check your details and try again.",
      });
    }
  };

  if (state.loading && !campaign)
    return (
      <main className="campaign-page">
        <section className="campaign-state" aria-live="polite">
          <p className="campaign-kicker">Pledge campaign</p>
          <h1>Loading campaign...</h1>
          <p>Please wait while we load the campaign details.</p>
        </section>
      </main>
    );

  if (!campaign)
    return (
      <main className="campaign-page">
        <section className="campaign-state" role="alert">
          <p className="campaign-kicker">Pledge campaign</p>
          <h1>{state.message}</h1>
          <p>{state.error}</p>
        </section>
      </main>
    );

  const progress = Math.min(100, Number(campaign.progressPercentage || 0));
  const accepting = campaign.status === "ACTIVE";
  const hasTarget = Boolean(
    campaign.targetAmount && Number(campaign.targetAmount) > 0,
  );
  const activeItems = (campaign.items || []).filter(
    (item) => item.status !== "COMPLETED",
  );
  const hasMaterials = campaign.items && campaign.items.length > 0;
  const materialStillNeeded = activeItems.reduce((sum, item) => {
    return (
      sum +
      Math.max(0, Number(item.remainingQuantity ?? item.remainingToPledge ?? 0))
    );
  }, 0);

  return (
    <main className="campaign-page">
      <section className="campaign-hero">
        <div className="campaign-hero__header">
          <div className="campaign-hero__copy">
            <p className="campaign-kicker">QueueLess Church</p>
            <h1>{campaign.title}</h1>
            <p>{campaign.description}</p>
          </div>

          <div className="campaign-hero__meta">
            {campaign.joinCode && (
              <p
                className="join-code"
                aria-label={`Campaign join code ${campaign.joinCode}`}
              >
                Campaign code: <strong>{campaign.joinCode}</strong>
              </p>
            )}
            <p
              className="campaign-status"
              aria-label={`Campaign status: ${campaign.status}`}
            >
              {campaign.status === "ACTIVE"
                ? "Open for pledges"
                : `Campaign ${campaign.status.toLowerCase()}`}
            </p>
            <div className="campaign-actions">
              <Link
                to={
                  live
                    ? `/campaign/${campaign.slug}`
                    : `/campaign/${campaign.slug}/live`
                }
                className="btn btn--secondary"
              >
                {live ? "View public campaign" : "View live progress"}
              </Link>
            </div>
          </div>
        </div>

        <div className="campaign-progress">
          <div className="campaign-progress__bar">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="campaign-progress__numbers">
            <strong>{money(campaign.totalPledged)}</strong>
            <span>
              {hasTarget
                ? `of ${money(campaign.targetAmount)}`
                : "No money target"}
            </span>
            <b>{progress}%</b>
          </div>
        </div>

        <div className="campaign-summary-grid">
          <article className="campaign-summary-card">
            <div className="campaign-kicker">Pledged</div>
            <strong>{money(campaign.totalPledged)}</strong>
            <small>{campaign.pledgeCount || 0} pledges</small>
          </article>

          <article className="campaign-summary-card">
            <div className="campaign-kicker">Left</div>
            <strong>{money(campaign.remainingAmount || 0)}</strong>
            <small>
              {hasTarget ? "Remaining to target" : "Material-only goal"}
            </small>
          </article>

          <article className="campaign-summary-card">
            <div className="campaign-kicker">Material still needed</div>
            <strong>{materialStillNeeded}</strong>
            <small>
              {activeItems.length > 0
                ? `${activeItems.length} requirement${activeItems.length === 1 ? "" : "s"} still open`
                : "Everything is covered"}
            </small>
          </article>
        </div>
      </section>

      <section
        className={`campaign-board ${!hasMaterials ? "campaign-board--single" : ""}`}
      >
        {hasMaterials && (
          <div className="campaign-materials campaign-panel">
            <div className="campaign-materials__header">
              <h3>Material still needed</h3>
              <span>{activeItems.length} open</span>
            </div>

            {activeItems.length > 0 ? (
              activeItems.map((item) => {
                const itemId = item.campaignItemId || item.id;
                const quantityValue = materialQuantities[itemId] ?? "";
                const itemRemaining = Number(
                  item.remainingQuantity ?? item.remainingToPledge ?? 0,
                );

                return (
                  <div className="campaign-material-item" key={itemId}>
                    <div className="campaign-material-item__info">
                      <strong>{item.name}</strong>
                      <span>
                        {item.totalPledged || 0} / {item.targetQuantity}{" "}
                        {item.unit}
                      </span>
                      <small>{Math.max(0, itemRemaining)} remaining</small>
                    </div>

                    <div className="campaign-item-quantity">
                      <label htmlFor={`item-${itemId}`}>Need</label>
                      <input
                        id={`item-${itemId}`}
                        type="number"
                        min="1"
                        step="1"
                        value={quantityValue}
                        onChange={(event) =>
                          updateMaterialQuantity(itemId, event.target.value)
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="campaign-form-note">
                All material requirements have been covered.
              </p>
            )}
          </div>
        )}

        <div
          className={`campaign-form campaign-panel ${!hasMaterials ? "campaign-form--full" : ""}`}
        >
          <div>
            <p className="campaign-kicker">Make a pledge</p>
            <h2>Be part of this church goal.</h2>
            <p className="campaign-muted">
              Give financially, give resources, or do both in one pledge.
            </p>
          </div>

          {accepting ? (
            <form onSubmit={submit} noValidate>
              {state.message && (
                <div
                  className={`campaign-alert ${state.error ? "campaign-alert--error" : "campaign-alert--success"}`}
                  role={state.error ? "alert" : "status"}
                >
                  <strong>{state.message}</strong>
                  {state.error && <span>{state.error}</span>}
                </div>
              )}

              <label>
                Name *
                <input
                  required
                  name="name"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your full name"
                />
              </label>

              <label>
                Phone Number *
                <input
                  required
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. 077 123 4567"
                />
              </label>

              <label>
                Monetary contribution (optional)
                <input
                  name="amount"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </label>

              <button type="submit" disabled={state.submitting}>
                {state.submitting ? "Recording..." : "Submit pledge"}
              </button>

              <p className="campaign-form-note">
                You can contribute money, items, or both. No account is
                required.
              </p>
            </form>
          ) : (
            <div className="campaign-alert campaign-alert--error" role="status">
              <strong>This campaign is not currently accepting pledges.</strong>
              <span>Please check back when the campaign is active.</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
