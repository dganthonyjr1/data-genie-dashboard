import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Plus, ExternalLink, Eye, Loader2, RefreshCw, StopCircle, Trash2, Filter, Search, Download, FileJson, FileSpreadsheet, Play } from "lucide-react";
import { JobDetailsModal } from "@/components/JobDetailsModal";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { isWithinInterval } from "date-fns";

interface Job {
  id: string;
  url: string;
  scrape_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  results: any[];
  results_count: number;
  fields_count: number;
  ai_instructions: string | null;
}

const Jobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<Job | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
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

      // Only fetch essential columns for list view - results fetched on demand
      const { data, error } = await supabase
        .from("scraping_jobs")
        .select("id, url, scrape_type, status, created_at, updated_at, ai_instructions, results_count, fields_count")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      setJobs(data.map(job => ({
        ...job,
        results: [], // Results loaded on demand
        results_count: job.results_count || 0,
        fields_count: job.fields_count || 0
      })) || []);
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

  // Fetch results for a specific job on demand
  const fetchJobResults = async (jobId: string): Promise<any[]> => {
    const { data, error } = await supabase
      .from("scraping_jobs")
      .select("results")
      .eq("id", jobId)
      .single();
    
    if (error || !data) return [];
    return Array.isArray(data.results) ? data.results : [];
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

  const filteredJobs = jobs.filter(job => {
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    const matchesType = typeFilter === "all" || job.scrape_type === typeFilter;
    const matchesSearch = searchQuery === "" || 
      job.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.scrape_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatScrapeType(job.scrape_type).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDateRange = !dateRange?.from || (
      dateRange.to 
        ? isWithinInterval(new Date(job.created_at), { start: dateRange.from, end: dateRange.to })
        : new Date(job.created_at).toDateString() === dateRange.from.toDateString()
    );
    
    return matchesStatus && matchesType && matchesSearch && matchesDateRange;
  });

  const uniqueScrapeTypes = Array.from(new Set(jobs.map(job => job.scrape_type)));

  // Pagination calculations
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = (filterType: 'status' | 'type', value: string) => {
    setCurrentPage(1);
    if (filterType === 'status') {
      setStatusFilter(value);
    } else {
      setTypeFilter(value);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setCurrentPage(1);
  };

  const toggleJobSelection = (jobId: string) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedJobs.size === paginatedJobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(paginatedJobs.map(job => job.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedJobs.size === 0) return;

    try {
      const deletePromises = Array.from(selectedJobs).map(jobId =>
        supabase.from("scraping_jobs").delete().eq("id", jobId)
      );

      const results = await Promise.all(deletePromises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw new Error(`Failed to delete ${errors.length} job(s)`);
      }

      toast({
        title: "Jobs deleted",
        description: `Successfully deleted ${selectedJobs.size} job(s)`,
      });

      setSelectedJobs(new Set());
      setDeleteDialogOpen(false);
      setJobToDelete(null);
    } catch (error) {
      console.error("Error deleting jobs:", error);
      toast({
        title: "Failed to delete",
        description: error instanceof Error ? error.message : "Could not delete all jobs",
        variant: "destructive",
      });
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      // Update job status to pending
      const { error: updateError } = await supabase
        .from("scraping_jobs")
        .update({ 
          status: "pending",
          results: [],
          results_count: 0
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
          results: [{ message: "Job cancelled by user" }],
          results_count: 0
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

  const convertToCSV = (jobsData: Job[]) => {
    const headers = ['ID', 'URL', 'Type', 'Status', 'Created At'];
    const rows = jobsData.map(job => [
      job.id,
      job.url,
      formatScrapeType(job.scrape_type),
      job.status,
      new Date(job.created_at).toISOString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csvContent;
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = (jobIds?: string[]) => {
    const jobsToExport = jobIds 
      ? jobs.filter(job => jobIds.includes(job.id))
      : jobs.filter(job => selectedJobs.has(job.id));
    
    if (jobsToExport.length === 0) return;
    
    const csv = convertToCSV(jobsToExport);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadFile(csv, `jobs-export-${timestamp}.csv`, 'text/csv');
    
    toast({
      title: "Export successful",
      description: `Exported ${jobsToExport.length} job(s) to CSV`,
    });
  };

  const handleExportJSON = (jobIds?: string[]) => {
    const jobsToExport = jobIds 
      ? jobs.filter(job => jobIds.includes(job.id))
      : jobs.filter(job => selectedJobs.has(job.id));
    
    if (jobsToExport.length === 0) return;
    
    const json = JSON.stringify(jobsToExport, null, 2);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadFile(json, `jobs-export-${timestamp}.json`, 'application/json');
    
    toast({
      title: "Export successful",
      description: `Exported ${jobsToExport.length} job(s) to JSON`,
    });
  };

  // Flatten nested objects for results CSV export
  const flattenObject = (obj: any, prefix = ''): Record<string, string> => {
    const result: Record<string, string> = {};
    
    for (const key in obj) {
      const newKey = prefix ? `${prefix}_${key}` : key;
      const value = obj[key];
      
      if (value === null || value === undefined) {
        result[newKey] = '';
      } else if (Array.isArray(value)) {
        result[newKey] = value.join('; ');
      } else if (typeof value === 'object') {
        Object.assign(result, flattenObject(value, newKey));
      } else {
        result[newKey] = String(value);
      }
    }
    
    return result;
  };

  // Download actual scraping results as CSV
  const handleDownloadResultsCSV = async (job: Job) => {
    toast({ title: "Loading results...", description: "Fetching data for download" });
    
    const results = await fetchJobResults(job.id);
    
    if (!results || results.length === 0) {
      toast({
        title: "No results",
        description: "This job has no results to download",
        variant: "destructive",
      });
      return;
    }

    // Flatten all results
    const flattenedResults = results.map(row => flattenObject(row));
    
    // Get all unique keys
    const allKeys = new Set<string>();
    flattenedResults.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });
    const headers = Array.from(allKeys);

    const csvRows = [
      headers.join(","),
      ...flattenedResults.map(row =>
        headers.map(header => {
          const value = row[header] || "";
          if (value.includes(",") || value.includes('"') || value.includes("\n")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(",")
      )
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scrape-results-${job.id.slice(0, 8)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Downloaded!",
      description: `CSV with ${results.length} result(s) downloaded`,
    });
  };

  // Download results as JSON
  const handleDownloadResultsJSON = async (job: Job) => {
    toast({ title: "Loading results...", description: "Fetching data for download" });
    
    const results = await fetchJobResults(job.id);
    
    if (!results || results.length === 0) {
      toast({
        title: "No results",
        description: "This job has no results to download",
        variant: "destructive",
      });
      return;
    }

    const jsonContent = JSON.stringify(results, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scrape-results-${job.id.slice(0, 8)}.json`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Downloaded!",
      description: `JSON with ${results.length} result(s) downloaded`,
    });
  };

  const handleViewDetails = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      // Fetch results on demand for the details modal
      const results = await fetchJobResults(jobId);
      setSelectedJobForDetails({ ...job, results });
      setDetailsModalOpen(true);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold font-orbitron bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
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

        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by URL or type..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 bg-card/50 border-border/50"
            />
          </div>

          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Status:</span>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange('status', 'all')}
                className={statusFilter === "all" ? "bg-primary" : ""}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange('status', 'pending')}
                className={statusFilter === "pending" ? "bg-yellow-500 hover:bg-yellow-600" : ""}
              >
                Pending
              </Button>
              <Button
                variant={statusFilter === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange('status', 'completed')}
                className={statusFilter === "completed" ? "bg-green-500 hover:bg-green-600" : ""}
              >
                Completed
              </Button>
              <Button
                variant={statusFilter === "failed" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange('status', 'failed')}
                className={statusFilter === "failed" ? "bg-red-500 hover:bg-red-600" : ""}
              >
                Failed
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Type:</span>
            </div>

            <Select value={typeFilter} onValueChange={(value) => handleFilterChange('type', value)}>
              <SelectTrigger className="w-[180px] bg-card/50 border-border/50">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="all">All Types</SelectItem>
                {uniqueScrapeTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {formatScrapeType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={handleDateRangeChange}
            />

            {(statusFilter !== "all" || typeFilter !== "all" || dateRange) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setTypeFilter("all");
                  setDateRange(undefined);
                  setCurrentPage(1);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear Filters
              </Button>
            )}

            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSearchChange("")}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear Search
              </Button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Items per page:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-[100px] bg-card/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
            </Select>
          </div>
        </div>
        </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading jobs...</p>
          </div>
        ) : filteredJobs.length === 0 && jobs.length === 0 ? (
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
        ) : filteredJobs.length === 0 ? (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "No jobs match your search" : "No jobs match your filters"}
              </p>
              <div className="flex gap-2 justify-center">
                {searchQuery && (
                  <Button
                    onClick={() => handleSearchChange("")}
                    variant="outline"
                    className="border-pink-500/50 hover:bg-pink-500/10"
                  >
                    Clear Search
                  </Button>
                )}
                {(statusFilter !== "all" || typeFilter !== "all" || dateRange) && (
                  <Button
                    onClick={() => {
                      setStatusFilter("all");
                      setTypeFilter("all");
                      setDateRange(undefined);
                    }}
                    variant="outline"
                    className="border-pink-500/50 hover:bg-pink-500/10"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {selectedJobs.size > 0 && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedJobs.size === paginatedJobs.length}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedJobs.size} job(s) selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportCSV()}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportJSON()}
                  >
                    <FileJson className="mr-2 h-4 w-4" />
                    Export JSON
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setJobToDelete(null);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected
                  </Button>
                </div>
              </div>
            )}

            <div className="grid gap-4">
              {paginatedJobs.map((job) => (
              <Card 
                key={job.id} 
                className="bg-card/50 border-border/50 hover:bg-card/70 transition-colors cursor-pointer"
                onClick={() => handleViewDetails(job.id)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Checkbox
                        checked={selectedJobs.has(job.id)}
                        onCheckedChange={() => toggleJobSelection(job.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          {job.url}
                        </CardTitle>
                      <CardDescription className="mt-2 flex items-center gap-2 flex-wrap">
                        <span>{formatScrapeType(job.scrape_type)}</span>
                        <span>•</span>
                        <span>Created {new Date(job.created_at).toLocaleDateString()}</span>
                        {job.status === "completed" && job.results_count > 1 && (
                          <>
                            <span>•</span>
                            <span className="text-green-400">{job.results_count} results</span>
                          </>
                        )}
                        {job.status === "completed" && job.results_count === 1 && job.fields_count > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-green-400">{job.fields_count} fields extracted</span>
                          </>
                        )}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/results/${job.id}`);
                      }}
                      className="flex-1 sm:flex-none"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Results
                    </Button>
                    {job.status === "completed" && job.results_count > 0 && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadResultsCSV(job);
                          }}
                          className="flex-1 sm:flex-none"
                        >
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          CSV
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadResultsJSON(job);
                          }}
                          className="flex-1 sm:flex-none"
                        >
                          <FileJson className="mr-2 h-4 w-4" />
                          JSON
                        </Button>
                      </>
                    )}
                    {job.status === "failed" && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetryJob(job.id);
                        }}
                        className="flex-1 sm:flex-none border-green-500/50 hover:bg-green-500/10 text-green-400"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Retry
                      </Button>
                    )}
                    {job.status === "pending" && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetryJob(job.id);
                        }}
                        className="flex-1 sm:flex-none border-green-500/50 hover:bg-green-500/10 text-green-400"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Run Now
                      </Button>
                    )}
                    {(job.status === "in_progress" || job.status === "pending") && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelJob(job.id);
                        }}
                        className="flex-1 sm:flex-none border-red-500/50 hover:bg-red-500/10 text-red-400"
                      >
                        <StopCircle className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(job.id);
                      }}
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredJobs.length)} of {filteredJobs.length} jobs
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNum)}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}

        <JobDetailsModal
          job={selectedJobForDetails}
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedJobs.size > 0 && !jobToDelete
                  ? `This action cannot be undone. This will permanently delete ${selectedJobs.size} job(s) and all their results.`
                  : "This action cannot be undone. This will permanently delete the scraping job and all its results."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={selectedJobs.size > 0 && !jobToDelete ? handleBulkDelete : handleDeleteJob}
                className="bg-destructive hover:bg-destructive/90"
              >
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
