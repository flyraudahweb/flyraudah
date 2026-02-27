import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useEffect, useRef } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, ChevronRight, Clock, ShieldCheck, User, Filter, Search, UserCheck, X } from "lucide-react";
import { format } from "date-fns";

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

interface Ticket {
    id: string;
    user_id: string;
    subject: string;
    description: string;
    category: string;
    status: TicketStatus;
    priority: TicketPriority;
    assigned_to: string | null;
    created_at: string;
    updated_at: string;
    last_message_at?: string;
    unread_count_admin?: number;
    profiles?: {
        full_name: string;
        phone: string;
    };
}

interface Message {
    id: string;
    ticket_id: string;
    sender_id: string;
    message: string;
    created_at: string;
}

interface StaffSpec {
    user_id: string;
    category: string;
    full_name: string | null;
    email: string | null;
}

const statusColors: Record<TicketStatus, string> = {
    open: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    in_progress: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    resolved: "bg-green-500/10 text-green-500 border-green-500/20",
    closed: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

const priorityColors: Record<TicketPriority, string> = {
    low: "bg-slate-100 text-slate-600",
    medium: "bg-blue-100 text-blue-600",
    high: "bg-amber-100 text-amber-600",
    urgent: "bg-red-100 text-red-600",
};

const AdminSupport = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);
    const [mySpecialtyOnly, setMySpecialtyOnly] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // ── Fetch staff with specialties
    const { data: staffSpecs = [] } = useQuery<StaffSpec[]>({
        queryKey: ["staff-support-specs"],
        queryFn: async () => {
            const { data: specs, error } = await supabase
                .from("staff_support_specialties" as any)
                .select("user_id, category");
            if (error) throw error;

            const userIds = [...new Set((specs as any[]).map((s) => s.user_id))];
            if (userIds.length === 0) return [];

            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, full_name, email")
                .in("id", userIds);

            return (specs as any[]).map((s) => {
                const profile = profiles?.find((p) => p.id === s.user_id);
                return {
                    user_id: s.user_id,
                    category: s.category,
                    full_name: profile?.full_name ?? null,
                    email: profile?.email ?? null,
                };
            });
        },
    });

    // Helper: get display name of assigned staff
    const getAssigneeName = useCallback((assignedTo: string | null) => {
        if (!assignedTo) return null;
        const match = staffSpecs.find((s) => s.user_id === assignedTo);
        return match?.full_name ?? match?.email ?? "Assigned";
    }, [staffSpecs]);

    // Helper: pick best specialist for a category
    const pickSpecialist = useCallback((category: string): string | null => {
        const matches = staffSpecs.filter((s) => s.category === category);
        if (matches.length === 0) return null;
        // pick first match (can be extended to least-busy logic)
        return matches[0].user_id;
    }, [staffSpecs]);

    // Fetch Tickets with Profiles
    const { data: tickets, isLoading: isLoadingTickets } = useQuery({
        queryKey: ["admin-support-tickets", statusFilter, searchQuery],
        queryFn: async () => {
            let query = supabase
                .from("support_tickets")
                .select(`*, profiles (full_name, phone)`)
                .order("last_message_at", { ascending: false });

            if (statusFilter !== "all") {
                query = query.eq("status", statusFilter as any);
            }
            if (searchQuery) {
                query = query.or(`subject.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Ticket[];
        },
    });

    const mySpecialties = staffSpecs.filter(s => s.user_id === user?.id).map(s => s.category);

    let filteredTickets = tickets ?? [];
    if (assignedToMeOnly) {
        filteredTickets = filteredTickets.filter((t) => t.assigned_to === user?.id);
    }
    if (mySpecialtyOnly) {
        filteredTickets = filteredTickets.filter((t) => mySpecialties.includes(t.category));
    }

    // Fetch Messages for selected ticket
    const { data: messages } = useQuery({
        queryKey: ["support-messages", selectedTicket?.id],
        queryFn: async () => {
            if (!selectedTicket) return [];
            const { data, error } = await supabase
                .from("support_messages")
                .select("*")
                .eq("ticket_id", selectedTicket.id)
                .order("created_at", { ascending: true });
            if (error) throw error;
            return data as Message[];
        },
        enabled: !!selectedTicket,
    });

    // Real-time subscription for queue updates
    useEffect(() => {
        const channel = supabase
            .channel('admin-queue-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
                queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [queryClient]);

    // Real-time subscription for selected ticket messages
    useEffect(() => {
        if (!selectedTicket) return;
        const channel = supabase
            .channel(`admin-ticket-messages-${selectedTicket.id}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "support_messages",
                filter: `ticket_id=eq.${selectedTicket.id}`,
            }, () => {
                queryClient.invalidateQueries({ queryKey: ["support-messages", selectedTicket.id] });
                supabase.from("support_tickets").update({ unread_count_admin: 0 }).eq("id", selectedTicket.id);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [selectedTicket?.id, queryClient]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
        }
    }, [messages]);

    const handleTyping = (isTyping: boolean) => {
        if (!selectedTicket || !user) return;
        const channel = supabase.channel(`typing-${selectedTicket.id}`);
        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ user_id: user.id, is_typing: isTyping, at: new Date().toISOString() });
            }
        });
    };

    // Auto-assign when opening a ticket
    const handleSelectTicket = async (ticket: Ticket) => {
        let updated = ticket;

        // Reset unread
        supabase.from("support_tickets").update({ unread_count_admin: 0 }).eq("id", ticket.id);

        // Auto-assign if no assignee yet
        if (!ticket.assigned_to && staffSpecs.length > 0) {
            const specialist = pickSpecialist(ticket.category);
            if (specialist) {
                const { data: updatedTicket } = await supabase
                    .from("support_tickets")
                    .update({ assigned_to: specialist, status: ticket.status === "open" ? "in_progress" : ticket.status })
                    .eq("id", ticket.id)
                    .select("*, profiles (full_name, phone)")
                    .single();
                if (updatedTicket) {
                    updated = updatedTicket as Ticket;
                    queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
                    // Notify the assigned staff member
                    await supabase.from("notifications").insert({
                        user_id: specialist,
                        title: "Support ticket assigned to you",
                        message: `Ticket "${ticket.subject}" (${ticket.category}) has been assigned to you.`,
                        type: "info",
                        link: "/admin/support",
                    });
                }
            }
        }

        setSelectedTicket(updated);
    };

    // Manual assign mutation
    const assignMutation = useMutation({
        mutationFn: async ({ ticketId, assignee }: { ticketId: string; assignee: string | null }) => {
            const { error } = await supabase
                .from("support_tickets")
                .update({ assigned_to: assignee })
                .eq("id", ticketId);
            if (error) throw error;
            // Notify new assignee
            if (assignee) {
                await supabase.from("notifications").insert({
                    user_id: assignee,
                    title: "Support ticket assigned to you",
                    message: `You have been assigned ticket "${selectedTicket?.subject}".`,
                    type: "info",
                    link: "/admin/support",
                });
            }
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
            if (selectedTicket) {
                setSelectedTicket({ ...selectedTicket, assigned_to: vars.assignee });
            }
            toast({ title: "Ticket reassigned" });
        },
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    // Update Ticket Status Mutation
    const updateStatusMutation = useMutation({
        mutationFn: async (status: TicketStatus) => {
            if (!selectedTicket) return;
            const { error } = await supabase.from("support_tickets").update({ status }).eq("id", selectedTicket.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
            toast({ title: "Status Updated", description: "Ticket status has been changed." });
        },
    });

    // Send Message Mutation
    const sendMessageMutation = useMutation({
        mutationFn: async (message: string) => {
            if (!selectedTicket || !user) return;
            const { error } = await supabase
                .from("support_messages")
                .insert([{ ticket_id: selectedTicket.id, sender_id: user.id, message }]);
            if (error) throw error;
        },
        onSuccess: () => {
            setNewMessage("");
            queryClient.invalidateQueries({ queryKey: ["support-messages", selectedTicket?.id] });
            queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
        },
    });

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        sendMessageMutation.mutate(newMessage);
    };

    const handleStatusChange = (status: TicketStatus) => {
        updateStatusMutation.mutate(status);
        if (selectedTicket) setSelectedTicket({ ...selectedTicket, status });
    };

    // Unique staff members for assign dropdown
    const uniqueStaff = staffSpecs.reduce<{ user_id: string; full_name: string | null; email: string | null }[]>((acc, s) => {
        if (!acc.find((a) => a.user_id === s.user_id)) acc.push({ user_id: s.user_id, full_name: s.full_name, email: s.email });
        return acc;
    }, []);

    const assigneeName = getAssigneeName(selectedTicket?.assigned_to ?? null);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-foreground">Support Queues</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage and resolve customer and agent support requests.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-180px)]">
                {/* Ticket List */}
                <Card className={`lg:col-span-4 flex flex-col overflow-hidden border-border/50 shadow-xl ring-1 ring-white/5 bg-card/50 backdrop-blur-sm ${selectedTicket ? "hidden lg:flex" : "flex"}`}>
                    <CardHeader className="p-4 border-b space-y-4 bg-muted/20">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                                <Filter className="h-4 w-4" /> Support Queue
                            </CardTitle>
                            {/* Assigned-to-me toggle */}
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant={mySpecialtyOnly ? "default" : "ghost"}
                                    className={`h-7 px-2 text-[10px] gap-1 font-bold uppercase tracking-widest transition-all ${mySpecialtyOnly ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                                    onClick={() => setMySpecialtyOnly((v) => !v)}
                                    title="Show only tickets matching my specialties"
                                >
                                    <ShieldCheck className="h-3 w-3" />
                                    Specialties
                                    {mySpecialtyOnly && <X className="h-3 w-3 ml-0.5" onClick={(e) => { e.stopPropagation(); setMySpecialtyOnly(false); }} />}
                                </Button>
                                <Button
                                    size="sm"
                                    variant={assignedToMeOnly ? "default" : "ghost"}
                                    className={`h-7 px-2 text-[10px] gap-1 font-bold uppercase tracking-widest transition-all ${assignedToMeOnly ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                                    onClick={() => setAssignedToMeOnly((v) => !v)}
                                    title="Show only tickets assigned to me"
                                >
                                    <UserCheck className="h-3 w-3" />
                                    My Tickets
                                    {assignedToMeOnly && <X className="h-3 w-3 ml-0.5" onClick={(e) => { e.stopPropagation(); setAssignedToMeOnly(false); }} />}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search tickets..."
                                    className="pl-9 h-9 bg-card/50 border-border/50 focus-visible:ring-primary/20"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-9 bg-card/50 border-border/50">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <ScrollArea className="flex-1">
                        <div className="divide-y divide-border/50">
                            {isLoadingTickets ? (
                                Array(5).fill(0).map((_, i) => (
                                    <div key={i} className="p-4 animate-pulse space-y-2">
                                        <div className="h-4 bg-muted rounded w-3/4" />
                                        <div className="h-3 bg-muted rounded w-1/2" />
                                    </div>
                                ))
                            ) : filteredTickets.length === 0 ? (
                                <div className="p-12 text-center text-muted-foreground sm:text-sm italic opacity-50">
                                    No tickets matching these criteria.
                                </div>
                            ) : (
                                filteredTickets.map((ticket) => {
                                    const isMySpecialty = mySpecialties.includes(ticket.category);
                                    const isUnassigned = !ticket.assigned_to;

                                    return (
                                        <div
                                            key={ticket.id}
                                            onClick={() => handleSelectTicket(ticket)}
                                            className={`p-4 cursor-pointer hover:bg-muted/30 transition-all border-l-4 ${selectedTicket?.id === ticket.id ? "bg-muted/50 border-primary shadow-inner" : "border-transparent"} ${isMySpecialty && isUnassigned ? "bg-primary/5" : ""}`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-sm truncate">{ticket.subject}</h3>
                                                        {(ticket.unread_count_admin ?? 0) > 0 && (
                                                            <Badge variant="destructive" className="h-5 min-w-5 shrink-0 items-center justify-center rounded-full p-0 text-[10px]">
                                                                {ticket.unread_count_admin}
                                                            </Badge>
                                                        )}
                                                        {isMySpecialty && isUnassigned && (
                                                            <Badge variant="outline" className="border-primary/30 text-[8px] h-3.5 px-1 py-0 bg-primary/10 text-primary uppercase font-bold tracking-widest">Specialty Match</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate uppercase tracking-tight flex items-center gap-1">
                                                        <User className="h-2 w-2" /> {ticket.profiles?.full_name || "Unknown"}
                                                    </p>
                                                    {ticket.assigned_to && (
                                                        <p className="text-[10px] text-primary mt-0.5 flex items-center gap-1 truncate">
                                                            <UserCheck className="h-2 w-2" />
                                                            {getAssigneeName(ticket.assigned_to)}
                                                        </p>
                                                    )}
                                                </div>
                                                <Badge variant="outline" className={`${statusColors[ticket.status]} text-[9px] h-4 px-1.5 shrink-0 rounded-full`}>
                                                    {ticket.status.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground font-medium">
                                                <div className="flex items-center gap-1">
                                                    <Badge variant="secondary" className="text-[8px] h-3.5 px-1 py-0 capitalize">{ticket.category.replace('_', ' ')}</Badge>
                                                    <Badge className={`${priorityColors[ticket.priority]} text-[8px] h-3.5 px-1 py-0`}>{ticket.priority}</Badge>
                                                </div>
                                                <span>{format(new Date(ticket.last_message_at || ticket.updated_at), "MMM d, p")}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </ScrollArea>
                </Card>

                {/* Ticket Content */}
                <Card className={`lg:col-span-8 flex flex-col overflow-hidden border-border/50 shadow-2xl ring-1 ring-white/5 bg-card/50 backdrop-blur-md ${!selectedTicket ? "hidden lg:flex" : "flex"}`}>
                    {selectedTicket ? (
                        <>
                            <CardHeader className="p-4 border-b bg-muted/10 flex-row items-center justify-between space-y-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 hover:bg-primary/10 hover:text-primary shrink-0" onClick={() => setSelectedTicket(null)}>
                                        <ChevronRight className="h-4 w-4 rotate-180" />
                                    </Button>
                                    <div className="min-w-0">
                                        <CardTitle className="text-base font-bold flex items-center gap-2 truncate">
                                            {selectedTicket.subject}
                                        </CardTitle>
                                        <CardDescription className="text-[10px] font-medium flex items-center gap-2 uppercase tracking-wide">
                                            <User className="h-3 w-3 text-primary" /> {selectedTicket.profiles?.full_name} • {selectedTicket.profiles?.phone}
                                        </CardDescription>
                                        {/* Assigned-to display */}
                                        {assigneeName && (
                                            <p className="text-[10px] text-primary flex items-center gap-1 mt-0.5">
                                                <UserCheck className="h-3 w-3" />
                                                Assigned to: <span className="font-bold">{assigneeName}</span>
                                                {selectedTicket.assigned_to === user?.id && (
                                                    <Badge className="text-[8px] h-3.5 px-1 py-0 ml-1 bg-primary/20 text-primary border-0">You</Badge>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <Badge className={`${priorityColors[selectedTicket.priority]} text-[10px] uppercase h-6 px-3 rounded-full border-2 hidden sm:inline-flex`}>
                                        {selectedTicket.priority}
                                    </Badge>

                                    {/* Manual assign dropdown */}
                                    {uniqueStaff.length > 0 && (
                                        <Select
                                            value={selectedTicket.assigned_to ?? "none"}
                                            onValueChange={(val) => assignMutation.mutate({ ticketId: selectedTicket.id, assignee: val === "none" ? null : val })}
                                        >
                                            <SelectTrigger className="h-8 w-[130px] text-[10px] bg-card/50 border-border/50 rounded-full font-bold">
                                                <UserCheck className="h-3 w-3 mr-1 shrink-0" />
                                                <SelectValue placeholder="Assign to…" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Unassigned</SelectItem>
                                                <Separator />
                                                {uniqueStaff.map((s) => (
                                                    <SelectItem key={s.user_id} value={s.user_id}>
                                                        {s.full_name ?? s.email ?? s.user_id.slice(0, 8)}
                                                        {s.user_id === user?.id && " (You)"}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}

                                    <div className="flex items-center gap-1">
                                        {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-[10px] uppercase font-bold text-green-600 border-green-200 hover:bg-green-50 rounded-full"
                                                onClick={() => handleStatusChange('resolved')}
                                            >
                                                Resolve
                                            </Button>
                                        )}
                                        {selectedTicket.status !== 'closed' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-[10px] uppercase font-bold text-slate-600 border-slate-200 hover:bg-slate-50 rounded-full"
                                                onClick={() => handleStatusChange('closed')}
                                            >
                                                Close
                                            </Button>
                                        )}
                                    </div>

                                    <Select value={selectedTicket.status} onValueChange={(val) => handleStatusChange(val as TicketStatus)}>
                                        <SelectTrigger className="h-8 w-[110px] text-[10px] bg-card/50 border-border/50 rounded-full font-bold">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="open">Open</SelectItem>
                                            <SelectItem value="in_progress">In Progress</SelectItem>
                                            <SelectItem value="resolved">Resolved</SelectItem>
                                            <SelectItem value="closed">Closed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardHeader>

                            <ScrollArea className="flex-1 p-6 scroll-smooth" ref={scrollRef}>
                                <div className="space-y-8 pb-4">
                                    <div className="bg-muted/30 p-5 rounded-2xl border border-border/50 backdrop-blur-sm shadow-inner overflow-hidden relative group">
                                        <div className="absolute top-0 right-0 p-2 opacity-5">
                                            <ShieldCheck className="h-20 w-20" />
                                        </div>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3 opacity-50">Discovery / Initial Intent</p>
                                        <p className="text-sm font-medium leading-relaxed">{selectedTicket.description}</p>
                                        <div className="flex items-center gap-2 mt-4 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                                            <Clock className="h-3 w-3" />
                                            Received on {format(new Date(selectedTicket.created_at), "PPP p")}
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t border-border/50 border-dashed" />
                                        </div>
                                        <div className="relative flex justify-center">
                                            <span className="bg-card px-4 py-1 rounded-full border border-border/50 text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em]">Chronology</span>
                                        </div>
                                    </div>

                                    {messages?.map((msg, idx) => {
                                        const isStaff = msg.sender_id === user?.id;
                                        const showHeader = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id;

                                        return (
                                            <div key={msg.id} className={`flex flex-col ${isStaff ? "items-end" : "items-start"} gap-1 group animate-in slide-in-from-bottom-2 duration-300`}>
                                                {!isStaff && showHeader && (
                                                    <div className="flex items-center gap-2 mb-1 px-1">
                                                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                                            <User className="h-3 w-3 text-primary" />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{selectedTicket.profiles?.full_name}</span>
                                                    </div>
                                                )}
                                                {isStaff && showHeader && (
                                                    <div className="flex items-center gap-2 mb-1 px-1">
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Internal Response</span>
                                                        <div className="h-6 w-6 rounded-full bg-secondary/20 flex items-center justify-center border border-secondary/30">
                                                            <ShieldCheck className="h-3 w-3 text-secondary" />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className={`
                                                    max-w-[85%] px-5 py-3.5 rounded-2xl shadow-xl transition-all duration-300
                                                    ${isStaff
                                                        ? "bg-primary text-primary-foreground rounded-tr-none border border-primary/20"
                                                        : "bg-muted/60 text-foreground border border-border/50 rounded-tl-none shadow-sm shadow-black/5"
                                                    }
                                                `}>
                                                    <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                                                    <div className={`
                                                        flex items-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300
                                                        ${isStaff ? "justify-end text-primary-foreground/70" : "justify-start text-muted-foreground"}
                                                    `}>
                                                        <Clock className="h-2.5 w-2.5" />
                                                        <p className="text-[9px] font-bold uppercase tracking-tighter">
                                                            {format(new Date(msg.created_at), "p")}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Typing Indicator */}
                                    <TypingIndicator ticketId={selectedTicket.id} />

                                    {messages?.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-12 text-center opacity-30 grayscale pointer-events-none">
                                            <MessageCircle className="h-12 w-12 mb-2" />
                                            <p className="text-xs font-bold uppercase tracking-[0.2em]">Silence Observed</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            <div className="p-4 border-t border-border/50 bg-muted/20 backdrop-blur-md">
                                <form onSubmit={handleSendMessage} className="space-y-4">
                                    <div className="relative">
                                        <Textarea
                                            placeholder="Compose authoritative reply..."
                                            value={newMessage}
                                            onChange={(e) => {
                                                setNewMessage(e.target.value);
                                                handleTyping(e.target.value.length > 0);
                                            }}
                                            onBlur={() => handleTyping(false)}
                                            className="min-h-[100px] bg-card/50 border-border/50 rounded-xl resize-none focus:ring-primary/20 transition-all text-sm leading-relaxed p-4"
                                            disabled={sendMessageMutation.isPending}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center bg-card/30 p-2 rounded-xl border border-border/50 backdrop-blur-sm">
                                        <div className="flex items-center gap-2 px-2">
                                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Operator: Active</p>
                                        </div>
                                        <Button
                                            type="submit"
                                            size="sm"
                                            className="gold-gradient text-secondary-foreground shadow-lg shadow-gold/20 font-black uppercase tracking-widest text-[10px] h-9 px-6 rounded-lg transition-all hover:scale-105 active:scale-95 disabled:grayscale"
                                            disabled={!newMessage.trim() || sendMessageMutation.isPending}
                                        >
                                            {sendMessageMutation.isPending ? (
                                                <div className="h-4 w-4 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin" />
                                            ) : (
                                                <>Transmit Reply <Send className="h-3.5 w-3.5 ml-2" /></>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl animate-pulse" />
                                <div className="relative p-10 rounded-full bg-card/50 border-2 border-dashed border-border/50 shadow-2xl ring-1 ring-white/10">
                                    <ShieldCheck className="h-16 w-16 text-primary/50" />
                                </div>
                            </div>
                            <div className="max-w-sm">
                                <h3 className="text-xl font-black uppercase tracking-[0.2em] mb-2">Command Center</h3>
                                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                                    Awaiting selection. Orchestrate customer success by selecting an active support ticket from the mission queue.
                                </p>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

const TypingIndicator = ({ ticketId }: { ticketId: string }) => {
    const [isTyping, setIsTyping] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        const channel = supabase.channel(`typing-${ticketId}`);
        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const typingUsers = Object.values(state)
                    .flat()
                    .filter((p: any) => p.user_id !== user?.id && p.is_typing);
                setIsTyping(typingUsers.length > 0);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [ticketId, user?.id]);

    if (!isTyping) return null;

    return (
        <div className="flex items-center gap-2 px-1 animate-in fade-in duration-300">
            <div className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">User is typing...</span>
        </div>
    );
};

export default AdminSupport;
