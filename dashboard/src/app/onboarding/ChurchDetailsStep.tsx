import { useState, useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SignupFormValues } from "@/schemas/ChurchSignupSchema";
import PhoneInput from "react-phone-number-input";
import { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

export function ChurchDetailsStep({
  form,
}: {
  form: UseFormReturn<SignupFormValues>;
}) {
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const phoneValue = form.watch("churchPhone");

  useEffect(() => {
    setPhoneError(
      phoneValue && !isValidPhoneNumber(phoneValue)
        ? "Invalid phone number format"
        : null,
    );
  }, [phoneValue]);

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="churchName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Church name</FormLabel>
            <FormControl>
              <Input placeholder="Grace Community Church" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="churchPhone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Church phone number</FormLabel>
            <FormControl>
              <div
                className={cn(
                  "w-full rounded-md border bg-background px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring",
                  phoneError ? "border-destructive" : "border-input",
                )}
              >
                <PhoneInput
                  international
                  defaultCountry="ZW"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="+263 71 234 5678"
                  className="phone-input-inner w-full"
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    outline: "none",
                  }}
                />
              </div>
            </FormControl>
            {phoneError && (
              <span className="text-sm font-medium text-destructive">
                {phoneError}
              </span>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="churchEmail"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Church email</FormLabel>
            <FormControl>
              <Input type="email" placeholder="hello@church.org" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="churchAddress"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Church address{" "}
              <span className="text-muted-foreground">(optional)</span>
            </FormLabel>
            <FormControl>
              <Textarea placeholder="123 Main Street, Harare" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
