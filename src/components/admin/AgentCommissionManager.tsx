import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatPrice } from "@/data/packages";
import { Percent, DollarSign, Package, Save, Loader2, Info } from "lucide-react";

export const AgentCommissionManager = ({
    agentId,
    agent
}: {
    agentId: string,
    agent: any
}) => {
    const queryClient = useQueryClient();

    // Local state for Global Commissions
    const [globalRate, setGlobalRate] = useState<string>(agent?.commission_rate?.toString() || "0");
    const [globalType, setGlobalType] = useState<string>(agent?.commission_type || "percentage");

    // Fetch Packages and Package Overrides
    const { data: packages, isLoading: loadingPackages } = useQuery({
        queryKey: ["all-packages-commissions"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("packages")
                .select(`id, name, type, price, status`)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    const { data: overrides, isLoading: loadingOverrides } = useQuery({
        queryKey: ["agent-package-commissions", agentId],
        queryFn: async () => {
            // Cast cleanly since types.ts wasn't regenerated
            const { data, error } = await supabase
                .from("agent_package_commissions" as any)
                .select("*")
                .eq("agent_id", agentId);
            if (error) throw error;

            const map: Record<string, any> = {};
            (data || []).forEach((row: any) => {
                map[row.package_id] = row;
            });
            return map;
        }
    });

    // Local state for Package overrides editing
    const [editedOverrides, setEditedOverrides] = useState<Record<string, { rate: string, type: string }>>({});

    const updateGlobalMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from("agents")
                .update({
                    commission_rate: parseFloat(globalRate) || 0,
                    commission_type: globalType
                })
                .eq("id", agentId);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Global commission updated");
            queryClient.invalidateQueries({ queryKey: ["admin-agents-list"] });
            queryClient.invalidateQueries({ queryKey: ["admin-agent-details"] });
        },
        onError: (err: any) => toast.error(err.message || "Failed to update global commission")
    });

    const updateOverrideMutation = useMutation({
        mutationFn: async ({ packageId, rate, type }: { packageId: string; rate: string; type: string }) => {
            const numericRate = parseFloat(rate);
            if (isNaN(numericRate) || numericRate < 0) throw new Error("Invalid commission rate input");

            const { data: existing } = await supabase
                .from("agent_package_commissions" as any)
                .select("id")
                .eq("agent_id", agentId)
                .eq("package_id", packageId)
                .maybeSingle();

            if (existing) {
                if (numericRate === 0 && type === agent.commission_type) {
                    // It's effectively removing the override, but let's just let user delete it instead or update to 0
                }
                const { error } = await supabase
                    .from("agent_package_commissions" as any)
                    .update({
                        commission_rate: numericRate,
                        commission_type: type,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("agent_package_commissions" as any)
                    .insert({
                        agent_id: agentId,
                        package_id: packageId,
                        commission_rate: numericRate,
                        commission_type: type
                    });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast.success("Package commission override updated");
            queryClient.invalidateQueries({ queryKey: ["agent-package-commissions", agentId] });
            setEditedOverrides({}); // clear edits locally
        },
        onError: (err: any) => toast.error(err.message || "Failed to update package override")
    });

    const deleteOverrideMutation = useMutation({
        mutationFn: async (packageId: string) => {
            const { error } = await supabase
                .from("agent_package_commissions" as any)
                .delete()
                .eq("agent_id", agentId)
                .eq("package_id", packageId);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Override removed");
            queryClient.invalidateQueries({ queryKey: ["agent-package-commissions", agentId] });
        },
        onError: (err: any) => toast.error(err.message || "Failed to remove override")
    });

    return (
        <div className="space-y-6">
            <Card className="glass-panel-light border-0">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold">Global Commission Settings</CardTitle>
                    <CardDescription>
                        This applies to all packages booked by the agent, unless overridden below.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="space-y-2 flex-1">
                            <Label>Commission Rate</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={globalRate}
                                onChange={(e) => setGlobalRate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2 flex-1">
                            <Label>Commission Type</Label>
                            <Select value={globalType} onValueChange={setGlobalType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            className="gap-2 sm:w-32"
                            onClick={() => updateGlobalMutation.mutate()}
                            disabled={updateGlobalMutation.isPending}
                        >
                            {updateGlobalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Global
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="glass-panel-light border-0">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold flex items-center justify-between">
                        <span>Package-Specific Overrides</span>
                    </CardTitle>
                    <CardDescription>
                        Override the global commission for specific packages.
                        Leave blank if you want the package to inherit the global rate.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="max-h-[500px] overflow-y-auto">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead>Package</TableHead>
                                    <TableHead>Base Price</TableHead>
                                    <TableHead>Override Config</TableHead>
                                    <TableHead>Calculated Discount</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingPackages || loadingOverrides ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : packages?.map(pkg => {
                                    const existingOverride = overrides?.[pkg.id];
                                    const editedState = editedOverrides[pkg.id];

                                    const isEditing = !!editedState;
                                    const currentRate = isEditing ? editedState.rate : (existingOverride?.commission_rate?.toString() || "");
                                    const currentType = isEditing ? editedState.type : (existingOverride?.commission_type || "percentage");

                                    const activeRateNum = parseFloat(isEditing ? editedState.rate : (existingOverride?.commission_rate || globalRate));
                                    const activeTypeVal = isEditing ? editedState.type : (existingOverride?.commission_type || globalType);

                                    let calculatedDiscount = 0;
                                    if (!isNaN(activeRateNum)) {
                                        if (activeTypeVal === "percentage") {
                                            calculatedDiscount = pkg.price * (activeRateNum / 100);
                                        } else {
                                            calculatedDiscount = activeRateNum;
                                        }
                                    }

                                    return (
                                        <TableRow key={pkg.id}>
                                            <TableCell>
                                                <p className="font-semibold text-sm">{pkg.name}</p>
                                                <Badge variant="outline" className="text-[10px] uppercase mt-1">{pkg.type}</Badge>
                                            </TableCell>
                                            <TableCell className="font-medium text-muted-foreground text-sm">
                                                {formatPrice(pkg.price)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        placeholder="Rate"
                                                        className="w-24 h-8 text-sm"
                                                        value={currentRate}
                                                        onChange={(e) => {
                                                            setEditedOverrides(prev => ({
                                                                ...prev,
                                                                [pkg.id]: { rate: e.target.value, type: currentType }
                                                            }));
                                                        }}
                                                    />
                                                    <Select
                                                        value={currentType}
                                                        onValueChange={(val) => {
                                                            setEditedOverrides(prev => ({
                                                                ...prev,
                                                                [pkg.id]: { rate: currentRate, type: val }
                                                            }));
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-28 h-8 text-sm">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="percentage">Percent (%)</SelectItem>
                                                            <SelectItem value="fixed">Fixed</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                        - {formatPrice(calculatedDiscount)}
                                                    </span>
                                                    {!existingOverride && !isEditing && (
                                                        <span className="text-[10px] text-muted-foreground flex items-center mt-1">
                                                            <Info className="h-2 w-2 mr-1" /> Uses global
                                                        </span>
                                                    )}
                                                    {existingOverride && (
                                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center mt-1">
                                                            Has Override
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                {isEditing && (
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        className="h-8"
                                                        onClick={() => updateOverrideMutation.mutate({ packageId: pkg.id, rate: currentRate, type: currentType })}
                                                        disabled={updateOverrideMutation.isPending}
                                                    >
                                                        Save
                                                    </Button>
                                                )}
                                                {!isEditing && existingOverride && (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        className="h-8"
                                                        onClick={() => deleteOverrideMutation.mutate(pkg.id)}
                                                        disabled={deleteOverrideMutation.isPending}
                                                    >
                                                        Remove Override
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
