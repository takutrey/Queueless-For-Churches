// contexts/NotificationContext.tsx
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import api from "@/utils/axiosInstance";
import { socketService } from "@/utils/socket";
import type {
  Notification,
  NotificationState,
  NotificationContextType,
  NotificationPagination,
} from "@/types/NotificationTypes";
import type { User } from "@/types/AuthTypes";
import { useNavigate } from "react-router-dom";

// ─── Create context ──────────────────────────────────────────────────────
const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

// ─── Helper to get base path for navigation ──────────────────────────────
const getBasePath = (user: User | null) => {
  if (!user?.role) return "/login-page";
  return `/${user.role}`;
};

// ─── Reducer ──────────────────────────────────────────────────────────────
type NotificationAction =
  | {
      type: "SET_NOTIFICATIONS";
      payload: {
        notifications: Notification[];
        unreadCount: number;
        pagination: NotificationPagination;
      };
    }
  | { type: "ADD_NOTIFICATION"; payload: Notification }
  | { type: "MARK_AS_READ"; payload: string }
  | { type: "MARK_ALL_READ" }
  | { type: "REMOVE_NOTIFICATION"; payload: string };

const notificationReducer = (
  state: NotificationState,
  action: NotificationAction,
): NotificationState => {
  switch (action.type) {
    case "SET_NOTIFICATIONS":
      return {
        ...state,
        notifications: action.payload.notifications,
        unreadCount: action.payload.unreadCount,
        pagination: action.payload.pagination,
        isLoading: false,
        error: null,
      };
    case "ADD_NOTIFICATION": {
      const exists = state.notifications.some(
        (n) => n.id === action.payload.id,
      );
      if (exists) return state;
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    }
    case "MARK_AS_READ": {
      const updated = state.notifications.map((n) =>
        n.id === action.payload
          ? { ...n, isRead: true, readAt: new Date().toISOString() }
          : n,
      );
      const wasUnread = state.notifications.some(
        (n) => n.id === action.payload && !n.isRead,
      );
      return {
        ...state,
        notifications: updated,
        unreadCount: wasUnread
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      };
    }
    case "MARK_ALL_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        })),
        unreadCount: 0,
      };
    case "REMOVE_NOTIFICATION": {
      const removed = state.notifications.find((n) => n.id === action.payload);
      return {
        ...state,
        notifications: state.notifications.filter(
          (n) => n.id !== action.payload,
        ),
        unreadCount:
          removed && !removed.isRead
            ? Math.max(0, state.unreadCount - 1)
            : state.unreadCount,
      };
    }
    default:
      return state;
  }
};

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  unreadCountLoading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  },
};

// ─── Provider ─────────────────────────────────────────────────────────────
interface NotificationProviderProps {
  children: ReactNode;
  user: User | null;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  user,
}) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const navigate = useNavigate();
  const isMounted = React.useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ── Request permission ──────────────────────────────────────────────────
  const requestNotificationPermission = useCallback(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        console.log("Notification permission:", permission);
      });
    }
  }, []);

  // ── Navigation ──────────────────────────────────────────────────────────
  const navigateToNotification = useCallback(
    (notification: Notification) => {
      if (!notification) return;
      const basePath = getBasePath(user);
      if (notification.queueId) {
        navigate(`${basePath}/queues/${notification.queueId}`);
      } else {
        navigate(`${basePath}/queues`);
      }
      // Mark as read after navigation (optimistic)
      if (!notification.isRead) {
        api
          .patch(`/notifications/${notification.id}/read`)
          .then(() => {
            if (isMounted.current) {
              dispatch({ type: "MARK_AS_READ", payload: notification.id });
            }
          })
          .catch((err) => console.warn("Could not mark as read:", err));
      }
    },
    [navigate, user],
  );

  // ── Effects ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) {
      console.log("No user, skipping notification setup");
      return;
    }

    let isSubscribed = true;

    // ── Socket listeners ──────────────────────────────────────────────────
    const setupSocketListeners = () => {
      socketService.on("notification:new", (notification: Notification) => {
        if (!isSubscribed) return;
        console.log("📬 New notification:", notification);
        dispatch({ type: "ADD_NOTIFICATION", payload: notification });

        if ("Notification" in window && Notification.permission === "granted") {
          const options: NotificationOptions = {
            body: notification.message,
            icon: "/logo.png",
            tag: notification.id,
            data: notification,
          };
          const browserNotif = new Notification(notification.title, options);
          browserNotif.onclick = () => {
            window.focus();
            navigateToNotification(notification);
            browserNotif.close();
          };
        }
      });

      socketService.on(
        "notification:read",
        (data: { notificationId: string }) => {
          if (!isSubscribed) return;
          dispatch({ type: "MARK_AS_READ", payload: data.notificationId });
        },
      );

      socketService.on("notification:allRead", () => {
        if (!isSubscribed) return;
        dispatch({ type: "MARK_ALL_READ" });
      });

      socketService.on(
        "notification:deleted",
        (data: { notificationId: string }) => {
          if (!isSubscribed) return;
          dispatch({
            type: "REMOVE_NOTIFICATION",
            payload: data.notificationId,
          });
        },
      );
    };

    // ── Load notifications ──────────────────────────────────────────────
    const loadNotifications = async () => {
      try {
        const response = await api.get<{
          notifications: Notification[];
          pagination: NotificationPagination;
        }>("/notifications/my-notifications");
        if (isSubscribed) {
          const notifications = response.data.notifications || [];
          const unreadCount = notifications.filter((n) => !n.isRead).length;
          dispatch({
            type: "SET_NOTIFICATIONS",
            payload: {
              notifications,
              unreadCount,
              pagination: response.data.pagination,
            },
          });
        }
      } catch (error: any) {
        if (error.response?.status === 401) {
          console.warn("User not authenticated for notifications");
          return;
        }
        console.error("Error loading notifications:", error);
      }
    };

    // ── Setup socket ─────────────────────────────────────────────────────
    if (socketService.isConnected()) {
      setupSocketListeners();
    } else {
      const onConnect = () => {
        if (isSubscribed) setupSocketListeners();
        socketService.off("connect", onConnect);
      };
      socketService.on("connect", onConnect);
      return () => {
        isSubscribed = false;
        socketService.off("connect", onConnect);
      };
    }

    loadNotifications();
    requestNotificationPermission();

    return () => {
      isSubscribed = false;
      socketService.off("notification:new");
      socketService.off("notification:read");
      socketService.off("notification:allRead");
      socketService.off("notification:deleted");
    };
  }, [user?.id, navigateToNotification, requestNotificationPermission]);

  // ── API functions ──────────────────────────────────────────────────────
  const markAsRead = async (notificationId: string) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      if (isMounted.current) {
        dispatch({ type: "MARK_AS_READ", payload: notificationId });
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.warn("Auth error marking as read");
        return;
      }
      console.error("Error marking as read:", error);
      // Optimistic update
      if (isMounted.current) {
        dispatch({ type: "MARK_AS_READ", payload: notificationId });
      }
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      if (isMounted.current) {
        dispatch({ type: "MARK_ALL_READ" });
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.warn("Auth error marking all as read");
        if (isMounted.current) dispatch({ type: "MARK_ALL_READ" });
        return;
      }
      console.error("Error marking all as read:", error);
      throw error;
    }
  };

  const value: NotificationContextType = {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    markAsRead,
    markAllAsRead,
    requestNotificationPermission,
    navigateToNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  }
  return context;
};
