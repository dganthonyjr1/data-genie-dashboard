import { useEffect, useState } from "react";
import { Calendar, Clock, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface ScheduledJob {
  id: string;
  url: string;
  scrape_type: string;
  schedule_enabled: boolean;
  schedule_frequency: string | null;
  schedule_interval: number | null;
  next_run_at: string | null;
  last_run_at: string | null;
  status: string;
  created_at: string;
}

const ScheduledJobs = () => {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchScheduledJobs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('scheduled_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scraping_jobs'
        },
        () => {
          fetchScheduledJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchScheduledJobs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("scraping_jobs")
        .select("id, url, scrape_type, schedule_enabled, schedule_frequency, schedule_interval, next_run_at, last_run_at, status, created_at")
        .eq("user_id", user.id)
        .not("schedule_frequency", "is", null)
        .order("next_run_at", { ascending: true, nullsFirst: false });

      if (error) throw error;

      setJobs(data || []);
    } catch (error) {
      console.error("Error fetching scheduled jobs:", error);
      toast({
        title: "Error loading scheduled jobs",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSchedule = async (jobId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("scraping_jobs")
        .update({ schedule_enabled: !currentState })
        .eq("id", jobId);

      if (error) throw error;

      toast({
        title: currentState ? "Schedule disabled" : "Schedule enabled",
        description: currentState 
          ? "This job will no longer run automatically" 
          : "This job will run according to its schedule",
      });

      // Update local state
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, schedule_enabled: !currentState } : job
      ));
    } catch (error) {
      console.error("Error toggling schedule:", error);
      toast({
        title: "Failed to update schedule",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const formatScrapeType = (type: string) => {
    return type.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  const getScheduleDescription = (frequency: string | null, interval: number | null) => {
    if (!frequency || !interval) return "Not configured";
    
    const pluralSuffix = interval > 1 ? "s" : "";
    return `Every ${interval} ${frequency.replace(/ly$/, "")}${pluralSuffix}`;
  };

  const formatNextRun = (nextRunAt: string | null) => {
    if (!nextRunAt) return "Not scheduled";
    
    const nextRun = new Date(nextRunAt);
    const now = new Date();
    
    if (nextRun < now) {
      return "Overdue";
    }
    
    return `in ${formatDistanceToNow(nextRun)}`;
  };

  const getStatusColor = (enabled: boolean, nextRunAt: string | null) => {
    if (!enabled) return "bg-muted text-muted-foreground";
    if (!nextRunAt) return "bg-muted text-muted-foreground";
    
    const nextRun = new Date(nextRunAt);
    const now = new Date();
    
    if (nextRun < now) {
      return "bg-orange-500/20 text-orange-400 border-orange-500/50";
    }
    
    return "bg-green-500/20 text-green-400 border-green-500/50";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading scheduled jobs...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-orbitron bg-gradient-primary bg-clip-text text-transparent">
            Scheduled Jobs
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your automated scraping schedules
          </p>
        </div>

        {jobs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No scheduled jobs found. Create a new job with scheduling enabled to see it here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="truncate">{job.url}</span>
                        <Badge variant="outline" className="ml-2">
                          {formatScrapeType(job.scrape_type)}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {getScheduleDescription(job.schedule_frequency, job.schedule_interval)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={job.schedule_enabled}
                        onCheckedChange={() => handleToggleSchedule(job.id, job.schedule_enabled)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {job.schedule_enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Next Run</p>
                        <Badge 
                          variant="outline" 
                          className={getStatusColor(job.schedule_enabled, job.next_run_at)}
                        >
                          {formatNextRun(job.next_run_at)}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <RefreshCw className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Last Run</p>
                        <p className="text-sm text-muted-foreground">
                          {job.last_run_at 
                            ? formatDistanceToNow(new Date(job.last_run_at), { addSuffix: true })
                            : "Never"
                          }
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Created</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ScheduledJobs;
