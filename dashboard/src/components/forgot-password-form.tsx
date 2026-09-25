// components/auth/forgot-password-form.tsx
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { RootState, AppDispatch } from "@/store/store";
import { forgotPassword, reset } from "@/lib/AuthSlice";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, Mail, AlertCircle, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const dispatch = useDispatch<AppDispatch>();
  const { error, success, isLoading } = useSelector(
    (state: RootState) => state.auth,
  );
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    try {
      await dispatch(forgotPassword({ email })).unwrap();
      setIsSubmitted(true);
      toast.success("Password reset link sent to your email");
    } catch (err: any) {
      // Don't show error toast as the API returns success even if email doesn't exist
      // for security reasons (prevents email enumeration)
      setIsSubmitted(true);
      toast.success("If an account exists, a reset link has been sent");
    }
  };

  // Clear any previous auth state on mount
  useEffect(() => {
    dispatch(reset());
  }, [dispatch]);

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your email address and we'll send you a link to reset your
            password
          </p>
        </div>

        {isSubmitted ? (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle>Check Your Email</AlertTitle>
            <AlertDescription>
              If an account exists with the email <strong>{email}</strong>, you
              will receive a password reset link shortly.
              <br />
              <br />
              <span className="text-sm text-muted-foreground">
                Didn't receive the email? Check your spam folder or{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail("");
                  }}
                  className="text-primary underline hover:no-underline"
                >
                  try again
                </button>
              </span>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Field>
              <FieldLabel htmlFor="email">Email Address</FieldLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  placeholder="m@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                  disabled={isLoading}
                />
              </div>
            </Field>

            {error && (
              <Alert variant="destructive" className="border-red-500/50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Field>
              <Button
                type="submit"
                className="w-full cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </Field>
          </>
        )}

        <div className="text-center text-sm">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Login
          </Link>
        </div>
      </FieldGroup>
    </form>
  );
}
