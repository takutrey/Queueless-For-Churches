"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { AuditLogDetails } from "./AuditLogDetails";
import type { AuditLog } from "@/types/AuditLogTypes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AUDIT_ACTIONS } from "@/types/AuditLogTypes";
import { CalendarIcon, Download, Eye, Search } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onFilterChange: (filters: any) => void;
  onExport?: (format: "json" | "csv") => void;
  isLoading?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pagination,
  onPageChange,
  onLimitChange,
  onFilterChange,
  onExport,
  isLoading,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [actionFilter, setActionFilter] = React.useState<string>("all");
  const [entityFilter, setEntityFilter] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [startDate, setStartDate] = React.useState<Date>();
  const [endDate, setEndDate] = React.useState<Date>();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null);

  // Apply filters
  React.useEffect(() => {
    const filters: any = {};

    if (actionFilter !== "all") filters.action = actionFilter;
    if (entityFilter) filters.entity = entityFilter;
    if (searchQuery) filters.search = searchQuery;
    if (startDate) filters.startDate = startDate.toISOString();
    if (endDate) filters.endDate = endDate.toISOString();

    onFilterChange(filters);
  }, [
    actionFilter,
    entityFilter,
    searchQuery,
    startDate,
    endDate,
    onFilterChange,
  ]);

  const handleViewLog = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDialogOpen(true);
  };

  // Create a stable columns reference
  const tableColumns = React.useMemo(() => {
    return columns.map((col) => {
      if (col.id === "actions") {
        return {
          ...col,
          cell: ({ row }: { row: any }) => {
            const original = row.original as AuditLog;
            return (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleViewLog(original)}
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            );
          },
        };
      }
      return col;
    });
  }, [columns, handleViewLog]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages,
    rowCount: pagination.total,
  });

  const buttonBaseClass =
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-[250px]"
            />
          </div>

          {/* Action Filter */}
          <Select
            value={actionFilter}
            onValueChange={(value) => setActionFilter(value ?? "all")}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {AUDIT_ACTIONS.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Entity / Path Filter – free text */}
          <Input
            placeholder="Filter by path..."
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="w-[200px]"
          />

          {/* Date Range */}
          <Popover>
            <PopoverTrigger
              className={cn(
                buttonBaseClass,
                "w-[240px] justify-start text-left font-normal",
                !startDate && !endDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate && endDate
                ? `${format(startDate, "dd/MM/yyyy")} - ${format(endDate, "dd/MM/yyyy")}`
                : "Select date range"}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: startDate, to: endDate }}
                onSelect={(range) => {
                  setStartDate(range?.from);
                  setEndDate(range?.to);
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Columns Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger className={buttonBaseClass + " ml-auto"}>
              Columns
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
                    {column.id.replace(/([A-Z])/g, " $1").trim()}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Export */}
        {onExport && (
          <DropdownMenu>
            <DropdownMenuTrigger className={buttonBaseClass}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem onClick={() => onExport("json")}>
                JSON
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem onClick={() => onExport("csv")}>
                CSV
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

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
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
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
                  No audit logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && <AuditLogDetails log={selectedLog} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
