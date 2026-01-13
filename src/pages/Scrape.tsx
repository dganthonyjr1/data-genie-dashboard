import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { ScrapingTemplates } from "@/components/ScrapingTemplates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INDUSTRY_CONFIGS, INDUSTRY_OPTIONS, detectIndustryFromContent, getIndustryConfig } from "@/lib/industry-config";
import { 
  Search, Globe, FileText, MapPin, Upload, Loader2, 
  Building2, Sparkles, Phone, Target, Factory,
  CheckCircle2, ArrowRight, Users, Zap
} from "lucide-react";

interface ScrapeResult {
  url: string;
  facility_name: string;
  scraped_at: string;
  content: {
    markdown?: string;
    title?: string;
    description?: string;
  };
  extracted: {
    phones: string[];
    emails: string[];
    services: string[];
    has_contact_info: boolean;
  };
}

const Scrape = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("single");
  const [selectedIndustry, setSelectedIndustry] = useState("auto");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<"idle" | "scraping" | "detecting" | "analyzing">("idle");
  
  // Single URL state
  const [singleUrl, setSingleUrl] = useState("");
  const [businessName, setBusinessName] = useState("");
  
  // Bulk state
  const [bulkUrls, setBulkUrls] = useState("");
  const [bulkResults, setBulkResults] = useState<ScrapeResult[]>([]);
  
  // Google Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // Stats
  const [recentScrapes, setRecentScrapes] = useState<any[]>([]);

  useEffect(() => {
    fetchRecentScrapes();
  }, []);

  const fetchRecentScrapes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("facility_analysis")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentScrapes(data || []);
    } catch (error) {
      console.error("Error fetching recent scrapes:", error);
    }
  };

  const handleSingleScrape = async () => {
    if (!singleUrl.trim()) {
      toast({
        title: "Enter a URL",
        description: "Please enter a business website URL to scrape",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setCurrentStep("scraping");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in", variant: "destructive" });
        navigate("/login");
        return;
      }

      // Call scrape-facility Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-facility`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            url: singleUrl.trim(),
            facility_name: businessName.trim() || undefined,
          }),
        }
      );

      if (!response.ok) throw new Error("Scraping failed");

      const result = await response.json();
      
      toast({
        title: "Scrape Complete",
        description: `Successfully scraped ${result.data?.facility_name || "business"}`,
      });

      // Navigate to BusinessAnalyzer with data
      navigate("/dashboard", { state: { scrapedUrl: singleUrl, scrapedData: result.data } });
      
    } catch (error) {
      console.error("Error scraping:", error);
      toast({
        title: "Scrape Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setCurrentStep("idle");
    }
  };

  const handleBulkScrape = async () => {
    const urls = bulkUrls
      .split("\n")
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urls.length === 0) {
      toast({
        title: "No URLs provided",
        description: "Please enter at least one URL",
        variant: "destructive",
      });
      return;
    }

    // Redirect to bulk scrape page with URLs
    navigate("/bulk-scrape", { state: { urls } });
  };

  const handleGoogleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Enter a search query",
        description: "e.g., 'plumbers in Newark NJ'",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in", variant: "destructive" });
        return;
      }

      // Create a job for Google Business Profiles
      const { data: job, error } = await supabase
        .from("scraping_jobs")
        .insert({
          user_id: session.user.id,
          url: `${searchQuery}${searchLocation ? ` in ${searchLocation}` : ""}`,
          scrape_type: "google_business_profiles",
          status: "pending",
          target_state: searchLocation || undefined,
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger the scraping
      await supabase.functions.invoke("process-scrape", {
        body: { job_id: job.id },
      });

      toast({
        title: "Search Started",
        description: "Fetching Google Business Profiles...",
      });

      navigate("/results/" + job.id);

    } catch (error) {
      console.error("Error searching:", error);
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    navigate("/new-job", { state: { template } });
  };

  const getStepProgress = () => {
    switch (currentStep) {
      case "scraping": return 33;
      case "detecting": return 66;
      case "analyzing": return 100;
      default: return 0;
    }
  };

  const industries = INDUSTRY_OPTIONS.map(id => ({
    id,
    ...INDUSTRY_CONFIGS[id]
  }));

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold font-orbitron bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
              Universal Business Scraper
            </h1>
            <p className="text-muted-foreground mt-2">
              Scrape and analyze any business with AI-powered insights
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              AI-Powered
            </Badge>
            <Badge variant="secondary">
              {industries.length}+ Industries
            </Badge>
          </div>
        </div>

        {/* Industry Showcase */}
        <div className="flex gap-2 flex-wrap">
          {industries.slice(0, 6).map((industry) => (
            <Badge
              key={industry.id}
              variant={selectedIndustry === industry.id ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/10 transition-colors py-1.5"
              onClick={() => setSelectedIndustry(industry.id)}
            >
              <span className="mr-1">{industry.icon}</span>
              {industry.name}
            </Badge>
          ))}
          <Badge
            variant={selectedIndustry === "auto" ? "default" : "outline"}
            className="cursor-pointer hover:bg-primary/10 transition-colors py-1.5"
            onClick={() => setSelectedIndustry("auto")}
          >
            <Factory className="h-3 w-3 mr-1" />
            Auto-detect
          </Badge>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="single" className="gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Single URL</span>
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Bulk Import</span>
            </TabsTrigger>
            <TabsTrigger value="google" className="gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Google Search</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
          </TabsList>

          {/* Single URL Tab */}
          <TabsContent value="single" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  Scrape a Business Website
                </CardTitle>
                <CardDescription>
                  Enter any business URL to extract contact info, services, and get AI sales intelligence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <Input
                    type="url"
                    placeholder="https://example-business.com"
                    value={singleUrl}
                    onChange={(e) => setSingleUrl(e.target.value)}
                    className="md:col-span-2"
                    onKeyDown={(e) => e.key === "Enter" && handleSingleScrape()}
                  />
                  <Input
                    type="text"
                    placeholder="Business name (optional)"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-3 items-center">
                  <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        <span className="flex items-center gap-2">
                          <Factory className="h-4 w-4" />
                          Auto-detect
                        </span>
                      </SelectItem>
                      {industries.map((industry) => (
                        <SelectItem key={industry.id} value={industry.id}>
                          <span className="flex items-center gap-2">
                            <span>{industry.icon}</span>
                            {industry.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button 
                    onClick={handleSingleScrape} 
                    disabled={isLoading}
                    className="bg-gradient-to-r from-pink-500 to-cyan-500 hover:opacity-90"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scraping...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Scrape & Analyze
                      </>
                    )}
                  </Button>
                </div>

                {isLoading && (
                  <div className="space-y-2">
                    <Progress value={getStepProgress()} className="h-2" />
                    <p className="text-sm text-muted-foreground text-center">
                      {currentStep === "scraping" && "Extracting data from website..."}
                      {currentStep === "detecting" && "Detecting industry..."}
                      {currentStep === "analyzing" && "Running AI analysis..."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feature highlights */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <Phone className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">Contact Extraction</p>
                      <p className="text-sm text-muted-foreground">Phone, email, address</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Target className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">Lead Scoring</p>
                      <p className="text-sm text-muted-foreground">AI-powered qualification</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <Zap className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium">AI Sales Calls</p>
                      <p className="text-sm text-muted-foreground">One-click calling</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Bulk Import Tab */}
          <TabsContent value="bulk" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Bulk URL Import
                </CardTitle>
                <CardDescription>
                  Paste multiple URLs (one per line) or upload a CSV file to scrape in batch
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder={`https://business1.com\nhttps://business2.com\nhttps://business3.com`}
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                
                <div className="flex gap-3 items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {bulkUrls.split("\n").filter(u => u.trim()).length} URLs detected
                  </div>
                  
                  <div className="flex gap-3">
                    <Button variant="outline" className="gap-2">
                      <Upload className="h-4 w-4" />
                      Upload CSV
                    </Button>
                    <Button 
                      onClick={handleBulkScrape}
                      disabled={isLoading || !bulkUrls.trim()}
                      className="bg-gradient-to-r from-pink-500 to-cyan-500 hover:opacity-90"
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Start Bulk Scrape
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Google Search Tab */}
          <TabsContent value="google" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Google Business Search
                </CardTitle>
                <CardDescription>
                  Find verified businesses from Google Maps with ratings, reviews, and contact info
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <Input
                    type="text"
                    placeholder="e.g., plumbers, dentists, restaurants"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="md:col-span-2"
                    onKeyDown={(e) => e.key === "Enter" && handleGoogleSearch()}
                  />
                  <Input
                    type="text"
                    placeholder="Location (e.g., Newark NJ)"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 items-center">
                  <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-detect</SelectItem>
                      {industries.map((industry) => (
                        <SelectItem key={industry.id} value={industry.id}>
                          <span className="flex items-center gap-2">
                            <span>{industry.icon}</span>
                            {industry.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button 
                    onClick={handleGoogleSearch} 
                    disabled={isLoading}
                    className="bg-gradient-to-r from-pink-500 to-cyan-500 hover:opacity-90"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Search Google
                      </>
                    )}
                  </Button>
                </div>

                {/* Example searches */}
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground mb-2">Popular searches:</p>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      "plumbers in Newark NJ",
                      "dentists in Los Angeles",
                      "restaurants in Miami",
                      "law firms in Chicago",
                    ].map((example) => (
                      <Badge
                        key={example}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10"
                        onClick={() => {
                          const parts = example.split(" in ");
                          setSearchQuery(parts[0]);
                          setSearchLocation(parts[1] || "");
                        }}
                      >
                        {example}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Scraping Templates
                </CardTitle>
                <CardDescription>
                  Pre-configured templates for common scraping use cases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrapingTemplates 
                  onSelectTemplate={handleTemplateSelect}
                  selectedTemplateId={selectedTemplate?.id}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Recent Scrapes */}
        {recentScrapes.length > 0 && (
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                Recent Scrapes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {recentScrapes.map((scrape) => (
                  <Card 
                    key={scrape.id} 
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => navigate("/leads")}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium truncate">{scrape.facility_name}</p>
                          <p className="text-sm text-muted-foreground truncate">{scrape.url}</p>
                        </div>
                        {scrape.lead_score && (
                          <Badge variant={scrape.lead_score >= 70 ? "default" : "secondary"}>
                            {scrape.lead_score}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Scrape;
