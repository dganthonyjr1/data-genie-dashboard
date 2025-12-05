import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";

interface ManualDataEntryModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, string>[]) => void;
  existingHeaders?: string[];
}

export default function ManualDataEntryModal({ 
  open, 
  onClose, 
  onSubmit, 
  existingHeaders = [] 
}: ManualDataEntryModalProps) {
  const defaultHeaders = existingHeaders.length > 0 
    ? existingHeaders 
    : ["business_name", "email", "phone", "address", "website"];
  
  const [headers, setHeaders] = useState<string[]>(defaultHeaders);
  const [rows, setRows] = useState<Record<string, string>[]>([
    Object.fromEntries(defaultHeaders.map(h => [h, ""]))
  ]);

  const addHeader = () => {
    const newHeader = `field_${headers.length + 1}`;
    setHeaders([...headers, newHeader]);
    setRows(rows.map(row => ({ ...row, [newHeader]: "" })));
  };

  const removeHeader = (index: number) => {
    const headerToRemove = headers[index];
    setHeaders(headers.filter((_, i) => i !== index));
    setRows(rows.map(row => {
      const newRow = { ...row };
      delete newRow[headerToRemove];
      return newRow;
    }));
  };

  const updateHeader = (index: number, value: string) => {
    const oldHeader = headers[index];
    const newHeaders = [...headers];
    newHeaders[index] = value;
    setHeaders(newHeaders);
    setRows(rows.map(row => {
      const newRow: Record<string, string> = {};
      Object.entries(row).forEach(([key, val]) => {
        newRow[key === oldHeader ? value : key] = val;
      });
      return newRow;
    }));
  };

  const addRow = () => {
    setRows([...rows, Object.fromEntries(headers.map(h => [h, ""]))]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateCell = (rowIndex: number, header: string, value: string) => {
    const newRows = [...rows];
    newRows[rowIndex] = { ...newRows[rowIndex], [header]: value };
    setRows(newRows);
  };

  const handleSubmit = () => {
    const validRows = rows.filter(row => 
      Object.values(row).some(v => v.trim() !== "")
    );
    if (validRows.length > 0) {
      onSubmit(validRows);
      onClose();
    }
  };

  const handleClose = () => {
    setHeaders(defaultHeaders);
    setRows([Object.fromEntries(defaultHeaders.map(h => [h, ""]))]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-orbitron">Manual Data Entry</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Column Headers */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Column Headers</Label>
            <div className="flex flex-wrap gap-2">
              {headers.map((header, i) => (
                <div key={i} className="flex items-center gap-1">
                  <Input
                    value={header}
                    onChange={(e) => updateHeader(i, e.target.value)}
                    className="w-32 h-8 text-sm"
                  />
                  {headers.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeHeader(i)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addHeader} className="h-8">
                <Plus className="h-3 w-3 mr-1" /> Column
              </Button>
            </div>
          </div>

          {/* Data Rows */}
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Data Rows</Label>
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-2 items-start p-3 border border-border rounded-lg bg-card/50">
                <span className="text-xs text-muted-foreground w-6 pt-2">{rowIndex + 1}</span>
                <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(headers.length, 3)}, 1fr)` }}>
                  {headers.map((header) => (
                    <div key={header}>
                      <Label className="text-xs text-muted-foreground">{header}</Label>
                      <Input
                        value={row[header] || ""}
                        onChange={(e) => updateCell(rowIndex, header, e.target.value)}
                        className="h-8 text-sm"
                        placeholder={header}
                      />
                    </div>
                  ))}
                </div>
                {rows.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeRow(rowIndex)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" onClick={addRow} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Add Row
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Add Data</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
