import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Eye, CreditCard } from "lucide-react";
import { formatPrice } from "@/data/packages";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const AdminPayments = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["admin-all-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, bookings(reference, full_name, packages(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "verified" | "rejected" }) => {
      const { error } = await supabase
        .from("payments")
        .update({ status, verified_at: new Date().toISOString(), verified_by: user?.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-payments"] });
      toast({ title: `Payment ${vars.status}` });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const pendingPayments = payments.filter((p) => p.status === "pending");
  const processedPayments = payments.filter((p) => p.status !== "pending");

  const statusColors: Record<string, string> = {
    pending: "bg-secondary/10 text-secondary",
    verified: "bg-primary/10 text-primary",
    rejected: "bg-destructive/10 text-destructive",
    refunded: "bg-muted text-muted-foreground",
  };

  const PaymentTable = ({ items }: { items: typeof payments }) => (
    <Card className="border-border">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pilgrim</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((payment) => {
              const booking = (payment as any).bookings;
              return (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{booking?.full_name || "—"}</TableCell>
                  <TableCell>{booking?.packages?.name || "—"}</TableCell>
                  <TableCell className="text-xs">{booking?.reference || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{payment.method}</Badge></TableCell>
                  <TableCell className="font-semibold">{formatPrice(Number(payment.amount))}</TableCell>
                  <TableCell className="text-xs">{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[payment.status]}`}>{payment.status}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.status === "pending" && (
                      <div className="flex justify-end gap-1">
                        {payment.proof_of_payment_url && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={payment.proof_of_payment_url} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /></a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => verifyMutation.mutate({ id: payment.id, status: "verified" })}>
                          <Check className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => verifyMutation.mutate({ id: payment.id, status: "rejected" })}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No payments found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Payment Verification</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and verify pilgrim payments</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingPayments.length})
            </TabsTrigger>
            <TabsTrigger value="processed">Processed ({processedPayments.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">
            <PaymentTable items={pendingPayments} />
          </TabsContent>
          <TabsContent value="processed">
            <PaymentTable items={processedPayments} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default AdminPayments;
