// hooks/usePermissions.ts
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";

export function usePermissions() {
  const user = useSelector((state: RootState) => state.auth.user);
  const role = user?.role ?? "staff";
  const userId = user?.id ?? "";

  const isOwnerOrAdmin = role === "admin" || role === "superadmin";
  const isManager = role === "manager";
  const isStaff = role === "staff";
  const canDeleteQueue = isOwnerOrAdmin;
  const canCreateQueue = isOwnerOrAdmin || isManager;
  const canEditQueue = isOwnerOrAdmin || isManager;
  const canManageStaff = isOwnerOrAdmin || isManager;
  const canAccessSettings = isOwnerOrAdmin || isManager;
  const canAccessStaffTab = isOwnerOrAdmin || isManager;

  // For a specific queue: staff can only act if they are assigned
  const canCallNextForQueue = (
    queueId: string,
    staffAssignments: any[] = [],
  ) => {
    if (isOwnerOrAdmin || isManager) return true;
    if (!isStaff) return false;
    return staffAssignments.some(
      (a) => a.userId === userId && a.status === "active",
    );
  };

  const isAssignedToQueue = (queueId: string, staffAssignments: any[] = []) => {
    return staffAssignments.some(
      (a) => a.userId === userId && a.status === "active",
    );
  };

  return {
    role,
    userId,
    isOwnerOrAdmin,
    isManager,
    isStaff,
    canDeleteQueue,
    canCreateQueue,
    canEditQueue,
    canManageStaff,
    canAccessSettings,
    canAccessStaffTab,
    canCallNextForQueue,
    isAssignedToQueue,
  };
}
