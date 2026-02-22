import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Archive, Eye, Info, AlertCircle, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatPrice } from "@/data/packages";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type PackageRow = Database["public"]["Tables"]["packages"]["Row"];
type PackageInsert = Database["public"]["Tables"]["packages"]["Insert"];

const emptyForm: Partial<PackageInsert> = {
  name: "",
  type: "umrah",
  category: "standard",
  year: 2026,
  price: 0,
  currency: "NGN",
  capacity: 0,
  available: 0,
  duration: "",
  description: "",
  inclusions: [],
  airlines: [],
  departure_cities: [],
  status: "draft",
  featured: false,
  deposit_allowed: false,
  agent_discount: 0,
};

const AdminPackages = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<PackageInsert>>(emptyForm);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["admin-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PackageRow[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (pkg: Partial<PackageInsert> & { id?: string }) => {
      if (pkg.id) {
        const { error } = await supabase.from("packages").update(pkg).eq("id", pkg.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("packages").insert(pkg as PackageInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: editingId ? "Package updated" : "Package created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PackageRow["status"] }) => {
      const { error } = await supabase.from("packages").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
      toast({ title: variables.status === "archived" ? "Package archived" : "Package restored" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openEdit = (pkg: PackageRow) => {
    setEditingId(pkg.id);
    setForm({
      name: pkg.name,
      type: pkg.type,
      category: pkg.category,
      year: pkg.year,
      price: pkg.price,
      currency: pkg.currency,
      capacity: pkg.capacity,
      available: pkg.available,
      duration: pkg.duration || "",
      description: pkg.description || "",
      inclusions: pkg.inclusions || [],
      airlines: pkg.airlines || [],
      departure_cities: pkg.departure_cities || [],
      status: pkg.status,
      featured: pkg.featured,
      deposit_allowed: pkg.deposit_allowed,
      minimum_deposit: pkg.minimum_deposit,
      agent_discount: pkg.agent_discount,
    });
    setOpen(true);
  };

  const handleSave = () => {
    const payload = editingId ? { ...form, id: editingId } : form;
    upsert.mutate(payload as any);
  };

  const statusColors: Record<string, string> = {
    active: "bg-primary/10 text-primary",
    draft: "bg-secondary/10 text-secondary",
    archived: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Package Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage travel packages</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button className="gold-gradient text-secondary-foreground font-semibold">
              <Plus className="h-4 w-4 mr-2" />
              New Package
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Package" : "Create Package"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input type="number" value={form.year || 2026} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type || "umrah"} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hajj">Hajj</SelectItem>
                      <SelectItem value="umrah">Umrah</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category || "standard"} onValueChange={(v) => setForm({ ...form, category: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="budget">Budget</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status || "draft"} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Price (NGN)</Label>
                  <Input type="number" value={form.price || 0} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Capacity
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent>Total number of seats available for this package</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input type="number" min={0} value={form.capacity || 0} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Available
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent>Remaining spots. Managed automatically by bookings, but can be manually adjusted.</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input type="number" min={0} value={form.available || 0} onChange={(e) => setForm({ ...form, available: Number(e.target.value) })} />
                </div>
              </div>

              <Alert className="bg-primary/5 border-primary/20 py-2">
                <Info className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs text-primary/80">
                  <strong>Inventory Note:</strong> Available spots are automatically decremented when a pilgrim books and incremented if a booking is cancelled.
                </AlertDescription>
              </Alert>

              {(form.available || 0) > (form.capacity || 0) && (
                <p className="text-xs text-destructive font-medium flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Available spots should not exceed total capacity.
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input value={form.duration || ""} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 14 days" />
                </div>
                <div className="space-y-2">
                  <Label>Season</Label>
                  <Input value={(form as any).season || ""} onChange={(e) => setForm({ ...form, season: e.target.value } as any)} placeholder="e.g. ramadan" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Inclusions (comma-separated)</Label>
                <Textarea
                  value={(form.inclusions || []).join(", ")}
                  onChange={(e) => setForm({ ...form, inclusions: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Airlines (comma-separated)</Label>
                  <Input
                    value={(form.airlines || []).join(", ")}
                    onChange={(e) => setForm({ ...form, airlines: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Departure Cities (comma-separated)</Label>
                  <Input
                    value={(form.departure_cities || []).join(", ")}
                    onChange={(e) => setForm({ ...form, departure_cities: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Agent Discount (NGN)</Label>
                  <Input type="number" value={form.agent_discount || 0} onChange={(e) => setForm({ ...form, agent_discount: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Minimum Deposit (NGN)</Label>
                  <Input type="number" value={form.minimum_deposit || 0} onChange={(e) => setForm({ ...form, minimum_deposit: Number(e.target.value) })} />
                </div>
              </div>
              <Button onClick={handleSave} disabled={upsert.isPending} className="gold-gradient text-secondary-foreground font-semibold">
                {upsert.isPending ? "Saving..." : editingId ? "Update Package" : "Create Package"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <Card className="border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">{pkg.name}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{pkg.type}</Badge></TableCell>
                    <TableCell className="capitalize">{pkg.category}</TableCell>
                    <TableCell>{formatPrice(pkg.price)}</TableCell>
                    <TableCell>{pkg.available}/{pkg.capacity}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[pkg.status] || ""}`}>{pkg.status}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(pkg)}><Edit className="h-4 w-4" /></Button>
                        {pkg.status !== "archived" ? (
                          <Button variant="ghost" size="icon" onClick={() => statusMutation.mutate({ id: pkg.id, status: "archived" })} title="Archive">
                            <Archive className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => statusMutation.mutate({ id: pkg.id, status: "draft" })} title="Restore">
                            <RotateCcw className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {packages.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No packages found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminPackages;
