import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");

  const reference = searchParams.get("reference");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setStatus("failed");
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-paystack-payment`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ reference }),
          }
        );

        const data = await response.json();

        if (data.status === "verified") {
          setStatus("success");
        } else {
          setStatus("failed");
        }
      } catch (error) {
        console.error("Payment verification error:", error);
        setStatus("failed");
      }
    };

    verifyPayment();
  }, [reference]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Payment Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "verifying" && (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </>
          )}

          {status === "success" && (
            <div className="text-center space-y-4">
              <div className="text-5xl">✓</div>
              <h3 className="font-heading text-lg font-bold text-foreground">Payment Confirmed</h3>
              <p className="text-sm text-muted-foreground">Your payment has been successfully processed.</p>
              <Button onClick={() => navigate("/dashboard")} className="w-full">
                Back to Dashboard
              </Button>
            </div>
          )}

          {status === "failed" && (
            <div className="text-center space-y-4">
              <div className="text-5xl">✕</div>
              <h3 className="font-heading text-lg font-bold text-foreground">Payment Failed</h3>
              <p className="text-sm text-muted-foreground">There was an issue processing your payment.</p>
              <Button onClick={() => navigate("/dashboard/payments")} className="w-full">
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCallback;
