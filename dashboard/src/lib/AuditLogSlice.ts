import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type {
  AuditLog,
  AuditLogState,
  GetAllLogsParams,
  GetAllLogsResponse,
  AuditStatisticsResponse,
  SearchLogsParams,
  SearchLogsResponse,
  UserAuditTrailResponse,
  EntityAuditHistoryResponse,
  CleanupLogsPayload,
  CleanupLogsResponse,
} from "@/types/AuditLogTypes";
import api from "@/utils/axiosInstance";

const initialState: AuditLogState = {
  logs: [],
  currentLog: null,
  isLoading: false,
  error: null,
  statistics: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
};

// Get all audit logs
export const getAllAuditLogs = createAsyncThunk<
  GetAllLogsResponse,
  GetAllLogsParams | void,
  { rejectValue: string }
>("auditLog/getAllAuditLogs", async (params, thunkAPI) => {
  try {
    const config = params ? { params } : {};
    const response = await api.get("/auditlogs/all-logs", config);
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Failed to fetch audit logs",
    );
  }
});

// Get audit log by ID
export const getAuditLogById = createAsyncThunk<
  { success: boolean; data: AuditLog },
  string,
  { rejectValue: string }
>("auditLog/getAuditLogById", async (id, thunkAPI) => {
  try {
    const response = await api.get(`/auditlogs/audit-log/${id}`);
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Failed to fetch audit log",
    );
  }
});

// Get audit statistics
export const getAuditStatistics = createAsyncThunk<
  AuditStatisticsResponse,
  { days?: number } | void,
  { rejectValue: string }
>("auditLog/getAuditStatistics", async (params, thunkAPI) => {
  try {
    const config = params ? { params } : {};
    const response = await api.get("/auditlogs/logs-statistics", config);
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Failed to fetch audit statistics",
    );
  }
});

// Search audit logs
export const searchAuditLogs = createAsyncThunk<
  SearchLogsResponse,
  SearchLogsParams,
  { rejectValue: string }
>("auditLog/searchAuditLogs", async (params, thunkAPI) => {
  try {
    const response = await api.get("/auditlogs/search-logs", { params });
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Failed to search audit logs",
    );
  }
});

// Get user audit trail
export const getUserAuditTrail = createAsyncThunk<
  UserAuditTrailResponse,
  { userId: string; page?: number; limit?: number },
  { rejectValue: string }
>("auditLog/getUserAuditTrail", async ({ userId, page, limit }, thunkAPI) => {
  try {
    const params: any = {};
    if (page) params.page = page;
    if (limit) params.limit = limit;

    const response = await api.get(`/auditlogs/user/${userId}`, { params });
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Failed to fetch user audit trail",
    );
  }
});

// Get entity audit history
export const getEntityAuditHistory = createAsyncThunk<
  EntityAuditHistoryResponse,
  { entity: string; entityId: string },
  { rejectValue: string }
>("auditLog/getEntityAuditHistory", async ({ entity, entityId }, thunkAPI) => {
  try {
    const response = await api.get(`/auditlogs/entity/${entity}/${entityId}`);
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Failed to fetch entity audit history",
    );
  }
});

// Export audit logs
export const exportAuditLogs = createAsyncThunk<
  Blob,
  {
    format?: "json" | "csv";
    startDate?: string;
    endDate?: string;
    userId?: string;
    action?: string;
    entity?: string;
  },
  { rejectValue: string }
>("auditLog/exportAuditLogs", async (params, thunkAPI) => {
  try {
    const response = await api.get("/auditlogs/export-logs", {
      params,
      responseType: "blob",
    });
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Failed to export audit logs",
    );
  }
});

// Cleanup audit logs
export const cleanupAuditLogs = createAsyncThunk<
  CleanupLogsResponse,
  CleanupLogsPayload | void,
  { rejectValue: string }
>("auditLog/cleanupAuditLogs", async (data, thunkAPI) => {
  try {
    const response = await api.delete("/auditlogs/audit-logs-cleanup", {
      data,
    });
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || "Failed to cleanup audit logs",
    );
  }
});

const auditLogSlice = createSlice({
  name: "auditLog",
  initialState,
  reducers: {
    reset: () => initialState,
    clearCurrentLog: (state) => {
      state.currentLog = null;
    },
    clearStatistics: (state) => {
      state.statistics = null;
    },
  },
  extraReducers: (builder) => {
    // Get All Audit Logs
    builder
      .addCase(getAllAuditLogs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAllAuditLogs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.logs = action.payload.data.logs;
        state.pagination = action.payload.data.pagination;
      })
      .addCase(getAllAuditLogs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Get Audit Log By ID
    builder
      .addCase(getAuditLogById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAuditLogById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentLog = action.payload.data;
      })
      .addCase(getAuditLogById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Get Audit Statistics
    builder
      .addCase(getAuditStatistics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAuditStatistics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.statistics = action.payload.data;
      })
      .addCase(getAuditStatistics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Search Audit Logs
    builder
      .addCase(searchAuditLogs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchAuditLogs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.logs = action.payload.data.logs;
        state.pagination = action.payload.data.pagination;
      })
      .addCase(searchAuditLogs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Get User Audit Trail
    builder
      .addCase(getUserAuditTrail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getUserAuditTrail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.logs = action.payload.data.logs;
        state.pagination = action.payload.data.pagination;
      })
      .addCase(getUserAuditTrail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Get Entity Audit History
    builder
      .addCase(getEntityAuditHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getEntityAuditHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.logs = action.payload.data.logs;
      })
      .addCase(getEntityAuditHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Cleanup Audit Logs
    builder
      .addCase(cleanupAuditLogs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cleanupAuditLogs.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(cleanupAuditLogs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { reset, clearCurrentLog, clearStatistics } =
  auditLogSlice.actions;
export default auditLogSlice.reducer;
