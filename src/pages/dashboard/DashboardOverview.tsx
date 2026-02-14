import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalendarCheck, CreditCard, FileText, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { formatPrice } from "@/data/packages";

const DashboardOverview = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();

  const { data: bookings = [] } = useQuery({
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
        .select("amount, status, booking_id")
        .in(
          "booking_id",
          bookings.map((b) => b.id)
        );
      if (error) throw error;
      return data || [];
    },
    enabled: bookings.length > 0,
  });

  const activeBookings = bookings.filter((b) => b.status !== "cancelled").length;
  const totalPaid = payments
    .filter((p) => p.status === "verified")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const stats = [
    {
      label: t("dashboard.stats.activeBookings"),
      value: String(activeBookings),
      icon: CalendarCheck,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: t("dashboard.stats.totalPaid"),
      value: formatPrice(totalPaid),
      icon: CreditCard,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    {
      label: t("dashboard.stats.documents"),
      value: "0",
      icon: FileText,
      color: "text-muted-foreground",
      bg: "bg-muted",
    },
    {
      label: t("dashboard.stats.packages"),
      value: String(bookings.length),
      icon: Package,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
          {t("dashboard.welcome")}
          {profile?.full_name ? `, ${profile.full_name}` : ""}! 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("dashboard.welcomeSubtitle")}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                  <p className="text-lg md:text-xl font-heading font-bold text-foreground truncate">
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="border-border">
        <CardContent className="p-5 md:p-6">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
            {t("dashboard.quickActions")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link to="/dashboard/packages">
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-center gap-2 border-secondary/30 hover:bg-secondary/5 hover:border-secondary/50"
              >
                <Package className="h-5 w-5 text-secondary" />
                <span className="text-sm font-medium">{t("dashboard.actions.browsePackages")}</span>
              </Button>
            </Link>
            <Link to="/dashboard/bookings">
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-center gap-2 border-secondary/30 hover:bg-secondary/5 hover:border-secondary/50"
              >
                <CalendarCheck className="h-5 w-5 text-secondary" />
                <span className="text-sm font-medium">{t("dashboard.actions.viewBookings")}</span>
              </Button>
            </Link>
            <Link to="/dashboard/payments">
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-center gap-2 border-secondary/30 hover:bg-secondary/5 hover:border-secondary/50"
              >
                <CreditCard className="h-5 w-5 text-secondary" />
                <span className="text-sm font-medium">{t("dashboard.actions.paymentHistory")}</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Bookings */}
      <Card className="border-border">
        <CardContent className="p-5 md:p-6">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
            {t("dashboard.recentBookings")}
          </h2>
          {bookings.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">{t("dashboard.noBookings")}</p>
              <Link to="/dashboard/packages">
                <Button className="mt-4 gold-gradient text-secondary-foreground font-semibold" size="sm">
                  {t("dashboard.actions.browsePackages")}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.slice(0, 3).map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {(booking as any).packages?.name || "Package"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ref: {booking.reference || booking.id.slice(0, 8)}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      booking.status === "confirmed"
                        ? "bg-primary/10 text-primary"
                        : booking.status === "cancelled"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-secondary/10 text-secondary"
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardOverview;
