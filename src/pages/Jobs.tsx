import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, ExternalLink, Eye, Loader2, RefreshCw, StopCircle, Trash2 } from "lucide-react";

interface Job {
  id: string;
  url: string;
  scrape_type: string;
  status: string;
  created_at: string;
}

const Jobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchJobs();

    // Update elapsed time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    // Subscribe to realtime updates
    const channel = supabase
      .channel('scraping_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scraping_jobs'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setJobs(prev => [payload.new as Job, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setJobs(prev => prev.map(job => 
              job.id === payload.new.id ? payload.new as Job : job
            ));
          } else if (payload.eventType === 'DELETE') {
            setJobs(prev => prev.filter(job => job.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(timeInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchJobs = async () => {
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
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast({
        title: "Error loading jobs",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "in_progress":
        return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      default:
        return "bg-muted";
    }
  };

  const formatScrapeType = (type: string) => {
    return type.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  const getElapsedTime = (createdAt: string) => {
    const elapsed = Math.floor((currentTime - new Date(createdAt).getTime()) / 1000);
    
    if (elapsed < 60) {
      return `${elapsed}s`;
    } else if (elapsed < 3600) {
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      return `${minutes}m ${seconds}s`;
    } else {
      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      // Update job status to pending
      const { error: updateError } = await supabase
        .from("scraping_jobs")
        .update({ 
          status: "pending",
          results: []
        })
        .eq("id", jobId);

      if (updateError) throw updateError;

      // Trigger the edge function to process the job
      const { error: invokeError } = await supabase.functions.invoke("process-scrape", {
        body: { jobId }
      });

      if (invokeError) throw invokeError;

      toast({
        title: "Job retrying",
        description: "The scraping job has been restarted",
      });
    } catch (error) {
      console.error("Error retrying job:", error);
      toast({
        title: "Failed to retry",
        description: "Could not restart the scraping job",
        variant: "destructive",
      });
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from("scraping_jobs")
        .update({ 
          status: "failed",
          results: [{ message: "Job cancelled by user" }]
        })
        .eq("id", jobId);

      if (error) throw error;

      toast({
        title: "Job cancelled",
        description: "The scraping job has been stopped",
      });
    } catch (error) {
      console.error("Error cancelling job:", error);
      toast({
        title: "Failed to cancel",
        description: "Could not stop the scraping job",
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (jobId: string) => {
    setJobToDelete(jobId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteJob = async () => {
    if (!jobToDelete) return;

    try {
      const { error } = await supabase
        .from("scraping_jobs")
        .delete()
        .eq("id", jobToDelete);

      if (error) throw error;

      toast({
        title: "Job deleted",
        description: "The scraping job has been removed",
      });

      setDeleteDialogOpen(false);
      setJobToDelete(null);
    } catch (error) {
      console.error("Error deleting job:", error);
      toast({
        title: "Failed to delete",
        description: "Could not remove the scraping job",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
              Scraping Jobs
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage and monitor your web scraping tasks
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

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No scraping jobs yet</p>
              <Button
                onClick={() => navigate("/new-job")}
                variant="outline"
                className="border-pink-500/50 hover:bg-pink-500/10"
              >
                Create Your First Job
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <Card key={job.id} className="bg-card/50 border-border/50 hover:bg-card/70 transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        {job.url}
                      </CardTitle>
                      <CardDescription className="mt-2 flex items-center gap-2 flex-wrap">
                        <span>{formatScrapeType(job.scrape_type)}</span>
                        <span>•</span>
                        <span>Created {new Date(job.created_at).toLocaleDateString()}</span>
                        {(job.status === "in_progress" || job.status === "pending") && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-primary">
                              <Clock className="h-3 w-3" />
                              {getElapsedTime(job.created_at)} elapsed
                            </span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(job.status)}>
                      {(job.status === "in_progress" || job.status === "pending") && (
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      )}
                      {job.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/results/${job.id}`)}
                      className="flex-1 sm:flex-none"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Results
                    </Button>
                    {job.status === "failed" && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRetryJob(job.id)}
                        className="flex-1 sm:flex-none border-green-500/50 hover:bg-green-500/10 text-green-400"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Retry
                      </Button>
                    )}
                    {(job.status === "in_progress" || job.status === "pending") && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCancelJob(job.id)}
                        className="flex-1 sm:flex-none border-red-500/50 hover:bg-red-500/10 text-red-400"
                      >
                        <StopCircle className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openDeleteDialog(job.id)}
                      className="flex-1 sm:flex-none border-destructive/50 hover:bg-destructive/10 text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the scraping job and all its results.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteJob} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Jobs;
