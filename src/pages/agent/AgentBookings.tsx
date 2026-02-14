import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const statusColors: Record<string, string> = {
  pending: "bg-chart-4/10 text-chart-4",
  confirmed: "bg-chart-2/10 text-chart-2",
  cancelled: "bg-destructive/10 text-destructive",
  completed: "bg-primary/10 text-primary",
};

const AgentBookings = () => {
  const [search, setSearch] = useState("");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["agent-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, full_name, reference, status, created_at, departure_city, package_id")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch package names
      const withPackages = await Promise.all(
        (data || []).map(async (b) => {
          const { data: pkg } = await supabase
            .from("packages")
            .select("name, price")
            .eq("id", b.package_id)
            .single();
          return { ...b, package_name: pkg?.name || "—", price: pkg?.price || 0 };
        })
      );
      return withPackages;
    },
  });

  const filtered = bookings.filter((b) =>
    b.full_name.toLowerCase().includes(search.toLowerCase()) ||
    b.reference?.includes(search)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Client Bookings</h1>
        <p className="text-muted-foreground mt-1">Track and manage all bookings made through your agency</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>{filtered.length} bookings found</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search by pilgrim name or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {isLoading ? (
            <Skeleton className="h-40" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Pilgrim</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No bookings found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs">{b.reference || b.id.slice(0, 8)}</TableCell>
                        <TableCell className="font-medium">{b.full_name}</TableCell>
                        <TableCell>{b.package_name}</TableCell>
                        <TableCell>{b.departure_city || "—"}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[b.status] || "bg-muted"}>
                            {b.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(b.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentBookings;
