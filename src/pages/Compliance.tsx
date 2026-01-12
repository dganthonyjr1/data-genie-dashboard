import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTriggerCall } from "@/hooks/use-trigger-call";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
  Download,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  PhoneOff,
  Calendar,
  ScrollText,
  Scale,
  Lock,
  Bell,
  Database,
  FileText,
  Loader2,
  PhoneCall
} from "lucide-react";
import { format, subMonths, subDays } from "date-fns";
import { formatPhoneDisplay } from "@/lib/compliance-utils";
import {
  ComplianceMetricsGrid,
  ComplianceStatsCards,
  PrivacyRightsSection,
  DataRetentionSection,
  ComplianceChecklist,
  ComplianceAlerts
} from "@/components/compliance";

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

interface DataRequest {
  id: string;
  request_type: string;
  status: string;
  created_at: string;
  processed_at: string | null;
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
  const { triggerCall, isTriggering } = useTriggerCall();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [dateFilter, setDateFilter] = useState("month");
  const [testCallResult, setTestCallResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showTestCallDialog, setShowTestCallDialog] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  
  // Data states
  const [callRecords, setCallRecords] = useState<any[]>([]);
  const [dncList, setDncList] = useState<DNCEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [dataRequests, setDataRequests] = useState<DataRequest[]>([]);
  const [tcpaAccepted, setTcpaAccepted] = useState(false);
  
  // Form states
  const [newDncPhone, setNewDncPhone] = useState("");
  const [newDncReason, setNewDncReason] = useState("manual_add");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDncDialog, setShowAddDncDialog] = useState(false);
  const [showTcpaDialog, setShowTcpaDialog] = useState(false);
  
  // Alert config state
  const [alertConfig, setAlertConfig] = useState({
    outsideHoursThreshold: 10,
    consentDeniedThreshold: 5,
    duplicateCallLimit: 3,
    optOutThreshold: 15,
    emailAlerts: true
  });

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

      // Fetch all data in parallel
      const [recordsRes, dncRes, logsRes, agreementRes, requestsRes] = await Promise.all([
        supabase
          .from("call_records")
          .select("*")
          .eq("user_id", user.id)
          .gte("created_at", startDate.toISOString())
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("dnc_list")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("compliance_audit_log")
          .select("*")
          .eq("user_id", user.id)
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("legal_agreements")
          .select("*")
          .eq("user_id", user.id)
          .eq("agreement_type", "tcpa_certification")
          .eq("accepted", true)
          .maybeSingle(),
        supabase
          .from("data_subject_requests")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
      ]);

      setCallRecords(recordsRes.data || []);
      setDncList(dncRes.data || []);
      setAuditLogs(logsRes.data || []);
      setTcpaAccepted(!!agreementRes.data);
      setDataRequests(requestsRes.data || []);

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
      businessHoursRate: totalCalls > 0 ? ((totalCalls - callsOutsideHours) / totalCalls) * 100 : 100,
    };
  }, [callRecords, dncList]);

  // Generate active alerts based on metrics
  const activeAlerts = useMemo(() => {
    const alerts: { id: string; type: 'warning' | 'critical' | 'info'; title: string; message: string; timestamp: Date }[] = [];
    
    const outsideHoursRate = metrics.totalCalls > 0 ? (metrics.callsOutsideHours / metrics.totalCalls) * 100 : 0;
    const consentDeniedRate = metrics.totalCalls > 0 ? (metrics.callsWithoutConsent / metrics.totalCalls) * 100 : 0;
    const optOutRate = metrics.totalCalls > 0 ? (metrics.optedOutNumbers / metrics.totalCalls) * 100 : 0;
    
    if (outsideHoursRate > alertConfig.outsideHoursThreshold) {
      alerts.push({
        id: 'outside_hours',
        type: 'warning',
        title: 'High Outside Hours Rate',
        message: `${outsideHoursRate.toFixed(1)}% of calls are outside business hours (threshold: ${alertConfig.outsideHoursThreshold}%)`,
        timestamp: new Date()
      });
    }
    
    if (consentDeniedRate > alertConfig.consentDeniedThreshold) {
      alerts.push({
        id: 'consent_denied',
        type: 'critical',
        title: 'High Consent Denial Rate',
        message: `${consentDeniedRate.toFixed(1)}% of calls have consent denied (threshold: ${alertConfig.consentDeniedThreshold}%)`,
        timestamp: new Date()
      });
    }
    
    if (optOutRate > alertConfig.optOutThreshold) {
      alerts.push({
        id: 'opt_out',
        type: 'critical',
        title: 'High Opt-Out Rate',
        message: `${optOutRate.toFixed(1)}% opt-out rate detected (threshold: ${alertConfig.optOutThreshold}%)`,
        timestamp: new Date()
      });
    }
    
    if (!tcpaAccepted) {
      alerts.push({
        id: 'tcpa',
        type: 'critical',
        title: 'TCPA Certification Missing',
        message: 'You must accept the TCPA certification before making calls',
        timestamp: new Date()
      });
    }
    
    return alerts;
  }, [metrics, alertConfig, tcpaAccepted]);

  // Checklist items
  const checklistItems = useMemo(() => [
    { 
      id: 'dnc',
      label: "DNC list checked before all calls", 
      checked: true,
      description: "All calls are automatically checked against your DNC list"
    },
    { 
      id: 'hours',
      label: "Calls only made 8 AM - 9 PM recipient time", 
      checked: metrics.businessHoursRate >= 95,
      description: `${metrics.businessHoursRate.toFixed(1)}% of calls within business hours`
    },
    { 
      id: 'consent',
      label: "Recording consent obtained (where required)", 
      checked: metrics.consentRate >= 80,
      description: `${metrics.consentRate.toFixed(1)}% consent rate`
    },
    { 
      id: 'optout',
      label: "Opt-out requests processed", 
      checked: true,
      description: "All opt-out requests are automatically added to DNC list"
    },
    { 
      id: 'retention',
      label: "Call logs maintained for 18 months", 
      checked: true,
      description: "Automatic retention policy in place"
    },
    { 
      id: 'tcpa',
      label: "TCPA Certification signed", 
      checked: tcpaAccepted,
      critical: true,
      description: tcpaAccepted ? "Certification accepted" : "Required before making calls",
      actionLabel: tcpaAccepted ? undefined : "Accept",
      onAction: tcpaAccepted ? undefined : () => setShowTcpaDialog(true)
    },
  ], [metrics, tcpaAccepted]);

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

  const handleTestCall = async () => {
    if (!testPhoneNumber.trim()) {
      toast({ title: "Please enter a phone number", variant: "destructive" });
      return;
    }

    setTestCallResult(null);
    
    const result = await triggerCall({
      facilityName: "Retell Integration Test",
      phoneNumber: testPhoneNumber,
      analysisData: {
        test_call: true,
        initiated_from: "compliance_page",
      },
    });

    if (result.success) {
      setTestCallResult({
        success: true,
        message: `Test call initiated successfully! Call ID: ${result.callId || "pending"}`,
      });
      fetchData(); // Refresh to show new call record
    } else {
      setTestCallResult({
        success: false,
        message: result.reason || "Test call failed",
      });
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

  const oldestRecordDate = callRecords.length > 0 
    ? new Date(callRecords[callRecords.length - 1]?.created_at) 
    : null;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            <p className="text-muted-foreground">Loading compliance data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-orbitron bg-gradient-primary bg-clip-text text-transparent flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              Compliance Center
            </h1>
            <p className="text-muted-foreground mt-2">
              TCPA compliance, privacy rights, and audit logging
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
            <Button onClick={exportCallLogs} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Quick Metrics */}
        <ComplianceMetricsGrid metrics={metrics} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 h-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2 py-2.5">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="dnc" className="flex items-center gap-2 py-2.5">
              <PhoneOff className="h-4 w-4" />
              <span className="hidden sm:inline">DNC</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">{dncList.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2 py-2.5">
              <ScrollText className="h-4 w-4" />
              <span className="hidden sm:inline">Audit</span>
            </TabsTrigger>
            <TabsTrigger value="checklist" className="flex items-center gap-2 py-2.5">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Checklist</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2 py-2.5">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
            <TabsTrigger value="retention" className="flex items-center gap-2 py-2.5">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Retention</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2 py-2.5">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
              {activeAlerts.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">{activeAlerts.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <ComplianceStatsCards metrics={metrics} />
            
            {/* Test Call Section */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PhoneCall className="h-5 w-5 text-primary" />
                  Test Retell AI Integration
                </CardTitle>
                <CardDescription>
                  Verify your AI calling system is properly configured and working
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!tcpaAccepted ? (
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-amber-500" />
                      <div>
                        <p className="font-medium text-amber-500">TCPA Certification Required</p>
                        <p className="text-sm text-muted-foreground">
                          Please accept the TCPA certification before testing calls.
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="ml-auto"
                        onClick={() => setShowTcpaDialog(true)}
                      >
                        Accept Certification
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Input
                        placeholder="Enter phone number to test (e.g., 555-123-4567)"
                        value={testPhoneNumber}
                        onChange={(e) => setTestPhoneNumber(e.target.value)}
                        className="max-w-md"
                      />
                      <Button 
                        onClick={handleTestCall}
                        disabled={isTriggering || !testPhoneNumber.trim()}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90"
                      >
                        {isTriggering ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Phone className="mr-2 h-4 w-4" />
                            Test Call
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {testCallResult && (
                      <div className={`p-4 rounded-lg ${
                        testCallResult.success 
                          ? "bg-green-500/10 border border-green-500/30" 
                          : "bg-red-500/10 border border-red-500/30"
                      }`}>
                        <div className="flex items-center gap-3">
                          {testCallResult.success ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <div>
                            <p className={`font-medium ${testCallResult.success ? "text-green-500" : "text-red-500"}`}>
                              {testCallResult.success ? "Test Successful" : "Test Failed"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {testCallResult.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <p className="text-sm text-muted-foreground">
                      This will initiate a real call via Retell AI to verify the integration. 
                      Compliance checks (DNC list, business hours, consent rules) will be enforced.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* DNC List Tab */}
          <TabsContent value="dnc" className="space-y-4 mt-6">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <PhoneOff className="h-5 w-5 text-red-500" />
                      Do Not Call List
                    </CardTitle>
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
          <TabsContent value="audit" className="space-y-4 mt-6">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ScrollText className="h-5 w-5 text-primary" />
                  Compliance Audit Log
                </CardTitle>
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
          <TabsContent value="checklist" className="mt-6">
            <ComplianceChecklist 
              items={checklistItems}
              tcpaAccepted={tcpaAccepted}
              onAcceptTcpa={() => setShowTcpaDialog(true)}
            />
          </TabsContent>

          {/* Privacy Rights Tab */}
          <TabsContent value="privacy" className="mt-6">
            <PrivacyRightsSection 
              requests={dataRequests}
              onRequestSubmit={fetchData}
            />
          </TabsContent>

          {/* Data Retention Tab */}
          <TabsContent value="retention" className="mt-6">
            <DataRetentionSection 
              totalRecords={callRecords.length}
              oldestRecordDate={oldestRecordDate}
            />
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="mt-6">
            <ComplianceAlerts 
              alerts={activeAlerts}
              config={alertConfig}
              onConfigChange={setAlertConfig}
              metrics={{
                outsideHoursRate: metrics.totalCalls > 0 ? (metrics.callsOutsideHours / metrics.totalCalls) * 100 : 0,
                consentDeniedRate: metrics.totalCalls > 0 ? (metrics.callsWithoutConsent / metrics.totalCalls) * 100 : 0,
                optOutRate: metrics.totalCalls > 0 ? (metrics.optedOutNumbers / metrics.totalCalls) * 100 : 0
              }}
            />
          </TabsContent>
        </Tabs>

        {/* TCPA Certification Dialog */}
        <Dialog open={showTcpaDialog} onOpenChange={setShowTcpaDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
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
