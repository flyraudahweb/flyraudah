import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users, Eye, Printer, Search, Download, FileSpreadsheet, Filter, UserPlus, Pencil, Loader2
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { downloadMultipleDocuments } from "@/utils/documentExport";

import EditBookingModal from "@/components/bookings/EditBookingModal";
import AdminPilgrimDetailDialog, { downloadCSV } from "@/components/admin/AdminPilgrimDetailDialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PilgrimAvatar = ({ booking }: { booking: any }) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPhoto = async () => {
      if (!booking.user_id) return;

      const { data } = await supabase
        .from("documents")
        .select("file_url")
        .eq("user_id", booking.user_id)
        .eq("type", "passport")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.file_url) {
        let signed = await supabase.storage.from("passport-photos").createSignedUrl(data.file_url, 3600);
        if (signed.data?.signedUrl) {
          if (isMounted) setPhotoUrl(signed.data.signedUrl);
          return;
        }
        signed = await supabase.storage.from("documents").createSignedUrl(data.file_url, 3600);
        if (signed.data?.signedUrl && isMounted) {
          setPhotoUrl(signed.data.signedUrl);
        }
      }
    };
    fetchPhoto();
    return () => { isMounted = false; };
  }, [booking.user_id]);

  return (
    <Avatar className="h-8 w-8 shrink-0 border border-border/50">
      {photoUrl && <AvatarImage src={photoUrl} className="object-cover" />}
      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
        {booking.full_name?.substring(0, 2).toUpperCase() || "??"}
      </AvatarFallback>
    </Avatar>
  );
};

const AdminPilgrims = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["admin-all-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, packages(name, type, price, currency, duration), payments(status)")
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
      const matchesGender = genderFilter === "all" || (b.gender && b.gender.toLowerCase() === genderFilter);

      const payments = (b as any).payments || [];
      const isVerified = payments.some((p: any) => p.status === "verified");
      const isPending = payments.some((p: any) => p.status === "pending") && !isVerified;

      let matchesPayment = true;
      if (paymentFilter === "verified") matchesPayment = isVerified;
      if (paymentFilter === "pending") matchesPayment = isPending || payments.length === 0;

      return matchesSearch && matchesStatus && matchesType && matchesPayment && matchesGender;
    });
  }, [bookings, search, statusFilter, typeFilter, paymentFilter, genderFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
    completed: "bg-muted text-muted-foreground",
  };

  // ── Selection helpers ──────────────────────────────────────────────────────
  const allPageSelected = paginated.length > 0 && paginated.every((b) => selectedIds.has(b.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginated.forEach((b) => next.delete(b.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginated.forEach((b) => next.add(b.id));
        return next;
      });
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Export helpers ─────────────────────────────────────────────────────────
  const exportAll = () => downloadCSV(filtered, `pilgrims_all_${format(new Date(), "yyyyMMdd")}.csv`);
  const exportSelected = () => {
    const rows = bookings.filter((b) => selectedIds.has(b.id));
    downloadCSV(rows, `pilgrims_selected_${format(new Date(), "yyyyMMdd")}.csv`);
  };

  const handlePrintBulk = () => {
    const rows = someSelected
      ? bookings.filter((b) => selectedIds.has(b.id))
      : filtered;
    const w = window.open("", "_blank");
    if (!w) return;
    const fmt = (d?: string | null) => d ? format(new Date(d), "PPP") : "—";
    const rowsHTML = rows.map((b, i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"}">
        <td>${i + 1}</td>
        <td><strong>${b.full_name}</strong></td>
        <td style="font-family:monospace">${b.reference || b.id.slice(0, 8)}</td>
        <td>${(b as any).packages?.name || "—"}</td>
        <td>${b.passport_number || "—"}</td>
        <td style="text-transform:capitalize">${b.gender || "—"}</td>
        <td>${b.phone || "—"}</td>
        <td>${b.departure_city || "—"}</td>
        <td><span style="padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;background:${b.status === "confirmed" ? "#d1fae5" : b.status === "pending" ? "#fef3c7" : "#f3f4f6"};color:${b.status === "confirmed" ? "#065f46" : b.status === "pending" ? "#92400e" : "#374151"}">${b.status}</span></td>
        <td>${new Date(b.created_at).toLocaleDateString()}</td>
      </tr>
    `).join("");
    w.document.write(`
      <!DOCTYPE html><html><head><title>Pilgrim List</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;padding:30px;color:#1a1a1a}
        h1{color:#166534;font-size:18px;margin-bottom:4px}p{font-size:11px;color:#888;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th{background:#166534;color:#fff;padding:8px 10px;text-align:left;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:0.5px}
        td{padding:7px 10px;border-bottom:1px solid #e5e7eb}
        .footer{margin-top:20px;font-size:10px;color:#aaa;text-align:right}
        @media print{body{padding:15px}}
      </style></head><body>
      <h1>🕋 Raudah Travels &amp; Tours — Pilgrim List</h1>
      <p>Printed on ${format(new Date(), "PPP 'at' p")} · ${rows.length} record${rows.length !== 1 ? "s" : ""}</p>
      <table><thead><tr>
        <th>#</th><th>Pilgrim Name</th><th>Reference</th><th>Package</th>
        <th>Passport No.</th><th>Gender</th><th>Phone</th><th>Departure</th>
        <th>Status</th><th>Booking Date</th>
      </tr></thead><tbody>${rowsHTML}</tbody></table>
      <div class="footer">Raudah Travels &amp; Tours Ltd. — Confidential</div>
      <script>window.print(); window.close();</script>
      </body></html>`);
    w.document.close();
  };

  const handleBulkDownload = async () => {
    setIsDownloading(true);
    try {
      const bookingIds = someSelected
        ? Array.from(selectedIds)
        : filtered.map(b => b.id);

      const { data: docs, error } = await supabase
        .from("documents")
        .select("*, bookings:booking_id(full_name)")
        .in("booking_id", bookingIds);

      if (error) throw error;

      if (!docs || docs.length === 0) {
        toast.error("No documents found for selected pilgrims.");
        return;
      }

      const downloadList = docs.map((d: any) => ({
        url: d.file_url,
        fileName: d.file_name,
        type: d.type,
        pilgrimName: d.bookings?.full_name || "Unknown",
      }));

      toast.info(`Preparing ${downloadList.length} documents for download...`);
      await downloadMultipleDocuments(downloadList, `pilgrim_documents_${format(new Date(), "yyyyMMdd")}.zip`);
      toast.success(`Downloaded ${downloadList.length} documents successfully.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to download documents");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Pilgrim Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} matching of {bookings.length} total bookings
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
          <Button onClick={() => navigate("/admin/book-pilgrim")} className="gap-2 shrink-0">
            <UserPlus className="h-4 w-4" /> Register Pilgrim
          </Button>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pilgrims…"
              className="pl-10"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          {/* Status filter */}
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-36 bg-card">
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
          {/* Type filter */}
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-36 bg-card">
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
          {/* Payment filter */}
          <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-36 bg-card">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Payment" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="pending">Pending/None</SelectItem>
            </SelectContent>
          </Select>
          {/* Gender filter */}
          <Select value={genderFilter} onValueChange={(v) => { setGenderFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-36 bg-card">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Gender" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
          {/* Export all */}
          <Button variant="outline" size="sm" onClick={exportAll} className="gap-2 whitespace-nowrap">
            <FileSpreadsheet className="h-4 w-4" /> Export CSV
          </Button>
          {/* Print all */}
          <Button variant="outline" size="sm" onClick={handlePrintBulk} className="gap-2 whitespace-nowrap">
            <Printer className="h-4 w-4" /> Print List
          </Button>
          {/* Bulk Download all */}
          <Button variant="default" size="sm" onClick={handleBulkDownload} disabled={isDownloading} className="gap-2 whitespace-nowrap">
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download Docs
          </Button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {someSelected && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
          <span className="text-sm font-medium text-primary">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" onClick={exportSelected} className="gap-2">
            <Download className="h-4 w-4" /> Export Selected CSV
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrintBulk} className="gap-2">
            <Printer className="h-4 w-4" /> Print Selected
          </Button>
          <Button size="sm" variant="default" onClick={handleBulkDownload} disabled={isDownloading} className="gap-2 ml-2">
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download Docs
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="ml-auto text-muted-foreground">
            Clear selection
          </Button>
        </div>
      )}

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
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allPageSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all on this page"
                    />
                  </TableHead>
                  <TableHead>Pilgrim</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead className="hidden md:table-cell">Passport</TableHead>
                  <TableHead className="hidden lg:table-cell">Gender</TableHead>
                  <TableHead className="hidden lg:table-cell">Phone</TableHead>
                  <TableHead className="hidden xl:table-cell">Departure</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((b) => {
                  const pkg = (b as any).packages;
                  const isChecked = selectedIds.has(b.id);
                  return (
                    <TableRow
                      key={b.id}
                      className={`cursor-pointer hover:bg-muted/30 ${isChecked ? "bg-primary/5" : ""}`}
                      onClick={() => setSelectedBooking(b)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleRow(b.id)}
                          aria-label={`Select ${b.full_name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <PilgrimAvatar booking={b} />
                          <span className="font-medium whitespace-nowrap">{b.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{b.reference || b.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{pkg?.name || "—"}</p>
                          <Badge variant="outline" className="capitalize text-xs mt-0.5">{pkg?.type || "—"}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs hidden md:table-cell font-mono">{b.passport_number || "—"}</TableCell>
                      <TableCell className="capitalize hidden lg:table-cell">{b.gender || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">{b.phone || "—"}</TableCell>
                      <TableCell className="hidden xl:table-cell">{b.departure_city || "—"}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[b.status]}`}>{b.status}</span>
                      </TableCell>
                      <TableCell className="text-xs hidden md:table-cell">{new Date(b.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedBooking(b)} title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => setEditingBooking(b)}
                            title="Edit Booking / Visa Information"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadCSV([b], `${b.full_name}.csv`)} title="Export CSV">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
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

      {/* Pagination */}
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
              {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                const pg = i + 1;
                return (
                  <PaginationItem key={pg}>
                    <PaginationLink onClick={() => setCurrentPage(pg)} isActive={currentPage === pg} className="cursor-pointer">
                      {pg}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              {totalPages > 7 && <PaginationItem><span className="px-3 text-muted-foreground">…{totalPages}</span></PaginationItem>}
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

      {/* Pilgrim Detail Dialog */}
      {selectedBooking && (
        <AdminPilgrimDetailDialog
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onEdit={(b) => { setEditingBooking(b); setSelectedBooking(null); }}
        />
      )}

      {/* Edit Modal */}
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
