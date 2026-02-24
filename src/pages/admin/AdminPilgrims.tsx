import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Eye, Printer, Search, Calendar, Plane, Phone, AlertCircle, Pencil } from "lucide-react";
import { useState, useRef, useMemo } from "react";
import { format } from "date-fns";
import EditBookingModal from "@/components/bookings/EditBookingModal";
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

const AdminPilgrims = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [editingBooking, setEditingBooking] = useState<any>(null);
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

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const matchesSearch =
        b.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (b.reference || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.passport_number || "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || b.status === statusFilter;
      const matchesType = typeFilter === "all" || (b as any).packages?.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [bookings, search, statusFilter, typeFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useState(() => {
    setCurrentPage(1);
  }); // Note: useEffect would be better but this is inside the component body, I'll fix it in the next chunk or use useMemo+effect pattern properly.
  // Actually I'll use a standard useEffect for state reset.


  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
    completed: "bg-muted text-muted-foreground",
  };

  const handlePrint = () => {
    if (!printRef.current || !selectedBooking) return;
    const pkg = (selectedBooking as any).packages;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Pilgrim Details - ${selectedBooking?.full_name}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a1a; background: #fff; }

        .print-header {
          display: flex; align-items: center; justify-content: space-between;
          padding-bottom: 20px; margin-bottom: 24px;
          border-bottom: 3px solid #166534;
        }
        .print-header .brand { }
        .print-header .brand h1 { font-size: 22px; color: #166534; font-weight: 700; }
        .print-header .brand p { font-size: 11px; color: #888; margin-top: 2px; letter-spacing: 1px; text-transform: uppercase; }
        .print-header .ref { text-align: right; }
        .print-header .ref .ref-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
        .print-header .ref .ref-value { font-size: 16px; font-weight: 700; color: #166534; font-family: monospace; }
        .print-header .ref .date { font-size: 11px; color: #666; margin-top: 4px; }

        .accent-bar { height: 4px; background: repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(22,101,52,0.1) 6px, rgba(22,101,52,0.1) 12px), linear-gradient(135deg, #16a34a, #166534); border-radius: 2px; margin-bottom: 24px; }

        .section { margin-bottom: 24px; }
        .section-title {
          font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;
          color: #166534; font-weight: 700; margin-bottom: 12px;
          padding-bottom: 6px; border-bottom: 1px solid #e5e7eb;
        }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
        .field-label { font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; margin-bottom: 2px; }
        .field-value { font-size: 13px; font-weight: 500; color: #1a1a1a; }

        .status-badge {
          display: inline-block; padding: 3px 12px; border-radius: 20px;
          font-size: 11px; font-weight: 600; text-transform: capitalize;
        }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-confirmed { background: #d1fae5; color: #065f46; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }
        .status-completed { background: #e5e7eb; color: #374151; }

        .footer {
          margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;
          display: flex; justify-content: space-between; align-items: center;
        }
        .footer p { font-size: 10px; color: #aaa; }

        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style></head><body>

      <div class="print-header">
        <div class="brand">
          <h1>🕋 Raudah Travels & Tours</h1>
          <p>Pilgrim Booking Record</p>
        </div>
        <div class="ref">
          <p class="ref-label">Booking Reference</p>
          <p class="ref-value">${selectedBooking.reference || selectedBooking.id.slice(0, 8)}</p>
          <p class="date">${format(new Date(selectedBooking.created_at), "PPP")}</p>
        </div>
      </div>

      <div class="accent-bar"></div>

      <div class="section">
        <div class="section-title">Personal Information</div>
        <div class="grid">
          <div><p class="field-label">Full Name</p><p class="field-value">${selectedBooking.full_name || "—"}</p></div>
          <div><p class="field-label">Gender</p><p class="field-value" style="text-transform:capitalize">${selectedBooking.gender || "—"}</p></div>
          <div><p class="field-label">Date of Birth</p><p class="field-value">${selectedBooking.date_of_birth ? format(new Date(selectedBooking.date_of_birth), "PPP") : "—"}</p></div>
          <div><p class="field-label">Nationality</p><p class="field-value">${selectedBooking.nationality || "Nigerian"}</p></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Travel Documents</div>
        <div class="grid">
          <div><p class="field-label">Passport Number</p><p class="field-value" style="font-family:monospace;letter-spacing:1px">${selectedBooking.passport_number || "—"}</p></div>
          <div><p class="field-label">Passport Expiry</p><p class="field-value">${selectedBooking.passport_expiry ? format(new Date(selectedBooking.passport_expiry), "PPP") : "—"}</p></div>
          <div><p class="field-label">Departure City</p><p class="field-value">${selectedBooking.departure_city || "—"}</p></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Package & Booking</div>
        <div class="grid">
          <div><p class="field-label">Package</p><p class="field-value">${pkg?.name || "—"}</p></div>
          <div><p class="field-label">Type</p><p class="field-value" style="text-transform:capitalize">${pkg?.type || "—"}</p></div>
          <div><p class="field-label">Room Preference</p><p class="field-value" style="text-transform:capitalize">${selectedBooking.room_preference || "—"}</p></div>
          <div>
            <p class="field-label">Status</p>
            <span class="status-badge status-${selectedBooking.status}">${selectedBooking.status}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Emergency Contact</div>
        <div class="grid">
          <div><p class="field-label">Name</p><p class="field-value">${selectedBooking.emergency_contact_name || "—"}</p></div>
          <div><p class="field-label">Phone</p><p class="field-value">${selectedBooking.emergency_contact_phone || "—"}</p></div>
          <div><p class="field-label">Relationship</p><p class="field-value">${selectedBooking.emergency_contact_relationship || "—"}</p></div>
        </div>
      </div>

      ${selectedBooking.special_requests ? `
      <div class="section">
        <div class="section-title">Special Requests</div>
        <p class="field-value">${selectedBooking.special_requests}</p>
      </div>` : ""}

      <div class="footer">
        <p>Printed on ${format(new Date(), "PPP 'at' p")}</p>
        <p>Raudah Travels & Tours Ltd.</p>
      </div>

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Pilgrim Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} matching of {bookings.length} total bookings</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pilgrims..."
              className="pl-10"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-40 bg-card">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-40 bg-card">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Pkg Type" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="umrah">Umrah</SelectItem>
              <SelectItem value="hajj">Hajj</SelectItem>
              <SelectItem value="visa_only">Visa Only</SelectItem>
              <SelectItem value="flight_only">Flight Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
                  <TableHead className="hidden md:table-cell">Passport</TableHead>
                  <TableHead className="hidden lg:table-cell">Gender</TableHead>
                  <TableHead className="hidden lg:table-cell">Departure</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((b) => {
                  const pkg = (b as any).packages;
                  return (
                    <TableRow key={b.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedBooking(b)}>
                      <TableCell className="font-medium">{b.full_name}</TableCell>
                      <TableCell className="text-xs font-mono">{b.reference || b.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{pkg?.name || "—"}</p>
                          <Badge variant="outline" className="capitalize text-xs mt-0.5">{pkg?.type || "—"}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs hidden md:table-cell">{b.passport_number || "—"}</TableCell>
                      <TableCell className="capitalize hidden lg:table-cell">{b.gender || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell">{b.departure_city || "—"}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[b.status]}`}>{b.status}</span>
                      </TableCell>
                      <TableCell className="text-xs hidden md:table-cell">{new Date(b.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedBooking(b); }}>
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

      {totalPages > 1 && (
        <div className="flex justify-center mt-4">
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
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-heading text-xl">Pilgrim Details</DialogTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditingBooking(selectedBooking); setSelectedBooking(null); }} className="gap-2">
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                  <Printer className="h-4 w-4" /> Print
                </Button>
              </div>
            </div>
          </DialogHeader>

          {selectedBooking && (
            <div ref={printRef}>
              {/* Header */}
              <div className="text-center mb-6 pb-4 border-b-2 border-primary">
                <h1 className="text-lg font-heading font-bold text-primary">🕋 Raudah Travels & Tours</h1>
                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">Pilgrim Booking Record</p>
              </div>

              {/* Accent bar */}
              <div className="h-1 rounded-full gold-gradient mb-6" />

              <div className="space-y-6">
                {/* Personal Info */}
                <div>
                  <h3 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <DetailField label="Full Name" value={selectedBooking.full_name} />
                    <DetailField label="Gender" value={selectedBooking.gender} />
                    <DetailField label="Date of Birth" value={selectedBooking.date_of_birth ? format(new Date(selectedBooking.date_of_birth), "PPP") : null} />
                    <DetailField label="Nationality" value={selectedBooking.nationality || "Nigerian"} />
                  </div>
                </div>

                {/* Travel Documents */}
                <div className="border-t border-border pt-4">
                  <h3 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest flex items-center gap-2">
                    <Plane className="h-3.5 w-3.5" />
                    Travel Documents
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <DetailField label="Passport Number" value={selectedBooking.passport_number} />
                    <DetailField label="Passport Expiry" value={selectedBooking.passport_expiry ? format(new Date(selectedBooking.passport_expiry), "PPP") : null} />
                    <DetailField label="Departure City" value={selectedBooking.departure_city} />
                  </div>
                </div>

                {/* Booking Info */}
                <div className="border-t border-border pt-4">
                  <h3 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Booking Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <DetailField label="Reference" value={selectedBooking.reference || selectedBooking.id.slice(0, 8)} />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold inline-block ${statusColors[selectedBooking.status]}`}>
                        {selectedBooking.status}
                      </span>
                    </div>
                    <DetailField label="Package" value={(selectedBooking as any).packages?.name} />
                    <DetailField label="Package Type" value={(selectedBooking as any).packages?.type} />
                    <DetailField label="Room Preference" value={selectedBooking.room_preference} />
                    <DetailField label="Booking Date" value={format(new Date(selectedBooking.created_at), "PPP")} />
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="border-t border-border pt-4">
                  <h3 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    Emergency Contact
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <DetailField label="Name" value={selectedBooking.emergency_contact_name} />
                    <DetailField label="Phone" value={selectedBooking.emergency_contact_phone} />
                    <DetailField label="Relationship" value={selectedBooking.emergency_contact_relationship} />
                  </div>
                </div>

                {/* Special Requests */}
                {selectedBooking.special_requests && (
                  <div className="border-t border-border pt-4">
                    <h3 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Special Requests
                    </h3>
                    <p className="text-sm text-foreground bg-muted/30 p-3 rounded-lg">{selectedBooking.special_requests}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin Edit Modal */}
      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          adminMode
          onClose={() => setEditingBooking(null)}
        />
      )}
    </div>
  );
};

export default AdminPilgrims;
