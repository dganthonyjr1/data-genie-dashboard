import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Download, Copy, ArrowLeft, FileSpreadsheet, ExternalLink, Mail, Phone, MapPin, Globe, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    fetchJobResults();

    const channel = supabase
      .channel(`job_${id}_changes`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scraping_jobs',
          filter: `id=eq.${id}`
        },
        (payload) => {
          setJob({
            ...payload.new,
            results: Array.isArray(payload.new.results) ? payload.new.results : []
          } as Job);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  // Flatten nested objects for CSV/Sheets export
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

  const handleDownloadCSV = () => {
    if (!job?.results || job.results.length === 0) return;

    // Flatten all results
    const flattenedResults = job.results.map(row => flattenObject(row));
    
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
    a.download = `scrape-results-${job.id}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Downloaded!",
      description: "CSV file has been downloaded",
    });
  };

  const handleExportToGoogleSheets = () => {
    if (!job?.results || job.results.length === 0) return;

    // Flatten all results for Google Sheets
    const flattenedResults = job.results.map(row => flattenObject(row));
    
    // Get all unique keys
    const allKeys = new Set<string>();
    flattenedResults.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });
    const headers = Array.from(allKeys);

    // Create tab-separated values (TSV) which Google Sheets handles better
    const tsvRows = [
      headers.join("\t"),
      ...flattenedResults.map(row =>
        headers.map(header => {
          const value = row[header] || "";
          // Replace tabs and newlines
          return value.replace(/[\t\n]/g, ' ');
        }).join("\t")
      )
    ];

    const tsvContent = tsvRows.join("\n");
    
    // Copy to clipboard - user can then paste directly into Google Sheets
    navigator.clipboard.writeText(tsvContent);
    
    // Also download as TSV file
    const blob = new Blob([tsvContent], { type: "text/tab-separated-values;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scrape-results-${job.id}.tsv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Ready for Google Sheets!",
      description: "Data copied to clipboard and TSV downloaded. Paste into Google Sheets or import the TSV file.",
    });
    
    // Open Google Sheets in new tab
    window.open('https://sheets.new', '_blank');
  };

  const handleDownloadJSON = () => {
    if (!job?.results || job.results.length === 0) return;

    const jsonContent = JSON.stringify(job.results, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scrape-results-${job.id}.json`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Downloaded!",
      description: "JSON file has been downloaded",
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 p-6">
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
  const isCompleteBusinessData = job.scrape_type === 'complete_business_data' && hasResults;
  const businessData = isCompleteBusinessData ? job.results[0] : null;

  // Render complete business data in a nice card layout
  const renderCompleteBusinessData = () => {
    if (!businessData) return null;

    return (
      <div className="space-y-6">
        {/* Business Identity */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-pink-500" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {businessData.business_name && (
              <div>
                <p className="text-sm text-muted-foreground">Business Name</p>
                <p className="text-lg font-semibold">{businessData.business_name}</p>
              </div>
            )}
            {businessData.about_or_description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-foreground">{businessData.about_or_description}</p>
              </div>
            )}
            {businessData.services_or_products && (
              <div>
                <p className="text-sm text-muted-foreground">Services/Products</p>
                <p className="text-foreground">{businessData.services_or_products}</p>
              </div>
            )}
            {businessData.hours_of_operation && (
              <div>
                <p className="text-sm text-muted-foreground">Hours of Operation</p>
                <p className="text-foreground">{businessData.hours_of_operation}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-cyan-500" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {businessData.emails?.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-4 w-4" /> Emails
                  </p>
                  <div className="space-y-1 mt-1">
                    {businessData.emails.map((email: string, i: number) => (
                      <a key={i} href={`mailto:${email}`} className="block text-primary hover:underline">
                        {email}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {businessData.phone_numbers?.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-4 w-4" /> Phone Numbers
                  </p>
                  <div className="space-y-1 mt-1">
                    {businessData.phone_numbers.map((phone: string, i: number) => (
                      <a key={i} href={`tel:${phone}`} className="block text-primary hover:underline">
                        {phone}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {businessData.addresses?.length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> Addresses
                  </p>
                  <div className="space-y-1 mt-1">
                    {businessData.addresses.map((addr: string, i: number) => (
                      <p key={i} className="text-foreground">{addr}</p>
                    ))}
                  </div>
                </div>
              )}
              {businessData.website_url && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Globe className="h-4 w-4" /> Website
                  </p>
                  <a href={businessData.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    {businessData.website_url} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Social Media Links */}
        {businessData.social_links && Object.values(businessData.social_links).some(v => v) && (
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Social Media</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(businessData.social_links).map(([platform, url]) => {
                  if (!url) return null;
                  return (
                    <a
                      key={platform}
                      href={url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Badge variant="secondary" className="capitalize hover:bg-primary/20 cursor-pointer">
                        {platform} <ExternalLink className="h-3 w-3 ml-1" />
                      </Badge>
                    </a>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Google Maps */}
        {businessData.google_maps && (businessData.google_maps.embed_url || businessData.google_maps.place_id) && (
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-500" />
                Google Maps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {businessData.google_maps.place_id && (
                <div>
                  <p className="text-sm text-muted-foreground">Place ID</p>
                  <p className="font-mono text-sm">{businessData.google_maps.place_id}</p>
                </div>
              )}
              {businessData.google_maps.coordinates?.latitude && (
                <div>
                  <p className="text-sm text-muted-foreground">Coordinates</p>
                  <p className="font-mono text-sm">
                    {businessData.google_maps.coordinates.latitude}, {businessData.google_maps.coordinates.longitude}
                  </p>
                </div>
              )}
              {businessData.google_maps.embed_url && (
                <a
                  href={businessData.google_maps.embed_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 text-sm"
                >
                  View on Google Maps <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Extraction Metadata */}
        {businessData.extraction_sources && (
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-sm">Extraction Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">
                  {businessData.extraction_sources.regex_emails_found} emails (regex)
                </Badge>
                <Badge variant="outline">
                  {businessData.extraction_sources.regex_phones_found} phones (regex)
                </Badge>
                <Badge variant="outline">
                  {businessData.extraction_sources.regex_addresses_found} addresses (regex)
                </Badge>
                <Badge variant="outline">
                  {businessData.extraction_sources.social_links_found} social links
                </Badge>
                <Badge variant={businessData.extraction_sources.ai_extraction_success ? "default" : "secondary"}>
                  AI: {businessData.extraction_sources.ai_extraction_success ? "✓" : "✗"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Standard table view for other scrape types with pagination
  const renderStandardResults = () => {
    const flattenedResults = job.results.map(row => flattenObject(row));
    const headers = flattenedResults.length > 0 ? Object.keys(flattenedResults[0]) : [];
    
    // Pagination calculations
    const totalItems = flattenedResults.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedResults = flattenedResults.slice(startIndex, endIndex);

    return (
      <div className="space-y-4">
        <div className="border border-border rounded-lg overflow-hidden">
          <ScrollArea className="w-full">
            <div className="min-w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHead key={header} className="font-semibold whitespace-nowrap">
                        {header.replace(/_/g, ' ')}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedResults.map((row, index) => (
                    <TableRow key={startIndex + index}>
                      {headers.map((header) => (
                        <TableCell key={header} className="max-w-xs truncate">
                          {row[header] || "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
        
        {/* Pagination Controls */}
        {totalItems > 10 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} - {endIndex} of {totalItems} results
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Per page:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[80px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <Button variant="ghost" onClick={() => navigate("/jobs")} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Jobs
            </Button>
            <h1 className="text-3xl font-bold font-orbitron">Results Viewer</h1>
            <p className="text-muted-foreground mt-2 truncate max-w-xl">{job.url}</p>
            <Badge variant="outline" className="mt-2 capitalize">
              {job.scrape_type.replace(/_/g, ' ')}
            </Badge>
          </div>
          {hasResults && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyData}>
                <Copy className="mr-2 h-4 w-4" />
                Copy JSON
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadJSON}>
                <Download className="mr-2 h-4 w-4" />
                JSON
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button size="sm" onClick={handleExportToGoogleSheets} className="bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Google Sheets
              </Button>
            </div>
          )}
        </div>

        {!hasResults ? (
          <div className="text-center py-12 border border-border rounded-lg">
            <p className="text-muted-foreground">No results available for this job yet.</p>
          </div>
        ) : isCompleteBusinessData ? (
          renderCompleteBusinessData()
        ) : (
          renderStandardResults()
        )}

        {hasResults && (
          <div className="text-sm text-muted-foreground">
            {isCompleteBusinessData ? (
              `Extracted at ${new Date(businessData?.extracted_at).toLocaleString()}`
            ) : (
              `Showing ${job.results.length} row${job.results.length !== 1 ? "s" : ""}`
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
