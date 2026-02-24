import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Package, CreditCard, PiggyBank, TrendingUp,
  ArrowUpRight, CheckCircle2, Clock, XCircle, AlertCircle,
  Building2, Phone, Mail, Star, Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "@/data/packages";

const statusConfig: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  confirmed: { label: "Confirmed", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock },
  cancelled: { label: "Cancelled", className: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
  completed: { label: "Completed", className: "bg-primary/10 text-primary border-primary/20", icon: CheckCircle2 },
};

const AgentOverview = () => {
  const { user } = useAuth();

  // Agent profile
  const { data: agent, isLoading: loadingAgent } = useQuery({
    queryKey: ["agent-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agents")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Client count
  const { data: clientCount = 0 } = useQuery({
    queryKey: ["agent-clients-count", agent?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("agent_clients")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", agent!.id);
      return count || 0;
    },
    enabled: !!agent?.id,
  });

  // Bookings made by this agent (with package price for revenue calc)
  const { data: agentBookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["agent-bookings", agent?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, status, full_name, reference, created_at, packages(name, price)")
        .eq("agent_id", agent!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!agent?.id,
  });

  // Payments for agent bookings
  const { data: agentPayments = [] } = useQuery({
    queryKey: ["agent-payments", agent?.id],
    queryFn: async () => {
      if (!agentBookings.length) return [];
      const { data } = await supabase
        .from("payments")
        .select("amount, status, booking_id")
        .in("booking_id", agentBookings.map((b) => b.id));
      return data || [];
    },
    enabled: agentBookings.length > 0,
  });

  // Computed stats
  const activeBookings = agentBookings.filter((b) => b.status !== "cancelled").length;
  const confirmedBookings = agentBookings.filter((b) => b.status === "confirmed" || b.status === "completed").length;
  const totalRevenue = agentBookings.reduce((sum, b) => sum + Number((b as any).packages?.price || 0), 0);
  const commissionRate = Number(agent?.commission_rate || 0);
  const commissionType = agent?.commission_type ?? "percentage";

  const commissionEarned = agentPayments
    .filter((p) => p.status === "verified")
    .reduce((sum, p) => {
      const amount = Number(p.amount);
      const booking = agentBookings.find(b => b.id === p.booking_id);
      const retailPrice = Number((booking as any)?.packages?.price || 0);

      if (commissionType === "fixed") {
        return sum + Math.min(retailPrice, commissionRate);
      }
      // For percentage, if amount is wholesale, commission is actually (retail - amount)
      // but let's keep it simple and just cap it at retail price.
      return sum + Math.min(retailPrice, (retailPrice * commissionRate / 100));
    }, 0);

  const pendingRevenue = agentPayments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => {
      const amount = Number(p.amount);
      const booking = agentBookings.find(b => b.id === p.booking_id);
      const retailPrice = Number((booking as any)?.packages?.price || 0);

      if (commissionType === "fixed") {
        return sum + Math.min(retailPrice, commissionRate);
      }
      return sum + Math.min(retailPrice, (retailPrice * commissionRate / 100));
    }, 0);

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 17 ? "Good afternoon" : "Good evening";

  const stats = [
    {
      label: "Total Clients",
      value: String(clientCount),
      sub: "Registered clients",
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
    },
    {
      label: "Active Bookings",
      value: String(activeBookings),
      sub: `${confirmedBookings} confirmed`,
      icon: Package,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      label: "Commission Earned",
      value: formatPrice(commissionEarned),
      sub: commissionType === "fixed" ? `${formatPrice(commissionRate)} fixed` : `${commissionRate}% rate`,
      icon: PiggyBank,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      label: "Pending Commission",
      value: formatPrice(pendingRevenue),
      sub: "Awaiting verification",
      icon: TrendingUp,
      color: "text-sky-600",
      bg: "bg-sky-500/10",
      border: "border-sky-500/20",
    },
  ];

  const quickActions = [
    { label: "My Clients", href: "/agent/clients", icon: Users, color: "from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40", iconColor: "text-primary" },
    { label: "Packages", href: "/agent/packages", icon: Package, color: "from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40", iconColor: "text-amber-600" },
    { label: "Commissions", href: "/agent/commissions", icon: PiggyBank, color: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40", iconColor: "text-emerald-600" },
  ];

  if (loadingAgent) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Agent Dashboard</h1>
        </div>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Agent Profile Not Activated</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your agent account is pending setup. Please contact an administrator to activate your account.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-6 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-white/70 text-sm font-medium">{greeting} 👋</p>
            <h1 className="font-heading text-2xl font-bold mt-0.5">{agent.contact_person || "Agent"}</h1>
            <p className="text-white/80 text-sm mt-0.5">{agent.business_name}</p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">
                <Star className="h-3 w-3 fill-white" />
                {agent.agent_code}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${agent.status === "active" ? "bg-emerald-500/30 text-white" :
                agent.status === "pending" ? "bg-amber-500/30 text-white" :
                  "bg-red-500/30 text-white"
                }`}>
                {agent.status}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">
                {commissionType === "fixed" ? `${formatPrice(commissionRate)} fixed` : `${commissionRate}% commission`}
              </span>
            </div>
          </div>
          <Link to="/agent/clients">
            <Button size="sm" className="bg-white text-primary hover:bg-white/90 font-semibold gap-1.5 shadow-md shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
              Book for Client
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className={`border ${stat.border} bg-background/50 backdrop-blur-sm hover:-translate-y-1 transition-all duration-300`}>
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className="text-xl font-heading font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{stat.label}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link to={action.href} key={action.href}>
              <div className={`group flex flex-col items-center gap-2.5 p-4 rounded-xl bg-gradient-to-br border ${action.color} transition-all duration-200 cursor-pointer hover:shadow-md`}>
                <div className="w-10 h-10 rounded-full bg-background/80 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                </div>
                <span className="text-xs font-medium text-foreground text-center leading-tight">{action.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Bookings */}
        <Card className="lg:col-span-2 border-border/60 bg-background/50 backdrop-blur-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="font-heading text-base font-semibold">Recent Bookings</CardTitle>
            {agentBookings.length > 0 && (
              <Link to="/agent/bookings">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1 hover:text-foreground">
                  View all <ArrowUpRight className="h-3 w-3" />
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {loadingBookings ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
            ) : agentBookings.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Package className="h-7 w-7 text-primary/40" />
                </div>
                <p className="font-medium text-sm">No bookings yet</p>
                <p className="text-xs text-muted-foreground mt-1">Book a package for one of your clients</p>
              </div>
            ) : (
              <div className="space-y-2">
                {agentBookings.slice(0, 5).map((booking) => {
                  const sc = statusConfig[booking.status] || statusConfig.pending;
                  const StatusIcon = sc.icon;
                  return (
                    <div key={booking.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sc.className.split(" ").slice(0, 2).join(" ")}`}>
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{booking.full_name || (booking as any).packages?.name || "Booking"}</p>
                        <p className="text-xs text-muted-foreground">{booking.reference || booking.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="outline" className={`text-[10px] px-2 py-0 border ${sc.className}`}>{sc.label}</Badge>
                        {(booking as any).packages?.price && (
                          <p className="text-xs text-muted-foreground mt-1">{formatPrice((booking as any).packages.price)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Details Card */}
        <Card className="border-border/60 bg-background/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-secondary" />
              Business Info
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="space-y-2 text-sm">
              {[
                { icon: Building2, label: agent.business_name },
                { icon: Mail, label: agent.email },
                { icon: Phone, label: agent.phone },
                { icon: CreditCard, label: commissionType === "fixed" ? `${formatPrice(commissionRate)}/booking` : `${commissionRate}% commission` },
              ].map((item, i) => item.label && (
                <div key={i} className="flex items-center gap-2 text-foreground">
                  <item.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate text-xs">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-border/40">
              <p className="text-xs text-muted-foreground mb-2">Total Revenue Generated</p>
              <p className="text-lg font-heading font-bold text-foreground">{formatPrice(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your share: <span className="text-primary font-medium">{formatPrice(commissionEarned)}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgentOverview;
