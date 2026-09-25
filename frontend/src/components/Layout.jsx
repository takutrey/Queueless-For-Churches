import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import useConnectionStatus from "../hooks/useConnectionStatus";
import { selectConnection } from "../lib/QueueSlice";

const THEME_KEY = "nolinea-theme";

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12h2.5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    const initial = stored === "dark" ? "dark" : "light";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem(THEME_KEY, next);
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={
        theme === "light" ? "Switch to dark mode" : "Switch to light mode"
      }
      aria-pressed={theme === "dark"}
    >
      {theme === "light" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

export default function Layout({ children }) {
  useConnectionStatus();
  const { online } = useSelector(selectConnection);

  return (
    <div className="shell">
      {!online && (
        <div className="offline-banner" role="status">
          You're offline — reconnecting will refresh your queue status
          automatically.
        </div>
      )}

      <header className="site-header">
        <div className="wrap site-header__row">
          <Link to="/" className="brand">
            <span className="brand__mark">Queueless</span>
            <span className="brand__tag">no lines, just tickets</span>
          </Link>

          <div className="header-right">
            <div className="header-status">
              <span
                className={`dot ${online ? "dot--online" : ""}`}
                aria-hidden="true"
              />
              {online ? "Live" : "Offline"}
            </div>
            <Link to="/my-tickets" className="header-tickets">
              My tickets
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="main">{children}</main>

      <footer className="site-footer">
        <div className="wrap site-footer__row">
          <span>Queueless</span>
          <span>Join from anywhere. Show up when you're called.</span>
        </div>
      </footer>
    </div>
  );
}
