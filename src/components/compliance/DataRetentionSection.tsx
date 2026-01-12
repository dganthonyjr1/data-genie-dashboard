import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Database, 
  Clock, 
  Trash2, 
  Shield, 
  Calendar,
  AlertTriangle,
  Lock,
  Server
} from "lucide-react";
import { format, addMonths, differenceInDays } from "date-fns";

interface DataRetentionSectionProps {
  totalRecords: number;
  oldestRecordDate: Date | null;
}

export const DataRetentionSection = ({ totalRecords, oldestRecordDate }: DataRetentionSectionProps) => {
  const retentionMonths = 18;
  const today = new Date();
  
  const getRetentionProgress = () => {
    if (!oldestRecordDate) return 0;
    const expiryDate = addMonths(oldestRecordDate, retentionMonths);
    const totalDays = retentionMonths * 30;
    const elapsedDays = differenceInDays(today, oldestRecordDate);
    return Math.min(100, (elapsedDays / totalDays) * 100);
  };

  const getDaysUntilDeletion = () => {
    if (!oldestRecordDate) return null;
    const expiryDate = addMonths(oldestRecordDate, retentionMonths);
    return Math.max(0, differenceInDays(expiryDate, today));
  };

  const retentionProgress = getRetentionProgress();
  const daysRemaining = getDaysUntilDeletion();

  return (
    <div className="space-y-6">
      {/* Retention Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Database className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{totalRecords.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Retention Period</p>
                <p className="text-2xl font-bold">{retentionMonths} Months</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Calendar className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Oldest Record</p>
                <p className="text-lg font-bold">
                  {oldestRecordDate ? format(oldestRecordDate, "MMM yyyy") : "No records"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Retention Progress */}
      {oldestRecordDate && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-primary" />
              Auto-Deletion Progress
            </CardTitle>
            <CardDescription>
              Records older than 18 months are automatically deleted for compliance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Time until oldest records expire</span>
                <span className="font-medium">
                  {daysRemaining !== null ? `${daysRemaining} days remaining` : 'N/A'}
                </span>
              </div>
              <Progress value={retentionProgress} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Created</span>
                <span>18 months</span>
              </div>
            </div>

            {daysRemaining !== null && daysRemaining < 90 && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-yellow-400">Upcoming Data Deletion</p>
                  <p className="text-sm text-muted-foreground">
                    Some records will be deleted in {daysRemaining} days. Export important data before then.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security & Compliance Features */}
      <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Data Security Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
              <Lock className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Encryption at Rest</p>
                <p className="text-sm text-muted-foreground">All data encrypted with AES-256</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
              <Server className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Secure Storage</p>
                <p className="text-sm text-muted-foreground">SOC 2 compliant infrastructure</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
              <Trash2 className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium">Automatic Deletion</p>
                <p className="text-sm text-muted-foreground">Records purged after 18 months</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
              <Database className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <p className="font-medium">Audit Trail</p>
                <p className="text-sm text-muted-foreground">All access and deletions logged</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retention Policy Summary */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Data Categories & Retention</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { category: "Call Records", retention: "18 months", description: "Call logs, outcomes, compliance data" },
              { category: "Call Recordings", retention: "18 months", description: "Audio recordings with consent markers" },
              { category: "DNC List", retention: "Permanent", description: "Do Not Call entries for compliance" },
              { category: "Audit Logs", retention: "7 years", description: "Compliance actions and system logs" },
              { category: "Scraped Data", retention: "12 months", description: "Lead data from scraping jobs" },
            ].map((item) => (
              <div key={item.category} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
                <div>
                  <p className="font-medium">{item.category}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <Badge variant="outline" className="ml-4">{item.retention}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
