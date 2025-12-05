import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { JobScheduleConfig } from "@/components/JobScheduleConfig";
import { Globe, Search, Info } from "lucide-react";

// Country codes for geo-targeting
const COUNTRIES = [
  { code: '', name: 'Any Location' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'IN', name: 'India' },
  { code: 'JP', name: 'Japan' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
];

// US States for more specific targeting
const US_STATES = [
  { code: '', name: 'Any State' },
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'Washington D.C.' },
];

const formSchema = z.object({
  url: z.string()
    .min(1, { message: "Please enter a URL or search query" })
    .transform((val) => {
      // Auto-add https:// if no protocol is specified (skip for search queries)
      if (val && !val.match(/^https?:\/\//i) && val.includes('.')) {
        return `https://${val}`;
      }
      return val;
    }),
  scrapeType: z.enum(["complete_business_data", "bulk_business_search", "google_business_profiles", "emails", "phone_numbers", "text_content", "tables", "custom_ai_extraction"]),
  aiInstructions: z.string().optional(),
  targetCountry: z.string().optional(),
  targetState: z.string().optional(),
  searchLimit: z.number().optional(),
});

type FormData = z.infer<typeof formSchema>;

// Helper to detect if input is a URL
const isValidUrl = (str: string): boolean => {
  if (!str) return false;
  try {
    const cleaned = str.replace(/^["']|["']$/g, '').trim();
    // Check if it looks like a URL (has protocol or starts with www. or contains common TLD patterns)
    if (cleaned.match(/^https?:\/\//i)) {
      new URL(cleaned);
      return true;
    }
    if (cleaned.match(/^www\./i) || cleaned.match(/\.(com|org|net|io|co|gov|edu|info|biz)[\/\s]?$/i)) {
      new URL(`https://${cleaned}`);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

const NewJob = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState("daily");
  const [scheduleInterval, setScheduleInterval] = useState(1);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      scrapeType: "complete_business_data",
      aiInstructions: "",
      targetCountry: "",
      targetState: "",
      searchLimit: 20,
    },
  });

  const selectedScrapeType = form.watch("scrapeType");
  const urlValue = form.watch("url");
  const isBulkSearch = selectedScrapeType === "bulk_business_search" || selectedScrapeType === "google_business_profiles";
  
  // Detect input type for complete_business_data
  const inputType = useMemo(() => {
    if (!urlValue) return null;
    return isValidUrl(urlValue) ? 'url' : 'search';
  }, [urlValue]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to create a job",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      // Calculate next run time if scheduling is enabled
      let nextRunAt = null;
      if (scheduleEnabled) {
        const now = new Date();
        switch (scheduleFrequency) {
          case "hourly":
            now.setHours(now.getHours() + scheduleInterval);
            break;
          case "daily":
            now.setDate(now.getDate() + scheduleInterval);
            break;
          case "weekly":
            now.setDate(now.getDate() + (scheduleInterval * 7));
            break;
        }
        nextRunAt = now.toISOString();
      }

      const { data: jobData, error } = await supabase.from("scraping_jobs").insert({
        url: data.url,
        scrape_type: data.scrapeType,
        ai_instructions: data.aiInstructions || null,
        user_id: user.id,
        status: "pending",
        schedule_enabled: scheduleEnabled,
        schedule_frequency: scheduleEnabled ? scheduleFrequency : null,
        schedule_interval: scheduleEnabled ? scheduleInterval : null,
        next_run_at: nextRunAt,
        target_country: data.targetCountry && data.targetCountry !== 'none' ? data.targetCountry : null,
        target_state: data.targetState && data.targetState !== 'none' ? data.targetState : null,
        search_limit: data.searchLimit || 20,
      }).select().single();

      if (error) throw error;

      // Trigger the scraping process for immediate execution
      const { error: scrapeError } = await supabase.functions.invoke('process-scrape', {
        body: { jobId: jobData.id }
      });

      if (scrapeError) {
        console.error('Error starting scrape:', scrapeError);
        toast({
          title: "Job created but scraping failed",
          description: "The job was created but could not be processed",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Job created successfully",
          description: scheduleEnabled 
            ? `Your scraping job is being processed and will run ${scheduleFrequency}`
            : "Your scraping job is being processed",
        });
      }

      navigate("/jobs");
    } catch (error) {
      console.error("Error creating job:", error);
      toast({
        title: "Error creating job",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-3xl font-bold font-orbitron bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
              Add New Scraping Job
            </CardTitle>
            <CardDescription>
              Enter the URL and configure your scraping preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {isBulkSearch ? "Search Query" : selectedScrapeType === "complete_business_data" ? "URL or Search Query" : "Target URL"}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder={
                              isBulkSearch 
                                ? "e.g., plumbers in Newark NJ" 
                                : selectedScrapeType === "complete_business_data"
                                  ? "https://example.com or 'restaurants in Atlanta'"
                                  : "https://example.com"
                            }
                            {...field}
                            className="bg-background/50 pr-10"
                          />
                          {urlValue && selectedScrapeType === "complete_business_data" && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {inputType === 'url' ? (
                                <Globe className="h-4 w-4 text-cyan-500" />
                              ) : (
                                <Search className="h-4 w-4 text-pink-500" />
                              )}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      
                      {/* Context-aware help text */}
                      {selectedScrapeType === "complete_business_data" && (
                        <div className="space-y-1">
                          {inputType === 'url' ? (
                            <p className="text-xs text-cyan-500 flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              Will scrape business data from this website
                            </p>
                          ) : inputType === 'search' ? (
                            <p className="text-xs text-pink-500 flex items-center gap-1">
                              <Search className="h-3 w-3" />
                              Will search the web and extract business data from results
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Info className="h-3 w-3" />
                              Enter a URL to scrape a specific site, or a search query like "black owned businesses in Atlanta"
                            </p>
                          )}
                        </div>
                      )}
                      
                      {isBulkSearch && (
                        <p className="text-xs text-muted-foreground">
                          Enter a search query like "plumbers in NJ" or "restaurants in London"
                        </p>
                      )}
                      
                      {!isBulkSearch && selectedScrapeType !== "complete_business_data" && (
                        <p className="text-xs text-muted-foreground">
                          Enter a valid URL starting with https://
                        </p>
                      )}
                      
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scrapeType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scrape Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background/50">
                            <SelectValue placeholder="Select scrape type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover z-50">
                          <SelectItem value="google_business_profiles">
                            <span className="flex items-center gap-2">
                              <span className="text-xs bg-gradient-to-r from-green-500 to-blue-500 text-white px-1.5 py-0.5 rounded">NEW</span>
                              Google Business Profiles
                            </span>
                          </SelectItem>
                          <SelectItem value="bulk_business_search">
                            <span className="flex items-center gap-2">
                              <span className="text-xs bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-1.5 py-0.5 rounded">HOT</span>
                              Bulk Business Search
                            </span>
                          </SelectItem>
                          <SelectItem value="complete_business_data">
                            <span className="flex items-center gap-2">
                              <span className="text-xs bg-gradient-to-r from-pink-500 to-cyan-500 text-white px-1.5 py-0.5 rounded">NEW</span>
                              Complete Business Data
                            </span>
                          </SelectItem>
                          <SelectItem value="emails">Email Addresses</SelectItem>
                          <SelectItem value="phone_numbers">Phone Numbers</SelectItem>
                          <SelectItem value="text_content">Text Content</SelectItem>
                          <SelectItem value="tables">Tables</SelectItem>
                          <SelectItem value="custom_ai_extraction">Custom AI Extraction</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isBulkSearch && (
                  <FormField
                    control={form.control}
                    name="searchLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Results</FormLabel>
                        <Select 
                          onValueChange={(val) => field.onChange(parseInt(val))} 
                          defaultValue={String(field.value || 20)}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-background/50">
                              <SelectValue placeholder="Select limit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-popover z-50">
                            <SelectItem value="10">10 businesses</SelectItem>
                            <SelectItem value="20">20 businesses</SelectItem>
                            <SelectItem value="50">50 businesses</SelectItem>
                            <SelectItem value="100">100 businesses</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {selectedScrapeType === "google_business_profiles" 
                            ? "Scrapes Google Maps business profiles directly"
                            : "More results = longer processing time"}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch("scrapeType") === "custom_ai_extraction" && (
                  <FormField
                    control={form.control}
                    name="aiInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>AI Instructions</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe what you want to extract..."
                            className="bg-background/50 min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Location Targeting */}
                <div className="space-y-4 p-4 rounded-lg border border-border/50 bg-background/30">
                  <h3 className="text-sm font-medium text-muted-foreground">Target Location (Optional)</h3>
                  <p className="text-xs text-muted-foreground">
                    Specify a location for geo-targeted scraping and location-aware phone validation
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="targetCountry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background/50">
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-popover z-50 max-h-[300px]">
                              {COUNTRIES.map((country) => (
                                <SelectItem key={country.code || 'any'} value={country.code || 'none'}>
                                  {country.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("targetCountry") === "US" && (
                      <FormField
                        control={form.control}
                        name="targetState"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-popover z-50 max-h-[300px]">
                                {US_STATES.map((state) => (
                                  <SelectItem key={state.code || 'any'} value={state.code || 'none'}>
                                    {state.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                <JobScheduleConfig
                  scheduleEnabled={scheduleEnabled}
                  scheduleFrequency={scheduleFrequency}
                  scheduleInterval={scheduleInterval}
                  onScheduleEnabledChange={setScheduleEnabled}
                  onScheduleFrequencyChange={setScheduleFrequency}
                  onScheduleIntervalChange={setScheduleInterval}
                />

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 hover:opacity-90 transition-opacity"
                >
                  {isSubmitting ? "Creating..." : "Start Scrape"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default NewJob;
