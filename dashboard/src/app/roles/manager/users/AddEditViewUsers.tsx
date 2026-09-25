// app/(dashboard)/users/AddEditViewUsers.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/types/UserTypes";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";

// ─── Schema ──────────────────────────────────────────────
const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z
    .string()
    .min(1, "Email local part is required")
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "Only letters, numbers, dot, hyphen, underscore allowed",
    ),
  role: z.string().min(1, "Role is required"),
});

type FormSchema = z.infer<typeof userSchema>;

type Mode = "add" | "edit" | "view";

interface AddEditViewUsersProps {
  record?: User | null;
  mode: Mode;
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
}

const roleOptions = [
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
];

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

export default function AddEditViewUsers({
  record,
  mode,
  onSubmit,
  isSubmitting = false,
}: AddEditViewUsersProps) {
  const isViewMode = mode === "view";

  const churchSlug = useSelector(
    (state: RootState) => state.auth.user?.church?.slug,
  );

  const defaultValues: FormSchema = {
    name: "",
    email: "",
    role: "",
  };

  const form = useForm<FormSchema>({
    resolver: zodResolver(userSchema) as any,
    defaultValues,
  });

  const { handleSubmit, control, reset } = form;

  useEffect(() => {
    if (mode === "add") {
      reset(defaultValues);
    } else if (record && mode !== "add") {
      const roleName =
        typeof record.role === "string" ? record.role : record.role?.name || "";
      reset({
        name: record.name || "",
        email: record.email || "",
        role: roleName,
      });
    }
  }, [record, mode, reset]);

  // ─── View mode ──────────────────────────────────────────
  if (isViewMode && record) {
    const roleName =
      typeof record.role === "string" ? record.role : record.role?.name || "";
    return (
      <div className="w-full space-y-6 px-1">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            User Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <ViewRow label="Full Name" value={record.name} />
            <ViewRow label="Email" value={record.email} />
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <Badge variant="secondary" className="mt-1 capitalize">
                {roleName}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge
                variant={record.isActive ? "default" : "destructive"}
                className="mt-1"
              >
                {record.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>
        <Separator />
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Account Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <ViewRow label="User ID" value={record.id} />
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

  // ─── Add / Edit mode ───────────────────────────────────
  const isEditMode = mode === "edit";
  const domain = churchSlug ? `@${churchSlug}.co.zw` : "";

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
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isEditMode ? "Email" : "Email Local Part *"}
                  </FormLabel>
                  <FormControl>
                    {isEditMode ? (
                      <Input placeholder="Email" {...field} disabled readOnly />
                    ) : (
                      <div className="flex rounded-md shadow-sm">
                        <Input
                          placeholder="e.g., john"
                          {...field}
                          className="rounded-r-none"
                        />
                        <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-muted-foreground text-sm whitespace-nowrap">
                          {domain || "@domain.co.zw"}
                        </span>
                      </div>
                    )}
                  </FormControl>
                  {!isEditMode && domain && (
                    <FormDescription>
                      Full email will be: {field.value || "username"}
                      {domain}
                    </FormDescription>
                  )}
                  {isEditMode && (
                    <FormDescription>
                      Email cannot be changed after creation.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roleOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                  ? "Update User"
                  : "Create User"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
