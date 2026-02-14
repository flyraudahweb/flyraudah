import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DashboardSidebar from "./DashboardSidebar";
import MobileBottomNav from "./MobileBottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const DashboardLayout = () => {
  const { profile } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden md:block">
          <DashboardSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="hidden md:flex" />
              <div className="md:hidden flex items-center gap-2">
                <img
                  src="https://i.ibb.co/C3zkfpVR/Rauda-Logo-2-PNG.png"
                  alt="Raudah"
                  className="h-7 w-auto"
                />
                <span className="font-heading text-sm font-semibold text-foreground">
                  Raudah
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Avatar className="h-8 w-8 border border-border md:hidden">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 pb-20 md:pb-8 overflow-auto">
            <Outlet />
          </main>
        </div>

        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
