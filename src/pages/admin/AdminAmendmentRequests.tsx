import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    CheckCircle2, XCircle, Clock, Pencil, ChevronDown, ChevronUp, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const FIELD_LABELS: Record<string, string> = {
    phone: "Phone",
    address: "Address",
    emergency_contact_name: "Emergency Contact Name",
    emergency_contact_phone: "Emergency Contact Phone",
    emergency_contact_relationship: "Emergency Contact Relationship",
    special_requests: "Special Requests",
};

const statusConfig: Record<string, { label: string; className: string; icon: typeof Clock }> = {
    pending: { label: "Pending Review", className: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock },
    approved: { label: "Approved", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
    rejected: { label: "Rejected", className: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
};

const AdminAmendmentRequests = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

    const { data: requests = [], isLoading } = useQuery({
        queryKey: ["admin-amendment-requests"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("booking_amendment_requests")
                .select(`
          *,
          bookings (
            reference,
            full_name,
            status
          )
        `)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    const { mutate: reviewRequest, isPending: isReviewing } = useMutation({
        mutationFn: async ({
            requestId,
            bookingId,
            changes,
            decision,
            notes,
        }: {
            requestId: string;
            bookingId: string;
            changes: Record<string, any>;
            decision: "approved" | "rejected";
            notes: string;
        }) => {
            // Update the request status
            const { error: updateError } = await supabase
                .from("booking_amendment_requests")
                .update({
                    status: decision,
                    admin_notes: notes || null,
                    reviewed_by: user!.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq("id", requestId);
            if (updateError) throw updateError;

            // If approved, apply the changes to the booking
            if (decision === "approved") {
                const { error: bookingError } = await supabase
                    .from("bookings")
                    .update({ ...changes, updated_at: new Date().toISOString() })
                    .eq("id", bookingId);
                if (bookingError) throw bookingError;
            }
        },
        onSuccess: (_, { decision }) => {
            queryClient.invalidateQueries({ queryKey: ["admin-amendment-requests"] });
            toast.success(decision === "approved" ? "Amendment approved and applied!" : "Amendment rejected.");
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to process amendment.");
        },
    });

    const pendingCount = requests.filter((r: any) => r.status === "pending").length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-foreground">Amendment Requests</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Review booking edit requests from confirmed pilgrim bookings
                    </p>
                </div>
                {pendingCount > 0 && (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-sm font-semibold">
                        {pendingCount} pending
                    </Badge>
                )}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : requests.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
                        <Pencil className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-muted-foreground">No amendment requests yet</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {requests.map((req: any) => {
                        const isExpanded = expandedId === req.id;
                        const config = statusConfig[req.status] || statusConfig.pending;
                        const StatusIcon = config.icon;
                        const changes = req.requested_changes as Record<string, any>;

                        return (
                            <Card key={req.id} className="border border-border/60 overflow-hidden">
                                <CardContent className="p-0">
                                    {/* Header row */}
                                    <button
                                        className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
                                        onClick={() => setExpandedId(isExpanded ? null : req.id)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-sm text-foreground">
                                                    {req.bookings?.full_name || "Unknown Pilgrim"}
                                                </span>
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    {req.bookings?.reference || req.booking_id.slice(0, 8).toUpperCase()}
                                                </span>
                                                <Badge variant="outline" className={`text-xs ${config.className}`}>
                                                    <StatusIcon className="h-2.5 w-2.5 mr-1" />
                                                    {config.label}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs text-muted-foreground">
                                                    {req.created_at ? format(new Date(req.created_at), "dd MMM yyyy, HH:mm") : "—"}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {Object.keys(changes).length} field{Object.keys(changes).length !== 1 ? "s" : ""} changed
                                                </span>
                                            </div>
                                        </div>
                                        {isExpanded ? (
                                            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                        )}
                                    </button>

                                    {/* Expanded view */}
                                    {isExpanded && (
                                        <div className="border-t border-border/60 p-4 space-y-4">
                                            {/* Changed fields */}
                                            <div>
                                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                                    Requested Changes
                                                </h3>
                                                <div className="rounded-lg border border-border/60 overflow-hidden divide-y divide-border/40">
                                                    {Object.entries(changes).map(([field, value]) => (
                                                        <div key={field} className="flex items-start gap-3 px-3 py-2.5">
                                                            <span className="text-xs font-medium text-muted-foreground w-40 shrink-0 pt-0.5">
                                                                {FIELD_LABELS[field] || field}
                                                            </span>
                                                            <span className="text-sm text-foreground break-words">
                                                                {String(value) || "—"}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Action section — only for pending */}
                                            {req.status === "pending" && (
                                                <div className="space-y-3">
                                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                        Admin Notes (optional)
                                                    </h3>
                                                    <Textarea
                                                        value={adminNotes[req.id] || ""}
                                                        onChange={(e) =>
                                                            setAdminNotes((prev) => ({ ...prev, [req.id]: e.target.value }))
                                                        }
                                                        placeholder="Add a note to the pilgrim..."
                                                        className="text-sm resize-none min-h-[72px]"
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                                                            disabled={isReviewing}
                                                            onClick={() =>
                                                                reviewRequest({
                                                                    requestId: req.id,
                                                                    bookingId: req.booking_id,
                                                                    changes,
                                                                    decision: "approved",
                                                                    notes: adminNotes[req.id] || "",
                                                                })
                                                            }
                                                        >
                                                            {isReviewing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                                            Approve & Apply
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 text-xs font-semibold border-red-500/30 text-red-600 hover:bg-red-500/10 gap-1.5"
                                                            disabled={isReviewing}
                                                            onClick={() =>
                                                                reviewRequest({
                                                                    requestId: req.id,
                                                                    bookingId: req.booking_id,
                                                                    changes,
                                                                    decision: "rejected",
                                                                    notes: adminNotes[req.id] || "",
                                                                })
                                                            }
                                                        >
                                                            <XCircle className="h-3 w-3" />
                                                            Reject
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Reviewed info */}
                                            {req.status !== "pending" && (
                                                <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
                                                    {req.status === "approved"
                                                        ? "✓ Approved and applied to booking"
                                                        : "✗ Rejected"}{" "}
                                                    {req.reviewed_at && `on ${format(new Date(req.reviewed_at), "dd MMM yyyy")}`}
                                                    {req.admin_notes && (
                                                        <p className="mt-1 text-foreground italic">Note: {req.admin_notes}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminAmendmentRequests;
