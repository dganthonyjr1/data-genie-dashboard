import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDiagnosticsStatus, DiagnosticsStatus } from "./use-diagnostics-status";
import { toast } from "sonner";

const DIAGNOSTICS_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

interface TestResult {
  passed: boolean;
  message: string;
}

export function useBackgroundDiagnostics() {
  const { status: currentStatus, setStatus, setResults, lastRunAt } = useDiagnosticsStatus();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);
  const previousStatusRef = useRef<DiagnosticsStatus>(currentStatus);

  const runQuickDiagnostics = useCallback(async () => {
    // Prevent concurrent runs
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    
    // Store previous status before running
    const previousStatus = previousStatusRef.current;
    
    setStatus("running");
    
    let passedCount = 0;
    let failedCount = 0;
    const totalTests = 5; // Quick subset of tests

    try {
      // Test 1: Auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        passedCount++;
      } else {
        failedCount++;
      }

      // Test 2: Database read
      const { error: dbError } = await supabase.from("scraping_jobs").select("id").limit(1);
      if (!dbError) {
        passedCount++;
      } else {
        failedCount++;
      }

      // Test 3: User preferences access
      if (session?.user) {
        const { error: prefError } = await supabase
          .from("user_preferences")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (!prefError) {
          passedCount++;
        } else {
          failedCount++;
        }
      } else {
        failedCount++;
      }

      // Test 4: Preview URL function (lightweight)
      try {
        const { error } = await supabase.functions.invoke("preview-url", {
          body: { url: "https://example.com" }
        });
        if (!error) {
          passedCount++;
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }

      // Test 5: Connectivity latency check
      const startTime = Date.now();
      const { error: connError } = await supabase.from("scraping_jobs").select("id").limit(1);
      const latency = Date.now() - startTime;
      
      if (!connError && latency < 2000) {
        passedCount++;
      } else {
        failedCount++;
      }

    } catch (error) {
      console.error("Background diagnostics error:", error);
      failedCount = totalTests - passedCount;
    } finally {
      // Determine new status
      const newStatus: DiagnosticsStatus = 
        failedCount === 0 ? "passed" : 
        passedCount === 0 ? "failed" : "partial";
      
      // Check for status degradation and show toast
      const wasHealthy = previousStatus === "passed";
      const isNowUnhealthy = newStatus === "failed" || newStatus === "partial";
      
      if (wasHealthy && isNowUnhealthy) {
        toast.error("System Health Alert", {
          description: `${failedCount} diagnostic check${failedCount > 1 ? 's' : ''} failed. Click to view details.`,
          action: {
            label: "View",
            onClick: () => window.location.href = "/diagnostics",
          },
          duration: 10000,
        });
      }
      
      // Check for recovery and show success toast
      const wasUnhealthy = previousStatus === "failed" || previousStatus === "partial";
      const isNowHealthy = newStatus === "passed";
      
      if (wasUnhealthy && isNowHealthy) {
        toast.success("System Recovered", {
          description: "All diagnostic checks are now passing.",
          duration: 5000,
        });
      }
      
      // Update the previous status ref
      previousStatusRef.current = newStatus;
      
      setResults(passedCount, failedCount, totalTests);
      isRunningRef.current = false;
    }
  }, [setStatus, setResults]);

  useEffect(() => {
    // Check if we should run immediately (no recent run or stale data)
    const shouldRunNow = () => {
      if (!lastRunAt) return true;
      const lastRun = new Date(lastRunAt).getTime();
      const now = Date.now();
      return (now - lastRun) > DIAGNOSTICS_INTERVAL_MS;
    };

    // Run immediately if stale
    if (shouldRunNow()) {
      runQuickDiagnostics();
    }

    // Set up periodic interval
    intervalRef.current = setInterval(() => {
      runQuickDiagnostics();
    }, DIAGNOSTICS_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [runQuickDiagnostics, lastRunAt]);

  return { runNow: runQuickDiagnostics };
}
