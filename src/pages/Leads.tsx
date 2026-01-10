import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, Building2, TrendingDown, Loader2, Plus, Search, Pencil, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, AlertTriangle, DollarSign, Trash2, Square, CheckSquare, Mail, ShieldCheck, Play } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import DashboardLayout from "@/components/DashboardLayout";
import { EmailVerificationBadge, BulkEmailVerifier } from "@/components/EmailVerification";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDemoMode } from "@/contexts/DemoModeContext";

const PRACTICE_TYPES = [
  { value: "Dental", revenue: 75000 },
  { value: "Chiropractic", revenue: 40000 },
  { value: "General Practice", revenue: 120000 },
  { value: "Dermatology", revenue: 150000 },
  { value: "Orthopedics", revenue: 200000 },
  { value: "Plastic Surgery", revenue: 175000 },
  { value: "Pediatrics", revenue: 80000 },
  { value: "Optometry", revenue: 60000 },
  { value: "Psychiatry / Psychiatrists", revenue: 100000 },
] as const;

const getDefaultRevenue = (niche: string): number => {
  const found = PRACTICE_TYPES.find(
    (pt) => pt.value.toLowerCase() === niche.toLowerCase().trim()
  );
  return found?.revenue ?? 50000;
};

interface EmailVerificationResult {
  email: string;
  is_valid: boolean;
  status: 'valid' | 'invalid' | 'risky' | 'unknown';
  reason?: string;
  checks: {
    syntax_valid: boolean;
    mx_valid: boolean;
    is_disposable: boolean;
    is_role_based: boolean;
    is_free_provider: boolean;
    has_typo_suggestion: boolean;
    typo_suggestion?: string;
  };
  score: number;
  verified_at: string;
}

interface Lead {
  id: string;
  jobId: string;
  businessName: string;
  niche: string;
  phoneNumber: string;
  email?: string;
  emailVerification?: EmailVerificationResult;
  monthlyRevenue: number | null;
  revenueLeak: number | null;
  painScore: number | null;
  evidenceSummary: string | null;
  isManual?: boolean;
}



const Leads = () => {
  const { isDemoMode, demoLeads } = useDemoMode();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [callingLeadId, setCallingLeadId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLead, setNewLead] = useState({ businessName: "", phoneNumber: "", niche: "", monthlyRevenue: "" });
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const [isAllLeadsOpen, setIsAllLeadsOpen] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const navigate = useNavigate();

  // Transform demo leads to Lead interface
  const transformedDemoLeads: Lead[] = useMemo(() => 
    demoLeads.map(dl => ({
      id: dl.id,
      jobId: "demo-job",
      businessName: dl.business_name,
      niche: dl.niche,
      phoneNumber: dl.phone,
      email: dl.email,
      monthlyRevenue: 75000,
      revenueLeak: dl.estimated_revenue_leak,
      painScore: dl.pain_score,
      evidenceSummary: dl.evidence.join("; "),
      isManual: false,
    }))
  , [demoLeads]);

  const displayLeads = isDemoMode ? transformedDemoLeads : leads;
  const currentLead = displayLeads.length > 0 ? displayLeads[currentLeadIndex] : null;

  const filteredLeads = useMemo(() => {
    const leadsToFilter = isDemoMode ? transformedDemoLeads : leads;
    if (!searchQuery.trim()) return leadsToFilter;
    const query = searchQuery.toLowerCase();
    return leadsToFilter.filter(
      (lead) =>
        lead.businessName.toLowerCase().includes(query) ||
        lead.niche.toLowerCase().includes(query) ||
        lead.phoneNumber.toLowerCase().includes(query)
    );
  }, [leads, transformedDemoLeads, isDemoMode, searchQuery]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        if (!cancelled) setIsLoading(false);
        toast({
          title: "Sign in required",
          description: "Please sign in to view leads and place calls.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      fetchLeads();
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [navigate, toast]);

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
          // Extract email from various possible fields
          const extractEmail = (r: any): string | undefined => {
            if (r.email) return r.email;
            if (r.emails && Array.isArray(r.emails) && r.emails.length > 0) {
              return typeof r.emails[0] === 'string' ? r.emails[0] : r.emails[0]?.email;
            }
            return undefined;
          };

          if (job.scrape_type === "complete_business_data" && result.business_name) {
            extractedLeads.push({
              id: `${job.id}-${index}`,
              jobId: job.id,
              businessName: result.business_name || "Unknown",
              niche: result.niche || result.category || "General",
              phoneNumber: result.phone || result.phone_number || "N/A",
              email: extractEmail(result),
              emailVerification: result.email_verification?.[0]?.verification,
              monthlyRevenue: result.monthlyRevenue || null,
              revenueLeak: result.audit?.estimatedLeak || result.revenueLeak || null,
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
              email: extractEmail(result),
              emailVerification: result.email_verification?.[0]?.verification,
              monthlyRevenue: result.monthlyRevenue || null,
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

  const handleAddLead = async () => {
    const businessName = newLead.businessName.trim();
    const phoneNumber = newLead.phoneNumber.trim();
    const niche = newLead.niche.trim();

    if (!businessName || !phoneNumber || !niche) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsAddingLead(true);

    const monthlyRevenue = newLead.monthlyRevenue
      ? parseFloat(newLead.monthlyRevenue)
      : getDefaultRevenue(niche);
    const revenueLeak = Math.round(monthlyRevenue * 0.2);

    const manualLead: Lead = {
      id: `manual-${Date.now()}`,
      jobId: "manual",
      businessName,
      niche,
      phoneNumber,
      monthlyRevenue,
      revenueLeak,
      painScore: null,
      evidenceSummary: null,
      isManual: true,
    };

    // Save locally first (so "Add Lead" always works)
    const storedManualLeads = localStorage.getItem("manualLeads");
    const manualLeads: Lead[] = storedManualLeads ? JSON.parse(storedManualLeads) : [];
    manualLeads.unshift(manualLead);
    localStorage.setItem("manualLeads", JSON.stringify(manualLeads));

    setLeads((prev) => [manualLead, ...prev]);
    setNewLead({ businessName: "", phoneNumber: "", niche: "", monthlyRevenue: "" });
    setIsAddModalOpen(false);

    // Auto-trigger AI Sales Call via secure Edge Function
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Lead added (call needs sign-in)",
          description: "Sign in to start the AI sales call.",
        });
        navigate("/login");
        return;
      }

      const { error } = await supabase.functions.invoke('trigger-sales-call', {
        body: {
          business_name: manualLead.businessName,
          phone_number: manualLead.phoneNumber,
          pain_score: 0,
          evidence_summary: "New lead added",
          niche: manualLead.niche,
          monthly_revenue: manualLead.monthlyRevenue,
          revenue_leak: manualLead.revenueLeak,
        },
      });

      if (error) throw error;

      toast({
        title: "Lead Added & Call Initiated",
        description: `${manualLead.businessName} added and AI Sales Call started automatically`,
      });
    } catch (error) {
      console.error("Sales call trigger error:", error);
      toast({
        title: "Lead Added (Call Failed)",
        description: "Lead was added, but failed to start AI Sales Call automatically.",
        variant: "destructive",
      });
    } finally {
      setIsAddingLead(false);
    }
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead({ ...lead });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingLead) return;

    if (!editingLead.businessName.trim() || !editingLead.phoneNumber.trim() || !editingLead.niche.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsSavingEdit(true);

    // Update in state
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === editingLead.id
          ? {
              ...lead,
              businessName: editingLead.businessName.trim(),
              phoneNumber: editingLead.phoneNumber.trim(),
              niche: editingLead.niche.trim(),
            }
          : lead
      )
    );

    // If it's a manual lead, update localStorage
    if (editingLead.isManual) {
      const storedManualLeads = localStorage.getItem("manualLeads");
      if (storedManualLeads) {
        const manualLeads: Lead[] = JSON.parse(storedManualLeads);
        const updatedManualLeads = manualLeads.map((lead) =>
          lead.id === editingLead.id
            ? {
                ...lead,
                businessName: editingLead.businessName.trim(),
                phoneNumber: editingLead.phoneNumber.trim(),
                niche: editingLead.niche.trim(),
              }
            : lead
        );
        localStorage.setItem("manualLeads", JSON.stringify(updatedManualLeads));
      }
    }

    setIsEditModalOpen(false);
    setEditingLead(null);
    setIsSavingEdit(false);

    toast({
      title: "Lead Updated",
      description: `${editingLead.businessName.trim()} has been updated`,
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

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to start a call.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    setCallingLeadId(lead.id);
    try {
      const { error } = await supabase.functions.invoke('trigger-sales-call', {
        body: {
          business_name: lead.businessName,
          phone_number: lead.phoneNumber,
          pain_score: lead.painScore || 0,
          evidence_summary: lead.evidenceSummary || "No audit data available",
          niche: lead.niche,
          monthly_revenue: lead.monthlyRevenue || 0,
          revenue_leak: lead.revenueLeak || 0,
        },
      });

      if (error) throw error;

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

  const handleDeleteLead = (lead: Lead) => {
    // Remove from state
    setLeads((prev) => prev.filter((l) => l.id !== lead.id));

    // If it's a manual lead, remove from localStorage
    if (lead.isManual) {
      const storedManualLeads = localStorage.getItem("manualLeads");
      if (storedManualLeads) {
        const manualLeads: Lead[] = JSON.parse(storedManualLeads);
        const updatedManualLeads = manualLeads.filter((l) => l.id !== lead.id);
        localStorage.setItem("manualLeads", JSON.stringify(updatedManualLeads));
      }
    }

    // Adjust currentLeadIndex if needed
    if (currentLeadIndex >= leads.length - 1 && currentLeadIndex > 0) {
      setCurrentLeadIndex(currentLeadIndex - 1);
    }

    toast({
      title: "Lead Deleted",
      description: `${lead.businessName} has been removed`,
    });
  };

  const handleBulkDelete = () => {
    const leadsToDelete = leads.filter((l) => selectedLeads.has(l.id));
    
    // Remove from state
    setLeads((prev) => prev.filter((l) => !selectedLeads.has(l.id)));
    
    // Remove manual leads from localStorage
    const storedManualLeads = localStorage.getItem("manualLeads");
    if (storedManualLeads) {
      const manualLeads: Lead[] = JSON.parse(storedManualLeads);
      const updatedManualLeads = manualLeads.filter((l) => !selectedLeads.has(l.id));
      localStorage.setItem("manualLeads", JSON.stringify(updatedManualLeads));
    }
    
    // Adjust currentLeadIndex if needed
    const newLeadsCount = leads.length - selectedLeads.size;
    if (currentLeadIndex >= newLeadsCount && newLeadsCount > 0) {
      setCurrentLeadIndex(newLeadsCount - 1);
    } else if (newLeadsCount === 0) {
      setCurrentLeadIndex(0);
    }
    
    toast({
      title: "Leads Deleted",
      description: `${selectedLeads.size} lead(s) have been removed`,
    });
    
    setSelectedLeads(new Set());
  };

  const toggleSelectLead = (leadId: string) => {
    setSelectedLeads((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map((l) => l.id)));
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

  const goToNextLead = () => {
    if (currentLeadIndex < leads.length - 1) {
      setCurrentLeadIndex(currentLeadIndex + 1);
    }
  };

  const goToPreviousLead = () => {
    if (currentLeadIndex > 0) {
      setCurrentLeadIndex(currentLeadIndex - 1);
    }
  };

  const selectLeadFromTable = (lead: Lead) => {
    const index = leads.findIndex((l) => l.id === lead.id);
    if (index !== -1) {
      setCurrentLeadIndex(index);
      setIsAllLeadsOpen(false);
      toast({
        title: "Lead Selected",
        description: `Now viewing ${lead.businessName}`,
      });
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
                  <Label htmlFor="niche">Practice Type</Label>
                  <Select
                    value={newLead.niche}
                    onValueChange={(value) => setNewLead((prev) => ({ ...prev, niche: value }))}
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Select a practice type" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {PRACTICE_TYPES.map((pt) => (
                        <SelectItem key={pt.value} value={pt.value}>
                          {pt.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyRevenue">Monthly Revenue (Optional Override)</Label>
                  <Input
                    id="monthlyRevenue"
                    type="number"
                    placeholder="Leave blank to use default"
                    value={newLead.monthlyRevenue}
                    onChange={(e) => setNewLead((prev) => ({ ...prev, monthlyRevenue: e.target.value }))}
                  />
                </div>
                {/* Live Preview */}
                {newLead.niche && (
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <DollarSign className="h-4 w-4 text-primary" />
                      Revenue Preview
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Estimated Monthly Revenue</p>
                        <p className="text-lg font-semibold text-foreground">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 0,
                          }).format(
                            newLead.monthlyRevenue
                              ? parseFloat(newLead.monthlyRevenue)
                              : getDefaultRevenue(newLead.niche)
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Calculated Revenue Leak (20%)</p>
                        <p className="text-lg font-semibold text-red-600">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 0,
                          }).format(
                            Math.round(
                              (newLead.monthlyRevenue
                                ? parseFloat(newLead.monthlyRevenue)
                                : getDefaultRevenue(newLead.niche)) * 0.2
                            )
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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

        {/* Current Lead - Focused View */}
        {isLoading ? (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : leads.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="py-12">
              <div className="text-center">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">No leads yet</h3>
                <p className="text-muted-foreground mt-1">
                  Start scraping businesses or add leads manually
                </p>
              </div>
            </CardContent>
          </Card>
        ) : currentLead ? (
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-muted/30">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-2xl">{currentLead.businessName}</CardTitle>
                    {currentLead.isManual && (
                      <Badge variant="outline" className="text-xs">Manual</Badge>
                    )}
                  </div>
                  <CardDescription className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary">{currentLead.niche}</Badge>
                    <span className="text-muted-foreground">•</span>
                    <span>Lead {currentLeadIndex + 1} of {leads.length}</span>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToPreviousLead}
                    disabled={currentLeadIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToNextLead}
                    disabled={currentLeadIndex === leads.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Lead Details Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </div>
                  <div className="font-mono text-lg font-semibold">
                    {currentLead.phoneNumber}
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                  <div className="flex items-center gap-2">
                    {currentLead.email ? (
                      <>
                        <span className="font-mono text-sm truncate">{currentLead.email}</span>
                        <EmailVerificationBadge 
                          email={currentLead.email} 
                          verification={currentLead.emailVerification}
                          showDetails
                        />
                      </>
                    ) : (
                      <span className="text-muted-foreground text-sm">N/A</span>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    Revenue Leak
                  </div>
                  <div className="text-lg font-semibold text-red-600">
                    {formatRevenueLeak(currentLead.revenueLeak)}
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    Pain Score
                  </div>
                  <div className="mt-1">
                    {getPainScoreBadge(currentLead.painScore)}
                  </div>
                </div>
              </div>

              {/* Evidence Summary */}
              {currentLead.evidenceSummary && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <h4 className="font-medium mb-2">Audit Summary</h4>
                  <p className="text-sm text-muted-foreground">{currentLead.evidenceSummary}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold shadow-lg flex-1"
                  onClick={() => handleStartCall(currentLead)}
                  disabled={currentLead.phoneNumber === "N/A" || callingLeadId === currentLead.id}
                >
                  {callingLeadId === currentLead.id ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Initiating Call...
                    </>
                  ) : (
                    <>
                      <Phone className="mr-2 h-5 w-5" />
                      Start AI Sales Call
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handleEditLead(currentLead)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={goToNextLead}
                  disabled={currentLeadIndex === leads.length - 1}
                >
                  Next Lead
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Stats Summary */}
        <div className="grid gap-4 md:grid-cols-4">
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
              <CardTitle className="text-sm font-medium">With Emails</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {leads.filter((l) => l.email).length}
              </div>
              <p className="text-xs text-muted-foreground">
                {leads.filter((l) => l.emailVerification?.status === 'valid').length} verified
              </p>
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

        {/* Bulk Email Verification */}
        {leads.filter(l => l.email).length > 0 && (
          <Card className="border-dashed">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Email Verification</p>
                    <p className="text-sm text-muted-foreground">
                      Verify all emails to improve deliverability
                    </p>
                  </div>
                </div>
                <BulkEmailVerifier 
                  emails={leads.filter(l => l.email).map(l => l.email!)}
                  onComplete={(results) => {
                    // Update leads with verification results
                    const verificationMap = new Map(results.map(r => [r.email, r]));
                    setLeads(prev => prev.map(lead => ({
                      ...lead,
                      emailVerification: lead.email ? verificationMap.get(lead.email.toLowerCase()) : undefined
                    })));
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Collapsible All Leads Table */}
        <Collapsible open={isAllLeadsOpen} onOpenChange={setIsAllLeadsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle>All Leads</CardTitle>
                    <Badge variant="secondary">{leads.length}</Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    {isAllLeadsOpen && (
                      <div className="relative w-64" onClick={(e) => e.stopPropagation()}>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search leads..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    )}
                    {isAllLeadsOpen ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {/* Bulk actions bar */}
                <div className="bg-card/50 border border-border/50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-sm font-medium text-muted-foreground">
                      {selectedLeads.size > 0 
                        ? `${selectedLeads.size} of ${filteredLeads.length} selected`
                        : `Select leads to delete`
                      }
                    </span>
                  </div>
                  {selectedLeads.size > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedLeads(new Set())}
                      >
                        Clear
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete {selectedLeads.size}
                      </Button>
                    </div>
                  )}
                </div>

                {filteredLeads.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50" />
                    <p className="text-muted-foreground mt-2">
                      {searchQuery ? "No leads found" : "No leads yet"}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]"></TableHead>
                          <TableHead className="min-w-[180px]">Business Name</TableHead>
                          <TableHead className="min-w-[140px]">Niche</TableHead>
                          <TableHead className="min-w-[120px]">Phone Number</TableHead>
                          <TableHead className="min-w-[200px]">Email</TableHead>
                          <TableHead className="min-w-[120px]">Revenue Leak</TableHead>
                          <TableHead className="min-w-[100px] text-right md:sticky md:right-0 md:bg-background">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLeads.map((lead) => (
                          <TableRow 
                            key={lead.id}
                            className={leads[currentLeadIndex]?.id === lead.id ? "bg-primary/5" : ""}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedLeads.has(lead.id)}
                                onCheckedChange={() => toggleSelectLead(lead.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {lead.businessName}
                                {lead.isManual && (
                                  <Badge variant="outline" className="text-xs">Manual</Badge>
                                )}
                                {leads[currentLeadIndex]?.id === lead.id && (
                                  <Badge className="text-xs bg-primary/10 text-primary">Current</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant="secondary">{lead.niche}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {lead.phoneNumber}
                            </TableCell>
                            <TableCell>
                              {lead.email ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm truncate max-w-[140px]" title={lead.email}>
                                    {lead.email}
                                  </span>
                                  <EmailVerificationBadge 
                                    email={lead.email} 
                                    verification={lead.emailVerification}
                                  />
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold text-red-600">
                              {formatRevenueLeak(lead.revenueLeak)}
                            </TableCell>
                            <TableCell className="text-right md:sticky md:right-0 md:bg-background">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant={leads[currentLeadIndex]?.id === lead.id ? "secondary" : "outline"}
                                  onClick={() => selectLeadFromTable(lead)}
                                  disabled={leads[currentLeadIndex]?.id === lead.id}
                                >
                                  {leads[currentLeadIndex]?.id === lead.id ? "Viewing" : "Select"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteLead(lead)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
        {/* Edit Lead Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Lead</DialogTitle>
            </DialogHeader>
            {editingLead && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="editBusinessName">Business Name</Label>
                  <Input
                    id="editBusinessName"
                    value={editingLead.businessName}
                    onChange={(e) => setEditingLead((prev) => prev ? { ...prev, businessName: e.target.value } : null)}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPhoneNumber">Phone Number</Label>
                  <Input
                    id="editPhoneNumber"
                    value={editingLead.phoneNumber}
                    onChange={(e) => setEditingLead((prev) => prev ? { ...prev, phoneNumber: e.target.value } : null)}
                    maxLength={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editNiche">Niche</Label>
                  <Input
                    id="editNiche"
                    value={editingLead.niche}
                    onChange={(e) => setEditingLead((prev) => prev ? { ...prev, niche: e.target.value } : null)}
                    maxLength={50}
                  />
                </div>
                <Button 
                  className="w-full mt-4" 
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Leads;
