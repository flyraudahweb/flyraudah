import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Users } from "lucide-react";
import { useState } from "react";

const AdminPilgrims = () => {
  const [search, setSearch] = useState("");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["admin-all-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, packages(name, type)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = bookings.filter((b) =>
    b.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (b.reference || "").toLowerCase().includes(search.toLowerCase()) ||
    (b.passport_number || "").toLowerCase().includes(search.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    pending: "bg-secondary/10 text-secondary",
    confirmed: "bg-primary/10 text-primary",
    cancelled: "bg-destructive/10 text-destructive",
    completed: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Pilgrim Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{bookings.length} total bookings</p>
        </div>
        <Input
          placeholder="Search by name, ref, passport..."
          className="max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <Card className="border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pilgrim</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Passport</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => {
                  const pkg = (b as any).packages;
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.full_name}</TableCell>
                      <TableCell className="text-xs font-mono">{b.reference || b.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{pkg?.name || "—"}</p>
                          <Badge variant="outline" className="capitalize text-xs mt-0.5">{pkg?.type || "—"}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{b.passport_number || "—"}</TableCell>
                      <TableCell className="capitalize">{b.gender || "—"}</TableCell>
                      <TableCell>{b.departure_city || "—"}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[b.status]}`}>{b.status}</span>
                      </TableCell>
                      <TableCell className="text-xs">{new Date(b.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No pilgrims found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminPilgrims;
