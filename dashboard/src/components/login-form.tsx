// login-form.tsx - Simplified navigation
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { RootState, AppDispatch } from "@/store/store";
import { LoginUser, reset } from "@/lib/AuthSlice";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Eye, EyeOff, AlertCircle, Clock, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "react-router-dom";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const dispatch = useDispatch<AppDispatch>();
  const { user, error, success, isLoading } = useSelector(
    (state: RootState) => state.auth,
  );
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [lockError, setLockError] = useState<{
    message: string;
    remainingMinutes?: number;
  } | null>(null);
  const [rateLimitError, setRateLimitError] = useState<{
    message: string;
    waitSeconds?: number;
  } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLockError(null);
    setRateLimitError(null);

    try {
      await dispatch(LoginUser({ email, password })).unwrap();
      // Success is handled in useEffect
    } catch (err: any) {
      // Handle specific error types
      if (err.lockedMessage) {
        setLockError({
          message: err.lockedMessage,
          remainingMinutes: err.response?.data?.remainingMinutes,
        });
        toast.error(err.lockedMessage);
      } else if (err.rateLimitMessage) {
        setRateLimitError({
          message: err.rateLimitMessage,
          waitSeconds: err.response?.data?.waitSeconds,
        });
        toast.error(err.rateLimitMessage);
      } else if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      }
    }
  };

  useEffect(() => {
    if (error && !lockError && !rateLimitError) {
      toast.error(error || "Login Failed");
      dispatch(reset());
    }

    // Navigate to root after successful login - RoleRedirect will handle the rest
    if (success && user) {
      toast.success(`Welcome ${user?.name}`);
      navigate("/", { replace: true });
      dispatch(reset());
    }
  }, [error, success, user, dispatch, navigate, lockError, rateLimitError]);

  return (
    <form
      onSubmit={handleLogin}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your email below to login to your account
          </p>
        </div>

        {/* Locked Account Alert */}
        {lockError && (
          <Alert
            variant="destructive"
            className="border-red-500/50 bg-red-500/10"
          >
            <Lock className="h-4 w-4" />
            <AlertTitle>Account Locked</AlertTitle>
            <AlertDescription>
              {lockError.message}
              {lockError.remainingMinutes && (
                <div className="mt-2 text-sm">
                  <Clock className="inline h-3 w-3 mr-1" />
                  Auto-unlock in {lockError.remainingMinutes} minutes
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Rate Limit Alert */}
        {rateLimitError && (
          <Alert
            variant="destructive"
            className="border-yellow-500/50 bg-yellow-500/10"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Too Many Attempts</AlertTitle>
            <AlertDescription>
              {rateLimitError.message}
              {rateLimitError.waitSeconds && (
                <div className="mt-2 text-sm">
                  <Clock className="inline h-3 w-3 mr-1" />
                  Please wait {rateLimitError.waitSeconds} seconds before trying
                  again
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            value={email}
            placeholder="m@example.com"
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!!lockError}
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link
              to="/forgot-password"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pr-10"
              disabled={!!lockError}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-2 text-muted-foreground"
              disabled={!!lockError}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>
        <Field>
          <Button
            type="submit"
            className="w-full cursor-pointer"
            disabled={isLoading || !!lockError}
          >
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        </Field>
        <Field>
          <FieldDescription className="text-center">
            Don&apos;t have an account?{" "}
            <Link to="/signup-page" className="underline">
              Sign up
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
