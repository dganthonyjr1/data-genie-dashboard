import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, DollarSign, Phone, Quote, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuditData {
  painScore: number;
  evidence: string[];
  calculatedLeak: number;
  calculatedLeakExplanation: string;
}

interface LeadAuditPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessName: string;
  phoneNumber: string;
  niche: string;
  auditData: AuditData | null;
  isLoading: boolean;
  onStartAudit: () => void;
}

export default function LeadAuditPanel({
  open,
  onOpenChange,
  businessName,
  phoneNumber,
  niche,
  auditData,
  isLoading,
  onStartAudit,
}: LeadAuditPanelProps) {
  const { toast } = useToast();
  const [isSendingCall, setIsSendingCall] = useState(false);

  const handleStartSalesCall = async () => {
    if (!auditData) return;
    
    setIsSendingCall(true);
    
    try {
      await fetch("https://hook.us2.make.com/w7c213pu9sygbum5kf8js7tf9432pt5s", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          business_name: businessName,
          phone_number: phoneNumber,
          pain_score: auditData.painScore,
          evidence_summary: auditData.evidence.join(" | "),
        }),
      });

      toast({
        title: "Sales Call Triggered",
        description: "The AI sales call has been initiated. Check Make.com for status.",
      });
    } catch (error) {
      console.error("Error triggering sales call:", error);
      toast({
        title: "Error",
        description: "Failed to trigger the sales call. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingCall(false);
    }
  };
  const getPainScoreColor = (score: number) => {
    if (score >= 8) return "text-red-500";
    if (score >= 5) return "text-orange-500";
    return "text-yellow-500";
  };

  const getPainScoreBg = (score: number) => {
    if (score >= 8) return "bg-red-500/10 border-red-500/30";
    if (score >= 5) return "bg-orange-500/10 border-orange-500/30";
    return "bg-yellow-500/10 border-yellow-500/30";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl">
                Revenue Leak Analysis
              </SheetTitle>
              <SheetDescription className="text-base mt-1">
                {businessName}
                {niche && <Badge variant="secondary" className="ml-2">{niche}</Badge>}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Analyzing business reviews...</p>
              <p className="text-sm text-muted-foreground">Searching for complaints about phone service & booking</p>
            </div>
          ) : auditData ? (
            <>
              {/* Pain Score */}
              <Card className={`border-2 ${getPainScoreBg(auditData.painScore)}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <AlertTriangle className={`h-8 w-8 ${getPainScoreColor(auditData.painScore)}`} />
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Pain Score</p>
                      <p className={`text-5xl font-bold ${getPainScoreColor(auditData.painScore)}`}>
                        {auditData.painScore}
                        <span className="text-2xl text-muted-foreground">/10</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Evidence */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Quote className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-lg">Evidence Found</h3>
                </div>
                {auditData.evidence.length > 0 ? (
                  <div className="space-y-3">
                    {auditData.evidence.map((quote, index) => (
                      <Card key={index} className="bg-muted/50">
                        <CardContent className="pt-4">
                          <p className="text-sm italic text-foreground">"{quote}"</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No specific complaints found.</p>
                )}
              </div>

              {/* The Math */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-lg">The Math</h3>
                </div>
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Cost per missed call:</span>
                        <span className="font-semibold">$200</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Estimated missed calls/month:</span>
                        <span className="font-semibold">{Math.round(auditData.calculatedLeak / 200)}</span>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Monthly Revenue Leak:</span>
                        <span className="text-2xl font-bold text-destructive">
                          ${auditData.calculatedLeak.toLocaleString()}
                        </span>
                      </div>
                      {auditData.calculatedLeakExplanation && (
                        <p className="text-xs text-muted-foreground pt-2">
                          {auditData.calculatedLeakExplanation}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Phone className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground text-center">
                Click "Run Audit" to analyze this business for phone service complaints and estimate revenue leaks.
              </p>
              <Button onClick={onStartAudit} size="lg">
                Run Audit
              </Button>
            </div>
          )}
        </div>

        {auditData && (
          <SheetFooter className="border-t border-border pt-4 mt-auto">
            <div className="w-full space-y-3">
              <Button 
                onClick={handleStartSalesCall} 
                className="w-full h-12 text-lg font-semibold"
                size="lg"
                disabled={isSendingCall}
              >
                {isSendingCall ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Phone className="mr-2 h-5 w-5" />
                    Start AI Sales Call
                  </>
                )}
              </Button>
              <SheetClose asChild>
                <Button variant="outline" className="w-full">
                  <X className="mr-2 h-4 w-4" />
                  Close
                </Button>
              </SheetClose>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
