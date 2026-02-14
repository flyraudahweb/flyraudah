import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { QRCodeSVG } from "qrcode.react";
import { AlertCircle, Download, Printer, Search, Zap, FileCheck } from "lucide-react";
import PilgrimIdCard, { type Booking } from "@/components/admin/PilgrimIdCard";

const LOGO_URL = "https://i.ibb.co/C3zkfpVR/Rauda-Logo-2-PNG.png";

export default function AdminIdTags() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  // Pre-load logo as data URL for PDF embedding
  useState(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        setLogoDataUrl(canvas.toDataURL("image/png"));
      }
    };
    img.src = LOGO_URL;
  });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["admin-id-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, full_name, passport_number, reference, gender, status, departure_city, package_id, emergency_contact_name, emergency_contact_phone")
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

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.passport_number?.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  const autoSelectConfirmed = () => {
    const confirmed = bookings.filter((b) => b.status === "confirmed").map((b) => b.id);
    setSelectedBookings(new Set(confirmed));
    setStatusFilter("all");
  };

  // Capture real QR code as image from hidden container
  const captureQR = async (value: string): Promise<string | null> => {
    const container = qrContainerRef.current;
    if (!container) return null;

    // Create a temporary QR element
    const tempDiv = document.createElement("div");
    tempDiv.style.cssText = "position:absolute;left:-9999px;top:0;background:white;padding:4px;";
    document.body.appendChild(tempDiv);

    const { createRoot } = await import("react-dom/client");
    const root = createRoot(tempDiv);

    await new Promise<void>((resolve) => {
      root.render(
        <QRCodeSVG value={value} size={200} level="M" fgColor="#084733" bgColor="#ffffff" />
      );
      setTimeout(resolve, 100);
    });

    try {
      const canvas = await html2canvas(tempDiv, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      return imgData;
    } finally {
      root.unmount();
      document.body.removeChild(tempDiv);
    }
  };

  const generatePDF = useCallback(async (bookingsList?: Booking[]) => {
    const list = bookingsList || selectedList;
    if (list.length === 0) return;

    setGenerating(true);
    setProgress(0);

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const cardW = 170;
    const cardH = 80;
    const marginX = 20;
    let y = 15;

    for (let i = 0; i < list.length; i++) {
      const booking = list[i];
      setProgress(Math.round(((i + 1) / list.length) * 100));

      if (i > 0 && y + cardH > 270) {
        pdf.addPage();
        y = 15;
      }

      // Card border with rounded corners
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(marginX, y, cardW, cardH, 3, 3);

      // Header bg
      pdf.setFillColor(8, 71, 51);
      pdf.roundedRect(marginX, y, cardW, 15, 3, 3, "F");
      pdf.rect(marginX, y + 12, cardW, 3, "F");

      // Logo in header
      if (logoDataUrl) {
        try {
          pdf.addImage(logoDataUrl, "PNG", marginX + 4, y + 3, 10, 10);
        } catch {}
      }

      // Header text
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("PILGRIM ID CARD", marginX + (logoDataUrl ? 16 : 5), y + 8);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.text("Raudah Travels & Tours", marginX + (logoDataUrl ? 16 : 5), y + 13);

      // Card number
      const cardNum = `RTT-${new Date().getFullYear()}-${booking.id.slice(-4).toUpperCase()}`;
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "bold");
      pdf.text(cardNum, marginX + cardW - 5, y + 8, { align: "right" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6);
      pdf.text(String(new Date().getFullYear()), marginX + cardW - 5, y + 13, { align: "right" });

      // Gold stripe
      pdf.setFillColor(194, 154, 68);
      pdf.rect(marginX, y + 15, cardW, 2, "F");

      // Body
      const bodyY = y + 20;

      // Avatar circle
      pdf.setFillColor(230, 240, 235);
      pdf.circle(marginX + 14, bodyY + 12, 11, "F");
      pdf.setDrawColor(194, 154, 68);
      pdf.setLineWidth(0.8);
      pdf.circle(marginX + 14, bodyY + 12, 11, "S");
      const initials = booking.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(8, 71, 51);
      pdf.text(initials, marginX + 14, bodyY + 15, { align: "center" });

      // Status badge
      pdf.setFontSize(6);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 100, 100);
      pdf.text(booking.status.toUpperCase(), marginX + 14, bodyY + 28, { align: "center" });

      // Name
      pdf.setTextColor(30, 30, 30);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text(booking.full_name, marginX + 32, bodyY + 4);

      // Info grid
      const col1X = marginX + 32;
      const col2X = marginX + 88;
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

      // Emergency contact
      pdf.setFontSize(5.5);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(130, 130, 130);
      pdf.text("Emergency:", col1X, infoStartY + 33);
      pdf.setTextColor(60, 60, 60);
      const emergencyText = booking.emergency_contact_name && booking.emergency_contact_phone
        ? `${booking.emergency_contact_name} (${booking.emergency_contact_phone})`
        : "Not provided";
      pdf.text(emergencyText, col1X + 18, infoStartY + 33);

      // Real QR code
      const qrX = marginX + cardW - 28;
      try {
        const qrImage = await captureQR(booking.reference || booking.id);
        if (qrImage) {
          pdf.addImage(qrImage, "PNG", qrX, bodyY + 2, 22, 22);
        }
      } catch {
        // Fallback: draw placeholder
        pdf.setDrawColor(8, 71, 51);
        pdf.setLineWidth(0.3);
        pdf.rect(qrX, bodyY + 2, 22, 22);
        pdf.setFontSize(5);
        pdf.setTextColor(100, 100, 100);
        pdf.text("QR", qrX + 11, bodyY + 14, { align: "center" });
      }
      pdf.setFontSize(5);
      pdf.setTextColor(100, 100, 100);
      pdf.text(booking.reference || booking.id.slice(0, 8), qrX + 11, bodyY + 28, { align: "center" });

      // Footer
      const footerY = y + cardH - 7;
      pdf.setFillColor(8, 71, 51);
      pdf.roundedRect(marginX, footerY, cardW, 7, 0, 0, "F");
      // Overlay bottom corners
      pdf.roundedRect(marginX, footerY + 4, cardW, 3, 3, 3, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(6);
      pdf.setFont("helvetica", "italic");
      pdf.text("Your Gateway to the Holy Lands", marginX + 5, footerY + 4.5);
      pdf.text("Kano, Nigeria", marginX + cardW - 25, footerY + 4.5);

      y += cardH + 10;
    }

    const count = list.length;
    const date = new Date().toISOString().split("T")[0];
    pdf.save(`pilgrim-ids-${date}-${count}cards.pdf`);
    setGenerating(false);
    setProgress(0);
  }, [selectedList]);

  const autoGenerateConfirmed = useCallback(async () => {
    const confirmed = bookings.filter((b) => b.status === "confirmed");
    if (confirmed.length === 0) return;
    await generatePDF(confirmed);
  }, [bookings, generatePDF]);

  const printCards = useCallback(() => {
    window.print();
  }, []);

  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Pilgrim ID Cards</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate beautiful, branded ID cards for your pilgrims
        </p>
      </div>

      {/* Status Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">
            All <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{bookings.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="confirmed">
            Confirmed <Badge variant="default" className="ml-1.5 text-[10px] px-1.5">{confirmedCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search & Quick Actions */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
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
            <Button variant="outline" size="sm" onClick={autoSelectConfirmed} disabled={confirmedCount === 0} className="gap-1.5">
              <FileCheck className="h-3.5 w-3.5" /> Select Confirmed
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

      {/* Progress bar */}
      {generating && (
        <Card className="border-border print:hidden">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Generating PDF with QR codes...</span>
                <span className="font-medium text-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap print:hidden">
        <Button onClick={() => generatePDF()} disabled={selectedBookings.size === 0 || generating} size="lg" className="gap-2">
          <Download className="h-4 w-4" /> Download PDF ({selectedBookings.size})
        </Button>
        <Button onClick={autoGenerateConfirmed} disabled={confirmedCount === 0 || generating} size="lg" variant="secondary" className="gap-2">
          <Zap className="h-4 w-4" /> Auto Generate Confirmed ({confirmedCount})
        </Button>
        <Button onClick={printCards} disabled={selectedBookings.size === 0} variant="outline" size="lg" className="gap-2">
          <Printer className="h-4 w-4" /> Print Cards
        </Button>
      </div>

      {/* Live Preview */}
      {selectedList.length > 0 && (
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground mb-3 print:hidden">
            Preview ({selectedList.length} cards)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-1 print:gap-0">
            {selectedList.map((b) => (
              <div key={b.id} className="print:mb-4 print:break-inside-avoid">
                <PilgrimIdCard booking={b} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden QR render container */}
      <div ref={qrContainerRef} className="hidden" aria-hidden="true" />
    </div>
  );
}
