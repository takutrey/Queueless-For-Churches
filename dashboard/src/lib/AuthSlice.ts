import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type {
  AuthState,
  User,
  CreateUserPayload,
  InviteUser,
  CompletePasswordPayload,
  RoleDetailsPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  ValidateResetTokenResponse,
  ChurchSignupResponse,
  ChurchSignupPayload,
} from "@/types/AuthTypes";
import api, { resetLoggingOut } from "@/utils/axiosInstance";
const initialState: AuthState = {
  user: null,
  error: null,
  success: null,
  isLoading: false,
  isRehydrated: true,
  isAuthenticated: false,
  isInitialized: false,
};

// ─── Login ────────────────────────────────────────────────────────────────────

export const LoginUser = createAsyncThunk<
  User,
  { email: string; password: string },
  { rejectValue: string }
>("auth/LoginUser", async (credentials, thunkAPI) => {
  try {
    const response = await api.post("/auth/login", credentials);
    const userData = response.data.user;

    return userData;
  } catch (error: any) {
    if (error.response?.status === 423) {
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
    if (error.response?.status === 429) {
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
    return thunkAPI.rejectWithValue(
      error.response?.data?.message ||
        "Login failed. Please check your credentials.",
    );
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────

// AuthSlice.ts - Update the LogoutUser thunk
// AuthSlice.ts - Fix the LogoutUser thunk
export const LogoutUser = createAsyncThunk(
  "auth/LogoutUser",
  async (_, thunkAPI) => {
    try {
      // Use the configured api instance instead of axios directly
      // Don't add /api prefix because your api instance already has it
      await api.post("/auth/logout", {});
      return true;
    } catch (error: any) {
      return true;
    } finally {
      // Give a small delay to ensure any in-flight requests complete
      setTimeout(() => {
        resetLoggingOut();
      }, 100);
    }
  },
);
// ─── Create User (Admin) ──────────────────────────────────────────────────────

export const createUser = createAsyncThunk<
  string,
  CreateUserPayload,
  { rejectValue: string }
>("auth/createUser", async (userData, thunkAPI) => {
  try {
    const response = await api.post("/users/create-user", userData);
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Failed to create user",
    );
  }
});

// ─── Verify Invite Token ──────────────────────────────────────────────────────
// GET /auth/verify-invite?token=<token>
// Returns user info (id, name, email, role) so the UI can render
// the correct role-specific form before the user sets a password.

export const verifyInviteToken = createAsyncThunk<
  InviteUser,
  string,
  { rejectValue: string }
>("auth/verifyInviteToken", async (token, thunkAPI) => {
  try {
    const response = await api.get(`/auth/verify-invite?token=${token}`);
    return response.data as InviteUser;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Invalid or expired invite link.",
    );
  }
});

// ─── Sign Up (set password via invite token) ──────────────────────────────────
// POST /auth/signup  { token, password, confirmPassword }

export const SignUp = createAsyncThunk<
  string,
  CompletePasswordPayload,
  { rejectValue: string }
>("auth/SignUp", async (data, thunkAPI) => {
  try {
    if (data.password !== data.confirmPassword) {
      return thunkAPI.rejectWithValue("Passwords do not match");
    }
    const response = await api.patch("/auth/signup", data);
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Signup failed",
    );
  }
});

const roleDetailsPath: Record<string, string> = {
  teacher: "create-teacher",
  student: "create-student",
};

export const submitRoleDetails = createAsyncThunk<
  string,
  { userId: string; role: string; details: RoleDetailsPayload },
  { rejectValue: string }
>("auth/submitRoleDetails", async ({ userId, role, details }, thunkAPI) => {
  try {
    const path = roleDetailsPath[role] ?? "details";
    if (!path) {
      return thunkAPI.rejectWithValue(`No route configured for role: ${role}`);
    }
    const response = await api.patch(`/users/${path}/${userId}`, details);
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Failed to save details",
    );
  }
});

// ─── Change Password ──────────────────────────────────────────────────────────

export const forgotPassword = createAsyncThunk<
  string,
  ForgotPasswordPayload,
  { rejectValue: string }
>("auth/forgotPassword", async (data, thunkAPI) => {
  try {
    const response = await api.post("/auth/forgot-password", data);
    return response.data.message;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Failed to send reset email",
    );
  }
});

export const validateResetToken = createAsyncThunk<
  ValidateResetTokenResponse,
  { token: string; email: string },
  { rejectValue: string }
>("auth/validateResetToken", async ({ token, email }, thunkAPI) => {
  try {
    const response = await api.get(
      `/auth/validate-reset-token?token=${token}&email=${encodeURIComponent(email)}`,
    );
    return response.data as ValidateResetTokenResponse;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Invalid or expired token",
    );
  }
});

export const resetPassword = createAsyncThunk<
  string,
  ResetPasswordPayload,
  { rejectValue: string }
>("auth/resetPassword", async (data, thunkAPI) => {
  try {
    if (data.newPassword !== data.confirmPassword) {
      return thunkAPI.rejectWithValue("Passwords do not match");
    }
    const response = await api.post("/auth/reset-password", {
      token: data.token,
      email: data.email,
      newPassword: data.newPassword,
    });
    return response.data.message;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Failed to reset password",
    );
  }
});

export const changePassword = createAsyncThunk<
  string,
  { oldPassword: string; newPassword: string },
  { rejectValue: string }
>("auth/changePassword", async (passwords, thunkAPI) => {
  try {
    const response = await api.patch("/auth/change-password", passwords);
    return response.data.msg;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Failed to change password",
    );
  }
});

export const getCurrentUser = createAsyncThunk<
  User,
  void,
  { rejectValue: string }
>("auth/getCurrentUser", async (_, thunkAPI) => {
  try {
    const response = await api.get("/auth/me");

    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      return thunkAPI.rejectWithValue("");
    }
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Failed to fetch user data",
    );
  }
});

export const registerChurch = createAsyncThunk<
  ChurchSignupResponse,
  ChurchSignupPayload,
  { rejectValue: string }
>("auth/registerChurch", async (payload, thunkAPI) => {
  try {
    const response = await api.post("/auth/register-church", payload);
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Failed to create church account",
    );
  }
});

// ─── Slice ────────────────────────────────────────────────────────────────────

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    reset: (state) => {
      state.error = null;
      state.success = null;
      state.isLoading = false;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.success = null;
      state.error = null;
      state.isLoading = false;
    },
    clearAuthState: () => {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(LoginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(LoginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.success = "Login successful";
        state.error = null;
      })
      .addCase(LoginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    builder
      .addCase(getCurrentUser.pending, (state) => {
        if (!state.user) {
          state.isLoading = true;
        }
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isInitialized = true;
        state.error = null;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        // Only clear auth on actual 401, not on empty string (which you send for 401)
        if (action.payload === "" || action.payload === "Session expired") {
          state.user = null;
          state.isAuthenticated = false;
        }
        state.isInitialized = true;
        state.error = null;
      });

    // Logout
    builder
      .addCase(LogoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(LogoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.success = null;
        state.error = null;
      })
      .addCase(LogoutUser.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      });

    // Create User
    builder
      .addCase(createUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = action.payload;
      })
      .addCase(createUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Verify Invite Token
    builder
      .addCase(verifyInviteToken.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyInviteToken.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(verifyInviteToken.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Sign Up
    builder
      .addCase(SignUp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(SignUp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = action.payload;
        state.error = null;
      })
      .addCase(SignUp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Submit Role Details
    builder
      .addCase(submitRoleDetails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(submitRoleDetails.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(submitRoleDetails.rejected, (state, action) => {
        state.isLoading = false;
        // Non-fatal: signup already succeeded, only warn via toast in the component
        state.error = action.payload as string;
      });

    // Forgot Password
    builder
      .addCase(forgotPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = action.payload;
        state.error = null;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Validate Reset Token
    builder
      .addCase(validateResetToken.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(validateResetToken.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(validateResetToken.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Reset Password
    builder
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = action.payload;
        state.error = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(registerChurch.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerChurch.fulfilled, (state) => {
        state.isLoading = false;
        state.success = "Church account created";
      })
      .addCase(registerChurch.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Change Password
    builder
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = action.payload;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { reset, logout, clearAuthState } = authSlice.actions;
export default authSlice.reducer;
