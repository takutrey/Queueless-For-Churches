// RoleRedirect.tsx
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import type { RootState } from "@/store/store";
import { getDefaultRoute } from "@/nav-config/nav-config";

const RoleRedirect = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated,
  );
  const isLoading = useSelector((state: RootState) => state.auth.isLoading);
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // Only redirect at root path
    if (location.pathname !== "/") {
      return;
    }

    // Prevent multiple redirects
    if (hasRedirected.current || isProcessingRef.current) {
      return;
    }

    // Don't redirect while loading or if not authenticated
    if (isLoading) {
      return;
    }

    if (isAuthenticated && user) {
      isProcessingRef.current = true;
      hasRedirected.current = true;
      const targetRoute = getDefaultRoute(user.role);
      console.log(`RoleRedirect: Redirecting to ${targetRoute}`);
      navigate(targetRoute, { replace: true });

      // Reset after navigation
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 100);
    } else if (!isLoading && !isAuthenticated && !user) {
      // Not authenticated, redirect to login
      isProcessingRef.current = true;
      navigate("/login-page", { replace: true });
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 100);
    }

    // Reset redirect flag when user becomes null (logout)
    return () => {
      if (!isAuthenticated) {
        hasRedirected.current = false;
        isProcessingRef.current = false;
      }
    };
  }, [user, isAuthenticated, isLoading, navigate, location.pathname]);

  return null;
};

export default RoleRedirect;
