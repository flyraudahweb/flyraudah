import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { formatPrice } from "@/data/packages";

const DashboardPayments = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["user-payments-full", user?.id],
    queryFn: async () => {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id")
        .eq("user_id", user!.id);
      if (!bookings?.length) return [];

      const { data, error } = await supabase
        .from("payments")
        .select("*, bookings(reference, packages(name))")
        .in("booking_id", bookings.map((b) => b.id))
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const statusColors: Record<string, string> = {
    pending: "bg-secondary/10 text-secondary",
    verified: "bg-primary/10 text-primary",
    rejected: "bg-destructive/10 text-destructive",
    refunded: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {t("dashboard.payments.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("dashboard.payments.subtitle")}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
              {t("dashboard.payments.noPayments")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.payments.noPaymentsDesc")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => {
            const booking = (payment as any).bookings;
            return (
              <Card key={payment.id} className="border-border">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {booking?.packages?.name || "Payment"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {payment.method} • {new Date(payment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground">
                        {formatPrice(Number(payment.amount))}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[payment.status] || ""}`}>
                        {payment.status}
                      </span>
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

export default DashboardPayments;
