import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ExternalLink, FileSpreadsheet, Info, Save, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SCRIPT_URL_STORAGE_KEY = "scrapex_google_script_url";

interface GoogleSheetsExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: Record<string, string>[];
  jobId: string;
}

export default function GoogleSheetsExportModal({
  open,
  onOpenChange,
  data,
  jobId,
}: GoogleSheetsExportModalProps) {
  const [scriptUrl, setScriptUrl] = useState("");
  const [sheetName, setSheetName] = useState("ScrapeX Results");
  const [exporting, setExporting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [hasSavedUrl, setHasSavedUrl] = useState(false);

  // Load saved script URL on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem(SCRIPT_URL_STORAGE_KEY);
    if (savedUrl) {
      setScriptUrl(savedUrl);
      setHasSavedUrl(true);
      setShowInstructions(false);
    }
  }, []);

  const handleSaveUrl = () => {
    if (scriptUrl.trim() && scriptUrl.includes("script.google.com")) {
      localStorage.setItem(SCRIPT_URL_STORAGE_KEY, scriptUrl.trim());
      setHasSavedUrl(true);
      toast({
        title: "URL saved",
        description: "Your script URL has been saved for future exports",
      });
    }
  };

  const handleClearUrl = () => {
    localStorage.removeItem(SCRIPT_URL_STORAGE_KEY);
    setScriptUrl("");
    setHasSavedUrl(false);
    toast({
      title: "URL cleared",
      description: "Saved script URL has been removed",
    });
  };

  const handleExport = async () => {
    if (!scriptUrl.trim()) {
      toast({
        title: "Script URL required",
        description: "Please enter your Google Apps Script web app URL",
        variant: "destructive",
      });
      return;
    }

    if (!scriptUrl.includes("script.google.com")) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid Google Apps Script web app URL",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);

    try {
      const { data: responseData, error } = await supabase.functions.invoke("export-to-google-sheets", {
        body: {
          scriptUrl: scriptUrl.trim(),
          sheetName: sheetName.trim() || "ScrapeX Results",
          data,
          jobId,
        },
      });

      if (error) throw error;

      if (responseData?.success) {
        toast({
          title: "Export successful!",
          description: responseData.message || "Data exported to Google Sheets",
        });
        onOpenChange(false);
        
        if (responseData.spreadsheetUrl) {
          window.open(responseData.spreadsheetUrl, "_blank");
        }
      } else {
        throw new Error(responseData?.error || "Export failed");
      }
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: error.message || "Failed to export to Google Sheets",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const appsScriptCode = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheetName = data.sheetName || "Sheet1";
    var rows = data.data;
    
    if (!rows || rows.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "No data provided"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    } else {
      sheet.clear();
    }
    
    // Get headers from first row
    var headers = Object.keys(rows[0]);
    sheet.appendRow(headers);
    
    // Add data rows
    rows.forEach(function(row) {
      var values = headers.map(function(h) { return row[h] || ""; });
      sheet.appendRow(values);
    });
    
    // Format header row
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#f3f4f6");
    
    // Auto-resize columns
    for (var i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Data imported successfully",
      spreadsheetUrl: ss.getUrl(),
      rowsImported: rows.length
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-500" />
            Export to Google Sheets
          </DialogTitle>
          <DialogDescription>
            Export your scraping results directly to a Google Sheet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {showInstructions && (
            <Alert className="bg-muted/50">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <div className="space-y-3">
                  <p className="font-medium">One-time setup (takes ~2 minutes):</p>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>
                      <a 
                        href="https://sheets.new" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Create a new Google Sheet <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>Go to <strong>Extensions → Apps Script</strong></li>
                    <li>Delete any existing code and paste the script below</li>
                    <li>Click <strong>Deploy → New deployment</strong></li>
                    <li>Select <strong>"Web app"</strong>, set access to <strong>"Anyone"</strong></li>
                    <li>Click <strong>Deploy</strong> and copy the Web app URL</li>
                  </ol>
                  
                  <details className="mt-3">
                    <summary className="cursor-pointer text-primary hover:underline text-sm font-medium">
                      Show Apps Script code to copy
                    </summary>
                    <div className="mt-2 relative">
                      <pre className="bg-background rounded-md p-3 text-xs overflow-x-auto border border-border max-h-48">
                        {appsScriptCode}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          navigator.clipboard.writeText(appsScriptCode);
                          toast({
                            title: "Copied!",
                            description: "Script code copied to clipboard",
                          });
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </details>
                  
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-xs"
                    onClick={() => setShowInstructions(false)}
                  >
                    Hide instructions
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {!showInstructions && (
            <Button 
              variant="link" 
              className="p-0 h-auto text-sm"
              onClick={() => setShowInstructions(true)}
            >
              Show setup instructions
            </Button>
          )}

          <div className="space-y-2">
            <Label htmlFor="scriptUrl">Google Apps Script Web App URL</Label>
            <div className="flex gap-2">
              <Input
                id="scriptUrl"
                placeholder="https://script.google.com/macros/s/..."
                value={scriptUrl}
                onChange={(e) => setScriptUrl(e.target.value)}
                className="flex-1"
              />
              {scriptUrl.trim() && scriptUrl.includes("script.google.com") && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleSaveUrl}
                  title="Save URL for future exports"
                >
                  <Save className="h-4 w-4" />
                </Button>
              )}
              {hasSavedUrl && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleClearUrl}
                  title="Clear saved URL"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {hasSavedUrl && (
              <p className="text-xs text-green-500">
                ✓ Using saved script URL
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sheetName">Sheet Name</Label>
            <Input
              id="sheetName"
              placeholder="ScrapeX Results"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A new sheet with this name will be created (or replaced if it exists)
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            <strong>{data.length}</strong> rows will be exported
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting || !scriptUrl.trim()}>
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export to Sheets
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
