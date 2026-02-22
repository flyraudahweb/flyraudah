import { Outlet, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "./AdminSidebar";
import AdminMobileBottomNav from "./AdminMobileBottomNav";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/notifications/NotificationBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AdminLayout = () => {
  const { profile } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "A";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="hidden md:flex" />
              <div className="md:hidden flex items-center gap-2">
                <img src="https://i.ibb.co/C3zkfpVR/Rauda-Logo-2-PNG.png" alt="Raudah" className="h-7 w-auto" />
                <span className="font-heading text-sm font-semibold text-foreground">Admin</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Link to="/dashboard/profile" title="My Profile">
                <Avatar className="h-8 w-8 border border-border cursor-pointer ring-offset-1 hover:ring-2 hover:ring-secondary/50 transition-all">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">{initials}</AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8 pb-20 md:pb-8 overflow-auto">
            <Outlet />
          </main>
        </div>

        <AdminMobileBottomNav />
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
