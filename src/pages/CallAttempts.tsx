import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Phone, CheckCircle, XCircle, Clock, Search, Calendar, RefreshCw, Trash2, Play, Headphones, MessageSquare, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useDemoMode } from "@/contexts/DemoModeContext";
import CallRecordingPlayer from "@/components/CallRecordingPlayer";
import CallAnalyticsDashboard from "@/components/CallAnalyticsDashboard";

interface CallAttempt {
  id: string;
  user_id?: string;
  job_id?: string | null;
  business_name: string;
  phone_number: string;
  status: string;
  error_message?: string | null;
  auto_triggered: boolean;
  payload?: any;
  created_at: string;
}

interface CallRecord {
  id: number;
  user_id: string;
  call_id: string;
  facility_name: string;
  phone_number: string;
  status: string;
  outcome: string | null;
  duration: number | null;
  lead_score: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const CallAttempts = () => {
  const { isDemoMode, demoCallAttempts } = useDemoMode();
  const [attempts, setAttempts] = useState<CallAttempt[]>([]);
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("analytics");
  const [selectedRecording, setSelectedRecording] = useState<{
    isOpen: boolean;
    recordingUrl: string | null;
    callData: any;
  }>({ isOpen: false, recordingUrl: null, callData: null });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Fetch call attempts
      const { data: attemptsData, error: attemptsError } = await supabase
        .from("call_attempts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (attemptsError) throw attemptsError;
      setAttempts(attemptsData || []);

      // Fetch call records (Retell calls)
      const { data: recordsData, error: recordsError } = await supabase
        .from("call_records")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (recordsError) throw recordsError;
      setCallRecords(recordsData || []);
    } catch (error) {
      console.error("Error fetching call data:", error);
      toast({
        title: "Error loading call data",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAttempt = async (id: string) => {
    try {
      const { error } = await supabase
        .from("call_attempts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setAttempts(prev => prev.filter(a => a.id !== id));
      toast({ title: "Call attempt deleted" });
    } catch (error) {
      console.error("Error deleting call attempt:", error);
      toast({ title: "Error deleting", variant: "destructive" });
    }
  };

  const getRecordingUrl = (record: CallRecord): string | null => {
    if (!record.notes) return null;
    try {
      const notes = typeof record.notes === 'string' ? JSON.parse(record.notes) : record.notes;
      return notes.recording_url || notes.retell_metadata?.recording_url || null;
    } catch {
      return null;
    }
  };

  const openRecordingPlayer = (record: CallRecord) => {
    const recordingUrl = getRecordingUrl(record);
    setSelectedRecording({
      isOpen: true,
      recordingUrl,
      callData: {
        facility_name: record.facility_name,
        phone_number: record.phone_number,
        duration: record.duration || 0,
        outcome: record.outcome,
        notes: record.notes,
        created_at: record.created_at,
      },
    });
  };

  // Use demo data when demo mode is active
  const displayAttempts = isDemoMode ? demoCallAttempts.map(da => ({
    id: da.id,
    business_name: da.business_name,
    phone_number: da.phone_number,
    status: da.status === "completed" ? "success" : da.status,
    error_message: da.error_message,
    auto_triggered: da.auto_triggered,
    payload: da.payload,
    created_at: da.created_at,
  })) : attempts;

  const filteredAttempts = useMemo(() => {
    return displayAttempts.filter(attempt => {
      const matchesSearch = 
        attempt.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attempt.phone_number.includes(searchQuery);
      const matchesStatus = statusFilter === "all" || attempt.status === statusFilter;
      let matchesDate = true;
      if (dateFilter !== "all") {
        const attemptDate = new Date(attempt.created_at);
        const now = new Date();
        switch (dateFilter) {
          case "today":
            matchesDate = attemptDate.toDateString() === now.toDateString();
            break;
          case "week":
            matchesDate = attemptDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            matchesDate = attemptDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        }
      }
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [displayAttempts, searchQuery, statusFilter, dateFilter]);

  const filteredRecords = useMemo(() => {
    return callRecords.filter(record => {
      const matchesSearch = 
        record.facility_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.phone_number.includes(searchQuery);
      const matchesStatus = statusFilter === "all" || record.status === statusFilter || record.outcome === statusFilter;
      let matchesDate = true;
      if (dateFilter !== "all") {
        const recordDate = new Date(record.created_at);
        const now = new Date();
        switch (dateFilter) {
          case "today":
            matchesDate = recordDate.toDateString() === now.toDateString();
            break;
          case "week":
            matchesDate = recordDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            matchesDate = recordDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        }
      }
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [callRecords, searchQuery, statusFilter, dateFilter]);

  const stats = useMemo(() => {
    const allRecords = [...displayAttempts.map(a => ({ status: a.status, outcome: a.status })), ...callRecords];
    return {
      total: allRecords.length,
      success: allRecords.filter(a => ['success', 'completed', 'interested'].includes(a.status) || ['interested', 'completed'].includes(a.outcome || '')).length,
      failed: allRecords.filter(a => a.status === 'failed').length,
      pending: allRecords.filter(a => ['pending', 'in_progress', 'initiated'].includes(a.status)).length,
    };
  }, [displayAttempts, callRecords]);

  const getStatusBadge = (status: string, outcome?: string | null) => {
    const displayStatus = outcome || status;
    switch (displayStatus) {
      case "success":
      case "completed":
      case "interested":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="mr-1 h-3 w-3" />
            {displayStatus === "interested" ? "Interested" : "Completed"}
          </Badge>
        );
      case "failed":
      case "not_interested":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="mr-1 h-3 w-3" />
            {displayStatus === "not_interested" ? "Not Interested" : "Failed"}
          </Badge>
        );
      case "voicemail":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <MessageSquare className="mr-1 h-3 w-3" />
            Voicemail
          </Badge>
        );
      case "in_progress":
      case "initiated":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            <Phone className="mr-1 h-3 w-3 animate-pulse" />
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading call data...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-orbitron bg-gradient-primary bg-clip-text text-transparent">
              Call Center
            </h1>
            <p className="text-muted-foreground mt-2">
              Track AI sales calls, recordings, and outcomes
            </p>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Demo Mode Banner */}
        {isDemoMode && (
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-lg p-4 flex items-center gap-3">
            <Play className="h-5 w-5 text-green-500 fill-green-500" />
            <div>
              <p className="font-medium text-green-400">Demo Mode Active</p>
              <p className="text-sm text-muted-foreground">Showing sample call data for demonstrations</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Calls</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Phone className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Successful</p>
                  <p className="text-2xl font-bold text-green-400">{stats.success}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">
                    {stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by business name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="interested">Interested</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                  <SelectItem value="voicemail">Voicemail</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Records vs Attempts */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center gap-2">
              <Headphones className="h-4 w-4" />
              Retell Calls ({callRecords.length})
            </TabsTrigger>
            <TabsTrigger value="attempts" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Call Attempts ({displayAttempts.length})
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <CallAnalyticsDashboard 
              callRecords={callRecords} 
              callAttempts={displayAttempts.map(a => ({
                id: a.id,
                business_name: a.business_name,
                phone_number: a.phone_number,
                status: a.status,
                auto_triggered: a.auto_triggered,
                created_at: a.created_at,
              }))} 
            />
          </TabsContent>

          {/* Retell Call Records Tab */}
          <TabsContent value="records">
            <Card>
              <CardHeader>
                <CardTitle>AI Call Recordings</CardTitle>
                <CardDescription>
                  {filteredRecords.length} of {callRecords.length} Retell AI calls with recordings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <Headphones className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">No call recordings found</h3>
                    <p className="text-muted-foreground mt-2">
                      {callRecords.length === 0 
                        ? "Retell AI call recordings will appear here"
                        : "No calls match your current filters"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Facility</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Lead Score</TableHead>
                          <TableHead className="text-right">Recording</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(record.created_at), "MMM d, yyyy HH:mm")}
                            </TableCell>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {record.facility_name}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {record.phone_number}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(record.status, record.outcome)}
                            </TableCell>
                            <TableCell>
                              {formatDuration(record.duration)}
                            </TableCell>
                            <TableCell>
                              {record.lead_score ? (
                                <Badge variant="outline" className={
                                  record.lead_score >= 80 ? 'border-green-500 text-green-400' :
                                  record.lead_score >= 60 ? 'border-yellow-500 text-yellow-400' :
                                  'border-gray-500 text-gray-400'
                                }>
                                  {record.lead_score}
                                </Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openRecordingPlayer(record)}
                                className="gap-2"
                              >
                                {getRecordingUrl(record) ? (
                                  <>
                                    <Play className="h-4 w-4" />
                                    Play
                                  </>
                                ) : (
                                  <>
                                    <MessageSquare className="h-4 w-4" />
                                    Details
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
          </TabsContent>

          {/* Legacy Call Attempts Tab */}
          <TabsContent value="attempts">
            <Card>
              <CardHeader>
                <CardTitle>Call Attempts</CardTitle>
                <CardDescription>
                  {filteredAttempts.length} of {displayAttempts.length} call attempts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredAttempts.length === 0 ? (
                  <div className="text-center py-12">
                    <Phone className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">No call attempts found</h3>
                    <p className="text-muted-foreground mt-2">
                      {displayAttempts.length === 0 
                        ? "Call attempts will appear here when auto-calls are triggered"
                        : "No calls match your current filters"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Business</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Error</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAttempts.map((attempt) => (
                          <TableRow key={attempt.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(attempt.created_at), "MMM d, yyyy HH:mm")}
                            </TableCell>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {attempt.business_name}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {attempt.phone_number}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(attempt.status)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {attempt.auto_triggered ? "Auto" : "Manual"}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              {attempt.error_message ? (
                                <span className="text-xs text-red-400 truncate block" title={attempt.error_message}>
                                  {attempt.error_message.substring(0, 50)}...
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {!isDemoMode && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteAttempt(attempt.id)}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Recording Player Modal */}
      <CallRecordingPlayer
        isOpen={selectedRecording.isOpen}
        onClose={() => setSelectedRecording({ isOpen: false, recordingUrl: null, callData: null })}
        recordingUrl={selectedRecording.recordingUrl}
        callData={selectedRecording.callData || {
          facility_name: '',
          phone_number: '',
          created_at: new Date().toISOString(),
        }}
      />
    </DashboardLayout>
  );
};

export default CallAttempts;
