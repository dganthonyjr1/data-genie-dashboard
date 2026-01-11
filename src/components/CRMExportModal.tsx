import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Building2, CheckCircle, Send, Loader2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Lead {
  name?: string;
  business_name?: string;
  phone?: string;
  phone_number?: string;
  email?: string;
  address?: string;
  website?: string;
  category?: string;
  niche?: string;
  rating?: number;
  reviews?: number;
  revenue?: number;
  pain_score?: number;
  [key: string]: any;
}

interface LeadSyncResult {
  name: string;
  status: 'success' | 'failed';
  error?: string;
  attempts: number;
}

interface SyncResponse {
  message: string;
  success: number;
  failed: number;
  results: LeadSyncResult[];
}

interface CRMExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: Lead[];
}

type CRMType = "ghl" | "hubspot" | "salesforce" | "pipedrive" | "zoho";

const CRM_CONFIGS: Record<CRMType, {
  name: string;
  description: string;
  headers: string[];
  isDirect?: boolean;
  mapLead: (lead: Lead) => string[];
}> = {
  ghl: {
    name: "GoHighLevel",
    description: "Sync directly to GHL contacts",
    isDirect: true,
    headers: ["Name", "Phone", "Email", "Address", "Website", "Category", "Rating", "Revenue"],
    mapLead: (lead) => [
      lead.name || lead.business_name || "",
      lead.phone || lead.phone_number || "",
      lead.email || "",
      lead.address || "",
      lead.website || "",
      lead.category || lead.niche || "",
      lead.rating?.toString() || "",
      lead.revenue?.toString() || ""
    ]
  },
  hubspot: {
    name: "HubSpot",
    description: "Export CSV for HubSpot import",
    headers: ["Company Name", "Phone Number", "Email", "Website", "Address", "Industry", "Annual Revenue", "Lead Score", "Description"],
    mapLead: (lead) => [
      lead.name || lead.business_name || "",
      lead.phone || lead.phone_number || "",
      lead.email || "",
      lead.website || "",
      lead.address || "",
      lead.category || lead.niche || "",
      lead.revenue?.toString() || "",
      lead.pain_score?.toString() || "",
      `Rating: ${lead.rating || "N/A"} | Reviews: ${lead.reviews || "N/A"}`
    ]
  },
  salesforce: {
    name: "Salesforce",
    description: "Export CSV for Salesforce import",
    headers: ["Company", "Phone", "Email", "Website", "Street", "Industry", "AnnualRevenue", "Rating", "Description"],
    mapLead: (lead) => [
      lead.name || lead.business_name || "",
      lead.phone || lead.phone_number || "",
      lead.email || "",
      lead.website || "",
      lead.address || "",
      lead.category || lead.niche || "",
      lead.revenue?.toString() || "",
      lead.rating ? (lead.rating >= 4.5 ? "Hot" : lead.rating >= 4 ? "Warm" : "Cold") : "",
      `Pain Score: ${lead.pain_score || "N/A"} | Reviews: ${lead.reviews || "N/A"}`
    ]
  },
  pipedrive: {
    name: "Pipedrive",
    description: "Export CSV for Pipedrive import",
    headers: ["Name", "Phone", "Email", "Address", "Category", "Custom: Website", "Custom: Revenue", "Custom: Rating", "Custom: Reviews"],
    mapLead: (lead) => [
      lead.name || lead.business_name || "",
      lead.phone || lead.phone_number || "",
      lead.email || "",
      lead.address || "",
      lead.category || lead.niche || "",
      lead.website || "",
      lead.revenue?.toString() || "",
      lead.rating?.toString() || "",
      lead.reviews?.toString() || ""
    ]
  },
  zoho: {
    name: "Zoho CRM",
    description: "Export CSV for Zoho import",
    headers: ["Company", "Phone", "Email", "Website", "Street", "Industry", "Annual Revenue", "Lead Score", "Description"],
    mapLead: (lead) => [
      lead.name || lead.business_name || "",
      lead.phone || lead.phone_number || "",
      lead.email || "",
      lead.website || "",
      lead.address || "",
      lead.category || lead.niche || "",
      lead.revenue?.toString() || "",
      lead.pain_score?.toString() || "",
      `Rating: ${lead.rating || "N/A"} | Reviews: ${lead.reviews || "N/A"}`
    ]
  }
};

export function CRMExportModal({ open, onOpenChange, leads }: CRMExportModalProps) {
  const [selectedCRM, setSelectedCRM] = useState<CRMType>("ghl");
  const [isExporting, setIsExporting] = useState(false);
  const [syncResults, setSyncResults] = useState<LeadSyncResult[] | null>(null);

  const escapeCSVField = (field: string): string => {
    if (!field) return "";
    if (field.includes(",") || field.includes("\n") || field.includes('"')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  const handleGHLSync = async () => {
    setIsExporting(true);
    setSyncResults(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Please log in to sync leads");
        return;
      }

      const { data, error } = await supabase.functions.invoke<SyncResponse>('sync-to-ghl', {
        body: { leads }
      });

      if (error) {
        console.error('GHL sync error:', error);
        toast.error("Failed to sync to GoHighLevel", {
          description: error.message
        });
        return;
      }

      if (data?.results) {
        setSyncResults(data.results);
      }

      if (data?.failed === 0) {
        toast.success(data.message, {
          description: "All leads synced successfully"
        });
      } else if (data?.success === 0) {
        toast.error("Sync failed", {
          description: `All ${data.failed} leads failed to sync`
        });
      } else {
        toast.warning(data?.message || "Partial sync", {
          description: `${data?.failed} leads failed to sync`
        });
      }
      
    } catch (error) {
      console.error('GHL sync error:', error);
      toast.error("Failed to sync to GoHighLevel");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCSVExport = () => {
    if (leads.length === 0) {
      toast.error("No leads to export");
      return;
    }

    setIsExporting(true);
    
    try {
      const config = CRM_CONFIGS[selectedCRM];
      
      const headerRow = config.headers.map(escapeCSVField).join(",");
      const dataRows = leads.map(lead => 
        config.mapLead(lead).map(escapeCSVField).join(",")
      );
      
      const csvContent = [headerRow, ...dataRows].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `leads_${config.name.toLowerCase()}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${leads.length} leads for ${config.name}`, {
        description: "Ready to import into your CRM"
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export leads");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = () => {
    const config = CRM_CONFIGS[selectedCRM];
    if (config.isDirect) {
      handleGHLSync();
    } else {
      handleCSVExport();
    }
  };

  const handleRetryFailed = async () => {
    if (!syncResults) return;
    
    const failedLeadNames = syncResults
      .filter(r => r.status === 'failed')
      .map(r => r.name);
    
    const failedLeads = leads.filter(lead => 
      failedLeadNames.includes(lead.name || lead.business_name || '')
    );
    
    if (failedLeads.length === 0) return;
    
    setIsExporting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Please log in to sync leads");
        return;
      }

      const { data, error } = await supabase.functions.invoke<SyncResponse>('sync-to-ghl', {
        body: { leads: failedLeads }
      });

      if (error) {
        toast.error("Retry failed", { description: error.message });
        return;
      }

      if (data?.results) {
        // Merge retry results with previous results
        const updatedResults = syncResults.map(result => {
          const retryResult = data.results.find(r => r.name === result.name);
          return retryResult || result;
        });
        setSyncResults(updatedResults);
      }

      toast.success(`Retried ${failedLeads.length} leads`, {
        description: `${data?.success || 0} succeeded, ${data?.failed || 0} failed`
      });
      
    } catch (error) {
      console.error('Retry error:', error);
      toast.error("Retry failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    setSyncResults(null);
    onOpenChange(false);
  };

  const config = CRM_CONFIGS[selectedCRM];
  const failedResults = syncResults?.filter(r => r.status === 'failed') || [];
  const successResults = syncResults?.filter(r => r.status === 'success') || [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Send to CRM
          </DialogTitle>
          <DialogDescription>
            {syncResults 
              ? `Sync complete: ${successResults.length} succeeded, ${failedResults.length} failed`
              : config.isDirect 
                ? `Sync ${leads.length} leads directly to GoHighLevel`
                : `Export ${leads.length} leads as a CSV formatted for your CRM`
            }
          </DialogDescription>
        </DialogHeader>

        {syncResults ? (
          <div className="space-y-4 py-4">
            {/* Success summary */}
            {successResults.length > 0 && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                  <CheckCircle className="h-4 w-4" />
                  {successResults.length} leads synced successfully
                </div>
              </div>
            )}

            {/* Failed leads with details */}
            {failedResults.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                  <XCircle className="h-4 w-4" />
                  {failedResults.length} leads failed
                </div>
                <ScrollArea className="h-[200px] border rounded-lg">
                  <div className="p-2 space-y-2">
                    {failedResults.map((result, index) => (
                      <div 
                        key={index} 
                        className="bg-destructive/5 border border-destructive/20 rounded-md p-2"
                      >
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{result.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Failed after {result.attempts} attempt{result.attempts > 1 ? 's' : ''}
                            </div>
                            {result.error && (
                              <div className="text-xs text-destructive mt-1 break-words">
                                {result.error}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Label className="text-sm font-medium">Select your CRM</Label>
            <RadioGroup
              value={selectedCRM}
              onValueChange={(value) => setSelectedCRM(value as CRMType)}
              className="grid grid-cols-2 gap-3"
            >
              {(Object.entries(CRM_CONFIGS) as [CRMType, typeof CRM_CONFIGS[CRMType]][]).map(([key, crmConfig]) => (
                <Label
                  key={key}
                  htmlFor={key}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                    selectedCRM === key ? "border-primary bg-primary/5" : "border-border"
                  } ${crmConfig.isDirect ? "col-span-2 bg-gradient-to-r from-primary/5 to-transparent" : ""}`}
                >
                  <RadioGroupItem value={key} id={key} />
                  <div className="flex-1">
                    <div className="font-medium text-sm flex items-center gap-2">
                      {crmConfig.name}
                      {crmConfig.isDirect && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Direct Sync
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{crmConfig.description}</div>
                  </div>
                </Label>
              ))}
            </RadioGroup>

            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Fields included:
              </div>
              <div className="text-xs text-muted-foreground flex flex-wrap gap-1">
                {config.headers.map((header, i) => (
                  <span key={i} className="bg-background px-2 py-0.5 rounded">
                    {header}
                  </span>
                ))}
              </div>
            </div>

            {!config.isDirect && (
              <div className="text-xs text-muted-foreground">
                <strong>How to import:</strong> Go to your {config.name} → Import → Upload CSV file
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            {syncResults ? "Close" : "Cancel"}
          </Button>
          
          {syncResults ? (
            failedResults.length > 0 && (
              <Button onClick={handleRetryFailed} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Retry Failed ({failedResults.length})
              </Button>
            )
          ) : (
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : config.isDirect ? (
                <Send className="h-4 w-4 mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isExporting 
                ? (config.isDirect ? "Syncing..." : "Exporting...") 
                : (config.isDirect ? `Sync to ${config.name}` : `Export for ${config.name}`)
              }
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
