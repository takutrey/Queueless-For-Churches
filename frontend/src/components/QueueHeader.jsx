export default function QueueHeader({ churchName, queueName, small = false }) {
  const displayName = churchName?.trim() || "Church";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
        {initials}
      </div>
      <div className="min-w-0">
        <p className="text-slate-500 text-xs font-semibold truncate">
          {displayName}
        </p>
        <h1
          className={`font-bold tracking-tight text-slate-900 leading-tight truncate ${
            small ? "text-lg" : "text-2xl"
          }`}
        >
          {queueName}
        </h1>
      </div>
    </div>
  );
}
