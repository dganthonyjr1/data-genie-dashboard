import { useState } from "react";
import { Brain, Clock, Calendar, TrendingUp, Zap, Loader2, Sparkles, Target, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Prediction {
  conversionProbability: number;
  confidence: string;
  optimalContactTime: string;
  optimalContactDay: string;
  urgencyLevel: string;
  reasoning: string;
  keyFactors: string[];
  recommendedApproach: string;
}

interface LeadScoreCardProps {
  lead: {
    businessName: string;
    niche: string;
    painScore: number | null;
    revenueLeak: number | null;
    phoneNumber?: string;
    email?: string;
    website?: string;
    evidence?: string[];
    reviewRating?: number;
    reviewCount?: number;
  };
  prediction?: Prediction | null;
  onPredictionUpdate?: (prediction: Prediction) => void;
  isDemoMode?: boolean;
}

const LeadScoreCard = ({ lead, prediction, onPredictionUpdate, isDemoMode = false }: LeadScoreCardProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (isDemoMode) {
      toast({
        title: "Demo Mode",
        description: "AI analysis is simulated in demo mode. Toggle off demo mode to use real AI.",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Please log in to analyze leads");
      }

      const { data, error } = await supabase.functions.invoke("predict-lead-score", {
        body: {
          lead: {
            businessName: lead.businessName,
            niche: lead.niche,
            painScore: lead.painScore,
            revenueLeak: lead.revenueLeak,
            hasPhone: !!lead.phoneNumber,
            hasEmail: !!lead.email,
            hasWebsite: !!lead.website,
            evidence: lead.evidence,
            reviewRating: lead.reviewRating,
            reviewCount: lead.reviewCount,
          },
        },
      });

      if (error) throw error;

      if (data.prediction) {
        onPredictionUpdate?.(data.prediction);
        toast({
          title: "Analysis Complete",
          description: `${lead.businessName} scored ${data.prediction.conversionProbability}% conversion probability`,
        });
      }
    } catch (error) {
      console.error("Error analyzing lead:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze lead",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return "from-green-500 to-emerald-500";
    if (score >= 60) return "from-yellow-500 to-amber-500";
    if (score >= 40) return "from-orange-500 to-amber-600";
    return "from-red-500 to-rose-600";
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">🔥 Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">⚡ High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">📊 Medium</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">📋 Low</Badge>;
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "high":
        return <Badge variant="outline" className="text-green-400 border-green-500/30">High Confidence</Badge>;
      case "medium":
        return <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">Medium Confidence</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Low Confidence</Badge>;
    }
  };

  if (!prediction) {
    return (
      <Card className="bg-card/50 border-border/50 border-dashed">
        <CardContent className="p-6 text-center">
          <Brain className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold mb-2">AI Lead Scoring</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Predict conversion probability and optimal contact timing
          </p>
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze Lead
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50 overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${getScoreGradient(prediction.conversionProbability)}`} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Lead Score
          </CardTitle>
          {getConfidenceBadge(prediction.confidence)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Score */}
        <div className="text-center py-4">
          <div className={`text-5xl font-bold ${getScoreColor(prediction.conversionProbability)}`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
            {prediction.conversionProbability}%
          </div>
          <p className="text-sm text-muted-foreground mt-1">Conversion Probability</p>
          <Progress
            value={prediction.conversionProbability}
            className="mt-3 h-2"
          />
        </div>

        {/* Urgency & Timing */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Urgency</span>
            </div>
            {getUrgencyBadge(prediction.urgencyLevel)}
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-accent" />
              <span className="text-xs text-muted-foreground">Best Time</span>
            </div>
            <p className="text-sm font-medium">{prediction.optimalContactTime}</p>
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-secondary" />
            <span className="text-xs text-muted-foreground">Best Day</span>
          </div>
          <p className="text-sm font-medium">{prediction.optimalContactDay}</p>
        </div>

        {/* Key Factors */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Key Factors</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {prediction.keyFactors.map((factor, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {factor}
              </Badge>
            ))}
          </div>
        </div>

        {/* Reasoning */}
        <div className="bg-muted/20 rounded-lg p-3 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">AI Analysis</span>
          </div>
          <p className="text-sm text-muted-foreground">{prediction.reasoning}</p>
        </div>

        {/* Recommended Approach */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-3 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Recommended Approach</span>
          </div>
          <p className="text-sm text-foreground">{prediction.recommendedApproach}</p>
        </div>

        {/* Re-analyze button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="w-full"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Re-analyzing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Re-analyze
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default LeadScoreCard;
