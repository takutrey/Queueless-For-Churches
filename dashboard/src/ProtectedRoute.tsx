// ProtectedRoute.tsx
import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import type { RootState, AppDispatch } from "@/store/store";
import { getCurrentUser } from "./lib/AuthSlice";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
  } = useSelector((state: RootState) => state.auth);
  const [isChecking, setIsChecking] = useState(true);
  const hasFetched = useRef(false);
  const hasRedirected = useRef(false);

  // Auth verification
  useEffect(() => {
    const verifyAuth = async () => {
      if (isAuthenticated && user) {
        setIsChecking(false);
        return;
      }

      if (!isAuthenticated && !authLoading && !hasFetched.current) {
        hasFetched.current = true;
        try {
          await dispatch(getCurrentUser()).unwrap();
        } catch {
          // silently fail
        } finally {
          setIsChecking(false);
        }
      } else if (!authLoading) {
        setIsChecking(false);
      }
    };
    verifyAuth();
  }, [dispatch, isAuthenticated, user, authLoading]);

  // Imperative redirect when not authenticated
  useEffect(() => {
    if (!isChecking && !authLoading) {
      if (!isAuthenticated || !user) {
        if (!hasRedirected.current) {
          hasRedirected.current = true;
          navigate("/login-page", { replace: true, state: { from: location } });
        }
      }
    }
  }, [isChecking, authLoading, isAuthenticated, user, navigate, location]);

  // Role check – redirect to root if role not allowed
  useEffect(() => {
    if (!isChecking && !authLoading && isAuthenticated && user) {
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        if (!hasRedirected.current) {
          hasRedirected.current = true;
          navigate("/", { replace: true });
        }
      }
    }
  }, [isChecking, authLoading, isAuthenticated, user, allowedRoles, navigate]);

  // Show spinner while checking
  if (isChecking || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // If redirect has been triggered, render nothing (navigation is in flight)
  if (hasRedirected.current) {
    return null;
  }

  // If not authenticated, render nothing (the useEffect above will trigger navigate)
  if (!isAuthenticated || !user) {
    return null;
  }

  // If role not allowed, render nothing (the useEffect above will trigger navigate)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
