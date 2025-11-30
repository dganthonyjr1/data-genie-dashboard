import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, ExternalLink, AlertCircle, FileText, Database } from "lucide-react";
import { format } from "date-fns";

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

interface JobDetailsModalProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobDetailsModal({ job, open, onOpenChange }: JobDetailsModalProps) {
  if (!job) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "in_progress":
        return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      default:
        return "bg-muted";
    }
  };

  const formatScrapeType = (type: string) => {
    return type.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  const hasResults = Array.isArray(job.results) && job.results.length > 0;
  const hasError = job.status === "failed" && hasResults;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl flex items-center gap-2 break-all">
                <ExternalLink className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                {job.url}
              </DialogTitle>
              <DialogDescription className="mt-2 flex items-center gap-2 flex-wrap">
                <span>{formatScrapeType(job.scrape_type)}</span>
                <span>•</span>
                <span>ID: {job.id.slice(0, 8)}...</span>
              </DialogDescription>
            </div>
            <Badge className={getStatusColor(job.status)}>
              {job.status}
            </Badge>
          </div>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="results">
                Results {hasResults && `(${job.results.length})`}
              </TabsTrigger>
              <TabsTrigger value="instructions">AI Instructions</TabsTrigger>
              <TabsTrigger value="raw">Raw Data</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              <TabsContent value="overview" className="space-y-4 m-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Created</span>
                    </div>
                    <p className="text-sm font-medium">
                      {format(new Date(job.created_at), "PPpp")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Updated</span>
                    </div>
                    <p className="text-sm font-medium">
                      {format(new Date(job.updated_at), "PPpp")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Database className="h-4 w-4" />
                      <span>Scrape Type</span>
                    </div>
                    <p className="text-sm font-medium">
                      {formatScrapeType(job.scrape_type)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>Results Count</span>
                    </div>
                    <p className="text-sm font-medium">
                      {hasResults ? `${job.results.length} items` : "No results"}
                    </p>
                  </div>
                </div>

                {hasError && (
                  <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <p className="font-medium text-red-400">Error Details</p>
                        <pre className="text-sm text-red-300 whitespace-pre-wrap break-all">
                          {JSON.stringify(job.results, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {job.status === "pending" && (
                  <div className="mt-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-yellow-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-400">Job Pending</p>
                        <p className="text-sm text-yellow-300 mt-1">
                          This job is waiting to be processed. Results will appear once scraping is complete.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {job.status === "in_progress" && (
                  <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-blue-400 mt-0.5 animate-pulse" />
                      <div>
                        <p className="font-medium text-blue-400">Job In Progress</p>
                        <p className="text-sm text-blue-300 mt-1">
                          This job is currently being processed. Check back soon for results.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="results" className="m-0">
                {hasResults && !hasError ? (
                  <div className="space-y-4">
                    {job.results.map((result, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg bg-card/50 border border-border/50"
                      >
                        <pre className="text-sm whitespace-pre-wrap break-all">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : hasError ? (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-red-400 mb-2">Error Logs</p>
                        <pre className="text-sm text-red-300 whitespace-pre-wrap break-all">
                          {JSON.stringify(job.results, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No results available yet</p>
                    {job.status === "pending" && (
                      <p className="text-sm mt-2">Job is waiting to be processed</p>
                    )}
                    {job.status === "in_progress" && (
                      <p className="text-sm mt-2">Job is currently being processed</p>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="instructions" className="m-0">
                {job.ai_instructions ? (
                  <div className="p-4 rounded-lg bg-card/50 border border-border/50">
                    <pre className="text-sm whitespace-pre-wrap break-words">
                      {job.ai_instructions}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No AI instructions provided for this job</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="raw" className="m-0">
                <div className="p-4 rounded-lg bg-card/50 border border-border/50">
                  <pre className="text-xs whitespace-pre-wrap break-all">
                    {JSON.stringify(job, null, 2)}
                  </pre>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
