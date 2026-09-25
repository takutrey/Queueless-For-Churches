// src/features/queue/QueueSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../utils/axiosInstance";
// ============================================================
// Thunks – Axios calls are written inline
// ============================================================

export const fetchPublicQueues = createAsyncThunk(
  "queue/fetchPublicQueues",
  async (_, { rejectWithValue }) => {
    try {
      // Backend route: GET /api/queues/public — lists currently open queues
      const response = await api.get(`/queues/public`);
      return response.data.queues; // [{ ...queue, church, stats }]
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to load queues",
      );
    }
  },
);

export const fetchPublicQueue = createAsyncThunk(
  "queue/fetchPublicQueue",
  async (slugOrId, { rejectWithValue }) => {
    try {
      // Backend route: GET /api/queues/public/:slugOrId
      const response = await api.get(`/queues/public/${slugOrId}`);
      return response.data; // { queue, stats }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to load queue",
      );
    }
  },
);

export const joinQueue = createAsyncThunk(
  "queue/joinQueue",
  async ({ queueId, customerName, customerPhone }, { rejectWithValue }) => {
    try {
      // Backend route: POST /api/queues/:queueId/join
      const response = await api.post(`/queues/${queueId}/join`, {
        customerName,
        customerPhone,
      });
      // Controller responds with { message, entry }. JoinQueue.jsx reads
      // data.customerToken off the resolved thunk value, so unwrap `entry` here.
      return response.data.entry;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to join queue",
      );
    }
  },
);

export const fetchQueueEntry = createAsyncThunk(
  "queue/fetchQueueEntry",
  async (customerToken, { rejectWithValue }) => {
    try {
      // Backend route: GET /api/queues/entry/:customerToken
      const response = await api.get(`/queues/entry/${customerToken}`);
      // Controller returns { entry: {...}, peopleAhead, estimatedWaitTime }.
      // QueueStatus.jsx reads these as flat fields on entryData, so flatten here.
      // entry.churchName requires the getQueueEntry backend fix (Church
      // include) delivered earlier — confirm that's actually deployed if
      // churchName still comes back empty.
      const {
        entry,
        peopleAhead,
        estimatedWaitTime,
        transferCount,
        standbyCount,
      } = response.data;
      return {
        ...entry,
        peopleAhead,
        estimatedWaitTime,
        transferCount,
        standbyCount,
      };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to load ticket",
      );
    }
  },
);

export const leaveQueue = createAsyncThunk(
  "queue/leaveQueue",
  async (customerToken, { rejectWithValue }) => {
    try {
      // Backend route: POST /api/queues/entry/:customerToken/leave (not DELETE)
      await api.post(`/queues/entry/${customerToken}/leave`);
      return customerToken; // return token so the slice can update state
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to leave queue",
      );
    }
  },
);

export const rejoinQueue = createAsyncThunk(
  "queue/rejoinQueue",
  async (customerToken, { rejectWithValue }) => {
    try {
      const response = await api.post(`/queues/entry/${customerToken}/rejoin`);
      return response.data.entry;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to rejoin queue",
      );
    }
  },
);

// ============================================================
// Slice (unchanged)
// ============================================================

const initialState = {
  publicQueues: { data: [], status: "idle", error: null },
  publicQueue: { data: null, status: "idle", error: null },
  entry: { data: null, status: "idle", error: null },
  connection: { online: true, socketConnected: false },
};

const queueSlice = createSlice({
  name: "queue",
  initialState,
  reducers: {
    queueStatsUpdated(state, action) {
      if (state.publicQueue.data) {
        state.publicQueue.data = {
          ...state.publicQueue.data,
          ...action.payload,
        };
      }
    },
    entryStatusChanged(state, action) {
      if (state.entry.data) {
        state.entry.data = { ...state.entry.data, ...action.payload };
      }
    },
    entryPositionUpdated(state, action) {
      if (state.entry.data) {
        state.entry.data = { ...state.entry.data, ...action.payload };
      }
    },
    setConnectionStatus(state, action) {
      state.connection = { ...state.connection, ...action.payload };
    },
    resetEntry(state) {
      state.entry = { data: null, status: "idle", error: null };
    },
    resetQueueState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchPublicQueues
      .addCase(fetchPublicQueues.pending, (state) => {
        state.publicQueues.status = "loading";
        state.publicQueues.error = null;
      })
      .addCase(fetchPublicQueues.fulfilled, (state, action) => {
        state.publicQueues.status = "succeeded";
        state.publicQueues.data = action.payload;
      })
      .addCase(fetchPublicQueues.rejected, (state, action) => {
        state.publicQueues.status = "failed";
        state.publicQueues.error = action.payload || action.error.message;
      })
      // fetchPublicQueue
      .addCase(fetchPublicQueue.pending, (state) => {
        state.publicQueue.status = "loading";
        state.publicQueue.error = null;
      })
      .addCase(fetchPublicQueue.fulfilled, (state, action) => {
        state.publicQueue.status = "succeeded";
        state.publicQueue.data = action.payload;
      })
      .addCase(fetchPublicQueue.rejected, (state, action) => {
        state.publicQueue.status = "failed";
        state.publicQueue.error = action.payload || action.error.message;
      })
      // joinQueue
      .addCase(joinQueue.pending, (state) => {
        state.entry.status = "loading";
        state.entry.error = null;
      })
      .addCase(joinQueue.fulfilled, (state, action) => {
        state.entry.status = "succeeded";
        state.entry.data = action.payload;
      })
      .addCase(joinQueue.rejected, (state, action) => {
        state.entry.status = "failed";
        state.entry.error = action.payload || action.error.message;
      })
      // fetchQueueEntry
      .addCase(fetchQueueEntry.pending, (state) => {
        state.entry.status = "loading";
        state.entry.error = null;
      })
      .addCase(fetchQueueEntry.fulfilled, (state, action) => {
        state.entry.status = "succeeded";
        state.entry.data = action.payload;
      })
      .addCase(fetchQueueEntry.rejected, (state, action) => {
        state.entry.status = "failed";
        state.entry.error = action.payload || action.error.message;
      })
      // leaveQueue
      .addCase(leaveQueue.pending, (state) => {
        state.entry.status = "leaving";
      })
      .addCase(leaveQueue.fulfilled, (state) => {
        state.entry.status = "left";
        if (state.entry.data) state.entry.data.status = "left";
      })
      .addCase(leaveQueue.rejected, (state, action) => {
        state.entry.status = "failed";
        state.entry.error = action.payload || action.error.message;
      })
      .addCase(rejoinQueue.fulfilled, (state, action) => {
        state.entry.status = "succeeded";
        state.entry.data = {
          ...state.entry.data,
          ...action.payload,
          status: "waiting",
        };
      })
      .addCase(rejoinQueue.rejected, (state, action) => {
        state.entry.status = "failed";
        state.entry.error = action.payload || action.error.message;
      });
  },
});

export const {
  queueStatsUpdated,
  entryStatusChanged,
  entryPositionUpdated,
  setConnectionStatus,
  resetEntry,
  resetQueueState,
} = queueSlice.actions;

export default queueSlice.reducer;

// ============================================================
// Selectors (unchanged)
// ============================================================

export const selectPublicQueues = (state) => state.queue.publicQueues;
export const selectPublicQueue = (state) => state.queue.publicQueue;
export const selectQueueEntry = (state) => state.queue.entry;
export const selectConnection = (state) => state.queue.connection;
