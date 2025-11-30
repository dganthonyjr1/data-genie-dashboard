import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Globe, FileText, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UrlPreviewModalProps {
  url: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PreviewData {
  url: string;
  title: string;
  description: string;
  textContent: string;
  ogImage: string | null;
  contentLength: number;
  previewGenerated: string;
}

export const UrlPreviewModal = ({ url, open, onOpenChange }: UrlPreviewModalProps) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const { toast } = useToast();

  const fetchPreview = async () => {
    if (!url) return;

    setLoading(true);
    setPreview(null);

    try {
      const { data, error } = await supabase.functions.invoke('preview-url', {
        body: { url }
      });

      if (error) {
        throw error;
      }

      setPreview(data);
    } catch (error) {
      console.error('Error fetching preview:', error);
      toast({
        title: "Failed to load preview",
        description: error instanceof Error ? error.message : "Could not fetch URL preview",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && url && !preview) {
      fetchPreview();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            URL Preview
          </DialogTitle>
          <DialogDescription>
            Quick preview of webpage content before scraping
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
              <p className="text-sm text-muted-foreground">Loading preview...</p>
            </div>
          </div>
        )}

        {!loading && preview && (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {/* URL */}
              <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                <ExternalLink className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">URL</p>
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline break-all"
                  >
                    {preview.url}
                  </a>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Page Title</p>
                </div>
                <p className="text-base font-semibold">{preview.title}</p>
              </div>

              {/* Description */}
              {preview.description && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Meta Description</p>
                  <p className="text-sm text-foreground">{preview.description}</p>
                </div>
              )}

              {/* OG Image */}
              {preview.ogImage && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Preview Image</p>
                  </div>
                  <img
                    src={preview.ogImage}
                    alt="Page preview"
                    className="w-full rounded-lg border border-border/50 max-h-64 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Content Stats */}
              <div className="flex gap-2">
                <Badge variant="secondary" className="text-xs">
                  Content: {(preview.contentLength / 1024).toFixed(1)} KB
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Preview: {preview.textContent.length} chars
                </Badge>
              </div>

              {/* Text Content Preview */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Text Content Preview</p>
                <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {preview.textContent}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(preview.url, '_blank')}
                  className="flex-1"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in New Tab
                </Button>
                <Button
                  variant="outline"
                  onClick={fetchPreview}
                  className="flex-1"
                >
                  Refresh Preview
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}

        {!loading && !preview && url && (
          <div className="text-center py-12">
            <Globe className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              Click to load preview for this URL
            </p>
            <Button
              variant="outline"
              onClick={fetchPreview}
              className="mt-4"
            >
              Load Preview
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
