"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, User, Calendar, Clock, Globe, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AuditLog } from "@/types/AuditLogTypes";
import { format } from "date-fns";

const getActionConfig = (action: string) => {
  const a = action.toLowerCase();
  if (["create", "created", "assign", "approve"].some((v) => a.includes(v)))
    return { label: action, variant: "default" } as const;
  if (
    ["update", "updated", "submit", "passwordchange"].some((v) => a.includes(v))
  )
    return { label: action, variant: "secondary" } as const;
  if (["delete", "remove", "reject"].some((v) => a.includes(v)))
    return { label: action, variant: "destructive" } as const;
  return { label: action, variant: "outline" } as const;
};

export const columns = (
  handleView?: (record: AuditLog) => void,
): ColumnDef<AuditLog>[] => [
  {
    id: "index",
    header: "#",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">{row.index + 1}</span>
    ),
    size: 50,
  },
  {
    accessorKey: "user",
    header: "User",
    cell: ({ row }) => {
      const user = row.original.user;
      if (!user)
        return (
          <span className="text-muted-foreground text-sm italic">System</span>
        );
      return (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{user.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {user.email}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => {
      const action = row.getValue("action") as string;
      const config = getActionConfig(action);
      return (
        <Badge variant={config.variant} className="capitalize">
          {config.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "entity",
    header: "Path",
    cell: ({ row }) => {
      const entity = row.getValue("entity") as string;
      return (
        <div className="flex items-center gap-1.5">
          <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span
            className="text-sm font-mono truncate max-w-[200px]"
            title={entity}
          >
            {entity}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "metadata",
    header: "Details",
    cell: ({ row }) => {
      const metadata = row.original.metadata || {};
      const ip = metadata.ip || "N/A";
      const statusCode = metadata.statusCode;
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Globe className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[100px]" title={ip}>
              {ip}
            </span>
          </div>
          {statusCode && (
            <span
              className={`text-xs font-mono font-medium ${
                statusCode >= 200 && statusCode < 300
                  ? "text-green-600 dark:text-green-400"
                  : statusCode >= 400
                    ? "text-red-600 dark:text-red-400"
                    : "text-yellow-600 dark:text-yellow-400"
              }`}
            >
              HTTP {statusCode}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Timestamp",
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as string;
      return (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-xs">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span>{format(new Date(date), "dd/MM/yyyy")}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{format(new Date(date), "HH:mm:ss")}</span>
          </div>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleView?.(row.original)}
        title="View Details"
      >
        <Eye className="h-4 w-4" />
      </Button>
    ),
  },
];
