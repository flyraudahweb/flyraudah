import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useRef, useEffect } from "react";
import jsPDF from "jspdf";
import { AlertCircle, Download, Printer } from "lucide-react";

interface Booking {
  id: string;
  full_name: string;
  passport_number: string | null;
  reference: string | null;
  gender: string | null;
  status: string;
  package: {
    name: string;
  };
}

// Simple QR code generator using canvas
const generateQRCode = async (text: string): Promise<string> => {
  // Using a public QR code API for simplicity
  const encoded = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encoded}`;
};

export default function AdminIdTags() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());

  // Fetch all bookings
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, full_name, passport_number, reference, gender, status, package_id")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch package names
      const bookingsWithPackages = await Promise.all(
        (data || []).map(async (booking) => {
          const { data: pkg } = await supabase
            .from("packages")
            .select("name")
            .eq("id", booking.package_id)
            .single();
          return {
            ...booking,
            package: pkg || { name: "Unknown Package" },
          };
        })
      );

      return bookingsWithPackages as Booking[];
    },
  });

  // Filter bookings based on search
  const filteredBookings = bookings.filter(
    (booking) =>
      booking.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.reference?.includes(searchTerm) ||
      booking.passport_number?.includes(searchTerm)
  );

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedBookings);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedBookings(newSelected);
  };

  const selectAll = () => {
    if (selectedBookings.size === filteredBookings.length) {
      setSelectedBookings(new Set());
    } else {
      setSelectedBookings(new Set(filteredBookings.map((b) => b.id)));
    }
  };

  const generatePDF = async () => {
    if (selectedBookings.size === 0) return;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    let yPosition = 10;
    const selectedList = filteredBookings.filter((b) => selectedBookings.has(b.id));

    for (let i = 0; i < selectedList.length; i++) {
      if (i > 0 && yPosition > 200) {
        pdf.addPage();
        yPosition = 10;
      }

      const booking = selectedList[i];

      try {
        // Generate QR code image URL
        const qrUrl = await generateQRCode(booking.reference || booking.id);

        // Create image element to load the QR code
        const img = new Image();
        img.onload = () => {
          // Card background
          pdf.setDrawColor(200, 200, 200);
          pdf.rect(15, yPosition, 180, 70);

          // Title
          pdf.setFontSize(14);
          pdf.setFont(undefined, "bold");
          pdf.text("PILGRIM ID TAG", 20, yPosition + 8);

          // Booking info
          pdf.setFontSize(10);
          pdf.setFont(undefined, "normal");
          pdf.text(`Reference: ${booking.reference || booking.id}`, 20, yPosition + 16);
          pdf.text(`Name: ${booking.full_name}`, 20, yPosition + 23);
          pdf.text(`Package: ${booking.package.name}`, 20, yPosition + 30);
          pdf.text(`Status: ${booking.status}`, 20, yPosition + 37);

          // QR Code
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imgData = canvas.toDataURL("image/png");
            pdf.addImage(imgData, "PNG", 125, yPosition + 8, 60, 60);
          }
        };
        img.src = qrUrl;
      } catch (error) {
        console.error("Error generating QR code:", error);
      }

      yPosition += 80;
    }

    // Save with a small delay to ensure all images are processed
    setTimeout(() => {
      pdf.save(`pilgrim-id-tags-${new Date().toISOString().split("T")[0]}.pdf`);
    }, 500);
  };

  const printTags = async () => {
    if (selectedBookings.size === 0) return;

    const selectedList = filteredBookings.filter((b) => selectedBookings.has(b.id));
    const printWindow = window.open("", "", "height=800,width=600");
    if (!printWindow) return;

    let htmlContent = `
      <html>
        <head>
          <title>Pilgrim ID Tags</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
            .tag { 
              border: 2px solid #ccc; 
              padding: 15px; 
              margin: 10px 0;
              display: flex;
              gap: 20px;
              page-break-inside: avoid;
              align-items: center;
            }
            .tag-info { flex: 1; }
            .tag-qr { display: flex; align-items: center; justify-content: center; }
            .tag-qr img { max-width: 100px; height: auto; }
            .tag h3 { margin: 0 0 10px 0; font-size: 16px; font-weight: bold; }
            .tag p { margin: 5px 0; font-size: 12px; }
            @media print { .tag { page-break-inside: avoid; } }
          </style>
        </head>
        <body>
    `;

    for (const booking of selectedList) {
      const qrUrl = await generateQRCode(booking.reference || booking.id);
      htmlContent += `
        <div class="tag">
          <div class="tag-info">
            <h3>PILGRIM ID TAG</h3>
            <p><strong>Reference:</strong> ${booking.reference || booking.id}</p>
            <p><strong>Name:</strong> ${booking.full_name}</p>
            <p><strong>Package:</strong> ${booking.package.name}</p>
            <p><strong>Status:</strong> ${booking.status}</p>
          </div>
          <div class="tag-qr">
            <img src="${qrUrl}" alt="QR Code" />
          </div>
        </div>
      `;
    }

    htmlContent += `
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Print after a short delay to allow images to load
    setTimeout(() => {
      printWindow.print();
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pilgrim ID Tags</h1>
        <p className="text-muted-foreground mt-2">
          Generate and print QR code ID tags for pilgrims
        </p>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Search Pilgrims</CardTitle>
          <CardDescription>Find pilgrims to generate ID tags for</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by name, reference, or passport number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {selectedBookings.size} of {filteredBookings.length} selected
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Select Pilgrims</CardTitle>
            <CardDescription>Check the pilgrims you want to generate tags for</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
            disabled={filteredBookings.length === 0}
          >
            {selectedBookings.size === filteredBookings.length ? "Deselect All" : "Select All"}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading bookings...</p>
          ) : filteredBookings.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No bookings found matching your search.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent"
                >
                  <Checkbox
                    id={booking.id}
                    checked={selectedBookings.has(booking.id)}
                    onCheckedChange={() => toggleSelection(booking.id)}
                  />
                  <Label htmlFor={booking.id} className="flex-1 cursor-pointer">
                    <div className="font-medium">{booking.full_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {booking.reference || booking.id} • {booking.package.name}
                    </div>
                  </Label>
                  <span className="text-xs bg-muted px-2 py-1 rounded">{booking.status}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={generatePDF}
          disabled={selectedBookings.size === 0}
          className="gap-2"
          size="lg"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
        <Button
          onClick={printTags}
          disabled={selectedBookings.size === 0}
          variant="outline"
          className="gap-2"
          size="lg"
        >
          <Printer className="h-4 w-4" />
          Print Tags
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Select one or more pilgrims above, then download the PDF or print directly. Each tag
          includes the pilgrim's QR code for quick identification and check-in.
        </AlertDescription>
      </Alert>
    </div>
  );
}
