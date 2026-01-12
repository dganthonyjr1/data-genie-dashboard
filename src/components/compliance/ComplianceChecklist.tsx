import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Shield,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  critical?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

interface ComplianceChecklistProps {
  items: ChecklistItem[];
  tcpaAccepted: boolean;
  onAcceptTcpa: () => void;
}

export const ComplianceChecklist = ({ items, tcpaAccepted, onAcceptTcpa }: ComplianceChecklistProps) => {
  const completedCount = items.filter(i => i.checked).length;
  const progress = (completedCount / items.length) * 100;
  const allCriticalPassed = items.filter(i => i.critical).every(i => i.checked);

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className={cn(
        "border-2 transition-colors",
        progress === 100 ? "border-green-500/50 bg-green-500/5" : 
        !allCriticalPassed ? "border-red-500/50 bg-red-500/5" : 
        "border-yellow-500/50 bg-yellow-500/5"
      )}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-xl",
                progress === 100 ? "bg-green-500/20" : 
                !allCriticalPassed ? "bg-red-500/20" : 
                "bg-yellow-500/20"
              )}>
                <Shield className={cn(
                  "h-6 w-6",
                  progress === 100 ? "text-green-500" : 
                  !allCriticalPassed ? "text-red-500" : 
                  "text-yellow-500"
                )} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Compliance Score</h3>
                <p className="text-sm text-muted-foreground">
                  {completedCount} of {items.length} requirements met
                </p>
              </div>
            </div>
            <div className={cn(
              "text-4xl font-bold",
              progress === 100 ? "text-green-500" : 
              !allCriticalPassed ? "text-red-500" : 
              "text-yellow-500"
            )}>
              {Math.round(progress)}%
            </div>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {/* TCPA Certification Status */}
      {!tcpaAccepted && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <div>
                  <p className="font-medium text-red-400">TCPA Certification Required</p>
                  <p className="text-sm text-muted-foreground">
                    You must accept before making any calls
                  </p>
                </div>
              </div>
              <Button onClick={onAcceptTcpa} variant="destructive">
                Accept Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checklist Items */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            TCPA Compliance Checklist
          </CardTitle>
          <CardDescription>
            Ensure you meet all regulatory requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-4 p-4 rounded-xl border transition-all",
                item.checked 
                  ? "bg-green-500/5 border-green-500/20" 
                  : item.critical 
                    ? "bg-red-500/5 border-red-500/20" 
                    : "bg-muted/30 border-border/50"
              )}
            >
              <div className={cn(
                "mt-0.5 p-1 rounded-full flex-shrink-0",
                item.checked ? "bg-green-500/20" : item.critical ? "bg-red-500/20" : "bg-muted"
              )}>
                {item.checked ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : item.critical ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{item.label}</p>
                  {item.critical && !item.checked && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                      Critical
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
              </div>
              {item.actionLabel && item.onAction && !item.checked && (
                <Button size="sm" variant="outline" onClick={item.onAction} className="flex-shrink-0">
                  {item.actionLabel}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Legal Resources */}
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-primary" />
            Legal Resources
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { label: "FCC TCPA Guidelines", url: "https://www.fcc.gov/consumers/guides/unwanted-telephone-marketing-calls" },
              { label: "FTC Telemarketing Rules", url: "https://www.ftc.gov/business-guidance/resources/complying-telemarketing-sales-rule" },
              { label: "National DNC Registry", url: "https://www.donotcall.gov/" },
              { label: "State Consent Laws", url: "https://www.justia.com/privacy/telecommunications-privacy/" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-sm"
              >
                <ExternalLink className="h-4 w-4 text-primary" />
                {link.label}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
