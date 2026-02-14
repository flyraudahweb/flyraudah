import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/data/packages";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

const AdminAnalytics = () => {
  const { data: packages = [] } = useQuery({
    queryKey: ["admin-analytics-packages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("packages").select("id, name, type, category, capacity, available, price");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["admin-analytics-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("id, status, package_id, created_at");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["admin-analytics-payments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("amount, status, created_at");
      if (error) throw error;
      return data || [];
    },
  });

  // Revenue by month
  const revenueByMonth: Record<string, number> = {};
  payments
    .filter((p) => p.status === "verified")
    .forEach((p) => {
      const month = new Date(p.created_at).toLocaleString("default", { month: "short", year: "numeric" });
      revenueByMonth[month] = (revenueByMonth[month] || 0) + Number(p.amount);
    });
  const revenueData = Object.entries(revenueByMonth).map(([month, amount]) => ({ month, amount }));

  // Bookings by status
  const statusCounts: Record<string, number> = {};
  bookings.forEach((b) => { statusCounts[b.status] = (statusCounts[b.status] || 0) + 1; });
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Package capacity utilization
  const capacityData = packages.map((p) => ({
    name: p.name.length > 20 ? p.name.slice(0, 20) + "…" : p.name,
    booked: p.capacity - p.available,
    available: p.available,
  }));

  // Type breakdown
  const typeBreakdown = [
    { name: "Hajj", value: packages.filter((p) => p.type === "hajj").length },
    { name: "Umrah", value: packages.filter((p) => p.type === "umrah").length },
  ];

  const totalRevenue = payments.filter((p) => p.status === "verified").reduce((s, p) => s + Number(p.amount), 0);
  const pendingRevenue = payments.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Revenue, bookings, and capacity insights</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-lg font-bold text-foreground">{formatPrice(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pending Revenue</p>
            <p className="text-lg font-bold text-secondary">{formatPrice(pendingRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Bookings</p>
            <p className="text-lg font-bold text-foreground">{bookings.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active Packages</p>
            <p className="text-lg font-bold text-foreground">{packages.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Revenue by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis tickFormatter={(v) => `₦${(v / 1000000).toFixed(1)}M`} className="text-xs" />
                  <Tooltip formatter={(v: number) => formatPrice(v)} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-12 text-muted-foreground text-sm">No revenue data yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Booking Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-12 text-muted-foreground text-sm">No booking data yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Package Capacity Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            {capacityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={capacityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="booked" stackId="a" fill="hsl(var(--primary))" name="Booked" />
                  <Bar dataKey="available" stackId="a" fill="hsl(var(--muted))" name="Available" radius={[0, 4, 4, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-12 text-muted-foreground text-sm">No package data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
