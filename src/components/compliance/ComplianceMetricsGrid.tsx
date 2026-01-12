import { Card, CardContent } from "@/components/ui/card";
import { 
  Phone, 
  Mic, 
  Clock, 
  PhoneOff, 
  TrendingUp, 
  TrendingDown,
  Users,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ComplianceMetrics {
  totalCalls: number;
  callsWithConsent: number;
  callsWithoutConsent: number;
  callsOutsideHours: number;
  optedOutNumbers: number;
  dncListSize: number;
  twoPartyStateCalls: number;
  onePartyStateCalls: number;
  consentRate: number;
  businessHoursRate: number;
}

interface ComplianceMetricsGridProps {
  metrics: ComplianceMetrics;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  color: 'primary' | 'green' | 'cyan' | 'red' | 'purple' | 'yellow';
  subtitle?: string;
}

const MetricCard = ({ title, value, icon, trend, trendLabel, color, subtitle }: MetricCardProps) => {
  const colorMap = {
    primary: 'text-primary',
    green: 'text-green-500',
    cyan: 'text-cyan-500',
    red: 'text-red-500',
    purple: 'text-purple-500',
    yellow: 'text-yellow-500',
  };

  const bgMap = {
    primary: 'bg-primary/10 border-primary/20',
    green: 'bg-green-500/10 border-green-500/20',
    cyan: 'bg-cyan-500/10 border-cyan-500/20',
    red: 'bg-red-500/10 border-red-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20',
    yellow: 'bg-yellow-500/10 border-yellow-500/20',
  };

  return (
    <Card className={cn("border transition-all hover:scale-[1.02]", bgMap[color])}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className={cn("text-3xl font-bold tracking-tight", colorMap[color])}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn("p-2.5 rounded-xl", bgMap[color])}>
            {icon}
          </div>
        </div>
        {trend && trendLabel && (
          <div className={cn(
            "mt-3 flex items-center gap-1 text-xs font-medium",
            trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
          )}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
            {trendLabel}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const ComplianceMetricsGrid = ({ metrics }: ComplianceMetricsGridProps) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Total Calls"
        value={metrics.totalCalls.toLocaleString()}
        icon={<Phone className="h-5 w-5 text-primary" />}
        color="primary"
        trend="neutral"
        trendLabel="This period"
      />
      <MetricCard
        title="Consent Rate"
        value={`${metrics.consentRate.toFixed(1)}%`}
        icon={<Mic className="h-5 w-5 text-green-500" />}
        color="green"
        trend={metrics.consentRate >= 80 ? 'up' : 'down'}
        trendLabel={metrics.consentRate >= 80 ? 'Compliant' : 'Needs improvement'}
      />
      <MetricCard
        title="Business Hours"
        value={`${metrics.businessHoursRate.toFixed(1)}%`}
        icon={<Clock className="h-5 w-5 text-cyan-500" />}
        color="cyan"
        trend={metrics.businessHoursRate >= 95 ? 'up' : 'down'}
        trendLabel={metrics.businessHoursRate >= 95 ? 'Excellent' : 'Review needed'}
      />
      <MetricCard
        title="DNC List"
        value={metrics.dncListSize.toLocaleString()}
        icon={<PhoneOff className="h-5 w-5 text-red-500" />}
        color="red"
        subtitle="Numbers blocked"
      />
    </div>
  );
};

export const ComplianceStatsCards = ({ metrics }: ComplianceMetricsGridProps) => {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Recording Consent Card */}
      <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -translate-y-16 translate-x-16" />
        <CardContent className="pt-6 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Mic className="h-5 w-5 text-green-500" />
            </div>
            <h3 className="font-semibold">Recording Consent</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
              <p className="text-3xl font-bold text-green-500">{metrics.callsWithConsent}</p>
              <p className="text-xs text-muted-foreground mt-1">Consented</p>
            </div>
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
              <p className="text-3xl font-bold text-red-500">{metrics.callsWithoutConsent}</p>
              <p className="text-xs text-muted-foreground mt-1">Declined</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* State Consent Rules Card */}
      <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -translate-y-16 translate-x-16" />
        <CardContent className="pt-6 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <h3 className="font-semibold">State Consent Rules</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
              <p className="text-3xl font-bold text-purple-500">{metrics.twoPartyStateCalls}</p>
              <p className="text-xs text-muted-foreground mt-1">Two-Party States</p>
            </div>
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
              <p className="text-3xl font-bold text-blue-500">{metrics.onePartyStateCalls}</p>
              <p className="text-xs text-muted-foreground mt-1">One-Party States</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Two-party: CA, CT, FL, IL, MD, MA, MI, MT, NV, NH, PA, WA
          </p>
        </CardContent>
      </Card>

      {/* Opt-Out & Compliance Card */}
      <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full -translate-y-16 translate-x-16" />
        <CardContent className="pt-6 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Shield className="h-5 w-5 text-yellow-500" />
            </div>
            <h3 className="font-semibold">Compliance Overview</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
              <span className="text-sm text-muted-foreground">Opted-Out Numbers</span>
              <span className="font-bold text-yellow-500">{metrics.optedOutNumbers}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
              <span className="text-sm text-muted-foreground">Outside Hours Calls</span>
              <span className="font-bold text-red-500">{metrics.callsOutsideHours}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
