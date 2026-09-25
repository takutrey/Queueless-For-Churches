import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  EllipsisVerticalIcon,
  CircleUserRoundIcon,
  CreditCardIcon,
  BellIcon,
} from "lucide-react";
import { logout, LogoutUser, reset } from "@/lib/AuthSlice";
import type { AppDispatch } from "@/store/store";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

export function NavUser({ user }: { user: any }) {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await dispatch(LogoutUser()).unwrap();
    } catch (error) {
      toast.error("Failed to logout");
    } finally {
      setIsLoggingOut(false);
      setShowLogoutDialog(false);

      // Reset Redux state
      dispatch(reset());
      dispatch(logout());

      // Navigate to login page
      navigate("/login-page", { replace: true });
    }
  };

  const handleNavigateProfilePage = () => {
    navigate(`/${user.role}/profile`);
  };

  const handleNavigateNotificationsPage = () => {
    navigate(`/${user.role}/notifications`);
  };

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (user?.name) {
      return user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || "U";
  };
  const { isMobile } = useSidebar();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar className="size-8 rounded-lg grayscale">
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback>{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {user?.name || user?.email}
              </span>
              <span className="truncate text-xs text-foreground/70">
                {user?.role}
              </span>
            </div>
            <EllipsisVerticalIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {user?.name || user?.email}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.role}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleNavigateProfilePage}>
                <CircleUserRoundIcon />
                Account
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleNavigateNotificationsPage}>
                <BellIcon />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowLogoutDialog(true)}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Logout Confirmation Dialog */}
        <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to logout?
              </AlertDialogTitle>
              <AlertDialogDescription>
                You will need to login again to access your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoggingOut}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="bg-red-600 hover:bg-red-700"
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
