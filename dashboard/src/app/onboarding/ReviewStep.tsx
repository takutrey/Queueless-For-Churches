import type { UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormControl,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import type { SignupFormValues } from "@/schemas/ChurchSignupSchema";

export function ReviewStep({
  form,
  values,
}: {
  form: UseFormReturn<SignupFormValues>;
  values: SignupFormValues;
}) {
  const rows: [string, string][] = [
    ["Church name", values.churchName],
    ["Phone", values.churchPhone],
    ["Church email", values.churchEmail],
    ["Church address", values.churchAddress || "—"],
    ["Owner", values.ownerName],
    ["Login email", values.ownerEmail],
  ];

  return (
    <div className="space-y-4">
      <dl className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
