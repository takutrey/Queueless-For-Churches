// components/NotificationBell.tsx
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnimateIcon } from "../animate-ui/icons/icon";
import { BellRing } from "../animate-ui/icons/bell-ring";
import { useNotifications } from "@/contexts/NotificationContext";
import type { Notification } from "@/types/NotificationTypes";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import {
  UserPlus,
  Bell,
  PauseCircle,
  XCircle,
  CreditCard,
  Info,
} from "lucide-react";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const userRole = useSelector((state: RootState) => state.auth.user?.role);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    requestNotificationPermission,
    navigateToNotification,
  } = useNotifications();

  const rolePath = userRole ? `/${userRole}` : "";

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    navigateToNotification(notification);
    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount > 0) {
      await markAllAsRead();
    }
  };

  const handleViewAllNotifications = () => {
    navigate(`${rolePath}/notifications`);
    setIsOpen(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440)
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case "queue_joined":
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case "customer_called":
        return <Bell className="h-4 w-4 text-blue-500" />;
      case "queue_paused":
        return <PauseCircle className="h-4 w-4 text-yellow-500" />;
      case "queue_closed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "subscription":
        return <CreditCard className="h-4 w-4 text-purple-500" />;
      case "system":
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const recentNotifications = notifications.slice(0, 10);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "relative p-2 rounded-full hover:bg-muted",
        )}
        onClick={() => requestNotificationPermission()}
      >
        <AnimateIcon animateOnHover>
          <BellRing />
        </AnimateIcon>
        {unreadCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs bg-red-600 text-white rounded-full flex items-center justify-center"
            variant="default"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-[32rem] p-0" align="end">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-800 hover:bg-transparent h-auto px-2 py-1"
            >
              Mark all as read
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {recentNotifications.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
              No notifications
            </div>
          ) : (
            <ul className="divide-y">
              {recentNotifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    notification.isRead
                      ? "bg-transparent hover:bg-muted/50"
                      : "bg-blue-50/50 hover:bg-blue-100/50"
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4
                          className={`font-medium text-sm ${
                            notification.isRead
                              ? "text-gray-700"
                              : "text-gray-900"
                          }`}
                        >
                          {notification.title}
                        </h4>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">
                          {formatTime(notification.createdAt)}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 py-0 h-4"
                        >
                          {notification.type.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t p-3">
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              {unreadCount} unread • {notifications.length} total
            </div>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewAllNotifications}
                className="text-xs text-blue-600 hover:text-blue-800 hover:bg-transparent h-auto px-2 py-1"
              >
                View All
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
