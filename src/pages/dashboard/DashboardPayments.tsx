import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard, Zap, CheckCircle2, Clock, XCircle,
  RefreshCw, TrendingUp, AlertTriangle, Banknote, Package,
  FileDown, Printer, X
} from "lucide-react";
import { formatPrice } from "@/data/packages";
import { Link } from "react-router-dom";
import PaymentReceipt, { type PaymentReceiptHandle } from "@/components/receipts/PaymentReceipt";

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; className: string; bg: string }> = {
  verified: { label: "Verified", icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", bg: "bg-emerald-500/10" },
  pending: { label: "Pending", icon: Clock, className: "bg-amber-500/10 text-amber-600 border-amber-500/20", bg: "bg-amber-500/10" },
  rejected: { label: "Rejected", icon: XCircle, className: "bg-red-500/10 text-red-600 border-red-500/20", bg: "bg-red-500/10" },
  refunded: { label: "Refunded", icon: RefreshCw, className: "bg-muted/80 text-muted-foreground border-border", bg: "bg-muted/40" },
};

const methodIcons: Record<string, string> = {
  card: "💳",
  bank_transfer: "🏦",
  cash: "💵",
  paystack: "⚡",
};

const DashboardPayments = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [receiptPayment, setReceiptPayment] = useState<any>(null);
  const receiptRef = useRef<PaymentReceiptHandle>(null);

  // Get user bookings to calculate outstanding
  const { data: bookings = [] } = useQuery({
    queryKey: ["user-bookings-payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, status, packages(name, price)")
        .eq("user_id", user!.id);
      if (!error && data?.length) return data;
      return [];
    },
    enabled: !!user?.id,
  });

  // Get all payments
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["user-payments-full", user?.id],
    queryFn: async () => {
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("id")
        .eq("user_id", user!.id);
      if (!bookingsData?.length) return [];

      const { data, error } = await supabase
        .from("payments")
        .select("*, bookings(reference, packages(name, price))")
        .in("booking_id", bookingsData.map((b) => b.id))
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Compute stats
  const totalPaid = payments
    .filter((p: any) => p.status === "verified")
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

  const totalPending = payments
    .filter((p: any) => p.status === "pending")
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

  const totalOwed = bookings.reduce((sum, booking) => {
    const bookingPayments = payments.filter((p: any) => p.booking_id === booking.id);
    const paid = bookingPayments
      .filter((p: any) => p.status === "verified")
      .reduce((s: number, p: any) => s + Number(p.amount), 0);
    const packagePrice = (booking as any).packages?.price || 0;
    return sum + Math.max(0, Number(packagePrice) - paid);
  }, 0);

  const verifiedCount = payments.filter((p: any) => p.status === "verified").length;
  const pendingCount = payments.filter((p: any) => p.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {t("dashboard.payments.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("dashboard.payments.subtitle")}
        </p>
      </div>

      {/* Summary stats */}
      {!isLoading && payments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-emerald-500/10 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <p className="text-xs text-muted-foreground">Total Paid</p>
            </div>
            <p className="text-xl font-heading font-bold text-emerald-600">{formatPrice(totalPaid)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{verifiedCount} verified transactions</p>
          </div>
          <div className="rounded-xl bg-amber-500/10 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-600" />
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <p className="text-xl font-heading font-bold text-amber-600">{formatPrice(totalPending)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{pendingCount} awaiting verification</p>
          </div>
          <div className={`rounded-xl col-span-2 sm:col-span-1 px-4 py-3 ${totalOwed > 0 ? "bg-red-500/10" : "bg-emerald-500/5"}`}>
            <div className="flex items-center gap-2 mb-1">
              {totalOwed > 0 ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              <p className="text-xs text-muted-foreground">Outstanding</p>
            </div>
            <p className={`text-xl font-heading font-bold ${totalOwed > 0 ? "text-destructive" : "text-emerald-600"}`}>
              {totalOwed > 0 ? formatPrice(totalOwed) : "All clear!"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {totalOwed > 0 ? "Balance due across all bookings" : "No outstanding balance"}
            </p>
          </div>
        </div>
      )}

      {/* Outstanding CTA */}
      {totalOwed > 0 && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border border-destructive/20 bg-destructive/5">
          <div>
            <p className="text-sm font-semibold text-foreground">Outstanding balance</p>
            <p className="text-xs text-muted-foreground mt-0.5">Make a payment to keep your booking on track</p>
          </div>
          <Link to="/dashboard/bookings">
            <Button className="gold-gradient text-secondary-foreground font-semibold gap-1.5 shrink-0" size="sm">
              <Zap className="h-4 w-4" />
              Pay {formatPrice(totalOwed)}
            </Button>
          </Link>
        </div>
      )}

      {/* Payment History */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : payments.length === 0 ? (
        <Card className="border-border/60 bg-background/50">
          <CardContent className="py-14 text-center flex flex-col items-center">
            <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mb-3">
              <CreditCard className="h-7 w-7 text-primary/40" />
            </div>
            <h3 className="font-heading text-base font-semibold text-foreground mb-1">
              {t("dashboard.payments.noPayments")}
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              {t("dashboard.payments.noPaymentsDesc")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-secondary" />
            Transaction History
          </h2>
          {payments.map((payment: any) => {
            const booking = payment.bookings;
            const sc = statusConfig[payment.status] || statusConfig.pending;
            const StatusIcon = sc.icon;
            const methodIcon = methodIcons[payment.method] || "💳";

            return (
              <Card key={payment.id} className="border-border/60 bg-background/50 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Left icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base ${sc.bg}`}>
                      {methodIcon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {booking?.packages?.name || "Payment"}
                        </p>
                        <Badge variant="outline" className={`text-[10px] px-2 py-0 border ${sc.className}`}>
                          <StatusIcon className="h-2.5 w-2.5 mr-1" />
                          {sc.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        {booking?.reference && (
                          <span className="font-mono">Ref: {booking.reference}</span>
                        )}
                        <span className="capitalize">{payment.method?.replace("_", " ") || "Payment"}</span>
                        <span>{new Date(payment.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <p className={`text-base font-heading font-bold ${payment.status === "verified" ? "text-foreground" : "text-muted-foreground"}`}>
                        {formatPrice(Number(payment.amount))}
                      </p>
                      {payment.status === "pending" && (
                        <p className="text-[10px] text-amber-600">Awaiting review</p>
                      )}
                      {payment.status === "verified" && (
                        <button
                          onClick={() => setReceiptPayment(payment)}
                          className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                        >
                          <FileDown className="h-3 w-3" /> Receipt
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Receipt Modal */}
      {receiptPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setReceiptPayment(null)}>
          <div className="relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3 justify-end">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => receiptRef.current?.downloadPDF()}>
                <FileDown className="h-3.5 w-3.5" /> Download PDF
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => receiptRef.current?.print()}>
                <Printer className="h-3.5 w-3.5" /> Print
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setReceiptPayment(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <PaymentReceipt
              ref={receiptRef}
              data={{
                reference: receiptPayment.bookings?.reference || receiptPayment.id.slice(0, 8),
                packageName: receiptPayment.bookings?.packages?.name || "Package",
                pilgrimName: profile?.full_name || user?.email || "Pilgrim",
                amount: Number(receiptPayment.amount),
                method: receiptPayment.method,
                status: receiptPayment.status,
                date: receiptPayment.created_at,
                verifiedAt: receiptPayment.verified_at,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPayments;
