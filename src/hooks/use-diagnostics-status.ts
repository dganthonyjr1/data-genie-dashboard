import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DiagnosticsStatus = "idle" | "running" | "passed" | "failed" | "partial";

interface DiagnosticsState {
  status: DiagnosticsStatus;
  passedCount: number;
  failedCount: number;
  totalCount: number;
  lastRunAt: string | null;
  setStatus: (status: DiagnosticsStatus) => void;
  setResults: (passed: number, failed: number, total: number) => void;
  reset: () => void;
}

export const useDiagnosticsStatus = create<DiagnosticsState>()(
  persist(
    (set) => ({
      status: "idle",
      passedCount: 0,
      failedCount: 0,
      totalCount: 0,
      lastRunAt: null,
      setStatus: (status) => set({ status }),
      setResults: (passed, failed, total) => set({
        passedCount: passed,
        failedCount: failed,
        totalCount: total,
        lastRunAt: new Date().toISOString(),
        status: failed === 0 ? "passed" : passed === 0 ? "failed" : "partial",
      }),
      reset: () => set({
        status: "idle",
        passedCount: 0,
        failedCount: 0,
        totalCount: 0,
        lastRunAt: null,
      }),
    }),
    {
      name: 'diagnostics-status',
    }
  )
);
