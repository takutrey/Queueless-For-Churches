// axiosInstance.ts
import axios from "axios";

const BASE_URL = "https://queueless-for-churches.onrender.com/api";

// Base path Vite is serving the app under ("/admin"). Strip trailing slash.
const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

let isRefreshing = false;
let failedRequests: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

let isLoggingOut = false;
let isLoggingOutPromise: Promise<void> | null = null;

// Call this from LogoutUser thunk after logout completes (success or failure)
export const resetLoggingOut = () => {
  isLoggingOut = false;
  isLoggingOutPromise = null;
};

// Set isLoggingOut = true synchronously the moment the logout request is configured
api.interceptors.request.use((config) => {
  if (config.url?.includes("/logout")) {
    isLoggingOut = true;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If we're in the process of logging out, don't attempt any refresh - just reject
    if (isLoggingOut) {
      return Promise.reject(error);
    }

    // Don't attempt refresh for login requests
    const isLoginRequest = originalRequest.url?.includes("/login");

    // Don't attempt refresh for these specific endpoints
    const shouldSkipRefresh =
      originalRequest.url?.includes("/logout") ||
      originalRequest.url?.includes("/refresh-token") ||
      originalRequest.url?.includes("/login");

    // For login failures, just reject without attempting refresh
    if (isLoginRequest) {
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      !shouldSkipRefresh &&
      !originalRequest._retry
    ) {
      // Don't retry a request that already retried once
      if (originalRequest._retry) {
        return Promise.reject(error);
      }

      // Queue requests while a refresh is already in flight
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedRequests.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(
          `${BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true },
        );

        failedRequests.forEach((pending) => pending.resolve());
        failedRequests = [];

        return api(originalRequest);
      } catch (err) {
        failedRequests.forEach((pending) => pending.reject(err));
        failedRequests = [];

        // Only redirect to login for page-level failures, not background API calls
        const isBackgroundCall =
          originalRequest.url?.includes("/notifications");

        // Don't force-redirect away from pages that are meant to work
        // without an active session (login, forgot/reset password) —
        // a 401 there is expected, not a reason to bounce the user.
        const publicPaths = [
          "/login-page",
          "/forgot-password",
          "/reset-password",
          "/signup-page",
        ];

        // Strip the Vite base path (e.g. "/admin") so we compare the
        // in-app route, not the full browser pathname.
        const pathWithoutBase =
          window.location.pathname.replace(BASE_PATH, "") || "/";
        const isPublicPage = publicPaths.some((p) =>
          pathWithoutBase.startsWith(p),
        );

        if (!isLoggingOut && !isBackgroundCall && !isPublicPage) {
          // Redirect to the login page WITH the base path so Vite's
          // dev server serves the SPA instead of showing a 404.
          window.location.href = `${BASE_PATH}/login-page`;
        }

        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 423) {
      const { message, remainingMinutes } = error.response.data;
      error.lockedMessage =
        message || `Account locked for ${remainingMinutes} minutes`;
      return Promise.reject(error);
    }

    if (error.response?.status === 429) {
      const { message, waitSeconds } = error.response.data;
      error.rateLimitMessage = message || `Please wait ${waitSeconds} seconds`;
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default api;
