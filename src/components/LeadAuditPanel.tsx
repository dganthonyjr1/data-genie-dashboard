import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Stethoscope, ClipboardList, Phone, FileText, X, Loader2, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AuditData {
  painScore: number;
  evidence: string[];
  calculatedLeak: number;
  calculatedLeakExplanation: string;
  bottleneckType?: string;
  facilityType?: string;
  costPerLead?: number;
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
      const { error } = await supabase.functions.invoke('trigger-sales-call', {
        body: {
          business_name: businessName,
          phone_number: phoneNumber,
          pain_score: auditData.painScore,
          evidence_summary: auditData.evidence.join(" | "),
          niche,
          revenue_leak: auditData.calculatedLeak,
        },
      });

      if (error) throw error;

      toast({
        title: "Outreach Initiated",
        description: "Patient acquisition call has been scheduled.",
      });
    } catch (error) {
      console.error("Error triggering sales call:", error);
      toast({
        title: "Connection Error",
        description: "Failed to initiate outreach. Please retry.",
        variant: "destructive",
      });
    } finally {
      setIsSendingCall(false);
    }
  };

  const getRiskLevel = (score: number) => {
    if (score >= 8) return { label: "Critical", color: "text-red-600", bg: "bg-red-50 border-red-200" };
    if (score >= 5) return { label: "Moderate", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" };
    return { label: "Low", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" };
  };

  const risk = auditData ? getRiskLevel(auditData.painScore) : null;
  const costPerLead = auditData?.costPerLead || 200;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-slate-50 border-l border-slate-200">
        {/* Clinical Header */}
        <SheetHeader className="pb-5 border-b border-slate-200 bg-white -mx-6 -mt-6 px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
              <Stethoscope className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <SheetTitle className="text-xl text-slate-800 font-semibold">
                Clinical Revenue Diagnostic
              </SheetTitle>
              <SheetDescription className="text-slate-600 mt-1 flex items-center gap-2">
                {businessName}
                {niche && (
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">
                    {niche}
                  </Badge>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-5">
          {isLoading ? (
            <Card className="bg-white border-slate-200">
              <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="p-4 rounded-full bg-blue-50">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="text-slate-700 font-medium">Conducting Diagnostic Analysis...</p>
                  <p className="text-sm text-slate-500 mt-1">Reviewing patient access & administrative workflows</p>
                </div>
              </CardContent>
            </Card>
          ) : auditData ? (
            <>
              {/* Patient Access Risk Score */}
              <Card className={`border-2 ${risk?.bg} bg-white`}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${risk?.bg}`}>
                        <Activity className={`h-7 w-7 ${risk?.color}`} />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 font-medium uppercase tracking-wide">Patient Access Risk</p>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className={`text-4xl font-bold ${risk?.color}`}>
                            {auditData.painScore}
                          </span>
                          <span className="text-lg text-slate-400">/10</span>
                          <Badge className={`ml-2 ${risk?.bg} ${risk?.color} border-0`}>
                            {risk?.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  {auditData.bottleneckType && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Primary Bottleneck</p>
                      <p className="text-sm text-slate-700 font-medium">{auditData.bottleneckType}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Clinical Findings */}
              <Card className="bg-white border-slate-200">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ClipboardList className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-slate-800">Clinical Findings</h3>
                  </div>
                  {auditData.evidence.length > 0 ? (
                    <div className="space-y-3">
                      {auditData.evidence.map((finding, index) => (
                        <div key={index} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="text-sm text-slate-700 leading-relaxed">"{finding}"</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">No patient access concerns identified.</p>
                  )}
                </CardContent>
              </Card>

              {/* Financial Impact Assessment */}
              <Card className="bg-white border-slate-200">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-slate-800">Financial Impact Assessment</h3>
                  </div>
                  <div className="space-y-3">
                    {auditData.facilityType && (
                      <div className="flex items-center justify-between py-2">
                        <span className="text-slate-500 text-sm">Facility Classification</span>
                        <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-0">
                          {auditData.facilityType}
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-500 text-sm">Revenue per Patient Inquiry</span>
                      <span className="font-semibold text-slate-700">${costPerLead}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-500 text-sm">Est. Lost Inquiries/Month</span>
                      <span className="font-semibold text-slate-700">
                        {Math.round(auditData.calculatedLeak / costPerLead)}
                      </span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="flex items-center justify-between py-3 bg-red-50 -mx-4 px-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-slate-700">Monthly Revenue Loss</span>
                      </div>
                      <span className="text-2xl font-bold text-red-600">
                        ${auditData.calculatedLeak.toLocaleString()}
                      </span>
                    </div>
                    {auditData.calculatedLeakExplanation && (
                      <p className="text-xs text-slate-500 pt-2 leading-relaxed">
                        {auditData.calculatedLeakExplanation}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-white border-slate-200">
              <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="p-4 rounded-full bg-blue-50">
                  <Stethoscope className="h-10 w-10 text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="text-slate-700 font-medium">Ready for Diagnostic</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Analyze patient access bottlenecks and estimate revenue impact.
                  </p>
                </div>
                <Button 
                  onClick={onStartAudit} 
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white mt-2"
                >
                  <Activity className="mr-2 h-4 w-4" />
                  Run Diagnostic
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {auditData && (
          <SheetFooter className="border-t border-slate-200 pt-4 mt-auto bg-white -mx-6 px-6 pb-6 -mb-6">
            <div className="w-full space-y-3">
              <Button 
                onClick={handleStartSalesCall} 
                className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
                size="lg"
                disabled={isSendingCall}
              >
                {isSendingCall ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Initiating...
                  </>
                ) : (
                  <>
                    <Phone className="mr-2 h-5 w-5" />
                    Schedule Patient Acquisition Call
                  </>
                )}
              </Button>
              <SheetClose asChild>
                <Button variant="outline" className="w-full border-slate-300 text-slate-600 hover:bg-slate-100">
                  <X className="mr-2 h-4 w-4" />
                  Close Diagnostic
                </Button>
              </SheetClose>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
