import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Loader2, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  Clock, 
  Building2,
  AlertTriangle,
  DollarSign,
  Quote,
  Facebook,
  Instagram,
  Linkedin,
  ExternalLink
} from "lucide-react";

interface BusinessData {
  business_name?: string;
  niche?: string;
  phone_numbers?: string[] | string;
  emails?: string[] | string;
  addresses?: string[] | string;
  website_url?: string;
  hours_of_operation?: string;
  about_or_description?: string;
  services_or_products?: string;
  social_links?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    [key: string]: string | undefined;
  };
  audit_pain_score?: number;
  audit_evidence_1?: string;
  audit_evidence_2?: string;
  audit_calculated_leak?: string;
}

export default function BusinessAnalyzer() {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);

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
    setBusinessData(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not logged in",
          description: "Please log in to analyze businesses",
          variant: "destructive",
        });
        return;
      }

      // Create a scraping job
      const { data: job, error: createError } = await supabase
        .from("scraping_jobs")
        .insert({
          user_id: user.id,
          url: url.trim(),
          scrape_type: "complete_business_data",
          status: "pending",
        })
        .select()
        .single();

      if (createError) throw createError;

      // Trigger the scrape
      const { error: invokeError } = await supabase.functions.invoke("process-scrape", {
        body: { jobId: job.id },
      });

      if (invokeError) throw invokeError;

      // Poll for results
      let attempts = 0;
      const maxAttempts = 30;
      
      const pollInterval = setInterval(async () => {
        attempts++;
        
        const { data: updatedJob } = await supabase
          .from("scraping_jobs")
          .select("status, results")
          .eq("id", job.id)
          .single();

        if (updatedJob?.status === "completed" && updatedJob.results) {
          const results = updatedJob.results as unknown as BusinessData[];
          if (Array.isArray(results) && results.length > 0) {
            clearInterval(pollInterval);
            setBusinessData(results[0]);
            setIsAnalyzing(false);
            toast({
              title: "Analysis Complete",
              description: "Business data has been extracted successfully",
            });
          }
        } else if (updatedJob?.status === "failed" || attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setIsAnalyzing(false);
          toast({
            title: "Analysis Failed",
            description: "Could not extract business data. Try a different URL.",
            variant: "destructive",
          });
        }
      }, 2000);

    } catch (error) {
      console.error("Error analyzing business:", error);
      setIsAnalyzing(false);
      toast({
        title: "Error",
        description: "Failed to analyze business. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStartCall = async () => {
    if (!businessData) return;

    const phoneNumber = Array.isArray(businessData.phone_numbers) 
      ? businessData.phone_numbers[0] 
      : businessData.phone_numbers || "";

    if (!phoneNumber) {
      toast({
        title: "No Phone Number",
        description: "This business doesn't have a phone number on file",
        variant: "destructive",
      });
      return;
    }

    setIsCalling(true);

    try {
      await fetch("https://hook.us2.make.com/w7c213pu9sygbum5kf8js7tf9432pt5s", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "no-cors",
        body: JSON.stringify({
          business_name: businessData.business_name || "",
          phone_number: phoneNumber,
          pain_score: businessData.audit_pain_score || null,
          evidence_summary: [businessData.audit_evidence_1, businessData.audit_evidence_2]
            .filter(Boolean)
            .join(" | "),
        }),
      });

      toast({
        title: "Call Initiated",
        description: "AI sales call has been triggered. Check Make.com for status.",
      });
    } catch (error) {
      console.error("Error triggering call:", error);
      toast({
        title: "Error",
        description: "Failed to trigger call. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCalling(false);
    }
  };

  const getPhoneDisplay = () => {
    if (!businessData?.phone_numbers) return null;
    if (Array.isArray(businessData.phone_numbers)) {
      return businessData.phone_numbers.join(", ");
    }
    return businessData.phone_numbers;
  };

  const getEmailDisplay = () => {
    if (!businessData?.emails) return null;
    if (Array.isArray(businessData.emails)) {
      return businessData.emails.join(", ");
    }
    return businessData.emails;
  };

  const getAddressDisplay = () => {
    if (!businessData?.addresses) return null;
    if (Array.isArray(businessData.addresses)) {
      return businessData.addresses.join(", ");
    }
    return businessData.addresses;
  };

  const getPainScoreColor = (score: number) => {
    if (score >= 8) return "text-red-500";
    if (score >= 5) return "text-orange-500";
    return "text-green-500";
  };

  const getPainScoreBadge = (score: number) => {
    if (score >= 8) return { label: "High Risk", variant: "destructive" as const };
    if (score >= 5) return { label: "Medium Risk", variant: "default" as const };
    return { label: "Low Risk", variant: "secondary" as const };
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
            Enter a business website URL to extract contact info, services, and revenue leak analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              type="url"
              placeholder="https://example-business.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            />
            <Button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-pink-500 to-cyan-500 hover:opacity-90 px-8"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
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
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Analyzing business website...</p>
              <p className="text-sm text-muted-foreground">
                Extracting contact info, services, and checking for revenue leaks
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {businessData && !isAnalyzing && (
        <div className="space-y-4">
          {/* Business Header */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    {businessData.business_name || "Unknown Business"}
                  </h2>
                  {businessData.niche && (
                    <Badge variant="secondary" className="mt-2">
                      {businessData.niche}
                    </Badge>
                  )}
                  {businessData.about_or_description && (
                    <p className="text-muted-foreground mt-3 max-w-2xl">
                      {businessData.about_or_description}
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleStartCall}
                  disabled={isCalling}
                  size="lg"
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90"
                >
                  {isCalling ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Calling...
                    </>
                  ) : (
                    <>
                      <Phone className="mr-2 h-5 w-5" />
                      Start AI Sales Call
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contact & Business Info Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Contact Information */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {getPhoneDisplay() && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{getPhoneDisplay()}</p>
                    </div>
                  </div>
                )}
                {getEmailDisplay() && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{getEmailDisplay()}</p>
                    </div>
                  </div>
                )}
                {getAddressDisplay() && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{getAddressDisplay()}</p>
                    </div>
                  </div>
                )}
                {businessData.website_url && (
                  <div className="flex items-start gap-3">
                    <Globe className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Website</p>
                      <a 
                        href={businessData.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        {businessData.website_url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}
                {businessData.hours_of_operation && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Hours</p>
                      <p className="font-medium">{businessData.hours_of_operation}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Services & Social */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Services & Social</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {businessData.services_or_products && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Services/Products</p>
                    <p className="font-medium">{businessData.services_or_products}</p>
                  </div>
                )}
                {businessData.social_links && Object.keys(businessData.social_links).length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Social Media</p>
                    <div className="flex gap-3">
                      {businessData.social_links.facebook && (
                        <a 
                          href={businessData.social_links.facebook} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                        >
                          <Facebook className="h-5 w-5 text-blue-500" />
                        </a>
                      )}
                      {businessData.social_links.instagram && (
                        <a 
                          href={businessData.social_links.instagram} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 transition-colors"
                        >
                          <Instagram className="h-5 w-5 text-pink-500" />
                        </a>
                      )}
                      {businessData.social_links.linkedin && (
                        <a 
                          href={businessData.social_links.linkedin} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 transition-colors"
                        >
                          <Linkedin className="h-5 w-5 text-blue-600" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Revenue Leak Analysis */}
          {businessData.audit_pain_score !== undefined && (
            <Card className="bg-card/50 border-border/50 border-2 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Revenue Leak Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Pain Score */}
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Pain Score</p>
                    <p className={`text-4xl font-bold ${getPainScoreColor(businessData.audit_pain_score)}`}>
                      {businessData.audit_pain_score}
                      <span className="text-lg text-muted-foreground">/10</span>
                    </p>
                    <Badge 
                      variant={getPainScoreBadge(businessData.audit_pain_score).variant}
                      className="mt-2"
                    >
                      {getPainScoreBadge(businessData.audit_pain_score).label}
                    </Badge>
                  </div>

                  {/* Revenue Leak */}
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Estimated Monthly Leak</p>
                    <p className="text-4xl font-bold text-red-500">
                      {businessData.audit_calculated_leak || "$0"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Based on missed call analysis
                    </p>
                  </div>

                  {/* Evidence */}
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                      <Quote className="h-4 w-4" />
                      Customer Complaints
                    </p>
                    <div className="space-y-2">
                      {businessData.audit_evidence_1 && (
                        <p className="text-sm italic">"{businessData.audit_evidence_1}"</p>
                      )}
                      {businessData.audit_evidence_2 && (
                        <p className="text-sm italic">"{businessData.audit_evidence_2}"</p>
                      )}
                      {!businessData.audit_evidence_1 && !businessData.audit_evidence_2 && (
                        <p className="text-sm text-muted-foreground">No complaints found</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
