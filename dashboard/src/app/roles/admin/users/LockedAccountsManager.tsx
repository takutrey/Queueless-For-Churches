"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Lock, Unlock, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import type { AppDispatch, RootState } from "@/store/store";
import {
  fetchLockedAccounts,
  unlockAccount,
  unlockAllLockedAccounts,
  clearLockedAccountsError,
} from "@/lib/LockedAccountsSlice";

interface LockedAccount {
  id: string;
  email: string;
  name: string;
  loginAttempts: number;
  lockUntil: string;
  lastLoginAttempt: string;
  role: {
    id: string;
    name: string;
  };
}

export function LockedAccountsManager() {
  const dispatch = useDispatch<AppDispatch>();
  const { lockedAccounts, isLoading, error, unlockLoading, unlockAllLoading } =
    useSelector((state: RootState) => state.lockedAccounts);
  const [selectedAccount, setSelectedAccount] = useState<LockedAccount | null>(
    null,
  );
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [unlockAllDialogOpen, setUnlockAllDialogOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchLockedAccounts());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearLockedAccountsError());
    }
  }, [error, dispatch]);

  const handleUnlockAccount = async (account: LockedAccount) => {
    setSelectedAccount(account);
    setUnlockDialogOpen(true);
  };

  const confirmUnlockAccount = async () => {
    if (!selectedAccount) return;
    const result = await dispatch(unlockAccount(selectedAccount.id));
    if (unlockAccount.fulfilled.match(result)) {
      toast.success(`${selectedAccount.name}'s account has been unlocked`);
      dispatch(fetchLockedAccounts());
    } else {
      toast.error((result.payload as string) || "Failed to unlock account");
    }
    setUnlockDialogOpen(false);
    setSelectedAccount(null);
  };

  const handleUnlockAll = () => {
    setUnlockAllDialogOpen(true);
  };

  const confirmUnlockAll = async () => {
    const result = await dispatch(unlockAllLockedAccounts());
    if (unlockAllLockedAccounts.fulfilled.match(result)) {
      toast.success(
        result.payload?.message || "All locked accounts have been unlocked",
      );
      dispatch(fetchLockedAccounts());
    } else {
      toast.error((result.payload as string) || "Failed to unlock accounts");
    }
    setUnlockAllDialogOpen(false);
  };

  const formatLockUntil = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getTimeRemaining = (lockUntil: string) => {
    const remaining = new Date(lockUntil).getTime() - Date.now();
    if (remaining <= 0) return "Expired";
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    if (minutes > 0)
      return `${minutes} minute${minutes !== 1 ? "s" : ""} remaining`;
    return `${seconds} second${seconds !== 1 ? "s" : ""} remaining`;
  };

  const getRoleBadgeVariant = (roleName: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      "super-admin": "destructive",
      admin: "default",
      "senior-teacher": "secondary",
      teacher: "secondary",
    };
    return variants[roleName] || "outline";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Lock className="h-6 w-6 text-destructive" />
            Locked Accounts
          </h2>
          <p className="text-sm text-muted-foreground">
            View and manage user accounts that are currently locked due to
            failed login attempts
          </p>
        </div>
        {lockedAccounts && lockedAccounts.length > 0 && (
          <Button
            variant="outline"
            onClick={handleUnlockAll}
            disabled={unlockAllLoading}
            className="gap-2"
          >
            <Unlock className="h-4 w-4" />
            {unlockAllLoading ? "Unlocking..." : "Unlock All Accounts"}
          </Button>
        )}
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Account Locking Policy</AlertTitle>
        <AlertDescription>
          Accounts are automatically locked after{" "}
          {import.meta.env.VITE_PUBLIC_MAX_LOGIN_ATTEMPTS || 3} failed login
          attempts. Locked accounts remain locked for{" "}
          {import.meta.env.VITE_PUBLIC_ACCOUNT_LOCK_TIME || 15} minutes, or
          until manually unlocked by an administrator.
        </AlertDescription>
      </Alert>

      {/* Table */}
      {lockedAccounts && lockedAccounts.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Failed Attempts</TableHead>
                <TableHead>Locked Until</TableHead>
                <TableHead>Time Remaining</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lockedAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>{account.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(account.role.name)}>
                      {account.role.name
                        .replace(/-/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {account.loginAttempts}/
                      {import.meta.env.VITE_PUBLIC_MAX_LOGIN_ATTEMPTS || 3}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatLockUntil(account.lockUntil)}</TableCell>
                  <TableCell>
                    <span className="text-orange-600 dark:text-orange-400 font-medium">
                      {getTimeRemaining(account.lockUntil)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlockAccount(account)}
                      disabled={unlockLoading}
                      className="gap-1"
                    >
                      <Unlock className="h-4 w-4" />
                      Unlock
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/20">
          <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3 mb-4">
            <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold">No Locked Accounts</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-1">
            All user accounts are currently active and accessible. Accounts will
            appear here when they exceed the maximum number of failed login
            attempts.
          </p>
        </div>
      )}

      {/* Unlock Single Account Dialog */}
      <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to unlock {selectedAccount?.name}&apos;s
              account? They will be able to log in again immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUnlockDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmUnlockAccount} disabled={unlockLoading}>
              {unlockLoading ? "Unlocking..." : "Yes, Unlock Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock All Dialog */}
      <Dialog open={unlockAllDialogOpen} onOpenChange={setUnlockAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock All Accounts</DialogTitle>
            <DialogDescription>
              This action will unlock all currently locked accounts. Are you
              sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUnlockAllDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmUnlockAll} disabled={unlockAllLoading}>
              {unlockAllLoading ? "Unlocking..." : "Yes, Unlock All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
