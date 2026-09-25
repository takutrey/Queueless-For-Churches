import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SignupFormValues } from "@/schemas/ChurchSignupSchema";

export function OwnerAccountStep({
  form,
}: {
  form: UseFormReturn<SignupFormValues>;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="ownerName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Your full name</FormLabel>
            <FormControl>
              <Input placeholder="Jane Moyo" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ownerEmail"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Login email</FormLabel>
            <FormControl>
              <Input type="email" placeholder="jane@church.org" {...field} />
            </FormControl>
            <FormDescription>
              You'll use this to sign in to your dashboard.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...field}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-7 w-7"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </FormControl>
            <FormDescription>
              8+ characters, with an uppercase letter, a number, and a symbol.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="confirmPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Confirm password</FormLabel>
            <FormControl>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
