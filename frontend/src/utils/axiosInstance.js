// src/api/axiosInstance.js
import axios from "axios";

// Use environment variable with fallback
const BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://queueless-for-churches.onrender.com/api";
const DEVICE_ID_KEY = "queueless-device-id";

function getDeviceId() {
  try {
    let deviceId = window.localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId =
        window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return null;
  }
}

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // sends cookies (refresh token) automatically
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Refresh token interceptor (unchanged from your version) ───
let isRefreshing = false;
let failedRequests = [];
let isLoggingOut = false;

export const resetLoggingOut = () => {
  isLoggingOut = false;
};

api.interceptors.request.use((config) => {
  if (config.url?.includes("/logout")) {
    isLoggingOut = true;
  }
  const deviceId = getDeviceId();
  if (deviceId) {
    config.headers["X-Device-Id"] = deviceId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (isLoggingOut) {
      return Promise.reject(error);
    }

    const isLoginRequest = originalRequest.url?.includes("/login");
    const shouldSkipRefresh =
      originalRequest.url?.includes("/logout") ||
      originalRequest.url?.includes("/refresh-token") ||
      originalRequest.url?.includes("/login");

    if (isLoginRequest) {
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      !shouldSkipRefresh &&
      !originalRequest._retry
    ) {
      if (originalRequest._retry) {
        return Promise.reject(error);
      }

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
      } catch (refreshError) {
        failedRequests.forEach((pending) => pending.reject(refreshError));
        failedRequests = [];
        return Promise.reject(refreshError);
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
