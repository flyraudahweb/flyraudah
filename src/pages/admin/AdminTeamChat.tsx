import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Send, Search, User, MessageCircle, MoreVertical, Loader2, Hash } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, Users, CheckSquare, Square } from "lucide-react";
const AdminTeamChat = () => {
    const { user, roles } = useAuth();
    const isSuperAdmin = roles.includes("super_admin" as never);
    const queryClient = useQueryClient();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [selectedChannel, setSelectedChannel] = useState<string | null>("general");
    const [messageText, setMessageText] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch staff directory (Profiles where role is staff or superadmin)
    const { data: staffMembers = [], isLoading: isLoadingStaff } = useQuery({
        queryKey: ["staff-directory"],
        queryFn: async () => {
            // @ts-ignore
            const { data, error } = await supabase.rpc("get_staff_directory" as any);

            if (error) throw error;
            if (!data) return [];

            // Filter out current user
            // @ts-ignore
            const combined = (data as unknown as any[]).filter((p: any) => p.id !== user?.id);

            return combined.sort((a: any, b: any) => (a.full_name || "").localeCompare(b.full_name || ""));
        },
    });

    // Fetch user permissions and specialties
    const { data: userAccess = { perms: [], specs: [] } } = useQuery({
        queryKey: ["staff-access", user?.id],
        queryFn: async () => {
            if (!user?.id) return { perms: [], specs: [] };

            const { data: permsData } = await (supabase as any)
                .from("staff_permissions")
                .select("permission")
                .eq("user_id", user.id);

            const { data: specsData } = await (supabase as any)
                .from("staff_support_specialties")
                .select("category")
                .eq("user_id", user.id);

            return {
                perms: (permsData || []).map((p: any) => p.permission),
                specs: (specsData || []).map((s: any) => s.category)
            };
        },
        enabled: !!user?.id
    });

    // Fetch messages for selected staff or channel
    const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
        queryKey: ["staff-messages", selectedStaffId, selectedChannel],
        queryFn: async () => {
            if (!selectedStaffId && !selectedChannel) return [];

            let query = (supabase as any).from("staff_messages").select("*, profiles!staff_messages_sender_id_fkey(full_name, avatar_url)");

            if (selectedChannel) {
                query = query.eq("channel", selectedChannel);
            } else if (selectedStaffId) {
                query = query.is("channel", null)
                    .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${selectedStaffId}),and(sender_id.eq.${selectedStaffId},receiver_id.eq.${user?.id})`);
            }

            // @ts-ignore
            const { data, error } = await query.order("created_at", { ascending: true });

            if (error) throw error;
            return data || [];
        },
        enabled: !!selectedStaffId || !!selectedChannel,
    });

    // Fetch unread direct messages count
    const { data: unreadCounts = {} } = useQuery({
        queryKey: ["unread-dms", user?.id],
        queryFn: async () => {
            if (!user?.id) return {};
            const { data, error } = await (supabase as any)
                .from("staff_messages")
                .select("sender_id")
                .eq("receiver_id", user.id)
                .is("read_at", null);

            if (error) throw error;

            const counts: Record<string, number> = {};
            data?.forEach((msg: any) => {
                counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
            });
            return counts;
        },
        enabled: !!user?.id,
    });

    // Realtime subscription setup
    useEffect(() => {
        if (!user?.id) return;

        const channelSub = supabase.channel("realtime-team-chat")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "staff_messages" },
                (payload) => {
                    const newMsg = payload.new;
                    // Invalidate if it's a channel message, or if it involves the current user as a DM
                    if (newMsg.channel || newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
                        queryClient.invalidateQueries({ queryKey: ["staff-messages"] });
                        queryClient.invalidateQueries({ queryKey: ["unread-dms"] });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channelSub);
        };
    }, [user?.id, queryClient]);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // Mark messages as read when opening a chat
    useEffect(() => {
        if (selectedStaffId && user?.id) {
            const markAsRead = async () => {
                const { error } = await (supabase as any)
                    .from("staff_messages")
                    .update({ read_at: new Date().toISOString() })
                    .eq("receiver_id", user.id)
                    .eq("sender_id", selectedStaffId)
                    .is("read_at", null);

                if (!error) {
                    queryClient.invalidateQueries({ queryKey: ["unread-dms"] });
                }
            };
            markAsRead();
        }
    }, [selectedStaffId, user?.id, messages, queryClient]);

    const sendMessageMutation = useMutation({
        mutationFn: async (content: string) => {
            if (!selectedStaffId && !selectedChannel) throw new Error("No chat selected");

            const payload: any = {
                sender_id: user?.id,
                content: content
            };

            if (selectedChannel) {
                payload.channel = selectedChannel;
            } else {
                payload.receiver_id = selectedStaffId;
            }

            const { error } = await (supabase as any).from("staff_messages").insert(payload);
            if (error) throw error;
        },
        onSuccess: () => {
            setMessageText("");
            queryClient.invalidateQueries({ queryKey: ["staff-messages", selectedStaffId, selectedChannel] });
        },
        onError: (error) => {
            toast.error("Failed to send message: " + error.message);
        }
    });

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageText.trim() || (!selectedStaffId && !selectedChannel)) return;
        sendMessageMutation.mutate(messageText.trim());
    };

    const filteredStaff = staffMembers.filter(s =>
        s.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedStaff = staffMembers.find(s => s.id === selectedStaffId);

    // --- Broadcast Logic ---
    const [broadcastOpen, setBroadcastOpen] = useState(false);
    const [broadcastMessage, setBroadcastMessage] = useState("");
    const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    const toggleRecipient = (staffId: string) => {
        setSelectedRecipients(prev =>
            prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]
        );
    };

    const handleBroadcast = async () => {
        if (!broadcastMessage.trim() || selectedRecipients.length === 0) return;
        setIsBroadcasting(true);

        try {
            const payloads = selectedRecipients.map(recipientId => ({
                sender_id: user?.id,
                receiver_id: recipientId,
                content: broadcastMessage.trim()
            }));

            const { error } = await (supabase as any).from("staff_messages").insert(payloads);
            if (error) throw error;

            toast.success(`Broadcast sent to ${selectedRecipients.length} colleagues!`);
            setBroadcastOpen(false);
            setBroadcastMessage("");
            setSelectedRecipients([]);
            queryClient.invalidateQueries({ queryKey: ["staff-messages"] });
        } catch (error: any) {
            toast.error("Failed to send broadcast: " + error.message);
        } finally {
            setIsBroadcasting(false);
        }
    };

    const CHANNELS = [
        { id: "general", name: "General", show: true },
        {
            id: "platinum",
            name: "Platinum Agent Support",
            show: isSuperAdmin || userAccess.perms.includes("support") || userAccess.specs.includes("general") || userAccess.perms.includes("agents")
        },
        {
            id: "payments",
            name: "Payments",
            show: isSuperAdmin || userAccess.perms.includes("payments") || userAccess.specs.includes("payment")
        },
        {
            id: "visa",
            name: "Visa Processing",
            show: isSuperAdmin || userAccess.specs.includes("visa")
        },
        {
            id: "registration",
            name: "Registration",
            show: isSuperAdmin || userAccess.perms.includes("pilgrims") || userAccess.perms.includes("agents") || userAccess.specs.includes("booking") || userAccess.specs.includes("agent_commissions") || userAccess.specs.includes("booking_assistance")
        },
        {
            id: "packages",
            name: "Packages & Logistics",
            show: isSuperAdmin || userAccess.perms.includes("packages") || userAccess.specs.includes("flights")
        },
        {
            id: "support",
            name: "Customer Support",
            show: isSuperAdmin || userAccess.perms.includes("support") || userAccess.specs.includes("general") || userAccess.specs.includes("technical") || userAccess.specs.includes("documents")
        },
        {
            id: "leadership",
            name: "Leadership Hub",
            show: isSuperAdmin || userAccess.perms.includes("overview") || userAccess.perms.includes("settings") || userAccess.perms.includes("staff_management") || userAccess.perms.includes("bank_accounts") || userAccess.perms.includes("analytics") || userAccess.perms.includes("activity")
        }
    ].filter(c => c.show);

    const getSenderInfo = (msg: any) => {
        if (msg.sender_id === user?.id) return { full_name: "You", avatar_url: null };
        if (msg.profiles) return { full_name: msg.profiles.full_name, avatar_url: msg.profiles.avatar_url };
        const staff = staffMembers.find(s => s.id === msg.sender_id);
        return staff || { full_name: "Unknown Staff", avatar_url: null };
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] rounded-2xl overflow-hidden border border-border/60 bg-background shadow-sm">

            {/* Sidebar Directory */}
            <div className="w-80 border-r border-border/60 bg-muted/10 flex flex-col hidden md:flex shrink-0">
                <div className="p-4 border-b border-border/60 shrink-0">
                    <h2 className="font-heading font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-secondary" />
                        Team Directory
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search colleagues..."
                            className="bg-background pl-9 h-9 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Broadcast Header Button */}
                <div className="py-3 px-4 flex justify-center border-b border-border/60 shrink-0">
                    <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full gap-2 text-primary border-primary/20 hover:bg-primary/5">
                                <Megaphone className="h-4 w-4" />
                                New Broadcast
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xl">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Megaphone className="h-5 w-5 text-primary" />
                                    Broadcast Message
                                </DialogTitle>
                                <DialogDescription>
                                    Send a multi-recipient message. This will be delivered as individual direct messages.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-medium text-foreground">Select Recipients</h4>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedRecipients(filteredStaff.map(s => s.id))}
                                                className="h-7 text-xs"
                                            >
                                                Select All
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedRecipients([])}
                                                className="h-7 text-xs"
                                            >
                                                Clear
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 rounded-md border p-2 bg-muted/20">
                                        {filteredStaff.map(staff => (
                                            <div
                                                key={staff.id}
                                                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${selectedRecipients.includes(staff.id) ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'}`}
                                                onClick={() => toggleRecipient(staff.id)}
                                            >
                                                <Checkbox checked={selectedRecipients.includes(staff.id)} className="shrink-0" />
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={staff.avatar_url || ''} />
                                                        <AvatarFallback className="text-[10px] bg-secondary/20">{staff.full_name?.substring(0, 2).toUpperCase() || "ST"}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm truncate text-foreground">{staff.full_name}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {filteredStaff.length === 0 && (
                                            <p className="text-sm text-muted-foreground p-2 col-span-2 text-center">No staff found.</p>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{selectedRecipients.length} Selected</p>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-foreground">Message</h4>
                                    <Textarea
                                        placeholder="Type your broadcast message..."
                                        value={broadcastMessage}
                                        onChange={(e) => setBroadcastMessage(e.target.value)}
                                        className="min-h-[100px] resize-none"
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setBroadcastOpen(false)}>Cancel</Button>
                                <Button
                                    onClick={handleBroadcast}
                                    disabled={selectedRecipients.length === 0 || !broadcastMessage.trim() || isBroadcasting}
                                    className="gap-2"
                                >
                                    {isBroadcasting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    Send Broadcast
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <ScrollArea className="flex-1">
                    {/* Channels List */}
                    <div className="p-2 pt-4">
                        <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Channels</h3>
                        <div className="space-y-1">
                            {CHANNELS.map(channel => (
                                <button
                                    key={channel.id}
                                    onClick={() => {
                                        setSelectedChannel(channel.id);
                                        setSelectedStaffId(null);
                                    }}
                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all ${selectedChannel === channel.id
                                        ? "bg-secondary text-secondary-foreground shadow-md font-medium"
                                        : "hover:bg-muted/50 text-foreground"
                                        }`}
                                >
                                    <Hash className={`h-4 w-4 shrink-0 ${selectedChannel === channel.id ? "text-secondary-foreground/80" : "text-muted-foreground"}`} />
                                    <span className="text-sm">{channel.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="px-5 py-2"><div className="h-px bg-border/60 w-full" /></div>

                    {/* Direct Messages List */}
                    <div className="p-2 pb-4">
                        <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Direct Messages</h3>
                        {isLoadingStaff ? (
                            <div className="p-4 flex justify-center">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredStaff.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No staff found.
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredStaff.map((staff) => (
                                    <button
                                        key={staff.id}
                                        onClick={() => {
                                            setSelectedStaffId(staff.id);
                                            setSelectedChannel(null);
                                        }}
                                        className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl transition-all ${selectedStaffId === staff.id
                                            ? "bg-secondary text-secondary-foreground shadow-md"
                                            : "hover:bg-muted/50 text-foreground"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <Avatar className="h-8 w-8 shrink-0 border border-border/50">
                                                <AvatarImage src={staff.avatar_url || ''} />
                                                <AvatarFallback className={selectedStaffId === staff.id ? "bg-white/20" : "bg-muted"}>
                                                    {staff.full_name?.substring(0, 2).toUpperCase() || "ST"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="text-left overflow-hidden">
                                                <p className="font-medium text-sm truncate">{staff.full_name}</p>
                                            </div>
                                        </div>
                                        {!!unreadCounts[staff.id] && (
                                            <Badge variant="destructive" className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full p-0 text-[10px]">
                                                {unreadCounts[staff.id]}
                                            </Badge>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-background relative">
                {selectedStaffId || selectedChannel ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 border-b border-border/60 flex items-center justify-between px-6 shrink-0 bg-background/95 backdrop-blur z-10">
                            <div className="flex items-center gap-3">
                                {selectedChannel ? (
                                    <>
                                        <div className="h-9 w-9 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/20 shrink-0">
                                            <Hash className="h-4 w-4 text-secondary" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-foreground capitalize">{CHANNELS.find(c => c.id === selectedChannel)?.name}</h3>
                                            <p className="text-xs text-muted-foreground">Team Channel</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Avatar className="h-9 w-9 border border-border/50 shadow-sm">
                                            <AvatarImage src={selectedStaff?.avatar_url || ''} />
                                            <AvatarFallback className="bg-secondary/10 text-secondary border border-secondary/20">
                                                {selectedStaff?.full_name?.substring(0, 2).toUpperCase() || "ST"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h3 className="font-bold text-sm text-foreground">{selectedStaff?.full_name}</h3>
                                            <p className="text-xs text-muted-foreground capitalize">{selectedStaff?.role}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                            <Button variant="ghost" size="icon" className="text-muted-foreground shrink-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Chat Messages */}
                        <ScrollArea className="flex-1 p-6 bg-slate-50/50">
                            {isLoadingMessages ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="h-8 w-8 animate-spin text-secondary/50" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                                    <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
                                        <MessageCircle className="h-8 w-8 text-secondary" />
                                    </div>
                                    <p className="text-sm font-medium text-foreground">No messages yet</p>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Send a message to start the conversation with {selectedStaff?.full_name}.</p>
                                </div>
                            ) : (
                                <div className="space-y-4 pb-2">
                                    {/* @ts-ignore */}
                                    {messages.map((msg: any, index: number) => {
                                        const isMine = msg.sender_id === user?.id;
                                        // @ts-ignore
                                        const showTime = index === 0 || (new Date(msg.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 300000); // 5 mins

                                        return (
                                            <div key={msg.id} className="w-full flex flex-col">
                                                {showTime && (
                                                    <div className="flex justify-center mb-3 mt-4">
                                                        <Badge variant="outline" className="text-[10px] bg-background/80 font-normal px-3 py-0.5 text-muted-foreground border-border/50 shadow-sm">
                                                            {format(new Date(msg.created_at), "MMM d, h:mm a")}
                                                        </Badge>
                                                    </div>
                                                )}
                                                <div className={`flex ${isMine ? "justify-end" : "justify-start"} w-full`}>
                                                    <div className={`flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[75%]`}>
                                                        {selectedChannel && !isMine && (
                                                            <span className="text-xs font-medium text-muted-foreground mb-1 ml-1">
                                                                {getSenderInfo(msg).full_name}
                                                            </span>
                                                        )}
                                                        <div className={`px-4 py-2.5 rounded-2xl shadow-sm relative ${isMine
                                                            ? "bg-secondary text-secondary-foreground rounded-tr-sm"
                                                            : "bg-white border border-border/50 rounded-tl-sm"
                                                            }`}>
                                                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                                                        </div>
                                                        <span className={`text-[10px] mt-1 font-medium opacity-70 text-muted-foreground`}>
                                                            {format(new Date(msg.created_at), "h:mm a")}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={scrollRef} />
                                </div>
                            )}
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="p-4 bg-background border-t border-border/60 shrink-0">
                            <form onSubmit={handleSendMessage} className="flex items-end gap-2 relative">
                                <div className="flex-1 relative">
                                    <Input
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        placeholder="Type a message..."
                                        className="min-h-[48px] h-12 rounded-xl border-border/60 bg-muted/20 pl-4 pr-12 focus-visible:ring-secondary/30 shadow-inner"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    size="icon"
                                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                                    className="h-12 w-12 rounded-xl shrink-0 bg-secondary hover:bg-secondary/90 text-white shadow-md transition-transform hover:scale-105 active:scale-95"
                                >
                                    {sendMessageMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-1" />}
                                </Button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground/60">
                        <MessageCircle className="h-16 w-16 mb-4 opacity-50" />
                        <h2 className="text-lg font-medium text-foreground mb-2">Team Internal Chat</h2>
                        <p className="text-sm max-w-[250px] leading-relaxed">Select a colleague from the sidebar to start collaborating privately.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminTeamChat;
