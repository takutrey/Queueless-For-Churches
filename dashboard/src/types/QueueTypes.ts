// src/features/queue/QueueTypes.ts

// ============================================================
// Enums / literal unions
// ============================================================

export type QueueStatus = "open" | "paused" | "closed";

export type QueueEntryStatus =
  | "waiting"
  | "standby"
  | "called"
  | "serving"
  | "completed"
  | "skipped"
  | "left";

export type StaffAssignmentStatus = "active" | "inactive";
export type QueueEntryType = "normal" | "transfer";

// ============================================================
// Core models
// ============================================================

export interface Church {
  id: string;
  name: string;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
}

/**
 * A staff member available to be assigned to a queue.
 * Sourced from the church's staff directory — NOT the same as
 * StaffAssignment, which is the join record between a queue and a user.
 */
export interface ChurchStaffMember {
  id: string;
  name: string;
  email: string;
  roleId?: string;
  roleName?: string;
}

export interface StaffAssignment {
  id?: string;
  queueId: string;
  userId: string;
  status: StaffAssignmentStatus;
  assignedAt: string;
  removedAt: string | null;
  user?: StaffUser;
}

export interface QueueEntry {
  id: string;
  churchId: string;
  queueId: string;
  queueName?: string;
  customerName: string;
  customerPhone: string | null;
  queueNumber: number;
  ticketNumber?: string;
  customerToken: string;
  status: QueueEntryStatus;
  entryType: QueueEntryType;
  calledBy?: string | null;
  joinedAt: string;
  calledAt?: string | null;
  servingAt?: string | null;
  completedAt?: string | null;
  skippedAt?: string | null;
  leftAt?: string | null;
}

/**
 * Shape returned by utils/queueHelpers -> getQueueStats().
 * The helper implementation wasn't provided alongside the controller,
 * so this is a best-guess shape based on how `stats` is consumed
 * (queue lists, single-queue view). Adjust field names to match the
 * real implementation if they differ.
 */
export interface QueueStats {
  waiting: number;
  standby: number;
  transfer: number;
  called: number;
  serving: number;
  completed: number;
  skipped: number;
  totalToday?: number;
}

export interface Queue {
  id: string;
  churchId: string;
  name: string;
  slug: string;
  joinCode: string;
  prefix: string;
  description: string | null;
  status: QueueStatus;
  currentNumber: number;
  nextNumber: number;
  estimatedServiceTime: number;
  maxCustomers: number | null;
  allowWalkIns: boolean;
  createdAt?: string;
  updatedAt?: string;

  church?: Church;
  entries?: QueueEntry[];
  staffAssignments?: StaffAssignment[];
  stats?: QueueStats;
}

// ============================================================
// Request payloads
//
// Only covers the authenticated (church/staff) endpoints —
// mirrors createQueue/getQueues/getQueue/updateQueue/deleteQueue,
// getWaitingCustomers, callNext/startServing/completeCustomer/
// skipCustomer, and assignStaff/removeStaff in queueController.js.
// The public customer-facing endpoints (public browse, join,
// entry status, leave) stay in the existing QueueSlice.js.
// ============================================================

export interface CreateQueuePayload {
  name: string;
  description?: string;
  prefix?: string;
  estimatedServiceTime?: number;
  maxCustomers?: number | null;
  allowWalkIns?: boolean;
}

export interface UpdateQueuePayload {
  queueId: string;
  data: Partial<{
    name: string;
    description: string | null;
    prefix: string;
    status: QueueStatus;
    estimatedServiceTime: number;
    maxCustomers: number | null;
    allowWalkIns: boolean;
  }>;
}

export interface QueueEntryActionPayload {
  queueId: string;
  entryId: string;
}

export interface TransferCustomerPayload extends QueueEntryActionPayload {
  targetQueueId: string;
}

export interface AssignStaffPayload {
  queueId: string;
  userId: string;
}

export interface RemoveStaffPayload {
  queueId: string;
  userId: string;
}

// ============================================================
// Response payloads
// ============================================================

export interface CreateQueueResponse {
  message: string;
  queue: Queue;
}

export interface GetQueuesResponse {
  count: number;
  queues: Queue[];
}

export interface GetQueueResponse {
  queue: Queue;
  stats: QueueStats;
}

export interface UpdateQueueResponse {
  message: string;
  queue: Queue;
}

export interface DeleteQueueResponse {
  message: string;
}

export interface GetWaitingCustomersResponse {
  count: number;
  customers: QueueEntry[];
}

export interface CallNextResponse {
  message: string;
  entry: QueueEntry & { staffId: string };
  completedEntryId?: string | null;
}

export interface StartServingResponse {
  message: string;
  entry: QueueEntry;
}

export interface CompleteCustomerResponse {
  message: string;
  entry: QueueEntry;
}

export interface SkipCustomerResponse {
  message: string;
  entry: QueueEntry;
}

export interface RejoinCustomerResponse {
  message: string;
  entry: QueueEntry;
}

export interface HoldCustomerResponse {
  message: string;
  entry: QueueEntry;
}

export interface TransferCustomerResponse {
  message: string;
  entry: QueueEntry & {
    sourceQueueId: string;
    sourceQueueName: string;
  };
}

export interface AssignStaffResponse {
  message: string;
  assignment: StaffAssignment;
}

export interface RemoveStaffResponse {
  message: string;
}

/**
 * ASSUMPTION: no endpoint for this was included in the provided files.
 * Wired to GET /api/users/get-users — update the route in QueueSlice.ts
 * if your actual church-staff-directory endpoint differs.
 */
export interface GetChurchStaffResponse {
  users: ChurchStaffMember[];
}

// ============================================================
// Async state
// ============================================================

export type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

export interface AsyncSlice<T> {
  data: T;
  status: RequestStatus;
  error: string | null;
}

export interface ConnectionState {
  online: boolean;
  socketConnected: boolean;
}

export interface AuthQueueState {
  queues: AsyncSlice<Queue[]>;
  currentQueue: AsyncSlice<Queue | null>;
  waitingCustomers: AsyncSlice<QueueEntry[]>;
  churchStaff: AsyncSlice<ChurchStaffMember[]>;
  connection: ConnectionState;
}

/**

 */
export interface RootStateWithAuthQueue {
  authQueue: AuthQueueState;
}
