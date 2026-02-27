import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Clock, CheckCircle, XCircle, ChevronDown, ChevronUp,
    User, Calendar, Info, AlertCircle, FileText, ExternalLink, Package,
    Pencil, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const FIELD_LABELS: Record<string, string> = {
    phone: "Phone Number",
    address: "Home Address",
    emergency_contact_name: "Emergency Contact Name",
    emergency_contact_phone: "Emergency Contact Phone",
    emergency_contact_relationship: "Emergency Contact Relationship",
    special_requests: "Special Requests",
    package_id: "Package",
    package_date_id: "Travel Date",
    documents: "Document Updates"
};

const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
    pending: { label: "Pending Review", className: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock },
    approved: { label: "Approved", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle },
    rejected: { label: "Rejected", className: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
};

const AdminAmendmentRequests = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
    const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

    const { data: requests = [], isLoading } = useQuery({
        queryKey: ["admin-amendment-requests"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("booking_amendment_requests")
                .select(`
                    *,
                    profiles!user_id (full_name, email),
                    bookings:booking_id (id, reference, status, full_name)
                `)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data;
        },
    });

    // Fetch packages for labels
    const { data: packages = [] } = useQuery({
        queryKey: ["packages-labels"],
        queryFn: async () => {
            const { data, error } = await supabase.from("packages").select("id, name");
            if (error) throw error;
            return data;
        },
    });

    // Fetch dates for labels
    const { data: packageDates = [] } = useQuery({
        queryKey: ["package-dates-labels"],
        queryFn: async () => {
            const { data, error } = await supabase.from("package_dates").select("id, outbound");
            if (error) throw error;
            return data;
        },
    });

    const getPackageName = (id: string) => packages.find((p: any) => p.id === id)?.name || id;
    const getPackageDate = (id: string) => {
        const d = packageDates.find((pd: any) => pd.id === id)?.outbound;
        return d ? format(new Date(d), "dd MMM yyyy") : id;
    };

    const reviewMutation = useMutation({
        mutationFn: async ({
            requestId,
            bookingId,
            decision,
            changes,
            notes
        }: {
            requestId: string;
            bookingId: string;
            decision: "approved" | "rejected";
            changes: Record<string, any>;
            notes: string;
        }) => {
            // Update the request status
            const { error: requestError } = await supabase
                .from("booking_amendment_requests")
                .update({
                    status: decision,
                    reviewed_at: new Date().toISOString(),
                    admin_notes: notes
                })
                .eq("id", requestId);

            if (requestError) throw requestError;

            // If approved, apply the changes to the booking
            if (decision === "approved") {
                const bookingUpdate: any = { ...changes };
                const docsToUpdate = bookingUpdate.documents;
                delete bookingUpdate.documents;

                if (Object.keys(bookingUpdate).length > 0) {
                    const { error: bookingError } = await supabase
                        .from("bookings")
                        .update({ ...bookingUpdate, updated_at: new Date().toISOString() })
                        .eq("id", bookingId);
                    if (bookingError) throw bookingError;
                }

                // Handle document updates
                if (docsToUpdate && Array.isArray(docsToUpdate)) {
                    for (const doc of docsToUpdate) {
                        const { type, file_url, file_name } = doc;
                        // Check if document exists for this booking and type
                        const { data: existingDoc } = await supabase
                            .from("documents")
                            .select("id")
                            .eq("booking_id", bookingId)
                            .eq("type", type)
                            .maybeSingle();

                        if (existingDoc) {
                            await supabase
                                .from("documents")
                                .update({ file_url, file_name, status: 'pending', uploaded_at: new Date().toISOString() })
                                .eq("id", existingDoc.id);
                        } else {
                            await supabase
                                .from("documents")
                                .insert({
                                    booking_id: bookingId,
                                    user_id: user?.id,
                                    type,
                                    file_url,
                                    file_name,
                                    status: 'pending'
                                });
                        }
                    }
                }
            }
        },
        onSuccess: (_, { decision }) => {
            queryClient.invalidateQueries({ queryKey: ["admin-amendment-requests"] });
            queryClient.invalidateQueries({ queryKey: ["admin-all-bookings"] });
            toast.success(`Request ${decision} successfully`);
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to process request");
        },
    });

    const pendingCount = requests.filter((r: any) => r.status === "pending").length;

    const renderValue = (key: string, value: any) => {
        if (value === null || value === undefined) return "N/A";
        if (key === "package_id") return getPackageName(value);
        if (key === "package_date_id") return getPackageDate(value);
        if (key === "documents" && Array.isArray(value)) {
            return (
                <div className="space-y-2 mt-1">
                    {value.map((doc: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-2 p-2 bg-muted/40 rounded border border-border/40">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[10px] font-semibold capitalize leading-none">{doc.type.replace("_", " ")}</p>
                                    <p className="text-[10px] text-muted-foreground truncate leading-none mt-1">{doc.file_name}</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                asChild
                            >
                                <a
                                    href={`${supabase.storage.from("documents").getPublicUrl(doc.file_url).data.publicUrl}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </Button>
                        </div>
                    ))}
                </div>
            );
        }
        return value.toString();
    };

    const renderRequestedChanges = (changes: any) => {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(changes).map(([key, value]) => (
                    <div key={key} className="p-3 bg-muted/30 rounded-lg border border-border/50">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                            {FIELD_LABELS[key as keyof typeof FIELD_LABELS] || key}
                        </p>
                        <div className="text-sm font-medium text-foreground">
                            {renderValue(key, value)}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-secondary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Amendment Requests</h1>
                    <p className="text-sm text-muted-foreground">Manage requests for booking modifications</p>
                </div>
                {pendingCount > 0 && (
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 gap-1.5 border-amber-500/20 h-7 px-3">
                        <Clock className="h-3.5 w-3.5" />
                        {pendingCount} Pending
                    </Badge>
                )}
            </div>

            {requests.length === 0 ? (
                <Card className="border-border/60 bg-muted/20">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Info className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">No requests found</h3>
                        <p className="text-sm text-muted-foreground max-w-xs"> There are no booking amendment requests at this time.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {requests.map((request: any) => {
                        const isExpanded = expandedRequest === request.id;
                        const status = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.pending;
                        const StatusIcon = status.icon;
                        const changes = request.requested_changes as Record<string, any>;

                        return (
                            <Card key={request.id} className={`overflow-hidden transition-all duration-300 border-border/60 ${isExpanded ? 'ring-1 ring-secondary/20 shadow-lg' : 'hover:border-border'}`}>
                                <div
                                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none bg-card"
                                    onClick={() => setExpandedRequest(isExpanded ? null : request.id)}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${status.className}`}>
                                            <StatusIcon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-bold text-foreground">{request.bookings?.full_name || "Unknown Guest"}</h3>
                                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 uppercase font-bold tracking-wider">
                                                    {request.bookings?.reference || "NO-REF"}
                                                </Badge>
                                                <Badge className={`text-[10px] h-5 px-1.5 border-none font-bold ${status.className}`}>
                                                    {status.label}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                                                <User className="h-3 w-3" />
                                                Agent/User: {request.profiles?.full_name || "Unknown"} ({request.profiles?.email})
                                            </p>
                                            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5">
                                                <AlertCircle className="h-3 w-3" />
                                                Applied {format(new Date(request.created_at), "MMM d, yyyy 'at' h:mm a")}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Changes</p>
                                            <p className="text-sm font-semibold">{Object.keys(changes).length} Fields</p>
                                        </div>
                                        <div className="h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center transition-transform duration-300">
                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="border-t border-border/40 bg-muted/5 p-4 sm:p-6 space-y-6">
                                        <div>
                                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                                Requested Changes
                                            </h3>
                                            {renderRequestedChanges(changes)}
                                        </div>

                                        {/* Action section — only for pending */}
                                        {request.status === "pending" && (
                                            <div className="pt-4 border-t border-border/40 space-y-4">
                                                <div>
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                                                        Admin Notes (internal or for user)
                                                    </label>
                                                    <Textarea
                                                        placeholder="Add instructions or reason for rejection..."
                                                        className="min-h-[80px] bg-background text-sm resize-none"
                                                        value={reviewNotes[request.id] || ""}
                                                        onChange={(e) => setReviewNotes({ ...reviewNotes, [request.id]: e.target.value })}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-end gap-3">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        disabled={reviewMutation.isPending}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            reviewMutation.mutate({
                                                                requestId: request.id,
                                                                bookingId: request.booking_id,
                                                                decision: "rejected",
                                                                changes,
                                                                notes: reviewNotes[request.id] || ""
                                                            });
                                                        }}
                                                    >
                                                        <XCircle className="h-4 w-4 mr-1.5" />
                                                        Reject Request
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        disabled={reviewMutation.isPending}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            reviewMutation.mutate({
                                                                requestId: request.id,
                                                                bookingId: request.booking_id,
                                                                decision: "approved",
                                                                changes,
                                                                notes: reviewNotes[request.id] || ""
                                                            });
                                                        }}
                                                    >
                                                        {reviewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
                                                        Approve & Apply
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {request.reviewed_at && (
                                            <div className="pt-4 border-t border-border/40 text-[10px] text-muted-foreground italic flex flex-col gap-1">
                                                <p>Reviewed on {format(new Date(request.reviewed_at), "MMM d, yyyy 'at' h:mm a")}</p>
                                                {request.admin_notes && (
                                                    <p className="text-foreground not-italic mt-1">
                                                        <span className="font-bold">Admin Notes:</span> {request.admin_notes}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminAmendmentRequests;
