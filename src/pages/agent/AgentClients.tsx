import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgentProfile } from "@/hooks/useAgentProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Trash2 } from "lucide-react";
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
    const { error } = await supabase.from("agent_clients").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete client");
    } else {
      toast.success("Client removed");
      queryClient.invalidateQueries({ queryKey: ["agent-clients"] });
    }
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["agent-clients"] });

  const filtered = clients.filter((c: any) =>
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (agentLoading) return <Skeleton className="h-64" />;

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Clients</h1>
          <p className="text-muted-foreground mt-1">Manage your client roster and book on their behalf</p>
        </div>
        <AddClientDialog agentId={agent.id} onSuccess={refresh} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Directory</CardTitle>
          <CardDescription>{filtered.length} client{filtered.length !== 1 ? "s" : ""} registered</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search clients by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {isLoading ? (
            <Skeleton className="h-40" />
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {clients.length === 0
                ? "No clients registered yet. Use the \"Add Client\" button to get started."
                : "No clients match your search."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Passport</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((client: any) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{client.full_name}</p>
                          {client.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{client.phone}</TableCell>
                      <TableCell>
                        {client.passport_number ? (
                          <Badge variant="outline" className="font-mono text-xs">{client.passport_number}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm capitalize">{client.gender || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <AddClientDialog agentId={agent.id} onSuccess={refresh} editClient={client} />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(client.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentClients;
