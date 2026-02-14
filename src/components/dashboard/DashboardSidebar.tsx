import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  CalendarCheck,
  Package,
  CreditCard,
  FileText,
  User,
  HelpCircle,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const menuItems = [
  { titleKey: "dashboard.nav.overview", url: "/dashboard", icon: LayoutDashboard },
  { titleKey: "dashboard.nav.bookings", url: "/dashboard/bookings", icon: CalendarCheck },
  { titleKey: "dashboard.nav.packages", url: "/dashboard/packages", icon: Package },
  { titleKey: "dashboard.nav.payments", url: "/dashboard/payments", icon: CreditCard },
  { titleKey: "dashboard.nav.documents", url: "/dashboard/documents", icon: FileText },
  { titleKey: "dashboard.nav.profile", url: "/dashboard/profile", icon: User },
  { titleKey: "dashboard.nav.support", url: "/dashboard/support", icon: HelpCircle },
];

const DashboardSidebar = () => {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <Sidebar className="border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img
            src="https://i.ibb.co/C3zkfpVR/Rauda-Logo-2-PNG.png"
            alt="Raudah Travels"
            className="h-8 w-auto"
          />
          <span className="font-heading text-sm font-semibold text-sidebar-foreground">
            Raudah Travels
          </span>
        </div>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            {t("dashboard.nav.menu")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="text-sm">{t(item.titleKey)}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9 border border-sidebar-border">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || "User"}
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">
              {t("dashboard.nav.pilgrim")}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {t("dashboard.nav.signOut")}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default DashboardSidebar;
