import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarCheck, Package, CheckCircle2, Clock, XCircle, Zap, Plus
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "@/data/packages";

const statusConfig: Record<string, { label: string; className: string; icon: typeof CheckCircle2; bg: string }> = {
  confirmed: { label: "Confirmed", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", bg: "bg-emerald-500/10", icon: CheckCircle2 },
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-600 border-amber-500/20", bg: "bg-amber-500/10", icon: Clock },
  cancelled: { label: "Cancelled", className: "bg-red-500/10 text-red-600 border-red-500/20", bg: "bg-red-500/10", icon: XCircle },
  completed: { label: "Completed", className: "bg-primary/10 text-primary border-primary/20", bg: "bg-primary/10", icon: CheckCircle2 },
};

const DashboardBookings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["user-bookings-full", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, packages(name, type, category, price, duration)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["user-payments-bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("amount, status, booking_id")
        .in("booking_id", bookings.map((b) => b.id));
      if (error) throw error;
      return data || [];
    },
    enabled: bookings.length > 0,
  });

  const active = bookings.filter((b) => b.status !== "cancelled").length;
  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const pending = bookings.filter((b) => b.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {t("dashboard.bookings.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("dashboard.bookings.subtitle")}
          </p>
        </div>
        <Link to="/dashboard/packages">
          <Button className="gold-gradient text-secondary-foreground font-semibold gap-1.5" size="sm">
            <Plus className="h-4 w-4" />
            {t("dashboard.bookings.newBooking")}
          </Button>
        </Link>
      </div>

      {/* Quick summary pills */}
      {!isLoading && bookings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 text-xs font-medium text-foreground">
            <CalendarCheck className="h-3 w-3 text-primary" />
            {active} active
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            {confirmed} confirmed
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-xs font-medium text-amber-600">
            <Clock className="h-3 w-3" />
            {pending} pending
          </span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : bookings.length === 0 ? (
        <Card className="border-border/60 bg-background/50">
          <CardContent className="py-14 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-4">
              <CalendarCheck className="h-8 w-8 text-primary/40" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
              {t("dashboard.bookings.noBookings")}
            </h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs">
              {t("dashboard.bookings.noBookingsDesc")}
            </p>
            <Link to="/dashboard/packages">
              <Button className="gold-gradient text-secondary-foreground font-semibold">
                {t("dashboard.actions.browsePackages")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const pkg = (booking as any).packages;
            const bookingTotal = Number(pkg?.price || 0);
            const bookingPayments = payments.filter((p) => p.booking_id === booking.id);
            const bookingPaid = bookingPayments
              .filter((p) => p.status === "verified")
              .reduce((sum, p) => sum + Number(p.amount), 0);
            const outstanding = Math.max(0, bookingTotal - bookingPaid);
            const paidPercent = bookingTotal > 0 ? Math.min(100, Math.round((bookingPaid / bookingTotal) * 100)) : 0;
            const sc = statusConfig[booking.status] || statusConfig.pending;
            const StatusIcon = sc.icon;

            return (
              <Card key={booking.id} className="border-border/60 bg-background/50 backdrop-blur-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-start gap-3">
                    {/* Status icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${sc.bg}`}>
                      <StatusIcon className="h-5 w-5" style={{ color: sc.className.split(" ").find(c => c.startsWith("text-"))?.replace("text-", "") }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{pkg?.name || "Package"}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Ref: {booking.reference || booking.id.slice(0, 8).toUpperCase()}
                            {pkg?.duration && ` • ${pkg.duration}`}
                            {" • "}{new Date(booking.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] px-2 py-0 border shrink-0 ${sc.className}`}>
                          {sc.label}
                        </Badge>
                      </div>

                      {/* Payment progress */}
                      {bookingTotal > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">
                              Paid: <span className="font-semibold text-foreground">{formatPrice(bookingPaid)}</span>
                              {" / "}<span className="text-muted-foreground">{formatPrice(bookingTotal)}</span>
                            </span>
                            <span className={outstanding > 0 ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>
                              {outstanding > 0 ? `${formatPrice(outstanding)} left` : "Fully paid ✓"}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${paidPercent >= 100 ? "bg-emerald-500" : "bg-secondary"}`}
                              style={{ width: `${paidPercent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Pay now CTA for pending/confirmed with outstanding */}
                      {outstanding > 0 && booking.status !== "cancelled" && (
                        <Link to="/dashboard/payments" className="mt-3 inline-flex">
                          <Button size="sm" className="h-7 text-xs gap-1.5 gold-gradient text-secondary-foreground font-semibold">
                            <Zap className="h-3 w-3" />
                            Pay {formatPrice(outstanding)}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DashboardBookings;
