import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Send, ShieldCheck, Clock, Loader2, Sparkles } from "lucide-react";

const PlatinumSupportChat = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [messageText, setMessageText] = useState("");

    // Fetch messages for platinum channel
    const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
        queryKey: ["platinum-messages"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("staff_messages")
                .select("*, profiles!staff_messages_sender_id_fkey(full_name, avatar_url)")
                .eq("channel", "platinum")
                .order("created_at", { ascending: true });

            if (error) throw error;
            return data || [];
        },
    });

    // Realtime subscription
    useEffect(() => {
        const channelSub = supabase.channel("realtime-platinum-chat")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "staff_messages", filter: "channel=eq.platinum" },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["platinum-messages"] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channelSub);
        };
    }, [queryClient]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const sendMessageMutation = useMutation({
        mutationFn: async (content: string) => {
            const payload = {
                sender_id: user?.id,
                channel: "platinum",
                content: content
            };

            const { error } = await supabase.from("staff_messages").insert(payload);
            if (error) throw error;
        },
        onSuccess: () => {
            setMessageText("");
        }
    });

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageText.trim()) return;
        sendMessageMutation.mutate(messageText.trim());
    };

    return (
        <Card className="border-border/50 shadow-2xl overflow-hidden bg-card/50 backdrop-blur-md ring-1 ring-gold/20 flex flex-col h-[600px]">
            <CardHeader className="p-4 border-b bg-gradient-to-r from-gold/10 to-transparent flex-row items-center justify-between space-y-0 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-gold/20 flex items-center justify-center border border-gold/30 shrink-0 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-gold to-yellow-300 opacity-20" />
                        <Sparkles className="h-5 w-5 text-gold-foreground" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                            Platinum Agent Support
                        </CardTitle>
                        <CardDescription className="text-[10px] font-medium uppercase tracking-wide text-gold-foreground">
                            Priority Live Channel
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <ScrollArea className="flex-1 p-6 bg-slate-50/50">
                {isLoadingMessages ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-gold/50" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                        <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mb-4">
                            <ShieldCheck className="h-8 w-8 text-gold" />
                        </div>
                        <p className="text-sm font-medium text-foreground">Platinum Channel Active</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                            Post your inquiries here to instantly notify all specialized staff members.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4 pb-2">
                        {messages.map((msg: any, index: number) => {
                            const isMine = msg.sender_id === user?.id;
                            const showTime = index === 0 || (new Date(msg.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 300000);
                            const senderName = msg.profiles?.full_name || "Staff Member";
                            const isStaff = msg.profiles?.role !== 'agent' && msg.profiles?.role !== 'user';

                            return (
                                <div key={msg.id} className="w-full flex flex-col">
                                    {showTime && (
                                        <div className="flex justify-center mb-3 mt-4">
                                            <div className="text-[10px] bg-background/80 px-3 py-0.5 rounded-full text-muted-foreground border border-border/50 shadow-sm">
                                                {format(new Date(msg.created_at), "MMM d, h:mm a")}
                                            </div>
                                        </div>
                                    )}
                                    <div className={`flex ${isMine ? "justify-end" : "justify-start"} w-full`}>
                                        <div className={`flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[80%]`}>
                                            {!isMine && (
                                                <span className="text-xs font-medium text-muted-foreground mb-1 ml-1 flex items-center gap-1">
                                                    {isStaff && <ShieldCheck className="h-3 w-3 text-secondary" />}
                                                    {senderName}
                                                </span>
                                            )}
                                            <div className={`px-4 py-3 rounded-2xl shadow-sm relative ${isMine
                                                ? "bg-gold text-secondary-foreground rounded-tr-sm"
                                                : "bg-white border border-border/50 rounded-tl-sm"
                                                }`}>
                                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                                            </div>
                                            <span className="text-[9px] mt-1.5 font-bold uppercase tracking-tight text-muted-foreground/60">
                                                {format(new Date(msg.created_at), "p")}
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

            <div className="p-4 bg-background border-t border-border/60 shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2 relative">
                    <Input
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Message Platinum Support..."
                        className="min-h-[48px] h-12 rounded-xl border-border/60 bg-muted/20 pl-4 focus-visible:ring-gold/30 shadow-inner"
                        disabled={sendMessageMutation.isPending}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!messageText.trim() || sendMessageMutation.isPending}
                        className="h-12 w-12 rounded-xl shrink-0 bg-gold hover:bg-yellow-500 text-secondary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 border-none"
                    >
                        {sendMessageMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-1" />}
                    </Button>
                </form>
            </div>
        </Card>
    );
};

export default PlatinumSupportChat;
