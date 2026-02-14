import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Eye, Printer } from "lucide-react";
import { useState, useRef } from "react";

const AdminPilgrims = () => {
  const [search, setSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["admin-all-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, packages(name, type, price, currency, duration)")
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

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Pilgrim Details - ${selectedBooking?.full_name}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 40px; color: #1a1a1a; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #166534; padding-bottom: 16px; }
        .header h1 { font-size: 22px; color: #166534; margin: 0; }
        .header p { color: #666; font-size: 13px; margin-top: 4px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .field { margin-bottom: 12px; }
        .field-label { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; margin-bottom: 2px; }
        .field-value { font-size: 14px; font-weight: 500; }
        .section { margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; }
        .section-title { font-size: 15px; font-weight: 600; color: #166534; margin-bottom: 12px; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: capitalize; }
        .badge-pending { background: #fef3c7; color: #92400e; }
        .badge-confirmed { background: #d1fae5; color: #065f46; }
        .badge-cancelled { background: #fee2e2; color: #991b1b; }
        .badge-completed { background: #e5e7eb; color: #374151; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      ${printRef.current.innerHTML}
      <script>window.print(); window.close();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const DetailField = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );

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
                  <TableHead className="text-right">Actions</TableHead>
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
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedBooking(b)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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

      {/* Detail Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-heading text-xl">Pilgrim Details</DialogTitle>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" /> Print
              </Button>
            </div>
          </DialogHeader>

          {selectedBooking && (
            <div ref={printRef}>
              <div className="header" style={{ textAlign: "center", marginBottom: 24, borderBottom: "2px solid hsl(var(--primary))", paddingBottom: 12 }}>
                <h1 style={{ fontSize: 20, color: "hsl(var(--primary))", margin: 0 }}>Raudah Travels & Tours</h1>
                <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 13, marginTop: 4 }}>Pilgrim Booking Information</p>
              </div>

              <div className="space-y-6">
                {/* Personal Info */}
                <div>
                  <h3 className="section-title text-sm font-semibold text-primary mb-3 uppercase tracking-wider">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <DetailField label="Full Name" value={selectedBooking.full_name} />
                    <DetailField label="Gender" value={selectedBooking.gender} />
                    <DetailField label="Date of Birth" value={selectedBooking.date_of_birth ? new Date(selectedBooking.date_of_birth).toLocaleDateString() : null} />
                    <DetailField label="Passport Number" value={selectedBooking.passport_number} />
                    <DetailField label="Passport Expiry" value={selectedBooking.passport_expiry ? new Date(selectedBooking.passport_expiry).toLocaleDateString() : null} />
                    <DetailField label="Departure City" value={selectedBooking.departure_city} />
                  </div>
                </div>

                {/* Booking Info */}
                <div className="border-t border-border pt-4">
                  <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">Booking Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <DetailField label="Reference" value={selectedBooking.reference || selectedBooking.id.slice(0, 8)} />
                    <DetailField label="Status" value={selectedBooking.status} />
                    <DetailField label="Package" value={(selectedBooking as any).packages?.name} />
                    <DetailField label="Package Type" value={(selectedBooking as any).packages?.type} />
                    <DetailField label="Room Preference" value={selectedBooking.room_preference} />
                    <DetailField label="Booking Date" value={new Date(selectedBooking.created_at).toLocaleDateString()} />
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="border-t border-border pt-4">
                  <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">Emergency Contact</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <DetailField label="Name" value={selectedBooking.emergency_contact_name} />
                    <DetailField label="Phone" value={selectedBooking.emergency_contact_phone} />
                    <DetailField label="Relationship" value={selectedBooking.emergency_contact_relationship} />
                  </div>
                </div>

                {/* Special Requests */}
                {selectedBooking.special_requests && (
                  <div className="border-t border-border pt-4">
                    <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">Special Requests</h3>
                    <p className="text-sm text-foreground">{selectedBooking.special_requests}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPilgrims;
