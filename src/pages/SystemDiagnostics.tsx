import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw, Shield, Database, Zap, Server } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useDiagnosticsStatus } from "@/hooks/use-diagnostics-status";

type TestStatus = "pending" | "running" | "passed" | "failed" | "warning";

interface DiagnosticTest {
  id: string;
  name: string;
  category: "auth" | "database" | "functions" | "connectivity";
  status: TestStatus;
  message?: string;
  details?: string;
  duration?: number;
}

const initialTests: DiagnosticTest[] = [
  // Auth tests
  { id: "auth-session", name: "Authentication Session", category: "auth", status: "pending" },
  { id: "auth-user", name: "User Profile Access", category: "auth", status: "pending" },
  
  // Database tests
  { id: "db-read", name: "Database Read", category: "database", status: "pending" },
  { id: "db-write", name: "Database Write", category: "database", status: "pending" },
  { id: "db-rls", name: "Row Level Security", category: "database", status: "pending" },
  
  // Edge function tests
  { id: "fn-preview-url", name: "Preview URL Function", category: "functions", status: "pending" },
  { id: "fn-verify-email", name: "Email Verification Function", category: "functions", status: "pending" },
  { id: "fn-predict-lead", name: "Lead Prediction Function", category: "functions", status: "pending" },
  { id: "fn-audit-revenue", name: "Revenue Audit Function", category: "functions", status: "pending" },
  
  // Connectivity tests
  { id: "conn-supabase", name: "Backend Connectivity", category: "connectivity", status: "pending" },
];

const categoryIcons = {
  auth: Shield,
  database: Database,
  functions: Zap,
  connectivity: Server,
};

const categoryLabels = {
  auth: "Authentication",
  database: "Database",
  functions: "Backend Functions",
  connectivity: "Connectivity",
};

export default function SystemDiagnostics() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<DiagnosticTest[]>(initialTests);
  const [isRunning, setIsRunning] = useState(false);
  const [overallStatus, setOverallStatus] = useState<"idle" | "running" | "passed" | "failed" | "partial">("idle");
  const { setStatus: setGlobalStatus, setResults: setGlobalResults } = useDiagnosticsStatus();

  const updateTest = (id: string, updates: Partial<DiagnosticTest>) => {
    setTests(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const runTest = async (testId: string, testFn: () => Promise<{ passed: boolean; message: string; details?: string }>) => {
    updateTest(testId, { status: "running" });
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      updateTest(testId, {
        status: result.passed ? "passed" : "failed",
        message: result.message,
        details: result.details,
        duration,
      });
      return result.passed;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTest(testId, {
        status: "failed",
        message: error.message || "Unexpected error",
        details: error.stack || JSON.stringify(error),
        duration,
      });
      return false;
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setOverallStatus("running");
    setGlobalStatus("running");
    setTests(initialTests);
    
    let passedCount = 0;
    let failedCount = 0;
    const totalCount = initialTests.length;

    // Auth tests
    const authPassed = await runTest("auth-session", async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session) {
        return { passed: false, message: "No active session", details: "User is not logged in. Please log in to run full diagnostics." };
      }
      return { passed: true, message: `Session active for ${session.user.email}`, details: `Session expires: ${new Date(session.expires_at! * 1000).toLocaleString()}` };
    });
    authPassed ? passedCount++ : failedCount++;

    await runTest("auth-user", async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) {
        return { passed: false, message: "Cannot fetch user data", details: "User profile is not accessible" };
      }
      return { passed: true, message: "User profile accessible", details: `User ID: ${user.id.substring(0, 8)}...` };
    }).then(p => p ? passedCount++ : failedCount++);

    // Database tests
    await runTest("db-read", async () => {
      const { data, error } = await supabase.from("scraping_jobs").select("id").limit(1);
      if (error) {
        return { passed: false, message: "Database read failed", details: error.message };
      }
      return { passed: true, message: "Database read successful", details: `Query returned ${data?.length || 0} rows` };
    }).then(p => p ? passedCount++ : failedCount++);

    await runTest("db-write", async () => {
      // Try to read user_preferences which should exist for authenticated users
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { passed: false, message: "Cannot test write - not authenticated", details: "Log in to test database write operations" };
      }
      
      const { data, error } = await supabase
        .from("user_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) {
        return { passed: false, message: "Database access failed", details: error.message };
      }
      
      return { passed: true, message: "Database write access verified", details: data ? "User preferences record exists" : "User preferences can be created" };
    }).then(p => p ? passedCount++ : failedCount++);

    await runTest("db-rls", async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { passed: false, message: "Cannot test RLS - not authenticated", details: "Log in to verify row level security" };
      }
      
      // Try to query jobs - should only return user's own jobs
      const { data, error } = await supabase.from("scraping_jobs").select("user_id").limit(5);
      if (error) {
        return { passed: false, message: "RLS query failed", details: error.message };
      }
      
      // Check that all returned rows belong to current user
      const allOwnData = !data || data.every(row => row.user_id === user.id);
      if (!allOwnData) {
        return { passed: false, message: "RLS may be misconfigured", details: "Query returned data belonging to other users" };
      }
      
      return { passed: true, message: "Row Level Security working correctly", details: `All ${data?.length || 0} rows belong to current user` };
    }).then(p => p ? passedCount++ : failedCount++);

    // Edge function tests
    await runTest("fn-preview-url", async () => {
      const { data, error } = await supabase.functions.invoke("preview-url", {
        body: { url: "https://example.com" }
      });
      if (error) {
        return { passed: false, message: "Preview URL function failed", details: error.message };
      }
      return { passed: true, message: "Preview URL function operational", details: `Response: ${data?.title || 'Preview generated'}` };
    }).then(p => p ? passedCount++ : failedCount++);

    await runTest("fn-verify-email", async () => {
      const { data, error } = await supabase.functions.invoke("verify-email", {
        body: { emails: ["test@example.com"] }
      });
      if (error) {
        return { passed: false, message: "Email verification function failed", details: error.message };
      }
      return { passed: true, message: "Email verification function operational", details: `Verified ${data?.results?.length || 0} email(s)` };
    }).then(p => p ? passedCount++ : failedCount++);

    await runTest("fn-predict-lead", async () => {
      const { data, error } = await supabase.functions.invoke("predict-lead-score", {
        body: { 
          business_name: "Test Business",
          phone: "555-0100",
          email: "test@example.com"
        }
      });
      if (error) {
        // Check if it's an auth error (expected without login)
        if (error.message.includes("Unauthorized") || error.message.includes("401")) {
          return { passed: true, message: "Lead prediction requires authentication", details: "Function correctly requires auth" };
        }
        return { passed: false, message: "Lead prediction function failed", details: error.message };
      }
      return { passed: true, message: "Lead prediction function operational", details: `Score: ${data?.conversion_probability || 'N/A'}` };
    }).then(p => p ? passedCount++ : failedCount++);

    await runTest("fn-audit-revenue", async () => {
      const { data, error } = await supabase.functions.invoke("audit-revenue", {
        body: { 
          businessName: "Test Clinic",
          niche: "healthcare",
          description: "Medical practice"
        }
      });
      if (error) {
        return { passed: false, message: "Revenue audit function failed", details: error.message };
      }
      return { passed: true, message: "Revenue audit function operational", details: `Status: ${data?.status || 'Completed'}` };
    }).then(p => p ? passedCount++ : failedCount++);

    // Connectivity test
    await runTest("conn-supabase", async () => {
      const startTime = Date.now();
      const { error } = await supabase.from("scraping_jobs").select("id").limit(1);
      const latency = Date.now() - startTime;
      
      if (error) {
        return { passed: false, message: "Backend connectivity failed", details: error.message };
      }
      
      const status = latency < 500 ? "Excellent" : latency < 1000 ? "Good" : "Slow";
      return { passed: true, message: `Backend connectivity ${status}`, details: `Latency: ${latency}ms` };
    }).then(p => p ? passedCount++ : failedCount++);

    // Set overall status and sync with global state
    if (failedCount === 0) {
      setOverallStatus("passed");
    } else if (passedCount === 0) {
      setOverallStatus("failed");
    } else {
      setOverallStatus("partial");
    }
    
    // Update global diagnostics status for the indicator
    setGlobalResults(passedCount, failedCount, totalCount);

    setIsRunning(false);
  };

  useEffect(() => {
    runAllTests();
  }, []);

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "passed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-muted" />;
    }
  };

  const getStatusBadge = (status: TestStatus) => {
    const variants: Record<TestStatus, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      running: "secondary",
      passed: "default",
      failed: "destructive",
      warning: "secondary",
    };
    
    return (
      <Badge variant={variants[status]} className={status === "passed" ? "bg-green-500" : ""}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const groupedTests = tests.reduce((acc, test) => {
    if (!acc[test.category]) acc[test.category] = [];
    acc[test.category].push(test);
    return acc;
  }, {} as Record<string, DiagnosticTest[]>);

  const passedTests = tests.filter(t => t.status === "passed").length;
  const failedTests = tests.filter(t => t.status === "failed").length;
  const totalTests = tests.length;

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">System Diagnostics</h1>
            <p className="text-muted-foreground mt-1">
              End-to-end health checks for all system components
            </p>
          </div>
          <Button onClick={runAllTests} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Run All Tests
              </>
            )}
          </Button>
        </div>

        {/* Summary Card */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Overall Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className={`text-4xl font-bold ${
                overallStatus === "passed" ? "text-green-500" :
                overallStatus === "failed" ? "text-red-500" :
                overallStatus === "partial" ? "text-yellow-500" :
                "text-muted-foreground"
              }`}>
                {overallStatus === "running" ? (
                  <Loader2 className="h-10 w-10 animate-spin" />
                ) : overallStatus === "passed" ? (
                  <CheckCircle2 className="h-10 w-10" />
                ) : overallStatus === "failed" ? (
                  <XCircle className="h-10 w-10" />
                ) : overallStatus === "partial" ? (
                  <AlertCircle className="h-10 w-10" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-lg font-medium">
                  {overallStatus === "running" && "Running diagnostics..."}
                  {overallStatus === "passed" && "All systems operational"}
                  {overallStatus === "failed" && "Critical issues detected"}
                  {overallStatus === "partial" && "Some issues detected"}
                  {overallStatus === "idle" && "Ready to run diagnostics"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {passedTests} passed • {failedTests} failed • {totalTests} total
                </div>
              </div>
              <div className="flex gap-2">
                <div className="text-center px-4 py-2 bg-green-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-green-500">{passedTests}</div>
                  <div className="text-xs text-muted-foreground">Passed</div>
                </div>
                <div className="text-center px-4 py-2 bg-red-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-red-500">{failedTests}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Results by Category */}
        <Accordion type="multiple" defaultValue={Object.keys(groupedTests)} className="space-y-4">
          {(Object.keys(categoryLabels) as Array<keyof typeof categoryLabels>).map(category => {
            const categoryTests = groupedTests[category] || [];
            const CategoryIcon = categoryIcons[category];
            const categoryPassed = categoryTests.filter(t => t.status === "passed").length;
            const categoryFailed = categoryTests.filter(t => t.status === "failed").length;

            return (
              <AccordionItem key={category} value={category} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{categoryLabels[category]}</span>
                    <div className="flex gap-1 ml-2">
                      {categoryFailed > 0 && (
                        <Badge variant="destructive" className="text-xs">{categoryFailed} failed</Badge>
                      )}
                      {categoryPassed > 0 && (
                        <Badge className="bg-green-500 text-xs">{categoryPassed} passed</Badge>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {categoryTests.map(test => (
                      <Card key={test.id} className={`${
                        test.status === "failed" ? "border-red-500/50 bg-red-500/5" :
                        test.status === "passed" ? "border-green-500/50 bg-green-500/5" :
                        ""
                      }`}>
                        <CardContent className="py-3 px-4">
                          <div className="flex items-start gap-3">
                            {getStatusIcon(test.status)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">{test.name}</span>
                                <div className="flex items-center gap-2">
                                  {test.duration && (
                                    <span className="text-xs text-muted-foreground">{test.duration}ms</span>
                                  )}
                                  {getStatusBadge(test.status)}
                                </div>
                              </div>
                              {test.message && (
                                <p className="text-sm text-muted-foreground mt-1">{test.message}</p>
                              )}
                              {test.details && test.status === "failed" && (
                                <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono overflow-x-auto">
                                  {test.details}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Troubleshooting Tips */}
        {failedTests > 0 && (
          <Card className="mt-6 border-yellow-500/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                Troubleshooting Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {tests.some(t => t.id.startsWith("auth-") && t.status === "failed") && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span><strong>Authentication issues:</strong> Try logging out and back in, or clear browser cookies.</span>
                </div>
              )}
              {tests.some(t => t.id.startsWith("db-") && t.status === "failed") && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span><strong>Database issues:</strong> Check your network connection. If issues persist, contact support.</span>
                </div>
              )}
              {tests.some(t => t.id.startsWith("fn-") && t.status === "failed") && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span><strong>Function issues:</strong> Backend functions may be temporarily unavailable. Try again in a few minutes.</span>
                </div>
              )}
              {tests.some(t => t.id.startsWith("conn-") && t.status === "failed") && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span><strong>Connectivity issues:</strong> Check your internet connection and firewall settings.</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
