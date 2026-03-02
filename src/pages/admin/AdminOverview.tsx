import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package, CalendarCheck, CreditCard, Users,
  ArrowUpRight, ArrowDownRight, ShieldCheck, ChevronRight
} from "lucide-react";
import { formatPrice } from "@/data/packages";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent
} from "@/components/ui/chart";
import {
  AreaChart, Area, XAxis, YAxis
} from "recharts";
import { format, subMonths, startOfMonth, subDays } from "date-fns";

const AdminOverview = () => {
  // Main stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysAgo = subDays(now, 7);
      const fourteenDaysAgo = subDays(now, 14);

      const [pkgRes, bookRes, payRes, agentRes, profileRes] = await Promise.all([
        supabase.from("packages").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id, status, created_at"),
        supabase.from("payments").select("amount, status, created_at"),
        supabase.from("agents").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      const totalRevenue = (payRes.data || [])
        .filter((p) => p.status === "verified")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const currentWeekPayments = (payRes.data || [])
        .filter(p => p.status === "verified" && new Date(p.created_at) >= sevenDaysAgo);
      const prevWeekPayments = (payRes.data || [])
        .filter(p => p.status === "verified" && new Date(p.created_at) >= fourteenDaysAgo && new Date(p.created_at) < sevenDaysAgo);

      const currentRev = currentWeekPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const prevRev = prevWeekPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      const revenueTrend = prevRev > 0
        ? `${Math.round(((currentRev - prevRev) / prevRev) * 100)}%`
        : (currentRev > 0 ? `+${formatPrice(currentRev)}` : "0%");

      const currentWeekBookings = (bookRes.data || [])
        .filter(b => b.status !== 'cancelled' && new Date(b.created_at) >= sevenDaysAgo).length;
      const prevWeekBookings = (bookRes.data || [])
        .filter(b => b.status !== 'cancelled' && new Date(b.created_at) >= fourteenDaysAgo && new Date(b.created_at) < sevenDaysAgo).length;

      const bookingTrend = prevWeekBookings > 0
        ? `${Math.round(((currentWeekBookings - prevWeekBookings) / prevWeekBookings) * 100)}%`
        : (currentWeekBookings > 0 ? `+${currentWeekBookings}` : "0%");

      const pendingPayments = (payRes.data || []).filter((p) => p.status === "pending").length;
      const totalBookings = bookRes.data?.length || 0;
      const confirmedBookings = (bookRes.data || []).filter((b) => b.status === "confirmed").length;

      return {
        packages: pkgRes.count || 0,
        totalBookings,
        confirmedBookings,
        totalRevenue,
        pendingPayments,
        agents: agentRes.count || 0,
        pilgrims: profileRes.count || 0,
        revenueTrend,
        bookingTrend,
        revUp: !revenueTrend.startsWith("-") && revenueTrend !== "0%",
        bookUp: !bookingTrend.startsWith("-") && bookingTrend !== "0%",
      };
    },
  });

  // Revenue trend (last 6 months)
  const { data: revenueTrend = [] } = useQuery({
    queryKey: ["admin-revenue-trend"],
    queryFn: async () => {
      const sixMonthsAgo = subMonths(new Date(), 5);
      const { data } = await supabase
        .from("payments")
        .select("amount, status, created_at")
        .eq("status", "verified")
        .gte("created_at", startOfMonth(sixMonthsAgo).toISOString());

      const months: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const m = subMonths(new Date(), i);
        months[format(m, "MMM")] = 0;
      }
      (data || []).forEach((p) => {
        const key = format(new Date(p.created_at), "MMM");
        if (key in months) months[key] += Number(p.amount);
      });

      return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
    },
  });

  // Recent bookings
  const { data: recentBookings = [] } = useQuery({
    queryKey: ["admin-recent-bookings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, full_name, reference, status, created_at, package_id")
        .order("created_at", { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  // Recent payments
  const { data: recentPayments = [] } = useQuery({
    queryKey: ["admin-recent-payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("id, amount, status, method, created_at, booking_id")
        .order("created_at", { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "confirmed":
      case "verified": return "default";
      case "pending": return "secondary";
      case "cancelled":
      case "rejected": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-4xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-3">
          <Link to="/admin/payments">
            <Button size="sm" className="rounded-xl font-semibold">
              Verify Payments
              {(stats?.pendingPayments || 0) > 0 && (
                <span className="ml-1.5 bg-white/20 text-white text-xs rounded-full px-1.5 py-0.5">
                  {stats?.pendingPayments}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </div>

      {/* Main layout: left content + right panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── LEFT MAIN COLUMN ── */}
        <div className="xl:col-span-2 space-y-5">

          {/* Overview card — big metrics */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-foreground mb-5">Overview</h2>
            <div className="grid grid-cols-2 gap-4">
              {/* Total Bookings */}
              <div className="bg-gray-50 rounded-xl p-5 shadow-inner">
                <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                  <CalendarCheck className="h-4 w-4" />
                  <span className="text-sm font-semibold">Total Bookings</span>
                </div>
                {statsLoading ? (
                  <div className="space-y-2 mt-2">
                    <Skeleton className="h-12 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-end gap-3">
                      <span className="text-5xl font-bold text-foreground tracking-tight">
                        {(stats?.totalBookings || 0).toLocaleString()}
                      </span>
                      {stats?.bookingTrend && (
                        <span className={`flex items-center gap-0.5 text-sm font-semibold mb-1.5 px-2 py-0.5 rounded-lg ${stats.bookUp
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-500"
                          }`}>
                          {stats.bookUp
                            ? <ArrowUpRight className="h-3.5 w-3.5" />
                            : <ArrowDownRight className="h-3.5 w-3.5" />}
                          {stats.bookingTrend}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">vs last week</p>
                  </>
                )}
              </div>

              {/* Total Revenue */}
              <div className="bg-gray-50 rounded-xl p-5 shadow-inner">
                <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-sm font-semibold">Total Revenue</span>
                </div>
                {statsLoading ? (
                  <div className="space-y-2 mt-2">
                    <Skeleton className="h-12 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-end gap-3">
                      <span className="text-5xl font-bold text-foreground tracking-tight">
                        {formatPrice(stats?.totalRevenue || 0)}
                      </span>
                      {stats?.revenueTrend && (
                        <span className={`flex items-center gap-0.5 text-sm font-semibold mb-1.5 px-2 py-0.5 rounded-lg ${stats.revUp
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-500"
                          }`}>
                          {stats.revUp
                            ? <ArrowUpRight className="h-3.5 w-3.5" />
                            : <ArrowDownRight className="h-3.5 w-3.5" />}
                          {stats.revenueTrend}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">vs last week</p>
                  </>
                )}
              </div>
            </div>

            {/* Secondary stats row */}
            <div className="grid grid-cols-4 gap-4 mt-8 pt-5 border-t border-border/50">
              <div className="text-center">
                {statsLoading ? <Skeleton className="h-8 w-12 mx-auto mb-1" /> : (
                  <p className="text-2xl font-bold text-foreground">{stats?.pilgrims || 0}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">Pilgrims</p>
              </div>
              <div className="text-center">
                {statsLoading ? <Skeleton className="h-8 w-12 mx-auto mb-1" /> : (
                  <p className="text-2xl font-bold text-foreground">{stats?.confirmedBookings || 0}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">Confirmed</p>
              </div>
              <div className="text-center">
                {statsLoading ? <Skeleton className="h-8 w-12 mx-auto mb-1" /> : (
                  <p className="text-2xl font-bold text-foreground">{stats?.agents || 0}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">Agents</p>
              </div>
              <div className="text-center">
                {statsLoading ? <Skeleton className="h-8 w-12 mx-auto mb-1" /> : (
                  <p className={`text-2xl font-bold ${(stats?.pendingPayments || 0) > 0 ? "text-amber-500" : "text-foreground"}`}>
                    {stats?.pendingPayments || 0}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">Pending Pay.</p>
              </div>
            </div>
          </div>

          {/* Revenue chart */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">Revenue Trend</h2>
              <span className="text-xs text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">Last 6 months</span>
            </div>
            <ChartContainer config={{ revenue: { label: "Revenue", color: "hsl(var(--primary))" } }} className="h-[220px] w-full">
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `₦${(v / 1000000).toFixed(0)}M`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatPrice(Number(value))} />} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revenueGrad)" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ChartContainer>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="space-y-5">

          {/* Recent Bookings */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-bold text-foreground mb-5">Recent Bookings</h2>

            {recentBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No bookings yet</p>
            ) : (
              <>
                <div className="divide-y divide-border/40">
                  {recentBookings.map((b) => (
                    <div key={b.id} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                      {/* Avatar thumbnail */}
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">
                          {b.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      </div>
                      {/* Name + reference */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate leading-tight">{b.full_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{b.reference || b.id.slice(0, 8)}</p>
                      </div>
                      {/* Status badge */}
                      <div className="shrink-0 text-right">
                        <Badge
                          variant={statusBadgeVariant(b.status)}
                          className="text-[10px] capitalize rounded-lg px-2 py-0.5"
                        >
                          {b.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Pill view-all button */}
                <div className="mt-4 pt-3 border-t border-border/30">
                  <Link to="/admin/pilgrims">
                    <button className="w-full text-sm text-muted-foreground font-medium py-2 rounded-xl border border-border/60 hover:border-border hover:text-foreground transition-all">
                      All bookings
                    </button>
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Recent Payments */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-bold text-foreground mb-5">Recent Payments</h2>

            {recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No payments yet</p>
            ) : (
              <>
                <div className="divide-y divide-border/40">
                  {recentPayments.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                      {/* Payment icon thumbnail */}
                      <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                        <CreditCard className="h-4 w-4 text-green-600" />
                      </div>
                      {/* Amount + method */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground leading-tight">{formatPrice(p.amount)}</p>
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">{p.method?.replace("_", " ")}</p>
                      </div>
                      {/* Status + verify */}
                      <div className="shrink-0 text-right space-y-1">
                        <Badge
                          variant={statusBadgeVariant(p.status)}
                          className="text-[10px] capitalize rounded-lg px-2 py-0.5"
                        >
                          {p.status}
                        </Badge>
                        {p.status === "pending" && (
                          <Link to="/admin/payments" className="block">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary ml-auto cursor-pointer hover:text-primary/70 transition-colors" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Pill view-all button */}
                <div className="mt-4 pt-3 border-t border-border/30">
                  <Link to="/admin/payments">
                    <button className="w-full text-sm text-muted-foreground font-medium py-2 rounded-xl border border-border/60 hover:border-border hover:text-foreground transition-all">
                      All payments
                    </button>
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Quick links */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-bold text-foreground mb-4">Quick Access</h2>
            <div className="space-y-2">
              {[
                { label: "Manage Packages", icon: Package, href: "/admin/packages", count: stats?.packages },
                { label: "View Pilgrims", icon: Users, href: "/admin/pilgrims", count: stats?.pilgrims },
                { label: "Agent Applications", icon: Users, href: "/admin/agent-applications" },
              ].map((item) => (
                <Link key={item.label} to={item.href}>
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.count !== undefined && (
                        <span className="text-xs font-semibold text-muted-foreground">{item.count}</span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
