import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import api from "../utils/axiosInstance";
import type {
  AuthQueueState,
  AssignStaffPayload,
  AssignStaffResponse,
  ChurchStaffMember,
  CallNextResponse,
  CompleteCustomerResponse,
  CreateQueuePayload,
  CreateQueueResponse,
  DeleteQueueResponse,
  GetChurchStaffResponse,
  GetQueueResponse,
  GetQueuesResponse,
  GetWaitingCustomersResponse,
  HoldCustomerResponse,
  Queue,
  QueueEntry,
  QueueEntryActionPayload,
  RemoveStaffPayload,
  RemoveStaffResponse,
  RejoinCustomerResponse,
  RootStateWithAuthQueue,
  SkipCustomerResponse,
  StaffAssignment,
  StartServingResponse,
  TransferCustomerPayload,
  TransferCustomerResponse,
  UpdateQueuePayload,
  UpdateQueueResponse,
} from "../types/QueueTypes";

// ============================================================
// Helpers
// ============================================================

function extractErrorMessage(err: unknown, fallback: string): string {
  const anyErr = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return anyErr.response?.data?.message || anyErr.message || fallback;
}

/**
 * Merge a staff assignment into a queue's staffAssignments array,
 * replacing any existing entry for the same user.
 */
function upsertAssignment(
  assignments: StaffAssignment[] | undefined,
  assignment: StaffAssignment,
): StaffAssignment[] {
  const current = assignments || [];
  const idx = current.findIndex((s) => s.userId === assignment.userId);
  if (idx !== -1) {
    return current.map((s, i) => (i === idx ? assignment : s));
  }
  return [...current, assignment];
}

/**
 * Patch a single queue (by id) inside a queue list with an updater fn,
 * leaving every other queue untouched.
 */
function patchQueueById(
  list: Queue[],
  queueId: string,
  update: (q: Queue) => Queue,
): Queue[] {
  return list.map((q) => (q.id === queueId ? update(q) : q));
}

// ============================================================
// Thunks
// ============================================================

export const createQueue = createAsyncThunk<
  Queue,
  CreateQueuePayload,
  { rejectValue: string }
>("authQueue/createQueue", async (payload, { rejectWithValue }) => {
  try {
    // Backend route: POST /api/queues
    const response = await api.post<CreateQueueResponse>("/queues", payload);
    return response.data.queue;
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to create queue"));
  }
});

export const fetchQueues = createAsyncThunk<
  Queue[],
  void,
  { rejectValue: string }
>("authQueue/fetchQueues", async (_, { rejectWithValue }) => {
  try {
    // Backend route: GET /api/queues — all queues for the current church
    const response = await api.get<GetQueuesResponse>("/queues");
    return response.data.queues;
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to load queues"));
  }
});

export const fetchQueue = createAsyncThunk<
  Queue,
  string,
  { rejectValue: string }
>("authQueue/fetchQueue", async (queueId, { rejectWithValue }) => {
  try {
    // Backend route: GET /api/queues/:queueId
    const response = await api.get<GetQueueResponse>(`/queues/${queueId}`);
    return { ...response.data.queue, stats: response.data.stats };
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to load queue"));
  }
});

export const updateQueue = createAsyncThunk<
  Queue,
  UpdateQueuePayload,
  { rejectValue: string }
>("authQueue/updateQueue", async ({ queueId, data }, { rejectWithValue }) => {
  try {
    // Backend route: PATCH /api/queues/:queueId
    const response = await api.patch<UpdateQueueResponse>(
      `/queues/${queueId}`,
      data,
    );
    return response.data.queue;
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to update queue"));
  }
});

export const deleteQueue = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("authQueue/deleteQueue", async (queueId, { rejectWithValue }) => {
  try {
    // Backend route: DELETE /api/queues/:queueId
    await api.delete<DeleteQueueResponse>(`/queues/${queueId}`);
    return queueId;
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to delete queue"));
  }
});

/**
 * Convenience wrapper around updateQueue for the three status transitions —
 * same endpoint, but gives call sites a clear intent-revealing action
 * instead of building a `{ status: "..." }` payload inline everywhere.
 */
export const setQueueStatus = createAsyncThunk<
  Queue,
  { queueId: string; status: "open" | "paused" | "closed" },
  { rejectValue: string }
>(
  "authQueue/setQueueStatus",
  async ({ queueId, status }, { rejectWithValue }) => {
    try {
      // Backend route: PATCH /api/queues/:queueId
      const response = await api.patch<UpdateQueueResponse>(
        `/queues/${queueId}`,
        { status },
      );
      return response.data.queue;
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, `Failed to set queue status to ${status}`),
      );
    }
  },
);

/**
 * Church staff directory, used to populate the "assign staff" picker.
 * ASSUMPTION: endpoint not present in the provided backend files —
 * adjust the path below to match your real staff-listing route.
 */
export const fetchChurchStaff = createAsyncThunk<
  ChurchStaffMember[],
  void,
  { rejectValue: string }
>("authQueue/fetchChurchStaff", async (_, { rejectWithValue }) => {
  try {
    // Load the church directory and keep only queue-eligible roles.
    const response = await api.get<GetChurchStaffResponse>("/users/get-users");
    return response.data.users
      .filter((user: any) =>
        ["manager", "staff"].includes(user.role?.name || user.role),
      )
      .map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        roleId: user.role?.id || user.roleId,
        roleName: user.role?.name || user.role,
      }));
  } catch (err) {
    return rejectWithValue(
      extractErrorMessage(err, "Failed to load staff directory"),
    );
  }
});

export const fetchWaitingCustomers = createAsyncThunk<
  { customers: QueueEntry[]; totalCount: number; hasMore: boolean },
  string,
  { rejectValue: string }
>("authQueue/fetchWaitingCustomers", async (queueId, { rejectWithValue }) => {
  try {
    // Backend route: GET /api/queues/:queueId/customers
    const response = await api.get<GetWaitingCustomersResponse>(
      `/queues/${queueId}/customers`,
    );
    return {
      customers: response.data.customers,
      totalCount: response.data.count,
      hasMore: response.data.hasMore ?? false,
    };
  } catch (err) {
    return rejectWithValue(
      extractErrorMessage(err, "Failed to load waiting customers"),
    );
  }
});

export const callNextCustomer = createAsyncThunk<
  QueueEntry & { staffId: string; completedEntryId?: string | null },
  string,
  { rejectValue: string }
>("authQueue/callNextCustomer", async (queueId, { rejectWithValue }) => {
  try {
    // Backend route: POST /api/queues/:queueId/call-next
    const response = await api.post<CallNextResponse>(
      `/queues/${queueId}/call-next`,
    );
    return {
      ...response.data.entry,
      completedEntryId: response.data.completedEntryId,
      service: response.data.service,
    };
  } catch (err) {
    return rejectWithValue(
      extractErrorMessage(err, "Failed to call next customer"),
    );
  }
});

export const callQueueRange = createAsyncThunk<
  QueueEntry & { staffId: string; completedEntryId?: string | null },
  { queueId: string; range: string },
  { rejectValue: string }
>(
  "authQueue/callQueueRange",
  async ({ queueId, range }, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.post<CallNextResponse>(
        `/queues/${queueId}/call-next`,
        { range },
      );
      void dispatch(fetchWaitingCustomers(queueId));
      return {
        ...response.data.entry,
        completedEntryId: response.data.completedEntryId,
        service: response.data.service,
      };
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, "Failed to call the ticket range"),
      );
    }
  },
);

export const startServingEntry = createAsyncThunk<
  QueueEntry,
  QueueEntryActionPayload,
  { rejectValue: string }
>(
  "authQueue/startServingEntry",
  async ({ queueId, entryId }, { rejectWithValue }) => {
    try {
      // Backend route: PATCH /api/queues/:queueId/entries/:entryId/serve
      const response = await api.patch<StartServingResponse>(
        `/queues/${queueId}/entries/${entryId}/serve`,
      );
      return response.data.entry;
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, "Failed to start serving customer"),
      );
    }
  },
);

export const completeEntry = createAsyncThunk<
  QueueEntry,
  QueueEntryActionPayload,
  { rejectValue: string }
>(
  "authQueue/completeEntry",
  async ({ queueId, entryId }, { rejectWithValue }) => {
    try {
      // Backend route: PATCH /api/queues/:queueId/entries/:entryId/complete
      const response = await api.patch<CompleteCustomerResponse>(
        `/queues/${queueId}/entries/${entryId}/complete`,
      );
      return response.data.entry;
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, "Failed to complete customer"),
      );
    }
  },
);

export const skipEntry = createAsyncThunk<
  QueueEntry,
  QueueEntryActionPayload,
  { rejectValue: string }
>("authQueue/skipEntry", async ({ queueId, entryId }, { rejectWithValue }) => {
  try {
    // Backend route: PATCH /api/queues/:queueId/entries/:entryId/skip
    const response = await api.patch<SkipCustomerResponse>(
      `/queues/${queueId}/entries/${entryId}/skip`,
    );
    return response.data.entry;
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to skip customer"));
  }
});

export const rejoinEntry = createAsyncThunk<
  QueueEntry,
  string,
  { rejectValue: string }
>("authQueue/rejoinEntry", async (customerToken, { rejectWithValue }) => {
  try {
    const response = await api.post<RejoinCustomerResponse>(
      `/queues/entry/${customerToken}/rejoin`,
    );
    return response.data.entry;
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to rejoin queue"));
  }
});

export const holdEntry = createAsyncThunk<
  QueueEntry,
  QueueEntryActionPayload,
  { rejectValue: string }
>("authQueue/holdEntry", async ({ queueId, entryId }, { rejectWithValue }) => {
  try {
    const response = await api.patch<HoldCustomerResponse>(
      `/queues/${queueId}/entries/${entryId}/hold`,
    );
    return response.data.entry;
  } catch (err) {
    return rejectWithValue(
      extractErrorMessage(err, "Failed to update standby status"),
    );
  }
});

export const callSpecificEntry = createAsyncThunk<
  QueueEntry & { staffId: string; completedEntryId?: string | null },
  QueueEntryActionPayload,
  { rejectValue: string }
>(
  "authQueue/callSpecificEntry",
  async ({ queueId, entryId }, { rejectWithValue }) => {
    try {
      const response = await api.post<CallNextResponse>(
        `/queues/${queueId}/call-next`,
        { entryId },
      );
      return {
        ...response.data.entry,
        completedEntryId: response.data.completedEntryId,
        service: response.data.service,
      };
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, "Failed to call customer"),
      );
    }
  },
);

export const transferEntry = createAsyncThunk<
  QueueEntry,
  TransferCustomerPayload,
  { rejectValue: string }
>(
  "authQueue/transferEntry",
  async ({ queueId, entryId, targetQueueId }, { rejectWithValue }) => {
    try {
      const response = await api.patch<TransferCustomerResponse>(
        `/queues/${queueId}/entries/${entryId}/transfer`,
        { targetQueueId },
      );
      return response.data.entry;
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, "Failed to transfer customer"),
      );
    }
  },
);

export const assignStaffToQueue = createAsyncThunk<
  StaffAssignment,
  AssignStaffPayload,
  { rejectValue: string }
>(
  "authQueue/assignStaffToQueue",
  async ({ queueId, userId }, { rejectWithValue }) => {
    try {
      // Backend route: POST /api/queues/:queueId/staff
      const response = await api.post<AssignStaffResponse>(
        `/queues/${queueId}/staff`,
        { userId },
      );
      return response.data.assignment;
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, "Failed to assign staff member"),
      );
    }
  },
);

export const removeStaffFromQueue = createAsyncThunk<
  RemoveStaffPayload,
  RemoveStaffPayload,
  { rejectValue: string }
>(
  "authQueue/removeStaffFromQueue",
  async ({ queueId, userId }, { rejectWithValue }) => {
    try {
      // Backend route: DELETE /api/queues/:queueId/staff/:userId
      await api.delete<RemoveStaffResponse>(
        `/queues/${queueId}/staff/${userId}`,
      );
      return { queueId, userId };
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, "Failed to remove staff member"),
      );
    }
  },
);

// ============================================================
// Slice
// ============================================================

const initialState: AuthQueueState = {
  queues: { data: [], status: "idle", error: null },
  currentQueue: { data: null, status: "idle", error: null },
  waitingCustomers: { data: [], status: "idle", error: null },
  waitingCustomersTotalCount: 0,
  waitingCustomersHasMore: false,
  currentCall: null,
  churchStaff: { data: [], status: "idle", error: null },
  connection: { online: true, socketConnected: false },
};

/** Update a queue by id in the `queues.data` list, if present. */
function patchQueueInList(list: Queue[], updated: Queue): Queue[] {
  return list.map((q) => (q.id === updated.id ? { ...q, ...updated } : q));
}

const authQueueSlice = createSlice({
  name: "authQueue",
  initialState,
  reducers: {
    // ---- socket-driven real-time updates ----
    queueCreatedRealtime(state, action: PayloadAction<Queue>) {
      const exists = state.queues.data.some((q) => q.id === action.payload.id);
      if (!exists) state.queues.data.unshift(action.payload);
    },
    queueUpdatedRealtime(state, action: PayloadAction<Queue>) {
      state.queues.data = patchQueueInList(state.queues.data, action.payload);
      if (state.currentQueue.data?.id === action.payload.id) {
        state.currentQueue.data = {
          ...state.currentQueue.data,
          ...action.payload,
        };
      }
    },
    queueDeletedRealtime(state, action: PayloadAction<{ queueId: string }>) {
      state.queues.data = state.queues.data.filter(
        (q) => q.id !== action.payload.queueId,
      );
      if (state.currentQueue.data?.id === action.payload.queueId) {
        state.currentQueue.data = null;
      }
    },
    customerCalledRealtime(state, action: PayloadAction<QueueEntry>) {
      const idx = state.waitingCustomers.data.findIndex(
        (e) => e.id === action.payload.id,
      );
      if (idx !== -1) {
        state.waitingCustomers.data[idx] = {
          ...state.waitingCustomers.data[idx],
          ...action.payload,
        };
      }
    },
    customerServingRealtime(state, action: PayloadAction<QueueEntry>) {
      const idx = state.waitingCustomers.data.findIndex(
        (e) => e.id === action.payload.id,
      );
      if (idx !== -1) {
        state.waitingCustomers.data[idx] = {
          ...state.waitingCustomers.data[idx],
          ...action.payload,
        };
      }
    },
    customerCompletedRealtime(state, action: PayloadAction<{ id: string }>) {
      state.waitingCustomers.data = state.waitingCustomers.data.filter(
        (e) => e.id !== action.payload.id,
      );
    },
    customerSkippedRealtime(state, action: PayloadAction<{ id: string }>) {
      const entry = state.waitingCustomers.data.find(
        (e) => e.id === action.payload.id,
      );
      if (entry) entry.status = "skipped";
    },
    customerRejoinedRealtime(state, action: PayloadAction<QueueEntry>) {
      const idx = state.waitingCustomers.data.findIndex(
        (e) => e.id === action.payload.id,
      );
      if (idx === -1) state.waitingCustomers.data.push(action.payload);
      else state.waitingCustomers.data[idx] = action.payload;
    },
    // New customer joins the queue currently being watched (Live Queue tab
    // open) — appended so the board reflects it without a refetch.
    customerJoinedRealtime(state, action: PayloadAction<QueueEntry>) {
      const exists = state.waitingCustomers.data.some(
        (e) => e.id === action.payload.id,
      );
      if (!exists) state.waitingCustomers.data.push(action.payload);
      const q = state.queues.data.find((q) => q.id === action.payload.queueId);
      if (q?.stats) q.stats.waiting = (q.stats.waiting || 0) + 1;
    },
    // Customer left voluntarily (not completed/skipped) — drop from the
    // waiting list and decrement the card's live "waiting" count.
    customerLeftRealtime(
      state,
      action: PayloadAction<{ id: string; queueId: string }>,
    ) {
      state.waitingCustomers.data = state.waitingCustomers.data.filter(
        (e) => e.id !== action.payload.id,
      );
      const q = state.queues.data.find((q) => q.id === action.payload.queueId);
      if (q?.stats) q.stats.waiting = Math.max(0, (q.stats.waiting || 0) - 1);
    },
    staffAssignedRealtime(state, action: PayloadAction<StaffAssignment>) {
      const assignment = action.payload;
      // Keep the socket-relayed assignment in sync with the staff
      // directory too, in case the payload doesn't carry `user`.
      if (!assignment.user) {
        const directoryUser = state.churchStaff.data.find(
          (u) => u.id === assignment.userId,
        );
        if (directoryUser) {
          assignment.user = {
            id: directoryUser.id,
            name: directoryUser.name,
            email: directoryUser.email,
          };
        }
      }

      state.queues.data = patchQueueById(
        state.queues.data,
        assignment.queueId,
        (q) => ({
          ...q,
          staffAssignments: upsertAssignment(q.staffAssignments, assignment),
        }),
      );

      if (
        state.currentQueue.data &&
        state.currentQueue.data.id === assignment.queueId
      ) {
        state.currentQueue.data.staffAssignments = upsertAssignment(
          state.currentQueue.data.staffAssignments,
          assignment,
        );
      }
    },
    staffRemovedRealtime(
      state,
      action: PayloadAction<{ queueId: string; userId: string }>,
    ) {
      const { queueId, userId } = action.payload;

      state.queues.data = patchQueueById(state.queues.data, queueId, (q) => ({
        ...q,
        staffAssignments: (q.staffAssignments || []).filter(
          (s) => s.userId !== userId,
        ),
      }));

      if (
        state.currentQueue.data &&
        state.currentQueue.data.id === queueId &&
        state.currentQueue.data.staffAssignments
      ) {
        state.currentQueue.data.staffAssignments =
          state.currentQueue.data.staffAssignments.filter(
            (s) => s.userId !== userId,
          );
      }
    },
    setAuthConnectionStatus(
      state,
      action: PayloadAction<Partial<AuthQueueState["connection"]>>,
    ) {
      state.connection = { ...state.connection, ...action.payload };
    },
    resetCurrentQueue(state) {
      state.currentQueue = { data: null, status: "idle", error: null };
    },
    setCurrentCall(state, action: PayloadAction<QueueEntry | null>) {
      state.currentCall = action.payload;
    },
    clearCurrentCall(state) {
      state.currentCall = null;
    },
    resetAuthQueueState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // createQueue
      .addCase(createQueue.pending, (state) => {
        state.queues.status = "loading";
        state.queues.error = null;
      })
      .addCase(createQueue.fulfilled, (state, action) => {
        state.queues.status = "succeeded";
        state.queues.data.unshift(action.payload);
      })
      .addCase(createQueue.rejected, (state, action) => {
        state.queues.status = "failed";
        state.queues.error = action.payload || action.error.message || null;
      })

      // fetchQueues
      .addCase(fetchQueues.pending, (state) => {
        state.queues.status = "loading";
        state.queues.error = null;
      })
      .addCase(fetchQueues.fulfilled, (state, action) => {
        state.queues.status = "succeeded";
        state.queues.data = action.payload;
      })
      .addCase(fetchQueues.rejected, (state, action) => {
        state.queues.status = "failed";
        state.queues.error = action.payload || action.error.message || null;
      })

      // fetchQueue
      .addCase(fetchQueue.pending, (state) => {
        state.currentQueue.status = "loading";
        state.currentQueue.error = null;
      })
      .addCase(fetchQueue.fulfilled, (state, action) => {
        state.currentQueue.status = "succeeded";
        state.currentQueue.data = action.payload;
      })
      .addCase(fetchQueue.rejected, (state, action) => {
        state.currentQueue.status = "failed";
        state.currentQueue.error =
          action.payload || action.error.message || null;
      })

      // updateQueue
      .addCase(updateQueue.pending, (state) => {
        state.currentQueue.status = "loading";
        state.currentQueue.error = null;
      })
      .addCase(updateQueue.fulfilled, (state, action) => {
        state.currentQueue.status = "succeeded";
        state.currentQueue.data = action.payload;
        state.queues.data = patchQueueInList(state.queues.data, action.payload);
      })
      .addCase(updateQueue.rejected, (state, action) => {
        state.currentQueue.status = "failed";
        state.currentQueue.error =
          action.payload || action.error.message || null;
      })

      // deleteQueue
      .addCase(deleteQueue.pending, (state) => {
        state.queues.status = "loading";
        state.queues.error = null;
      })
      .addCase(deleteQueue.fulfilled, (state, action) => {
        state.queues.status = "succeeded";
        state.queues.data = state.queues.data.filter(
          (q) => q.id !== action.payload,
        );
        if (state.currentQueue.data?.id === action.payload) {
          state.currentQueue.data = null;
        }
      })
      .addCase(deleteQueue.rejected, (state, action) => {
        state.queues.status = "failed";
        state.queues.error = action.payload || action.error.message || null;
      })

      // setQueueStatus (pause / resume / close)
      .addCase(setQueueStatus.fulfilled, (state, action) => {
        state.queues.data = patchQueueInList(state.queues.data, action.payload);
        if (state.currentQueue.data?.id === action.payload.id) {
          state.currentQueue.data = {
            ...state.currentQueue.data,
            ...action.payload,
          };
        }
      })
      .addCase(setQueueStatus.rejected, (state, action) => {
        state.queues.error = action.payload || action.error.message || null;
      })

      // fetchChurchStaff
      .addCase(fetchChurchStaff.pending, (state) => {
        state.churchStaff.status = "loading";
        state.churchStaff.error = null;
      })
      .addCase(fetchChurchStaff.fulfilled, (state, action) => {
        state.churchStaff.status = "succeeded";
        state.churchStaff.data = action.payload;
      })
      .addCase(fetchChurchStaff.rejected, (state, action) => {
        state.churchStaff.status = "failed";
        state.churchStaff.error =
          action.payload || action.error.message || null;
      })

      // fetchWaitingCustomers
      .addCase(fetchWaitingCustomers.pending, (state) => {
        state.waitingCustomers.status = "loading";
        state.waitingCustomers.error = null;
      })
      .addCase(fetchWaitingCustomers.fulfilled, (state, action) => {
        state.waitingCustomers.status = "succeeded";
        state.waitingCustomers.data = action.payload.customers;
        state.waitingCustomersTotalCount = action.payload.totalCount;
        state.waitingCustomersHasMore = action.payload.hasMore;
      })
      .addCase(fetchWaitingCustomers.rejected, (state, action) => {
        state.waitingCustomers.status = "failed";
        state.waitingCustomers.error =
          action.payload || action.error.message || null;
      })

      // callNextCustomer — remove the now-called entry from the waiting
      // list (getWaitingCustomers includes "called"/"serving" too, so a
      // refetch will bring it back with the right status; here we just
      // reflect the immediate state change).
      .addCase(callNextCustomer.pending, (state) => {
        state.waitingCustomers.error = null;
      })
      .addCase(callNextCustomer.fulfilled, (state, action) => {
        state.currentCall = action.payload;
        const completedEntryId = action.payload.completedEntryId;
        if (completedEntryId) {
          state.waitingCustomers.data = state.waitingCustomers.data.filter(
            (entry) => entry.id !== completedEntryId,
          );
        }
        const idx = state.waitingCustomers.data.findIndex(
          (e) => e.id === action.payload.id,
        );
        if (idx !== -1) {
          state.waitingCustomers.data[idx] = {
            ...state.waitingCustomers.data[idx],
            ...action.payload,
          };
        } else {
          state.waitingCustomers.data.push(action.payload);
        }
        if (state.currentQueue.data) {
          state.currentQueue.data.currentNumber = action.payload.queueNumber;
        }
      })
      .addCase(callNextCustomer.rejected, (state, action) => {
        state.waitingCustomers.error =
          action.payload || action.error.message || null;
      })

      .addCase(callQueueRange.fulfilled, (state, action) => {
        if (action.payload.service) state.currentCall = action.payload;
      })

      .addCase(callSpecificEntry.fulfilled, (state, action) => {
        state.currentCall = action.payload;
        const completedEntryId = action.payload.completedEntryId;
        if (completedEntryId) {
          state.waitingCustomers.data = state.waitingCustomers.data.filter(
            (entry) => entry.id !== completedEntryId,
          );
        }
        const idx = state.waitingCustomers.data.findIndex(
          (entry) => entry.id === action.payload.id,
        );
        if (idx !== -1) {
          state.waitingCustomers.data[idx] = {
            ...state.waitingCustomers.data[idx],
            ...action.payload,
          };
        }
      })

      .addCase(holdEntry.fulfilled, (state, action) => {
        const idx = state.waitingCustomers.data.findIndex(
          (entry) => entry.id === action.payload.id,
        );
        if (idx !== -1) {
          state.waitingCustomers.data[idx] = {
            ...state.waitingCustomers.data[idx],
            ...action.payload,
          };
        }
      })

      // startServingEntry
      .addCase(startServingEntry.fulfilled, (state, action) => {
        const idx = state.waitingCustomers.data.findIndex(
          (e) => e.id === action.payload.id,
        );
        if (idx !== -1) {
          state.waitingCustomers.data[idx] = {
            ...state.waitingCustomers.data[idx],
            ...action.payload,
          };
        }
      })
      .addCase(startServingEntry.rejected, (state, action) => {
        state.waitingCustomers.error =
          action.payload || action.error.message || null;
      })

      // completeEntry
      .addCase(completeEntry.fulfilled, (state, action) => {
        if (state.currentCall?.id === action.payload.id) {
          state.currentCall = null;
        }
        state.waitingCustomers.data = state.waitingCustomers.data.filter(
          (e) => e.id !== action.payload.id,
        );
      })
      .addCase(completeEntry.rejected, (state, action) => {
        state.waitingCustomers.error =
          action.payload || action.error.message || null;
      })

      // skipEntry
      .addCase(skipEntry.fulfilled, (state, action) => {
        const idx = state.waitingCustomers.data.findIndex(
          (e) => e.id === action.payload.id,
        );
        if (idx !== -1) state.waitingCustomers.data[idx] = action.payload;
      })

      .addCase(rejoinEntry.fulfilled, (state, action) => {
        const idx = state.waitingCustomers.data.findIndex(
          (e) => e.id === action.payload.id,
        );
        if (idx === -1) state.waitingCustomers.data.push(action.payload);
        else state.waitingCustomers.data[idx] = action.payload;
      })
      .addCase(rejoinEntry.rejected, (state, action) => {
        state.waitingCustomers.error =
          action.payload || action.error.message || null;
      })
      .addCase(skipEntry.rejected, (state, action) => {
        state.waitingCustomers.error =
          action.payload || action.error.message || null;
      })

      .addCase(transferEntry.fulfilled, (state, action) => {
        state.waitingCustomers.data = state.waitingCustomers.data.filter(
          (entry) => entry.id !== action.payload.id,
        );
      })
      .addCase(transferEntry.rejected, (state, action) => {
        state.waitingCustomers.error =
          action.payload || action.error.message || null;
      })

      // assignStaffToQueue
      // FIX: previously this only patched `currentQueue`, so the queue
      // list backing QueueCard's staff count never updated. It also now
      // hydrates `user` from the staff directory if the API response
      // doesn't include a populated user object, so the UI shows the
      // staff member's name instead of falling back to their raw id.
      .addCase(assignStaffToQueue.fulfilled, (state, action) => {
        const assignment = action.payload;

        if (!assignment.user) {
          const directoryUser = state.churchStaff.data.find(
            (u) => u.id === assignment.userId,
          );
          if (directoryUser) {
            assignment.user = {
              id: directoryUser.id,
              name: directoryUser.name,
              email: directoryUser.email,
            };
          }
        }

        state.queues.data = patchQueueById(
          state.queues.data,
          assignment.queueId,
          (q) => ({
            ...q,
            staffAssignments: upsertAssignment(q.staffAssignments, assignment),
          }),
        );

        if (
          state.currentQueue.data &&
          state.currentQueue.data.id === assignment.queueId
        ) {
          state.currentQueue.data.staffAssignments = upsertAssignment(
            state.currentQueue.data.staffAssignments,
            assignment,
          );
        }
      })
      .addCase(assignStaffToQueue.rejected, (state, action) => {
        state.currentQueue.error =
          action.payload || action.error.message || null;
      })

      // removeStaffFromQueue
      // FIX: same issue as above — now also drops the assignment from
      // `queues.data` so QueueCard's staff count updates immediately.
      .addCase(removeStaffFromQueue.fulfilled, (state, action) => {
        const { queueId, userId } = action.payload;

        state.queues.data = patchQueueById(state.queues.data, queueId, (q) => ({
          ...q,
          staffAssignments: (q.staffAssignments || []).filter(
            (s) => s.userId !== userId,
          ),
        }));

        if (
          state.currentQueue.data &&
          state.currentQueue.data.id === queueId &&
          state.currentQueue.data.staffAssignments
        ) {
          state.currentQueue.data.staffAssignments =
            state.currentQueue.data.staffAssignments.filter(
              (s) => s.userId !== userId,
            );
        }
      })
      .addCase(removeStaffFromQueue.rejected, (state, action) => {
        state.currentQueue.error =
          action.payload || action.error.message || null;
      });
  },
});

export const {
  queueCreatedRealtime,
  queueUpdatedRealtime,
  queueDeletedRealtime,
  customerCalledRealtime,
  customerServingRealtime,
  customerCompletedRealtime,
  customerSkippedRealtime,
  customerJoinedRealtime,
  customerRejoinedRealtime,
  customerLeftRealtime,
  staffAssignedRealtime,
  staffRemovedRealtime,
  setAuthConnectionStatus,
  resetCurrentQueue,
  setCurrentCall,
  clearCurrentCall,
  resetAuthQueueState,
} = authQueueSlice.actions;

export default authQueueSlice.reducer;

// ============================================================
// Selectors
// ============================================================

export const selectQueues = (state: RootStateWithAuthQueue) =>
  state.authQueue.queues;
export const selectCurrentQueue = (state: RootStateWithAuthQueue) =>
  state.authQueue.currentQueue;
export const selectWaitingCustomers = (state: RootStateWithAuthQueue) =>
  state.authQueue.waitingCustomers;
export const selectAuthConnection = (state: RootStateWithAuthQueue) =>
  state.authQueue.connection;
export const selectChurchStaff = (state: RootStateWithAuthQueue) =>
  state.authQueue.churchStaff;
