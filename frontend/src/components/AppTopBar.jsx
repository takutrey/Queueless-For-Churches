/**
 * Minimal brand bar for the top-level, "shareable link" pages people land
 * on directly (church list, queue landing). Keeps a consistent app
 * identity without competing with the page's own content.
 */
export default function AppTopBar() {
  return (
    <div className="flex items-center justify-between px-1 pb-4">
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="Logo" className="h-7 w-auto flex-shrink-0" />
      </div>
      <span className="font-mono text-[10px] tracking-wider uppercase text-ink-soft">
        No account needed
      </span>
    </div>
  );
}
