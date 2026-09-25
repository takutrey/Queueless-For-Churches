// App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./store/store";
import { useEffect, useState } from "react";

// Layouts and Routes
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./ProtectedRoute";
import RoleRedirect from "./RoleRedirect";
import { getCurrentUser } from "./lib/AuthSlice";

// GENERAL PAGES
import LoginPage from "./app/login/page";
import NotificationsPage from "./app/notifications/page";
import ProfilePage from "./app/profile/page";
import ForgotPasswordPage from "./app/forgotpassword/page";
import ResetPasswordPage from "./app/resetpassword/page";

// Dashboard Components
import AdminDashboard from "./app/dashboard/admin-dashboard";
import SuperAdminDashboard from "./app/dashboard/superadmin-dashboard";
import ManagerDashboard from "./app/dashboard/manager-dashboard";

// ADMIN PAGES
import AdminUsersPage from "./app/roles/admin/users/page";
import AuditLogsPage from "./app/roles/admin/auditlogs/page";
import StaffDashboard from "./app/dashboard/staff-dashboard";
import OnboardingPage from "./app/onboarding/page";
import QueuesPage from "./app/roles/admin/queues/page";
import ManagerQueuesPage from "./app/roles/admin/queues/page";
import ManagerUsersPage from "./app/roles/manager/users/page";
import StaffQueuesPage from "./app/roles/staff/queues/page";
import CampaignsPage from "./app/campaigns/page";
import CampaignDetailPage from "./app/campaigns/detail-page";
import PledgesPage from "./app/pledges/page";
import AnalyticsPage from "./app/analytics/page";

// Base path Vite serves the app under ("/admin"). Strip trailing slash.
const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated, isLoading } = useSelector(
    (state: RootState) => state.auth,
  );
  const [isInitialized, setIsInitialized] = useState(false);

  // Wait for auth to be fully initialized
  useEffect(() => {
    const checkAuth = async () => {
      // Skip getCurrentUser on public/unauthenticated pages — calling it
      // there will 401, trigger the axios refresh-token flow, and force
      // an unwanted hard redirect to /login-page.
      const publicPaths = [
        "/login-page",
        "/forgot-password",
        "/reset-password",
        "/signup-page",
      ];

      // Strip the Vite base path (e.g. "/admin") so we compare the
      // in-app route, not the full browser pathname.
      const currentPath =
        window.location.pathname.replace(BASE_PATH, "") || "/";

      // Also skip the auth fetch on the root path: RoleRedirect and
      // ProtectedRoute will fetch it if needed. This avoids the 401 →
      // refresh → 401 → hard-redirect cascade when visiting /admin/.
      const skipAuthFetch =
        currentPath === "/" || publicPaths.includes(currentPath);

      if (!skipAuthFetch) {
        try {
          await dispatch(getCurrentUser()).unwrap();
        } catch (error) {
          console.log("No active session");
        }
      }
      setIsInitialized(true);
    };

    checkAuth();
  }, [dispatch]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login-page" element={<LoginPage />} />
      <Route path="/signup-page" element={<OnboardingPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Role redirect - only at root when authenticated */}
      <Route
        path="/"
        element={
          isAuthenticated && user ? (
            <RoleRedirect />
          ) : (
            <Navigate to="/login-page" replace />
          )
        }
      />

      {/* Admin Routes - nested structure */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="queues" element={<QueuesPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="campaigns/:campaignId" element={<CampaignDetailPage />} />
        <Route path="pledges" element={<PledgesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />

        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* SuperAdmin Routes - nested structure */}
      <Route
        path="/superadmin/*"
        element={
          <ProtectedRoute allowedRoles={["superadmin"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<SuperAdminDashboard />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Manager Routes - nested structure */}
      <Route
        path="/manager/*"
        element={
          <ProtectedRoute allowedRoles={["manager"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<ManagerDashboard />} />
        <Route path="queues" element={<ManagerQueuesPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="campaigns/:campaignId" element={<CampaignDetailPage />} />
        <Route path="pledges" element={<PledgesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="users" element={<ManagerUsersPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Staff Routes - nested structure */}
      <Route
        path="/staff/*"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<StaffDashboard />} />
        <Route path="queues" element={<StaffQueuesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Catch all redirect to login */}
      <Route path="*" element={<Navigate to="/login-page" replace />} />
    </Routes>
  );
}

export default App;
