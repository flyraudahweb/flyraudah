import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Search, Filter, CheckCircle2, Clock, XCircle, Plus, Pencil, Trash2, Power, PowerOff,
    ExternalLink, CalendarDays, FileText, User, AlertTriangle, ShieldCheck,
    ArrowUpRight, Loader2, Save, Send, Plane, ChevronLeft, ChevronRight
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const visaStatusConfig: Record<string, { label: string; className: string; icon: any }> = {
    pending: { label: "Pending", className: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock },
    approved: { label: "Approved", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
    rejected: { label: "Rejected", className: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
};

const AdminVisaManagement = () => {
    const [search, setSearch] = useState("");
    const [activeStatusTab, setActiveStatusTab] = useState("all");
    const [mainTab, setMainTab] = useState("tracking");
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Provider state
    const [isAddProviderOpen, setIsAddProviderOpen] = useState(false);
    const [editingProvider, setEditingProvider] = useState<any>(null);

    const queryClient = useQueryClient();

    // Data Fetching: Tracking
    const { data: bookings = [], isLoading: loadingBookings } = useQuery({
        queryKey: ["admin-visa-bookings"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bookings")
                .select(`
          id, 
          full_name, 
          reference, 
          visa_status, 
          visa_expiry_date, 
          visa_notes, 
          passport_number, 
          passport_expiry,
          visa_document_url,
          user_id,
          agent_id,
          agents (business_name, contact_person),
          packages (name)
        `)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data || [];
        },
    });

    // Data Fetching: Providers
    const { data: providers = [], isLoading: loadingProviders } = useQuery({
        queryKey: ["admin-visa-providers"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("visa_providers")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    // Mutations: Tracking
    const updateVisaMutation = useMutation({
        mutationFn: async ({ id, visa_status, visa_expiry_date, visa_notes }: any) => {
            const { error } = await supabase
                .from("bookings")
                .update({ visa_status, visa_expiry_date, visa_notes })
                .eq("id", id);
            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-visa-bookings"] });
            toast.success("Visa status updated");
            setIsUpdateModalOpen(false);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to update visa status");
        }
    });

    const notifyVisaApprovedMutation = useMutation({
        mutationFn: async ({ userId, agentId, fullName, reference, id }: any) => {
            const notifications = [];
            if (userId) {
                notifications.push({
                    user_id: userId,
                    title: "Visa Approved!",
                    message: `Your visa for booking ${reference || id.slice(0, 8)} (${fullName}) has been approved.`,
                    type: "success"
                });
            }
            if (agentId) {
                const { data: agentData } = await supabase.from("agents").select("user_id").eq("id", agentId).single();
                if (agentData?.user_id) {
                    notifications.push({
                        user_id: agentData.user_id,
                        title: "Client Visa Approved",
                        message: `Visa for ${fullName} (${reference || id.slice(0, 8)}) has been approved.`,
                        type: "success"
                    });
                }
            }

            if (notifications.length > 0) {
                const { error } = await supabase.from("notifications").insert(notifications);
                if (error) throw error;
            }
            return id;
        },
        onSuccess: () => {
            toast.success("Approval notification sent to agent and user");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to send notification");
        }
    });


    const sendAlertMutation = useMutation({
        mutationFn: async ({ userId, agentId, fullName, reference, id }: any) => {
            const notifications = [];
            if (userId) {
                notifications.push({
                    user_id: userId,
                    title: "Action Required: Visa Status",
                    message: `Your visa for booking ${reference || id.slice(0, 8)} (${fullName}) is still processing and your passport is nearing expiry. Please check your details.`,
                    type: "warning"
                });
            }
            if (agentId) {
                const { data: agentData } = await supabase.from("agents").select("user_id").eq("id", agentId).single();
                if (agentData?.user_id) {
                    notifications.push({
                        user_id: agentData.user_id,
                        title: "Urgent: Client Passport/Visa Warning",
                        message: `Client ${fullName} (${reference || id.slice(0, 8)}) has a pending visa and passport nearing expiry. Action may be required.`,
                        type: "error"
                    });
                }
            }

            if (notifications.length > 0) {
                const { error } = await supabase.from("notifications").insert(notifications);
                if (error) throw error;
            }
            return id;
        },
        onSuccess: () => {
            toast.success("Urgent alerts sent to agent and user");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to send alerts");
        }
    });

    // Mutations: Providers
    const upsertProviderMutation = useMutation({
        mutationFn: async (values: any) => {
            const { data, error } = await supabase
                .from("visa_providers")
                .upsert({
                    id: values.id || undefined,
                    name: values.name,
                    description: values.description || null,
                });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-visa-providers"] });
            toast.success(editingProvider ? "Provider updated" : "Provider added");
            setIsAddProviderOpen(false);
            setEditingProvider(null);
        },
        onError: (err: any) => toast.error(err.message),
    });

    const toggleProviderMutation = useMutation({
        mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
            const { error } = await supabase
                .from("visa_providers")
                .update({ is_active: !is_active })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-visa-providers"] });
            toast.success("Status updated");
        },
    });

    const deleteProviderMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("visa_providers")
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-visa-providers"] });
            toast.success("Provider deleted");
        },
    });

    // Helpers
    const filteredTrackings = bookings.filter((b) => {
        const matchSearch =
            !search ||
            b.full_name.toLowerCase().includes(search.toLowerCase()) ||
            (b.reference || "").toLowerCase().includes(search.toLowerCase()) ||
            (b.passport_number || "").toLowerCase().includes(search.toLowerCase());

        const matchTab = activeStatusTab === "all" || b.visa_status === activeStatusTab;

        return matchSearch && matchTab;
    });

    const totalPages = Math.ceil(filteredTrackings.length / itemsPerPage);
    const paginatedTrackings = filteredTrackings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleUpdateClick = (booking: any) => {
        setSelectedBooking({
            ...booking,
            new_status: booking.visa_status || "pending",
            new_expiry: booking.visa_expiry_date || "",
            new_notes: booking.visa_notes || ""
        });
        setIsUpdateModalOpen(true);
    };

    const handleSaveUpdate = () => {
        if (!selectedBooking) return;
        updateVisaMutation.mutate({
            id: selectedBooking.id,
            visa_status: selectedBooking.new_status,
            visa_expiry_date: selectedBooking.new_expiry || null,
            visa_notes: selectedBooking.new_notes,
            userId: selectedBooking.user_id,
            agentId: selectedBooking.agent_id,
            fullName: selectedBooking.full_name,
            reference: selectedBooking.reference
        });
    };

    const handleProviderSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const values = {
            id: editingProvider?.id,
            name: formData.get("name"),
            description: formData.get("description"),
        };
        upsertProviderMutation.mutate(values);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-foreground">Visa Management</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Consolidated control for visa tracking and providers
                    </p>
                </div>
            </div>

            <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
                <TabsList className="bg-muted/50 border border-border/60 p-1 mb-6">
                    <TabsTrigger value="tracking" className="gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        Visa Tracking
                    </TabsTrigger>
                    <TabsTrigger value="providers" className="gap-2">
                        <Plane className="h-4 w-4" />
                        Visa Providers
                    </TabsTrigger>
                </TabsList>

                {/* TRACKING TAB */}
                <TabsContent value="tracking" className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end sm:items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, reference, or passport..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-9 bg-background/50 border-border/60"
                            />
                        </div>

                        <Tabs value={activeStatusTab} onValueChange={(v) => {
                            setActiveStatusTab(v);
                            setCurrentPage(1);
                        }} className="w-full md:w-auto">
                            <TabsList className="bg-muted/50 border border-border/60 p-1">
                                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                                <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
                                <TabsTrigger value="approved" className="text-xs">Approved</TabsTrigger>
                                <TabsTrigger value="rejected" className="text-xs">Rejected</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <Card className="border-border/60 bg-background/50 backdrop-blur-sm shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-medium">
                                        <tr>
                                            <th className="px-4 py-3 min-w-[200px]">Pilgrim</th>
                                            <th className="px-4 py-3">Passport</th>
                                            <th className="px-4 py-3">Agent</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Expiry</th>
                                            <th className="px-4 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {loadingBookings ? (
                                            Array.from({ length: 5 }).map((_, i) => (
                                                <tr key={i}>
                                                    <td colSpan={6} className="px-4 py-4"><Skeleton className="h-10 w-full" /></td>
                                                </tr>
                                            ))
                                        ) : paginatedTrackings.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground italic">
                                                    No matching records found.
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedTrackings.map((b) => {
                                                const sc = visaStatusConfig[b.visa_status] || visaStatusConfig.pending;
                                                const Icon = sc.icon;
                                                const daysToPassExpiry = b.passport_expiry ? differenceInDays(parseISO(b.passport_expiry), new Date()) : 1000;
                                                const isUrgent = b.visa_status === 'pending' && daysToPassExpiry < 240;

                                                let rowBgClass = "hover:bg-muted/30 transition-colors";
                                                if (b.passport_expiry) {
                                                    if (daysToPassExpiry <= 0) {
                                                        rowBgClass = "bg-[#DB4437]/10 hover:bg-[#DB4437]/20 transition-colors";
                                                    } else if (daysToPassExpiry <= 60) {
                                                        rowBgClass = "bg-[#F4B400]/10 hover:bg-[#F4B400]/20 transition-colors";
                                                    } else {
                                                        rowBgClass = "bg-[#0F9D58]/10 hover:bg-[#0F9D58]/20 transition-colors";
                                                    }
                                                }

                                                return (
                                                    <tr key={b.id} className={rowBgClass}>
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-foreground">{b.full_name}</span>
                                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                    <ArrowUpRight className="h-3 w-3" />
                                                                    {b.reference || b.id.slice(0, 8).toUpperCase()}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-col">
                                                                <span className="font-mono text-xs">{b.passport_number || "—"}</span>
                                                                <span className={`text-[10px] ${daysToPassExpiry < 210 ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                                                                    Expires: {b.passport_expiry || "—"}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs">
                                                            {b.agents?.business_name || "Direct / User"}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Badge variant="outline" className={`text-[10px] px-2 py-0 border flex items-center gap-1 w-fit ${sc.className}`}>
                                                                <Icon className="h-3 w-3" />
                                                                {sc.label}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                                                            {b.visa_expiry_date || "—"}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
                                                                    onClick={() => handleUpdateClick(b)}
                                                                >
                                                                    <FileText className="h-4 w-4" />
                                                                </Button>
                                                                {b.visa_status === 'approved' && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                                                                        onClick={() => notifyVisaApprovedMutation.mutate({
                                                                            userId: b.user_id,
                                                                            agentId: b.agent_id,
                                                                            fullName: b.full_name,
                                                                            reference: b.reference,
                                                                            id: b.id
                                                                        })}
                                                                        disabled={notifyVisaApprovedMutation.isPending}
                                                                        title="Notify Agent/User of Approval"
                                                                    >
                                                                        {notifyVisaApprovedMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-4 w-4" />}
                                                                    </Button>
                                                                )}
                                                                {isUrgent && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0 text-amber-500 hover:bg-amber-500/10 transition-colors"
                                                                        onClick={() => sendAlertMutation.mutate({
                                                                            userId: b.user_id,
                                                                            agentId: b.agent_id,
                                                                            fullName: b.full_name,
                                                                            reference: b.reference,
                                                                            id: b.id
                                                                        })}
                                                                        disabled={sendAlertMutation.isPending}
                                                                        title="Send Urgent Expiry/Delay Alert"
                                                                    >
                                                                        {sendAlertMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/20">
                                    <div className="text-xs text-muted-foreground">
                                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTrackings.length)} of {filteredTrackings.length} entries
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* PROVIDERS TAB */}
                <TabsContent value="providers" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-heading text-xl font-bold text-foreground">Visa Providers</h2>
                            <p className="text-sm text-muted-foreground">Manage authorized visa processing partners</p>
                        </div>
                        <Dialog open={isAddProviderOpen} onOpenChange={(open) => { setIsAddProviderOpen(open); if (!open) setEditingProvider(null); }}>
                            <DialogTrigger asChild>
                                <Button className="gold-gradient text-secondary-foreground shadow-gold">
                                    <Plus className="h-4 w-4 mr-2" /> Add Provider
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{editingProvider ? "Edit Provider" : "Add Visa Provider"}</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleProviderSubmit} className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="provider_name">Provider Name</Label>
                                        <Input id="provider_name" name="name" defaultValue={editingProvider?.name} placeholder="e.g. VFS Global" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="provider_description">Description (Optional)</Label>
                                        <Input id="provider_description" name="description" defaultValue={editingProvider?.description} placeholder="e.g. Official partner for Umrah visas" />
                                    </div>
                                    <DialogFooter className="pt-4">
                                        <Button type="button" variant="outline" onClick={() => setIsAddProviderOpen(false)}>Cancel</Button>
                                        <Button type="submit" disabled={upsertProviderMutation.isPending} className="gold-gradient text-secondary-foreground">
                                            {upsertProviderMutation.isPending ? "Saving..." : editingProvider ? "Update" : "Add Provider"}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <Card className="border-border/60 bg-background/50 backdrop-blur-sm shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Provider Name</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingProviders ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
                                    ) : providers.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No visa providers found</TableCell></TableRow>
                                    ) : (
                                        providers.map((provider: any) => (
                                            <TableRow key={provider.id} className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <ShieldCheck className="h-4 w-4 text-primary" />
                                                        {provider.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{provider.description || "—"}</TableCell>
                                                <TableCell>
                                                    <Badge variant={provider.is_active ? "default" : "secondary"} className={provider.is_active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : ""}>
                                                        {provider.is_active ? "Active" : "Inactive"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => { setEditingProvider(provider); setIsAddProviderOpen(true); }} title="Edit">
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => toggleProviderMutation.mutate({ id: provider.id, is_active: provider.is_active })} title={provider.is_active ? "Deactivate" : "Activate"}>
                                                            {provider.is_active ? <PowerOff className="h-4 w-4 text-amber-600" /> : <Power className="h-4 w-4 text-emerald-600" />}
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Are you sure?")) deleteProviderMutation.mutate(provider.id); }} title="Delete" className="text-destructive hover:text-destructive">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Tracking Update Modal */}
            <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
                <DialogContent className="max-w-md border-border/60 shadow-2xl overflow-hidden p-0 bg-background">
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle className="flex items-center gap-2 text-xl font-heading font-bold text-foreground">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <ShieldCheck className="w-5 h-5 text-primary" />
                            </div>
                            Update Visa Status
                        </DialogTitle>
                        <DialogDescription className="mt-2">
                            Update status for {selectedBooking?.full_name} ({selectedBooking?.reference || selectedBooking?.id?.slice(0, 8).toUpperCase()})
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-6 space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="status">Visa Status</Label>
                            <Select
                                value={selectedBooking?.new_status}
                                onValueChange={(v) => setSelectedBooking({ ...selectedBooking, new_status: v })}
                            >
                                <SelectTrigger id="status" className="bg-background border-border/60">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent className="border-border/60">
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="expiry">Visa Expiry Date</Label>
                            <div className="relative">
                                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="expiry"
                                    type="date"
                                    className="pl-9 bg-background border-border/60"
                                    value={selectedBooking?.new_expiry}
                                    onChange={(e) => setSelectedBooking({ ...selectedBooking, new_expiry: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="notes">Internal Notes</Label>
                            <Textarea
                                id="notes"
                                placeholder="Details about the visa application, reasons for delay or rejection..."
                                className="bg-background border-border/60 min-h-[100px] resize-none"
                                value={selectedBooking?.new_notes}
                                onChange={(e) => setSelectedBooking({ ...selectedBooking, new_notes: e.target.value })}
                            />
                        </div>

                        {selectedBooking?.visa_document_url && (
                            <div className="bg-muted/30 p-3 rounded-lg border border-border/40 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <FileText className="h-4 w-4" />
                                    Visa Document Uploaded
                                </div>
                                <a
                                    href={supabase.storage.from("visa-documents").getPublicUrl(selectedBooking.visa_document_url).data.publicUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                                >
                                    View <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-6 pt-0 gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setIsUpdateModalOpen(false)} className="px-6">Cancel</Button>
                        <Button
                            onClick={handleSaveUpdate}
                            disabled={updateVisaMutation.isPending}
                            className="px-6 gap-2"
                        >
                            {updateVisaMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            Update Tracking
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminVisaManagement;
