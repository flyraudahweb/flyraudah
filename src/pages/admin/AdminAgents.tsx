import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Users, Eye, Search, TrendingUp, Building2, MapPin, Mail, Phone, ExternalLink, Package, Wallet, FileText, Download, Loader2, Star, Award } from "lucide-react";
import { useState, useMemo } from "react";
import { formatPrice } from "@/data/packages";
import { WalletTopUpModal } from "@/components/admin/WalletTopUpModal";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { toast } from "sonner";
import { downloadMultipleDocuments } from "@/utils/documentExport";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

const AdminAgents = () => {
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [selectedAgent, setSelectedAgent] = useState<any>(null);
    const [clientPage, setClientPage] = useState(1);
    const [bookingPage, setBookingPage] = useState(1);
    const [topUpOpen, setTopUpOpen] = useState(false);
    const [isDownloadingDocs, setIsDownloadingDocs] = useState(false);
    const modalItemsPerPage = 5;

    const queryClient = useQueryClient();

    const { data: agents = [], isLoading } = useQuery({
        queryKey: ["admin-agents-list"],
        queryFn: async () => {
            // 1. Get all agents
            const { data: agentData, error: agentError } = await supabase
                .from("agents")
                .select("*")
                .order("created_at", { ascending: false });

            if (agentError) throw agentError;

            // 2. Get client counts for each agent
            const { data: clientCounts } = await supabase
                .from("agent_clients")
                .select("agent_id");

            const clientMap: Record<string, number> = {};
            (clientCounts || []).forEach((c) => {
                clientMap[c.agent_id] = (clientMap[c.agent_id] || 0) + 1;
            });

            // 3. Get bookings and revenue for each agent
            const { data: bookings } = await supabase
                .from("bookings")
                .select("id, agent_id, packages(price)");

            const { data: payments } = await supabase
                .from("payments")
                .select("amount, status, booking_id")
                .eq("status", "verified");

            const bookingMap: Record<string, number> = {};
            const revenueMap: Record<string, number> = {};

            const verifiedBookingIds = new Set((payments || []).map(p => p.booking_id));

            (bookings || []).forEach((b) => {
                if (b.agent_id) {
                    bookingMap[b.agent_id] = (bookingMap[b.agent_id] || 0) + 1;
                    if (verifiedBookingIds.has(b.id)) {
                        revenueMap[b.agent_id] = (revenueMap[b.agent_id] || 0) + Number((b as any).packages?.price || 0);
                    }
                }
            });

            return agentData.map((agent) => ({
                ...agent,
                clientCount: clientMap[agent.id] || 0,
                bookingCount: bookingMap[agent.id] || 0,
                totalRevenue: revenueMap[agent.id] || 0,
            }));
        },
    });

    const updateAgentMutation = useMutation({
        mutationFn: async ({ id, is_premium, rating }: { id: string; is_premium?: boolean; rating?: number }) => {
            const updates: any = {};
            if (is_premium !== undefined) updates.is_premium = is_premium;
            if (rating !== undefined) updates.rating = rating;

            const { error } = await supabase.from("agents").update(updates).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-agents-list"] });
            queryClient.invalidateQueries({ queryKey: ["admin-agent-details"] });
            toast.success("Agent settings updated");
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to update agent");
        }
    });

    const filtered = useMemo(() => {
        return agents.filter((a) =>
            (a.business_name || "").toLowerCase().includes(search.toLowerCase()) ||
            (a.contact_person || "").toLowerCase().includes(search.toLowerCase()) ||
            (a.agent_code || "").toLowerCase().includes(search.toLowerCase())
        );
    }, [agents, search]);

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const { data: agentDetails, isLoading: loadingDetails } = useQuery({
        queryKey: ["admin-agent-details", selectedAgent?.id],
        queryFn: async () => {
            if (!selectedAgent) return null;

            const [clientsRes, bookingsRes, walletRes] = await Promise.all([
                supabase.from("agent_clients").select("*").eq("agent_id", selectedAgent.id),
                supabase.from("bookings").select("*, packages(name, type, price)").eq("agent_id", selectedAgent.id).order("created_at", { ascending: false }),
                supabase.from("agent_wallets").select("balance").eq("agent_id", selectedAgent.id).single()
            ]);

            const bookingIds = (bookingsRes.data || []).map(b => b.id);
            let docsData: any[] = [];
            if (bookingIds.length > 0) {
                const { data } = await supabase.from("documents").select("*, bookings:booking_id(full_name)").in("booking_id", bookingIds);
                docsData = data || [];
            }

            return {
                clients: clientsRes.data || [],
                bookings: bookingsRes.data || [],
                walletBalance: Number(walletRes.data?.balance || 0),
                documents: docsData
            };
        },
        enabled: !!selectedAgent,
    });

    const handleBulkDownloadDocs = async () => {
        if (!agentDetails || agentDetails.documents.length === 0) {
            toast.error("No documents available to download.");
            return;
        }

        setIsDownloadingDocs(true);
        try {
            const downloadList = agentDetails.documents.map((d: any) => ({
                url: d.file_url,
                fileName: d.file_name,
                type: d.type,
                pilgrimName: d.bookings?.full_name || "Unknown",
            }));

            toast.info(`Preparing ${downloadList.length} documents for download...`);
            await downloadMultipleDocuments(downloadList, `${selectedAgent.business_name.replace(/\s+/g, '_')}_docs_${format(new Date(), "yyyyMMdd")}.zip`);
            toast.success(`Downloaded ${downloadList.length} documents successfully.`);
        } catch (err: any) {
            toast.error(err.message || "Failed to download documents.");
        } finally {
            setIsDownloadingDocs(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-foreground">Agent Management</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Monitor agent performance and manage client relationships
                    </p>
                </div>

                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search agents..."
                        className="pl-10 h-10 bg-background"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => <Card key={i} className="h-32 animate-pulse bg-muted/50" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="glass-panel border-white/20">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Total Agents</p>
                                <p className="text-xl font-bold font-heading">{agents.length}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-panel border-white/20">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Active Bookings</p>
                                <p className="text-xl font-bold font-heading">
                                    {agents.reduce((sum, a) => sum + a.bookingCount, 0)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-panel border-white/20">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Total Clients</p>
                                <p className="text-xl font-bold font-heading">
                                    {agents.reduce((sum, a) => sum + a.clientCount, 0)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-panel border-white/20">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-sky-500/10 text-sky-600">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Total Revenue</p>
                                <p className="text-xl font-bold font-heading">
                                    {formatPrice(agents.reduce((sum, a) => sum + a.totalRevenue, 0))}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card className="border-border/60 overflow-hidden bg-background/50 backdrop-blur-sm shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead>Agent</TableHead>
                                <TableHead>Phone / Email</TableHead>
                                <TableHead className="text-center">Clients</TableHead>
                                <TableHead className="text-center">Bookings</TableHead>
                                <TableHead className="text-right">Revenue</TableHead>
                                <TableHead className="text-center">Rating</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [1, 2, 3, 4, 5].map((i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={7} className="h-12 animate-pulse bg-muted/10" />
                                    </TableRow>
                                ))
                            ) : paginated.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        <Users className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                        No agents found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginated.map((agent) => (
                                    <TableRow key={agent.id} className="group hover:bg-muted/30 transition-colors">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-foreground leading-tight flex items-center gap-1.5">
                                                    {agent.is_premium && <Award className="h-4 w-4 text-amber-500 fill-amber-500" title="Premium Agent" />}
                                                    {agent.business_name}
                                                </span>
                                                <span className="text-xs text-muted-foreground">{agent.contact_person} • {agent.agent_code}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <Phone className="h-3 w-3" />
                                                    {agent.phone || "—"}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Mail className="h-3 w-3" />
                                                    {agent.email || "—"}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-medium">{agent.clientCount}</TableCell>
                                        <TableCell className="text-center font-medium">{agent.bookingCount}</TableCell>
                                        <TableCell className="text-right font-bold text-primary">{formatPrice(agent.totalRevenue)}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                                                <span className="font-medium text-sm">{agent.rating || '5.0'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={agent.status === "active" ? "default" : "secondary"} className="capitalize text-[10px] px-2 py-0">
                                                {agent.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => setSelectedAgent(agent)} className="h-8 px-2 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                                <Eye className="h-4 w-4 mr-1.5" />
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                            {[...Array(totalPages)].map((_, i) => (
                                <PaginationItem key={i + 1}>
                                    <PaginationLink
                                        onClick={() => setCurrentPage(i + 1)}
                                        isActive={currentPage === i + 1}
                                        className="cursor-pointer"
                                    >
                                        {i + 1}
                                    </PaginationLink>
                                </PaginationItem>
                            ))}
                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}

            {/* Detail Dialog */}
            <Dialog open={!!selectedAgent} onOpenChange={(open) => {
                if (!open) {
                    setSelectedAgent(null);
                    setClientPage(1);
                    setBookingPage(1);
                }
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-0 bg-background shadow-2xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>{selectedAgent?.business_name || "Agent Details"}</DialogTitle>
                        <DialogDescription>
                            Viewing details, clients, and bookings for {selectedAgent?.business_name}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedAgent && (
                        <>
                            {/* Custom Header with Gradient */}
                            <div className="emerald-gradient p-6 relative">
                                <div className="absolute inset-0 bg-black/10" />
                                <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md">
                                                Agent Profile
                                            </Badge>
                                            {selectedAgent.is_premium && (
                                                <Badge className="bg-amber-500 text-white border-0 flex items-center gap-1">
                                                    <Award className="h-3 w-3" />
                                                    Platinum Partner
                                                </Badge>
                                            )}
                                        </div>
                                        <h2 className="text-2xl md:text-3xl font-bold text-white font-heading leading-tight flex items-center gap-2">
                                            {selectedAgent.business_name}
                                        </h2>
                                        <p className="text-white/80 text-sm mt-1 flex items-center gap-2">
                                            <span className="font-semibold">{selectedAgent.contact_person}</span> • {selectedAgent.agent_code}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 min-w-[120px]">
                                            <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold">Revenue</p>
                                            <p className="text-lg font-bold text-white">{formatPrice(selectedAgent.totalRevenue)}</p>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 min-w-[120px]">
                                            <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold flex items-center gap-1"><Wallet className="h-3 w-3" /> Wallet</p>
                                            <p className="text-lg font-bold text-white">
                                                {loadingDetails ? "..." : formatPrice(agentDetails?.walletBalance || 0)}
                                            </p>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 min-w-[100px]">
                                            <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold">Clients</p>
                                            <p className="text-lg font-bold text-white">{selectedAgent.clientCount}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 p-6 gap-6 overflow-y-auto flex-1 bg-muted/10">
                                {/* Info Card */}
                                <div className="space-y-4">
                                    <Card className="border-border/60 bg-background shadow-sm">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-primary" />
                                                Company Details
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4 pt-0">
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
                                                    <Mail className="h-3 w-3" /> Email Address
                                                </label>
                                                <p className="text-sm font-medium">{selectedAgent.email}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
                                                    <Phone className="h-3 w-3" /> Phone Number
                                                </label>
                                                <p className="text-sm font-medium">{selectedAgent.phone}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
                                                    <MapPin className="h-3 w-3" /> Business Location
                                                </label>
                                                <p className="text-sm font-medium">{selectedAgent.location || "Not specified"}</p>
                                            </div>
                                            <div className="pt-2 border-t border-border/50">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-muted-foreground">Joined At:</span>
                                                    <span className="font-semibold">{new Date(selectedAgent.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-border/60 bg-background shadow-sm">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                <Award className="h-4 w-4 text-amber-500" />
                                                Gamification settings
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4 pt-0 text-sm">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="premium-toggle" className="flex flex-col gap-1 cursor-pointer">
                                                    <span className="font-semibold">Platinum Partner Status</span>
                                                    <span className="text-[10px] text-muted-foreground font-normal">Grants access to premium support</span>
                                                </Label>
                                                <Switch
                                                    id="premium-toggle"
                                                    checked={selectedAgent.is_premium}
                                                    onCheckedChange={(v) => {
                                                        setSelectedAgent({ ...selectedAgent, is_premium: v });
                                                        updateAgentMutation.mutate({ id: selectedAgent.id, is_premium: v });
                                                    }}
                                                    disabled={updateAgentMutation.isPending}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="agent-rating" className="font-semibold">Star Rating (1.0 to 5.0)</Label>
                                                <div className="flex items-center gap-3">
                                                    <Input
                                                        id="agent-rating"
                                                        type="number"
                                                        step="0.1"
                                                        min="1"
                                                        max="5"
                                                        className="w-24 h-8 text-sm"
                                                        defaultValue={selectedAgent.rating || 5}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            if (!isNaN(val) && val >= 1 && val <= 5) {
                                                                setSelectedAgent({ ...selectedAgent, rating: val });
                                                                updateAgentMutation.mutate({ id: selectedAgent.id, rating: val });
                                                            }
                                                        }}
                                                        disabled={updateAgentMutation.isPending}
                                                    />
                                                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <div className="flex flex-col gap-2">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest ml-1">Quick Actions</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="justify-start gap-2 h-10 border-border/60 hover:bg-emerald-500/5 hover:text-emerald-600 transition-all shadow-sm"
                                            onClick={() => {
                                                if (selectedAgent.phone) {
                                                    const cleanPhone = selectedAgent.phone.replace(/\D/g, '');
                                                    window.open(`https://wa.me/${cleanPhone}`, '_blank');
                                                }
                                            }}
                                        >
                                            <Phone className="h-4 w-4" /> WhatsApp Message
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="justify-start gap-2 h-10 border-border/60 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all shadow-sm"
                                            onClick={() => setTopUpOpen(true)}
                                        >
                                            <Wallet className="h-4 w-4 text-emerald-600" /> Top-Up Wallet
                                        </Button>
                                    </div>
                                </div>

                                {/* Clients & Bookings List */}
                                <div className="md:col-span-2 space-y-6">
                                    {/* Clients */}
                                    <Card className="border-border/60 bg-background shadow-sm overflow-hidden">
                                        <CardHeader className="pb-3 border-b bg-muted/20">
                                            <CardTitle className="text-sm font-bold flex items-center justify-between">
                                                <span className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-primary" />
                                                    Registered Clients
                                                </span>
                                                <Badge variant="secondary" className="px-2 py-0 text-[10px]">{agentDetails?.clients.length || 0}</Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="max-h-[220px] overflow-y-auto">
                                                {loadingDetails ? (
                                                    <div className="p-10 text-center"><div className="w-5 h-5 border-2 border-primary border-t-transparent animate-spin rounded-full mx-auto" /></div>
                                                ) : agentDetails?.clients.length === 0 ? (
                                                    <div className="p-10 text-center text-xs text-muted-foreground">No clients registered yet</div>
                                                ) : (
                                                    <div className="flex flex-col">
                                                        <Table>
                                                            <TableBody>
                                                                {agentDetails?.clients.slice((clientPage - 1) * modalItemsPerPage, clientPage * modalItemsPerPage).map((client) => (
                                                                    <TableRow key={client.id} className="hover:bg-muted/30">
                                                                        <TableCell className="py-2.5">
                                                                            <p className="text-sm font-semibold">{client.full_name}</p>
                                                                            <p className="text-[10px] text-muted-foreground">{client.email || client.phone}</p>
                                                                        </TableCell>
                                                                        <TableCell className="py-2.5 text-[10px] text-muted-foreground text-right">
                                                                            Added {new Date(client.created_at).toLocaleDateString()}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                        {agentDetails.clients.length > modalItemsPerPage && (
                                                            <div className="p-2 border-t flex items-center justify-between text-[10px] bg-muted/5">
                                                                <span className="text-muted-foreground">Page {clientPage} of {Math.ceil(agentDetails.clients.length / modalItemsPerPage)}</span>
                                                                <div className="flex gap-1">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-6 w-6"
                                                                        onClick={() => setClientPage(p => Math.max(1, p - 1))}
                                                                        disabled={clientPage === 1}
                                                                    >
                                                                        <Search className="h-3 w-3 rotate-180" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-6 w-6"
                                                                        onClick={() => setClientPage(p => Math.min(Math.ceil(agentDetails.clients.length / modalItemsPerPage), p + 1))}
                                                                        disabled={clientPage >= Math.ceil(agentDetails.clients.length / modalItemsPerPage)}
                                                                    >
                                                                        <Search className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Recent Bookings */}
                                    <Card className="border-border/60 bg-background shadow-sm overflow-hidden">
                                        <CardHeader className="pb-3 border-b bg-muted/20">
                                            <CardTitle className="text-sm font-bold flex items-center justify-between">
                                                <span className="flex items-center gap-2">
                                                    <Package className="h-4 w-4 text-primary" />
                                                    Recent Bookings
                                                </span>
                                                <Badge variant="secondary" className="px-2 py-0 text-[10px]">{agentDetails?.bookings.length || 0}</Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="max-h-[220px] overflow-y-auto">
                                                {loadingDetails ? (
                                                    <div className="p-10 text-center"><div className="w-5 h-5 border-2 border-primary border-t-transparent animate-spin rounded-full mx-auto" /></div>
                                                ) : agentDetails?.bookings.length === 0 ? (
                                                    <div className="p-10 text-center text-xs text-muted-foreground">No bookings made yet</div>
                                                ) : (
                                                    <div className="flex flex-col">
                                                        <Table>
                                                            <TableBody>
                                                                {agentDetails?.bookings.slice((bookingPage - 1) * modalItemsPerPage, bookingPage * modalItemsPerPage).map((booking) => (
                                                                    <TableRow key={booking.id} className="hover:bg-muted/30">
                                                                        <TableCell className="py-2.5">
                                                                            <p className="text-sm font-semibold">{booking.full_name}</p>
                                                                            <p className="text-[10px] text-muted-foreground">{booking.reference} • {booking.packages?.name}</p>
                                                                        </TableCell>
                                                                        <TableCell className="py-2.5 text-right">
                                                                            <Badge className={`text-[9px] px-1.5 py-0 capitalize ${booking.status === "confirmed" ? "bg-emerald-500" :
                                                                                booking.status === "pending" ? "bg-amber-500" : "bg-red-500"
                                                                                }`}>
                                                                                {booking.status}
                                                                            </Badge>
                                                                            <p className="text-[10px] font-bold mt-0.5">{formatPrice(booking.packages?.price || 0)}</p>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                        {agentDetails.bookings.length > modalItemsPerPage && (
                                                            <div className="p-2 border-t flex items-center justify-between text-[10px] bg-muted/5">
                                                                <span className="text-muted-foreground">Page {bookingPage} of {Math.ceil(agentDetails.bookings.length / modalItemsPerPage)}</span>
                                                                <div className="flex gap-1">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-6 w-6"
                                                                        onClick={() => setBookingPage(p => Math.max(1, p - 1))}
                                                                        disabled={bookingPage === 1}
                                                                    >
                                                                        <Search className="h-3 w-3 rotate-180" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-6 w-6"
                                                                        onClick={() => setBookingPage(p => Math.min(Math.ceil(agentDetails.bookings.length / modalItemsPerPage), p + 1))}
                                                                        disabled={bookingPage >= Math.ceil(agentDetails.bookings.length / modalItemsPerPage)}
                                                                    >
                                                                        <Search className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Documents */}
                                    <Card className="border-border/60 bg-background shadow-sm overflow-hidden">
                                        <CardHeader className="pb-3 border-b bg-muted/20">
                                            <CardTitle className="text-sm font-bold flex items-center justify-between">
                                                <span className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                    Uploaded Documents
                                                </span>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="secondary" className="px-2 py-0 text-[10px]">{agentDetails?.documents.length || 0}</Badge>
                                                    {(agentDetails?.documents.length || 0) > 0 && (
                                                        <Button size="sm" variant="default" onClick={handleBulkDownloadDocs} disabled={isDownloadingDocs} className="h-7 text-xs gap-1.5">
                                                            {isDownloadingDocs ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                                                            Bulk Download
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="max-h-[220px] overflow-y-auto p-4 flex flex-wrap gap-2 bg-background/50">
                                                {loadingDetails ? (
                                                    <div className="w-full p-4 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></div>
                                                ) : agentDetails?.documents.length === 0 ? (
                                                    <p className="w-full text-center text-xs text-muted-foreground p-4">No documents uploaded by this agent's clients yet.</p>
                                                ) : (
                                                    agentDetails?.documents.map((doc: any) => (
                                                        <div key={doc.id} className="border border-border/50 bg-background rounded-lg p-2.5 flex items-center gap-3 w-full sm:w-[calc(50%-0.25rem)]">
                                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                                <FileText className="h-4 w-4 text-primary" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-semibold truncate">{doc.bookings?.full_name}</p>
                                                                <p className="text-[10px] text-muted-foreground uppercase break-all">{doc.file_name || doc.type}</p>
                                                            </div>
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => window.open(doc.file_url, '_blank')}>
                                                                <ExternalLink className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
            {selectedAgent && (
                <WalletTopUpModal
                    open={topUpOpen}
                    onOpenChange={setTopUpOpen}
                    agentId={selectedAgent.id}
                    agentName={selectedAgent.business_name}
                />
            )}
        </div>
    );
};

export default AdminAgents;
