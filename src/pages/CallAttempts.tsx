import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, CheckCircle, XCircle, Clock, Search, Calendar, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

interface CallAttempt {
  id: string;
  user_id: string;
  job_id: string | null;
  business_name: string;
  phone_number: string;
  status: string;
  error_message: string | null;
  auto_triggered: boolean;
  payload: any;
  created_at: string;
}

const CallAttempts = () => {
  const [attempts, setAttempts] = useState<CallAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchAttempts();
  }, []);

  const fetchAttempts = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("call_attempts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAttempts(data || []);
    } catch (error) {
      console.error("Error fetching call attempts:", error);
      toast({
        title: "Error loading call attempts",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("call_attempts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setAttempts(prev => prev.filter(a => a.id !== id));
      toast({
        title: "Call attempt deleted",
      });
    } catch (error) {
      console.error("Error deleting call attempt:", error);
      toast({
        title: "Error deleting",
        variant: "destructive",
      });
    }
  };

  const filteredAttempts = useMemo(() => {
    return attempts.filter(attempt => {
      // Search filter
      const matchesSearch = 
        attempt.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attempt.phone_number.includes(searchQuery);

      // Status filter
      const matchesStatus = statusFilter === "all" || attempt.status === statusFilter;

      // Date filter
      let matchesDate = true;
      if (dateFilter !== "all") {
        const attemptDate = new Date(attempt.created_at);
        const now = new Date();
        
        switch (dateFilter) {
          case "today":
            matchesDate = attemptDate.toDateString() === now.toDateString();
            break;
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = attemptDate >= weekAgo;
            break;
          case "month":
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = attemptDate >= monthAgo;
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [attempts, searchQuery, statusFilter, dateFilter]);

  const stats = useMemo(() => ({
    total: attempts.length,
    success: attempts.filter(a => a.status === "success").length,
    failed: attempts.filter(a => a.status === "failed").length,
    pending: attempts.filter(a => a.status === "pending").length,
  }), [attempts]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="mr-1 h-3 w-3" />
            Success
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading call attempts...</p>
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
              Call Attempts
            </h1>
            <p className="text-muted-foreground mt-2">
              Track all AI sales call attempts and their outcomes
            </p>
          </div>
          <Button onClick={fetchAttempts} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

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
            <CardTitle>Filter Call Attempts</CardTitle>
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
                  <SelectItem value="success">Success</SelectItem>
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

        {/* Call Attempts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Call History</CardTitle>
            <CardDescription>
              {filteredAttempts.length} of {attempts.length} call attempts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAttempts.length === 0 ? (
              <div className="text-center py-12">
                <Phone className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No call attempts found</h3>
                <p className="text-muted-foreground mt-2">
                  {attempts.length === 0 
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(attempt.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
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

export default CallAttempts;