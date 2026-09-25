import type { RootState } from "@/store/store";
import {
  AudioWaveform,
  Command,
  FileText,
  GalleryVerticalEnd,
  Home,
  ScrollText,
  Users,
  Settings,
  BarChart3,
  LineSquiggle,
  Megaphone,
} from "lucide-react";
import { useSelector } from "react-redux";

// Define the navigation structure for all roles
export const navConfig = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],

  // Role-specific navigation items with prefixed URLs
  navByRole: {
    admin: [
      {
        title: "Dashboard",
        url: "/admin/dashboard",
        icon: Home,
      },

      {
        title: "Queues",
        url: "/admin/queues",
        icon: LineSquiggle,
      },
      { title: "Pledge Campaigns", url: "/admin/campaigns", icon: Megaphone },
      { title: "Pledge Records", url: "/admin/pledges", icon: Users },

      {
        title: "User Management",
        url: "/admin/users",
        icon: Users,
      },

      {
        title: "Analytics",
        url: "/admin/analytics",
        icon: BarChart3,
      },

      {
        title: "Audit Logs",
        url: "/admin/audit-logs",
        icon: Settings,
      },
    ],

    superadmin: [
      {
        title: "Dashboard",
        url: "/regofficer/dashboard",
        icon: Home,
      },
      {
        title: "Applications",
        url: "/regofficer/applications",
        icon: FileText,
      },

      {
        title: "Permit Management",
        url: "/regofficer/permits",
        icon: ScrollText,
        items: [
          {
            title: "Pending Permits",
            url: "/regofficer/permits/pending-permits",
          },
          {
            title: "Approved Permits",
            url: "/regofficer/permits/approved-permits",
          },
        ],
      },
      {
        title: "Analytics",
        url: "/regofficer/analytics",
        icon: BarChart3,
      },
    ],

    manager: [
      {
        title: "Dashboard",
        url: "/manager/dashboard",
        icon: Home,
      },
      {
        title: "Queues",
        url: "/manager/queues",
        icon: LineSquiggle,
      },
      { title: "Pledge Campaigns", url: "/manager/campaigns", icon: Megaphone },
      { title: "Pledge Records", url: "/manager/pledges", icon: Users },
      {
        title: "User Management",
        url: "/manager/users",
        icon: Users,
      },
      {
        title: "Analytics",
        url: "/manager/analytics",
        icon: BarChart3,
      },
    ],

    staff: [
      {
        title: "Dashboard",
        url: "/staff/dashboard",
        icon: Home,
      },
      {
        title: "Queues",
        url: "/staff/queues",
        icon: LineSquiggle,
      },
    ],
  },

  // Default routes for each role (for redirects)
  defaultRoutes: {
    admin: "/admin/dashboard",
    superadmin: "/super-admin/dashboard",
    manager: "/manager/dashboard",
    staff: "/staff/dashboard",
    default: "/dashboard",
  },
};

// Hook to get navigation items based on user role
export function useNavItems() {
  const { user } = useSelector((state: RootState) => state.auth);

  if (!user) {
    return [];
  }

  const userRole = user.role;
  return (
    navConfig.navByRole[userRole as keyof typeof navConfig.navByRole] || []
  );
}

// Helper function to get default route for a role
export function getDefaultRoute(role: string): string {
  return (
    navConfig.defaultRoutes[role as keyof typeof navConfig.defaultRoutes] ||
    navConfig.defaultRoutes.default
  );
}
