import { useState } from "react";
import { Trophy, Brain, Loader2, TrendingUp, Phone, Zap, Clock, ChevronDown, ChevronUp, Target, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface LeadPrediction {
  conversionProbability: number;
  confidence: string;
  optimalContactTime: string;
  optimalContactDay: string;
  urgencyLevel: string;
  reasoning: string;
  keyFactors: string[];
  recommendedApproach: string;
}

interface Lead {
  id: string;
  businessName: string;
  niche: string;
  phoneNumber: string;
  email?: string;
  monthlyRevenue: number | null;
  revenueLeak: number | null;
  painScore: number | null;
  evidence?: string[];
  reviewRating?: number;
  reviewCount?: number;
  prediction?: LeadPrediction;
}

interface LeadLeaderboardProps {
  leads: Lead[];
  onScoreAll: (predictions: Record<string, LeadPrediction>) => void;
  onSelectLead: (leadId: string) => void;
  predictions: Record<string, LeadPrediction>;
  isDemoMode?: boolean;
}

const LeadLeaderboard = ({ leads, onScoreAll, onSelectLead, predictions, isDemoMode = false }: LeadLeaderboardProps) => {
  const [isScoring, setIsScoring] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const { toast } = useToast();

  // Merge predictions with leads and sort
  const scoredLeads = leads.map(lead => ({
    ...lead,
    prediction: lead.prediction || predictions[lead.id],
  })).filter(l => l.prediction);

  const unscoredLeads = leads.filter(l => !l.prediction && !predictions[l.id]);

  // Sort by conversion probability
  const rankedLeads = [...scoredLeads].sort(
    (a, b) => (b.prediction?.conversionProbability || 0) - (a.prediction?.conversionProbability || 0)
  );

  const handleBulkScore = async () => {
    if (isDemoMode) {
      toast({
        title: "Demo Mode",
        description: "Bulk scoring is simulated in demo mode. Toggle off demo mode to use real AI.",
      });
      return;
    }

    if (leads.length === 0) {
      toast({
        title: "No Leads",
        description: "Add some leads first to score them.",
        variant: "destructive",
      });
      return;
    }

    setIsScoring(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Please log in to score leads");
      }

      // Prepare leads for bulk scoring
      const leadsToScore = leads.map(lead => ({
        id: lead.id,
        businessName: lead.businessName,
        niche: lead.niche,
        painScore: lead.painScore,
        revenueLeak: lead.revenueLeak,
        hasPhone: lead.phoneNumber !== "N/A" && !!lead.phoneNumber,
        hasEmail: !!lead.email,
        hasWebsite: true, // Assume all have websites
        evidence: lead.evidence,
        reviewRating: lead.reviewRating,
        reviewCount: lead.reviewCount,
      }));

      const { data, error } = await supabase.functions.invoke("bulk-predict-leads", {
        body: { leads: leadsToScore },
      });

      if (error) throw error;

      if (data.predictions && Array.isArray(data.predictions)) {
        const newPredictions: Record<string, LeadPrediction> = {};
        data.predictions.forEach((p: any) => {
          newPredictions[p.leadId] = {
            conversionProbability: p.conversionProbability,
            confidence: p.confidence,
            optimalContactTime: p.optimalContactTime,
            optimalContactDay: p.optimalContactDay,
            urgencyLevel: p.urgencyLevel,
            reasoning: p.reasoning,
            keyFactors: p.keyFactors,
            recommendedApproach: p.recommendedApproach,
          };
        });
        onScoreAll(newPredictions);
        toast({
          title: "Bulk Scoring Complete! 🎯",
          description: `Analyzed ${data.predictions.length} leads. Top lead: ${data.predictions[0]?.conversionProbability || 0}% conversion probability.`,
        });
      }
    } catch (error) {
      console.error("Bulk scoring error:", error);
      toast({
        title: "Scoring Failed",
        description: error instanceof Error ? error.message : "Failed to score leads",
        variant: "destructive",
      });
    } finally {
      setIsScoring(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-500/10 border-green-500/30";
    if (score >= 60) return "bg-yellow-500/10 border-yellow-500/30";
    if (score >= 40) return "bg-orange-500/10 border-orange-500/30";
    return "bg-red-500/10 border-red-500/30";
  };

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <span className="text-2xl">🥇</span>;
    if (rank === 1) return <span className="text-2xl">🥈</span>;
    if (rank === 2) return <span className="text-2xl">🥉</span>;
    return <span className="text-lg font-bold text-muted-foreground">#{rank + 1}</span>;
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical": return "text-red-500";
      case "high": return "text-orange-500";
      case "medium": return "text-yellow-500";
      default: return "text-blue-500";
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                Lead Leaderboard
                {rankedLeads.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {rankedLeads.length} scored
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                AI-ranked leads by conversion probability
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={handleBulkScore}
            disabled={isScoring || leads.length === 0}
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          >
            {isScoring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scoring {leads.length} leads...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Score All Leads ({leads.length})
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rankedLeads.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Leads Scored Yet</h3>
            <p className="text-muted-foreground mb-4">
              Click "Score All Leads" to analyze {leads.length} leads with AI
            </p>
            {unscoredLeads.length > 0 && (
              <Badge variant="outline" className="text-sm">
                {unscoredLeads.length} leads waiting to be scored
              </Badge>
            )}
          </div>
        ) : (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between mb-2 hover:bg-muted/50">
                <span className="font-medium">
                  Top {Math.min(rankedLeads.length, 10)} Leads
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2">
              {rankedLeads.slice(0, 10).map((lead, index) => (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead.id)}
                  className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] ${getScoreBg(lead.prediction!.conversionProbability)}`}
                >
                  {/* Rank */}
                  <div className="w-12 flex-shrink-0 text-center">
                    {getRankIcon(index)}
                  </div>

                  {/* Lead Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold truncate">{lead.businessName}</span>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {lead.niche}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {lead.phoneNumber !== "N/A" ? "Has phone" : "No phone"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {lead.prediction!.optimalContactTime}
                      </span>
                      <span className={`flex items-center gap-1 ${getUrgencyColor(lead.prediction!.urgencyLevel)}`}>
                        <Zap className="h-3 w-3" />
                        {lead.prediction!.urgencyLevel}
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="w-24 flex-shrink-0">
                    <div className={`text-2xl font-bold text-center ${getScoreColor(lead.prediction!.conversionProbability)}`}>
                      {lead.prediction!.conversionProbability}%
                    </div>
                    <Progress 
                      value={lead.prediction!.conversionProbability} 
                      className="h-1.5 mt-1"
                    />
                  </div>

                  {/* Action hint */}
                  <div className="flex-shrink-0">
                    <Target className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                </div>
              ))}

              {rankedLeads.length > 10 && (
                <div className="text-center py-2">
                  <Badge variant="outline" className="text-muted-foreground">
                    +{rankedLeads.length - 10} more leads scored
                  </Badge>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Summary Stats */}
        {rankedLeads.length > 0 && (
          <div className="grid grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {rankedLeads.filter(l => l.prediction!.conversionProbability >= 80).length}
              </div>
              <div className="text-xs text-muted-foreground">Hot (80%+)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">
                {rankedLeads.filter(l => l.prediction!.conversionProbability >= 60 && l.prediction!.conversionProbability < 80).length}
              </div>
              <div className="text-xs text-muted-foreground">Warm (60-79%)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">
                {rankedLeads.filter(l => l.prediction!.conversionProbability >= 40 && l.prediction!.conversionProbability < 60).length}
              </div>
              <div className="text-xs text-muted-foreground">Cool (40-59%)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">
                {rankedLeads.filter(l => l.prediction!.conversionProbability < 40).length}
              </div>
              <div className="text-xs text-muted-foreground">Cold (&lt;40%)</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeadLeaderboard;
