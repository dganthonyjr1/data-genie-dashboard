import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Eye, Plus, Loader2, Clock, RefreshCw, StopCircle, Trash2, Filter, Search, Download, FileJson, FileSpreadsheet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  ai_instructions: string | null;
}

export default function Results() {
  const navigate = useNavigate();
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

  useEffect(() => {
    fetchJobs();

    // Update elapsed time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    // Subscribe to realtime updates
    const channel = supabase
      .channel('results_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scraping_jobs'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newJob = {
              ...payload.new,
              results: Array.isArray(payload.new.results) ? payload.new.results : []
            } as Job;
            setJobs(prev => [newJob, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setJobs(prev => prev.map(job => 
              job.id === payload.new.id 
                ? {
                    ...payload.new,
                    results: Array.isArray(payload.new.results) ? payload.new.results : []
                  } as Job
                : job
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
        toast({
          title: "Authentication required",
          description: "Please log in to view results",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("scraping_jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Error loading jobs",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setJobs(data.map(job => ({
        ...job,
        results: Array.isArray(job.results) ? job.results : []
      })));
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "failed":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "processing":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const formatScrapeType = (type: string) => {
    return type
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
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

  const convertToCSV = (jobsData: Job[]) => {
    const headers = ['ID', 'URL', 'Type', 'Status', 'Results Count', 'Created At'];
    const rows = jobsData.map(job => [
      job.id,
      job.url,
      formatScrapeType(job.scrape_type),
      job.status,
      job.results.length.toString(),
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
    downloadFile(csv, `results-export-${timestamp}.csv`, 'text/csv');
    
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
    downloadFile(json, `results-export-${timestamp}.json`, 'application/json');
    
    toast({
      title: "Export successful",
      description: `Exported ${jobsToExport.length} job(s) to JSON`,
    });
  };

  const handleViewDetails = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      setSelectedJobForDetails(job);
      setDetailsModalOpen(true);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Results</h1>
            <p className="text-muted-foreground mt-2">View and manage your scraping results</p>
          </div>
          <Button onClick={() => navigate("/new-job")}>
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

        {filteredJobs.length === 0 && jobs.length === 0 ? (
          <div className="text-center py-12 border border-border rounded-lg">
            <p className="text-muted-foreground mb-4">No jobs found. Create your first scraping job to get started!</p>
            <Button onClick={() => navigate("/new-job")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Job
            </Button>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12 border border-border rounded-lg">
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "No jobs match your search" : "No jobs match your filters"}
            </p>
            <div className="flex gap-2 justify-center">
              {searchQuery && (
                <Button
                  onClick={() => handleSearchChange("")}
                  variant="outline"
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
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            {selectedJobs.size > 0 && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center justify-between mb-4">
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

            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedJobs.size === paginatedJobs.length && paginatedJobs.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Results</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedJobs.map((job) => (
                  <TableRow 
                    key={job.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewDetails(job.id)}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedJobs.has(job.id)}
                        onCheckedChange={() => toggleJobSelection(job.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">
                      {job.url}
                    </TableCell>
                    <TableCell>{formatScrapeType(job.scrape_type)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(job.status)}>
                        {(job.status === "processing" || job.status === "pending" || job.status === "in_progress") && (
                          <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        )}
                        {job.status}
                      </Badge>
                      {(job.status === "processing" || job.status === "pending" || job.status === "in_progress") && (
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getElapsedTime(job.created_at)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {job.results.length > 0 ? (
                        <span className="text-sm">{job.results.length} rows</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">No data</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(job.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/results/${job.id}`);
                          }}
                          disabled={job.results.length === 0 && job.status !== "failed"}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportCSV([job.id]);
                          }}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                        {job.status === "failed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetryJob(job.id);
                            }}
                            className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry
                          </Button>
                        )}
                        {(job.status === "processing" || job.status === "pending" || job.status === "in_progress") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelJob(job.id);
                            }}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <StopCircle className="mr-2 h-4 w-4" />
                            Cancel
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteDialog(job.id);
                          }}
                          className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
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
}
