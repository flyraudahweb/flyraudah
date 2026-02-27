import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  MessageCircle, User, ShieldCheck, Phone, Mail, Send,
  Plus, ChevronRight, Clock, AlertCircle, HelpCircle
} from "lucide-react";
import { format } from "date-fns";
import PlatinumSupportChat from "@/components/agent/PlatinumSupportChat";

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
  unread_count_user?: number;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  created_at: string;
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

const DashboardSupport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch Tickets
  const { data: tickets, isLoading: isLoadingTickets } = useQuery({
    queryKey: ["support-tickets", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Ticket[];
    },
  });

  // Fetch Messages for selected ticket
  const { data: messages, isLoading: isLoadingMessages } = useQuery({
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

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedTicket) return;

    const channel = supabase
      .channel(`ticket-messages-${selectedTicket.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${selectedTicket.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["support-messages", selectedTicket.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket?.id, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  }, [messages]);

  // Reset unread counts when a ticket is opened
  useEffect(() => {
    if (selectedTicket && selectedTicket.unread_count_user && selectedTicket.unread_count_user > 0) {
      const resetUnread = async () => {
        await supabase.from("support_tickets").update({ unread_count_user: 0 }).eq("id", selectedTicket.id);
        queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      };
      resetUnread();
    }
  }, [selectedTicket, queryClient]);

  const handleTyping = (isTyping: boolean) => {
    if (!selectedTicket || !user) return;
    const channel = supabase.channel(`typing-${selectedTicket.id}`);
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: user.id,
          is_typing: isTyping,
          at: new Date().toISOString(),
        });
      }
    });
  };

  // Create Ticket Mutation
  const createTicketMutation = useMutation({
    mutationFn: async (values: { subject: string; category: string; description: string; priority: string }) => {
      const { data, error } = await supabase
        .from("support_tickets")
        .insert([{ ...values, user_id: user?.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Ticket Created", description: "Your support request has been submitted." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
    },
  });

  const handleCreateTicket = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createTicketMutation.mutate({
      subject: formData.get("subject") as string,
      category: formData.get("category") as string,
      description: formData.get("description") as string,
      priority: formData.get("priority") as string,
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage);
  };

  // Fetch agent details to check premium status
  const { data: agentData } = useQuery({
    queryKey: ["agent-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("agents")
        .select("is_premium, rating")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  const isPremiumAgent = agentData?.is_premium || agentData?.rating === 5;

  const handleWhatsApp = () => {
    window.open("https://wa.me/2348035378973?text=Hello%20Raudah%20Travels,%20I%20need%20assistance.", "_blank");
  };

  if (selectedTicket) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTicket(null)}
              className="hover:bg-primary/10 hover:text-primary transition-all group"
            >
              <ChevronRight className="h-4 w-4 mr-1 rotate-180 group-hover:-translate-x-1 transition-transform" />
              Back
            </Button>
            <div>
              <h1 className="font-heading text-xl font-bold">{selectedTicket.subject}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`${statusColors[selectedTicket.status]} font-medium py-0 h-5`}>
                  {selectedTicket.status.replace('_', ' ')}
                </Badge>
                <span className="text-[10px] text-muted-foreground">ID: {selectedTicket.id.slice(0, 8)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={`${priorityColors[selectedTicket.priority]} text-[10px]`}>
              {selectedTicket.priority} Priority
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)] min-h-[500px]">
          <div className="lg:col-span-2 flex flex-col border border-border/50 rounded-2xl bg-card/50 backdrop-blur-xl shadow-2xl shadow-primary/5 overflow-hidden ring-1 ring-white/10">
            <div className="px-6 py-3 border-b border-border/50 bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                <MessageCircle className="h-3.5 w-3.5 text-primary" />
                Live Support Channel
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Connected</span>
              </div>
            </div>

            <ScrollArea className="flex-1 p-6 scroll-smooth" ref={scrollRef}>
              <div className="space-y-8 pb-4">
                <div className="flex justify-center">
                  <div className="bg-muted/50 px-3 py-1.5 rounded-full border border-border/50 backdrop-blur-sm">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                      Ticket opened on {format(new Date(selectedTicket.created_at), "PPP p")}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 max-w-[85%]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      <User className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Original Issue</span>
                  </div>
                  <div className="bg-muted/40 p-5 rounded-2xl rounded-tl-none border border-border/50 backdrop-blur-sm">
                    <p className="text-sm leading-relaxed text-foreground/90">{selectedTicket.description}</p>
                  </div>
                </div>

                {messages?.map((msg, idx) => {
                  const isMe = msg.sender_id === user?.id;
                  const showAvatar = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id;

                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} gap-1 group animate-in slide-in-from-bottom-2 duration-300`}>
                      {!isMe && showAvatar && (
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <div className="h-6 w-6 rounded-full bg-secondary/20 flex items-center justify-center border border-secondary/30 ring-2 ring-white/5">
                            <ShieldCheck className="h-3 w-3 text-secondary" />
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Raudah Support</span>
                        </div>
                      )}

                      <div className={`
                        max-w-[80%] px-5 py-3.5 rounded-2xl shadow-xl transition-all duration-300
                        ${isMe
                          ? "bg-primary text-primary-foreground rounded-tr-none hover:-translate-x-1"
                          : "bg-muted/60 text-foreground border border-border/50 rounded-tl-none hover:translate-x-1"
                        }
                      `}>
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        <div className={`
                          flex items-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300
                          ${isMe ? "justify-end" : "justify-start"}
                        `}>
                          <Clock className="h-2.5 w-2.5 opacity-50" />
                          <p className="text-[9px] font-medium uppercase tracking-tight">
                            {format(new Date(msg.created_at), "p")}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Typing Indicator */}
                <TypingIndicator ticketId={selectedTicket.id} />

                <div id="chat-bottom" />
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border/50 bg-muted/10 backdrop-blur-md">
              <form onSubmit={handleSendMessage} className="relative">
                <Textarea
                  placeholder={selectedTicket.status === 'closed' ? "This ticket is closed." : "Type your message..."}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping(e.target.value.length > 0);
                  }}
                  onBlur={() => handleTyping(false)}
                  className="min-h-[80px] pr-20 bg-card/50 border-border/50 rounded-xl resize-none focus:ring-primary/20 transition-all text-sm leading-relaxed"
                  disabled={selectedTicket.status === 'closed' || sendMessageMutation.isPending}
                />
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    className="gold-gradient text-secondary-foreground shadow-lg shadow-gold/20 h-9 px-4 rounded-lg font-bold transition-all hover:scale-105 active:scale-95"
                    disabled={!newMessage.trim() || selectedTicket.status === 'closed' || sendMessageMutation.isPending}
                  >
                    {sendMessageMutation.isPending ? (
                      <div className="h-4 w-4 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
              </form>
              {selectedTicket.status === 'closed' && (
                <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground bg-muted/20 rounded-lg mt-2 border border-dashed border-border/50">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest">Resolution Finalized</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6 flex flex-col h-full overflow-y-auto pr-1 hidden lg:flex">
            <Card className="border-border/50 shadow-xl shadow-black/5 bg-card/30 backdrop-blur-md overflow-hidden ring-1 ring-white/5">
              <CardHeader className="p-5 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Case Metadata
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[9px] uppercase tracking-widest font-black text-muted-foreground opacity-70">Category</Label>
                    <p className="text-sm font-bold capitalize bg-primary/5 text-primary rounded-md px-2 py-1 w-fit border border-primary/10">{selectedTicket.category}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] uppercase tracking-widest font-black text-muted-foreground opacity-70">Case Status</Label>
                    <div className="mt-1">
                      <Badge variant="outline" className={`${statusColors[selectedTicket.status]} text-[10px] h-6 px-3 rounded-full border-2`}>
                        {selectedTicket.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator className="bg-border/50" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" /> Created on
                    </span>
                    <span className="text-xs font-bold">{format(new Date(selectedTicket.created_at), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-2">
                      <MessageCircle className="h-3.5 w-3.5" /> Message Volume
                    </span>
                    <span className="text-xs font-bold">{messages?.length || 0} communications</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5 border-dashed shadow-inner ring-1 ring-primary/10">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                    <AlertCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Escalation needed?</h3>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase leading-none mt-1">Direct support channel active</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full text-xs h-10 border-primary/30 text-primary hover:bg-primary hover:text-white transition-all font-bold rounded-xl" onClick={handleWhatsApp}>
                  Transfer to WhatsApp Executive
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            Support Center
            {isPremiumAgent && <Badge className="bg-gold text-secondary-foreground">Platinum Status</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your support tickets and get help from our team.</p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gold-gradient text-secondary-foreground shadow-gold">
              <Plus className="h-4 w-4 mr-2" /> Open Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleCreateTicket}>
              <DialogHeader>
                <DialogTitle>Open New Ticket</DialogTitle>
                <DialogDescription>
                  Please provide details about your issue and we'll get back to you as soon as possible.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" name="subject" placeholder="What is this about?" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select name="category" defaultValue="general">
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Inquiry</SelectItem>
                        <SelectItem value="booking">Booking Issue</SelectItem>
                        <SelectItem value="booking_assistance">Pilgrim Booking Assistance</SelectItem>
                        <SelectItem value="visa">Visa Processing</SelectItem>
                        <SelectItem value="flights">Flights & Transport</SelectItem>
                        <SelectItem value="payment">Payment Issue</SelectItem>
                        <SelectItem value="agent_commissions">Agent Commissions</SelectItem>
                        <SelectItem value="documents">Document Problem</SelectItem>
                        <SelectItem value="technical">Technical Support</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select name="priority" defaultValue="medium">
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" placeholder="Describe your issue in detail..." className="min-h-[100px]" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createTicketMutation.isPending}>
                  {createTicketMutation.isPending ? "Submitting..." : "Submit Ticket"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {isPremiumAgent && (
            <div className="mb-6">
              <PlatinumSupportChat />
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-bold">Standard Support Tickets</h2>
          </div>
          {isLoadingTickets ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : tickets?.length === 0 ? (
            <Card className="border-border border-dashed py-12">
              <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-4 rounded-full bg-muted">
                  <MessageCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">No active tickets</h3>
                  <p className="text-sm text-muted-foreground">If you have any issues or questions, open a support ticket above.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {tickets?.map((ticket) => (
                <Card
                  key={ticket.id}
                  className="border-border hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${statusColors[ticket.status].split(' ')[0]}`}>
                        <Clock className="h-5 w-5 opacity-70" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground flex items-center gap-2">
                          {ticket.subject}
                          <Badge variant="outline" className={`${statusColors[ticket.status]} text-[10px] h-5`}>
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                          {(ticket.unread_count_user ?? 0) > 0 && (
                            <Badge variant="destructive" className="h-4 min-w-4 px-1 shrink-0 items-center justify-center rounded-full text-[10px]">
                              {ticket.unread_count_user} New
                            </Badge>
                          )}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="capitalize">{ticket.category}</span>
                          <span className="flex items-center gap-1">
                            <Plus className="h-3 w-3" /> {format(new Date(ticket.created_at), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card className="border-border">
            <CardHeader className="p-5">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" /> Direct Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted transition-colors cursor-pointer" onClick={handleWhatsApp}>
                <div className="p-2 rounded-full bg-primary/10">
                  <MessageCircle className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">WhatsApp</p>
                  <p className="text-[10px] text-muted-foreground">Fastest response time</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <div className="p-2 rounded-full bg-primary/10">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">+234 803 537 8973</p>
                  <p className="text-[10px] text-muted-foreground">Mon - Sat, 9am - 5pm</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <div className="p-2 rounded-full bg-secondary/10">
                  <Mail className="h-4 w-4 text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-medium">flyraudah@gmail.com</p>
                  <p className="text-[10px] text-muted-foreground">Support via email</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, user?.id]);

  if (!isTyping) return null;

  return (
    <div className="flex items-center gap-2 px-1 animate-in fade-in duration-300">
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Support is typing...</span>
    </div>
  );
};

export default DashboardSupport;
