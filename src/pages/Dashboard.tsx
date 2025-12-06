import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import UsageTracking from "@/components/UsageTracking";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { 
  Briefcase, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp,
  Activity,
  Plus,
  BookOpen
} from "lucide-react";
import { format, subDays, startOfDay, isWithinInterval } from "date-fns";

interface Job {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  scrape_type: string;
}

interface Stats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  successRate: number;
  avgProcessingTime: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0,
    successRate: 0,
    avgProcessingTime: 0,
  });

  useEffect(() => {
    fetchJobsAndStats();
  }, []);

  const fetchJobsAndStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("scraping_jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setJobs(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast({
        title: "Error loading dashboard",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (jobsData: Job[]) => {
    const total = jobsData.length;
    const completed = jobsData.filter(j => j.status === "completed").length;
    const failed = jobsData.filter(j => j.status === "failed").length;
    const pending = jobsData.filter(j => j.status === "pending" || j.status === "in_progress").length;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate average processing time for completed jobs
    const completedJobs = jobsData.filter(j => j.status === "completed");
    const totalTime = completedJobs.reduce((acc, job) => {
      const start = new Date(job.created_at).getTime();
      const end = new Date(job.updated_at).getTime();
      return acc + (end - start);
    }, 0);
    const avgProcessingTime = completedJobs.length > 0 
      ? Math.round(totalTime / completedJobs.length / 1000) // Convert to seconds
      : 0;

    setStats({
      total,
      completed,
      failed,
      pending,
      successRate,
      avgProcessingTime,
    });
  };

  // Data for charts
  const statusData = [
    { name: "Completed", value: stats.completed, color: "#10b981" },
    { name: "Failed", value: stats.failed, color: "#ef4444" },
    { name: "Pending", value: stats.pending, color: "#eab308" },
  ];

  // Get job trends for the last 7 days
  const getLast7DaysTrends = () => {
    const trends = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayJobs = jobs.filter(job => 
        isWithinInterval(new Date(job.created_at), { start: dayStart, end: dayEnd })
      );
      
      trends.push({
        date: format(date, "MMM dd"),
        total: dayJobs.length,
        completed: dayJobs.filter(j => j.status === "completed").length,
        failed: dayJobs.filter(j => j.status === "failed").length,
      });
    }
    return trends;
  };

  // Get job type distribution
  const getJobTypeDistribution = () => {
    const typeCount: Record<string, number> = {};
    jobs.forEach(job => {
      typeCount[job.scrape_type] = (typeCount[job.scrape_type] || 0) + 1;
    });
    
    return Object.entries(typeCount).map(([type, count]) => ({
      name: type.split("_").map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(" "),
      value: count,
    }));
  };

  // Get success rate by scrape type
  const getSuccessRateByType = () => {
    const typeStats: Record<string, { completed: number; total: number }> = {};
    jobs.forEach(job => {
      if (!typeStats[job.scrape_type]) {
        typeStats[job.scrape_type] = { completed: 0, total: 0 };
      }
      typeStats[job.scrape_type].total++;
      if (job.status === "completed") {
        typeStats[job.scrape_type].completed++;
      }
    });
    
    return Object.entries(typeStats).map(([type, data]) => ({
      name: type.split("_").map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(" "),
      successRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      completed: data.completed,
      total: data.total,
    }));
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}m ${secs}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const trendData = getLast7DaysTrends();
  const typeData = getJobTypeDistribution();
  const successByTypeData = getSuccessRateByType();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-orbitron bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
              Dashboard Overview
            </h1>
            <p className="text-muted-foreground mt-2">
              Track your scraping jobs performance and analytics
            </p>
          </div>
          <Button
            onClick={() => navigate("/new-job")}
            className="bg-gradient-to-r from-pink-500 to-cyan-500 hover:opacity-90 transition-opacity"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Job
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All time scraping jobs
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.successRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.completed} completed jobs
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(stats.avgProcessingTime)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Per completed job
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Currently processing
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Job Trends Chart */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Job Trends (Last 7 Days)</CardTitle>
              <CardDescription>
                Daily job creation and completion rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    className="text-xs"
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    name="Total"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Completed"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="failed" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Failed"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status Distribution Chart */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
              <CardDescription>
                Breakdown of job statuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => 
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Job Type Distribution */}
        {typeData.length > 0 && (
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Scrape Type Distribution</CardTitle>
              <CardDescription>
                Most used scraping types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs"
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    className="text-xs"
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="url(#colorGradient)"
                    radius={[8, 8, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ec4899" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Success Rate by Scrape Type */}
        {successByTypeData.length > 0 && (
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Success Rate by Scrape Type</CardTitle>
              <CardDescription>
                Compare performance across different scraping methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {successByTypeData.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.successRate}% ({item.completed}/{item.total})
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${item.successRate}%`,
                          background: item.successRate >= 80 
                            ? '#10b981' 
                            : item.successRate >= 50 
                              ? '#eab308' 
                              : '#ef4444'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage Tracking */}
        <UsageTracking />

        {/* Quick Actions */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Access your most used features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/new-job")}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create New Job
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/jobs")}
                className="flex items-center gap-2"
              >
                <Briefcase className="h-4 w-4" />
                View All Jobs
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/results")}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                View Results
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/api-docs")}
                className="flex items-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                API Docs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
