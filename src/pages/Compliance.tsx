import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Shield, 
  Phone, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  AlertTriangle,
  Download,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  MapPin,
  Users,
  PhoneOff,
  Mic,
  MicOff,
  Calendar,
  ScrollText,
  Scale
} from "lucide-react";
import { format, subMonths, subDays } from "date-fns";
import { formatPhoneDisplay, STATE_NAMES, isTwoPartyConsentState } from "@/lib/compliance-utils";

interface DNCEntry {
  id: string;
  phone_number: string;
  reason: string;
  state: string | null;
  created_at: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  category: string;
  details: any;
  result: string | null;
  created_at: string;
}

interface ComplianceMetrics {
  totalCalls: number;
  callsWithConsent: number;
  callsWithoutConsent: number;
  callsOutsideHours: number;
  optedOutNumbers: number;
  dncListSize: number;
  twoPartyStateCalls: number;
  onePartyStateCalls: number;
  consentRate: number;
  businessHoursRate: number;
}

const Compliance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [dateFilter, setDateFilter] = useState("month");
  
  // Data states
  const [callRecords, setCallRecords] = useState<any[]>([]);
  const [dncList, setDncList] = useState<DNCEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [tcpaAccepted, setTcpaAccepted] = useState(false);
  
  // Form states
  const [newDncPhone, setNewDncPhone] = useState("");
  const [newDncReason, setNewDncReason] = useState("manual_add");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDncDialog, setShowAddDncDialog] = useState(false);
  const [showTcpaDialog, setShowTcpaDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Calculate date range
      let startDate = new Date();
      switch (dateFilter) {
        case "week": startDate = subDays(new Date(), 7); break;
        case "month": startDate = subMonths(new Date(), 1); break;
        case "quarter": startDate = subMonths(new Date(), 3); break;
        case "year": startDate = subMonths(new Date(), 12); break;
      }

      // Fetch call records
      const { data: records } = await supabase
        .from("call_records")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", startDate.toISOString())
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      setCallRecords(records || []);

      // Fetch DNC list
      const { data: dnc } = await supabase
        .from("dnc_list")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setDncList(dnc || []);

      // Fetch audit logs
      const { data: logs } = await supabase
        .from("compliance_audit_log")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false })
        .limit(100);
      setAuditLogs(logs || []);

      // Check TCPA acceptance
      const { data: agreement } = await supabase
        .from("legal_agreements")
        .select("*")
        .eq("user_id", user.id)
        .eq("agreement_type", "tcpa_certification")
        .eq("accepted", true)
        .maybeSingle();
      setTcpaAccepted(!!agreement);

    } catch (error) {
      console.error("Error fetching compliance data:", error);
      toast({ title: "Error loading compliance data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const metrics: ComplianceMetrics = useMemo(() => {
    const totalCalls = callRecords.length;
    const callsWithConsent = callRecords.filter(c => c.consent_given === true).length;
    const callsWithoutConsent = callRecords.filter(c => c.consent_given === false).length;
    const callsOutsideHours = callRecords.filter(c => c.called_during_business_hours === false).length;
    const optedOutNumbers = callRecords.filter(c => c.opted_out === true).length;
    const twoPartyStateCalls = callRecords.filter(c => c.two_party_consent_state === true).length;
    const onePartyStateCalls = callRecords.filter(c => c.two_party_consent_state === false).length;
    
    return {
      totalCalls,
      callsWithConsent,
      callsWithoutConsent,
      callsOutsideHours,
      optedOutNumbers,
      dncListSize: dncList.length,
      twoPartyStateCalls,
      onePartyStateCalls,
      consentRate: totalCalls > 0 ? (callsWithConsent / totalCalls) * 100 : 0,
      businessHoursRate: totalCalls > 0 ? ((totalCalls - callsOutsideHours) / totalCalls) * 100 : 0,
    };
  }, [callRecords, dncList]);

  const addToDncList = async () => {
    if (!newDncPhone.trim()) {
      toast({ title: "Please enter a phone number", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("dnc_list").insert({
        user_id: user.id,
        phone_number: newDncPhone.replace(/\D/g, ''),
        reason: newDncReason,
        added_by: "manual",
      });

      if (error) throw error;

      toast({ title: "Number added to DNC list" });
      setNewDncPhone("");
      setShowAddDncDialog(false);
      fetchData();
    } catch (error) {
      console.error("Error adding to DNC:", error);
      toast({ title: "Failed to add number", variant: "destructive" });
    }
  };

  const removeFromDncList = async (id: string) => {
    try {
      const { error } = await supabase.from("dnc_list").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Number removed from DNC list" });
      fetchData();
    } catch (error) {
      toast({ title: "Failed to remove number", variant: "destructive" });
    }
  };

  const acceptTcpaCertification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("legal_agreements").upsert({
        user_id: user.id,
        agreement_type: "tcpa_certification",
        version: "1.0",
        accepted: true,
        accepted_at: new Date().toISOString(),
      }, { onConflict: 'user_id,agreement_type,version' });

      if (error) throw error;

      setTcpaAccepted(true);
      setShowTcpaDialog(false);
      toast({ title: "TCPA Certification accepted" });
    } catch (error) {
      console.error("Error accepting TCPA:", error);
      toast({ title: "Failed to save acceptance", variant: "destructive" });
    }
  };

  const exportCallLogs = () => {
    const csv = [
      ["Date", "Time", "Facility", "Phone", "State", "Duration", "Outcome", "Consent", "Two-Party State", "Business Hours"].join(","),
      ...callRecords.map(r => [
        format(new Date(r.created_at), "yyyy-MM-dd"),
        format(new Date(r.created_at), "HH:mm:ss"),
        `"${r.facility_name}"`,
        r.phone_number,
        r.state || "Unknown",
        r.duration || 0,
        r.outcome || "pending",
        r.consent_given ? "Yes" : r.consent_given === false ? "No" : "N/A",
        r.two_party_consent_state ? "Yes" : "No",
        r.called_during_business_hours ? "Yes" : "No",
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `call-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const filteredDncList = dncList.filter(entry =>
    entry.phone_number.includes(searchQuery) || 
    entry.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getActionIcon = (action: string) => {
    if (action.includes("blocked")) return <XCircle className="h-4 w-4 text-red-500" />;
    if (action.includes("passed") || action.includes("success")) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (action.includes("initiated")) return <Phone className="h-4 w-4 text-blue-500" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading compliance data...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-orbitron bg-gradient-primary bg-clip-text text-transparent flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              Compliance Center
            </h1>
            <p className="text-muted-foreground mt-2">
              TCPA compliance, DNC management, and audit logging
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[150px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="quarter">Last 3 Months</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* TCPA Certification Banner */}
        {!tcpaAccepted && (
          <Card className="bg-yellow-500/10 border-yellow-500/50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-yellow-500" />
                  <div>
                    <p className="font-medium text-yellow-400">TCPA Certification Required</p>
                    <p className="text-sm text-muted-foreground">
                      You must accept the TCPA certification before making calls
                    </p>
                  </div>
                </div>
                <Button onClick={() => setShowTcpaDialog(true)} className="bg-yellow-500 hover:bg-yellow-600">
                  <Scale className="mr-2 h-4 w-4" />
                  Accept Certification
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="dnc" className="flex items-center gap-2">
              <PhoneOff className="h-4 w-4" />
              DNC List ({dncList.length})
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              Audit Log
            </TabsTrigger>
            <TabsTrigger value="checklist" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Checklist
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Calls</p>
                      <p className="text-2xl font-bold">{metrics.totalCalls}</p>
                    </div>
                    <Phone className="h-6 w-6 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Consent Rate</p>
                      <p className="text-2xl font-bold text-green-500">
                        {metrics.consentRate.toFixed(1)}%
                      </p>
                    </div>
                    <Mic className="h-6 w-6 text-green-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Business Hours</p>
                      <p className="text-2xl font-bold text-cyan-500">
                        {metrics.businessHoursRate.toFixed(1)}%
                      </p>
                    </div>
                    <Clock className="h-6 w-6 text-cyan-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">DNC List Size</p>
                      <p className="text-2xl font-bold text-red-500">{metrics.dncListSize}</p>
                    </div>
                    <PhoneOff className="h-6 w-6 text-red-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Stats */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mic className="h-5 w-5 text-primary" />
                    Recording Consent
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Consent Given</span>
                      <span className="text-green-500">{metrics.callsWithConsent}</span>
                    </div>
                    <Progress value={metrics.consentRate} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-2xl font-bold text-green-500">{metrics.callsWithConsent}</p>
                      <p className="text-xs text-muted-foreground">Consented</p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-2xl font-bold text-red-500">{metrics.callsWithoutConsent}</p>
                      <p className="text-xs text-muted-foreground">Declined</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    State Consent Rules
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <p className="text-2xl font-bold text-purple-500">{metrics.twoPartyStateCalls}</p>
                      <p className="text-xs text-muted-foreground">Two-Party States</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-2xl font-bold text-blue-500">{metrics.onePartyStateCalls}</p>
                      <p className="text-xs text-muted-foreground">One-Party States</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Two-party consent states: CA, CT, FL, IL, MD, MA, MI, MT, NV, NH, PA, WA
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Export Button */}
            <div className="flex justify-end">
              <Button onClick={exportCallLogs} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Call Logs (CSV)
              </Button>
            </div>
          </TabsContent>

          {/* DNC List Tab */}
          <TabsContent value="dnc" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Do Not Call List</CardTitle>
                    <CardDescription>
                      Manage numbers that should not be called
                    </CardDescription>
                  </div>
                  <Dialog open={showAddDncDialog} onOpenChange={setShowAddDncDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Number
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add to DNC List</DialogTitle>
                        <DialogDescription>
                          Add a phone number to your Do Not Call list
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Input
                          placeholder="Phone number (e.g., 555-123-4567)"
                          value={newDncPhone}
                          onChange={(e) => setNewDncPhone(e.target.value)}
                        />
                        <Select value={newDncReason} onValueChange={setNewDncReason}>
                          <SelectTrigger>
                            <SelectValue placeholder="Reason" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual_add">Manual Addition</SelectItem>
                            <SelectItem value="opt_out">Customer Opt-Out</SelectItem>
                            <SelectItem value="complaint">Complaint</SelectItem>
                            <SelectItem value="wrong_number">Wrong Number</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDncDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={addToDncList}>Add to DNC List</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by phone or reason..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {filteredDncList.length === 0 ? (
                  <div className="text-center py-12">
                    <PhoneOff className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">No numbers on DNC list</h3>
                    <p className="text-muted-foreground mt-2">
                      Add numbers that should not be called
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Added</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDncList.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono">
                            {formatPhoneDisplay(entry.phone_number)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{entry.reason.replace("_", " ")}</Badge>
                          </TableCell>
                          <TableCell>{entry.state || "-"}</TableCell>
                          <TableCell>
                            {format(new Date(entry.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromDncList(entry.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Audit Log</CardTitle>
                <CardDescription>
                  Track all compliance-related actions and decisions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <ScrollText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">No audit logs yet</h3>
                    <p className="text-muted-foreground mt-2">
                      Compliance actions will be logged here
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getActionIcon(log.action)}
                              <span>{log.action.replace(/_/g, " ")}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.category}</Badge>
                          </TableCell>
                          <TableCell>
                            {log.result && (
                              <Badge 
                                className={
                                  log.result === "passed" || log.result === "success"
                                    ? "bg-green-500/20 text-green-400"
                                    : log.result === "blocked"
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-gray-500/20 text-gray-400"
                                }
                              >
                                {log.result}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                            {log.details?.phone_number || log.details?.facility_name || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Checklist Tab */}
          <TabsContent value="checklist" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>TCPA Compliance Checklist</CardTitle>
                <CardDescription>
                  Ensure you're meeting all TCPA requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { 
                    label: "DNC list checked before all calls", 
                    checked: true,
                    description: "All calls are automatically checked against your DNC list"
                  },
                  { 
                    label: "Calls only made 8 AM - 9 PM recipient time", 
                    checked: metrics.businessHoursRate >= 95,
                    description: `${metrics.businessHoursRate.toFixed(1)}% of calls within business hours`
                  },
                  { 
                    label: "Recording consent obtained (where required)", 
                    checked: metrics.consentRate >= 80,
                    description: `${metrics.consentRate.toFixed(1)}% consent rate`
                  },
                  { 
                    label: "Opt-out requests processed", 
                    checked: true,
                    description: "All opt-out requests are automatically added to DNC list"
                  },
                  { 
                    label: "Call logs maintained for 18 months", 
                    checked: true,
                    description: "Automatic retention policy in place"
                  },
                  { 
                    label: "TCPA Certification signed", 
                    checked: tcpaAccepted,
                    description: tcpaAccepted ? "Certification accepted" : "Required before making calls"
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-card border">
                    <div className={`mt-0.5 rounded-full p-1 ${item.checked ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {item.checked ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* TCPA Certification Dialog */}
        <Dialog open={showTcpaDialog} onOpenChange={setShowTcpaDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                TCPA Compliance Certification
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto text-sm">
              <p className="font-medium">By accepting this certification, I agree to:</p>
              <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                <li>Comply with all Telephone Consumer Protection Act (TCPA) regulations</li>
                <li>Only call numbers between 8 AM and 9 PM in the recipient's local time</li>
                <li>Maintain an internal Do Not Call list and honor all opt-out requests</li>
                <li>Obtain proper consent for call recording in two-party consent states</li>
                <li>Identify myself and my company at the start of each call</li>
                <li>Not use this service for any illegal, fraudulent, or harassing purposes</li>
                <li>Maintain call records for at least 18 months for audit purposes</li>
                <li>Accept full responsibility for compliance with all applicable laws</li>
              </ul>
              <Separator />
              <p className="text-xs text-muted-foreground">
                This certification is required before using the calling features. 
                Violations may result in account termination and legal liability.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTcpaDialog(false)}>
                Cancel
              </Button>
              <Button onClick={acceptTcpaCertification} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="mr-2 h-4 w-4" />
                I Accept & Certify
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Compliance;
