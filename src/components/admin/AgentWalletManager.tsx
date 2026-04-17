import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Wallet, ArrowUpRight, ArrowDownRight, Plus, History } from "lucide-react";
import { formatPrice } from "@/data/packages";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AgentWalletManagerProps {
    agentId: string;
}

export const AgentWalletManager = ({ agentId }: AgentWalletManagerProps) => {
    const queryClient = useQueryClient();
    const [topUpOpen, setTopUpOpen] = useState(false);
    const [amount, setAmount] = useState("");
    const [reference, setReference] = useState("");
    const [description, setDescription] = useState("");

    const { data: wallet, isLoading: loadingWallet } = useQuery({
        queryKey: ["agent-wallet", agentId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("agent_wallets")
                .select("*")
                .eq("agent_id", agentId)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
        enabled: !!agentId,
    });

    const { data: transactions = [], isLoading: loadingTx } = useQuery({
        queryKey: ["agent-wallet-transactions", agentId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("wallet_transactions")
                .select("*")
                .eq("agent_id", agentId)
                .order("created_at", { ascending: false })
                .limit(20);

            if (error) throw error;
            return data || [];
        },
        enabled: !!agentId,
    });

    const topUpMutation = useMutation({
        mutationFn: async () => {
            const numAmount = Number(amount);
            if (isNaN(numAmount) || numAmount <= 0) {
                throw new Error("Invalid amount");
            }

            // Start transaction logic
            // Note: In Supabase, usually we perform this via an RPC. 
            // Since we don't know if an RPC exists, we'll try to do it client-side.
            // 1. Check if wallet exists
            const { data: currentWallet } = await supabase
                .from("agent_wallets")
                .select("id, balance")
                .eq("agent_id", agentId)
                .maybeSingle();

            if (!currentWallet) {
                // Create wallet
                await supabase.from("agent_wallets").insert({
                    agent_id: agentId,
                    balance: numAmount
                });
            } else {
                // Update wallet
                await supabase.from("agent_wallets")
                    .update({ balance: Number(currentWallet.balance) + numAmount, updated_at: new Date().toISOString() })
                    .eq("id", currentWallet.id);
            }

            // Add transaction
            await supabase.from("wallet_transactions").insert({
                agent_id: agentId,
                amount: numAmount,
                type: "credit",
                reference: reference || null,
                description: description || "Manual Top-up by Admin"
            });
        },
        onSuccess: () => {
            toast.success("Wallet topped up successfully");
            setTopUpOpen(false);
            setAmount("");
            setReference("");
            setDescription("");
            queryClient.invalidateQueries({ queryKey: ["agent-wallet", agentId] });
            queryClient.invalidateQueries({ queryKey: ["agent-wallet-transactions", agentId] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to top up wallet");
        }
    });

    const handleTopUp = (e: React.FormEvent) => {
        e.preventDefault();
        topUpMutation.mutate();
    };

    return (
        <div className="space-y-4 p-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <Card className="flex-1 glass-panel border-white/20 bg-gradient-to-br from-emerald-500/10 to-transparent">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Wallet className="h-4 w-4" /> Current Balance
                                </p>
                                <div className="mt-2">
                                    {loadingWallet ? (
                                        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
                                    ) : (
                                        <h3 className="text-3xl font-heading font-bold text-foreground">
                                            {formatPrice(wallet?.balance || 0)}
                                        </h3>
                                    )}
                                </div>
                            </div>
                            <Button
                                onClick={() => setTopUpOpen(true)}
                                className="gap-2 shadow-sm relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                                <Plus className="h-4 w-4" /> Top-up Wallet
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="glass-panel border-white/20 overflow-hidden shadow-sm">
                <CardHeader className="bg-muted/10 pb-4 border-b">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <History className="h-4 w-4 text-primary" />
                        Transaction History
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="flex flex-col">
                        {loadingTx ? (
                            <div className="p-10 flex justify-center">
                                <div className="w-5 h-5 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="p-10 text-center text-sm text-muted-foreground">
                                No transactions found
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50 max-h-[300px] overflow-y-auto">
                                {transactions.map((tx: any) => (
                                    <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                                                {tx.type === 'credit' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{tx.description || (tx.type === 'credit' ? 'Top-up' : 'Deduction')}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {format(new Date(tx.created_at), "MMM d, yyyy • h:mm a")}
                                                    {tx.reference && ` • Ref: ${tx.reference}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold font-heading ${tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {tx.type === 'credit' ? '+' : '-'}{formatPrice(tx.amount)}
                                            </p>
                                            <Badge variant="outline" className={`mt-1 text-[10px] uppercase ${tx.type === 'credit' ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
                                                {tx.type}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Top-up Agent Wallet</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleTopUp} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Amount (₦)</label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Reference (Optional)</label>
                            <Input
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder="Bank receipt, transaction ID..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="e.g. Bank Transfer Deposit"
                            />
                        </div>
                        <div className="pt-2 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setTopUpOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={topUpMutation.isPending || !amount}>
                                {topUpMutation.isPending ? "Processing..." : "Top-up Wallet"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
