export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entity: string; // now holds the route path
  entityId: string;
  metadata: {
    ip?: string;
    userAgent?: string;
    statusCode?: number;
    changes?: Record<string, any>;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

export interface AuditLogState {
  logs: AuditLog[];
  currentLog: AuditLog | null;
  isLoading: boolean;
  error: string | null;
  statistics: AuditStatistics | null;
  pagination: PaginationInfo;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface AuditStatistics {
  period: string;
  totalLogs: number;
  actionCounts: Array<{ action: string; count: number }>;
  entityCounts: Array<{ entity: string; count: number }>;
  dailyActivity: Array<{ date: string; count: number }>;
  mostActiveUsers: Array<{
    userId: string;
    user: string;
    email?: string;
    actionCount: number;
  }>;
}

export interface AuditSummary {
  totalLogs: number;
  uniqueUsers: number;
  actionBreakdown: Array<{ action: string; count: number }>;
  entityBreakdown: Array<{ entity: string; count: number }>;
}

export interface GetAllLogsParams {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  entity?: string; // now a free-text filter for the path
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

// ... other interfaces unchanged ...

// ─── Actions ──────────────────────────────────────────────
export const AUDIT_ACTIONS = [
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "church_signup",
  "unlock_account",
  "unlock_all_accounts",
  "password_change",
  "forgot_password_request",
  "password_reset",
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "ASSIGN",
  "REMOVE",
  "APPROVE",
  "REJECT",
  "SUBMIT",
  "EXPORT",
  "VIEW",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// ─── Entities ─────────────────────────────────────────────
// We no longer use a fixed list for the dropdown.
// Keep an empty array or a minimal set for reference.
export const AUDIT_ENTITIES: string[] = [];

export type AuditEntity = string;
