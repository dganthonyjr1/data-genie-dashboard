import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, Loader2, XCircle, Zap, ArrowRight, Sparkles, Crown, Star, Download, FileText, Calendar, CreditCard, Hash, Printer } from "lucide-react";
import confetti from "canvas-confetti";
import { useReactToPrint } from "react-to-print";

type PaymentStatus = "verifying" | "success" | "pending" | "failed";

interface VerificationResult {
  success: boolean;
  status?: string;
  planName?: string;
  amount?: number;
  currency?: string;
  upgraded?: boolean;
  error?: string;
}

interface InvoiceDetails {
  transactionId: string;
  date: string;
  amount: string;
  plan: string;
  email: string;
}

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<PaymentStatus>("verifying");
  const [planName, setPlanName] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const maxRetries = 5;

  const sessionId = searchParams.get("session_id");
  const plan = searchParams.get("plan");
  const preview = searchParams.get("preview");

  // Generate mock invoice details for preview or real data
  const generateInvoiceDetails = useCallback((planNameValue: string, email?: string): InvoiceDetails => {
    const planPrices: Record<string, string> = {
      Pro: "$99.00",
      Enterprise: "Custom",
      Starter: "$0.00",
    };

    return {
      transactionId: sessionId ? `TXN-${sessionId.slice(0, 12).toUpperCase()}` : `TXN-${Date.now().toString(36).toUpperCase()}`,
      date: new Date().toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "long", 
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }),
      amount: planPrices[planNameValue] || "$99.00",
      plan: planNameValue,
      email: email || "user@example.com",
    };
  }, [sessionId]);

  // Trigger confetti celebration
  const triggerConfetti = useCallback(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#06b6d4', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#06b6d4', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'],
      });
    }, 250);
  }, []);

  // Preview mode - show success state without verification
  useEffect(() => {
    if (preview === "true") {
      const planValue = plan || "Pro";
      setPlanName(planValue);
      setStatus("success");
      setInvoiceDetails(generateInvoiceDetails(planValue, "demo@scrapex.io"));
    }
  }, [preview, plan, generateInvoiceDetails]);

  // Trigger confetti on success
  useEffect(() => {
    if (status === "success") {
      triggerConfetti();
    }
  }, [status, triggerConfetti]);

  const verifyPayment = useCallback(async () => {
    if (preview === "true") return;

    if (!sessionId) {
      setStatus("failed");
      return;
    }

    setPlanName(plan || "Pro");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login?redirect=/payment/success?session_id=" + sessionId);
        return;
      }

      const { data, error } = await supabase.functions.invoke<VerificationResult>("verify-stripe-payment", {
        body: { sessionId },
      });

      if (error) {
        console.error("Verification error:", error);
        setStatus("pending");
        return;
      }

      if (data?.status === "completed") {
        setStatus("success");
        const finalPlanName = data.planName || plan || "Pro";
        setPlanName(finalPlanName);
        setInvoiceDetails(generateInvoiceDetails(finalPlanName, session.user.email || undefined));
      } else if (data?.status === "failed" || data?.status === "cancelled") {
        setStatus("failed");
      } else {
        setStatus("pending");
        if (retryCount < maxRetries) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 3000);
        }
      }
    } catch (err) {
      console.error("Error verifying payment:", err);
      setStatus("pending");
    }
  }, [sessionId, plan, navigate, retryCount, preview, generateInvoiceDetails]);

  useEffect(() => {
    verifyPayment();
  }, [verifyPayment]);

  // Print/Download receipt using browser's print functionality
  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: invoiceDetails ? `ScrapeX-Receipt-${invoiceDetails.transactionId}` : 'ScrapeX-Receipt',
    onBeforePrint: async () => {
      setIsDownloading(true);
      return Promise.resolve();
    },
    onAfterPrint: () => {
      setIsDownloading(false);
    },
  });

  const handleDownloadReceipt = () => {
    if (!receiptRef.current || !invoiceDetails) return;
    handlePrint();
  };

  const planFeatures = {
    Pro: ["2,500 scrapes/month", "AI Revenue Analysis", "100 AI call minutes", "API Access (10K/mo)"],
    Enterprise: ["10,000 scrapes/month", "AI Revenue Analysis", "500 AI call minutes", "API Access (100K/mo)"],
    Starter: ["50 scrapes/month", "Basic extraction", "Email support"],
  };

  const features = planFeatures[planName as keyof typeof planFeatures] || planFeatures.Pro;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Floating particles */}
      {status === "success" && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                backgroundColor: ['#06b6d4', '#8b5cf6', '#ec4899', '#10b981'][i % 4],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      )}

      <Card className={`relative max-w-lg w-full backdrop-blur-xl border-2 transition-all duration-500 ${
        status === "success" 
          ? "bg-gradient-to-br from-card/90 via-card/80 to-cyan-950/50 border-cyan-500/50 shadow-2xl shadow-cyan-500/20" 
          : status === "failed"
            ? "bg-card/80 border-destructive/50"
            : "bg-card/80 border-border/50"
      }`}>
        {/* Glow effect for success */}
        {status === "success" && (
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-xl blur-lg opacity-30 animate-pulse" />
        )}

        <div className="relative">
          <CardHeader className="text-center pb-4 pt-8">
            {/* Status Icon */}
            <div className="mx-auto mb-6 relative">
              {status === "verifying" && (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center animate-pulse">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                </div>
              )}
              {status === "success" && (
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500/30 to-cyan-500/30 flex items-center justify-center animate-scale-in">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                      <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/50 animate-spin" style={{ animationDuration: '10s' }} />
                  <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-bounce" />
                  <Star className="absolute -bottom-1 -left-1 w-5 h-5 text-pink-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              )}
              {status === "pending" && (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-500/30 to-orange-500/30 flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
                </div>
              )}
              {status === "failed" && (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-destructive/30 to-destructive/10 flex items-center justify-center">
                  <XCircle className="w-12 h-12 text-destructive" />
                </div>
              )}
            </div>

            {/* Title */}
            <CardTitle 
              className={`text-3xl mb-2 ${status === "success" ? "bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent" : ""}`}
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {status === "verifying" && "Verifying Payment..."}
              {status === "success" && "Welcome to the Pro League!"}
              {status === "pending" && "Almost There..."}
              {status === "failed" && "Payment Issue"}
            </CardTitle>

            <CardDescription className="text-base mt-2 max-w-sm mx-auto">
              {status === "verifying" && "Please wait while we confirm your payment."}
              {status === "success" && (
                <span className="text-muted-foreground">
                  You've unlocked <span className="text-cyan-400 font-bold">{planName}</span> power! 
                  Your account is now supercharged. 🚀
                </span>
              )}
              {status === "pending" && (
                <>
                  Your payment is being processed. You can proceed to the dashboard - 
                  your plan will activate shortly.
                </>
              )}
              {status === "failed" && (
                <>
                  We couldn't verify your payment. If charged, please contact support.
                </>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-2 pb-8">
            {(status === "success" || status === "pending") && (
              <>
                {/* Plan badge */}
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
                    <Crown className="w-5 h-5 text-cyan-400" />
                    <span className="font-semibold text-cyan-400">{planName} Plan</span>
                    {status === "success" ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        Processing
                      </span>
                    )}
                  </div>
                </div>

                {/* Invoice Details */}
                {status === "success" && invoiceDetails && (
                  <div className="bg-gradient-to-br from-muted/60 to-muted/40 rounded-xl p-4 border border-border/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        Invoice Details
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                        onClick={handleDownloadReceipt}
                        disabled={isDownloading}
                      >
                        {isDownloading ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Printer className="w-3 h-3 mr-1" />
                        )}
                        Print Receipt
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Transaction ID</p>
                          <p className="font-mono text-xs text-foreground">{invoiceDetails.transactionId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Date</p>
                          <p className="text-xs text-foreground">{invoiceDetails.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Amount</p>
                          <p className="text-foreground font-semibold">{invoiceDetails.amount}<span className="text-xs text-muted-foreground font-normal">/mo</span></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Plan</p>
                          <p className="text-foreground">{invoiceDetails.plan}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Features unlocked */}
                {status === "success" && (
                  <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-4 border border-border/50">
                    <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      Features Unlocked
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {features.map((feature, i) => (
                        <div 
                          key={i} 
                          className="flex items-center gap-2 text-sm animate-fade-in"
                          style={{ animationDelay: `${i * 0.1}s` }}
                        >
                          <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span className="text-foreground text-xs">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA Button */}
                <Button 
                  className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-400 hover:via-purple-400 hover:to-pink-400 text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/30 hover:scale-[1.02]"
                  onClick={() => navigate("/dashboard")}
                >
                  Launch Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  A confirmation email has been sent to your inbox
                </p>
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
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>This won't take long...</span>
              </div>
            )}
          </CardContent>
        </div>
      </Card>

      {/* Hidden Receipt Template for PDF Generation */}
      {invoiceDetails && (
        <div className="fixed left-[-9999px] top-0">
          <div ref={receiptRef} style={{ width: '600px', padding: '40px', backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
            {/* Receipt Header */}
            <div style={{ borderBottom: '2px solid #06b6d4', paddingBottom: '20px', marginBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '28px', color: '#0f172a', fontWeight: 'bold' }}>ScrapeX</h1>
                  <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '14px' }}>Payment Receipt</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Receipt #</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '14px', color: '#0f172a', fontFamily: 'monospace' }}>{invoiceDetails.transactionId}</p>
                </div>
              </div>
            </div>

            {/* Receipt Body */}
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '15px' }}>Transaction Details</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '14px' }}>Date</td>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0', color: '#0f172a', fontSize: '14px', textAlign: 'right' }}>{invoiceDetails.date}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '14px' }}>Customer Email</td>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0', color: '#0f172a', fontSize: '14px', textAlign: 'right' }}>{invoiceDetails.email}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '14px' }}>Plan</td>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0', color: '#0f172a', fontSize: '14px', textAlign: 'right' }}>{invoiceDetails.plan} Plan (Monthly)</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '14px' }}>Payment Method</td>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0', color: '#0f172a', fontSize: '14px', textAlign: 'right' }}>Credit Card (Stripe)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Amount Section */}
            <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '16px', color: '#0f172a', fontWeight: 'bold' }}>Total Amount</span>
                <span style={{ fontSize: '24px', color: '#06b6d4', fontWeight: 'bold' }}>{invoiceDetails.amount}</span>
              </div>
              <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#64748b' }}>Billed monthly. Cancel anytime.</p>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Thank you for your purchase!</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#64748b' }}>Questions? Contact support@scrapex.io</p>
              <p style={{ margin: '10px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>ScrapeX Inc. • This is an official payment receipt.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSuccess;