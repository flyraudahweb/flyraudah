import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Wallet, ShieldCheck, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface WalletTopUpModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    agentId: string;
    agentName: string;
}

export const WalletTopUpModal = ({ open, onOpenChange, agentId, agentName }: WalletTopUpModalProps) => {
    const [amount, setAmount] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const queryClient = useQueryClient();

    const handleRequestOtp = async () => {
        if (!amount || Number(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("admin-topup-wallet", {
                body: { agent_id: agentId, amount: Number(amount) },
            });

            if (error) throw new Error(error.message);

            toast.success("Verification code sent to your email");
            setStep(2);
        } catch (err: any) {
            let errorMsg = err.message || "Failed to request OTP";
            try {
                const parsed = JSON.parse(err.message);
                if (parsed?.error) errorMsg = parsed.error;
            } catch (e) { }
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length < 6) {
            toast.error("Please enter a valid 6-digit code");
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("verify-topup-otp", {
                body: { agent_id: agentId, otp },
            });

            if (error) throw new Error(error.message);

            toast.success("Wallet successfully topped up!");
            queryClient.invalidateQueries({ queryKey: ["admin-agents-list"] });
            queryClient.invalidateQueries({ queryKey: ["admin-agent-details", agentId] });
            queryClient.invalidateQueries({ queryKey: ["agent-wallet", agentId] });
            handleClose();
        } catch (err: any) {
            let errorMsg = err.message || "Invalid or expired OTP";
            try {
                const parsed = JSON.parse(err.message);
                if (parsed?.error) errorMsg = parsed.error;
            } catch (e) { }
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setAmount("");
        setOtp("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {step === 1 ? <Wallet className="h-5 w-5 text-emerald-600" /> : <ShieldCheck className="h-5 w-5 text-secondary" />}
                        {step === 1 ? "Top Up Agent Wallet" : "Security Verification"}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 1
                            ? `Add funds securely to ${agentName}'s wallet.`
                            : `Enter the 6-digit code sent to your administrator email.`}
                    </DialogDescription>
                </DialogHeader>

                {step === 1 ? (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount (NGN)</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="500000"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                            onClick={handleRequestOtp}
                            disabled={loading || !amount}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {loading ? "Sending Code..." : "Next: Verify"}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="otp">6-Digit Code</Label>
                            <Input
                                id="otp"
                                type="text"
                                placeholder="000000"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="text-center text-2xl tracking-widest font-mono"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => setStep(1)} disabled={loading}>
                                Back
                            </Button>
                            <Button
                                className="flex-1 gold-gradient text-secondary-foreground"
                                onClick={handleVerifyOtp}
                                disabled={loading || otp.length < 6}
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                {loading ? "Verifying..." : "Confirm Top Up"}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
