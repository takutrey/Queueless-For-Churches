import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "pwa-install-dismissed-at";
// If someone dismisses the prompt, don't nag them again for a week.
const SNOOZE_MS = 1000 * 60 * 60 * 24 * 7;

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari doesn't support display-mode, but sets this instead.
    window.navigator.standalone === true
  );
}

/**
 * Captures the browser's `beforeinstallprompt` event so we can trigger it
 * from our own UI instead of the browser's install chip/mini-infobar.
 *
 * Usage:
 *   const { isInstallable, isInstalled, promptInstall, dismiss } = usePwaInstallPrompt();
 *   if (isInstallable) show your own button/banner and call promptInstall() on click.
 *
 * Note: this only fires on Chromium browsers (Chrome, Edge, Samsung Internet,
 * Android). iOS Safari and Firefox never fire beforeinstallprompt — there's
 * no programmatic install there, so isInstallable will just stay false and
 * you'd need separate "Add to Home Screen" instructions for iOS if you want
 * to cover it.
 */
export default function usePwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(isStandalone());

  useEffect(() => {
    if (isInstalled) return;

    function onBeforeInstallPrompt(event) {
      // This is the line that stops Chrome/Edge from showing their own
      // install chip in the URL bar — the event fires, we own it now.
      event.preventDefault();

      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (Date.now() - dismissedAt < SNOOZE_MS) return;

      setDeferredPrompt(event);
    }

    function onAppInstalled() {
      setDeferredPrompt(null);
      setIsInstalled(true);
      localStorage.removeItem(DISMISS_KEY);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [isInstalled]);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return "unavailable";

    // Now we show the real, native install dialog — just on our timing.
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    // A captured prompt event can only be used once, win or lose.
    setDeferredPrompt(null);
    if (outcome === "dismissed") {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    return outcome;
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDeferredPrompt(null);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }, []);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    promptInstall,
    dismiss,
  };
}
