import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clipboard, FileSpreadsheet } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ClipboardImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: Record<string, string>[]) => void;
}

export default function ClipboardImportModal({ open, onClose, onImport }: ClipboardImportModalProps) {
  const [rawData, setRawData] = useState("");
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  const parseData = (text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      setParsedData([]);
      setHeaders([]);
      return;
    }

    // Detect delimiter (tab for spreadsheet copy, comma for CSV)
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';
    
    const headerRow = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
    setHeaders(headerRow);

    const rows = lines.slice(1).map(line => {
      const values = line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
      const row: Record<string, string> = {};
      headerRow.forEach((header, i) => {
        row[header] = values[i] || "";
      });
      return row;
    }).filter(row => Object.values(row).some(v => v !== ""));

    setParsedData(rows);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRawData(text);
      parseData(text);
      toast({
        title: "Clipboard data loaded",
        description: "Review the preview below and click Import to add the data.",
      });
    } catch (error) {
      toast({
        title: "Clipboard access denied",
        description: "Please paste data manually into the text area.",
        variant: "destructive",
      });
    }
  };

  const handleTextChange = (text: string) => {
    setRawData(text);
    parseData(text);
  };

  const handleImport = () => {
    if (parsedData.length > 0) {
      onImport(parsedData);
      handleClose();
    }
  };

  const handleClose = () => {
    setRawData("");
    setParsedData([]);
    setHeaders([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-orbitron flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import from Clipboard
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">
              Paste data from Excel, Google Sheets, or CSV (first row should be headers)
            </Label>
            <div className="flex gap-2 mb-2">
              <Button variant="outline" onClick={handlePaste} className="flex-shrink-0">
                <Clipboard className="h-4 w-4 mr-2" />
                Paste from Clipboard
              </Button>
            </div>
            <Textarea
              value={rawData}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Paste spreadsheet data here...&#10;&#10;Example:&#10;Name&#9;Email&#9;Phone&#10;John Doe&#9;john@example.com&#9;555-1234&#10;Jane Smith&#9;jane@example.com&#9;555-5678"
              className="min-h-[120px] font-mono text-sm"
            />
          </div>

          {parsedData.length > 0 && (
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">
                Preview ({parsedData.length} rows detected)
              </Label>
              <div className="border border-border rounded-lg overflow-hidden">
                <ScrollArea className="max-h-[200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map((header) => (
                          <TableHead key={header} className="whitespace-nowrap">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 5).map((row, i) => (
                        <TableRow key={i}>
                          {headers.map((header) => (
                            <TableCell key={header} className="max-w-[150px] truncate">
                              {row[header] || "-"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                {parsedData.length > 5 && (
                  <div className="text-center py-2 text-sm text-muted-foreground border-t border-border">
                    ... and {parsedData.length - 5} more rows
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={parsedData.length === 0}>
            Import {parsedData.length > 0 && `(${parsedData.length} rows)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
