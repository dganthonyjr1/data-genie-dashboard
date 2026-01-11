import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Server, 
  Zap, 
  Globe,
  ArrowLeft,
  Clock
} from "lucide-react";
import { useNavigate } from "react-router";

type ServiceStatus = "operational" | "degraded" | "down" | "checking";

interface ServiceCheck {
  id: string;
  name: string;
  description: string;
  status: ServiceStatus;
  latency?: number;
  lastChecked?: Date;
}

const initialServices: ServiceCheck[] = [
  { id: "api", name: "API Gateway", description: "Core API infrastructure", status: "checking" },
  { id: "database", name: "Database", description: "Data storage and retrieval", status: "checking" },
  { id: "functions", name: "Backend Functions", description: "Serverless compute", status: "checking" },
  { id: "auth", name: "Authentication", description: "User authentication services", status: "checking" },
];

export default function Status() {
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceCheck[]>(initialServices);
  const [isChecking, setIsChecking] = useState(false);
  const [lastFullCheck, setLastFullCheck] = useState<Date | null>(null);
  const [overallStatus, setOverallStatus] = useState<"operational" | "degraded" | "down" | "checking">("checking");

  const updateService = (id: string, updates: Partial<ServiceCheck>) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const runHealthChecks = async () => {
    setIsChecking(true);
    setServices(initialServices);

    let operationalCount = 0;
    let downCount = 0;

    // Check 1: API Gateway / Database connectivity
    try {
      const startTime = Date.now();
      const { error } = await supabase.from("scraping_templates").select("id").limit(1);
      const latency = Date.now() - startTime;
      
      if (!error) {
        updateService("database", { 
          status: "operational", 
          latency, 
          lastChecked: new Date() 
        });
        updateService("api", { 
          status: "operational", 
          latency, 
          lastChecked: new Date() 
        });
        operationalCount += 2;
      } else {
        updateService("database", { status: "down", lastChecked: new Date() });
        updateService("api", { status: "degraded", lastChecked: new Date() });
        downCount += 1;
        operationalCount += 1;
      }
    } catch {
      updateService("database", { status: "down", lastChecked: new Date() });
      updateService("api", { status: "down", lastChecked: new Date() });
      downCount += 2;
    }

    // Check 2: Backend Functions (preview-url is public)
    try {
      const startTime = Date.now();
      const { error } = await supabase.functions.invoke("preview-url", {
        body: { url: "https://example.com" }
      });
      const latency = Date.now() - startTime;
      
      if (!error) {
        updateService("functions", { 
          status: "operational", 
          latency, 
          lastChecked: new Date() 
        });
        operationalCount += 1;
      } else {
        updateService("functions", { status: "degraded", lastChecked: new Date() });
      }
    } catch {
      updateService("functions", { status: "down", lastChecked: new Date() });
      downCount += 1;
    }

    // Check 3: Auth service availability
    try {
      const startTime = Date.now();
      const { error } = await supabase.auth.getSession();
      const latency = Date.now() - startTime;
      
      // getSession succeeding (even with no session) means auth is working
      if (!error) {
        updateService("auth", { 
          status: "operational", 
          latency, 
          lastChecked: new Date() 
        });
        operationalCount += 1;
      } else {
        updateService("auth", { status: "degraded", lastChecked: new Date() });
      }
    } catch {
      updateService("auth", { status: "down", lastChecked: new Date() });
      downCount += 1;
    }

    // Set overall status
    if (downCount === 0 && operationalCount === 4) {
      setOverallStatus("operational");
    } else if (downCount >= 2) {
      setOverallStatus("down");
    } else {
      setOverallStatus("degraded");
    }

    setLastFullCheck(new Date());
    setIsChecking(false);
  };

  useEffect(() => {
    runHealthChecks();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(runHealthChecks, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case "checking":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case "operational":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "degraded":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "down":
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: ServiceStatus) => {
    const config = {
      checking: { label: "Checking...", className: "bg-blue-500/20 text-blue-400 border-blue-500/50" },
      operational: { label: "Operational", className: "bg-green-500/20 text-green-400 border-green-500/50" },
      degraded: { label: "Degraded", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50" },
      down: { label: "Down", className: "bg-red-500/20 text-red-400 border-red-500/50" },
    };
    return <Badge variant="outline" className={config[status].className}>{config[status].label}</Badge>;
  };

  const getOverallStatusDisplay = () => {
    const config = {
      checking: { 
        label: "Checking Systems...", 
        description: "Running health checks",
        className: "text-blue-400",
        bgClass: "from-blue-500/20 to-blue-600/20"
      },
      operational: { 
        label: "All Systems Operational", 
        description: "All services are running normally",
        className: "text-green-400",
        bgClass: "from-green-500/20 to-green-600/20"
      },
      degraded: { 
        label: "Partial System Outage", 
        description: "Some services may be experiencing issues",
        className: "text-yellow-400",
        bgClass: "from-yellow-500/20 to-yellow-600/20"
      },
      down: { 
        label: "Major System Outage", 
        description: "Multiple services are experiencing issues",
        className: "text-red-400",
        bgClass: "from-red-500/20 to-red-600/20"
      },
    };
    return config[overallStatus];
  };

  const overallDisplay = getOverallStatusDisplay();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                ScrapeX
              </span>
            </button>
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            System Status
          </h1>
          <p className="text-muted-foreground">
            Real-time health monitoring for ScrapeX services
          </p>
        </div>

        {/* Overall Status Banner */}
        <Card className={`mb-8 bg-gradient-to-r ${overallDisplay.bgClass} border-0`}>
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-4">
              {overallStatus === "checking" ? (
                <Loader2 className={`h-10 w-10 animate-spin ${overallDisplay.className}`} />
              ) : overallStatus === "operational" ? (
                <CheckCircle2 className={`h-10 w-10 ${overallDisplay.className}`} />
              ) : overallStatus === "degraded" ? (
                <AlertCircle className={`h-10 w-10 ${overallDisplay.className}`} />
              ) : (
                <XCircle className={`h-10 w-10 ${overallDisplay.className}`} />
              )}
              <div className="text-center">
                <h2 className={`text-2xl font-bold ${overallDisplay.className}`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  {overallDisplay.label}
                </h2>
                <p className="text-muted-foreground">{overallDisplay.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Refresh Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {lastFullCheck ? (
              <span>Last checked: {lastFullCheck.toLocaleTimeString()}</span>
            ) : (
              <span>Checking...</span>
            )}
          </div>
          <Button onClick={runHealthChecks} disabled={isChecking} variant="outline" size="sm">
            {isChecking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>

        {/* Service Status List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              Service Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {services.map((service) => (
              <div 
                key={service.id} 
                className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50"
              >
                <div className="flex items-center gap-4">
                  {getStatusIcon(service.status)}
                  <div>
                    <h3 className="font-medium">{service.name}</h3>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {service.latency && service.status === "operational" && (
                    <span className="text-sm text-muted-foreground">{service.latency}ms</span>
                  )}
                  {getStatusBadge(service.status)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Info Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>This page auto-refreshes every 60 seconds.</p>
          <p className="mt-1">
            For detailed diagnostics, <button onClick={() => navigate("/login")} className="text-primary hover:underline">sign in</button> and visit the Diagnostics page.
          </p>
        </div>
      </div>
    </div>
  );
}
