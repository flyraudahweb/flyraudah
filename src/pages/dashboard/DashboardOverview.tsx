import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarCheck, CreditCard, FileText, Package, ArrowUpRight,
  TrendingUp, Sparkles, Clock, CheckCircle2, XCircle, Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { formatPrice } from "@/data/packages";

const statusConfig: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  confirmed: { label: "Confirmed", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock },
  cancelled: { label: "Cancelled", className: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
  completed: { label: "Completed", className: "bg-primary/10 text-primary border-primary/20", icon: CheckCircle2 },
};

const DashboardOverview = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["user-bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, packages(name, type, category, price)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["user-payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("amount, status, booking_id, created_at")
        .in("booking_id", bookings.map((b) => b.id));
      if (error) throw error;
      return data || [];
    },
    enabled: bookings.length > 0,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["user-documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents").select("id").eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const activeBookings = bookings.filter((b) => b.status !== "cancelled").length;
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed").length;
  const totalPaid = payments.filter((p) => p.status === "verified").reduce((sum, p) => sum + Number(p.amount), 0);
  const totalAmount = bookings.reduce((sum, b) => sum + Number((b as any).packages?.price || 0), 0);
  const outstanding = Math.max(0, totalAmount - totalPaid);
  const pendingPayments = payments.filter((p) => p.status === "pending").length;

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 17 ? "Good afternoon" : "Good evening";

  const stats = [
    {
      label: "Active Bookings",
      value: String(activeBookings),
      sub: `${confirmedBookings} confirmed`,
      icon: CalendarCheck,
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
    },
    {
      label: "Total Paid",
      value: formatPrice(totalPaid),
      sub: outstanding > 0 ? `${formatPrice(outstanding)} outstanding` : "All paid ✓",
      icon: CreditCard,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      label: "My Documents",
      value: String(documents.length),
      sub: "Uploaded files",
      icon: FileText,
      color: "text-sky-600",
      bg: "bg-sky-500/10",
      border: "border-sky-500/20",
    },
    {
      label: "Total Bookings",
      value: String(bookings.length),
      sub: `${pendingPayments} pending payment`,
      icon: Package,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
  ];

  const quickActions = [
    { label: "Browse Packages", href: "/dashboard/packages", icon: Package, color: "from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40", iconColor: "text-primary" },
    { label: "My Bookings", href: "/dashboard/bookings", icon: CalendarCheck, color: "from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40", iconColor: "text-amber-600" },
    { label: "Make Payment", href: "/dashboard/payments", icon: Zap, color: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40", iconColor: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-6 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm font-medium">{greeting} 👋</p>
            <h1 className="font-heading text-2xl md:text-3xl font-bold mt-0.5">
              {profile?.full_name || "Pilgrim"}
            </h1>
            <p className="text-white/70 text-sm mt-1">
              {activeBookings > 0
                ? `You have ${activeBookings} active booking${activeBookings !== 1 ? "s" : ""}`
                : "Start your Hajj & Umrah journey today"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {outstanding > 0 && (
              <Link to="/dashboard/payments">
                <Button size="sm" className="bg-white text-primary hover:bg-white/90 font-semibold gap-1.5 shadow-md">
                  <CreditCard className="h-3.5 w-3.5" />
                  Pay {formatPrice(outstanding)}
                </Button>
              </Link>
            )}
            <Link to="/dashboard/packages">
              <Button size="sm" className="bg-white/20 text-white border border-white/40 hover:bg-white/30 font-semibold gap-1.5 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Explore
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {loadingBookings
          ? Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
          : stats.map((stat) => (
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
                <div className={`w-10 h-10 rounded-full bg-background/80 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                  <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                </div>
                <span className="text-xs font-medium text-foreground text-center leading-tight">{action.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Bookings */}
      <Card className="border-border/60 bg-background/50 backdrop-blur-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="font-heading text-base font-semibold">Recent Bookings</CardTitle>
          {bookings.length > 0 && (
            <Link to="/dashboard/bookings">
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1 hover:text-foreground">
                View all <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {loadingBookings ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Package className="h-7 w-7 text-primary/40" />
              </div>
              <p className="font-medium text-foreground text-sm">{t("dashboard.noBookings")}</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Find your perfect Hajj or Umrah package</p>
              <Link to="/dashboard/packages">
                <Button size="sm" className="gold-gradient text-secondary-foreground font-semibold">
                  Browse Packages
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {bookings.slice(0, 4).map((booking) => {
                const sc = statusConfig[booking.status] || statusConfig.pending;
                const StatusIcon = sc.icon;
                return (
                  <div key={booking.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sc.className.split(" ").slice(0, 2).join(" ")}`}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {(booking as any).packages?.name || "Package"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ref: {booking.reference || booking.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className={`text-[10px] px-2 py-0 border ${sc.className}`}>
                        {sc.label}
                      </Badge>
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
    </div>
  );
};

export default DashboardOverview;
