// app/(dashboard)/users/data-table.tsx
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/datatable-pagination";
import { Plus, Download, Filter, UserX, UserCheck } from "lucide-react";
import AddEditViewUsers from "./AddEditViewUsers";
import { toast } from "sonner";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onAddUser?: (data: any) => Promise<any>;
  onUpdateUser?: (data: any) => Promise<any>;
  onExport?: () => void;
  onDeactivateUser?: (data: any) => Promise<any>;
  onActivateUser?: (data: any) => Promise<any>;
  onBulkDeactivate?: (userIds: string[]) => Promise<any>;
  onBulkActivate?: (userIds: string[]) => Promise<any>;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onAddUser,
  onUpdateUser,
  onExport,
  onDeactivateUser,
  onActivateUser,
  onBulkDeactivate,
  onBulkActivate,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit" | "view">("add");
  const [selectedUser, setSelectedUser] = React.useState<any>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Bulk action state
  const [isBulkDeactivateDialogOpen, setIsBulkDeactivateDialogOpen] =
    React.useState(false);
  const [isBulkActivateDialogOpen, setIsBulkActivateDialogOpen] =
    React.useState(false);
  const [isBulkDeactivating, setIsBulkDeactivating] = React.useState(false);
  const [isBulkActivating, setIsBulkActivating] = React.useState(false);

  // Single user action state
  const [deactivateDialogOpen, setDeactivateDialogOpen] = React.useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = React.useState(false);
  const [userToDeactivate, setUserToDeactivate] = React.useState<any>(null);
  const [userToActivate, setUserToActivate] = React.useState<any>(null);

  const handleOpenDialog = React.useCallback(
    (mode: "add" | "edit" | "view", record?: any) => {
      setMode(mode);
      setSelectedUser(record || null);
      setIsDialogOpen(true);
    },
    [],
  );

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedUser(null);
    setIsSubmitting(false);
  };

  // Single user handlers
  const handleDeactivateUser = (user: any) => {
    setUserToDeactivate(user);
    setDeactivateDialogOpen(true);
  };

  const handleActivateUser = (user: any) => {
    setUserToActivate(user);
    setActivateDialogOpen(true);
  };

  const confirmDeactivateUser = async () => {
    if (!userToDeactivate) return;
    setIsSubmitting(true);
    try {
      if (onDeactivateUser) {
        await onDeactivateUser({
          id: userToDeactivate.id,
          data: { isActive: false },
        });
        toast.success(`${userToDeactivate.name} has been deactivated`);
      }
      setDeactivateDialogOpen(false);
      setUserToDeactivate(null);
    } catch (error: any) {
      toast.error(error?.message || "Failed to deactivate user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmActivateUser = async () => {
    if (!userToActivate) return;
    setIsSubmitting(true);
    try {
      if (onActivateUser) {
        await onActivateUser({
          id: userToActivate.id,
          data: { isActive: true },
        });
        toast.success(`${userToActivate.name} has been activated`);
      }
      setActivateDialogOpen(false);
      setUserToActivate(null);
    } catch (error: any) {
      toast.error(error?.message || "Failed to activate user");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk handlers
  const handleBulkDeactivate = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const activeUsers = selectedRows.filter(
      (row) => (row.original as any).isActive,
    );
    if (activeUsers.length === 0) {
      toast.error("No active users selected to deactivate");
      return;
    }
    setIsBulkDeactivateDialogOpen(true);
  };

  const handleBulkActivate = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const inactiveUsers = selectedRows.filter(
      (row) => !(row.original as any).isActive,
    );
    if (inactiveUsers.length === 0) {
      toast.error("No inactive users selected to activate");
      return;
    }
    setIsBulkActivateDialogOpen(true);
  };

  const confirmBulkDeactivate = async () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const userIds = selectedRows.map((row) => (row.original as any).id);
    setIsBulkDeactivating(true);
    try {
      if (onBulkDeactivate) {
        await onBulkDeactivate(userIds);
        toast.success(`${userIds.length} users deactivated successfully`);
        setRowSelection({});
      }
      setIsBulkDeactivateDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to deactivate users");
    } finally {
      setIsBulkDeactivating(false);
    }
  };

  const confirmBulkActivate = async () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const userIds = selectedRows.map((row) => (row.original as any).id);
    setIsBulkActivating(true);
    try {
      if (onBulkActivate) {
        await onBulkActivate(userIds);
        toast.success(`${userIds.length} users activated successfully`);
        setRowSelection({});
      }
      setIsBulkActivateDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to activate users");
    } finally {
      setIsBulkActivating(false);
    }
  };

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    meta: { handleOpenDialog, handleDeactivateUser, handleActivateUser },
  });

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (mode === "add") {
        if (onAddUser) {
          await onAddUser(data);
        } else {
          throw new Error("User creation handler not available");
        }
      } else if (mode === "edit") {
        if (onUpdateUser) {
          await onUpdateUser({ id: selectedUser?.id, ...data });
        } else {
          throw new Error("User update handler not available");
        }
      }
      handleCloseDialog();
    } catch (error: any) {
      toast.error(
        error?.message ||
          `Failed to ${mode === "add" ? "create" : "update"} user`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = Object.keys(rowSelection).length;
  const selectedRows = table.getSelectedRowModel().rows;
  const hasActiveSelected = selectedRows.some(
    (row) => (row.original as any).isActive,
  );
  const hasInactiveSelected = selectedRows.some(
    (row) => !(row.original as any).isActive,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <Input
            placeholder="Filter by name or email..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) => {
              table.getColumn("name")?.setFilterValue(event.target.value);
              table.getColumn("email")?.setFilterValue(event.target.value);
            }}
            className="max-w-sm"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => handleOpenDialog("add")}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="bg-muted/50 p-2 rounded-md flex items-center justify-between">
          <span className="text-sm">
            {selectedCount} user{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            {hasActiveSelected && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDeactivate}
                className="gap-2"
              >
                <UserX className="h-4 w-4" />
                Deactivate Selected
              </Button>
            )}
            {hasInactiveSelected && (
              <Button
                variant="default"
                size="sm"
                onClick={handleBulkActivate}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <UserCheck className="h-4 w-4" />
                Activate Selected
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRowSelection({})}
            >
              Clear selection
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No users found. Click "Add User" to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />

      {/* Add/Edit/View Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === "add"
                ? "Add New User"
                : mode === "edit"
                  ? "Edit User"
                  : "User Details"}
            </DialogTitle>
          </DialogHeader>
          <AddEditViewUsers
            record={selectedUser}
            mode={mode}
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Single User Deactivation Dialog */}
      <Dialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate {userToDeactivate?.name}? This
              user will no longer be able to log in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeactivateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeactivateUser}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deactivating..." : "Yes, Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single User Activation Dialog */}
      <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate User</DialogTitle>
            <DialogDescription>
              Are you sure you want to activate {userToActivate?.name}? They
              will be able to log in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActivateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={confirmActivateUser}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "Activating..." : "Yes, Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Deactivation Dialog */}
      <Dialog
        open={isBulkDeactivateDialogOpen}
        onOpenChange={setIsBulkDeactivateDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Deactivate Users</DialogTitle>
            <DialogDescription>
              You are about to deactivate{" "}
              {
                table
                  .getSelectedRowModel()
                  .rows.filter((row) => (row.original as any).isActive).length
              }{" "}
              active user(s). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkDeactivateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBulkDeactivate}
              disabled={isBulkDeactivating}
            >
              {isBulkDeactivating ? "Deactivating..." : "Yes, Deactivate All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Activation Dialog */}
      <Dialog
        open={isBulkActivateDialogOpen}
        onOpenChange={setIsBulkActivateDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Activate Users</DialogTitle>
            <DialogDescription>
              You are about to activate{" "}
              {
                table
                  .getSelectedRowModel()
                  .rows.filter((row) => !(row.original as any).isActive).length
              }{" "}
              inactive user(s).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkActivateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={confirmBulkActivate}
              disabled={isBulkActivating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isBulkActivating ? "Activating..." : "Yes, Activate All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
