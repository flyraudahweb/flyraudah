import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Download, Upload, Trash2, Eye,
  Shield, Plane, Syringe, CreditCard, FileCheck, Image, X
} from "lucide-react";
import { toast } from "sonner";

const docTypeConfig: Record<string, { label: string; icon: typeof FileText; color: string; bg: string }> = {
  passport: { label: "Passport", icon: Shield, color: "text-blue-600", bg: "bg-blue-500/10" },
  vaccine_certificate: { label: "Vaccine Certificate", icon: Syringe, color: "text-amber-600", bg: "bg-amber-500/10" },
  visa: { label: "Visa", icon: FileCheck, color: "text-purple-600", bg: "bg-purple-500/10" },
  flight_ticket: { label: "Flight Ticket", icon: Plane, color: "text-sky-600", bg: "bg-sky-500/10" },
  hotel_voucher: { label: "Hotel Voucher", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  payment_receipt: { label: "Payment Receipt", icon: CreditCard, color: "text-green-600", bg: "bg-green-500/10" },
  booking_confirmation: { label: "Booking Confirmation", icon: FileCheck, color: "text-primary", bg: "bg-primary/10" },
};

const DashboardDocuments = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState("passport");
  const [dragActive, setDragActive] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
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

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const doc = documents.find((d) => d.id === docId);
      if (doc) {
        await supabase.storage.from("documents").remove([doc.file_url]);
      }
      const { error } = await supabase.from("documents").delete().eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-documents"] });
      toast.success("Document deleted");
    },
    onError: () => toast.error("Failed to delete document"),
  });

  const uploadFile = async (file: File) => {
    if (!file || !user) return;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    setUploading(true);
    try {
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("documents").insert([{
        user_id: user.id,
        file_url: uploadData.path,
        file_name: file.name,
        type: documentType as any,
      }]);
      if (dbError) throw dbError;

      toast.success("Document uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["user-documents"] });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const getDownloadUrl = async (fileUrl: string) => {
    const { data } = await supabase.storage
      .from("documents")
      .createSignedUrl(fileUrl, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("Failed to get download link");
  };

  // Stats
  const typeCounts = documents.reduce((acc: Record<string, number>, doc) => {
    acc[doc.type] = (acc[doc.type] || 0) + 1;
    return acc;
  }, {});

  const formatFileSize = (name: string) => {
    // We don't have size in DB, just show extension
    const ext = name?.split(".").pop()?.toUpperCase() || "FILE";
    return ext;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {t("dashboard.documents.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("dashboard.documents.subtitle")}
        </p>
      </div>

      {/* Stats */}
      {documents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <div className="rounded-full px-3 py-1 bg-primary/10 text-primary text-xs font-medium">
            {documents.length} total documents
          </div>
          {Object.entries(typeCounts).map(([type, count]) => {
            const config = docTypeConfig[type];
            return (
              <div key={type} className={`rounded-full px-3 py-1 text-xs font-medium ${config?.bg || "bg-muted"} ${config?.color || "text-muted-foreground"}`}>
                {config?.label || type} ({count})
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Zone */}
      <Card className="border-border/60 bg-background/50">
        <CardContent className="p-5">
          <div className="space-y-4">
            {/* Document type selector */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Document Type</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(docTypeConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setDocumentType(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${documentType === key
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        }`}
                    >
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center px-6 py-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${dragActive
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : uploading
                    ? "border-muted bg-muted/30 pointer-events-none"
                    : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
                }`}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-sm text-muted-foreground">Uploading document…</p>
                </div>
              ) : (
                <>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${dragActive ? "bg-primary/10" : "bg-muted/50"
                    }`}>
                    <Upload className={`h-6 w-6 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {dragActive ? "Drop your file here" : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, Images • Max 10MB
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileInput}
                disabled={uploading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : documents.length === 0 ? (
        <Card className="border-border/60 bg-background/50">
          <CardContent className="py-14 text-center flex flex-col items-center">
            <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mb-3">
              <FileText className="h-7 w-7 text-primary/40" />
            </div>
            <h3 className="font-heading text-base font-semibold text-foreground mb-1">
              {t("dashboard.documents.noDocuments")}
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              {t("dashboard.documents.noDocumentsDesc")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const config = docTypeConfig[doc.type] || docTypeConfig.passport;
            const Icon = config.icon;

            return (
              <Card key={doc.id} className="border-border/60 bg-background/50 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Type icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.bg}`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {doc.file_name || doc.type}
                        </p>
                        <Badge variant="outline" className={`text-[10px] px-2 py-0 border ${config.color} ${config.bg}`}>
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{formatFileSize(doc.file_name)}</span>
                        <span>•</span>
                        <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => getDownloadUrl(doc.file_url)}
                        title="View / Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Delete this document?")) {
                            deleteMutation.mutate(doc.id);
                          }
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
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
