import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Check, X, Eye, CreditCard, Search, DollarSign,
  Clock, CheckCircle2, XCircle, RefreshCw, TrendingUp,
  User, Calendar, Package, Hash, Building2, Image, Phone, Mail,
} from "lucide-react";
import { formatPrice } from "@/data/packages";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; className: string; bg: string }> = {
  pending: { label: "Pending", icon: Clock, className: "bg-amber-500/10 text-amber-600 border-amber-500/20", bg: "bg-amber-500/10" },
  verified: { label: "Verified", icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", bg: "bg-emerald-500/10" },
  rejected: { label: "Rejected", icon: XCircle, className: "bg-red-500/10 text-red-600 border-red-500/20", bg: "bg-red-500/10" },
  refunded: { label: "Refunded", icon: RefreshCw, className: "bg-muted/80 text-muted-foreground border-border", bg: "bg-muted/40" },
};

const methodIcons: Record<string, string> = {
  card: "💳", bank_transfer: "🏦", cash: "💵", paystack: "⚡",
};

const AdminPayments = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["admin-all-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, bookings(reference, full_name, phone, user_id, packages(name), agents(business_name, agent_code))")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch profile emails for all unique user_ids
      const userIds = [...new Set((data || []).map((p: any) => p.bookings?.user_id).filter(Boolean))];
      let emailMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds);
        emailMap = Object.fromEntries((profiles || []).map((pr: any) => [pr.id, pr.email]));
      }
      // Attach email to each payment's booking
      return (data || []).map((p: any) => ({
        ...p,
        _pilgrimEmail: p.bookings?.user_id ? emailMap[p.bookings.user_id] : null,
      }));
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status, bookingId, amount }: { id: string; status: "verified" | "rejected"; bookingId: string; amount: number }) => {
      const { error } = await supabase
        .from("payments")
        .update({ status, verified_at: new Date().toISOString(), verified_by: user?.id })
        .eq("id", id);
      if (error) throw error;

      if (status === "verified") {
        await supabase.from("bookings").update({ status: "confirmed" }).eq("id", bookingId);
        try {
          const { data } = await supabase.functions.invoke("send-payment-receipt", {
            body: { bookingId, paymentAmount: amount },
          });
          return data;
        } catch (err) {
          console.error("Error invoking send-payment-receipt function:", err);
          return { error: "Invocation failed", emailSent: false, notifications: [] };
        }
      }
      return { success: true };
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-payments"] });

      if (vars.status === "verified") {
        const res = data as any;
        const emailSent = res?.emailSent;
        const notificationsCreated = res?.notifications?.some((n: any) => n.success);

        let description = "";
        if (emailSent && notificationsCreated) {
          description = "Receipt sent via Email & In-app notifications.";
        } else if (notificationsCreated) {
          description = "In-app notifications sent. (Email restricted to verified admin).";
        } else if (emailSent) {
          description = "Receipt email sent successfully.";
        } else {
          description = "Payment verified, but notifications failed.";
        }

        toast({
          title: "Payment Verified ✓",
          description,
          variant: !notificationsCreated && !emailSent ? "destructive" : !emailSent ? "default" : undefined
        });
      } else {
        toast({ title: "Payment Rejected", description: "The payment has been marked as rejected." });
      }
      setSelectedPayment(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Stats
  const totalRevenue = payments.filter(p => p.status === "verified").reduce((s, p) => s + Number(p.amount), 0);
  const pendingCount = payments.filter(p => p.status === "pending").length;
  const pendingAmount = payments.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);
  const verifiedCount = payments.filter(p => p.status === "verified").length;

  // Filtered payments
  const filterPayments = (list: typeof payments) =>
    list.filter(p => {
      const term = searchTerm.toLowerCase();
      const booking = (p as any).bookings;
      const matchesSearch = !searchTerm ||
        booking?.full_name?.toLowerCase().includes(term) ||
        booking?.reference?.toLowerCase().includes(term) ||
        p.method?.toLowerCase().includes(term);

      const matchesMethod = methodFilter === "all" || p.method === methodFilter;

      return matchesSearch && matchesMethod;
    });

  const pendingPayments = filterPayments(payments.filter(p => p.status === "pending"));
  const processedPayments = filterPayments(payments.filter(p => p.status !== "pending"));

  // Calculate paginated list based on active tab
  // (Handling this inside the return for simplicity or creating separate states for pages)
  // Let's use a helper.
  const paginate = (list: any[]) => {
    const totalPages = Math.ceil(list.length / itemsPerPage);
    const paginated = list.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    return { paginated, totalPages };
  };


  const DetailRow = ({ icon: Icon, label, value, className = "" }: { icon: any; label: string; value: string | null | undefined; className?: string }) => (
    <div className="flex items-start gap-3 py-2.5">
      <div className="p-1.5 rounded-lg bg-muted/50 shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className={`text-sm font-medium text-foreground ${className}`}>{value || "—"}</p>
      </div>
    </div>
  );

  const PaymentCard = ({ payment }: { payment: any }) => {
    const booking = payment.bookings;
    const agent = booking?.agents;
    const sc = statusConfig[payment.status] || statusConfig.pending;
    const StatusIcon = sc.icon;
    const methodIcon = methodIcons[payment.method] || "💳";

    return (
      <Card
        className="border-border/60 bg-background/50 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
        onClick={() => setSelectedPayment(payment)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Method icon */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base ${sc.bg}`}>
              {methodIcon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground truncate">
                  {booking?.full_name || "Unknown Pilgrim"}
                </p>
                <Badge variant="outline" className={`text-[10px] px-2 py-0 border ${sc.className}`}>
                  <StatusIcon className="h-2.5 w-2.5 mr-1" />
                  {sc.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                <span>{booking?.packages?.name || "Package"}</span>
                {booking?.reference && (
                  <span className="font-mono text-[10px]">#{booking.reference}</span>
                )}
                <span>{new Date(payment.created_at).toLocaleDateString()}</span>
              </div>
              {agent && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] text-secondary font-semibold">{agent.business_name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">({agent.agent_code})</span>
                </div>
              )}
              {/* Contact Info */}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {booking?.phone && (
                  <a href={`tel:${booking.phone}`} className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                    <Phone className="h-3 w-3" />
                    {booking.phone}
                  </a>
                )}
                {payment._pilgrimEmail && (
                  <a href={`mailto:${payment._pilgrimEmail}`} className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                    <Mail className="h-3 w-3" />
                    {payment._pilgrimEmail}
                  </a>
                )}
              </div>
            </div>

            <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
              <p className="text-base font-heading font-bold text-foreground">
                {formatPrice(Number(payment.amount))}
              </p>
              <span className="text-[10px] text-muted-foreground capitalize">
                {payment.method?.replace("_", " ")}
              </span>
            </div>
          </div>

          {/* Actions hint on pending */}
          {payment.status === "pending" && (
            <div className="flex items-center justify-center mt-3 pt-3 border-t border-border/40">
              <span className="text-xs text-muted-foreground">
                Tap to view details and verify/reject
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const PaginationControls = ({ totalPages }: { totalPages: number }) => (
    <div className="flex justify-center mt-6">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>

          {[...Array(totalPages)].map((_, i) => (
            <PaginationItem key={i + 1}>
              <PaginationLink
                onClick={() => setCurrentPage(i + 1)}
                isActive={currentPage === i + 1}
                className="cursor-pointer"
              >
                {i + 1}
              </PaginationLink>
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Payment Verification</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and verify pilgrim payments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/60 bg-background/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-xs text-muted-foreground">Total Verified</span>
            </div>
            <p className="text-lg font-heading font-bold text-foreground">{formatPrice(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-background/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-amber-500/10">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-xs text-muted-foreground">Pending</span>
            </div>
            <p className="text-lg font-heading font-bold text-foreground">{pendingCount}</p>
            <p className="text-[10px] text-muted-foreground">{formatPrice(pendingAmount)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-background/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-xs text-muted-foreground">Verified</span>
            </div>
            <p className="text-lg font-heading font-bold text-foreground">{verifiedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-background/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Total Payments</span>
            </div>
            <p className="text-lg font-heading font-bold text-foreground">{payments.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, reference, or method..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-[200px] bg-card">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="All Methods" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="paystack">Paystack</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <Tabs defaultValue="pending" onValueChange={() => setCurrentPage(1)}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5 h-4">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="processed">Processed ({processedPayments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-3">
            {(() => {
              const { paginated, totalPages } = paginate(pendingPayments);
              return (
                <>
                  <div className="space-y-2">
                    {paginated.length === 0 ? (
                      <Card className="border-border/60">
                        <CardContent className="py-10 text-center">
                          <CheckCircle2 className="h-8 w-8 text-emerald-500/50 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No pending payments to review</p>
                        </CardContent>
                      </Card>
                    ) : (
                      paginated.map((p) => <PaymentCard key={p.id} payment={p} />)
                    )}
                  </div>
                  {totalPages > 1 && <PaginationControls totalPages={totalPages} />}
                </>
              );
            })()}
          </TabsContent>

          <TabsContent value="processed" className="space-y-4 mt-3">
            {(() => {
              const { paginated, totalPages } = paginate(processedPayments);
              return (
                <>
                  <div className="space-y-2">
                    {paginated.length === 0 ? (
                      <Card className="border-border/60">
                        <CardContent className="py-10 text-center">
                          <p className="text-sm text-muted-foreground">No processed payments found</p>
                        </CardContent>
                      </Card>
                    ) : (
                      paginated.map((p) => <PaymentCard key={p.id} payment={p} />)
                    )}
                  </div>
                  {totalPages > 1 && <PaginationControls totalPages={totalPages} />}
                </>
              );
            })()}
          </TabsContent>
        </Tabs>
      )}

      {/* Payment Detail Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Payment Details</DialogTitle>
          </DialogHeader>

          {selectedPayment && (() => {
            const booking = selectedPayment.bookings;
            const agent = booking?.agents;
            const sc = statusConfig[selectedPayment.status] || statusConfig.pending;
            const StatusIcon = sc.icon;

            return (
              <div className="space-y-4">
                {/* Status & Amount Banner */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div>
                    <p className="text-2xl font-heading font-bold text-foreground">
                      {formatPrice(Number(selectedPayment.amount))}
                    </p>
                    <Badge variant="outline" className={`mt-1 ${sc.className}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {sc.label}
                    </Badge>
                  </div>
                  <div className="text-4xl">
                    {methodIcons[selectedPayment.method] || "💳"}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-x-4 divide-y divide-border/30">
                  <DetailRow icon={User} label="Pilgrim" value={booking?.full_name} />
                  <DetailRow icon={Hash} label="Reference" value={booking?.reference || selectedPayment.id?.slice(0, 8)} className="font-mono" />
                  <DetailRow icon={Package} label="Package" value={booking?.packages?.name} />
                  <DetailRow icon={CreditCard} label="Method" value={selectedPayment.method?.replace("_", " ")} className="capitalize" />
                  <DetailRow icon={Calendar} label="Date" value={format(new Date(selectedPayment.created_at), "PPP 'at' p")} />
                  {selectedPayment.paystack_reference && (
                    <DetailRow icon={Hash} label="Paystack Ref" value={selectedPayment.paystack_reference} className="font-mono text-xs" />
                  )}
                </div>

                {/* Pilgrim Contact Info */}
                <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30 space-y-1.5">
                  <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Contact Pilgrim</p>
                  <div className="flex flex-wrap gap-3">
                    {booking?.phone && (
                      <a href={`tel:${booking.phone}`} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-medium">
                        <Phone className="h-3.5 w-3.5" />
                        {booking.phone}
                      </a>
                    )}
                    {selectedPayment._pilgrimEmail && (
                      <a href={`mailto:${selectedPayment._pilgrimEmail}`} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-medium">
                        <Mail className="h-3.5 w-3.5" />
                        {selectedPayment._pilgrimEmail}
                      </a>
                    )}
                    {!booking?.phone && !selectedPayment._pilgrimEmail && (
                      <p className="text-sm text-muted-foreground">No contact info available</p>
                    )}
                  </div>
                </div>

                {/* Agent Info */}
                {agent && (
                  <div className="p-3 rounded-lg bg-secondary/5 border border-secondary/20">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-secondary" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{agent.business_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{agent.agent_code}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Proof of Payment */}
                {selectedPayment.proof_of_payment_url && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-semibold text-foreground">Proof of Payment</p>
                    </div>
                    <a
                      href={selectedPayment.proof_of_payment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                    >
                      <img
                        src={selectedPayment.proof_of_payment_url}
                        alt="Proof of payment"
                        className="w-full max-h-[300px] object-contain rounded-lg border border-border bg-muted/20"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <p className="text-xs text-blue-600 hover:underline mt-1 text-center">
                        View full size ↗
                      </p>
                    </a>
                  </div>
                )}

                {/* Verified Info */}
                {selectedPayment.verified_at && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground">
                      {selectedPayment.status === "verified" ? "Verified" : "Reviewed"} on{" "}
                      <span className="font-medium text-foreground">
                        {format(new Date(selectedPayment.verified_at), "PPP 'at' p")}
                      </span>
                    </p>
                  </div>
                )}

                {/* Actions for pending */}
                {selectedPayment.status === "pending" && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button
                      className="flex-1 gap-2"
                      onClick={() => verifyMutation.mutate({
                        id: selectedPayment.id,
                        status: "verified",
                        bookingId: selectedPayment.booking_id,
                        amount: Number(selectedPayment.amount),
                      })}
                      disabled={verifyMutation.isPending}
                    >
                      <Check className="h-4 w-4" />
                      {verifyMutation.isPending ? "Processing…" : "Verify Payment"}
                    </Button>
                    <Button
                      variant="destructive"
                      className="gap-2"
                      onClick={() => verifyMutation.mutate({
                        id: selectedPayment.id,
                        status: "rejected",
                        bookingId: selectedPayment.booking_id,
                        amount: Number(selectedPayment.amount),
                      })}
                      disabled={verifyMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayments;
