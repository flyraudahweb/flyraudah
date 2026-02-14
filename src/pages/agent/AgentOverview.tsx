import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, CreditCard, PiggyBank } from "lucide-react";

const AgentOverview = () => {
  const { user } = useAuth();
  const [agent, setAgent] = useState<any>(null);
  const [stats, setStats] = useState({ clients: 0, bookings: 0, totalRevenue: 0, commissionEarned: 0 });

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch agent profile
      const { data: agentData } = await supabase
        .from("agents")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      setAgent(agentData);

      if (!agentData) return;

      // Fetch bookings made by this agent (via agent's clients)
      // For now, show agent's own record stats
      const { count: bookingCount } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true });

      setStats({
        clients: 0,
        bookings: bookingCount || 0,
        totalRevenue: 0,
        commissionEarned: 0,
      });
    };

    fetchData();
  }, [user]);

  const statCards = [
    { title: "Total Clients", value: stats.clients, icon: Users, color: "text-primary" },
    { title: "Active Bookings", value: stats.bookings, icon: Package, color: "text-chart-2" },
    { title: "Total Revenue", value: `₦${stats.totalRevenue.toLocaleString()}`, icon: CreditCard, color: "text-chart-3" },
    { title: "Commission Earned", value: `₦${stats.commissionEarned.toLocaleString()}`, icon: PiggyBank, color: "text-chart-4" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agent Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {agent?.contact_person || "Agent"}
          {agent?.agent_code && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{agent.agent_code}</span>}
        </p>
      </div>

      {!agent && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">
              Your agent profile is not set up yet. Please contact an administrator to activate your agent account.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
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

      {agent && (
        <Card>
          <CardHeader>
            <CardTitle>Agent Details</CardTitle>
            <CardDescription>Your business information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Business Name:</span>
                <p className="font-medium">{agent.business_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Agent Code:</span>
                <p className="font-medium">{agent.agent_code}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Contact Person:</span>
                <p className="font-medium">{agent.contact_person}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{agent.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Phone:</span>
                <p className="font-medium">{agent.phone}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Commission Rate:</span>
                <p className="font-medium">{agent.commission_rate}%</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                  agent.status === "active" ? "bg-chart-2/10 text-chart-2" :
                  agent.status === "pending" ? "bg-chart-4/10 text-chart-4" :
                  "bg-destructive/10 text-destructive"
                }`}>{agent.status}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AgentOverview;
