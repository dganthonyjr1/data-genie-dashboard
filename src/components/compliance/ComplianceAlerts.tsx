import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { 
  Bell, 
  AlertTriangle,
  Clock,
  PhoneOff,
  Repeat,
  TrendingDown,
  Mail,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertConfig {
  outsideHoursThreshold: number;
  consentDeniedThreshold: number;
  duplicateCallLimit: number;
  optOutThreshold: number;
  emailAlerts: boolean;
}

interface Alert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  title: string;
  message: string;
  timestamp: Date;
}

interface ComplianceAlertsProps {
  alerts: Alert[];
  config: AlertConfig;
  onConfigChange: (config: AlertConfig) => void;
  metrics: {
    outsideHoursRate: number;
    consentDeniedRate: number;
    optOutRate: number;
  };
}

export const ComplianceAlerts = ({ alerts, config, onConfigChange, metrics }: ComplianceAlertsProps) => {
  const alertRules = [
    {
      id: 'outside_hours',
      icon: Clock,
      title: 'Outside Business Hours',
      description: 'Alert when calls outside 8 AM - 9 PM exceed threshold',
      threshold: config.outsideHoursThreshold,
      currentValue: metrics.outsideHoursRate,
      unit: '%',
      color: 'yellow' as const,
      onThresholdChange: (value: number) => onConfigChange({ ...config, outsideHoursThreshold: value })
    },
    {
      id: 'consent_denied',
      icon: PhoneOff,
      title: 'Consent Denied Rate',
      description: 'Alert when consent denial exceeds threshold',
      threshold: config.consentDeniedThreshold,
      currentValue: metrics.consentDeniedRate,
      unit: '%',
      color: 'red' as const,
      onThresholdChange: (value: number) => onConfigChange({ ...config, consentDeniedThreshold: value })
    },
    {
      id: 'duplicate_calls',
      icon: Repeat,
      title: 'Duplicate Call Limit',
      description: 'Alert when same number called multiple times in 24h',
      threshold: config.duplicateCallLimit,
      currentValue: 0,
      unit: ' calls',
      color: 'purple' as const,
      onThresholdChange: (value: number) => onConfigChange({ ...config, duplicateCallLimit: value })
    },
    {
      id: 'opt_out',
      icon: TrendingDown,
      title: 'Opt-Out Rate',
      description: 'Alert when opt-out requests exceed threshold',
      threshold: config.optOutThreshold,
      currentValue: metrics.optOutRate,
      unit: '%',
      color: 'cyan' as const,
      onThresholdChange: (value: number) => onConfigChange({ ...config, optOutThreshold: value })
    }
  ];

  const getAlertBadge = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return <Badge className="bg-red-500/20 text-red-400">Critical</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500/20 text-yellow-400">Warning</Badge>;
      case 'info':
        return <Badge className="bg-blue-500/20 text-blue-400">Info</Badge>;
    }
  };

  const colorMap = {
    yellow: 'text-yellow-500 bg-yellow-500/20',
    red: 'text-red-500 bg-red-500/20',
    purple: 'text-purple-500 bg-purple-500/20',
    cyan: 'text-cyan-500 bg-cyan-500/20',
  };

  return (
    <div className="space-y-6">
      {/* Active Alerts */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Active Alerts
              </CardTitle>
              <CardDescription>Recent compliance warnings and notifications</CardDescription>
            </div>
            {alerts.length > 0 && (
              <Badge variant="destructive">{alerts.length} Active</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-green-500" />
              </div>
              <p className="font-medium text-green-500">All Clear</p>
              <p className="text-sm text-muted-foreground mt-1">No compliance alerts at this time</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-xl border",
                    alert.type === 'critical' ? "bg-red-500/5 border-red-500/20" :
                    alert.type === 'warning' ? "bg-yellow-500/5 border-yellow-500/20" :
                    "bg-blue-500/5 border-blue-500/20"
                  )}
                >
                  <AlertTriangle className={cn(
                    "h-5 w-5 mt-0.5 flex-shrink-0",
                    alert.type === 'critical' ? "text-red-500" :
                    alert.type === 'warning' ? "text-yellow-500" :
                    "text-blue-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{alert.title}</p>
                      {getAlertBadge(alert.type)}
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Configuration */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Alert Thresholds
          </CardTitle>
          <CardDescription>Configure when you receive compliance alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {alertRules.map((rule) => {
            const isTriggered = rule.currentValue > rule.threshold;
            return (
              <div key={rule.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", colorMap[rule.color])}>
                      <rule.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{rule.title}</p>
                      <p className="text-xs text-muted-foreground">{rule.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-lg font-bold",
                      isTriggered ? "text-red-500" : "text-green-500"
                    )}>
                      {rule.currentValue.toFixed(1)}{rule.unit}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Threshold: {rule.threshold}{rule.unit}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[rule.threshold]}
                    min={1}
                    max={rule.id === 'duplicate_calls' ? 10 : 50}
                    step={1}
                    onValueChange={([value]) => rule.onThresholdChange(value)}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-16 text-right">
                    {rule.threshold}{rule.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Weekly Compliance Summary</p>
                <p className="text-sm text-muted-foreground">
                  Receive a weekly email with compliance metrics and alerts
                </p>
              </div>
            </div>
            <Switch
              checked={config.emailAlerts}
              onCheckedChange={(checked) => onConfigChange({ ...config, emailAlerts: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
