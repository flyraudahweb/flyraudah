import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, Briefcase } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

const AdminAgentApplications = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("pending");

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["agent-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_applications" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (app: any) => {
      const res = await supabase.functions.invoke("approve-agent-application", {
        body: { application_id: app.id },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      toast({ title: "Application approved", description: "Agent account created successfully." });
      queryClient.invalidateQueries({ queryKey: ["agent-applications"] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("agent_applications" as any)
        .update({ status: "rejected", reviewed_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Application rejected" });
      queryClient.invalidateQueries({ queryKey: ["agent-applications"] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const filtered = applications.filter((a: any) => tab === "all" || a.status === tab);

  const counts = {
    pending: applications.filter((a: any) => a.status === "pending").length,
    approved: applications.filter((a: any) => a.status === "approved").length,
    rejected: applications.filter((a: any) => a.status === "rejected").length,
    all: applications.length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Agent Applications</h1>
        <p className="text-muted-foreground">Review and manage agent partnership requests.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pending", count: counts.pending, icon: Clock, color: "text-yellow-600" },
          { label: "Approved", count: counts.approved, icon: CheckCircle, color: "text-green-600" },
          { label: "Rejected", count: counts.rejected, icon: XCircle, color: "text-red-500" },
          { label: "Total", count: counts.all, icon: Briefcase, color: "text-secondary" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.count}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Applications</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No applications found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((app: any) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.business_name}</TableCell>
                          <TableCell>{app.contact_person}</TableCell>
                          <TableCell className="text-sm">{app.email}</TableCell>
                          <TableCell className="text-sm">{app.phone}</TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(app.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColors[app.status]}>
                              {app.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {app.status === "pending" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => approveMutation.mutate(app)}
                                  disabled={approveMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => rejectMutation.mutate(app.id)}
                                  disabled={rejectMutation.isPending}
                                  className="border-destructive text-destructive hover:bg-destructive/10"
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAgentApplications;
