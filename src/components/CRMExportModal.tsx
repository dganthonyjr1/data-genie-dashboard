import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Download, Building2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

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

interface CRMExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: Lead[];
}

type CRMType = "hubspot" | "salesforce" | "pipedrive" | "zoho";

const CRM_CONFIGS: Record<CRMType, {
  name: string;
  description: string;
  headers: string[];
  mapLead: (lead: Lead) => string[];
}> = {
  hubspot: {
    name: "HubSpot",
    description: "Import to HubSpot CRM Contacts or Companies",
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
    description: "Import to Salesforce Leads or Accounts",
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
    description: "Import to Pipedrive Organizations",
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
    description: "Import to Zoho CRM Leads",
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
  const [selectedCRM, setSelectedCRM] = useState<CRMType>("hubspot");
  const [isExporting, setIsExporting] = useState(false);

  const escapeCSVField = (field: string): string => {
    if (!field) return "";
    // Escape quotes and wrap in quotes if contains comma, newline, or quote
    if (field.includes(",") || field.includes("\n") || field.includes('"')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  const handleExport = () => {
    if (leads.length === 0) {
      toast.error("No leads to export");
      return;
    }

    setIsExporting(true);
    
    try {
      const config = CRM_CONFIGS[selectedCRM];
      
      // Build CSV content
      const headerRow = config.headers.map(escapeCSVField).join(",");
      const dataRows = leads.map(lead => 
        config.mapLead(lead).map(escapeCSVField).join(",")
      );
      
      const csvContent = [headerRow, ...dataRows].join("\n");
      
      // Create and download file
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Send to CRM
          </DialogTitle>
          <DialogDescription>
            Export {leads.length} leads as a CSV formatted for your CRM
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Label className="text-sm font-medium">Select your CRM</Label>
          <RadioGroup
            value={selectedCRM}
            onValueChange={(value) => setSelectedCRM(value as CRMType)}
            className="grid grid-cols-2 gap-3"
          >
            {(Object.entries(CRM_CONFIGS) as [CRMType, typeof CRM_CONFIGS[CRMType]][]).map(([key, config]) => (
              <Label
                key={key}
                htmlFor={key}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                  selectedCRM === key ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <RadioGroupItem value={key} id={key} />
                <div>
                  <div className="font-medium text-sm">{config.name}</div>
                  <div className="text-xs text-muted-foreground">{config.description.split(" ").slice(2).join(" ")}</div>
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
              {CRM_CONFIGS[selectedCRM].headers.map((header, i) => (
                <span key={i} className="bg-background px-2 py-0.5 rounded">
                  {header}
                </span>
              ))}
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            <strong>How to import:</strong> Go to your {CRM_CONFIGS[selectedCRM].name} → Import → Upload CSV file
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exporting..." : `Export for ${CRM_CONFIGS[selectedCRM].name}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
