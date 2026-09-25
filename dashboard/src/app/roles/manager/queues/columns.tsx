"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { Queue } from "@/types/QueueTypes";

// Helper for status badge
const statusConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  open: { label: "Open", variant: "default" },
  paused: { label: "Paused", variant: "secondary" },
  closed: { label: "Closed", variant: "destructive" },
};

export const columns: ColumnDef<Queue>[] = [
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
    accessorFn: (row) => row.name,
    cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
  },
  {
    id: "status",
    header: "Status",
    accessorFn: (row) => row.status,
    cell: ({ row }) => {
      const status = row.original.status;
      const config = statusConfig[status] || {
        label: status,
        variant: "secondary",
      };
      return <Badge variant={config.variant}>{config.label}</Badge>;
    },
  },
  {
    id: "prefix",
    header: "Prefix",
    accessorFn: (row) => row.prefix || "—",
  },
  {
    id: "currentNumber",
    header: "Current",
    accessorFn: (row) => row.currentNumber,
    cell: ({ row }) => (
      <span className="font-mono">{row.original.currentNumber}</span>
    ),
  },
  {
    id: "estimatedServiceTime",
    header: "Est. Time (min)",
    accessorFn: (row) => row.estimatedServiceTime,
    cell: ({ row }) => <span>{row.original.estimatedServiceTime ?? "—"}</span>,
  },
  {
    id: "allowWalkIns",
    header: "Walk-ins",
    accessorFn: (row) => (row.allowWalkIns ? "Yes" : "No"),
    cell: ({ row }) =>
      row.original.allowWalkIns ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground" />
      ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row, table }) => {
      const queue = row.original;
      const meta = table.options.meta as any;
      const handleOpenDialog = meta?.handleOpenDialog;
      const handleDelete = meta?.handleDelete;

      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenDialog("view", queue)}
            title="View Queue"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenDialog("edit", queue)}
            title="Edit Queue"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(queue.id)}
            title="Delete Queue"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
