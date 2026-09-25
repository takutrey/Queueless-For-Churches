// app/notifications/page.tsx
"use client";

import { useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  CheckCheck,
  Trash2,
  UserPlus,
  PauseCircle,
  XCircle,
  CreditCard,
  Info,
  MoreVertical,
  Filter,
  Settings,
  Mail,
  Clock,
  X,
  BellRing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { useNotifications } from "@/contexts/NotificationContext";
import type { Notification } from "@/types/NotificationTypes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Helper Functions ─────────────────────────────────────────────────

function formatNotificationTime(dateString: string): string {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  if (diffInMinutes < 1440)
    return `${Math.floor(diffInMinutes / 60)} hours ago`;
  if (isToday(date)) return format(date, "'Today at' HH:mm");
  if (isYesterday(date)) return format(date, "'Yesterday at' HH:mm");
  if (isThisWeek(date)) return format(date, "EEEE 'at' HH:mm");
  return format(date, "MMM d, yyyy 'at' HH:mm");
}

function formatDateDivider(date: string): string {
  if (!date) return "Unknown";
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  if (isThisWeek(d)) return "This Week";
  return format(d, "MMMM yyyy");
}

function getNotificationIcon(
  notification: Notification,
  className = "h-5 w-5",
) {
  if (!notification) return <Info className={`${className} text-gray-400`} />;
  const iconClass = `${className} ${notification.isRead ? "opacity-50" : ""}`;
  switch (notification.type) {
    case "queue_joined":
      return <UserPlus className={`${iconClass} text-green-500`} />;
    case "customer_called":
      return <Bell className={`${iconClass} text-blue-500`} />;
    case "queue_paused":
      return <PauseCircle className={`${iconClass} text-yellow-500`} />;
    case "queue_closed":
      return <XCircle className={`${iconClass} text-red-500`} />;
    case "subscription":
      return <CreditCard className={`${iconClass} text-purple-500`} />;
    default:
      return <Info className={`${iconClass} text-gray-400`} />;
  }
}

function getNotificationTypeColor(type: string): string {
  switch (type) {
    case "queue_joined":
      return "bg-green-500/10 text-green-700 border-green-200";
    case "customer_called":
      return "bg-blue-500/10 text-blue-700 border-blue-200";
    case "queue_paused":
      return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
    case "queue_closed":
      return "bg-red-500/10 text-red-700 border-red-200";
    case "subscription":
      return "bg-purple-500/10 text-purple-700 border-purple-200";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-200";
  }
}

// ─── Notification Item Component ─────────────────────────────────────

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onClick,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick: (notification: Notification) => void;
}) {
  const [hovered, setHovered] = useState(false);
  if (!notification) return null;

  return (
    <div
      className={`group relative flex items-start gap-4 p-4 rounded-lg transition-all cursor-pointer
        ${
          notification.isRead
            ? "bg-card hover:bg-accent/50"
            : "bg-primary/5 border border-primary/10 hover:bg-primary/10"
        }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick(notification)}
    >
      {!notification.isRead && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
      )}

      <div
        className={`flex-shrink-0 mt-1 ${notification.isRead ? "opacity-60" : ""}`}
      >
        {getNotificationIcon(notification, "h-6 w-6")}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">
                {notification.title || "Notification"}
              </h3>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 h-4 capitalize ${getNotificationTypeColor(notification.type)}`}
              >
                {notification.type.replace("_", " ")}
              </Badge>
            </div>
            <p
              className={`text-sm ${
                notification.isRead
                  ? "text-muted-foreground"
                  : "text-foreground/90"
              }`}
            >
              {notification.message || "No message content"}
            </p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatNotificationTime(notification.createdAt)}</span>
              </div>
              {notification.queue && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    Queue: {notification.queue.name}
                  </span>
                </>
              )}
            </div>
          </div>

          <div
            className={`flex items-center gap-1 transition-opacity ${
              hovered ? "opacity-100" : "opacity-0"
            }`}
          >
            {!notification.isRead && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
                title="Mark as read"
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
                title="Delete notification"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {notification.isRead ? (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Optionally mark unread – not supported by backend
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Mark unread (local)
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsRead(notification.id);
                    }}
                  >
                    <CheckCheck className="h-4 w-4 mr-2" />
                    Mark read
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(notification.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Date Divider ─────────────────────────────────────────────────────

function DateDivider({ date }: { date: string }) {
  if (!date) return null;
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-3 py-1 rounded-full border border-border/60 shrink-0">
        {formatDateDivider(date)}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    navigateToNotification,
  } = useNotifications();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ── Group notifications by date ─────────────────────────────────
  const groupNotificationsByDate = (notifs: Notification[]) => {
    const groups: { dateKey: string; items: Notification[] }[] = [];
    if (!notifs || notifs.length === 0) return groups;
    for (const notif of notifs) {
      if (!notif || !notif.createdAt) continue;
      const date = new Date(notif.createdAt);
      let dateKey: string;
      if (isToday(date)) dateKey = "Today";
      else if (isYesterday(date)) dateKey = "Yesterday";
      else if (isThisWeek(date)) dateKey = "This Week";
      else dateKey = format(date, "MMMM yyyy");
      const existingGroup = groups.find((g) => g.dateKey === dateKey);
      if (existingGroup) existingGroup.items.push(notif);
      else groups.push({ dateKey, items: [notif] });
    }
    return groups;
  };

  // ── Filter notifications ────────────────────────────────────────
  const filteredNotifications = (notifications || []).filter((notif) => {
    if (!notif) return false;
    // Search
    if (search) {
      const searchLower = search.toLowerCase();
      const title = (notif.title || "").toLowerCase();
      const message = (notif.message || "").toLowerCase();
      const queueName = (notif.queue?.name || "").toLowerCase();
      const matches =
        title.includes(searchLower) ||
        message.includes(searchLower) ||
        queueName.includes(searchLower);
      if (!matches) return false;
    }
    // Read/Unread
    if (filter === "unread" && notif.isRead) return false;
    // Type filter
    if (typeFilter.length > 0 && !typeFilter.includes(notif.type)) return false;
    return true;
  });

  filteredNotifications.sort((a, b) => {
    if (!a || !b) return 0;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  // Unique notification types
  const types = [...new Set(notifications.map((n) => n.type).filter(Boolean))];

  // ── Handlers ────────────────────────────────────────────────────
  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsDetailsOpen(true);
  };

  const handleNavigate = (notification: Notification) => {
    if (notification) {
      navigateToNotification(notification);
      setIsDetailsOpen(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      toast.success("Notification marked as read");
    } catch (error) {
      toast.error("Failed to mark notification as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) {
      toast.info("No unread notifications");
      return;
    }
    try {
      await markAllAsRead();
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      // Implement delete in context if needed
      toast.success("Notification deleted");
      setDeleteTargetId(null);
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  const toggleTypeFilter = (type: string) => {
    setTypeFilter((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const clearFilters = () => {
    setSearch("");
    setFilter("all");
    setTypeFilter([]);
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* LEFT SIDEBAR - FILTERS */}
        <div className="w-[280px] shrink-0 flex flex-col border-r border-border bg-card">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="data-[orientation=vertical]:h-4"
            />
            <span className="font-semibold text-sm flex-1">Notifications</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleMarkAllAsRead}
              title="Mark all as read"
            >
              <CheckCheck className="h-4 w-4" />
            </Button>
          </div>

          <div className="px-3 py-2 border-b border-border">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search notifications…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-sm bg-muted/40 border-0 focus-visible:ring-1"
              />
            </div>
          </div>

          <div className="p-3 border-b border-border">
            <Tabs
              value={filter}
              className="w-full"
              onValueChange={(v) => setFilter(v as any)}
            >
              <TabsList className="grid w-full grid-cols-2 h-8">
                <Tooltip>
                  <TooltipTrigger>
                    <TabsTrigger value="all" className="px-0">
                      <Bell className="h-3.5 w-3.5" />
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">All</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger>
                    <TabsTrigger value="unread" className="relative px-0">
                      <BellRing className="h-3.5 w-3.5" />
                      {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-0.5 text-[8px] leading-none bg-primary text-primary-foreground flex items-center justify-center">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Unread</TooltipContent>
                </Tooltip>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                  Type
                </h4>
                <div className="space-y-1">
                  {types.length > 0 ? (
                    types.map((type) => (
                      <button
                        key={type}
                        onClick={() => toggleTypeFilter(type)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors ${
                          typeFilter.includes(type)
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-accent text-muted-foreground"
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                        <span className="capitalize">
                          {type.replace("_", " ")}
                        </span>
                        <Badge
                          variant="secondary"
                          className="ml-auto text-[8px] h-4"
                        >
                          {notifications.filter((n) => n.type === type).length}
                        </Badge>
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      No notification types
                    </p>
                  )}
                </div>
              </div>
              {(search || typeFilter.length > 0 || filter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="w-full text-xs"
                >
                  <X className="h-3 w-3 mr-2" />
                  Clear filters
                </Button>
              )}
            </div>
          </div>

          <div className="border-t border-border p-3">
            <div className="text-xs text-muted-foreground">
              <div className="flex justify-between mb-1">
                <span>Total</span>
                <span className="font-medium">{notifications.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Unread</span>
                <span className="font-medium text-primary">{unreadCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT - NOTIFICATION LIST */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-lg font-semibold">Notification Center</h1>
              {unreadCount > 0 && (
                <Badge className="bg-primary text-primary-foreground">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all as read
              </Button>
              <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <DropdownMenuTrigger>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Notification Settings</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Bell className="h-4 w-4 mr-2" />
                    Push notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Mail className="h-4 w-4 mr-2" />
                    Email notifications
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear all
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <ScrollArea className="flex-1 px-6 py-4">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                  <Bell className="h-12 w-12 opacity-30" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-foreground">
                    No notifications
                  </p>
                  <p className="text-sm mt-1">
                    {search || typeFilter.length > 0
                      ? "Try adjusting your filters"
                      : "You're all caught up!"}
                  </p>
                </div>
                {(search || typeFilter.length > 0) && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                {groupedNotifications.map((group) => (
                  <div key={group.dateKey}>
                    <DateDivider
                      date={
                        group.items[0]?.createdAt || new Date().toISOString()
                      }
                    />
                    <div className="space-y-2">
                      {group.items.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={handleMarkAsRead}
                          onDelete={setDeleteTargetId}
                          onClick={handleNotificationClick}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* DETAILS DIALOG */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-[500px]">
            {selectedNotification && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {getNotificationIcon(selectedNotification, "h-5 w-5")}
                    <span>{selectedNotification.title || "Notification"}</span>
                    {!selectedNotification.isRead && (
                      <Badge className="ml-2 bg-primary">New</Badge>
                    )}
                  </DialogTitle>
                  <DialogDescription>
                    Received{" "}
                    {formatNotificationTime(selectedNotification.createdAt)}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedNotification.message || "No message content"}
                    </p>
                  </div>
                  {selectedNotification.queue && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Queue
                      </h4>
                      <div className="bg-muted/20 rounded-lg p-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Name:</span>
                          <span className="font-medium">
                            {selectedNotification.queue.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter className="gap-2">
                  {!selectedNotification.isRead && (
                    <Button
                      variant="default"
                      onClick={() => {
                        handleMarkAsRead(selectedNotification.id);
                        setIsDetailsOpen(false);
                      }}
                    >
                      <CheckCheck className="h-4 w-4 mr-2" />
                      Mark as read
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => handleNavigate(selectedNotification)}
                  >
                    Go to queue
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* DELETE CONFIRMATION */}
        <Dialog
          open={!!deleteTargetId}
          onOpenChange={(v) => !v && setDeleteTargetId(null)}
        >
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Delete notification
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-1">
              This will permanently delete this notification. This action cannot
              be undone.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
