// store/notificationSlice.ts
import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type {
  Notification,
  NotificationState,
  GetNotificationsParams,
  GetNotificationsResponse,
  GetUnreadCountResponse,
  MarkAsReadResponse,
  MarkAllAsReadResponse,
  DeleteNotificationResponse,
  DeleteReadNotificationsResponse,
} from "@/types/NotificationTypes";
import api from "@/utils/axiosInstance";

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

// Get notifications (now using /my-notifications)
export const getNotifications = createAsyncThunk<
  GetNotificationsResponse,
  GetNotificationsParams | void,
  { rejectValue: string }
>("notification/getNotifications", async (params, thunkAPI) => {
  try {
    const config = params ? { params } : {};
    const response = await api.get("/notifications/my-notifications", config);
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Failed to fetch notifications",
    );
  }
});

// Get unread count
export const getUnreadCount = createAsyncThunk<
  GetUnreadCountResponse,
  void,
  { rejectValue: string }
>("notification/getUnreadCount", async (_, thunkAPI) => {
  try {
    const response = await api.get("/notifications/unread-count");
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Failed to fetch unread count",
    );
  }
});

// Mark one as read
export const markAsRead = createAsyncThunk<
  MarkAsReadResponse & { notificationId: string },
  string,
  { rejectValue: string }
>("notification/markAsRead", async (notificationId, thunkAPI) => {
  try {
    const response = await api.patch(`/notifications/${notificationId}/read`);
    return { ...response.data, notificationId };
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Failed to mark notification as read",
    );
  }
});

// Mark all as read
export const markAllAsRead = createAsyncThunk<
  MarkAllAsReadResponse,
  void,
  { rejectValue: string }
>("notification/markAllAsRead", async (_, thunkAPI) => {
  try {
    const response = await api.patch("/notifications/read-all");
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message ||
        "Failed to mark all notifications as read",
    );
  }
});

// Delete one
export const deleteNotification = createAsyncThunk<
  DeleteNotificationResponse & { notificationId: string },
  string,
  { rejectValue: string }
>("notification/deleteNotification", async (notificationId, thunkAPI) => {
  try {
    const response = await api.delete(`/notifications/${notificationId}`);
    return { ...response.data, notificationId };
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Failed to delete notification",
    );
  }
});

// Delete read notifications
export const deleteReadNotifications = createAsyncThunk<
  DeleteReadNotificationsResponse,
  void,
  { rejectValue: string }
>("notification/deleteReadNotifications", async (_, thunkAPI) => {
  try {
    const response = await api.delete("/notifications/read");
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Failed to delete read notifications",
    );
  }
});

const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {
    reset: () => initialState,
    clearNotificationError: (state) => {
      state.error = null;
    },
    notificationReceived: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.isRead) state.unreadCount += 1;
    },
    notificationRead: (state, action: PayloadAction<string>) => {
      const notif = state.notifications.find((n) => n.id === action.payload);
      if (notif && !notif.isRead) {
        notif.isRead = true;
        notif.readAt = new Date().toISOString();
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    notificationAllRead: (state) => {
      state.notifications.forEach((n) => {
        if (!n.isRead) {
          n.isRead = true;
          n.readAt = new Date().toISOString();
        }
      });
      state.unreadCount = 0;
    },
    notificationRemoved: (state, action: PayloadAction<string>) => {
      const removed = state.notifications.find((n) => n.id === action.payload);
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload,
      );
      if (removed && !removed.isRead) {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
  },
  extraReducers: (builder) => {
    // Get Notifications
    builder
      .addCase(getNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload.notifications;
        state.pagination = action.payload.pagination;
        // Compute unread count from the list
        state.unreadCount = action.payload.notifications.filter(
          (n) => !n.isRead,
        ).length;
      })
      .addCase(getNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Get Unread Count
    builder
      .addCase(getUnreadCount.pending, (state) => {
        state.unreadCountLoading = true;
      })
      .addCase(getUnreadCount.fulfilled, (state, action) => {
        state.unreadCountLoading = false;
        state.unreadCount = action.payload.count;
      })
      .addCase(getUnreadCount.rejected, (state, action) => {
        state.unreadCountLoading = false;
        state.error = action.payload as string;
      });

    // Mark As Read
    builder
      .addCase(markAsRead.fulfilled, (state, action) => {
        const idx = state.notifications.findIndex(
          (n) => n.id === action.payload.notificationId,
        );
        if (idx !== -1) {
          // The backend returns the updated notification in response.data.notification
          // but we only have notificationId in our payload; we can update locally
          const notif = state.notifications[idx];
          if (!notif.isRead) {
            notif.isRead = true;
            notif.readAt = new Date().toISOString();
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        }
      })
      .addCase(markAsRead.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Mark All As Read
    builder
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach((n) => {
          if (!n.isRead) {
            n.isRead = true;
            n.readAt = new Date().toISOString();
          }
        });
        state.unreadCount = 0;
      })
      .addCase(markAllAsRead.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Delete Notification
    builder
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const removed = state.notifications.find(
          (n) => n.id === action.payload.notificationId,
        );
        state.notifications = state.notifications.filter(
          (n) => n.id !== action.payload.notificationId,
        );
        if (removed && !removed.isRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Delete Read Notifications
    builder
      .addCase(deleteReadNotifications.fulfilled, (state) => {
        state.notifications = state.notifications.filter((n) => !n.isRead);
        // unread count remains the same (only read ones removed)
      })
      .addCase(deleteReadNotifications.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  reset,
  clearNotificationError,
  notificationReceived,
  notificationRead,
  notificationAllRead,
  notificationRemoved,
} = notificationSlice.actions;
export default notificationSlice.reducer;
