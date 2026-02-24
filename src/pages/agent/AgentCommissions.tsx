import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PiggyBank, TrendingUp, Wallet, Clock, CheckCircle2, Package, AlertCircle } from "lucide-react";
import { formatPrice } from "@/data/packages";

const AgentCommissions = () => {
  const { user } = useAuth();

  // Get agent profile
  const { data: agent, isLoading: loadingAgent } = useQuery({
    queryKey: ["agent-commission-profile", user?.id],
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

  const commissionRate = agent?.commission_rate || 0;
  const commissionType: "percentage" | "fixed" = (agent as any)?.commission_type ?? "percentage";

  // Helper: compute commission per payment amount
  const calcCommission = (amount: number) =>
    commissionType === "fixed" ? commissionRate : amount * (commissionRate / 100);

  // Get all agent bookings with package prices
  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["agent-commission-bookings", agent?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, full_name, reference, status, created_at, packages(name, price)")
        .eq("agent_id", agent!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!agent?.id,
  });

  // Get all payments for those bookings
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["agent-commission-payments", agent?.id],
    queryFn: async () => {
      if (!bookings.length) return [];
      const { data } = await supabase
        .from("payments")
        .select("id, amount, status, booking_id, method, created_at")
        .in("booking_id", bookings.map((b) => b.id));
      return data || [];
    },
    enabled: bookings.length > 0,
  });

  // Calculate real commission amounts
  const verifiedPayments = payments.filter((p) => p.status === "verified");
  const pendingPayments = payments.filter((p) => p.status === "pending");

  const totalEarned = commissionType === "fixed"
    ? verifiedPayments.length * commissionRate
    : verifiedPayments.reduce((sum, p) => sum + Number(p.amount) * (commissionRate / 100), 0);

  const pendingPayout = commissionType === "fixed"
    ? pendingPayments.length * commissionRate
    : pendingPayments.reduce((sum, p) => sum + Number(p.amount) * (commissionRate / 100), 0);

  const totalRevenue = verifiedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  const rateLabel = commissionType === "fixed"
    ? formatPrice(commissionRate)
    : `${commissionRate}%`;

  const summaryCards = [
    { title: "Commission Rate", value: rateLabel, sub: commissionType === "fixed" ? "Fixed per booking" : "% of booking", icon: PiggyBank, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
    { title: "Commission Earned (Total)", value: formatPrice(totalEarned), sub: `From ${verifiedPayments.length} verified bookings`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { title: "Tracked Potential Earnings", value: formatPrice(pendingPayout), sub: "Calculated from pending bookings", icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    { title: "Client Revenue", value: formatPrice(totalRevenue), sub: "Total client payments", icon: Wallet, color: "text-sky-600", bg: "bg-sky-500/10", border: "border-sky-500/20" },
  ];

  // Build per-booking commission rows
  const commissionRows = bookings.map((booking) => {
    const bookingPayments = payments.filter((p) => p.booking_id === booking.id);
    const paidAmount = bookingPayments
      .filter((p) => p.status === "verified")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingAmount = bookingPayments
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const commission = commissionType === "fixed"
      ? (bookingPayments.filter(p => p.status === "verified").length > 0 ? commissionRate : 0)
      : paidAmount * (commissionRate / 100);

    const pendingCommission = commissionType === "fixed"
      ? (bookingPayments.filter(p => p.status === "pending").length > 0 ? commissionRate : 0)
      : pendingAmount * (commissionRate / 100);

    return { ...booking, paidAmount, pendingAmount, commission, pendingCommission };
  }).filter((b) => b.paidAmount > 0 || b.pendingAmount > 0);

  const isLoading = loadingAgent || loadingBookings || loadingPayments;

  const statusBadge: Record<string, string> = {
    confirmed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
    completed: "bg-primary/10 text-primary border-primary/20",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Commissions</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your earnings and commission history</p>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200/50 bg-blue-50/30 dark:bg-blue-950/20 dark:border-blue-800/20">
        <CardContent className="p-4 flex items-start gap-4">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 shrink-0">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">How Commissions Work</h3>
            <p className="text-xs text-blue-800/80 dark:text-blue-300/80 mt-1 leading-relaxed">
              Commissions are automatically applied as an **upfront discount** on your bookings.
              Instead of receiving a separate payment, you pay the discounted wholesale price.
              The figures below help you track how much you've earned through these discounts.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : summaryCards.map((stat) => (
            <Card key={stat.title} className={`border ${stat.border} bg-background/50 hover:-translate-y-1 transition-all duration-300`}>
              <CardContent className="p-4">
                <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="text-xl font-heading font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.title}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{stat.sub}</p>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Commission History Table */}
      <Card className="border-border/60 bg-background/50">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base font-semibold flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-secondary" />
            Commission History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          ) : commissionRows.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Package className="h-7 w-7 text-primary/40" />
              </div>
              <p className="font-medium text-sm text-foreground">No commission records yet</p>
              <p className="text-xs text-muted-foreground mt-1">Complete bookings for clients to start earning commission</p>
            </div>
          ) : (
            <div className="space-y-2">
              {commissionRows.map((row) => (
                <div key={row.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground truncate">{row.full_name || (row as any).packages?.name || "Booking"}</p>
                      <Badge variant="outline" className={`text-[10px] px-2 py-0 border shrink-0 ${statusBadge[row.status] || ""}`}>
                        {row.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ref: {row.reference || row.id.slice(0, 8).toUpperCase()} • {new Date(row.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    {row.commission > 0 && (
                      <div className="flex items-center gap-1.5 justify-end">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span className="text-sm font-semibold text-emerald-600">{formatPrice(row.commission)}</span>
                      </div>
                    )}
                    {row.pendingCommission > 0 && (
                      <div className="flex items-center gap-1.5 justify-end">
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                        <span className="text-sm font-medium text-amber-600">{formatPrice(row.pendingCommission)} pending</span>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {commissionType === "fixed"
                        ? `Fixed: ${rateLabel}`
                        : `${commissionRate}% of ${formatPrice(row.paidAmount + row.pendingAmount)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentCommissions;
