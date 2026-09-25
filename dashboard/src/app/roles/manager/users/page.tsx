// app/(dashboard)/users/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import type { AppDispatch } from "@/store/store";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Lock, ShieldCheck } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchAllUsers,
  createUser,
  updateUser,
  bulkDeactivateUsers,
  bulkActivateUsers,
} from "@/lib/UserSlice";
import { LockedAccountsManager } from "./LockedAccountsManager";
import { NotificationBell } from "@/components/ui/notification-bell";
import * as XLSX from "xlsx";

function ManagerUsersPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { users, isLoading, error } = useSelector(
    (state: RootState) => state.users,
  );
  const [activeTab, setActiveTab] = useState("users");

  useEffect(() => {
    if (activeTab === "users") {
      dispatch(fetchAllUsers());
    }
  }, [dispatch, activeTab]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleAddUser = async (data: any) => {
    try {
      const result = await dispatch(createUser(data)).unwrap();
      toast.success(
        `User created! Temporary password: ${result.temporaryPassword}`,
      );
      await dispatch(fetchAllUsers());
      return result;
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
      throw error;
    }
  };

  const handleUpdateUser = async (data: any) => {
    const { id, ...updateData } = data;
    const result = await dispatch(
      updateUser({ id, data: updateData }),
    ).unwrap();
    await dispatch(fetchAllUsers());
    return result;
  };

  const handleDeactivateUser = async (data: any) => {
    const { id, ...updateData } = data;
    const result = await dispatch(
      updateUser({ id, data: { ...updateData, isActive: false } }),
    ).unwrap();
    await dispatch(fetchAllUsers());
    return result;
  };

  const handleActivateUser = async (data: any) => {
    const { id, ...updateData } = data;
    const result = await dispatch(
      updateUser({ id, data: { ...updateData, isActive: true } }),
    ).unwrap();
    await dispatch(fetchAllUsers());
    return result;
  };

  const handleBulkDeactivate = async (userIds: string[]) => {
    const result = await dispatch(bulkDeactivateUsers(userIds)).unwrap();
    await dispatch(fetchAllUsers());
    return result;
  };

  const handleBulkActivate = async (userIds: string[]) => {
    const result = await dispatch(bulkActivateUsers(userIds)).unwrap();
    await dispatch(fetchAllUsers());
    return result;
  };

  const handleExportToExcel = useCallback(() => {
    if (!users?.length) {
      toast.error("No data to export");
      return;
    }

    const exportData = users.map((user) => ({
      "Full Name": user.name,
      Email: user.email || "",
      Phone: user.phone || "",
      Role: typeof user.role === "string" ? user.role : user.role?.name || "",
      Status: user.isActive ? "Active" : "Inactive",
      "Created At": user.createdAt
        ? new Date(user.createdAt).toLocaleDateString()
        : "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(
      wb,
      `users_export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
    toast.success("Export completed");
  }, [users]);

  if (activeTab === "users" && isLoading && !users?.length) {
    return (
      <div className="container mx-auto py-10 p-5">
        <div className="flex items-center gap-3 mb-8">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Users</h1>
            <p className="text-sm text-muted-foreground">Loading users...</p>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-[40px] w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 p-5">
      <div className="flex items-center gap-3 mb-8">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage system users, roles, and account security
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 px-4">
          <NotificationBell />
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            All Users
          </TabsTrigger>
          <TabsTrigger value="locked" className="gap-2">
            <Lock className="h-4 w-4" />
            Locked Accounts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <DataTable
            columns={columns}
            data={users || []}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onExport={handleExportToExcel}
            onDeactivateUser={handleDeactivateUser}
            onActivateUser={handleActivateUser}
            onBulkDeactivate={handleBulkDeactivate}
            onBulkActivate={handleBulkActivate}
          />
        </TabsContent>

        <TabsContent value="locked">
          <LockedAccountsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ManagerUsersPage;
