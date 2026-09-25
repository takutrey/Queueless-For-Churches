import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function NavigationBar({ title, showBack = true, onBack }) {
  const navigate = useNavigate();
  const location = useLocation();

  const canGoBack = (location.key !== "default" || !!onBack) && showBack;

  const handleBack = () => (onBack ? onBack() : navigate(-1));

  return (
    <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md px-4 py-3.5 flex items-center gap-3 border-b border-slate-100 safe-top">
      {canGoBack && (
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="p-2 -ml-2 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition touch-manipulation"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      <span className="text-sm font-semibold text-slate-900 truncate">
        {title}
      </span>
    </div>
  );
}
