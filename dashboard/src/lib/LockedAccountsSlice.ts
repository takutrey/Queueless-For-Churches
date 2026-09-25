import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/utils/axiosInstance";

interface LockedAccount {
  id: string;
  email: string;
  name: string;
  loginAttempts: number;
  lockUntil: string;
  lastLoginAttempt: string;
  role: {
    id: string;
    name: string;
  };
}

interface LockedAccountsState {
  lockedAccounts: LockedAccount[] | null;
  isLoading: boolean;
  unlockLoading: boolean;
  unlockAllLoading: boolean;
  error: string | null;
}

const initialState: LockedAccountsState = {
  lockedAccounts: null,
  isLoading: false,
  unlockLoading: false,
  unlockAllLoading: false,
  error: null,
};

// Fetch all locked accounts
export const fetchLockedAccounts = createAsyncThunk(
  "lockedAccounts/fetchLockedAccounts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/auth/locked-accounts");
      return response.data.users;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch locked accounts",
      );
    }
  },
);

// Unlock a single account
export const unlockAccount = createAsyncThunk(
  "lockedAccounts/unlockAccount",
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await api.post(`/auth/unlock-account/${userId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to unlock account",
      );
    }
  },
);

// Unlock all locked accounts
export const unlockAllLockedAccounts = createAsyncThunk(
  "lockedAccounts/unlockAllLockedAccounts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/auth/unlock-all-accounts");
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to unlock accounts",
      );
    }
  },
);

const lockedAccountsSlice = createSlice({
  name: "lockedAccounts",
  initialState,
  reducers: {
    clearLockedAccountsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Locked Accounts
      .addCase(fetchLockedAccounts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLockedAccounts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lockedAccounts = action.payload;
      })
      .addCase(fetchLockedAccounts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Unlock Single Account
      .addCase(unlockAccount.pending, (state) => {
        state.unlockLoading = true;
        state.error = null;
      })
      .addCase(unlockAccount.fulfilled, (state) => {
        state.unlockLoading = false;
      })
      .addCase(unlockAccount.rejected, (state, action) => {
        state.unlockLoading = false;
        state.error = action.payload as string;
      })

      // Unlock All Accounts
      .addCase(unlockAllLockedAccounts.pending, (state) => {
        state.unlockAllLoading = true;
        state.error = null;
      })
      .addCase(unlockAllLockedAccounts.fulfilled, (state) => {
        state.unlockAllLoading = false;
      })
      .addCase(unlockAllLockedAccounts.rejected, (state, action) => {
        state.unlockAllLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearLockedAccountsError } = lockedAccountsSlice.actions;
export default lockedAccountsSlice.reducer;
