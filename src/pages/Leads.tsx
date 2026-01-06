import { useState, useEffect } from "react";
import { Phone, Building2, TrendingDown, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Lead {
  id: string;
  jobId: string;
  businessName: string;
  niche: string;
  phoneNumber: string;
  revenueLeak: number | null;
  painScore: number | null;
  evidenceSummary: string | null;
}

const MAKE_WEBHOOK_URL = "https://hook.us2.make.com/w7c213pu9sygbum5kf8js7tf9432pt5s";

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [callingLeadId, setCallingLeadId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: jobs, error } = await supabase
        .from("scraping_jobs")
        .select("id, results, scrape_type")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const extractedLeads: Lead[] = [];
      
      jobs?.forEach((job) => {
        const results = job.results as any[];
        if (!results || !Array.isArray(results)) return;

        results.forEach((result, index) => {
          // Handle complete_business_data scrape type
          if (job.scrape_type === "complete_business_data" && result.business_name) {
            extractedLeads.push({
              id: `${job.id}-${index}`,
              jobId: job.id,
              businessName: result.business_name || "Unknown",
              niche: result.niche || result.category || "General",
              phoneNumber: result.phone || result.phone_number || "N/A",
              revenueLeak: result.audit?.estimatedLeak || null,
              painScore: result.audit?.painScore || null,
              evidenceSummary: result.audit?.evidenceSummary || null,
            });
          }
          // Handle other formats with business name field variations
          else if (result.businessName || result.name || result.title) {
            extractedLeads.push({
              id: `${job.id}-${index}`,
              jobId: job.id,
              businessName: result.businessName || result.name || result.title || "Unknown",
              niche: result.niche || result.category || result.type || "General",
              phoneNumber: result.phone || result.phoneNumber || result.phone_number || "N/A",
              revenueLeak: result.audit?.estimatedLeak || result.revenueLeak || null,
              painScore: result.audit?.painScore || result.painScore || null,
              evidenceSummary: result.audit?.evidenceSummary || null,
            });
          }
        });
      });

      setLeads(extractedLeads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast({
        title: "Error loading leads",
        description: "Could not fetch your scraped businesses",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartCall = async (lead: Lead) => {
    setCallingLeadId(lead.id);
    
    try {
      const payload = {
        business_name: lead.businessName,
        phone_number: lead.phoneNumber,
        pain_score: lead.painScore || 0,
        evidence_summary: lead.evidenceSummary || "No audit data available",
        niche: lead.niche,
        revenue_leak: lead.revenueLeak || 0,
      };

      const response = await fetch(MAKE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to trigger webhook");
      }

      toast({
        title: "AI Sales Call Initiated",
        description: `Starting call to ${lead.businessName}`,
      });
    } catch (error) {
      console.error("Error starting call:", error);
      toast({
        title: "Call Failed",
        description: "Could not initiate the AI sales call",
        variant: "destructive",
      });
    } finally {
      setCallingLeadId(null);
    }
  };

  const formatRevenueLeak = (amount: number | null) => {
    if (amount === null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPainScoreBadge = (score: number | null) => {
    if (score === null) return <Badge variant="outline">Not Audited</Badge>;
    
    if (score >= 8) {
      return <Badge className="bg-red-500/10 text-red-600 border-red-200">Critical ({score})</Badge>;
    } else if (score >= 5) {
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Moderate ({score})</Badge>;
    } else {
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Low ({score})</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Leads Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage and contact your scraped business leads
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Card className="px-4 py-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{leads.length} Leads</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leads.length}</div>
              <p className="text-xs text-muted-foreground">From all scraping jobs</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">With Phone Numbers</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {leads.filter((l) => l.phoneNumber !== "N/A").length}
              </div>
              <p className="text-xs text-muted-foreground">Ready for outreach</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue Leak</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatRevenueLeak(
                  leads.reduce((sum, l) => sum + (l.revenueLeak || 0), 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">Estimated opportunity</p>
            </CardContent>
          </Card>
        </div>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">No leads yet</h3>
                <p className="text-muted-foreground mt-1">
                  Start scraping businesses to populate your leads dashboard
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Business Name</TableHead>
                      <TableHead>Niche</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Revenue Leak</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">
                          {lead.businessName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{lead.niche}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {lead.phoneNumber}
                        </TableCell>
                        <TableCell className="font-semibold text-red-600">
                          {formatRevenueLeak(lead.revenueLeak)}
                        </TableCell>
                        <TableCell>{getPainScoreBadge(lead.painScore)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="lg"
                            className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold shadow-lg"
                            onClick={() => handleStartCall(lead)}
                            disabled={lead.phoneNumber === "N/A" || callingLeadId === lead.id}
                          >
                            {callingLeadId === lead.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Calling...
                              </>
                            ) : (
                              <>
                                <Phone className="mr-2 h-4 w-4" />
                                Start AI Sales Call
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Leads;
