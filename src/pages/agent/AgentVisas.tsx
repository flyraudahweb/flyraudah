import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
    ShieldCheck, Download, FileText, Package, Calendar,
    Clock, XCircle, CheckCircle2, Plane, Search, LayoutGrid, List,
    Loader2, AlertCircle, User
} from "lucide-react";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Pagination, PaginationContent, PaginationItem,
    PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";

// ─── Status configs ───────────────────────────────────────────────────────────

const visaStatusCfg = {
    approved: { label: "Approved", pill: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    pending: { label: "Pending", pill: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
    rejected: { label: "Rejected", pill: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};


// ─── Main Component ───────────────────────────────────────────────────────────

const AgentVisas = () => {
    const { user } = useAuth();
    const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [visaFilter, setVisaFilter] = useState("all");
    const [viewMode, setViewMode] = useState<"cards" | "table">("table");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // 400ms debounce on search
    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setCurrentPage(1); }, 400);
        return () => clearTimeout(t);
    }, [search]);

    // ── Agent ID lookup (cached) ───────────────────────────────────────────────
    const { data: agentId } = useQuery({
        queryKey: ["agent-id", user?.id],
        enabled: !!user?.id,
        staleTime: 300_000,
        queryFn: async () => {
            const { data } = await supabase.from("agents").select("id").eq("user_id", user!.id).maybeSingle();
            return data?.id ?? null;
        },
    });

    // ── Lightweight stats count query ─────────────────────────────────────────
    const { data: stats = { total: 0, approved: 0, pending: 0, rejected: 0 } } = useQuery({
        queryKey: ["agent-visa-stats", agentId],
        enabled: !!agentId,
        staleTime: 60_000,
        queryFn: async () => {
            const [total, approved, rejected] = await Promise.all([
                supabase.from("bookings").select("id", { count: "exact", head: true }).eq("agent_id", agentId),
                supabase.from("bookings").select("id", { count: "exact", head: true }).eq("agent_id", agentId).eq("visa_status", "approved"),
                supabase.from("bookings").select("id", { count: "exact", head: true }).eq("agent_id", agentId).eq("visa_status", "rejected"),
            ]);
            const totalCount = total.count ?? 0;
            const approvedCount = approved.count ?? 0;
            const rejectedCount = rejected.count ?? 0;
            return {
                total: totalCount,
                approved: approvedCount,
                rejected: rejectedCount,
                pending: totalCount - approvedCount - rejectedCount,
            };
        },
    });

    // ── Server-side paginated bookings ────────────────────────────────────────
    const { data: queryResult, isLoading } = useQuery({
        queryKey: ["agent-client-visas-paged", agentId, debouncedSearch, visaFilter, currentPage],
        enabled: !!agentId,
        staleTime: 30_000,
        placeholderData: (prev: any) => prev,
        queryFn: async () => {
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            let q = supabase
                .from("bookings")
                .select(`
                    id, reference, full_name,
                    visa_status, visa_expiry_date,
                    visa_document_url, visa_delivery_message, visa_notes,
                    ticket_document_url, ticket_delivery_message,
                    created_at,
                    packages (name, type)
                `, { count: "exact" })
                .eq("agent_id", agentId)
                .order("created_at", { ascending: false })
                .range(from, to);

            if (debouncedSearch)
                q = q.or(`full_name.ilike.%${debouncedSearch}%,reference.ilike.%${debouncedSearch}%`);
            if (visaFilter !== "all")
                q = q.eq("visa_status", visaFilter);

            const { data, error, count } = await q;
            if (error) throw error;
            return { rows: data || [], total: count ?? 0 };
        },
    });

    const paginated = (queryResult?.rows || []) as any[];
    const totalPages = Math.ceil((queryResult?.total ?? 0) / itemsPerPage);


    // ── Download ──────────────────────────────────────────────────────────────
    const openFile = async (fileUrl: string, bucket: string = "visa-documents") => {
        setDownloadingUrl(fileUrl);
        try {
            const { data } = await supabase.storage.from(bucket).createSignedUrl(fileUrl, 3600);
            if (data?.signedUrl) window.open(data.signedUrl, "_blank");
        } finally {
            setDownloadingUrl(null);
        }
    };

    // ── Visa Status Badge ─────────────────────────────────────────────────────
    const VisaBadge = ({ status }: { status?: string }) => {
        const cfg = visaStatusCfg[(status as keyof typeof visaStatusCfg) || "pending"] || visaStatusCfg.pending;
        const Icon = cfg.icon;
        return (
            <Badge variant="outline" className={`text-[11px] px-2 py-0.5 flex items-center gap-1 w-fit ${cfg.pill}`}>
                <Icon className="w-3 h-3" /> {cfg.label}
            </Badge>
        );
    };

    return (
        <div className="space-y-5">
            {/* Page header */}
            <div>
                <h1 className="font-heading text-2xl font-bold text-foreground">Client Travel Documents</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Track visa approvals and flight tickets for all your registered clients.
                </p>
            </div>

            {/* Stats bar */}
            {!isLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Total Clients", value: stats.total, color: "text-foreground", bg: "bg-muted/50" },
                        { label: "Visa Approved", value: stats.approved, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
                        { label: "Visa Pending", value: stats.pending, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
                        { label: "Visa Rejected", value: stats.rejected, color: "text-red-700", bg: "bg-red-50 border-red-200" },
                    ].map(s => (
                        <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.bg}`}>
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex gap-3 flex-1 max-w-lg">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, reference, or package..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                            className="pl-9 h-9 text-sm"
                        />
                    </div>
                    <Select value={visaFilter} onValueChange={v => { setVisaFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="w-36 h-9 text-sm">
                            <SelectValue placeholder="Visa Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {/* View toggle */}
                <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/60">
                    <button
                        onClick={() => setViewMode("table")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${viewMode === "table" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        <List className="w-3.5 h-3.5" /> Table
                    </button>
                    <button
                        onClick={() => setViewMode("cards")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${viewMode === "cards" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        <LayoutGrid className="w-3.5 h-3.5" /> Cards
                    </button>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl w-full" />)}
                </div>
            ) : filtered.length === 0 ? (
                <Card className="border-border/60 bg-background/50">
                    <CardContent className="py-14 flex flex-col items-center text-center">
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                            <ShieldCheck className="h-7 w-7 text-primary/60" />
                        </div>
                        <h3 className="font-heading text-base font-semibold text-foreground mb-1">No Results</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            {allBookings.length === 0
                                ? "You have no registered clients yet. Bookings made under your agent account will appear here."
                                : "No clients match your current search or filter."}
                        </p>
                    </CardContent>
                </Card>
            ) : viewMode === "table" ? (
                // ─── Compact Table View ───────────────────────────────────────
                <Card className="border-border/60 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 text-left min-w-[180px]">Client</th>
                                    <th className="px-4 py-3 text-left min-w-[160px]">Package</th>
                                    <th className="px-4 py-3 text-left">Ref</th>
                                    <th className="px-4 py-3 text-left">Visa</th>
                                    <th className="px-4 py-3 text-left">Ticket</th>
                                    <th className="px-4 py-3 text-left">Visa Expiry</th>
                                    <th className="px-4 py-3 text-right">Docs</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {paginated.map((b: any) => {
                                    const hasTicket = !!(b.ticket_document_url || b.ticket_extra_docs?.length);
                                    return (
                                        <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                        <User className="w-3.5 h-3.5 text-primary" />
                                                    </div>
                                                    <span className="font-medium text-foreground truncate max-w-[130px]" title={b.full_name}>{b.full_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-foreground font-medium truncate max-w-[150px]" title={b.packages?.name}>{b.packages?.name || "—"}</span>
                                                    {b.packages?.type && <span className="text-[10px] text-muted-foreground capitalize">{b.packages.type}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-xs text-muted-foreground">{b.reference || b.id.slice(0, 8).toUpperCase()}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <VisaBadge status={b.visa_status} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className={`text-[11px] px-2 py-0.5 flex items-center gap-1 w-fit ${hasTicket ? "bg-sky-100 text-sky-700 border-sky-200" : "bg-muted text-muted-foreground"}`}>
                                                    <Plane className="w-3 h-3" />
                                                    {hasTicket ? "Issued" : "Pending"}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                                                {b.visa_expiry_date ? new Date(b.visa_expiry_date).toLocaleDateString("en-GB") : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {b.visa_document_url && b.visa_status === "approved" && (
                                                        <Button
                                                            variant="ghost" size="icon"
                                                            className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                                                            title="Download Visa"
                                                            onClick={() => openFile(b.visa_document_url, "visa-documents")}
                                                            disabled={downloadingUrl === b.visa_document_url}
                                                        >
                                                            {downloadingUrl === b.visa_document_url ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                                                        </Button>
                                                    )}
                                                    {b.ticket_document_url && (
                                                        <Button
                                                            variant="ghost" size="icon"
                                                            className="h-7 w-7 text-sky-600 hover:bg-sky-50"
                                                            title="Download Ticket"
                                                            onClick={() => openFile(b.ticket_document_url, "visa-documents")}
                                                            disabled={downloadingUrl === b.ticket_document_url}
                                                        >
                                                            {downloadingUrl === b.ticket_document_url ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plane className="w-3.5 h-3.5" />}
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                // ─── Card Grid View ───────────────────────────────────────────
                <div className="grid gap-4 sm:grid-cols-2">
                    {paginated.map((b: any) => {
                        const vcfg = visaStatusCfg[(b.visa_status as keyof typeof visaStatusCfg) || "pending"] || visaStatusCfg.pending;
                        const hasTicket = !!(b.ticket_document_url || b.ticket_extra_docs?.length);
                        const VIcon = vcfg.icon;
                        return (
                            <Card key={b.id} className="border-border/60 overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-4">
                                    {/* Package */}
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="flex items-start gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                                <Package className="w-4 h-4 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-foreground leading-tight">{b.packages?.name || "Package"}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                                    <User className="w-3 h-3" /> {b.full_name}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                                            {b.reference || b.id.slice(0, 8).toUpperCase()}
                                        </span>
                                    </div>
                                    {/* Status row */}
                                    <div className="flex items-center gap-2 flex-wrap mb-3">
                                        <Badge variant="outline" className={`text-[11px] px-2 py-0.5 flex items-center gap-1 ${vcfg.pill}`}>
                                            <VIcon className="w-3 h-3" /> Visa {vcfg.label}
                                        </Badge>
                                        <Badge variant="outline" className={`text-[11px] px-2 py-0.5 flex items-center gap-1 ${hasTicket ? "bg-sky-100 text-sky-700 border-sky-200" : "bg-muted text-muted-foreground"}`}>
                                            <Plane className="w-3 h-3" /> {hasTicket ? "Ticket Issued" : "Ticket Pending"}
                                        </Badge>
                                    </div>
                                    {/* Expiry + docs */}
                                    {b.visa_expiry_date && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                                            <Calendar className="w-3 h-3 text-primary" />
                                            Expires {new Date(b.visa_expiry_date).toLocaleDateString("en-GB")}
                                        </p>
                                    )}
                                    {(b.visa_document_url || b.ticket_document_url) && (
                                        <div className="flex gap-2 pt-2 border-t border-border/40 mt-2">
                                            {b.visa_document_url && b.visa_status === "approved" && (
                                                <Button
                                                    size="sm" variant="outline"
                                                    className="text-xs h-7 gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                                    onClick={() => openFile(b.visa_document_url, "visa-documents")}
                                                    disabled={downloadingUrl === b.visa_document_url}
                                                >
                                                    <Download className="w-3 h-3" /> Visa
                                                </Button>
                                            )}
                                            {b.ticket_document_url && (
                                                <Button
                                                    size="sm" variant="outline"
                                                    className="text-xs h-7 gap-1.5 text-sky-700 border-sky-200 hover:bg-sky-50"
                                                    onClick={() => openFile(b.ticket_document_url, "visa-documents")}
                                                    disabled={downloadingUrl === b.ticket_document_url}
                                                >
                                                    <Download className="w-3 h-3" /> Ticket
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                        Showing <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="font-medium text-foreground">{filtered.length}</span>
                    </p>
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                            </PaginationItem>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(pg => pg === 1 || pg === totalPages || (pg >= currentPage - 1 && pg <= currentPage + 1))
                                .map((pg, i, arr) => {
                                    const prev = arr[i - 1];
                                    return (
                                        <div key={pg} className="flex items-center">
                                            {prev && pg - prev > 1 && <span className="px-2 text-muted-foreground text-xs">...</span>}
                                            <PaginationItem>
                                                <PaginationLink onClick={() => setCurrentPage(pg)} isActive={currentPage === pg} className="cursor-pointer">{pg}</PaginationLink>
                                            </PaginationItem>
                                        </div>
                                    );
                                })}
                            <PaginationItem>
                                <PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    );
};

export default AgentVisas;
