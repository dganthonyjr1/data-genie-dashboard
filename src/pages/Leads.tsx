import { useState, useEffect } from "react";
import { Phone, Building2, TrendingDown, Loader2, Plus } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Lead {
  id: string;
  jobId: string;
  businessName: string;
  niche: string;
  phoneNumber: string;
  revenueLeak: number | null;
  painScore: number | null;
  evidenceSummary: string | null;
  isManual?: boolean;
}

const MAKE_WEBHOOK_URL = "https://hook.us2.make.com/w7c213pu9sygbum5kf8js7tf9432pt5s";

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [callingLeadId, setCallingLeadId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLead, setNewLead] = useState({ businessName: "", phoneNumber: "", niche: "" });
  const [isAddingLead, setIsAddingLead] = useState(false);
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
          } else if (result.businessName || result.name || result.title) {
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

      // Load manual leads from localStorage
      const storedManualLeads = localStorage.getItem("manualLeads");
      if (storedManualLeads) {
        const manualLeads: Lead[] = JSON.parse(storedManualLeads);
        extractedLeads.unshift(...manualLeads);
      }

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

  const handleAddLead = () => {
    if (!newLead.businessName.trim() || !newLead.phoneNumber.trim() || !newLead.niche.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsAddingLead(true);

    const manualLead: Lead = {
      id: `manual-${Date.now()}`,
      jobId: "manual",
      businessName: newLead.businessName.trim(),
      niche: newLead.niche.trim(),
      phoneNumber: newLead.phoneNumber.trim(),
      revenueLeak: null,
      painScore: null,
      evidenceSummary: null,
      isManual: true,
    };

    // Store in localStorage
    const storedManualLeads = localStorage.getItem("manualLeads");
    const manualLeads: Lead[] = storedManualLeads ? JSON.parse(storedManualLeads) : [];
    manualLeads.unshift(manualLead);
    localStorage.setItem("manualLeads", JSON.stringify(manualLeads));

    // Update state
    setLeads((prev) => [manualLead, ...prev]);
    setNewLead({ businessName: "", phoneNumber: "", niche: "" });
    setIsAddModalOpen(false);
    setIsAddingLead(false);

    toast({
      title: "Lead Added",
      description: `${manualLead.businessName} has been added to your leads`,
    });
  };

  const handleStartCall = async (lead: Lead) => {
    if (lead.phoneNumber === "N/A") {
      toast({
        title: "No Phone Number",
        description: "This lead doesn't have a valid phone number",
        variant: "destructive",
      });
      return;
    }

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
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold shadow-lg">
                <Plus className="mr-2 h-4 w-4" />
                Add New Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    placeholder="Enter business name"
                    value={newLead.businessName}
                    onChange={(e) => setNewLead((prev) => ({ ...prev, businessName: e.target.value }))}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    placeholder="Enter phone number"
                    value={newLead.phoneNumber}
                    onChange={(e) => setNewLead((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                    maxLength={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="niche">Niche</Label>
                  <Input
                    id="niche"
                    placeholder="e.g., Dental, MedSpa, Chiropractic"
                    value={newLead.niche}
                    onChange={(e) => setNewLead((prev) => ({ ...prev, niche: e.target.value }))}
                    maxLength={50}
                  />
                </div>
                <Button 
                  className="w-full mt-4" 
                  onClick={handleAddLead}
                  disabled={isAddingLead}
                >
                  {isAddingLead ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Lead"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                  Start scraping businesses or add leads manually
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Business Name</TableHead>
                      <TableHead className="min-w-[100px]">Niche</TableHead>
                      <TableHead className="min-w-[120px]">Phone Number</TableHead>
                      <TableHead className="min-w-[100px]">Revenue Leak</TableHead>
                      <TableHead className="sticky right-0 bg-background min-w-[180px] text-right shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {lead.businessName}
                            {lead.isManual && (
                              <Badge variant="outline" className="text-xs">Manual</Badge>
                            )}
                          </div>
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
                        <TableCell className="sticky right-0 bg-background text-right shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                            onClick={() => handleStartCall(lead)}
                            disabled={lead.phoneNumber === "N/A" || callingLeadId === lead.id}
                          >
                            {callingLeadId === lead.id ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                Calling...
                              </>
                            ) : (
                              <>
                                <Phone className="mr-1 h-3 w-3" />
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
