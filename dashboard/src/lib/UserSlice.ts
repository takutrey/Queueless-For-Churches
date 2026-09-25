// lib/UserSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/utils/axiosInstance";
import type { User } from "@/types/UserTypes";

interface UserState {
  users: User[] | null;
  isLoading: boolean;
  error: string | null;
  currentUserProfile: {
    user: User | null;
    roleDetails: any; // You might want to type this more specifically
  } | null; // Add this
}

const initialState: UserState = {
  users: null,
  isLoading: false,
  error: null,
  currentUserProfile: null,
};

// ─── Fetch all users for the church ──────────────────
export const fetchAllUsers = createAsyncThunk(
  "users/fetchAllUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/users/get-users");
      // Backend returns { users: [...] }
      return response.data.users;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch users",
      );
    }
  },
);

// ─── Create a new manager or staff ─────────────────────
export const createUser = createAsyncThunk(
  "users/createUser",
  async (
    data: { name: string; email?: string; phone?: string; role: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await api.post("/users/create-user", data);
      // Backend returns { user: {...}, temporaryPassword: "..." }
      return response.data.user;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create user",
      );
    }
  },
);

// ─── Update user (name, email, phone, role, isActive) ────────
export const updateUser = createAsyncThunk(
  "users/updateUser",
  async (
    { id, data }: { id: string; data: Partial<User> },
    { rejectWithValue },
  ) => {
    try {
      const response = await api.patch(`/users/update-user/${id}`, data);
      return response.data.user;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update user",
      );
    }
  },
);

// ─── Delete user (hard delete) ─────────────────────────
export const deleteUser = createAsyncThunk(
  "users/deleteUser",
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/users/delete-user/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete user",
      );
    }
  },
);

// ─── Bulk deactivate ────────────────────────────────────
export const bulkDeactivateUsers = createAsyncThunk(
  "users/bulkDeactivateUsers",
  async (userIds: string[], { rejectWithValue }) => {
    try {
      const response = await api.post("/users/bulk/deactivate", { userIds });
      return response.data; // { message, updatedCount }
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to deactivate users",
      );
    }
  },
);

// ─── Bulk activate ──────────────────────────────────────
export const bulkActivateUsers = createAsyncThunk(
  "users/bulkActivateUsers",
  async (userIds: string[], { rejectWithValue }) => {
    try {
      const response = await api.post("/users/bulk/activate", { userIds });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to activate users",
      );
    }
  },
);

export const fetchMyProfile = createAsyncThunk(
  "users/fetchMyProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/users/my-profile");
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch profile",
      );
    }
  },
);

// ─── Slice ──────────────────────────────────────────────
const userSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAllUsers
      .addCase(fetchAllUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = action.payload;
      })
      .addCase(fetchAllUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // createUser
      .addCase(createUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.users) {
          state.users.unshift(action.payload);
        } else {
          state.users = [action.payload];
        }
      })
      .addCase(createUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // updateUser
      .addCase(updateUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.users) {
          const index = state.users.findIndex(
            (u) => u.id === action.payload.id,
          );
          if (index !== -1) state.users[index] = action.payload;
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // deleteUser
      .addCase(deleteUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.users) {
          state.users = state.users.filter((u) => u.id !== action.payload);
        }
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // bulkDeactivateUsers
      .addCase(bulkDeactivateUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(bulkDeactivateUsers.fulfilled, (state) => {
        state.isLoading = false;
        // We'll refetch users after bulk action to get fresh data
        // but we could also update local state; simplest is to refetch.
        // The page will call fetchAllUsers after the action, so we don't mutate here.
      })
      .addCase(bulkDeactivateUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // bulkActivateUsers
      .addCase(bulkActivateUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(bulkActivateUsers.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(bulkActivateUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch My Profile
      .addCase(fetchMyProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentUserProfile = action.payload;
      })
      .addCase(fetchMyProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = userSlice.actions;
export default userSlice.reducer;
