"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { CardContent } from "@/components/ui/card";
import { QRCodeSVG } from "qrcode.react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Printer, QrCode } from "lucide-react";
import type { Queue, QueueStats } from "@/types/QueueTypes";

// ─── Schema ───────────────────────────────────────────────────────────────

const queueSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().optional().nullable(),
  prefix: z.string().max(10, "Prefix too long").optional(),
  status: z.enum(["open", "paused", "closed"]).default("open"),
  estimatedServiceTime: z
    .number()
    .min(0, "Must be 0 or greater")
    .max(999, "Too high")
    .nullable()
    .optional(),
  maxCustomers: z.number().min(0, "Must be 0 or greater").nullable().optional(),
  allowWalkIns: z.boolean().default(true),
});

type FormSchema = z.infer<typeof queueSchema>;

// ─── Types ─────────────────────────────────────────────────────────────────

type Mode = "add" | "edit" | "view";

interface AddEditViewQueueProps {
  record?: Queue | null;
  mode: Mode;
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function ViewRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">
        {value || <span className="text-muted-foreground">Not provided</span>}
      </p>
    </div>
  );
}

function StatsRow({ label, value }: { label: string; value?: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? 0}</p>
    </div>
  );
}

function QrJoinPill({ joinCode }: { joinCode: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-full shrink-0"
        >
          <QrCode className="h-3.5 w-3.5" />
          Join QR
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="flex items-center gap-4">
          <QRCodeSVG
            value={`${window.location.origin}/q/${joinCode}`}
            size={110}
            includeMargin
            className="rounded border bg-white p-1 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              Customers can scan this or enter the code below.
            </p>
            <p className="mt-2 font-mono text-base font-semibold tracking-widest">
              {joinCode}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 gap-1.5"
              onClick={() => window.print()}
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

function AddEditViewQueue({
  record,
  mode,
  onSubmit,
  isSubmitting = false,
}: AddEditViewQueueProps) {
  const isViewMode = mode === "view";

  const defaultValues: FormSchema = {
    name: "",
    description: "",
    prefix: "",
    status: "open",
    estimatedServiceTime: null,
    maxCustomers: null,
    allowWalkIns: true,
  };

  const form = useForm<FormSchema>({
    resolver: zodResolver(queueSchema) as any,
    defaultValues,
  });

  const { handleSubmit, control, reset } = form;

  // Populate form when editing/viewing
  useEffect(() => {
    if (mode === "add") {
      reset(defaultValues);
    } else if (record) {
      reset({
        name: record.name || "",
        description: record.description || "",
        prefix: record.prefix || "",
        status: record.status || "open",
        estimatedServiceTime: record.estimatedServiceTime ?? null,
        maxCustomers: record.maxCustomers ?? null,
        allowWalkIns: record.allowWalkIns ?? true,
      });
    }
  }, [record, mode, reset]);

  // ─── View mode ──────────────────────────────────────────────────────────
  if (isViewMode && record) {
    const stats = record.stats as QueueStats | undefined;

    return (
      <div className="w-full space-y-6 px-1">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Basic Information
            </h3>
            {record.joinCode && <QrJoinPill joinCode={record.joinCode} />}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ViewRow label="Name" value={record.name} />
            <ViewRow label="Prefix" value={record.prefix} />
            <ViewRow label="Description" value={record.description} />
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge
                variant={
                  record.status === "open"
                    ? "default"
                    : record.status === "paused"
                      ? "secondary"
                      : "destructive"
                }
                className="mt-1 capitalize"
              >
                {record.status}
              </Badge>
            </div>
            <ViewRow
              label="Estimated Service Time (min)"
              value={record.estimatedServiceTime?.toString()}
            />
            <ViewRow
              label="Max Customers"
              value={record.maxCustomers?.toString()}
            />
            <div>
              <p className="text-xs text-muted-foreground">Allow Walk-ins</p>
              <Badge variant={record.allowWalkIns ? "default" : "secondary"}>
                {record.allowWalkIns ? "Yes" : "No"}
              </Badge>
            </div>
          </div>
        </div>

        {stats && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Live Statistics
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <StatsRow label="Waiting" value={stats.waiting} />
                <StatsRow label="Called" value={stats.called} />
                <StatsRow label="Serving" value={stats.serving} />
                <StatsRow label="Completed" value={stats.completed} />
                <StatsRow label="Skipped" value={stats.skipped} />
                {stats.totalToday !== undefined && (
                  <StatsRow label="Total Today" value={stats.totalToday} />
                )}
              </div>
            </div>
          </>
        )}

        {record.staffAssignments && record.staffAssignments.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Staff Assigned
              </h3>
              <div className="space-y-1">
                {record.staffAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{assignment.user?.name || "Assigned user"}</span>
                    <Badge variant="outline">{assignment.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Queue Metadata
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <ViewRow label="Queue ID" value={record.id} />
            <ViewRow label="Slug" value={record.slug} />
            <ViewRow label="Join code" value={record.joinCode} />
            {record.createdAt && (
              <ViewRow
                label="Created"
                value={new Date(record.createdAt).toLocaleDateString()}
              />
            )}
            {record.updatedAt && (
              <ViewRow
                label="Last Updated"
                value={new Date(record.updatedAt).toLocaleDateString()}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Add / Edit mode ────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[600px] mx-auto px-1 py-2">
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <CardContent className="space-y-4 px-0">
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Queue Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Main Service Counter"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Optional description"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={control}
                name="prefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prefix</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., A"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Used in ticket numbers (e.g., A001)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={control}
                name="estimatedServiceTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Est. Service Time (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="e.g., 5"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="maxCustomers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Customers (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Leave empty for unlimited"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={control}
              name="allowWalkIns"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Allow Walk-ins</FormLabel>
                    <FormDescription>
                      If enabled, customers can join without prior appointment.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? mode === "add"
                  ? "Creating..."
                  : "Updating..."
                : mode === "add"
                  ? "Create Queue"
                  : "Update Queue"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default AddEditViewQueue;
