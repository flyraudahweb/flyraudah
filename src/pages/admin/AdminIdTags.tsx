import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import { QRCodeSVG } from "qrcode.react";
import { AlertCircle, Download, Printer, Search } from "lucide-react";

interface Booking {
  id: string;
  full_name: string;
  passport_number: string | null;
  reference: string | null;
  gender: string | null;
  status: string;
  departure_city: string | null;
  package: { name: string; type: string };
}

// Pilgrim ID Card component
const PilgrimIdCard = ({ booking }: { booking: Booking }) => {
  const initials = booking.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const year = new Date().getFullYear();

  return (
    <div className="id-card relative w-full max-w-[420px] rounded-xl overflow-hidden border-2 border-border shadow-lg bg-card print:shadow-none print:border print:border-border">
      {/* Islamic geometric watermark */}
      <div className="absolute inset-0 geometric-overlay opacity-30 pointer-events-none" />

      {/* Header with emerald gradient */}
      <div className="emerald-gradient px-5 py-3 flex items-center justify-between relative">
        <div>
          <h3 className="font-heading text-sm font-bold text-primary-foreground tracking-wide">
            PILGRIM ID CARD
          </h3>
          <p className="text-[10px] text-primary-foreground/80 font-body">
            Raudah Travels & Tours
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-primary-foreground/70 font-body">{year}</span>
        </div>
      </div>

      {/* Gold accent stripe */}
      <div className="h-1 gold-gradient" />

      {/* Body */}
      <div className="p-4 flex gap-4 relative">
        {/* Left: Avatar + Name */}
        <div className="flex flex-col items-center gap-2 min-w-[80px]">
          <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-secondary flex items-center justify-center">
            <span className="font-heading text-lg font-bold text-primary">{initials}</span>
          </div>
          <Badge
            variant={booking.status === "confirmed" ? "default" : "secondary"}
            className="text-[9px] capitalize"
          >
            {booking.status}
          </Badge>
        </div>

        {/* Center: Info grid */}
        <div className="flex-1 min-w-0">
          <h4 className="font-heading text-base font-bold text-foreground truncate mb-2">
            {booking.full_name}
          </h4>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
            <div>
              <span className="text-muted-foreground">Reference</span>
              <p className="font-medium text-foreground truncate">{booking.reference || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Package</span>
              <p className="font-medium text-foreground truncate">{booking.package.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Passport No.</span>
              <p className="font-medium text-foreground">{booking.passport_number || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Gender</span>
              <p className="font-medium text-foreground capitalize">{booking.gender || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Departure</span>
              <p className="font-medium text-foreground">{booking.departure_city || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Type</span>
              <p className="font-medium text-foreground capitalize">{booking.package.type}</p>
            </div>
          </div>
        </div>

        {/* Right: QR Code */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <QRCodeSVG
            value={booking.reference || booking.id}
            size={72}
            level="M"
            fgColor="hsl(162, 90%, 17%)"
            bgColor="transparent"
          />
          <span className="text-[8px] text-muted-foreground mt-1 font-mono">
            {booking.reference || booking.id.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="emerald-gradient px-5 py-1.5 flex items-center justify-between">
        <p className="text-[9px] text-primary-foreground/80 font-body">
          Your Gateway to the Holy Lands
        </p>
        <p className="text-[9px] text-primary-foreground/60 font-body">
          Kano, Nigeria
        </p>
      </div>
    </div>
  );
};

export default function AdminIdTags() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["admin-id-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, full_name, passport_number, reference, gender, status, departure_city, package_id")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const packageIds = [...new Set((data || []).map((b) => b.package_id))];
      const { data: pkgs } = await supabase
        .from("packages")
        .select("id, name, type")
        .in("id", packageIds);

      const pkgMap = new Map((pkgs || []).map((p) => [p.id, p]));

      return (data || []).map((booking) => {
        const pkg = pkgMap.get(booking.package_id);
        return {
          ...booking,
          package: pkg || { name: "Unknown", type: "umrah" },
        };
      }) as Booking[];
    },
  });

  const filteredBookings = bookings.filter(
    (b) =>
      b.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.passport_number?.includes(searchTerm)
  );

  const selectedList = filteredBookings.filter((b) => selectedBookings.has(b.id));

  const toggleSelection = (id: string) => {
    const s = new Set(selectedBookings);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedBookings(s);
  };

  const selectAll = () => {
    setSelectedBookings(
      selectedBookings.size === filteredBookings.length
        ? new Set()
        : new Set(filteredBookings.map((b) => b.id))
    );
  };

  const generatePDF = useCallback(() => {
    if (selectedList.length === 0) return;

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const cardW = 170;
    const cardH = 75;
    const marginX = 20;
    let y = 15;

    selectedList.forEach((booking, i) => {
      if (i > 0 && y + cardH > 270) {
        pdf.addPage();
        y = 15;
      }

      // Card border
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(marginX, y, cardW, cardH, 3, 3);

      // Header bg
      pdf.setFillColor(8, 71, 51); // emerald
      pdf.roundedRect(marginX, y, cardW, 14, 3, 3, "F");
      pdf.rect(marginX, y + 11, cardW, 3, "F"); // square off bottom corners

      // Header text
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("PILGRIM ID CARD", marginX + 5, y + 8);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.text("Raudah Travels & Tours", marginX + 5, y + 12);
      pdf.text(String(new Date().getFullYear()), marginX + cardW - 15, y + 8);

      // Gold stripe
      pdf.setFillColor(194, 154, 68); // gold
      pdf.rect(marginX, y + 14, cardW, 1.5, "F");

      // Body
      const bodyY = y + 19;
      pdf.setTextColor(60, 60, 60);

      // Avatar circle
      pdf.setFillColor(230, 240, 235);
      pdf.circle(marginX + 14, bodyY + 12, 10, "F");
      pdf.setDrawColor(194, 154, 68);
      pdf.setLineWidth(0.7);
      pdf.circle(marginX + 14, bodyY + 12, 10, "S");
      const initials = booking.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(8, 71, 51);
      pdf.text(initials, marginX + 14, bodyY + 14, { align: "center" });

      // Status badge
      pdf.setFontSize(6);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 100, 100);
      pdf.text(booking.status.toUpperCase(), marginX + 14, bodyY + 28, { align: "center" });

      // Name
      pdf.setTextColor(30, 30, 30);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text(booking.full_name, marginX + 30, bodyY + 4);

      // Info grid
      const col1X = marginX + 30;
      const col2X = marginX + 85;
      const infoStartY = bodyY + 10;
      pdf.setFontSize(6.5);

      const drawField = (label: string, value: string, x: number, fy: number) => {
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(130, 130, 130);
        pdf.text(label, x, fy);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(50, 50, 50);
        pdf.text(value || "—", x, fy + 4);
      };

      drawField("Reference", booking.reference || "—", col1X, infoStartY);
      drawField("Package", booking.package.name.slice(0, 25), col2X, infoStartY);
      drawField("Passport No.", booking.passport_number || "—", col1X, infoStartY + 11);
      drawField("Gender", (booking.gender || "—").charAt(0).toUpperCase() + (booking.gender || "").slice(1), col2X, infoStartY + 11);
      drawField("Departure", booking.departure_city || "—", col1X, infoStartY + 22);
      drawField("Type", booking.package.type.charAt(0).toUpperCase() + booking.package.type.slice(1), col2X, infoStartY + 22);

      // QR placeholder (text-based since we can't easily embed SVG)
      const qrX = marginX + cardW - 25;
      pdf.setDrawColor(8, 71, 51);
      pdf.setLineWidth(0.3);
      pdf.rect(qrX - 2, bodyY + 2, 22, 22);
      pdf.setFontSize(5);
      pdf.setTextColor(100, 100, 100);
      pdf.text(booking.reference || booking.id.slice(0, 8), qrX + 9, bodyY + 28, { align: "center" });
      // QR pattern
      pdf.setFillColor(8, 71, 51);
      for (let qy = 0; qy < 4; qy++) {
        for (let qx = 0; qx < 4; qx++) {
          if ((qx + qy) % 2 === 0) {
            pdf.rect(qrX + qx * 4.5, bodyY + 4 + qy * 4.5, 4, 4, "F");
          }
        }
      }

      // Footer
      const footerY = y + cardH - 6;
      pdf.setFillColor(8, 71, 51);
      pdf.rect(marginX, footerY, cardW, 6, "F");
      pdf.roundedRect(marginX, footerY - 1, cardW, 7, 0, 0); // override bottom
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(6);
      pdf.setFont("helvetica", "italic");
      pdf.text("Your Gateway to the Holy Lands", marginX + 5, footerY + 4);
      pdf.text("Kano, Nigeria", marginX + cardW - 25, footerY + 4);

      y += cardH + 10;
    });

    pdf.save(`pilgrim-id-cards-${new Date().toISOString().split("T")[0]}.pdf`);
  }, [selectedList]);

  const printCards = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Pilgrim ID Cards</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate beautiful, branded ID cards for your pilgrims
        </p>
      </div>

      {/* Search */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, reference, or passport..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={selectAll} disabled={filteredBookings.length === 0}>
              {selectedBookings.size === filteredBookings.length && filteredBookings.length > 0 ? "Deselect All" : "Select All"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {selectedBookings.size} of {filteredBookings.length} pilgrims selected
          </p>
        </CardContent>
      </Card>

      {/* Pilgrim List */}
      <Card className="border-border print:hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading">Select Pilgrims</CardTitle>
          <CardDescription>Choose pilgrims to generate ID cards for</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : filteredBookings.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No bookings found.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {filteredBookings.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id={b.id}
                    checked={selectedBookings.has(b.id)}
                    onCheckedChange={() => toggleSelection(b.id)}
                  />
                  <Label htmlFor={b.id} className="flex-1 cursor-pointer min-w-0">
                    <span className="font-medium text-foreground block truncate">{b.full_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {b.reference || b.id.slice(0, 8)} • {b.package.name}
                    </span>
                  </Label>
                  <Badge variant={b.status === "confirmed" ? "default" : "secondary"} className="text-[10px] capitalize shrink-0">
                    {b.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 print:hidden">
        <Button onClick={generatePDF} disabled={selectedBookings.size === 0} size="lg" className="gap-2">
          <Download className="h-4 w-4" /> Download PDF
        </Button>
        <Button onClick={printCards} disabled={selectedBookings.size === 0} variant="outline" size="lg" className="gap-2">
          <Printer className="h-4 w-4" /> Print Cards
        </Button>
      </div>

      {/* Live Preview */}
      {selectedList.length > 0 && (
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground mb-3 print:hidden">Preview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-1 print:gap-0">
            {selectedList.map((b) => (
              <div key={b.id} className="print:mb-4 print:break-inside-avoid">
                <PilgrimIdCard booking={b} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
