import { useNavigate } from "react-router";
import { useDiagnosticsStatus, DiagnosticsStatus } from "@/hooks/use-diagnostics-status";
import { Activity, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const statusConfig: Record<DiagnosticsStatus, { icon: typeof Activity; color: string; bg: string; label: string }> = {
  idle: {
    icon: Activity,
    color: "text-muted-foreground",
    bg: "bg-muted",
    label: "No diagnostics run yet",
  },
  running: {
    icon: Loader2,
    color: "text-blue-500",
    bg: "bg-blue-500/20",
    label: "Running diagnostics...",
  },
  passed: {
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-500/20",
    label: "All systems operational",
  },
  failed: {
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-500/20",
    label: "Critical issues detected",
  },
  partial: {
    icon: AlertCircle,
    color: "text-yellow-500",
    bg: "bg-yellow-500/20",
    label: "Some issues detected",
  },
};

export function DiagnosticsStatusIndicator() {
  const navigate = useNavigate();
  const { status, passedCount, failedCount, totalCount, lastRunAt } = useDiagnosticsStatus();

  const config = statusConfig[status];
  const Icon = config.icon;

  const formatLastRun = (isoString: string | null) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => navigate("/diagnostics")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:opacity-80",
            config.bg
          )}
        >
          <Icon className={cn("h-4 w-4", config.color, status === "running" && "animate-spin")} />
          <span className={cn("text-xs font-medium hidden sm:inline", config.color)}>
            {status === "idle" ? "Health" : 
             status === "running" ? "Checking..." :
             `${passedCount}/${totalCount}`}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-1">
          <p className="font-medium">{config.label}</p>
          {status !== "idle" && status !== "running" && (
            <p className="text-xs text-muted-foreground">
              {passedCount} passed, {failedCount} failed
            </p>
          )}
          {lastRunAt && (
            <p className="text-xs text-muted-foreground">
              Last run: {formatLastRun(lastRunAt)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Click to view details</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
