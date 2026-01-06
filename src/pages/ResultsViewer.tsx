import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Download, Copy, ArrowLeft, FileSpreadsheet, ExternalLink, Mail, Phone, MapPin, Globe, Building2, ChevronLeft, ChevronRight, Search, X, Plus, Clipboard, FileText, Trash2, Pencil, CopyPlus, Columns3, Eye, EyeOff, TrendingDown, Loader2, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import ManualDataEntryModal from "@/components/ManualDataEntryModal";
import ClipboardImportModal from "@/components/ClipboardImportModal";
import GoogleSheetsExportModal from "@/components/GoogleSheetsExportModal";
import LeadAuditPanel from "@/components/LeadAuditPanel";
import * as XLSX from "xlsx";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [clipboardImportOpen, setClipboardImportOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; column: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [googleSheetsModalOpen, setGoogleSheetsModalOpen] = useState(false);
  const [auditingRows, setAuditingRows] = useState<Set<number>>(new Set());
  const [auditResults, setAuditResults] = useState<Map<number, {
    painScore: number;
    evidence: string[];
    calculatedLeak: number;
    calculatedLeakExplanation: string;
  }>>(new Map());
  const [auditPanelOpen, setAuditPanelOpen] = useState(false);
  const [selectedLeadForAudit, setSelectedLeadForAudit] = useState<{
    rowIndex: number;
    row: Record<string, string>;
    businessName: string;
    niche: string;
  } | null>(null);

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
    setGoogleSheetsModalOpen(true);
  };

  const getFlattenedResults = () => {
    if (!job?.results) return [];
    return job.results.map(row => flattenObject(row));
  };

  const handleDownloadExcel = () => {
    if (!job?.results || job.results.length === 0) return;

    const flattenedResults = job.results.map(row => flattenObject(row));
    const worksheet = XLSX.utils.json_to_sheet(flattenedResults);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
    XLSX.writeFile(workbook, `scrape-results-${job.id}.xlsx`);

    toast({
      title: "Downloaded!",
      description: "Excel file has been downloaded",
    });
  };

  const handleAddManualData = async (newData: Record<string, string>[]) => {
    if (!job) return;

    const updatedResults = [...(job.results || []), ...newData];
    
    const { error } = await supabase
      .from("scraping_jobs")
      .update({ results: updatedResults })
      .eq("id", job.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add data",
        variant: "destructive",
      });
      return;
    }

    setJob({ ...job, results: updatedResults });
    toast({
      title: "Data added!",
      description: `${newData.length} row(s) added successfully`,
    });
  };

  const handleImportClipboard = async (importedData: Record<string, string>[]) => {
    if (!job) return;

    const updatedResults = [...(job.results || []), ...importedData];
    
    const { error } = await supabase
      .from("scraping_jobs")
      .update({ results: updatedResults })
      .eq("id", job.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to import data",
        variant: "destructive",
      });
      return;
    }

    setJob({ ...job, results: updatedResults });
    toast({
      title: "Data imported!",
      description: `${importedData.length} row(s) imported successfully`,
    });
  };

  const handleBulkDelete = async () => {
    if (!job || selectedRows.size === 0) return;

    const indicesToDelete = Array.from(selectedRows).sort((a, b) => b - a);
    const updatedResults = job.results.filter((_, index) => !selectedRows.has(index));
    
    const { error } = await supabase
      .from("scraping_jobs")
      .update({ results: updatedResults })
      .eq("id", job.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete rows",
        variant: "destructive",
      });
      return;
    }

    setJob({ ...job, results: updatedResults });
    setSelectedRows(new Set());
    setDeleteDialogOpen(false);
    toast({
      title: "Rows deleted!",
      description: `${indicesToDelete.length} row(s) deleted successfully`,
    });
  };

  const handleDuplicateRows = async () => {
    if (!job || selectedRows.size === 0) return;

    const indicesToDuplicate = Array.from(selectedRows).sort((a, b) => a - b);
    const duplicatedRows = indicesToDuplicate.map(index => ({ ...job.results[index] }));
    const updatedResults = [...job.results, ...duplicatedRows];
    
    const { error } = await supabase
      .from("scraping_jobs")
      .update({ results: updatedResults })
      .eq("id", job.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate rows",
        variant: "destructive",
      });
      return;
    }

    setJob({ ...job, results: updatedResults });
    setSelectedRows(new Set());
    toast({
      title: "Rows duplicated!",
      description: `${duplicatedRows.length} row(s) duplicated and added to the end`,
    });
  };

  const toggleRowSelection = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const toggleSelectAll = (indices: number[]) => {
    const allSelected = indices.every(i => selectedRows.has(i));
    if (allSelected) {
      const newSelected = new Set(selectedRows);
      indices.forEach(i => newSelected.delete(i));
      setSelectedRows(newSelected);
    } else {
      setSelectedRows(new Set([...selectedRows, ...indices]));
    }
  };

  const startEditing = (rowIndex: number, column: string, currentValue: string) => {
    setEditingCell({ rowIndex, column });
    setEditValue(currentValue || "");
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (!editingCell || !job) return;

    const { rowIndex, column } = editingCell;
    const updatedResults = [...job.results];
    
    // Update the nested value based on the flattened column name
    const keys = column.split('_');
    let target = updatedResults[rowIndex];
    
    // For simple (non-nested) columns
    if (keys.length === 1 || !updatedResults[rowIndex][keys[0]]) {
      updatedResults[rowIndex] = { ...updatedResults[rowIndex], [column]: editValue };
    } else {
      // For nested columns, rebuild the path
      updatedResults[rowIndex] = { ...updatedResults[rowIndex], [column]: editValue };
    }

    const { error } = await supabase
      .from("scraping_jobs")
      .update({ results: updatedResults })
      .eq("id", job.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
      return;
    }

    setJob({ ...job, results: updatedResults });
    setEditingCell(null);
    setEditValue("");
    toast({
      title: "Saved!",
      description: "Cell updated successfully",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  const openAuditPanel = (rowIndex: number, row: Record<string, string>) => {
    const businessName = row.business_name || row.name || row.title || row.company || "";
    const niche = row.niche || row.category || row.industry || row.type || "";

    if (!businessName) {
      toast({
        title: "Missing business name",
        description: "This row doesn't have a business name to audit",
        variant: "destructive",
      });
      return;
    }

    setSelectedLeadForAudit({ rowIndex, row, businessName, niche });
    setAuditPanelOpen(true);
  };

  const handleAuditRevenue = async () => {
    if (!selectedLeadForAudit) return;
    
    const { rowIndex, businessName, niche } = selectedLeadForAudit;

    setAuditingRows(prev => new Set(prev).add(rowIndex));

    try {
      const { data, error } = await supabase.functions.invoke("audit-revenue", {
        body: { businessName, niche }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setAuditResults(prev => new Map(prev).set(rowIndex, data));

      // Update the job results with audit data
      if (job) {
        const updatedResults = [...job.results];
        updatedResults[rowIndex] = {
          ...updatedResults[rowIndex],
          audit_pain_score: data.painScore,
          audit_evidence_1: data.evidence[0] || "",
          audit_evidence_2: data.evidence[1] || "",
          audit_calculated_leak: `$${data.calculatedLeak.toLocaleString()}/month`,
        };

        const { error: updateError } = await supabase
          .from("scraping_jobs")
          .update({ results: updatedResults })
          .eq("id", job.id);

        if (updateError) throw updateError;

        setJob({ ...job, results: updatedResults });
      }

      toast({
        title: "Audit complete",
        description: `Pain Score: ${data.painScore}/10 | Est. Leak: $${data.calculatedLeak.toLocaleString()}/month`,
      });

    } catch (error) {
      console.error("Error auditing revenue:", error);
      toast({
        title: "Audit failed",
        description: error instanceof Error ? error.message : "Could not complete revenue audit",
        variant: "destructive",
      });
    } finally {
      setAuditingRows(prev => {
        const next = new Set(prev);
        next.delete(rowIndex);
        return next;
      });
    }
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

  const toggleColumnVisibility = (column: string) => {
    const newHidden = new Set(hiddenColumns);
    if (newHidden.has(column)) {
      newHidden.delete(column);
    } else {
      newHidden.add(column);
    }
    setHiddenColumns(newHidden);
  };

  const showAllColumns = (headers: string[]) => {
    setHiddenColumns(new Set());
  };

  const hideAllColumns = (headers: string[]) => {
    setHiddenColumns(new Set(headers));
  };

  // Standard table view for other scrape types with pagination and search
  const renderStandardResults = () => {
    const flattenedResults = job.results.map(row => flattenObject(row));
    const allHeaders = flattenedResults.length > 0 ? Object.keys(flattenedResults[0]) : [];
    const headers = allHeaders.filter(h => !hiddenColumns.has(h));
    
    // Filter results based on search query
    const query = searchQuery.toLowerCase().trim();
    const filteredResults = query
      ? flattenedResults.filter(row => 
          Object.values(row).some(value => 
            String(value).toLowerCase().includes(query)
          )
        )
      : flattenedResults;
    
    // Get original indices for selection tracking (before filtering)
    const originalIndices = query
      ? job.results
          .map((_, i) => i)
          .filter((i) => {
            const row = flattenObject(job.results[i]);
            return Object.values(row).some(value => 
              String(value).toLowerCase().includes(query)
            );
          })
      : job.results.map((_, i) => i);
    
    // Pagination calculations
    const totalItems = filteredResults.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedResults = filteredResults.slice(startIndex, endIndex);
    const paginatedIndices = originalIndices.slice(startIndex, endIndex);

    // Check if all visible rows are selected
    const allVisibleSelected = paginatedIndices.length > 0 && paginatedIndices.every(i => selectedRows.has(i));

    // Reset to page 1 when search changes
    const handleSearchChange = (value: string) => {
      setSearchQuery(value);
      setCurrentPage(1);
    };

    return (
      <div className="space-y-4">
        {/* Search Bar, Column Visibility, and Bulk Actions */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search results..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => handleSearchChange("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Column Visibility Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 className="mr-2 h-4 w-4" />
                Columns
                {hiddenColumns.size > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {allHeaders.length - hiddenColumns.size}/{allHeaders.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto">
              <div className="flex gap-1 p-2 border-b">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => showAllColumns(allHeaders)}
                >
                  <Eye className="mr-1 h-3 w-3" />
                  Show All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => hideAllColumns(allHeaders)}
                >
                  <EyeOff className="mr-1 h-3 w-3" />
                  Hide All
                </Button>
              </div>
              {allHeaders.map((header) => (
                <DropdownMenuItem
                  key={header}
                  onClick={(e) => {
                    e.preventDefault();
                    toggleColumnVisibility(header);
                  }}
                  className="flex items-center gap-2"
                >
                  <Checkbox
                    checked={!hiddenColumns.has(header)}
                    onCheckedChange={() => toggleColumnVisibility(header)}
                  />
                  <span className="truncate">{header.replace(/_/g, ' ')}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {selectedRows.size > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDuplicateRows}
              >
                <CopyPlus className="mr-2 h-4 w-4" />
                Duplicate {selectedRows.size}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {selectedRows.size}
              </Button>
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedRows.size} row{selectedRows.size !== 1 ? 's' : ''}?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The selected data will be permanently removed from this job's results.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {filteredResults.length === 0 ? (
          <div className="text-center py-12 border border-border rounded-lg">
            <p className="text-muted-foreground">No results match your search "{searchQuery}"</p>
            <Button variant="ghost" size="sm" onClick={() => handleSearchChange("")} className="mt-2">
              Clear search
            </Button>
          </div>
        ) : (
          <>
            <div className="border border-border rounded-lg overflow-hidden">
              <ScrollArea className="w-full">
                <div className="min-w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={allVisibleSelected}
                            onCheckedChange={() => toggleSelectAll(paginatedIndices)}
                          />
                        </TableHead>
                        {headers.map((header) => (
                          <TableHead key={header} className="font-semibold whitespace-nowrap">
                            {header.replace(/_/g, ' ')}
                          </TableHead>
                        ))}
                        <TableHead className="font-semibold whitespace-nowrap text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedResults.map((row, index) => {
                        const originalIndex = paginatedIndices[index];
                        return (
                          <TableRow 
                            key={originalIndex}
                            className={selectedRows.has(originalIndex) ? "bg-muted/50" : ""}
                          >
                            <TableCell className="w-12">
                              <Checkbox
                                checked={selectedRows.has(originalIndex)}
                                onCheckedChange={() => toggleRowSelection(originalIndex)}
                              />
                            </TableCell>
                            {headers.map((header) => {
                              const isEditing = editingCell?.rowIndex === originalIndex && editingCell?.column === header;
                              const cellValue = row[header] || "";
                              
                              return (
                                <TableCell 
                                  key={header} 
                                  className="max-w-xs group/cell"
                                  onDoubleClick={() => !isEditing && startEditing(originalIndex, header, cellValue)}
                                >
                                  {isEditing ? (
                                    <Input
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={handleKeyDown}
                                      className="h-7 text-sm"
                                      autoFocus
                                    />
                                  ) : (
                                    <div className="flex items-center gap-1 group-hover/cell:bg-muted/50 px-1 py-0.5 rounded -mx-1 cursor-pointer">
                                      <span className="flex-1 truncate">
                                        {cellValue || "-"}
                                      </span>
                                      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/cell:opacity-100 transition-opacity flex-shrink-0" />
                                    </div>
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openAuditPanel(originalIndex, row)}
                                className="gap-1.5"
                              >
                                {row.audit_pain_score ? (
                                  <>
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                    View Audit
                                  </>
                                ) : (
                                  <>
                                    <TrendingDown className="h-3.5 w-3.5" />
                                    Audit Revenue
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
                  {searchQuery && ` (filtered from ${flattenedResults.length})`}
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
          </>
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
          <div className="flex flex-wrap gap-2">
            {/* Import Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Data
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setManualEntryOpen(true)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Manual Entry
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setClipboardImportOpen(true)}>
                  <Clipboard className="mr-2 h-4 w-4" />
                  Import from Clipboard
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export Options */}
            {hasResults && (
              <>
                <Button variant="outline" size="sm" onClick={handleCopyData}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy JSON
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDownloadCSV}>
                      <FileText className="mr-2 h-4 w-4" />
                      CSV (.csv)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadExcel}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadJSON}>
                      <FileText className="mr-2 h-4 w-4" />
                      JSON (.json)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" onClick={handleExportToGoogleSheets} className="bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Google Sheets
                </Button>
              </>
            )}
          </div>
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

        {/* Modals */}
        <ManualDataEntryModal
          open={manualEntryOpen}
          onClose={() => setManualEntryOpen(false)}
          onSubmit={handleAddManualData}
          existingHeaders={job.results?.length > 0 ? Object.keys(flattenObject(job.results[0])) : undefined}
        />
        <ClipboardImportModal
          open={clipboardImportOpen}
          onClose={() => setClipboardImportOpen(false)}
          onImport={handleImportClipboard}
        />
        <GoogleSheetsExportModal
          open={googleSheetsModalOpen}
          onOpenChange={setGoogleSheetsModalOpen}
          data={getFlattenedResults()}
          jobId={job.id}
        />
        <LeadAuditPanel
          open={auditPanelOpen}
          onOpenChange={(open) => {
            setAuditPanelOpen(open);
            if (!open) setSelectedLeadForAudit(null);
          }}
          businessName={selectedLeadForAudit?.businessName || ""}
          niche={selectedLeadForAudit?.niche || ""}
          auditData={selectedLeadForAudit ? auditResults.get(selectedLeadForAudit.rowIndex) || null : null}
          isLoading={selectedLeadForAudit ? auditingRows.has(selectedLeadForAudit.rowIndex) : false}
          onStartAudit={handleAuditRevenue}
          onStartSalesCall={() => {
            toast({
              title: "Coming soon!",
              description: "AI Sales Call feature is under development",
            });
          }}
        />
      </div>
    </DashboardLayout>
  );
}
