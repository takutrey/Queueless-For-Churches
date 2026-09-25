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
import { Plus, Download, Filter, Trash2 } from "lucide-react";
import AddEditViewQueue from "./AddEditViewQueue";
import type { Queue, CreateQueuePayload } from "@/types/QueueTypes";
import { toast } from "sonner";

interface QueueDataTableProps {
  columns: ColumnDef<Queue>[];
  data: Queue[];
  onAddQueue: (data: CreateQueuePayload) => Promise<any>;
  onUpdateQueue: (data: any) => Promise<any>;
  onDeleteQueue: (id: string) => Promise<any>;
  onExport?: () => void;
}

export function QueueDataTable({
  columns,
  data,
  onAddQueue,
  onUpdateQueue,
  onDeleteQueue,
  onExport,
}: QueueDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit" | "view">("add");
  const [selectedQueue, setSelectedQueue] = React.useState<Queue | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [queueToDelete, setQueueToDelete] = React.useState<string | null>(null);

  const handleOpenDialog = React.useCallback(
    (mode: "add" | "edit" | "view", record?: Queue) => {
      setMode(mode);
      setSelectedQueue(record || null);
      setIsDialogOpen(true);
    },
    [],
  );

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedQueue(null);
    setIsSubmitting(false);
  };

  const handleDelete = (id: string) => {
    setQueueToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!queueToDelete) return;
    setIsSubmitting(true);
    try {
      await onDeleteQueue(queueToDelete);
      toast.success("Queue deleted successfully");
      setDeleteDialogOpen(false);
      setQueueToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete queue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    meta: {
      handleOpenDialog,
      handleDelete,
    },
  });

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (mode === "add") {
        await onAddQueue(data);
        toast.success("Queue created successfully");
      } else if (mode === "edit") {
        await onUpdateQueue({ id: selectedQueue?.id, ...data });
        toast.success("Queue updated successfully");
      }
      handleCloseDialog();
    } catch (error: any) {
      toast.error(
        error.message ||
          `Failed to ${mode === "add" ? "create" : "update"} queue`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <Input
            placeholder="Filter by name..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
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
            Add Queue
          </Button>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="bg-muted/50 p-2 rounded-md flex items-center justify-between">
          <span className="text-sm">
            {selectedCount} queue{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
            Clear selection
          </Button>
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
                  No queues found. Click "Add Queue" to create one.
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
                ? "Create New Queue"
                : mode === "edit"
                  ? "Edit Queue"
                  : "Queue Details"}
            </DialogTitle>
          </DialogHeader>
          <AddEditViewQueue
            record={selectedQueue}
            mode={mode}
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Queue</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this queue? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
