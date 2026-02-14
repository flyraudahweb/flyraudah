import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "@/data/packages";

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

  const statusColors: Record<string, string> = {
    pending: "bg-secondary/10 text-secondary",
    confirmed: "bg-primary/10 text-primary",
    cancelled: "bg-destructive/10 text-destructive",
    completed: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
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
          <Button className="gold-gradient text-secondary-foreground font-semibold" size="sm">
            {t("dashboard.bookings.newBooking")}
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <CalendarCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
              {t("dashboard.bookings.noBookings")}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
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
            return (
              <Card key={booking.id} className="border-border hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground truncate">
                          {pkg?.name || "Package"}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Ref: {booking.reference || booking.id.slice(0, 8)} • {pkg?.duration || "—"}
                        </p>
                        {pkg?.price && (
                          <p className="text-sm font-semibold text-secondary mt-1">
                            {formatPrice(pkg.price)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[booking.status] || ""}`}>
                        {booking.status}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(booking.created_at).toLocaleDateString()}
                      </p>
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
