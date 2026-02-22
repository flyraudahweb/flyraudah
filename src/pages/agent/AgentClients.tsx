import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgentProfile } from "@/hooks/useAgentProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertCircle, Trash2, Search, Users, UserPlus, Mail, Phone,
  BookOpen, Shield, User
} from "lucide-react";
import { toast } from "sonner";
import AddClientDialog from "@/components/agent/AddClientDialog";

const AgentClients = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { data: agent, isLoading: agentLoading } = useAgentProfile();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["agent-clients", agent?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_clients")
        .select("*")
        .eq("agent_id", agent!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!agent?.id,
  });

  const handleDelete = async (id: string) => {
    const { data: verifiedClient } = await supabase
      .from("agent_clients")
      .select("id")
      .eq("id", id)
      .eq("agent_id", agent!.id)
      .maybeSingle();

    if (!verifiedClient) {
      toast.error("Client not found or unauthorized");
      return;
    }

    const { error } = await supabase.from("agent_clients").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete client");
    } else {
      toast.success("Client removed");
      queryClient.invalidateQueries({ queryKey: ["agent-clients"] });
    }
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["agent-clients"] });

  const filtered = clients.filter(
    (c: any) =>
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const withPassport = clients.filter((c: any) => c.passport_number).length;
  const maleCount = clients.filter((c: any) => c.gender === "male").length;
  const femaleCount = clients.filter((c: any) => c.gender === "female").length;

  if (agentLoading) return <Skeleton className="h-64 rounded-2xl" />;

  if (!agent) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Agent profile not found. Contact an administrator.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">My Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your client roster and book on their behalf
          </p>
        </div>
        <AddClientDialog agentId={agent.id} onSuccess={refresh} />
      </div>

      {/* Stats */}
      {!isLoading && clients.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Clients", value: clients.length, icon: Users, color: "text-primary", bg: "bg-primary/10" },
            { label: "With Passport", value: withPassport, icon: Shield, color: "text-emerald-600", bg: "bg-emerald-500/10" },
            { label: "Male", value: maleCount, icon: User, color: "text-sky-600", bg: "bg-sky-500/10" },
            { label: "Female", value: femaleCount, icon: User, color: "text-pink-600", bg: "bg-pink-500/10" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl ${s.bg} px-3 py-2.5 flex items-center gap-2.5`}>
              <s.icon className={`h-4 w-4 ${s.color} shrink-0`} />
              <div>
                <p className={`text-base font-heading font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Client Cards */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60 bg-background/50">
          <CardContent className="py-14 text-center flex flex-col items-center">
            <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mb-3">
              <Users className="h-7 w-7 text-primary/40" />
            </div>
            <p className="font-medium text-sm">
              {clients.length === 0 ? "No clients yet" : "No clients match your search"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              {clients.length === 0
                ? "Add your first client to get started"
                : "Try a different search term"}
            </p>
            {clients.length === 0 && (
              <AddClientDialog agentId={agent.id} onSuccess={refresh} />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((client: any) => {
            const initials = client.full_name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <Card key={client.id} className="border-border/60 bg-background/50 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <Avatar className="h-10 w-10 border border-border shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-heading font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{client.full_name}</p>
                        {client.gender && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0 border capitalize ${client.gender === "male"
                                ? "bg-sky-500/10 text-sky-600 border-sky-500/20"
                                : "bg-pink-500/10 text-pink-600 border-pink-500/20"
                              }`}
                          >
                            {client.gender}
                          </Badge>
                        )}
                        {client.passport_number && (
                          <Badge variant="outline" className="text-[10px] px-2 py-0 font-mono text-muted-foreground hidden sm:flex">
                            {client.passport_number}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        {client.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {client.phone}
                          </span>
                        )}
                        {client.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {client.email}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <AddClientDialog agentId={agent.id} onSuccess={refresh} editClient={client} />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(client.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AgentClients;
