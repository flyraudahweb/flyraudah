import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Package, CalendarCheck, CreditCard, Users } from "lucide-react";
import { formatPrice } from "@/data/packages";

const AdminOverview = () => {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [pkgRes, bookRes, payRes] = await Promise.all([
        supabase.from("packages").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id, status", { count: "exact" }),
        supabase.from("payments").select("amount, status"),
      ]);

      const totalRevenue = (payRes.data || [])
        .filter((p) => p.status === "verified")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const pendingPayments = (payRes.data || []).filter((p) => p.status === "pending").length;
      const activeBookings = (bookRes.data || []).filter((b) => b.status !== "cancelled").length;

      return {
        packages: pkgRes.count || 0,
        bookings: bookRes.count || 0,
        activeBookings,
        totalRevenue,
        pendingPayments,
      };
    },
  });

  const cards = [
    { label: "Total Packages", value: String(stats?.packages || 0), icon: Package, color: "text-primary", bg: "bg-primary/10" },
    { label: "Active Bookings", value: String(stats?.activeBookings || 0), icon: CalendarCheck, color: "text-secondary", bg: "bg-secondary/10" },
    { label: "Revenue", value: formatPrice(stats?.totalRevenue || 0), icon: CreditCard, color: "text-primary", bg: "bg-primary/10" },
    { label: "Pending Payments", value: String(stats?.pendingPayments || 0), icon: Users, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your Hajj & Umrah operations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="border-border">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${c.bg}`}>
                  <c.icon className={`h-4 w-4 ${c.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{c.label}</p>
                  <p className="text-lg md:text-xl font-heading font-bold text-foreground truncate">{c.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminOverview;
