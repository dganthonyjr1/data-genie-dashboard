import * as React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import Index from "./pages/Index";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import NewJob from "./pages/NewJob";
import Jobs from "./pages/Jobs";
import ScheduledJobs from "./pages/ScheduledJobs";
import Results from "./pages/Results";
import ResultsViewer from "./pages/ResultsViewer";
import Settings from "./pages/Settings";
import BulkScrape from "./pages/BulkScrape";
import SourceCode from "./pages/SourceCode";
import ApiSettings from "./pages/ApiSettings";
import WebhooksSettings from "./pages/WebhooksSettings";
import ApiDocs from "./pages/ApiDocs";
import AuditReport from "./pages/AuditReport";
import Leads from "./pages/Leads";
import CallAttempts from "./pages/CallAttempts";
import PaymentSuccess from "./pages/PaymentSuccess";
import Billing from "./pages/Billing";
import PaymentSettings from "./pages/PaymentSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DemoModeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/new-job" element={<NewJob />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/scheduled-jobs" element={<ScheduledJobs />} />
            <Route path="/results" element={<Results />} />
            <Route path="/results/:id" element={<ResultsViewer />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/api" element={<ApiSettings />} />
            <Route path="/settings/webhooks" element={<WebhooksSettings />} />
            <Route path="/api-docs" element={<ApiDocs />} />
            <Route path="/bulk-scrape" element={<BulkScrape />} />
            <Route path="/source-code" element={<SourceCode />} />
            <Route path="/audit-report" element={<AuditReport />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/call-attempts" element={<CallAttempts />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/settings/payments" element={<PaymentSettings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </DemoModeProvider>
  </QueryClientProvider>
);

export default App;
