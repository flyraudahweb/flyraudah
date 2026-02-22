import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Power, PowerOff, Building2 } from "lucide-react";
import { toast } from "sonner";

const AdminBankAccounts = () => {
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<any>(null);

    const { data: accounts = [], isLoading } = useQuery({
        queryKey: ["admin-bank-accounts"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bank_accounts" as any)
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    const upsertMutation = useMutation({
        mutationFn: async (values: any) => {
            const { data, error } = await supabase
                .from("bank_accounts" as any)
                .upsert({
                    id: values.id || undefined,
                    bank_name: values.bankName,
                    account_name: values.accountName,
                    account_number: values.accountNumber,
                    sort_code: values.sortCode || null,
                });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-bank-accounts"] });
            toast.success(editingAccount ? "Account updated" : "Account added");
            setIsAddOpen(false);
            setEditingAccount(null);
        },
        onError: (err: any) => toast.error(err.message),
    });

    const toggleMutation = useMutation({
        mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
            const { error } = await supabase
                .from("bank_accounts" as any)
                .update({ is_active: !is_active })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-bank-accounts"] });
            toast.success("Status updated");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("bank_accounts" as any)
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-bank-accounts"] });
            toast.success("Account deleted");
        },
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const values = {
            id: editingAccount?.id,
            bankName: formData.get("bankName"),
            accountName: formData.get("accountName"),
            accountNumber: formData.get("accountNumber"),
            sortCode: formData.get("sortCode"),
        };
        upsertMutation.mutate(values);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-foreground">Bank Accounts</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage accounts shown to pilgrims for bank transfers</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) setEditingAccount(null); }}>
                    <DialogTrigger asChild>
                        <Button className="gold-gradient text-secondary-foreground shadow-gold">
                            <Plus className="h-4 w-4 mr-2" /> Add Account
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingAccount ? "Edit Account" : "Add Bank Account"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="bankName">Bank Name</Label>
                                <Input id="bankName" name="bankName" defaultValue={editingAccount?.bank_name} placeholder="e.g. Wema Bank" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="accountName">Account Name</Label>
                                <Input id="accountName" name="accountName" defaultValue={editingAccount?.account_name} placeholder="e.g. Raudah Travels Ltd" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="accountNumber">Account Number</Label>
                                <Input id="accountNumber" name="accountNumber" defaultValue={editingAccount?.account_number} placeholder="10-digit number" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sortCode">Sort Code (Optional)</Label>
                                <Input id="sortCode" name="sortCode" defaultValue={editingAccount?.sort_code} placeholder="6-digit code" />
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={upsertMutation.isPending} className="gold-gradient text-secondary-foreground">
                                    {upsertMutation.isPending ? "Saving..." : editingAccount ? "Update" : "Add Account"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Bank</TableHead>
                                <TableHead>Account Name</TableHead>
                                <TableHead>Account Number</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                            ) : accounts.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No bank accounts found</TableCell></TableRow>
                            ) : (
                                accounts.map((acct: any) => (
                                    <TableRow key={acct.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-secondary" />
                                                {acct.bank_name}
                                            </div>
                                        </TableCell>
                                        <TableCell>{acct.account_name}</TableCell>
                                        <TableCell className="font-mono">{acct.account_number}</TableCell>
                                        <TableCell>
                                            <Badge variant={acct.is_active ? "default" : "secondary"} className={acct.is_active ? "bg-primary/20 text-primary border-primary/20" : ""}>
                                                {acct.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => { setEditingAccount(acct); setIsAddOpen(true); }} title="Edit">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => toggleMutation.mutate({ id: acct.id, is_active: acct.is_active })} title={acct.is_active ? "Deactivate" : "Activate"}>
                                                    {acct.is_active ? <PowerOff className="h-4 w-4 text-amber-600" /> : <Power className="h-4 w-4 text-secondary" />}
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => { if (confirm("Are you sure?")) deleteMutation.mutate(acct.id); }} title="Delete" className="text-destructive hover:text-destructive">
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
        </div>
    );
};

export default AdminBankAccounts;
