// app/(dashboard)/users/columns.tsx
"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, UserX, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { User } from "@/types/UserTypes";

const getRoleName = (role: string | { name: string } | undefined): string => {
  if (!role) return "N/A";
  if (typeof role === "string") return role;
  return role.name || "N/A";
};

const roleBadgeConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  "super-admin": { label: "Super Admin", variant: "destructive" },
  admin: { label: "Owner", variant: "default" },
  manager: { label: "Manager", variant: "secondary" },
  staff: { label: "Staff", variant: "outline" },
};

export const columns: ColumnDef<User>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "index",
    header: "#",
    cell: ({ row }) => row.index + 1,
    size: 50,
  },
  {
    id: "name",
    header: "Name",
    accessorFn: (row) => row.name || "N/A",
    cell: ({ row }) => (
      <div className="font-medium" title={row.original.name}>
        {row.original.name || "N/A"}
      </div>
    ),
  },
  {
    id: "role",
    header: "Role",
    accessorFn: (row) => getRoleName(row.role),
    cell: ({ row }) => {
      const roleName = getRoleName(row.original.role);
      const config = roleBadgeConfig[roleName] || {
        label:
          roleName !== "N/A"
            ? roleName.charAt(0).toUpperCase() + roleName.slice(1)
            : "N/A",
        variant: "secondary",
      };
      return <Badge variant={config.variant}>{config.label}</Badge>;
    },
  },
  {
    id: "email",
    header: "Email",
    accessorFn: (row) => row.email || "N/A",
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate" title={row.original.email}>
        {row.original.email || "N/A"}
      </div>
    ),
  },

  {
    id: "status",
    header: "Status",
    accessorFn: (row) => (row.isActive ? "Active" : "Inactive"),
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "destructive"}>
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row, table }) => {
      const user = row.original;
      const meta = table.options.meta as any;
      const handleOpenDialog = meta?.handleOpenDialog;
      const handleDeactivateUser = meta?.handleDeactivateUser;
      const handleActivateUser = meta?.handleActivateUser;

      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenDialog("view", user)}
            title="View User"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenDialog("edit", user)}
            title="Edit User"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {user.isActive ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeactivateUser(user)}
              title="Deactivate User"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <UserX className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleActivateUser(user)}
              title="Activate User"
              className="text-green-600 hover:text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-950"
            >
              <UserCheck className="h-4 w-4" />
            </Button>
          )}
        </div>
      );
    },
  },
];
