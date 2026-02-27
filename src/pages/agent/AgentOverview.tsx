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
  Building2, Phone, Mail, Star, Sparkles, Wallet
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import { Link, useOutletContext } from "react-router-dom";
import { formatPrice } from "@/data/packages";
import { differenceInMonths, differenceInDays, parseISO } from "date-fns";

const statusConfig: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  confirmed: { label: "Confirmed", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock },
  cancelled: { label: "Cancelled", className: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
  completed: { label: "Completed", className: "bg-primary/10 text-primary border-primary/20", icon: CheckCircle2 },
};



const AgentOverview = () => {
  const { user } = useAuth();
  const context = useOutletContext<{ isGoldAgent?: boolean }>();
  const isGoldAgent = context?.isGoldAgent || false;

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

  // Wallet balance
  const { data: walletData } = useQuery({
    queryKey: ["agent-wallet-overview", agent?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_wallets" as any)
        .select("balance")
        .eq("agent_id", agent!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as any) || { balance: 0 };
    },
    enabled: !!agent?.id,
  });
  const walletBalance = Number(walletData?.balance || 0);

  // Passport Watchlist (Upcoming expiries)
  const { data: watchlist = [] } = useQuery({
    queryKey: ["agent-passport-watchlist", agent?.id],
    queryFn: async () => {
      const nineMonthsFromNow = new Date();
      nineMonthsFromNow.setMonth(nineMonthsFromNow.getMonth() + 9);

      const { data, error } = await supabase
        .from("agent_clients")
        .select("id, full_name, passport_number, passport_expiry")
        .eq("agent_id", agent!.id)
        .lte("passport_expiry", nineMonthsFromNow.toISOString().split("T")[0])
        .order("passport_expiry", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!agent?.id,
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

  if (!user || loadingAgent) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
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
      <div className={`relative overflow-hidden rounded-2xl ${isGoldAgent ? 'bg-gradient-to-r from-amber-600 via-amber-500/90 to-amber-700' : 'bg-gradient-to-r from-primary via-primary/90 to-primary/80'} p-6 text-white shadow-lg`}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-white/80 text-sm font-medium">{greeting} 👋</p>
              {agent.rating === 5 && (
                <span className="inline-flex flex-row items-center gap-0.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-semibold shadow-sm border border-white/10 shrink-0 mt-[-0.5rem] mr-[-0.5rem] sm:mt-0 sm:mr-0 z-10 w-fit self-end">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-yellow-300 text-yellow-300" />
                  ))}
                </span>
              )}
            </div>
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

      {/* Premium Wallet Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-6 shadow-sm group hover:shadow-md transition-all">
        {/* Animated Background Gradients & Stripes */}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(var(--primary-rgb),0.02)_10px,rgba(var(--primary-rgb),0.02)_20px)]"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors duration-500"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center border border-primary/20 shadow-inner shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_4px,rgba(255,255,255,0.1)_4px,rgba(255,255,255,0.1)_8px)] opacity-50 mix-blend-overlay"></div>
              <Wallet className="w-7 h-7 text-primary relative z-10" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Wallet Balance</p>
              <h2 className="text-4xl font-heading font-black text-foreground tracking-tight drop-shadow-sm">
                {formatPrice(walletBalance)}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Ready for instant booking deductions
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link to="/agent/transactions">
              <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors">
                <TrendingUp className="w-4 h-4" />
                History
              </Button>
            </Link>
            <Link to="/agent/packages">
              <Button className="gap-2 shadow-sm">
                <ArrowUpRight className="w-4 h-4" />
                Book Now
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
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

        {/* Interactive Passport Watchlist */}
        <Card className="border-border/60 bg-background/50 backdrop-blur-sm shadow-sm overflow-hidden group">
          <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/40 bg-muted/20">
            <CardTitle className="font-heading text-base font-bold flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </div>
              Passport Watchlist
            </CardTitle>
            <Badge variant="outline" className="text-[10px] bg-background/50">
              {watchlist.length} Expiries
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {watchlist.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 bg-emerald-500/5 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500/40" />
                </div>
                <p className="text-xs text-muted-foreground italic">All client passports are valid and healthy.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {watchlist.slice(0, 3).map((client) => {
                  const expiry = parseISO(client.passport_expiry);
                  const daysRemaining = differenceInDays(expiry, new Date());
                  const monthsRemaining = differenceInMonths(expiry, new Date());

                  // Validity % based on 10 years (approx 3650 days) - just for visual effect
                  // A more realistic validity for "tracking" might be "How close is it to the 6-7 month limit?"
                  const validityPercent = Math.max(0, Math.min(100, (daysRemaining / 365) * 100)); // normalized to 1 year for visual progress

                  let colorClass = "text-emerald-500 stroke-emerald-500";
                  let bgClass = "bg-emerald-500/10";
                  if (daysRemaining < 210) { // < 7 months
                    colorClass = "text-red-500 stroke-red-500 animate-pulse-slow";
                    bgClass = "bg-red-500/10";
                  } else if (daysRemaining < 270) { // < 9 months
                    colorClass = "text-amber-500 stroke-amber-500";
                    bgClass = "bg-amber-500/10";
                  }

                  return (
                    <div key={client.id} className="p-4 flex items-center justify-between group/item hover:bg-muted/30 transition-all">
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Circular Progress Indicator */}
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <svg className="w-full h-full -rotate-90">
                            <circle
                              cx="24" cy="24" r="20"
                              fill="transparent"
                              stroke="currentColor"
                              strokeWidth="3"
                              className="text-muted/10"
                            />
                            <circle
                              cx="24" cy="24" r="20"
                              fill="transparent"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeDasharray={126}
                              strokeDashoffset={126 - (126 * validityPercent) / 100}
                              strokeLinecap="round"
                              className={`${colorClass}`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-[10px] font-bold ${colorClass.split(' ')[0]}`}>
                              {monthsRemaining}m
                            </span>
                          </div>
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate group-hover/item:text-primary transition-colors">
                            {client.full_name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-muted-foreground font-mono">{client.passport_number}</p>
                            <span className="text-[10px] text-muted-foreground/40">•</span>
                            <p className={`text-[10px] font-medium ${daysRemaining < 210 ? 'text-red-500' : 'text-muted-foreground'}`}>
                              {daysRemaining} days left
                            </p>
                          </div>
                        </div>
                      </div>

                      <Link to="/agent/clients">
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
            {watchlist.length > 3 && (
              <div className="p-3 border-t border-border/40 bg-muted/10 group-hover:bg-muted/20 transition-colors">
                <Link to="/agent/clients" className="flex items-center justify-center gap-1.5 text-xs text-primary font-semibold hover:underline">
                  View full watchlist ({watchlist.length})
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
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
