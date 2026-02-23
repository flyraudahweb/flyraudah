import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, Briefcase, Plus, UserPlus, Eye, EyeOff, Copy, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";

// ─── helpers ─────────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

// ─── ApproveDialog ─────────────────────────────────────────────────────────
// Used for: Approve pending application + Create Account for approved-but-no-user_id

interface ApproveDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  isPending: boolean;
  title: string;
  description: string;
}

const ApproveDialog = ({
  open, onClose, onConfirm, isPending, title, description,
}: ApproveDialogProps) => {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const valid = password.trim().length >= 8;

  const handleConfirm = () => {
    if (!valid) return;
    onConfirm(password.trim());
    setPassword("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setPassword(""); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label htmlFor="temp-password">Temporary Password</Label>
          <div className="relative">
            <Input
              id="temp-password"
              type={showPw ? "text" : "password"}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowPw((v) => !v)}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            The agent will use this to log in for the first time. Ask them to change it immediately.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={!valid || isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isPending ? "Creating…" : "Create Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── CreateAgentDialog ────────────────────────────────────────────────────
// Direct creation — no application required

interface CreateAgentDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    full_name: string;
    business_name: string;
    email: string;
    phone: string;
    temp_password: string;
    commission_rate: number;
    commission_type: "percentage" | "fixed";
  }) => void;
  isPending: boolean;
}

const CreateAgentDialog = ({ open, onClose, onConfirm, isPending }: CreateAgentDialogProps) => {
  const [form, setForm] = useState({
    full_name: "", business_name: "", email: "", phone: "",
    temp_password: "", commission_rate: "0", commission_type: "percentage" as "percentage" | "fixed",
  });
  const [showPw, setShowPw] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const valid =
    form.full_name.trim() &&
    form.business_name.trim() &&
    form.email.trim() &&
    form.phone.trim() &&
    form.temp_password.trim().length >= 8;

  const handleConfirm = () => {
    if (!valid) return;
    onConfirm({
      full_name: form.full_name.trim(),
      business_name: form.business_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      temp_password: form.temp_password.trim(),
      commission_rate: parseFloat(form.commission_rate) || 0,
      commission_type: form.commission_type,
    });
  };

  const handleClose = () => {
    setForm({ full_name: "", business_name: "", email: "", phone: "", temp_password: "", commission_rate: "0", commission_type: "percentage" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-secondary" />
            Create Agent Account
          </DialogTitle>
          <DialogDescription>
            Create a new agent account directly — no application required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input placeholder="John Doe" value={form.full_name} onChange={set("full_name")} />
            </div>
            <div className="space-y-1.5">
              <Label>Business Name *</Label>
              <Input placeholder="Doe Travel Agency" value={form.business_name} onChange={set("business_name")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" placeholder="agent@example.com" value={form.email} onChange={set("email")} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone *</Label>
              <Input placeholder="+234 000 000 0000" value={form.phone} onChange={set("phone")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Temporary Password *</Label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={form.temp_password}
                onChange={set("temp_password")}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPw((v) => !v)}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Commission Type</Label>
            <div className="flex rounded-md border overflow-hidden">
              {(["percentage", "fixed"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, commission_type: t }))}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${form.commission_type === t
                    ? "bg-secondary text-white"
                    : "text-muted-foreground hover:bg-muted"
                    }`}
                >
                  {t === "percentage" ? "% Rate" : "₦ Fixed"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>
              {form.commission_type === "percentage" ? "Commission Rate (%)" : "Fixed Commission (₦)"}
            </Label>
            <Input
              type="number"
              min="0"
              step={form.commission_type === "percentage" ? "0.5" : "1000"}
              placeholder={form.commission_type === "percentage" ? "e.g. 5" : "e.g. 60000"}
              value={form.commission_rate}
              onChange={set("commission_rate")}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            The agent will log in with these credentials. Remind them to update their password immediately.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={!valid || isPending}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            {isPending ? "Creating…" : "Create Agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── EditAgentDialog ──────────────────────────────────────────────────────

interface EditAgentDialogProps {
  open: boolean;
  agent: any;
  onClose: () => void;
  onConfirm: (data: {
    business_name: string;
    contact_person: string;
    email: string;
    phone: string;
    commission_rate: number;
    commission_type: "percentage" | "fixed";
    status: string;
  }) => void;
  isPending: boolean;
}

const EditAgentDialog = ({ open, agent, onClose, onConfirm, isPending }: EditAgentDialogProps) => {
  const [form, setForm] = useState({
    business_name: agent?.business_name || "",
    contact_person: agent?.contact_person || "",
    email: agent?.email || "",
    phone: agent?.phone || "",
    commission_rate: String(agent?.commission_rate ?? "0"),
    commission_type: (agent?.commission_type ?? "percentage") as "percentage" | "fixed",
    status: agent?.status || "active",
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const valid = form.business_name.trim() && form.email.trim();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-secondary" />
            Edit Agent
          </DialogTitle>
          <DialogDescription>
            Update agent details and commission settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Business Name *</Label>
              <Input value={form.business_name} onChange={set("business_name")} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Person</Label>
              <Input value={form.contact_person} onChange={set("contact_person")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={set("email")} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={set("phone")} />
            </div>
          </div>

          {/* Commission type toggle */}
          <div className="space-y-1.5">
            <Label>Commission Type</Label>
            <div className="flex rounded-md border overflow-hidden">
              {(["percentage", "fixed"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, commission_type: t }))}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${form.commission_type === t
                    ? "bg-secondary text-white"
                    : "text-muted-foreground hover:bg-muted"
                    }`}
                >
                  {t === "percentage" ? "% Rate" : "₦ Fixed"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                {form.commission_type === "percentage" ? "Commission Rate (%)" : "Fixed Commission (₦)"}
              </Label>
              <Input
                type="number"
                min="0"
                step={form.commission_type === "percentage" ? "0.5" : "1000"}
                placeholder={form.commission_type === "percentage" ? "e.g. 5" : "e.g. 60000"}
                value={form.commission_rate}
                onChange={set("commission_rate")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={set("status")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (!valid) return;
              onConfirm({
                business_name: form.business_name.trim(),
                contact_person: form.contact_person.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                commission_rate: parseFloat(form.commission_rate) || 0,
                commission_type: form.commission_type,
                status: form.status,
              });
            }}
            disabled={!valid || isPending}
            className="gap-2"
          >
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};




// ─── Main page ────────────────────────────────────────────────────────────────

const AdminAgentApplications = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("pending");

  // Dialog state
  const [approveTarget, setApproveTarget] = useState<any>(null);
  const [createAccountTarget, setCreateAccountTarget] = useState<any>(null);
  const [showCreateDirect, setShowCreateDirect] = useState(false);
  const [creationSuccess, setCreationSuccess] = useState<any>(null);
  const [editTarget, setEditTarget] = useState<any>(null);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: applications = [], isLoading: loadingApps } = useQuery({
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

  const { data: activeAgents = [], isLoading: loadingAgents } = useQuery({
    queryKey: ["active-agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // ── Mutations ────────────────────────────────────────────────────────────

  /** Approve pending application / create account for approved-no-user_id */
  const approveMutation = useMutation({
    mutationFn: async ({ app, password }: { app: any; password: string }) => {
      const res = await supabase.functions.invoke("approve-agent-application", {
        body: { application_id: app.id, temp_password: password },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Agent account created ✓",
        description: `Agent code: ${data?.agent_code ?? "—"}. Share credentials with the agent.`,
      });
      setApproveTarget(null);
      setCreateAccountTarget(null);
      queryClient.invalidateQueries({ queryKey: ["agent-applications"] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  /** Reject a pending application */
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

  /** Create agent directly — no application */
  const createDirectMutation = useMutation({
    mutationFn: async (payload: {
      full_name: string; business_name: string; email: string;
      phone: string; temp_password: string; commission_rate: number;
      commission_type: "percentage" | "fixed";
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      const res = await supabase.functions.invoke("create-agent-direct", {
        body: payload,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data, variables) => {
      setCreationSuccess({
        ...data,
        email: variables.email,
        temp_password: variables.temp_password
      });
      setShowCreateDirect(false);
      queryClient.invalidateQueries({ queryKey: ["agent-applications"] });
      queryClient.invalidateQueries({ queryKey: ["active-agents"] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Agent record removed" });
      queryClient.invalidateQueries({ queryKey: ["active-agents"] });
    },
  });

  const updateAgentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from("agents").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Agent updated successfully" });
      setEditTarget(null);
      queryClient.invalidateQueries({ queryKey: ["active-agents"] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  // ── Derived state ────────────────────────────────────────────────────────

  const filtered = applications.filter((a: any) => tab === "all" || a.status === tab);

  const counts = {
    pending: applications.filter((a: any) => a.status === "pending").length,
    approved: applications.filter((a: any) => a.status === "approved").length,
    rejected: applications.filter((a: any) => a.status === "rejected").length,
    all: applications.length,
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Agent Applications</h1>
          <p className="text-muted-foreground">Review partnership requests or create agent accounts directly.</p>
        </div>
        <Button onClick={() => setShowCreateDirect(true)} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Create Agent
        </Button>
      </div>

      {/* Stat cards */}
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

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="approved">Applications</TabsTrigger>
          <TabsTrigger value="active">Active Agents ({activeAgents.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Verified Agents</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAgents ? (
                <p className="text-center text-muted-foreground py-8">Loading agents...</p>
              ) : activeAgents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No active agents yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Business / Contact</TableHead>
                        <TableHead>Email / Phone</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeAgents.map((agent: any) => (
                        <TableRow key={agent.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-bold text-secondary">
                                {agent.agent_code}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  navigator.clipboard.writeText(agent.agent_code);
                                  toast({ title: "Code copied" });
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">{agent.business_name}</span>
                              <span className="text-xs text-muted-foreground">{agent.contact_person}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs">
                              <span>{agent.email}</span>
                              <span className="text-muted-foreground">{agent.phone}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {(agent as any).commission_type === "fixed"
                                ? `₦${Number(agent.commission_rate).toLocaleString()}`
                                : `${agent.commission_rate}%`}
                            </Badge>

                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800 border-green-200 capitalize">
                              {agent.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground"
                                onClick={() => setEditTarget(agent)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm("Delete this agent record? This does not delete their user account.")) {
                                    deleteAgentMutation.mutate(agent.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
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
        </TabsContent>

        <TabsContent value={tab}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {tab === "pending" ? "Pending Requests" : "Application History"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingApps ? (
                <p className="text-center text-muted-foreground py-8">Loading…</p>
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
                            <div className="flex gap-2 flex-wrap">
                              {/* Pending → Approve + Reject */}
                              {app.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => setApproveTarget(app)}
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
                                </>
                              )}

                              {/* Approved but no account created yet → Create Account */}
                              {app.status === "approved" && !app.user_id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setCreateAccountTarget(app)}
                                  className="gap-1 border-green-600 text-green-700 hover:bg-green-50"
                                >
                                  <UserPlus className="h-3.5 w-3.5" />
                                  Create Account
                                </Button>
                              )}

                              {/* Approved with account → show agent code badge */}
                              {app.status === "approved" && app.user_id && (
                                <Badge variant="secondary" className="text-xs font-mono">
                                  Account active
                                </Badge>
                              )}
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
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}

      {/* Approve pending application */}
      <ApproveDialog
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={(pw) => approveMutation.mutate({ app: approveTarget, password: pw })}
        isPending={approveMutation.isPending}
        title={`Approve: ${approveTarget?.business_name ?? ""}`}
        description="Set a temporary password for the agent's login. They should change it on first sign-in."
      />

      {/* Create account for approved applications without user_id */}
      <ApproveDialog
        open={!!createAccountTarget}
        onClose={() => setCreateAccountTarget(null)}
        onConfirm={(pw) => approveMutation.mutate({ app: createAccountTarget, password: pw })}
        isPending={approveMutation.isPending}
        title={`Create Account: ${createAccountTarget?.business_name ?? ""}`}
        description="This application is approved but has no account yet. Set a temporary password to create the agent login."
      />

      {/* Edit agent */}
      {editTarget && (
        <EditAgentDialog
          open={!!editTarget}
          agent={editTarget}
          onClose={() => setEditTarget(null)}
          onConfirm={(data) => updateAgentMutation.mutate({ id: editTarget.id, data })}
          isPending={updateAgentMutation.isPending}
        />
      )}

      {/* Direct creation — no application */}
      <CreateAgentDialog
        open={showCreateDirect}
        onClose={() => setShowCreateDirect(false)}
        onConfirm={(data) => createDirectMutation.mutate(data)}
        isPending={createDirectMutation.isPending}
      />

      {/* Success Summary Dialog */}
      <Dialog open={!!creationSuccess} onOpenChange={(v) => { if (!v) setCreationSuccess(null); }}>
        <DialogContent className="sm:max-w-md border-secondary/20 bg-secondary/5 backdrop-blur-sm">
          <DialogHeader>
            <div className="mx-auto bg-green-100 p-3 rounded-full mb-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl">Agent Account Created!</DialogTitle>
            <DialogDescription className="text-center">
              Agent record for <strong>{creationSuccess?.full_name}</strong> is now active.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 bg-background border rounded-lg group">
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Agent Code</p>
                  <p className="font-mono text-lg font-bold text-secondary uppercase italic">{creationSuccess?.agent_code}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(creationSuccess?.agent_code);
                    toast({ title: "Agent Code copied" });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-3 bg-background border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Login Email</p>
                    <p className="text-sm font-medium">{creationSuccess?.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      navigator.clipboard.writeText(creationSuccess?.email);
                      toast({ title: "Email copied" });
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center justify-between border-t border-dashed pt-2">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Temporary Password</p>
                    <p className="text-sm font-mono font-bold text-primary">{creationSuccess?.temp_password}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      navigator.clipboard.writeText(creationSuccess?.temp_password);
                      toast({ title: "Password copied" });
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex items-start gap-3">
              <Clock className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 leading-relaxed">
                <strong>Attention:</strong> Share these credentials securely. The agent will be required to change their password upon first login.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={() => setCreationSuccess(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAgentApplications;
