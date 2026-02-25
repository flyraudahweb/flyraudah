import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Shield, Syringe, FileCheck, Plane, CreditCard, FileText,
    Download, Printer, Pencil, Users, Calendar, Phone, AlertCircle,
    Image, Eye, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const docTypeConfig: Record<string, { label: string; icon: typeof FileText; color: string; bg: string }> = {
    passport: { label: "Passport", icon: Shield, color: "text-blue-600", bg: "bg-blue-500/10" },
    vaccine_certificate: { label: "Vaccine Certificate", icon: Syringe, color: "text-amber-600", bg: "bg-amber-500/10" },
    visa: { label: "Visa", icon: FileCheck, color: "text-purple-600", bg: "bg-purple-500/10" },
    flight_ticket: { label: "Flight Ticket", icon: Plane, color: "text-sky-600", bg: "bg-sky-500/10" },
    hotel_voucher: { label: "Hotel Voucher", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    payment_receipt: { label: "Payment Receipt", icon: CreditCard, color: "text-green-600", bg: "bg-green-500/10" },
    booking_confirmation: { label: "Booking Confirmation", icon: FileCheck, color: "text-primary", bg: "bg-primary/10" },
};

const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
    completed: "bg-muted text-muted-foreground",
};

const Field = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="space-y-0.5">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
);

// ─── PDF / Print helper ───────────────────────────────────────────────────────

const buildPrintHTML = (b: any) => {
    const pkg = b.packages;
    const fmt = (d?: string | null) => d ? format(new Date(d), "PPP") : "—";
    return `
<!DOCTYPE html><html><head><title>Pilgrim: ${b.full_name}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',sans-serif;padding:40px;color:#1a1a1a;background:#fff}
  .header{display:flex;justify-content:space-between;border-bottom:3px solid #166534;padding-bottom:16px;margin-bottom:20px}
  .brand h1{font-size:20px;color:#166534;font-weight:700}.brand p{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px}
  .ref{text-align:right}.ref .lbl{font-size:10px;color:#888;text-transform:uppercase}.ref .val{font-size:16px;font-weight:700;color:#166534;font-family:monospace}.ref .dt{font-size:11px;color:#666}
  .accent{height:4px;background:linear-gradient(135deg,#16a34a,#166534);border-radius:2px;margin-bottom:20px}
  h3{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#166534;margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid #e5e7eb}
  .section{margin-bottom:20px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px}
  .g3{grid-template-columns:1fr 1fr 1fr}
  .fl{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px}
  .fv{font-size:12px;font-weight:500}
  .badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:600;text-transform:capitalize}
  .pending{background:#fef3c7;color:#92400e}.confirmed{background:#d1fae5;color:#065f46}.cancelled{background:#fee2e2;color:#991b1b}.completed{background:#e5e7eb;color:#374151}
  .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between}
  .footer p{font-size:10px;color:#aaa}
  @media print{body{padding:20px}}
</style></head><body>
<div class="header">
  <div class="brand"><h1>🕋 Raudah Travels &amp; Tours</h1><p>Pilgrim Booking Record</p></div>
  <div class="ref"><p class="lbl">Booking Reference</p><p class="val">${b.reference || b.id.slice(0, 8)}</p><p class="dt">${fmt(b.created_at)}</p></div>
</div>
<div class="accent"></div>

<div class="section">
  <h3>Personal Information</h3>
  <div class="grid">
    <div><p class="fl">Full Name</p><p class="fv">${b.full_name || "—"}</p></div>
    <div><p class="fl">Gender</p><p class="fv" style="text-transform:capitalize">${b.gender || "—"}</p></div>
    <div><p class="fl">Date of Birth</p><p class="fv">${fmt(b.date_of_birth)}</p></div>
    <div><p class="fl">Nationality</p><p class="fv">${b.nationality || "Nigerian"}</p></div>
    <div><p class="fl">Marital Status</p><p class="fv" style="text-transform:capitalize">${b.marital_status || "—"}</p></div>
    <div><p class="fl">Place of Birth</p><p class="fv">${b.place_of_birth || "—"}</p></div>
    <div><p class="fl">Occupation</p><p class="fv">${b.occupation || "—"}</p></div>
    <div><p class="fl">Phone</p><p class="fv">${b.phone || "—"}</p></div>
    <div><p class="fl">Father's Name</p><p class="fv">${b.fathers_name || "—"}</p></div>
    <div><p class="fl">Mother's Name</p><p class="fv">${b.mothers_name || "—"}</p></div>
    <div class="g3" style="grid-column:1/-1"><p class="fl">Address</p><p class="fv">${b.address || "—"}</p></div>
  </div>
</div>

<div class="section">
  <h3>Passport &amp; Visa Data</h3>
  <div class="grid">
    <div><p class="fl">Passport Number</p><p class="fv" style="font-family:monospace;letter-spacing:1px">${b.passport_number || "—"}</p></div>
    <div><p class="fl">Passport Expiry</p><p class="fv">${fmt(b.passport_expiry)}</p></div>
    <div><p class="fl">Meningitis Vaccine</p><p class="fv">${fmt(b.meningitis_vaccine_date)}</p></div>
    <div><p class="fl">Previous Umrah</p><p class="fv">${b.previous_umrah ? `Yes (${b.previous_umrah_year || "Year unknown"})` : "No"}</p></div>
    <div><p class="fl">Mahram Name</p><p class="fv">${b.mahram_name || "—"}</p></div>
    <div><p class="fl">Mahram Relationship</p><p class="fv">${b.mahram_relationship || "—"}</p></div>
    <div><p class="fl">Mahram Passport</p><p class="fv">${b.mahram_passport || "—"}</p></div>
  </div>
</div>

<div class="section">
  <h3>Booking Details</h3>
  <div class="grid">
    <div><p class="fl">Package</p><p class="fv">${pkg?.name || "—"}</p></div>
    <div><p class="fl">Type</p><p class="fv" style="text-transform:capitalize">${pkg?.type || "—"}</p></div>
    <div><p class="fl">Room Preference</p><p class="fv" style="text-transform:capitalize">${b.room_preference || "—"}</p></div>
    <div><p class="fl">Departure City</p><p class="fv">${b.departure_city || "—"}</p></div>
    <div><p class="fl">Status</p><p class="fv"><span class="badge ${b.status}">${b.status}</span></p></div>
    <div><p class="fl">Booked On</p><p class="fv">${fmt(b.created_at)}</p></div>
  </div>
</div>

<div class="section">
  <h3>Emergency Contact</h3>
  <div class="grid">
    <div><p class="fl">Name</p><p class="fv">${b.emergency_contact_name || "—"}</p></div>
    <div><p class="fl">Phone</p><p class="fv">${b.emergency_contact_phone || "—"}</p></div>
    <div><p class="fl">Relationship</p><p class="fv">${b.emergency_contact_relationship || "—"}</p></div>
  </div>
</div>

${b.special_requests ? `<div class="section"><h3>Special Requests</h3><p class="fv">${b.special_requests}</p></div>` : ""}

<div class="footer">
  <p>Printed on ${format(new Date(), "PPP 'at' p")}</p>
  <p>Raudah Travels &amp; Tours Ltd.</p>
</div>
<script>window.print(); window.close();</script>
</body></html>`;
};

const openPrint = (b: any) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(buildPrintHTML(b));
    w.document.close();
};

// ─── CSV Export (single booking) ─────────────────────────────────────────────

export const bookingToCSVRow = (b: any): Record<string, string> => ({
    Reference: b.reference || b.id.slice(0, 8),
    "Full Name": b.full_name || "",
    Gender: b.gender || "",
    "Date of Birth": b.date_of_birth || "",
    Nationality: b.nationality || "",
    "Place of Birth": b.place_of_birth || "",
    "Marital Status": b.marital_status || "",
    Occupation: b.occupation || "",
    Phone: b.phone || "",
    Address: b.address || "",
    "Father's Name": b.fathers_name || "",
    "Mother's Name": b.mothers_name || "",
    "Passport Number": b.passport_number || "",
    "Passport Expiry": b.passport_expiry || "",
    "Mahram Name": b.mahram_name || "",
    "Mahram Relationship": b.mahram_relationship || "",
    "Mahram Passport": b.mahram_passport || "",
    "Meningitis Vaccine Date": b.meningitis_vaccine_date || "",
    "Previous Umrah": b.previous_umrah ? "Yes" : "No",
    "Previous Umrah Year": b.previous_umrah_year?.toString() || "",
    Package: b.packages?.name || "",
    "Package Type": b.packages?.type || "",
    "Room Preference": b.room_preference || "",
    "Departure City": b.departure_city || "",
    Status: b.status || "",
    "Emergency Contact Name": b.emergency_contact_name || "",
    "Emergency Contact Phone": b.emergency_contact_phone || "",
    "Emergency Contact Rel.": b.emergency_contact_relationship || "",
    "Special Requests": b.special_requests || "",
    "Booking Date": b.created_at ? format(new Date(b.created_at), "yyyy-MM-dd") : "",
});

export const downloadCSV = (rows: any[], filename = "pilgrims.csv") => {
    if (!rows.length) { toast.error("No data to export"); return; }
    const data = rows.map(bookingToCSVRow);
    const headers = Object.keys(data[0]);
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(","), ...data.map(r => headers.map(h => escape(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} record${rows.length > 1 ? "s" : ""}`);
};

// ─── Main Dialog Component ────────────────────────────────────────────────────

interface Props {
    booking: any;
    onClose: () => void;
    onEdit: (booking: any) => void;
}

const AdminPilgrimDetailDialog = ({ booking, onClose, onEdit }: Props) => {
    const pkg = booking?.packages;

    // Fetch all documents for this pilgrim (by user_id + booking_id)
    const { data: documents = [], isLoading: docsLoading } = useQuery({
        queryKey: ["admin-pilgrim-documents", booking?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("documents")
                .select("*")
                .eq("user_id", booking.user_id)
                .order("uploaded_at", { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!booking?.user_id,
    });

    // Passport photo — look for document of type "passport" linked to this booking
    const passportDoc = documents.find(
        (d: any) => d.type === "passport" && (d.booking_id === booking?.id || !d.booking_id)
    );

    const [passportPhotoUrl, setPassportPhotoUrl] = useState<string | null>(null);
    const [photoLoading, setPhotoLoading] = useState(false);
    const [photoLoaded, setPhotoLoaded] = useState(false);

    const loadPassportPhoto = async () => {
        if (!passportDoc || photoLoaded) return;
        setPhotoLoading(true);
        try {
            const { data } = await supabase.storage
                .from("passport-photos")
                .createSignedUrl(passportDoc.file_url, 3600);
            if (data?.signedUrl) {
                setPassportPhotoUrl(data.signedUrl);
                setPhotoLoaded(true);
            } else {
                // Try documents bucket
                const { data: d2 } = await supabase.storage
                    .from("documents")
                    .createSignedUrl(passportDoc.file_url, 3600);
                if (d2?.signedUrl) { setPassportPhotoUrl(d2.signedUrl); setPhotoLoaded(true); }
                else toast.error("Could not load passport photo");
            }
        } catch {
            toast.error("Failed to load passport photo");
        } finally {
            setPhotoLoading(false);
        }
    };

    const getDocUrl = async (doc: any) => {
        const bucket = doc.file_url.startsWith(`${doc.user_id}/`) ? "documents" : "documents";
        const { data } = await supabase.storage.from(bucket).createSignedUrl(doc.file_url, 3600);
        if (data?.signedUrl) window.open(data.signedUrl, "_blank");
        else {
            const { data: d2 } = await supabase.storage.from("passport-photos").createSignedUrl(doc.file_url, 3600);
            if (d2?.signedUrl) window.open(d2.signedUrl, "_blank");
            else toast.error("Failed to get file link");
        }
    };

    if (!booking) return null;

    return (
        <Dialog open={!!booking} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <DialogTitle className="font-heading text-xl">{booking.full_name}</DialogTitle>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => onEdit(booking)} className="gap-1.5">
                                <Pencil className="h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openPrint(booking)} className="gap-1.5">
                                <Printer className="h-3.5 w-3.5" /> Print
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => downloadCSV([booking], `${booking.full_name}.csv`)} className="gap-1.5">
                                <Download className="h-3.5 w-3.5" /> Export
                            </Button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">{booking.reference || booking.id.slice(0, 8)}</span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${statusColors[booking.status] || "bg-muted text-muted-foreground"}`}>
                            {booking.status}
                        </span>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="booking" onValueChange={(v) => v === "photo" && loadPassportPhoto()}>
                    <TabsList className="grid grid-cols-4 w-full">
                        <TabsTrigger value="booking" className="gap-1.5 text-xs"><Calendar className="h-3 w-3" /> Booking</TabsTrigger>
                        <TabsTrigger value="passport" className="gap-1.5 text-xs"><Shield className="h-3 w-3" /> Passport Data</TabsTrigger>
                        <TabsTrigger value="documents" className="gap-1.5 text-xs"><FileText className="h-3 w-3" /> Documents</TabsTrigger>
                        <TabsTrigger value="photo" className="gap-1.5 text-xs"><Image className="h-3 w-3" /> Passport Photo</TabsTrigger>
                    </TabsList>

                    {/* ── Tab 1: Booking Info ── */}
                    <TabsContent value="booking" className="space-y-5 pt-2">
                        {/* Personal */}
                        <div>
                            <h3 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest flex items-center gap-2">
                                <Users className="h-3.5 w-3.5" /> Personal Information
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <Field label="Full Name" value={booking.full_name} />
                                <Field label="Gender" value={booking.gender} />
                                <Field label="Date of Birth" value={booking.date_of_birth ? format(new Date(booking.date_of_birth), "PPP") : null} />
                                <Field label="Nationality" value={booking.nationality || "Nigerian"} />
                                <Field label="Marital Status" value={booking.marital_status} />
                                <Field label="Occupation" value={booking.occupation} />
                                <Field label="Phone" value={booking.phone} />
                            </div>
                            {booking.address && <div className="mt-3"><Field label="Address" value={booking.address} /></div>}
                        </div>
                        {/* Booking */}
                        <div className="border-t border-border pt-4">
                            <h3 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest flex items-center gap-2">
                                <Plane className="h-3.5 w-3.5" /> Booking Details
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <Field label="Package" value={pkg?.name} />
                                <Field label="Package Type" value={pkg?.type} />
                                <Field label="Room Preference" value={booking.room_preference} />
                                <Field label="Departure City" value={booking.departure_city} />
                                <Field label="Booking Date" value={format(new Date(booking.created_at), "PPP")} />
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Status</p>
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold inline-block ${statusColors[booking.status]}`}>{booking.status}</span>
                                </div>
                            </div>
                        </div>
                        {/* Emergency contact */}
                        <div className="border-t border-border pt-4">
                            <h3 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5" /> Emergency Contact
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <Field label="Name" value={booking.emergency_contact_name} />
                                <Field label="Phone" value={booking.emergency_contact_phone} />
                                <Field label="Relationship" value={booking.emergency_contact_relationship} />
                            </div>
                        </div>
                        {booking.special_requests && (
                            <div className="border-t border-border pt-4">
                                <h3 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest flex items-center gap-2">
                                    <AlertCircle className="h-3.5 w-3.5" /> Special Requests
                                </h3>
                                <p className="text-sm text-foreground bg-muted/30 p-3 rounded-lg">{booking.special_requests}</p>
                            </div>
                        )}
                    </TabsContent>

                    {/* ── Tab 2: Passport Data ── */}
                    <TabsContent value="passport" className="space-y-5 pt-2">
                        <div>
                            <h3 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest flex items-center gap-2">
                                <Shield className="h-3.5 w-3.5" /> Passport Information
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <Field label="Passport Number" value={booking.passport_number} />
                                <Field label="Passport Expiry" value={booking.passport_expiry ? format(new Date(booking.passport_expiry), "PPP") : null} />
                                <Field label="Place of Birth" value={booking.place_of_birth} />
                                <Field label="Father's Name" value={booking.fathers_name} />
                                <Field label="Mother's Name" value={booking.mothers_name} />
                            </div>
                        </div>
                        <div className="border-t border-border pt-4">
                            <h3 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest flex items-center gap-2">
                                <Syringe className="h-3.5 w-3.5" /> Health &amp; Visa Info
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <Field label="Meningitis Vaccine Date" value={booking.meningitis_vaccine_date ? format(new Date(booking.meningitis_vaccine_date), "PPP") : null} />
                                <Field label="Previous Umrah" value={booking.previous_umrah ? `Yes (${booking.previous_umrah_year || "Year unknown"})` : "No"} />
                            </div>
                        </div>
                        {(booking.mahram_name || booking.mahram_relationship || booking.mahram_passport) && (
                            <div className="border-t border-border pt-4">
                                <h3 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest flex items-center gap-2">
                                    <Users className="h-3.5 w-3.5" /> Mahram Information
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <Field label="Mahram Name" value={booking.mahram_name} />
                                    <Field label="Relationship" value={booking.mahram_relationship} />
                                    <Field label="Mahram Passport" value={booking.mahram_passport} />
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* ── Tab 3: Documents ── */}
                    <TabsContent value="documents" className="pt-2">
                        {docsLoading ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
                            </div>
                        ) : documents.length === 0 ? (
                            <div className="text-center py-10">
                                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                                <p className="text-sm text-muted-foreground">No documents uploaded by this pilgrim</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {documents.map((doc: any) => {
                                    const config = docTypeConfig[doc.type] || docTypeConfig.passport;
                                    const Icon = config.icon;
                                    const ext = doc.file_name?.split(".").pop()?.toUpperCase() || "FILE";
                                    return (
                                        <div key={doc.id} className="flex items-center gap-3 p-3 border border-border rounded-xl bg-card hover:shadow-sm transition-all">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
                                                <Icon className={`h-4 w-4 ${config.color}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold truncate">{doc.file_name || doc.type}</p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${config.color} ${config.bg}`}>{config.label}</Badge>
                                                    <span>{ext}</span>
                                                    <span>•</span>
                                                    <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                                    {doc.booking_id === booking.id && (
                                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-primary bg-primary/10">This booking</Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => getDocUrl(doc)} title="View / Download">
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>

                    {/* ── Tab 4: Passport Photo ── */}
                    <TabsContent value="photo" className="pt-2">
                        {!passportDoc ? (
                            <div className="text-center py-10">
                                <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                                <p className="text-sm text-muted-foreground">No passport photo uploaded</p>
                                <p className="text-xs text-muted-foreground mt-1">The pilgrim hasn't uploaded a passport photo scan yet.</p>
                            </div>
                        ) : photoLoading ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm text-muted-foreground">Loading passport photo…</p>
                            </div>
                        ) : passportPhotoUrl ? (
                            <div className="space-y-3">
                                {/* Requirements reminder */}
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                                    <p className="font-semibold mb-1">📋 Saudi Umrah Visa — Passport Photo Requirements</p>
                                    <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                                        <li>White or off-white background</li>
                                        <li>Centered, front-facing, no glasses</li>
                                        <li>Full face visible, taken within 6 months</li>
                                        <li>Minimum 600×600 px, max 5MB</li>
                                        <li>Format: JPEG or PNG preferred</li>
                                    </ul>
                                </div>
                                <div className="border border-border rounded-xl overflow-hidden bg-muted/20">
                                    <img src={passportPhotoUrl} alt="Passport photo" className="w-full max-h-[400px] object-contain" />
                                </div>
                                <Button variant="outline" size="sm" onClick={() => window.open(passportPhotoUrl, "_blank")} className="gap-2">
                                    <Eye className="h-4 w-4" /> Open Full Size
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <Button onClick={loadPassportPhoto} className="gap-2">
                                    <Image className="h-4 w-4" /> Load Passport Photo
                                </Button>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default AdminPilgrimDetailDialog;
