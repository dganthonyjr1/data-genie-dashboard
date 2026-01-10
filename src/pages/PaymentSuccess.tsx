import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, Loader2, XCircle, Zap, ArrowRight } from "lucide-react";

type PaymentStatus = "verifying" | "success" | "pending" | "failed";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<PaymentStatus>("verifying");
  const [planName, setPlanName] = useState<string>("");

  const paymentLinkId = searchParams.get("paymentLinkId");
  const plan = searchParams.get("plan");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!paymentLinkId) {
        // No paymentLinkId means user came here directly or payment was cancelled
        setStatus("failed");
        return;
      }

      setPlanName(plan || "Pro");

      try {
        // Check if payment exists and its status
        const { data: payment, error } = await supabase
          .from("payments")
          .select("*")
          .eq("payment_link_id", paymentLinkId)
          .single();

        if (error || !payment) {
          // Payment record not found - might be processing
          setStatus("pending");
          return;
        }

        if (payment.status === "completed") {
          setStatus("success");
        } else if (payment.status === "failed" || payment.status === "cancelled") {
          setStatus("failed");
        } else {
          // Still pending - Square webhook hasn't fired yet
          // In production, you'd poll or use webhooks
          setStatus("pending");
        }
      } catch (err) {
        console.error("Error verifying payment:", err);
        setStatus("pending");
      }
    };

    verifyPayment();
  }, [paymentLinkId, plan]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <Card className="relative max-w-md w-full bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            {status === "verifying" && (
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
            )}
            {status === "success" && (
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
            )}
            {status === "pending" && (
              <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
              </div>
            )}
            {status === "failed" && (
              <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
            )}
          </div>

          <CardTitle className="text-2xl" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            {status === "verifying" && "Verifying Payment..."}
            {status === "success" && "Payment Successful!"}
            {status === "pending" && "Processing Payment..."}
            {status === "failed" && "Payment Issue"}
          </CardTitle>

          <CardDescription className="text-base mt-2">
            {status === "verifying" && "Please wait while we confirm your payment."}
            {status === "success" && (
              <>
                Welcome to ScrapeX <span className="text-cyan-400 font-semibold">{planName}</span>! Your account has been upgraded.
              </>
            )}
            {status === "pending" && (
              <>
                Your payment is being processed. This usually takes a few moments. 
                You can proceed to the dashboard - your plan will be activated shortly.
              </>
            )}
            {status === "failed" && (
              <>
                We couldn't verify your payment. If you were charged, please contact support. 
                Otherwise, try again or choose a different payment method.
              </>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {(status === "success" || status === "pending") && (
            <>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium text-cyan-400">{planName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`font-medium ${status === "success" ? "text-green-500" : "text-yellow-500"}`}>
                    {status === "success" ? "Active" : "Processing"}
                  </span>
                </div>
              </div>

              <Button 
                className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}

          {status === "failed" && (
            <div className="space-y-3">
              <Button 
                className="w-full"
                variant="outline"
                onClick={() => navigate("/pricing")}
              >
                Try Again
              </Button>
              <Button 
                className="w-full"
                variant="ghost"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard
              </Button>
            </div>
          )}

          {status === "verifying" && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Zap className="w-4 h-4" />
              <span>This won't take long...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
