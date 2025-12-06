import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Zap, Search, Database } from "lucide-react";

interface UsageTrackingProps {
  firecrawlUsage?: number;
  firecrawlLimit?: number;
  serpApiUsage?: number;
  serpApiLimit?: number;
}

const UsageTracking = ({
  firecrawlUsage = 0,
  firecrawlLimit = 500,
  serpApiUsage = 0,
  serpApiLimit = 100,
}: UsageTrackingProps) => {
  const firecrawlPercentage = Math.min((firecrawlUsage / firecrawlLimit) * 100, 100);
  const serpApiPercentage = Math.min((serpApiUsage / serpApiLimit) * 100, 100);

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-500";
    if (percentage >= 70) return "text-yellow-500";
    return "text-green-500";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          API Usage This Month
        </CardTitle>
        <CardDescription>
          Monitor your API consumption across services
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Firecrawl Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Firecrawl API</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${getStatusColor(firecrawlPercentage)}`}>
                {firecrawlUsage.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">
                / {firecrawlLimit.toLocaleString()} requests
              </span>
              {firecrawlPercentage >= 90 && (
                <Badge variant="destructive" className="text-xs">
                  Low
                </Badge>
              )}
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(firecrawlPercentage)}`}
              style={{ width: `${firecrawlPercentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Used for complete business data and bulk scraping
          </p>
        </div>

        {/* SerpAPI Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">SerpAPI (Google Business)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${getStatusColor(serpApiPercentage)}`}>
                {serpApiUsage}
              </span>
              <span className="text-sm text-muted-foreground">
                / {serpApiLimit} searches
              </span>
              {serpApiPercentage >= 90 && (
                <Badge variant="destructive" className="text-xs">
                  Low
                </Badge>
              )}
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(serpApiPercentage)}`}
              style={{ width: `${serpApiPercentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Used for Google Business Profiles scraping (free tier: 100/month)
          </p>
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Usage resets on the 1st of each month. Upgrade for higher limits.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default UsageTracking;