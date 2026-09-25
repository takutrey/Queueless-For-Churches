import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import { useNavItems } from "@/nav-config/nav-config";
import { Link } from "react-router-dom";
import LogoImage from "/logo.png";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useSelector((state: RootState) => state.auth);
  const [isLoading, setIsLoading] = React.useState(true);
  const navItems = useNavItems();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[slot=sidebar-menu-button]:p-1.5! h-auto min-h-10 group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-1!"
              render={
                <Link
                  to={`/${user?.role ?? "admin"}/dashboard`}
                  className="flex items-center justify-start w-full"
                >
                  <div className="flex items-center justify-start w-full h-8 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center">
                    <img
                      src={LogoImage}
                      alt="QueueLess"
                      className="h-full w-auto max-w-[140px] object-contain group-data-[collapsible=icon]:max-w-8"
                    />
                  </div>
                </Link>
              }
            ></SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        {isLoading ? (
          <div className="text-sm text-muted-foreground px-4 py-2">
            Loading...
          </div>
        ) : user ? (
          <NavUser user={user} />
        ) : (
          <div className="text-sm text-muted-foreground px-4 py-2">
            No user info
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
