import { useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Search, Globe, Loader2 } from "lucide-react";

const Scrape = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<"idle" | "scraping" | "detecting" | "analyzing">("idle");
  
  const [singleUrl, setSingleUrl] = useState("");
  const [businessName, setBusinessName] = useState("");

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

  const getStepProgress = () => {
    switch (currentStep) {
      case "scraping": return 33;
      case "detecting": return 66;
      case "analyzing": return 100;
      default: return 0;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-orbitron bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
            Scrape a Business
          </h1>
          <p className="text-muted-foreground mt-2">
            Extract contact info and get AI-powered sales intelligence from any business website
          </p>
        </div>

        {/* Main Card */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Enter Business URL
            </CardTitle>
            <CardDescription>
              We'll extract phone, email, services, and provide AI-driven insights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Input
                type="url"
                placeholder="https://example-business.com"
                value={singleUrl}
                onChange={(e) => setSingleUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSingleScrape()}
              />
              <Input
                type="text"
                placeholder="Business name (optional)"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
            
            <Button 
              onClick={handleSingleScrape} 
              disabled={isLoading}
              size="lg"
              className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 hover:opacity-90"
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
      </div>
    </DashboardLayout>
  );
};

export default Scrape;
