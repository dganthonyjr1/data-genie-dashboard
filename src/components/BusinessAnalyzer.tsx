import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTriggerCall } from "@/hooks/use-trigger-call";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INDUSTRY_CONFIGS, INDUSTRY_OPTIONS, detectIndustryFromContent, getIndustryConfig } from "@/lib/industry-config";
import { 
  Search, 
  Loader2, 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  Building2,
  AlertTriangle,
  DollarSign,
  ExternalLink,
  Target,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  Factory
} from "lucide-react";

interface RevenueOpportunity {
  opportunity: string;
  estimated_value: string;
  confidence: string;
}

interface OperationalGap {
  gap: string;
  impact: string;
  solution: string;
}

interface FacilityAnalysis {
  lead_score: number;
  urgency: string;
  revenue_opportunities: RevenueOpportunity[];
  operational_gaps: OperationalGap[];
  recommended_pitch: string;
  key_decision_factors?: string[];
  competitive_position?: string;
  follow_up_timing?: string;
  industry?: string;
  industry_name?: string;
}

interface ScrapedData {
  url: string;
  facility_name: string;
  scraped_at: string;
  content: {
    markdown?: string;
    title?: string;
    description?: string;
    sourceURL?: string;
  };
  extracted: {
    phones: string[];
    emails: string[];
    services: string[];
    has_contact_info: boolean;
  };
}

// Backend API URL - permanent Render.com deployment
const BACKEND_API_URL = "https://scrapex-backend.onrender.com";

export default function BusinessAnalyzer() {
  const { toast } = useToast();
  const { triggerCall, isTriggering } = useTriggerCall();
  const [url, setUrl] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState<"idle" | "scraping" | "detecting" | "analyzing" | "complete">("idle");
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [analysisData, setAnalysisData] = useState<FacilityAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useBackendApi, setUseBackendApi] = useState(true);
  
  // Industry selection state
  const [selectedIndustry, setSelectedIndustry] = useState<string>("auto");
  const [detectedIndustry, setDetectedIndustry] = useState<{ industry: string; confidence: 'high' | 'medium' | 'low'; matchedKeywords: string[] } | null>(null);

  // Get the effective industry (selected or detected)
  const getEffectiveIndustry = (): string => {
    if (selectedIndustry !== "auto") return selectedIndustry;
    return detectedIndustry?.industry || "healthcare";
  };

  // Poll for job completion from backend API
  const pollJobStatus = async (jobId: string, maxAttempts = 30): Promise<any> => {
    let attempts = 0;
    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 1000));
      const jobRes = await fetch(`${BACKEND_API_URL}/api/v1/jobs/${jobId}`);
      const job = await jobRes.json();
      
      if (job.status === 'completed') {
        return job.result;
      }
      if (job.status === 'failed') {
        throw new Error(job.error || 'Job failed');
      }
      attempts++;
    }
    throw new Error('Job timed out');
  };

  // Use the new permanent backend API for scraping and analysis
  const handleAnalyzeWithBackend = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Please log in to analyze businesses");
    }

    // Step 1: Start scraping via backend API
    const scrapeRes = await fetch(`${BACKEND_API_URL}/api/v1/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url: url.trim(),
        facility_name: facilityName.trim() || undefined 
      })
    });

    if (!scrapeRes.ok) {
      const errorData = await scrapeRes.json();
      throw new Error(errorData.detail || 'Backend scraping failed');
    }

    const { job_id: scrapeJobId } = await scrapeRes.json();
    
    // Poll for scrape results
    const scrapeResult = await pollJobStatus(scrapeJobId);
    
    // Transform backend response to match our interface
    const transformedScrapedData: ScrapedData = {
      url: url.trim(),
      facility_name: scrapeResult.facility_name || facilityName.trim() || "Unknown Business",
      scraped_at: new Date().toISOString(),
      content: {
        markdown: scrapeResult.content_text,
        title: scrapeResult.facility_name,
        description: scrapeResult.description,
        sourceURL: url.trim(),
      },
      extracted: {
        phones: scrapeResult.phone || [],
        emails: scrapeResult.email ? [scrapeResult.email] : [],
        services: scrapeResult.services || [],
        has_contact_info: Boolean(scrapeResult.phone?.length || scrapeResult.email),
      },
    };

    setScrapedData(transformedScrapedData);
    
    // Step 2: Detect industry from scraped content
    setCurrentStep("detecting");
    let industryToUse = selectedIndustry;
    
    if (selectedIndustry === "auto") {
      const contentToAnalyze = `${scrapeResult.facility_name || ''} ${scrapeResult.description || ''} ${scrapeResult.content_text || ''} ${(scrapeResult.services || []).join(' ')}`;
      const detection = detectIndustryFromContent(contentToAnalyze);
      setDetectedIndustry(detection);
      industryToUse = detection.industry;
      
      toast({
        title: `Industry Detected: ${getIndustryConfig(detection.industry).name}`,
        description: `Confidence: ${detection.confidence} (${detection.matchedKeywords.slice(0, 3).join(', ')})`,
      });
    } else {
      industryToUse = selectedIndustry;
    }

    setCurrentStep("analyzing");

    // Step 3: Start analysis via Edge Function with industry
    const analyzeResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-facility`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          scraped_data: transformedScrapedData,
          facility_name: transformedScrapedData.facility_name,
          url: url.trim(),
          industry: industryToUse,
        }),
      }
    );

    if (!analyzeResponse.ok) {
      const errorData = await analyzeResponse.json();
      throw new Error(errorData.error || "Failed to analyze facility");
    }

    const analyzeResult = await analyzeResponse.json();
    if (!analyzeResult.success) {
      throw new Error(analyzeResult.error || "Analysis failed");
    }

    setAnalysisData({
      ...analyzeResult.analysis,
      industry: industryToUse,
      industry_name: getIndustryConfig(industryToUse).name,
    });
    setCurrentStep("complete");
  };

  // Fallback to Edge Functions if backend is unavailable
  const handleAnalyzeWithEdgeFunctions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Please log in to analyze businesses");
    }

    // Step 1: Call scrape-facility Edge Function
    const scrapeResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-facility`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          url: url.trim(),
          facility_name: facilityName.trim() || undefined,
        }),
      }
    );

    if (!scrapeResponse.ok) {
      const errorData = await scrapeResponse.json();
      throw new Error(errorData.error || "Failed to scrape facility");
    }

    const scrapeResult = await scrapeResponse.json();
    if (!scrapeResult.success) {
      throw new Error(scrapeResult.error || "Scraping failed");
    }

    setScrapedData(scrapeResult.data);
    
    // Step 2: Detect industry
    setCurrentStep("detecting");
    let industryToUse = selectedIndustry;
    
    if (selectedIndustry === "auto") {
      const contentToAnalyze = `${scrapeResult.data.facility_name || ''} ${scrapeResult.data.content?.description || ''} ${scrapeResult.data.content?.markdown || ''} ${(scrapeResult.data.extracted?.services || []).join(' ')}`;
      const detection = detectIndustryFromContent(contentToAnalyze);
      setDetectedIndustry(detection);
      industryToUse = detection.industry;
    }

    setCurrentStep("analyzing");

    // Step 3: Call analyze-facility Edge Function with industry
    const analyzeResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-facility`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          scraped_data: scrapeResult.data,
          facility_name: scrapeResult.data.facility_name,
          url: url.trim(),
          industry: industryToUse,
        }),
      }
    );

    if (!analyzeResponse.ok) {
      const errorData = await analyzeResponse.json();
      throw new Error(errorData.error || "Failed to analyze facility");
    }

    const analyzeResult = await analyzeResponse.json();
    if (!analyzeResult.success) {
      throw new Error(analyzeResult.error || "Analysis failed");
    }

    setAnalysisData({
      ...analyzeResult.analysis,
      industry: industryToUse,
      industry_name: getIndustryConfig(industryToUse).name,
    });
    setCurrentStep("complete");
  };

  const handleAnalyze = async () => {
    if (!url.trim()) {
      toast({
        title: "Enter a URL",
        description: "Please enter a business website URL to analyze",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setScrapedData(null);
    setAnalysisData(null);
    setError(null);
    setDetectedIndustry(null);
    setCurrentStep("scraping");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Not logged in",
          description: "Please log in to analyze businesses",
          variant: "destructive",
        });
        setIsAnalyzing(false);
        setCurrentStep("idle");
        return;
      }

      // Try the permanent backend API first, fallback to Edge Functions
      if (useBackendApi) {
        try {
          await handleAnalyzeWithBackend();
        } catch (backendError) {
          console.warn("Backend API failed, falling back to Edge Functions:", backendError);
          await handleAnalyzeWithEdgeFunctions();
        }
      } else {
        await handleAnalyzeWithEdgeFunctions();
      }

      toast({
        title: "Analysis Complete",
        description: "Business has been scraped and analyzed successfully",
      });

    } catch (err) {
      console.error("Error analyzing business:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      setCurrentStep("idle");
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTriggerCall = async () => {
    if (!scrapedData || !analysisData) return;

    const phoneNumber = scrapedData.extracted?.phones?.[0];
    if (!phoneNumber) {
      toast({
        title: "No Phone Number",
        description: "This business doesn't have a phone number on file",
        variant: "destructive",
      });
      return;
    }

    await triggerCall({
      facilityName: scrapedData.facility_name,
      phoneNumber: phoneNumber,
      analysisData: analysisData,
      industry: getEffectiveIndustry(),
    });
  };

  const getLeadScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getLeadScoreLabel = (score: number) => {
    if (score >= 80) return { label: "Hot Lead", variant: "default" as const };
    if (score >= 60) return { label: "Warm Lead", variant: "secondary" as const };
    if (score >= 40) return { label: "Cool Lead", variant: "outline" as const };
    return { label: "Cold Lead", variant: "destructive" as const };
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
      case "critical": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      default: return "bg-green-500";
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence?.toLowerCase()) {
      case "high": return "bg-green-500/20 text-green-500";
      case "medium": return "bg-yellow-500/20 text-yellow-500";
      default: return "bg-gray-500/20 text-gray-500";
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact?.toLowerCase()) {
      case "high": return "bg-red-500/20 text-red-500";
      case "medium": return "bg-orange-500/20 text-orange-500";
      default: return "bg-gray-500/20 text-gray-500";
    }
  };

  const getStepProgress = () => {
    switch (currentStep) {
      case "scraping": return 25;
      case "detecting": return 50;
      case "analyzing": return 75;
      case "complete": return 100;
      default: return 0;
    }
  };

  const getStepLabel = () => {
    switch (currentStep) {
      case "scraping": return "Scraping website...";
      case "detecting": return "Detecting industry...";
      case "analyzing": return "Running AI analysis...";
      case "complete": return "Complete!";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* URL Input Section */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Search className="h-5 w-5 text-primary" />
            Analyze a Business
          </CardTitle>
          <CardDescription>
            Enter a business website URL to scrape data and get AI-powered sales intelligence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            <Input
              type="url"
              placeholder="https://example-business.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="md:col-span-2"
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            />
            <Input
              type="text"
              placeholder="Business name (optional)"
              value={facilityName}
              onChange={(e) => setFacilityName(e.target.value)}
            />
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger>
                <SelectValue placeholder="Auto-detect industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <span className="flex items-center gap-2">
                    <Factory className="h-4 w-4" />
                    Auto-detect
                  </span>
                </SelectItem>
                {INDUSTRY_OPTIONS.map((industryId) => {
                  const config = INDUSTRY_CONFIGS[industryId];
                  return (
                    <SelectItem key={industryId} value={industryId}>
                      <span className="flex items-center gap-2">
                        <span>{config.icon}</span>
                        {config.name}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-pink-500 to-cyan-500 hover:opacity-90"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {currentStep === "scraping" ? "Scraping..." : currentStep === "detecting" ? "Detecting..." : "Analyzing..."}
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Analyze
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isAnalyzing && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-lg font-medium">{getStepLabel()}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentStep === "scraping" && "Extracting contact info, services, and business data"}
                  {currentStep === "detecting" && "Analyzing content to determine business industry"}
                  {currentStep === "analyzing" && "Generating lead score, revenue opportunities, and sales insights"}
                </p>
              </div>
              <div className="w-full max-w-md">
                <Progress value={getStepProgress()} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !isAnalyzing && (
        <Card className="bg-red-500/10 border-red-500/50">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <div>
                <p className="font-medium text-red-500">Analysis Failed</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {scrapedData && analysisData && currentStep === "complete" && (
        <div className="space-y-4">
          {/* Business Header with Lead Score */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-bold">
                      {scrapedData.facility_name || "Unknown Business"}
                    </h2>
                    <Badge className={getUrgencyColor(analysisData.urgency)}>
                      {analysisData.urgency?.toUpperCase()} Priority
                    </Badge>
                    {/* Industry Badge */}
                    {(analysisData.industry || detectedIndustry) && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <span>{getIndustryConfig(getEffectiveIndustry()).icon}</span>
                        {analysisData.industry_name || getIndustryConfig(getEffectiveIndustry()).name}
                        {detectedIndustry && selectedIndustry === "auto" && (
                          <span className={`ml-1 text-xs ${
                            detectedIndustry.confidence === 'high' ? 'text-green-500' : 
                            detectedIndustry.confidence === 'medium' ? 'text-yellow-500' : 'text-gray-500'
                          }`}>
                            ({detectedIndustry.confidence})
                          </span>
                        )}
                      </Badge>
                    )}
                  </div>
                  {scrapedData.content?.description && (
                    <p className="text-muted-foreground mt-2 max-w-2xl">
                      {scrapedData.content.description}
                    </p>
                  )}
                </div>
                
                {/* Lead Score Circle */}
                <div className="flex flex-col items-center">
                  <div className={`relative w-24 h-24 flex items-center justify-center rounded-full border-4 ${getLeadScoreColor(analysisData.lead_score)} border-current`}>
                    <span className={`text-3xl font-bold ${getLeadScoreColor(analysisData.lead_score)}`}>
                      {analysisData.lead_score}
                    </span>
                  </div>
                  <Badge variant={getLeadScoreLabel(analysisData.lead_score).variant} className="mt-2">
                    {getLeadScoreLabel(analysisData.lead_score).label}
                  </Badge>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleTriggerCall}
                  disabled={isTriggering || !scrapedData.extracted?.phones?.length}
                  size="lg"
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90"
                >
                  {isTriggering ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Triggering Call...
                    </>
                  ) : (
                    <>
                      <Phone className="mr-2 h-5 w-5" />
                      Trigger AI Sales Call
                    </>
                  )}
                </Button>
                {!scrapedData.extracted?.phones?.length && (
                  <p className="text-sm text-muted-foreground self-center">
                    No phone number found for this business
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recommended Sales Pitch */}
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Recommended Sales Pitch
                {analysisData.industry_name && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {analysisData.industry_name}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg italic">"{analysisData.recommended_pitch}"</p>
              {analysisData.follow_up_timing && (
                <p className="text-sm text-muted-foreground mt-3">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Recommended follow-up: {analysisData.follow_up_timing}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Revenue Opportunities & Operational Gaps */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Revenue Opportunities */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Revenue Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysisData.revenue_opportunities?.map((opp, index) => (
                  <div key={index} className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{opp.opportunity}</p>
                      <Badge className={getConfidenceBadge(opp.confidence)}>
                        {opp.confidence}
                      </Badge>
                    </div>
                    <p className="text-lg font-bold text-green-500 mt-1">{opp.estimated_value}</p>
                  </div>
                ))}
                {(!analysisData.revenue_opportunities || analysisData.revenue_opportunities.length === 0) && (
                  <p className="text-muted-foreground text-sm">No specific opportunities identified</p>
                )}
              </CardContent>
            </Card>

            {/* Operational Gaps */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Operational Gaps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysisData.operational_gaps?.map((gap, index) => (
                  <div key={index} className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{gap.gap}</p>
                      <Badge className={getImpactBadge(gap.impact)}>
                        {gap.impact} impact
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      <CheckCircle2 className="inline h-3 w-3 mr-1 text-green-500" />
                      {gap.solution}
                    </p>
                  </div>
                ))}
                {(!analysisData.operational_gaps || analysisData.operational_gaps.length === 0) && (
                  <p className="text-muted-foreground text-sm">No operational gaps identified</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Contact Info & Additional Details */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Extracted Contact Info */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {scrapedData.extracted?.phones?.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{scrapedData.extracted.phones.join(", ")}</p>
                    </div>
                  </div>
                )}
                {scrapedData.extracted?.emails?.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{scrapedData.extracted.emails.join(", ")}</p>
                    </div>
                  </div>
                )}
                {scrapedData.url && (
                  <div className="flex items-start gap-3">
                    <Globe className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Website</p>
                      <a 
                        href={scrapedData.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        {scrapedData.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}
                {!scrapedData.extracted?.has_contact_info && (
                  <p className="text-muted-foreground text-sm">No contact information found</p>
                )}
              </CardContent>
            </Card>

            {/* Key Decision Factors */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-muted-foreground" />
                  Key Decision Factors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysisData.key_decision_factors && analysisData.key_decision_factors.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {analysisData.key_decision_factors.map((factor, index) => (
                      <Badge key={index} variant="outline" className="py-1">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No decision factors identified</p>
                )}
                
                {analysisData.competitive_position && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-1">Competitive Position</p>
                    <p className="font-medium">{analysisData.competitive_position}</p>
                  </div>
                )}

                {scrapedData.extracted?.services?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-1">Services Detected</p>
                    <div className="flex flex-wrap gap-2">
                      {scrapedData.extracted.services.slice(0, 5).map((service, index) => (
                        <Badge key={index} variant="secondary" className="py-1">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
