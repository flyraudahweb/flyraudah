import { Outlet, Link, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AgentSidebar from "./AgentSidebar";
import AgentMobileBottomNav from "./AgentMobileBottomNav";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/notifications/NotificationBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Lock, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const AgentLayout = () => {
  const { user, profile, signOut } = useAuth();

  const { data: agent, isLoading: loadingAgent } = useQuery({
    queryKey: ["agent-status-check", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("status, rating, is_premium")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "AG";

  const isGoldAgent = agent?.is_premium || agent?.rating === 5;

  if (loadingAgent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">Verifying account status...</p>
        </div>
      </div>
    );
  }

  // If no agent record exists or status is not active
  if (!agent || agent.status !== "active") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30">
        <Card className="max-w-md w-full border-destructive/20 shadow-lg">
          <CardContent className="pt-8 pb-8 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              {agent?.status === "suspended" ? (
                <Lock className="h-8 w-8 text-destructive" />
              ) : (
                <AlertCircle className="h-8 w-8 text-destructive" />
              )}
            </div>

            <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
              {agent?.status === "suspended" ? "Account Suspended" :
                agent?.status === "pending" ? "Account Pending Activation" :
                  "Access Restricted"}
            </h2>

            <p className="text-muted-foreground mb-8">
              {agent?.status === "suspended"
                ? "Your agent account has been suspended by an administrator. Please contact support for more information."
                : agent?.status === "pending"
                  ? "Your agent application is still being reviewed. You will receive an email once your account is activated."
                  : "We couldn't find an active agent profile associated with this account."}
            </p>

            <div className="flex flex-col gap-3">
              <Link to="/">
                <Button className="w-full bg-primary hover:bg-primary/90">Return to Home</Button>
              </Link>
              <Button variant="outline" onClick={() => signOut()} className="w-full">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className={`min-h-screen flex w-full text-foreground ${isGoldAgent ? 'bg-gradient-to-br from-background via-background to-amber-500/10' : 'bg-background'}`}>
        <AgentSidebar />

        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Subtle gold overlay for premium agents */}
          {isGoldAgent && (
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500 via-transparent to-transparent z-0"></div>
          )}

          <header className={`h-14 border-b flex items-center justify-between px-4 sticky top-0 z-40 ${isGoldAgent ? 'bg-background/80 backdrop-blur-md border-amber-500/20' : 'bg-card border-border'}`}>
            <div className="flex items-center gap-2">
              <SidebarTrigger className="hidden md:flex" />
              <div className="md:hidden flex items-center gap-2">
                <img src="/logo.png" alt="Raudah" className="h-7 w-auto" />
                <span className={`font-heading text-sm font-semibold ${isGoldAgent ? 'text-amber-500 drop-shadow-sm' : 'text-foreground'}`}>
                  {isGoldAgent ? 'Platinum Agent Portal' : 'Agent Portal'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Link to="/agent/profile" title="My Profile">
                <Avatar className={`h-8 w-8 border md:hidden cursor-pointer ring-offset-1 transition-all ${isGoldAgent ? 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)] ring-2 ring-amber-500/50' : 'border-border hover:ring-2 hover:ring-secondary/50'}`}>
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">{initials}</AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8 pb-20 md:pb-8 overflow-auto relative z-10">
            <Outlet context={{ isGoldAgent }} />
          </main>
        </div>

        <AgentMobileBottomNav />
      </div>
    </SidebarProvider>
  );
};

export default AgentLayout;

