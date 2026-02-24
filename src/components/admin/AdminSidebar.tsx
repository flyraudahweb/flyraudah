import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Package,
  CreditCard,
  Users,
  BarChart3,
  Barcode,
  UserPlus,
  Settings,
  LogOut,
  Building2,
  History,
  Headset,
  Pencil,
  ShieldCheck,
  FormInput,
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const ALL_MENU_ITEMS = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard, permission: "overview" },
  { title: "Packages", url: "/admin/packages", icon: Package, permission: "packages" },
  { title: "Payments", url: "/admin/payments", icon: CreditCard, permission: "payments" },
  { title: "Pilgrims", url: "/admin/pilgrims", icon: Users, permission: "pilgrims" },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3, permission: "analytics" },
  { title: "ID Tags", url: "/admin/id-tags", icon: Barcode, permission: "id_tags" },
  { title: "Agent Applications", url: "/admin/agent-applications", icon: UserPlus, permission: "agents" },
  { title: "Bank Accounts", url: "/admin/bank-accounts", icon: Building2, permission: "bank_accounts" },
  { title: "Activity", url: "/admin/activity", icon: History, permission: "activity" },
  { title: "Amendments", url: "/admin/amendments", icon: Pencil, permission: "amendments" },
  { title: "Support Tickets", url: "/admin/support", icon: Headset, permission: "support" },
  { title: "Staff Management", url: "/admin/staff", icon: ShieldCheck, permission: "staff_management" },
  { title: "Booking Form", url: "/admin/booking-form", icon: FormInput, permission: "settings" },
  { title: "Settings", url: "/admin/settings", icon: Settings, permission: "settings" },
];

const AdminSidebar = () => {
  const { profile, signOut, hasPermission, roles } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const isSuperAdmin = roles.includes("super_admin" as never);
  const isAdmin = roles.includes("admin");

  // Show role badge
  const roleBadge = isSuperAdmin ? "Super Admin" : isAdmin ? "Administrator" : "Staff";

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "A";

  // Filter visible menu items based on permissions
  const menuItems = ALL_MENU_ITEMS.filter((item) => hasPermission(item.permission));

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border sidebar-stripe-bg">
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border flex items-center gap-3 overflow-hidden">
          <img src="/logo.png" alt="Raudah" className="h-8 w-auto brightness-0 invert shrink-0" />
          {!collapsed && (
            <div>
              <span className="font-heading text-sm font-semibold text-sidebar-foreground">Raudah Admin</span>
              <span className="block text-xs text-sidebar-foreground/50">Management Console</span>
            </div>
          )}
        </div>

        <SidebarContent>
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
                Admin Menu
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            end={item.url === "/admin"}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                            activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            {!collapsed && <span className="text-sm">{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      {collapsed && (
                        <TooltipContent side="right" className="font-medium">
                          {item.title}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 mb-3 overflow-hidden">
            <Avatar className="h-9 w-9 border border-sidebar-border shrink-0">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-primary text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name || "Admin"}</p>
                <p className="text-xs text-sidebar-foreground/50">{roleBadge}</p>
              </div>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className={`w-full text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 ${collapsed ? "justify-center px-0" : "justify-start"}`}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="ml-2">Sign Out</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">Sign Out</TooltipContent>
            )}
          </Tooltip>
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
};

export default AdminSidebar;
