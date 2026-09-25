// types/NotificationTypes.ts

export type NotificationType =
  | "queue_joined"
  | "customer_called"
  | "queue_paused"
  | "queue_closed"
  | "subscription"
  | "system";

export interface Notification {
  id: string;
  churchId: string;
  userId: string | null; // null = church-wide
  queueId: string | null;
  queueEntryId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Optional joined relation (if you include queue in responses)
  queue?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface NotificationPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  unreadCountLoading: boolean;
  error: string | null;
  pagination: NotificationPagination;
}

// ─── GET /api/notifications/my-notifications ───────────────────────────────
export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export interface GetNotificationsResponse {
  notifications: Notification[];
  pagination: NotificationPagination;
}

// ─── GET /api/notifications/unread-count ──────────────────────────────────
export interface GetUnreadCountResponse {
  count: number;
}

// ─── PATCH /api/notifications/:notificationId/read ────────────────────────
export interface MarkAsReadResponse {
  message: string;
  notification: Notification;
}

// ─── PATCH /api/notifications/read-all ────────────────────────────────────
export interface MarkAllAsReadResponse {
  message: string;
}

// ─── DELETE /api/notifications/:notificationId ────────────────────────────
export interface DeleteNotificationResponse {
  message: string;
}

// ─── DELETE /api/notifications/read ────────────────────────────────────────
export interface DeleteReadNotificationsResponse {
  message: string;
}

// Context type (used in NotificationContext)
export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  requestNotificationPermission: () => void;
  navigateToNotification: (notification: Notification) => void;
}
