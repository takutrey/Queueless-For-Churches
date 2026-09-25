// components/auth/reset-password-form.tsx
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { RootState, AppDispatch } from "@/store/store";
import { resetPassword, validateResetToken, reset } from "@/lib/AuthSlice";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Eye, EyeOff, AlertCircle, CheckCircle, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const dispatch = useDispatch<AppDispatch>();
  const { error, success, isLoading } = useSelector(
    (state: RootState) => state.auth,
  );
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  );

  // Get token and email from URL
  useEffect(() => {
    const tokenParam = searchParams.get("token");
    const emailParam = searchParams.get("email");

    if (!tokenParam || !emailParam) {
      setVerificationError("Missing reset token or email");
      setIsVerifying(false);
      return;
    }

    setToken(tokenParam);
    setEmail(emailParam);

    // Validate the token
    const verifyToken = async () => {
      try {
        const result = await dispatch(
          validateResetToken({ token: tokenParam, email: emailParam }),
        ).unwrap();

        if (result.valid) {
          setIsValidToken(true);
          setVerificationError(null);
        } else {
          setVerificationError(result.message || "Invalid or expired token");
        }
      } catch (err: any) {
        setVerificationError(err || "Invalid or expired token");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [searchParams, dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      toast.error(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      );
      return;
    }

    try {
      await dispatch(
        resetPassword({
          token,
          email,
          newPassword,
          confirmPassword,
        }),
      ).unwrap();

      toast.success("Password reset successfully! You can now log in.");

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      toast.error(err || "Failed to reset password");
    }
  };

  // Clear any previous auth state on mount
  useEffect(() => {
    dispatch(reset());
  }, [dispatch]);

  // Show verifying state
  if (isVerifying) {
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Verifying your reset link...</p>
        </div>
      </div>
    );
  }

  // Show error state if token is invalid
  if (verificationError || !isValidToken) {
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        <div className="flex flex-col items-center gap-4 text-center">
          <Alert variant="destructive" className="border-red-500/50">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Invalid Reset Link</AlertTitle>
            <AlertDescription>
              {verificationError ||
                "This password reset link is invalid or has expired."}
              <br />
              <br />
              <Link
                to="/forgot-password"
                className="text-primary underline hover:no-underline"
              >
                Request a new reset link
              </Link>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Show reset form
  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create New Password</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your new password below
          </p>
        </div>

        {success ? (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle>Password Reset Successful</AlertTitle>
            <AlertDescription>
              Your password has been reset successfully.
              <br />
              <br />
              <Button
                type="button"
                className="cursor-pointer"
                onClick={() => navigate("/login")}
              >
                Go to Login
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Field>
              <FieldLabel htmlFor="new-password">New Password</FieldLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-9 pr-10"
                  placeholder="Enter your new password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Must be at least 8 characters with uppercase, lowercase, number,
                and special character
              </p>
            </Field>

            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirm Password
              </FieldLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9 pr-10"
                  placeholder="Confirm your new password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
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
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>
            </Field>
          </>
        )}

        <div className="text-center text-sm">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
          >
            Back to Login
          </Link>
        </div>
      </FieldGroup>
    </form>
  );
}
