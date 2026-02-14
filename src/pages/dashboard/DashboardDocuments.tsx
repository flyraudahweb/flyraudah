import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const DashboardDocuments = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState("passport");

  const { data: documents = [], isLoading, refetch } = useQuery({
    queryKey: ["user-documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user!.id)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Store the storage path, not a signed URL (signed URLs expire)
      const { error: dbError } = await supabase.from("documents").insert([{
        user_id: user.id,
        file_url: uploadData.path,
        file_name: file.name,
        type: documentType as any,
      }]);

      if (dbError) throw dbError;

      toast.success("Document uploaded successfully");
      refetch();
      e.target.value = "";
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {t("dashboard.documents.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("dashboard.documents.subtitle")}
        </p>
      </div>

      {/* Upload Section */}
      <Card className="border-border bg-muted/30">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <Label>Document Type</Label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background mt-2"
              >
                <option value="passport">Passport</option>
                <option value="vaccine_certificate">Vaccine Certificate</option>
                <option value="visa">Visa</option>
                <option value="flight_ticket">Flight Ticket</option>
                <option value="hotel_voucher">Hotel Voucher</option>
                <option value="payment_receipt">Payment Receipt</option>
                <option value="booking_confirmation">Booking Confirmation</option>
              </select>
            </div>
            <div>
              <Label>Upload Document</Label>
              <label className="flex items-center justify-center w-full px-4 py-6 mt-2 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload or drag and drop</span>
                </div>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleDocumentUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
              {t("dashboard.documents.noDocuments")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.documents.noDocumentsDesc")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            // Generate a fresh signed URL for download
            const getDownloadUrl = async () => {
              const { data } = await supabase.storage
                .from("documents")
                .createSignedUrl(doc.file_url, 3600);
              if (data?.signedUrl) window.open(data.signedUrl, "_blank");
              else toast.error("Failed to get download link");
            };

            return (
              <Card key={doc.id} className="border-border">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-secondary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {doc.file_name || doc.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {doc.type.replace(/_/g, " ")} • {new Date(doc.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={getDownloadUrl}>
                    <Download className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DashboardDocuments;
