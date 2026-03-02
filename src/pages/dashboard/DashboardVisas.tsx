import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
    ShieldCheck, Download, FileText, Package, Calendar,
    Clock, XCircle, Plane, AlertCircle, CheckCircle2, Loader2
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const visaCfg = {
    approved: {
        label: "Approved",
        bgBar: "from-emerald-500/15 to-emerald-500/5",
        border: "border-emerald-500/25",
        pill: "bg-emerald-100 text-emerald-700",
        icon: CheckCircle2,
        iconColor: "text-emerald-600",
    },
    pending: {
        label: "Pending",
        bgBar: "from-amber-500/15 to-amber-500/5",
        border: "border-amber-500/25",
        pill: "bg-amber-100 text-amber-700",
        icon: Clock,
        iconColor: "text-amber-600",
    },
    rejected: {
        label: "Rejected",
        bgBar: "from-red-500/15 to-red-500/5",
        border: "border-red-500/25",
        pill: "bg-red-100 text-red-700",
        icon: XCircle,
        iconColor: "text-red-600",
    },
};

const ticketCfg = {
    ready: {
        label: "Issued",
        pill: "bg-sky-100 text-sky-700",
        icon: CheckCircle2,
        iconColor: "text-sky-600",
    },
    pending: {
        label: "Pending",
        pill: "bg-amber-100 text-amber-700",
        icon: Clock,
        iconColor: "text-amber-500",
    },
};

// ─── Mini document download button ───────────────────────────────────────────

const DocBtn = ({ url, label, bucket, downloadingUrl, onDownload }: {
    url: string; label: string; bucket: string;
    downloadingUrl: string | null; onDownload: (url: string, bucket: string) => void;
}) => (
    <button
        onClick={() => onDownload(url, bucket)}
        disabled={downloadingUrl === url}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border/60 hover:border-primary/50 text-xs font-medium text-foreground transition-colors disabled:opacity-50"
    >
        {downloadingUrl === url
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Download className="w-3 h-3 text-primary" />
        }
        {label}
    </button>
);

// ─── Document section (visa or ticket) ───────────────────────────────────────

const DocSection = ({
    icon: Icon, title, status, statusLabel, message,
    documentUrl, documentBucket, extraDocs, expiryDate,
    downloadingUrl, onDownload, accent, notes,
}: any) => {
    const cfg = status === "approved"
        ? { ring: "border-emerald-200", header: "bg-emerald-50/60", iconBg: "bg-emerald-100", iconColor: "text-emerald-600", pillClass: "bg-emerald-100 text-emerald-700", pillLabel: "Approved", StatusIcon: CheckCircle2 }
        : status === "rejected"
            ? { ring: "border-red-200", header: "bg-red-50/60", iconBg: "bg-red-100", iconColor: "text-red-500", pillClass: "bg-red-100 text-red-700", pillLabel: "Rejected", StatusIcon: XCircle }
            : { ring: "border-amber-200", header: "bg-amber-50/40", iconBg: "bg-amber-100", iconColor: "text-amber-600", pillClass: "bg-amber-100 text-amber-700", pillLabel: "Pending", StatusIcon: Clock };

    return (
        <div className={`rounded-2xl border ${cfg.ring} overflow-hidden bg-background/60`}>
            {/* Header bar */}
            <div className={`${cfg.header} px-4 py-3 flex items-center justify-between gap-3`}>
                <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full ${cfg.iconBg} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
                    </div>
                    <span className="font-semibold text-sm text-foreground">{title}</span>
                </div>
                <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${cfg.pillClass}`}>
                    <cfg.StatusIcon className="w-3 h-3" /> {cfg.pillLabel}
                </span>
            </div>

            {/* Body */}
            <div className="px-4 py-3 space-y-3">
                {expiryDate && status === "approved" && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        Valid until: <span className="font-semibold text-foreground">{new Date(expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                )}

                {/* Pending message */}
                {status === "pending" && (
                    <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                        <span>Your {title.toLowerCase()} is currently being processed. You will be notified once it's ready.</span>
                    </div>
                )}

                {/* Rejected message */}
                {status === "rejected" && (
                    <div className="text-xs text-red-700 p-2.5 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
                        <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{notes || "This document was rejected. Please contact your travel coordinator for details."}</span>
                    </div>
                )}

                {/* Admin message */}
                {message && (
                    <div className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2.5 py-0.5">
                        {message}
                    </div>
                )}

                {/* Download actions */}
                {status === "approved" && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {documentUrl && (
                            <DocBtn
                                url={documentUrl}
                                label={`Download ${title}`}
                                bucket={documentBucket}
                                downloadingUrl={downloadingUrl}
                                onDownload={onDownload}
                            />
                        )}
                        {extraDocs?.map((doc: any) => (
                            <DocBtn
                                key={doc.id}
                                url={doc.file_url}
                                label={doc.file_name || "Document"}
                                bucket="documents"
                                downloadingUrl={downloadingUrl}
                                onDownload={onDownload}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const DashboardVisas = () => {
    const { user } = useAuth();
    const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

    const { data: bookings = [], isLoading } = useQuery({
        queryKey: ["user-travel-docs", user?.id],
        queryFn: async () => {
            const { data: bookingsData, error } = await supabase
                .from("bookings")
                .select(`
                  id, reference, full_name,
                  visa_status, visa_expiry_date, visa_document_url,
                  visa_delivery_message, visa_notes,
                  ticket_document_url, ticket_delivery_message,
                  created_at,
                  packages (name, type)
                `)
                .eq("user_id", user!.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            const bookingIds = (bookingsData || []).map(b => b.id);
            let extraDocs: any[] = [];
            if (bookingIds.length > 0) {
                const { data: docsData } = await supabase
                    .from("documents")
                    .select("*")
                    .in("booking_id", bookingIds)
                    .in("type", ["visa", "flight_ticket"]);
                if (docsData) extraDocs = docsData;
            }

            return (bookingsData || []).map(b => ({
                ...b,
                visa_extra_docs: extraDocs.filter(d => d.booking_id === b.id && d.type === "visa"),
                ticket_extra_docs: extraDocs.filter(d => d.booking_id === b.id && d.type === "flight_ticket"),
            }));
        },
        enabled: !!user?.id,
    });

    const openFile = async (fileUrl: string, bucket: string) => {
        setDownloadingUrl(fileUrl);
        try {
            const { data } = await supabase.storage.from(bucket).createSignedUrl(fileUrl, 3600);
            if (data?.signedUrl) window.open(data.signedUrl, "_blank");
        } finally {
            setDownloadingUrl(null);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="font-heading text-2xl font-bold text-foreground">Travel Documents</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Track your visa approvals and flight tickets for each package booking.
                </p>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2].map(i => <Skeleton key={i} className="h-64 rounded-2xl w-full" />)}
                </div>
            ) : bookings.length === 0 ? (
                <Card className="border-border/60 bg-background/50">
                    <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <ShieldCheck className="h-8 w-8 text-primary/60" />
                        </div>
                        <h3 className="font-heading text-lg font-semibold text-foreground mb-1">No Active Bookings</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            Once you have an active booking, your visa and ticket status will appear here.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-5">
                    {bookings.map((booking: any) => {
                        const visa = visaCfg[(booking.visa_status as keyof typeof visaCfg) || "pending"] || visaCfg.pending;
                        const hasTicket = !!(booking.ticket_document_url || (booking.ticket_extra_docs?.length > 0));

                        return (
                            <Card
                                key={booking.id}
                                className={`border ${visa.border} overflow-hidden bg-gradient-to-br from-background ${visa.bgBar}`}
                            >
                                {/* Card header — package info */}
                                <div className="px-5 pt-5 pb-4 border-b border-border/40">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            {/* Package name */}
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                    <Package className="w-4 h-4 text-primary" />
                                                </div>
                                                <h2 className="font-heading font-bold text-base text-foreground leading-tight">
                                                    {booking.packages?.name || "Booking"}
                                                </h2>
                                                {booking.packages?.type && (
                                                    <Badge variant="outline" className="capitalize text-xs">
                                                        {booking.packages.type}
                                                    </Badge>
                                                )}
                                            </div>
                                            {/* Reference & pilgrim */}
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground ml-9">
                                                <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                                                    {booking.reference || booking.id.slice(0, 8).toUpperCase()}
                                                </span>
                                                <span>·</span>
                                                <span>{booking.full_name}</span>
                                            </div>
                                        </div>
                                        {/* Status summary badges */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${visa.pill}`}>
                                                <visa.icon className={`w-3 h-3`} />
                                                Visa {visa.label}
                                            </span>
                                            <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${hasTicket ? "bg-sky-100 text-sky-700" : "bg-muted text-muted-foreground"}`}>
                                                <Plane className="w-3 h-3" />
                                                {hasTicket ? "Ticket Issued" : "Ticket Pending"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Documents Grid */}
                                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Visa Section */}
                                    <DocSection
                                        icon={ShieldCheck}
                                        title="Visa"
                                        status={booking.visa_status || "pending"}
                                        message={booking.visa_delivery_message}
                                        notes={booking.visa_notes}
                                        documentUrl={booking.visa_document_url}
                                        documentBucket="visa-documents"
                                        extraDocs={booking.visa_extra_docs}
                                        expiryDate={booking.visa_expiry_date}
                                        downloadingUrl={downloadingUrl}
                                        onDownload={openFile}
                                    />

                                    {/* Ticket Section */}
                                    <DocSection
                                        icon={Plane}
                                        title="Flight Ticket"
                                        status={hasTicket ? "approved" : "pending"}
                                        message={booking.ticket_delivery_message}
                                        documentUrl={booking.ticket_document_url}
                                        documentBucket="visa-documents"
                                        extraDocs={booking.ticket_extra_docs}
                                        downloadingUrl={downloadingUrl}
                                        onDownload={openFile}
                                    />
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DashboardVisas;
