import * as React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/new-job" element={<NewJob />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/scheduled-jobs" element={<ScheduledJobs />} />
          <Route path="/results" element={<Results />} />
          <Route path="/results/:id" element={<ResultsViewer />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/bulk-scrape" element={<BulkScrape />} />
          <Route path="/source-code" element={<SourceCode />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
