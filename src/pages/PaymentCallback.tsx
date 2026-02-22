import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrackActivity } from "@/hooks/useTrackActivity";
import SuccessAnimation from "@/components/animations/SuccessAnimation";
import FailureAnimation from "@/components/animations/FailureAnimation";
import { Home, RotateCcw, Loader2 } from "lucide-react";

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { trackActivity } = useTrackActivity();
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");

  const reference = searchParams.get("reference");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setStatus("failed");
        return;
      }

      try {
        const { data, error: invokeError } = await supabase.functions.invoke(
          "verify-paystack-payment",
          { body: { reference } }
        );

        if (invokeError) throw invokeError;

        if (data.status === "verified") {
          setStatus("success");
          await trackActivity({
            eventType: "payment_success",
            bookingId: data.bookingId,
            metadata: { method: "paystack", reference }
          });
        } else {
          setStatus("failed");
          await trackActivity({
            eventType: "payment_failed",
            metadata: { method: "paystack", reference, error: data.message }
          });
        }
      } catch (error) {
        console.error("Payment verification error:", error);
        setStatus("failed");
      }
    };

    verifyPayment();
  }, [reference]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md border-border/60 bg-background/80 backdrop-blur-sm shadow-xl">
        <CardContent className="p-8">
          {status === "verifying" && (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-heading text-lg font-bold text-foreground">Verifying Payment</h3>
                <p className="text-sm text-muted-foreground">Please wait while we confirm your transaction…</p>
              </div>
              <div className="w-full max-w-xs space-y-2">
                <Skeleton className="h-3 w-full rounded-full" />
                <Skeleton className="h-3 w-3/4 rounded-full mx-auto" />
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-6 py-4">
              <SuccessAnimation size={100} />
              <div className="text-center space-y-2">
                <h3 className="font-heading text-xl font-bold text-foreground">Payment Confirmed!</h3>
                <p className="text-sm text-muted-foreground">
                  Your payment has been successfully processed and verified.
                </p>
                {reference && (
                  <div className="mt-3 px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
                    <p className="text-xs text-emerald-600">Reference</p>
                    <p className="text-sm font-mono font-bold text-emerald-800">{reference}</p>
                  </div>
                )}
              </div>
              <div className="w-full space-y-2 pt-2">
                <Button onClick={() => navigate("/dashboard")} className="w-full gap-2">
                  <Home className="h-4 w-4" />
                  Back to Dashboard
                </Button>
                <Button onClick={() => navigate("/dashboard/payments")} variant="outline" className="w-full text-sm">
                  View Payment History
                </Button>
              </div>
            </div>
          )}

          {status === "failed" && (
            <div className="flex flex-col items-center gap-6 py-4">
              <FailureAnimation size={100} />
              <div className="text-center space-y-2">
                <h3 className="font-heading text-xl font-bold text-foreground">Payment Failed</h3>
                <p className="text-sm text-muted-foreground">
                  There was an issue processing your payment. Please try again or contact support.
                </p>
              </div>
              <div className="w-full space-y-2 pt-2">
                <Button onClick={() => navigate("/dashboard/payments")} className="w-full gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button onClick={() => navigate("/dashboard/support")} variant="outline" className="w-full text-sm">
                  Contact Support
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCallback;
