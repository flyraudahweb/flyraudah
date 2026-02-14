import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package, CalendarCheck, CreditCard, Users, TrendingUp, UserCheck,
  ArrowUpRight, ArrowDownRight, Bot, Eye, CheckCircle2, ShieldCheck
} from "lucide-react";
import { formatPrice } from "@/data/packages";
import { Link } from "react-router-dom";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent
} from "@/components/ui/chart";
import {
  AreaChart, Area, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer
} from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";

const AdminOverview = () => {
  // Main stats
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [pkgRes, bookRes, payRes, agentRes, profileRes] = await Promise.all([
        supabase.from("packages").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id, status", { count: "exact" }),
        supabase.from("payments").select("amount, status"),
        supabase.from("agents").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      const totalRevenue = (payRes.data || [])
        .filter((p) => p.status === "verified")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const pendingPayments = (payRes.data || []).filter((p) => p.status === "pending").length;
      const totalBookings = bookRes.count || 0;
      const confirmedBookings = (bookRes.data || []).filter((b) => b.status === "confirmed").length;
      const activeBookings = (bookRes.data || []).filter((b) => b.status !== "cancelled").length;
      const conversionRate = totalBookings > 0 ? Math.round((confirmedBookings / totalBookings) * 100) : 0;

      return {
        packages: pkgRes.count || 0,
        totalBookings,
        activeBookings,
        confirmedBookings,
        totalRevenue,
        pendingPayments,
        agents: agentRes.count || 0,
        pilgrims: profileRes.count || 0,
        conversionRate,
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

  // Booking status breakdown
  const { data: bookingBreakdown = [] } = useQuery({
    queryKey: ["admin-booking-breakdown"],
    queryFn: async () => {
      const { data } = await supabase.from("bookings").select("status");
      const counts: Record<string, number> = { pending: 0, confirmed: 0, cancelled: 0, completed: 0 };
      (data || []).forEach((b) => { counts[b.status] = (counts[b.status] || 0) + 1; });
      return Object.entries(counts)
        .filter(([, v]) => v > 0)
        .map(([status, count]) => ({ status, count }));
    },
  });

  // Package type split
  const { data: packageSplit = [] } = useQuery({
    queryKey: ["admin-package-split"],
    queryFn: async () => {
      const { data } = await supabase.from("packages").select("type");
      const counts: Record<string, number> = {};
      (data || []).forEach((p) => { counts[p.type] = (counts[p.type] || 0) + 1; });
      return Object.entries(counts).map(([type, count]) => ({ type: type.charAt(0).toUpperCase() + type.slice(1), count }));
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
        .limit(5);
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
        .limit(5);
      return data || [];
    },
  });

  const statCards = [
    { label: "Total Revenue", value: formatPrice(stats?.totalRevenue || 0), icon: CreditCard, color: "text-primary", bg: "bg-primary/10", trend: "+12%", up: true },
    { label: "Total Bookings", value: String(stats?.totalBookings || 0), icon: CalendarCheck, color: "text-secondary", bg: "bg-secondary/10", trend: "+8%", up: true },
    { label: "Active Pilgrims", value: String(stats?.confirmedBookings || 0), icon: UserCheck, color: "text-primary", bg: "bg-primary/10" },
    { label: "Pending Payments", value: String(stats?.pendingPayments || 0), icon: CreditCard, color: "text-destructive", bg: "bg-destructive/10", urgent: (stats?.pendingPayments || 0) > 0 },
    { label: "Total Agents", value: String(stats?.agents || 0), icon: Users, color: "text-secondary", bg: "bg-secondary/10" },
    { label: "Conversion Rate", value: `${stats?.conversionRate || 0}%`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
  ];

  const statusColors: Record<string, string> = {
    pending: "hsl(43, 72%, 52%)",
    confirmed: "hsl(162, 90%, 17%)",
    cancelled: "hsl(0, 84%, 60%)",
    completed: "hsl(162, 70%, 25%)",
  };

  const pieColors = ["hsl(162, 90%, 17%)", "hsl(43, 72%, 52%)"];

  const quickActions = [
    { label: "Manage Packages", icon: Package, href: "/admin/packages", color: "bg-primary/10 text-primary" },
    { label: "Verify Payments", icon: CheckCircle2, href: "/admin/payments", color: "bg-destructive/10 text-destructive" },
    { label: "View Pilgrims", icon: Eye, href: "/admin/pilgrims", color: "bg-secondary/10 text-secondary" },
    { label: "AI Assistant", icon: Bot, href: "/admin/ai-assistant", color: "bg-primary/10 text-primary" },
  ];

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
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your Hajj & Umrah operations</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {statCards.map((c) => (
          <Card key={c.label} className="border-border relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-lg ${c.bg}`}>
                  <c.icon className={`h-4 w-4 ${c.color}`} />
                </div>
                {c.urgent && (
                  <span className="flex h-2 w-2 rounded-full bg-destructive animate-pulse" />
                )}
                {c.trend && (
                  <span className={`flex items-center text-xs font-medium ${c.up ? "text-primary" : "text-destructive"}`}>
                    {c.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {c.trend}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{c.label}</p>
              <p className="text-lg font-heading font-bold text-foreground truncate">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ revenue: { label: "Revenue", color: "hsl(var(--primary))" } }} className="h-[200px] w-full">
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `₦${(v / 1000000).toFixed(0)}M`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatPrice(Number(value))} />} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revenueGrad)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Booking Status Donut */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Booking Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={bookingBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
                    {bookingBreakdown.map((entry) => (
                      <Cell key={entry.status} fill={statusColors[entry.status] || "hsl(var(--muted))"} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {bookingBreakdown.map((entry) => (
                <div key={entry.status} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ background: statusColors[entry.status] }} />
                  <span className="capitalize text-muted-foreground">{entry.status}</span>
                  <span className="font-medium text-foreground">{entry.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Package Split + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Package Types</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={packageSplit} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={55} paddingAngle={4}>
                    {packageSplit.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-2">
              {packageSplit.map((entry, i) => (
                <div key={entry.type} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ background: pieColors[i % pieColors.length] }} />
                  <span className="text-muted-foreground">{entry.type}</span>
                  <span className="font-medium text-foreground">{entry.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((a) => (
                <Link key={a.label} to={a.href}>
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer text-center">
                    <div className={`p-2.5 rounded-lg ${a.color}`}>
                      <a.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-foreground">{a.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Bookings */}
        <Card className="border-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-heading">Recent Bookings</CardTitle>
            <Link to="/admin/pilgrims">
              <Button variant="ghost" size="sm" className="text-xs">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No bookings yet</p>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{b.full_name}</p>
                      <p className="text-xs text-muted-foreground">{b.reference || b.id.slice(0, 8)}</p>
                    </div>
                    <Badge variant={statusBadgeVariant(b.status)} className="text-[10px] capitalize shrink-0">
                      {b.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="border-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-heading">Recent Payments</CardTitle>
            <Link to="/admin/payments">
              <Button variant="ghost" size="sm" className="text-xs">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No payments yet</p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{formatPrice(p.amount)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{p.method.replace("_", " ")}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={statusBadgeVariant(p.status)} className="text-[10px] capitalize">
                        {p.status}
                      </Badge>
                      {p.status === "pending" && (
                        <Link to="/admin/payments">
                          <ShieldCheck className="h-4 w-4 text-primary cursor-pointer" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;
