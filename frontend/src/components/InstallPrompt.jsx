import usePwaInstallPrompt from "../hooks/usePwaInstallPrompt";

export default function InstallPrompt() {
  const { isInstallable, promptInstall, dismiss } = usePwaInstallPrompt();

  if (!isInstallable) return null;

  return (
    <div
      className="install-prompt"
      role="dialog"
      aria-label="Install QueueLess"
    >
      <div className="install-prompt__card surface-card">
        <img
          className="install-prompt__icon"
          src="/logo-192x192.png"
          alt=""
          width={40}
          height={40}
        />

        <div className="install-prompt__body">
          <div className="install-prompt__title">Install QueueLess</div>
          <p className="install-prompt__desc">
            Add it to your home screen for one-tap access to your tickets and
            live queue updates.
          </p>
        </div>

        <div className="install-prompt__actions">
          <button type="button" className="btn btn--ghost" onClick={dismiss}>
            Not now
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={promptInstall}
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
