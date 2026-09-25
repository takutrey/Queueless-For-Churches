import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { joinQueue, selectQueueEntry } from "../lib/QueueSlice";
import QueueActionButton from "./QueueActionButton";
import { ChevronLeft, User, ShieldCheck, AlertCircle } from "lucide-react";
import { rememberTicket } from "../utils/ticketStorage";

/**
 * Shared "join this queue" form used by the public queue pages.
 *
 * `onBack`, if provided, renders a back button and is called instead of a
 * router navigation, so the caller decides what "back" means.
 */
export default function QueueJoinForm({
  queueId,
  queueName,
  churchName,
  onBack,
}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { status, error } = useSelector(selectQueueEntry);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    dispatch(
      joinQueue({
        queueId,
        customerName: name.trim(),
        customerPhone: phone.trim(),
      }),
    )
      .unwrap()
      .then((data) => {
        rememberTicket(data.customerToken);
        navigate(`/t/${data.customerToken}`);
      })
      .catch(() => {});
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-6">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Join queue
        </h1>
      </div>

      {(churchName || queueName) && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            {churchName && (
              <p className="font-semibold text-sm text-slate-900 truncate">
                {churchName}
              </p>
            )}
            {queueName && (
              <p className="text-indigo-600 text-xs font-semibold truncate">
                {queueName}
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 text-rose-700 text-sm px-4 py-3 mb-5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
        Your details
      </p>

      {!online && (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 mb-4 text-sm text-amber-800">
          You are offline. Reconnect before requesting a ticket.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">
            Full name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Tendai Moyo"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition px-4 py-3.5 text-slate-900 placeholder:text-slate-400"
            required
            autoFocus
          />
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">
            Phone number (optional)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 077 123 4567"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition px-4 py-3.5 text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl bg-slate-50 px-4 py-3 mb-1">
          <ShieldCheck className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500">
            We'll use this number to notify you when it's your turn.
          </p>
        </div>

        <QueueActionButton
          label={status === "loading" ? "Joining..." : "Join queue"}
          type="submit"
          primary
          disabled={status === "loading" || !name.trim() || !online}
        />
        <p className="text-center text-xs text-slate-400 mt-3">
          No account required
        </p>
      </form>
    </div>
  );
}
