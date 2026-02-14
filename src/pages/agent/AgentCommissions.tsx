import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PiggyBank, TrendingUp, Wallet, Clock } from "lucide-react";

const AgentCommissions = () => {
  const { user } = useAuth();

  const { data: agent } = useQuery({
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

  const summaryCards = [
    { title: "Commission Rate", value: `${commissionRate}%`, icon: PiggyBank, color: "text-primary" },
    { title: "Total Earned", value: "₦0", icon: TrendingUp, color: "text-chart-2" },
    { title: "Pending Payout", value: "₦0", icon: Clock, color: "text-chart-4" },
    { title: "Total Paid Out", value: "₦0", icon: Wallet, color: "text-chart-3" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Commissions</h1>
        <p className="text-muted-foreground mt-1">Track your earnings and commission payouts</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
          <CardDescription>Breakdown of commissions earned per booking</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Booking Ref</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Package Price</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No commission records yet. Complete bookings for clients to start earning.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentCommissions;
