import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrapingTemplates } from "@/components/ScrapingTemplates";
import { Globe, Search, Info, AlertTriangle, Lightbulb, MapPin, ChevronDown, Sparkles, Settings2, Webhook } from "lucide-react";
import { COUNTRIES, getRegionsForCountry, getRegionLabel } from "@/lib/international-regions";

const formSchema = z.object({
  url: z.string()
    .min(1, { message: "Please enter a URL or search query" })
    .transform((val) => {
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
  autoPaginate: z.boolean().optional(),
  maxPages: z.number().optional(),
  webhookUrl: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// Helper to detect if input is a URL
const isValidUrl = (str: string): boolean => {
  if (!str) return false;
  try {
    const cleaned = str.replace(/^["']|["']$/g, '').trim();
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

// Detect placeholder patterns in search queries
const detectPlaceholders = (query: string): { hasPlaceholder: boolean; placeholders: string[]; suggestion: string } => {
  const placeholderPatterns = [
    /\[city\]/gi, /\[state\]/gi, /\[location\]/gi, /\[area\]/gi, /\[region\]/gi,
    /\[town\]/gi, /\[neighborhood\]/gi, /\{city\}/gi, /\{state\}/gi, /<city>/gi, /<state>/gi,
  ];
  
  const foundPlaceholders: string[] = [];
  let suggestion = query;
  
  for (const pattern of placeholderPatterns) {
    const matches = query.match(pattern);
    if (matches) {
      foundPlaceholders.push(...matches);
    }
  }
  
  suggestion = suggestion
    .replace(/\[(city|town|neighborhood)\]/gi, 'Atlanta')
    .replace(/\[(state|region)\]/gi, 'Georgia')
    .replace(/\[(location|area)\]/gi, 'Atlanta, GA')
    .replace(/\{(city|town)\}/gi, 'Atlanta')
    .replace(/\{(state|region)\}/gi, 'Georgia')
    .replace(/<(city|state|location)>/gi, 'Atlanta, GA');
  
  return { hasPlaceholder: foundPlaceholders.length > 0, placeholders: foundPlaceholders, suggestion };
};

// Check if query looks like a business search
const isBusinessSearchQuery = (query: string): boolean => {
  if (!query || isValidUrl(query)) return false;
  
  const businessIndicators = [
    /business(es)?/i, /restaurant(s)?/i, /plumber(s)?/i, /lawyer(s)?/i, /dentist(s)?/i,
    /doctor(s)?/i, /shop(s)?/i, /store(s)?/i, /salon(s)?/i, /contractor(s)?/i,
    /company|companies/i, /owned/i, /service(s)?/i, /\bin\b.*\b(city|town|state|\w{2})\b/i,
  ];
  
  return businessIndicators.some(pattern => pattern.test(query));
};

const NewJob = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState("daily");
  const [scheduleInterval, setScheduleInterval] = useState(1);
  const [showTemplates, setShowTemplates] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
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
      autoPaginate: false,
      maxPages: 10,
      webhookUrl: "",
    },
  });

  const selectedScrapeType = form.watch("scrapeType");
  const urlValue = form.watch("url");
  const autoPaginate = form.watch("autoPaginate");
  const isBulkSearch = selectedScrapeType === "bulk_business_search" || selectedScrapeType === "google_business_profiles";
  
  const inputType = useMemo(() => {
    if (!urlValue) return null;
    return isValidUrl(urlValue) ? 'url' : 'search';
  }, [urlValue]);
  
  const placeholderAnalysis = useMemo(() => {
    if (!urlValue || isValidUrl(urlValue)) return { hasPlaceholder: false, placeholders: [], suggestion: '' };
    return detectPlaceholders(urlValue);
  }, [urlValue]);
  
  const shouldRecommendGoogleProfiles = useMemo(() => {
    if (!urlValue || isValidUrl(urlValue)) return false;
    if (selectedScrapeType === 'google_business_profiles') return false;
    return isBusinessSearchQuery(urlValue);
  }, [urlValue, selectedScrapeType]);

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    form.setValue('scrapeType', template.scrape_type);
    if (template.ai_instructions) {
      form.setValue('aiInstructions', template.ai_instructions);
    }
    setShowTemplates(false);
    toast({
      title: "Template applied",
      description: `Using "${template.name}" template`,
    });
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({ title: "Authentication required", description: "Please log in to create a job", variant: "destructive" });
        navigate("/login");
        return;
      }

      let nextRunAt = null;
      if (scheduleEnabled) {
        const now = new Date();
        switch (scheduleFrequency) {
          case "hourly": now.setHours(now.getHours() + scheduleInterval); break;
          case "daily": now.setDate(now.getDate() + scheduleInterval); break;
          case "weekly": now.setDate(now.getDate() + (scheduleInterval * 7)); break;
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
        auto_paginate: data.autoPaginate || false,
        max_pages: data.maxPages || 10,
        webhook_url: data.webhookUrl || null,
        template_id: selectedTemplate?.id || null,
      }).select().single();

      if (error) throw error;

      const { error: scrapeError } = await supabase.functions.invoke('process-scrape', {
        body: { jobId: jobData.id }
      });

      if (scrapeError) {
        console.error('Error starting scrape:', scrapeError);
        toast({ title: "Job created but scraping failed", description: "The job was created but could not be processed", variant: "destructive" });
      } else {
        toast({
          title: "Job created successfully",
          description: scheduleEnabled ? `Your scraping job is being processed and will run ${scheduleFrequency}` : "Your scraping job is being processed",
        });
      }

      navigate("/jobs");
    } catch (error) {
      console.error("Error creating job:", error);
      toast({ title: "Error creating job", description: "Please try again later", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Templates Section */}
          <Collapsible open={showTemplates} onOpenChange={setShowTemplates}>
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">Quick Start Templates</CardTitle>
                        <CardDescription>Choose a pre-configured template for common use cases</CardDescription>
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
                  </div>
                  {selectedTemplate && !showTemplates && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Using:</span>
                      <span className="text-primary font-medium">{selectedTemplate.name}</span>
                    </div>
                  )}
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <ScrapingTemplates 
                    onSelectTemplate={handleTemplateSelect}
                    selectedTemplateId={selectedTemplate?.id}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Main Form */}
          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-2xl font-bold font-orbitron bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
                Configure Scraping Job
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
                        
                        {placeholderAnalysis.hasPlaceholder && (
                          <Alert variant="destructive" className="mt-2 border-destructive/50 bg-destructive/10">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                              <strong>Replace placeholders with real locations!</strong><br />
                              Found: {placeholderAnalysis.placeholders.join(', ')}<br />
                              <span className="text-muted-foreground">Try: "{placeholderAnalysis.suggestion}"</span>
                              <Button type="button" variant="link" size="sm" className="p-0 h-auto ml-2 text-primary"
                                onClick={() => form.setValue('url', placeholderAnalysis.suggestion)}>
                                Use suggestion
                              </Button>
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        {shouldRecommendGoogleProfiles && !placeholderAnalysis.hasPlaceholder && (
                          <Alert className="mt-2 border-green-500/50 bg-green-500/10">
                            <Lightbulb className="h-4 w-4 text-green-500" />
                            <AlertDescription className="text-sm">
                              <strong className="text-green-500">Tip: Use Google Business Profiles for better results!</strong><br />
                              <span className="text-muted-foreground">
                                For finding actual businesses with contact info, Google Business Profiles provides more accurate data from Google Maps.
                              </span>
                              <Button type="button" variant="link" size="sm" className="p-0 h-auto ml-2 text-green-500"
                                onClick={() => form.setValue('scrapeType', 'google_business_profiles')}>
                                Switch to Google Business Profiles
                              </Button>
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        {selectedScrapeType === "complete_business_data" && !placeholderAnalysis.hasPlaceholder && (
                          <div className="space-y-1">
                            {inputType === 'url' ? (
                              <p className="text-xs text-cyan-500 flex items-center gap-1">
                                <Globe className="h-3 w-3" /> Will scrape business data from this website
                              </p>
                            ) : inputType === 'search' ? (
                              <p className="text-xs text-pink-500 flex items-center gap-1">
                                <Search className="h-3 w-3" /> Will search the web and extract business data from results
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Info className="h-3 w-3" /> Enter a URL to scrape a specific site, or a search query like "black owned businesses in Atlanta"
                              </p>
                            )}
                          </div>
                        )}
                        
                        {isBulkSearch && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Enter a search query like "plumbers in Newark, NJ" or "restaurants in London"
                          </p>
                        )}
                        
                        {!isBulkSearch && selectedScrapeType !== "complete_business_data" && (
                          <p className="text-xs text-muted-foreground">Enter a valid URL starting with https://</p>
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
                        <Select onValueChange={field.onChange} value={field.value}>
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
                                <span className="text-xs bg-gradient-to-r from-pink-500 to-cyan-500 text-white px-1.5 py-0.5 rounded">PRO</span>
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
                          <Select onValueChange={(val) => field.onChange(parseInt(val))} value={String(field.value || 20)}>
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

                      {(() => {
                        const targetCountry = form.watch("targetCountry");
                        const regions = targetCountry ? getRegionsForCountry(targetCountry) : null;
                        if (!regions) return null;
                        return (
                          <FormField
                            control={form.control}
                            name="targetState"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{getRegionLabel(targetCountry)}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="bg-background/50">
                                      <SelectValue placeholder={`Select ${getRegionLabel(targetCountry).toLowerCase()}`} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-popover z-50 max-h-[300px]">
                                    {regions.map((region) => (
                                      <SelectItem key={region.code || 'any'} value={region.code || 'none'}>
                                        {region.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        );
                      })()}
                    </div>
                  </div>

                  {/* Advanced Options */}
                  <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/30 cursor-pointer hover:bg-background/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <Settings2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Advanced Options</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 mt-4">
                      {/* Auto-pagination */}
                      {!isBulkSearch && (
                        <div className="space-y-4 p-4 rounded-lg border border-border/50 bg-background/30">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-sm font-medium">Auto-Pagination</Label>
                              <p className="text-xs text-muted-foreground">
                                Automatically follow pagination links to scrape multiple pages
                              </p>
                            </div>
                            <Switch
                              checked={autoPaginate}
                              onCheckedChange={(checked) => form.setValue('autoPaginate', checked)}
                            />
                          </div>
                          
                          {autoPaginate && (
                            <FormField
                              control={form.control}
                              name="maxPages"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Max Pages to Scrape</FormLabel>
                                  <Select onValueChange={(val) => field.onChange(parseInt(val))} value={String(field.value || 10)}>
                                    <FormControl>
                                      <SelectTrigger className="bg-background/50">
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="bg-popover z-50">
                                      <SelectItem value="5">5 pages</SelectItem>
                                      <SelectItem value="10">10 pages</SelectItem>
                                      <SelectItem value="25">25 pages</SelectItem>
                                      <SelectItem value="50">50 pages</SelectItem>
                                      <SelectItem value="100">100 pages</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      )}

                      {/* Webhook URL */}
                      <div className="space-y-4 p-4 rounded-lg border border-border/50 bg-background/30">
                        <div className="flex items-center gap-2">
                          <Webhook className="h-4 w-4 text-cyan-500" />
                          <Label className="text-sm font-medium">Webhook URL (Optional)</Label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Send results to this URL when the job completes
                        </p>
                        <FormField
                          control={form.control}
                          name="webhookUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  placeholder="https://your-app.com/webhook"
                                  className="bg-background/50"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

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
      </div>
    </DashboardLayout>
  );
};

export default NewJob;
