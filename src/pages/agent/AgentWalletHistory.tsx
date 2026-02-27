import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, ArrowDownRight, ArrowUpRight, Clock, Receipt } from "lucide-react";
import { formatPrice } from "@/data/packages";

const AgentWalletHistory = () => {
    const { user } = useAuth();

    // Agent profile
    const { data: agent, isLoading: loadingAgent } = useQuery({
        queryKey: ["agent-profile", user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from("agents")
                .select("id")
                .eq("user_id", user!.id)
                .maybeSingle();
            return data;
        },
        enabled: !!user,
    });

    // Wallet balance
    const { data: walletData } = useQuery({
        queryKey: ["agent-wallet", agent?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from("agent_wallets" as any)
                .select("balance")
                .eq("agent_id", agent!.id)
                .maybeSingle();
            return data || { balance: 0 };
        },
        enabled: !!agent?.id,
    });

    // Transactions
    const { data: transactions = [], isLoading: loadingTx } = useQuery({
        queryKey: ["agent-wallet-transactions", agent?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from("wallet_transactions" as any)
                .select("*")
                .eq("agent_id", agent!.id)
                .order("created_at", { ascending: false });
            return data || [];
        },
        enabled: !!agent?.id,
    });

    const isLoading = loadingAgent || loadingTx;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-heading text-2xl font-bold text-foreground">Wallet History</h1>
                <p className="text-sm text-muted-foreground mt-1">Track your wallet deposits and deductions</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1 border-primary/20 bg-primary/5">
                    <CardContent className="p-6">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                            <Wallet className="h-6 w-6 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Current Balance</p>
                        <h2 className="text-3xl font-heading font-bold text-foreground mt-1">
                            {formatPrice(Number((walletData as any)?.balance || 0))}
                        </h2>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 border-border/60">
                    <CardHeader className="pb-3 border-b border-border/40">
                        <CardTitle className="font-heading text-base font-semibold flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            Transaction History
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="p-4 space-y-4">
                                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground">
                                <Clock className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                <p>No wallet transactions found.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/40">
                                {(transactions as any[]).map(tx => (
                                    <div key={tx.id} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'deposit' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                                                }`}>
                                                {tx.type === 'deposit' ? (
                                                    <ArrowDownRight className="h-5 w-5 text-emerald-600" />
                                                ) : (
                                                    <ArrowUpRight className="h-5 w-5 text-red-600" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-foreground capitalize">
                                                    {tx.type === 'deposit' ? 'Wallet Top-up' : 'Booking Deduction'}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {new Date(tx.created_at).toLocaleString()} • Ref: {tx.reference || 'N/A'}
                                                </p>
                                                {tx.description && <p className="text-xs text-muted-foreground/80 mt-0.5">{tx.description}</p>}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-semibold text-base font-heading ${tx.type === 'deposit' ? 'text-emerald-600' : 'text-foreground'
                                                }`}>
                                                {tx.type === 'deposit' ? '+' : '-'}{formatPrice(Number(tx.amount))}
                                            </p>
                                            <Badge variant="outline" className={`mt-1 text-[10px] px-1.5 py-0 ${tx.type === 'deposit' ? 'bg-emerald-500/5 text-emerald-600 border-emerald-200' : 'bg-muted text-muted-foreground'
                                                }`}>
                                                {tx.type}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AgentWalletHistory;
