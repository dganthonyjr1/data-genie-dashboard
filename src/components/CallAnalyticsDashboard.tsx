import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  Legend
} from "recharts";
import { 
  Phone, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  CheckCircle,
  XCircle,
  MessageSquare,
  Users,
  DollarSign,
  Activity
} from "lucide-react";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

interface CallRecord {
  id: number;
  call_id: string;
  facility_name: string;
  phone_number: string;
  status: string;
  outcome: string | null;
  duration: number | null;
  lead_score: number | null;
  created_at: string;
}

interface CallAttempt {
  id: string;
  business_name: string;
  phone_number: string;
  status: string;
  auto_triggered: boolean;
  created_at: string;
}

interface CallAnalyticsDashboardProps {
  callRecords: CallRecord[];
  callAttempts: CallAttempt[];
}

const OUTCOME_COLORS = {
  interested: "#22c55e",
  completed: "#10b981",
  not_interested: "#ef4444",
  voicemail: "#f59e0b",
  pending: "#6366f1",
  failed: "#dc2626",
  callback: "#8b5cf6",
};

const CHART_COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#6366f1", "#8b5cf6", "#ec4899"];

export default function CallAnalyticsDashboard({ callRecords, callAttempts }: CallAnalyticsDashboardProps) {
  // Calculate comprehensive analytics
  const analytics = useMemo(() => {
    const allCalls = [
      ...callRecords.map(r => ({
        status: r.outcome || r.status,
        duration: r.duration || 0,
        leadScore: r.lead_score,
        createdAt: new Date(r.created_at),
        isRetell: true,
      })),
      ...callAttempts.map(a => ({
        status: a.status,
        duration: 0,
        leadScore: null,
        createdAt: new Date(a.created_at),
        isRetell: false,
      })),
    ];

    // Basic counts
    const totalCalls = allCalls.length;
    const successfulCalls = allCalls.filter(c => 
      ["interested", "completed", "success", "callback"].includes(c.status)
    ).length;
    const failedCalls = allCalls.filter(c => 
      ["failed", "not_interested"].includes(c.status)
    ).length;
    const voicemailCalls = allCalls.filter(c => c.status === "voicemail").length;
    const pendingCalls = allCalls.filter(c => 
      ["pending", "initiated", "in_progress"].includes(c.status)
    ).length;

    // Success rate
    const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;

    // Average call duration (only for calls with duration)
    const callsWithDuration = callRecords.filter(r => r.duration && r.duration > 0);
    const avgDuration = callsWithDuration.length > 0
      ? callsWithDuration.reduce((sum, r) => sum + (r.duration || 0), 0) / callsWithDuration.length
      : 0;

    // Total call time
    const totalCallTime = callRecords.reduce((sum, r) => sum + (r.duration || 0), 0);

    // Lead score distribution
    const highScoreLeads = callRecords.filter(r => r.lead_score && r.lead_score >= 80).length;
    const mediumScoreLeads = callRecords.filter(r => r.lead_score && r.lead_score >= 60 && r.lead_score < 80).length;
    const lowScoreLeads = callRecords.filter(r => r.lead_score && r.lead_score < 60).length;

    // Conversion rate (interested / total contacted)
    const interestedCalls = allCalls.filter(c => c.status === "interested").length;
    const conversionRate = totalCalls > 0 ? (interestedCalls / totalCalls) * 100 : 0;

    // Calls per day (last 7 days)
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date(),
    });

    const callsPerDay = last7Days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const daysCalls = allCalls.filter(c => 
        c.createdAt >= dayStart && c.createdAt < dayEnd
      );

      const successful = daysCalls.filter(c => 
        ["interested", "completed", "success", "callback"].includes(c.status)
      ).length;

      return {
        date: format(day, "EEE"),
        fullDate: format(day, "MMM dd"),
        total: daysCalls.length,
        successful,
        failed: daysCalls.filter(c => ["failed", "not_interested"].includes(c.status)).length,
      };
    });

    // Outcome distribution for pie chart
    const outcomeDistribution = Object.entries(
      allCalls.reduce((acc, call) => {
        const status = call.status || "unknown";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace("_", " "),
      value,
      color: OUTCOME_COLORS[name as keyof typeof OUTCOME_COLORS] || "#6b7280",
    }));

    // Hour distribution
    const hourDistribution = Array.from({ length: 24 }, (_, hour) => {
      const hourCalls = allCalls.filter(c => c.createdAt.getHours() === hour);
      return {
        hour: hour.toString().padStart(2, "0") + ":00",
        calls: hourCalls.length,
        successful: hourCalls.filter(c => 
          ["interested", "completed", "success"].includes(c.status)
        ).length,
      };
    }).filter(h => h.calls > 0);

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      voicemailCalls,
      pendingCalls,
      successRate,
      avgDuration,
      totalCallTime,
      highScoreLeads,
      mediumScoreLeads,
      lowScoreLeads,
      conversionRate,
      interestedCalls,
      callsPerDay,
      outcomeDistribution,
      hourDistribution,
    };
  }, [callRecords, callAttempts]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTotalTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Calls</p>
                <p className="text-2xl font-bold">{analytics.totalCalls}</p>
              </div>
              <Phone className="h-6 w-6 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-green-500">
                  {analytics.successRate.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Conversion</p>
                <p className="text-2xl font-bold text-cyan-500">
                  {analytics.conversionRate.toFixed(1)}%
                </p>
              </div>
              <Target className="h-6 w-6 text-cyan-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold">{formatDuration(analytics.avgDuration)}</p>
              </div>
              <Clock className="h-6 w-6 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Time</p>
                <p className="text-2xl font-bold">{formatTotalTime(analytics.totalCallTime)}</p>
              </div>
              <Activity className="h-6 w-6 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Interested</p>
                <p className="text-2xl font-bold text-emerald-500">{analytics.interestedCalls}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-emerald-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Calls Over Time */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Calls (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.callsPerDay.some(d => d.total > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={analytics.callsPerDay}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <YAxis 
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#6366f1" 
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                    name="Total"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="successful" 
                    stroke="#22c55e" 
                    fillOpacity={1} 
                    fill="url(#colorSuccess)" 
                    name="Successful"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                <p>No call data for the last 7 days</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outcome Distribution */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Call Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.outcomeDistribution.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={analytics.outcomeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {analytics.outcomeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {analytics.outcomeDistribution.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <p>No outcome data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lead Quality & Performance */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Lead Score Distribution */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Lead Quality
            </CardTitle>
            <CardDescription>Distribution by lead score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm flex items-center gap-2">
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Hot</Badge>
                    <span className="text-muted-foreground">80-100</span>
                  </span>
                  <span className="font-medium">{analytics.highScoreLeads}</span>
                </div>
                <Progress 
                  value={callRecords.length > 0 ? (analytics.highScoreLeads / callRecords.length) * 100 : 0} 
                  className="h-2" 
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm flex items-center gap-2">
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Warm</Badge>
                    <span className="text-muted-foreground">60-79</span>
                  </span>
                  <span className="font-medium">{analytics.mediumScoreLeads}</span>
                </div>
                <Progress 
                  value={callRecords.length > 0 ? (analytics.mediumScoreLeads / callRecords.length) * 100 : 0} 
                  className="h-2" 
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm flex items-center gap-2">
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Cold</Badge>
                    <span className="text-muted-foreground">0-59</span>
                  </span>
                  <span className="font-medium">{analytics.lowScoreLeads}</span>
                </div>
                <Progress 
                  value={callRecords.length > 0 ? (analytics.lowScoreLeads / callRecords.length) * 100 : 0} 
                  className="h-2" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call Status Summary */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Call Status
            </CardTitle>
            <CardDescription>Current call statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-500">{analytics.successfulCalls}</p>
                <p className="text-xs text-muted-foreground">Successful</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <XCircle className="h-6 w-6 text-red-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-500">{analytics.failedCalls}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <MessageSquare className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-yellow-500">{analytics.voicemailCalls}</p>
                <p className="text-xs text-muted-foreground">Voicemail</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Clock className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-blue-500">{analytics.pendingCalls}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Call Activity by Hour
            </CardTitle>
            <CardDescription>Best times for outreach</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.hourDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={analytics.hourDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <YAxis 
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="calls" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-muted-foreground">
                <p>No hourly data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
