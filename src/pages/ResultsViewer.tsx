import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Download, Copy, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Job {
  id: string;
  url: string;
  scrape_type: string;
  results: any[];
}

export default function ResultsViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobResults();
  }, [id]);

  const fetchJobResults = async () => {
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
        .select("id, url, scrape_type, results")
        .eq("id", id)
        .single();

      if (error) {
        toast({
          title: "Error loading results",
          description: error.message,
          variant: "destructive",
        });
        navigate("/jobs");
        return;
      }

      setJob({
        ...data,
        results: Array.isArray(data.results) ? data.results : []
      });
    } catch (error) {
      console.error("Error fetching job results:", error);
      toast({
        title: "Error",
        description: "Failed to load job results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyData = () => {
    if (!job?.results || job.results.length === 0) return;

    const jsonString = JSON.stringify(job.results, null, 2);
    navigator.clipboard.writeText(jsonString);
    toast({
      title: "Copied!",
      description: "Data copied to clipboard",
    });
  };

  const handleDownloadCSV = () => {
    if (!job?.results || job.results.length === 0) return;

    // Get all unique keys from all objects
    const allKeys = new Set<string>();
    job.results.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });
    const headers = Array.from(allKeys);

    // Create CSV content
    const csvRows = [
      headers.join(","),
      ...job.results.map(row =>
        headers.map(header => {
          const value = row[header];
          const stringValue = value === null || value === undefined ? "" : String(value);
          // Escape quotes and wrap in quotes if contains comma or quote
          if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(",")
      )
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scrape-results-${job.id}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Downloaded!",
      description: "CSV file has been downloaded",
    });
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

  if (!job) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Job not found</h2>
          <Button onClick={() => navigate("/jobs")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const hasResults = job.results && job.results.length > 0;
  const headers = hasResults ? Object.keys(job.results[0]) : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => navigate("/jobs")} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Jobs
            </Button>
            <h1 className="text-3xl font-bold">Results Viewer</h1>
            <p className="text-muted-foreground mt-2">{job.url}</p>
          </div>
          {hasResults && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopyData}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Data
              </Button>
              <Button onClick={handleDownloadCSV}>
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </div>
          )}
        </div>

        {!hasResults ? (
          <div className="text-center py-12 border border-border rounded-lg">
            <p className="text-muted-foreground">No results available for this job yet.</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHead key={header} className="font-semibold">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {job.results.map((row, index) => (
                    <TableRow key={index}>
                      {headers.map((header) => (
                        <TableCell key={header}>
                          {row[header] !== null && row[header] !== undefined
                            ? String(row[header])
                            : "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {hasResults && (
          <div className="text-sm text-muted-foreground">
            Showing {job.results.length} row{job.results.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
