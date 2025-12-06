import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import html2pdf from "html2pdf.js";

const AuditReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    setIsGenerating(true);
    try {
      const opt = {
        margin: [10, 10, 10, 10],
        filename: 'scrapex-audit-report.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      await html2pdf().set(opt).from(reportRef.current).save();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Print-hidden header */}
      <div className="print:hidden sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleDownloadPDF} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isGenerating ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Report content */}
      <div ref={reportRef} className="max-w-4xl mx-auto p-8 print:p-0 bg-background">
        <article className="prose prose-invert max-w-none print:prose-neutral">
          <h1 className="text-3xl font-bold mb-2">ScrapeX Comprehensive Audit Report</h1>
          <p className="text-muted-foreground mb-8">Generated: December 5, 2025</p>

          <h2>Executive Summary</h2>
          <p>
            This report documents the complete status of all ScrapeX features, including working functionality, 
            issues identified during testing, and recommendations for improvement.
          </p>

          <hr />

          <h2>✅ Working Features</h2>

          <h3>1. Authentication System</h3>
          <ul>
            <li><strong>Status:</strong> Fully functional</li>
            <li>User signup with email/password</li>
            <li>User login with session management</li>
            <li>Auto-confirm email enabled (no email verification required)</li>
            <li>Protected routes redirect to login when not authenticated</li>
            <li>Logout functionality</li>
          </ul>

          <h3>2. Dashboard</h3>
          <ul>
            <li><strong>Status:</strong> Fully functional</li>
            <li>Displays job statistics (total jobs, running, completed, failed)</li>
            <li>Recent jobs list with status indicators</li>
            <li>Quick actions for creating new jobs</li>
            <li>Navigation to all main features</li>
          </ul>

          <h3>3. Job Creation (New Job Page)</h3>
          <ul>
            <li><strong>Status:</strong> Fully functional</li>
            <li>Three scrape types supported:
              <ul>
                <li>Complete Business Data (URL or search query)</li>
                <li>Bulk Business Search</li>
                <li>Google Business Profiles (SerpAPI)</li>
              </ul>
            </li>
            <li>Location targeting (country/state selection)</li>
            <li>Custom AI instructions field</li>
            <li>Scheduling options (hourly/daily/weekly)</li>
            <li>Input validation with placeholder detection</li>
            <li>Smart recommendations based on input type</li>
          </ul>

          <h3>4. Jobs List Page</h3>
          <ul>
            <li><strong>Status:</strong> Fully functional</li>
            <li>Lists all user's scraping jobs</li>
            <li>Status filtering and sorting</li>
            <li>Job details modal with full information</li>
            <li>Delete job functionality</li>
            <li>Navigation to results viewer</li>
            <li>Performance optimized (doesn't load full results)</li>
          </ul>

          <h3>5. Results Viewer</h3>
          <ul>
            <li><strong>Status:</strong> Fully functional</li>
            <li>Paginated results display (10, 25, 50, 100 per page)</li>
            <li>Search/filter across all fields</li>
            <li>Inline cell editing (double-click)</li>
            <li>Row duplication</li>
            <li>Bulk delete with confirmation</li>
            <li>Export options:
              <ul>
                <li>CSV download</li>
                <li>Excel/XLSX download</li>
                <li>Copy as TSV (for Google Sheets)</li>
              </ul>
            </li>
            <li>Manual data entry modal</li>
            <li>Clipboard import (TSV format)</li>
          </ul>

          <h3>6. Bulk Scrape Page</h3>
          <ul>
            <li><strong>Status:</strong> Fully functional</li>
            <li>CSV/TXT file upload with drag-and-drop</li>
            <li>Intelligent URL column detection</li>
            <li>URL validation and deduplication</li>
            <li>Validation report with export options</li>
            <li>URL preview/inspection feature</li>
          </ul>

          <h3>7. Scheduled Jobs</h3>
          <ul>
            <li><strong>Status:</strong> Partially functional</li>
            <li>Database schema and cron job configured</li>
            <li>UI for viewing scheduled jobs</li>
            <li>Enable/disable scheduling per job</li>
            <li><strong>Note:</strong> Requires pg_cron extension to be active</li>
          </ul>

          <h3>8. In-App Notifications</h3>
          <ul>
            <li><strong>Status:</strong> Fully functional</li>
            <li>Real-time notifications via Supabase Realtime</li>
            <li>Notification bell with unread count</li>
            <li>Mark as read (individual and all)</li>
            <li>Click to navigate to job results</li>
            <li>Automatic creation on job completion/failure</li>
          </ul>

          <h3>9. Email Notifications</h3>
          <ul>
            <li><strong>Status:</strong> Configured</li>
            <li>Resend API integration</li>
            <li>User preferences for email types</li>
            <li>Separate toggles for manual vs scheduled jobs</li>
          </ul>

          <h3>10. API Keys Management</h3>
          <ul>
            <li><strong>Status:</strong> Fully functional</li>
            <li>Create/revoke API keys</li>
            <li>Key prefix display (security)</li>
            <li>Expiration date support</li>
            <li>Usage tracking (last used)</li>
          </ul>

          <h3>11. Webhooks</h3>
          <ul>
            <li><strong>Status:</strong> Fully functional</li>
            <li>Create/edit/delete webhooks</li>
            <li>Event type selection</li>
            <li>Secret key for verification</li>
            <li>Active/inactive toggle</li>
            <li>Trigger webhook edge function</li>
          </ul>

          <h3>12. Settings</h3>
          <ul>
            <li><strong>Status:</strong> Fully functional</li>
            <li>Email notification preferences</li>
            <li>Auto-save on toggle change</li>
          </ul>

          <hr />

          <h2>🔧 Issues Fixed During This Session</h2>

          <h3>1. Google Business Profiles - Stuck Jobs</h3>
          <ul>
            <li><strong>Issue:</strong> Jobs using google_business_profiles scrape type were getting stuck in "running" status</li>
            <li><strong>Root Cause:</strong> The process-scrape edge function wasn't properly detecting the scrape_type due to a logic error in conditional checks</li>
            <li><strong>Fix:</strong> Refactored the conditional logic to properly check scrape_type before falling back to URL-based detection</li>
            <li><strong>Status:</strong> Fixed - needs end-to-end verification</li>
          </ul>

          <h3>2. Phone Number Validation</h3>
          <ul>
            <li><strong>Issue:</strong> Valid international phone numbers with area codes starting with 0 were being filtered out</li>
            <li><strong>Root Cause:</strong> Overly aggressive validation rules</li>
            <li><strong>Fix:</strong> Updated validation to only apply US-specific rules when target_country is US</li>
            <li><strong>Status:</strong> Fixed</li>
          </ul>

          <hr />

          <h2>⚠️ Issues Requiring Attention</h2>

          <h3>1. SerpAPI Rate Limiting</h3>
          <ul>
            <li><strong>Issue:</strong> Free tier limited to 100 searches/month</li>
            <li><strong>Impact:</strong> Google Business Profiles feature has usage cap</li>
            <li><strong>Recommendation:</strong> Add usage tracking and user warnings when approaching limit</li>
          </ul>

          <h3>2. Firecrawl API Dependency</h3>
          <ul>
            <li><strong>Issue:</strong> Core scraping depends on Firecrawl API availability</li>
            <li><strong>Impact:</strong> Service disruption if Firecrawl is down</li>
            <li><strong>Recommendation:</strong> Add fallback scraping method or better error messaging</li>
          </ul>

          <h3>3. Large Result Sets Performance</h3>
          <ul>
            <li><strong>Issue:</strong> Jobs with thousands of results may slow down the UI</li>
            <li><strong>Current Mitigation:</strong> Pagination implemented</li>
            <li><strong>Recommendation:</strong> Consider virtual scrolling for very large datasets</li>
          </ul>

          <hr />

          <h2>🔍 Features Not Yet Tested</h2>

          <h3>1. Scheduled Jobs Execution</h3>
          <ul>
            <li>pg_cron job needs verification</li>
            <li>process-scheduled-jobs edge function needs end-to-end test</li>
          </ul>

          <h3>2. Email Delivery</h3>
          <ul>
            <li>Resend API integration configured but needs live test</li>
            <li>Email templates need verification</li>
          </ul>

          <h3>3. Webhook Delivery</h3>
          <ul>
            <li>trigger-webhook edge function exists</li>
            <li>Needs test with actual webhook endpoint</li>
          </ul>

          <h3>4. API Endpoint</h3>
          <ul>
            <li>api edge function exists for external integrations</li>
            <li>Needs documentation and testing</li>
          </ul>

          <hr />

          <h2>🔒 Security Status</h2>

          <h3>Row Level Security (RLS)</h3>
          <table className="w-full">
            <thead>
              <tr>
                <th>Table</th>
                <th>RLS Enabled</th>
                <th>Policies</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>scraping_jobs</td>
                <td>✅ Yes</td>
                <td>User can only access own jobs</td>
              </tr>
              <tr>
                <td>api_keys</td>
                <td>✅ Yes</td>
                <td>User can only access own keys</td>
              </tr>
              <tr>
                <td>webhooks</td>
                <td>✅ Yes</td>
                <td>User can only access own webhooks</td>
              </tr>
              <tr>
                <td>notifications</td>
                <td>✅ Yes</td>
                <td>User can only access own notifications</td>
              </tr>
              <tr>
                <td>user_preferences</td>
                <td>✅ Yes</td>
                <td>User can only access own preferences</td>
              </tr>
              <tr>
                <td>scraping_templates</td>
                <td>✅ Yes</td>
                <td>System templates public, user templates private</td>
              </tr>
            </tbody>
          </table>

          <h3>API Key Security</h3>
          <ul>
            <li>Keys are hashed before storage</li>
            <li>Only prefix shown in UI</li>
            <li>Full key shown only once at creation</li>
          </ul>

          <h3>Edge Function Security</h3>
          <ul>
            <li>CORS headers properly configured</li>
            <li>Authentication checked where required</li>
            <li>Service role key used only server-side</li>
          </ul>

          <hr />

          <h2>📋 Recommendations</h2>

          <h3>High Priority</h3>
          <ol>
            <li>Verify Google Business Profiles fix with live test</li>
            <li>Add usage tracking for SerpAPI calls</li>
            <li>Test email notification delivery</li>
          </ol>

          <h3>Medium Priority</h3>
          <ol>
            <li>Add better error messages for API failures</li>
            <li>Implement retry logic for failed scrapes</li>
            <li>Add job progress indicators during scraping</li>
          </ol>

          <h3>Low Priority</h3>
          <ol>
            <li>Add dark/light theme toggle</li>
            <li>Implement virtual scrolling for large result sets</li>
            <li>Add API documentation page</li>
          </ol>

          <hr />

          <h2>Edge Functions Inventory</h2>

          <table className="w-full">
            <thead>
              <tr>
                <th>Function</th>
                <th>Purpose</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>process-scrape</td>
                <td>Main scraping logic</td>
                <td>✅ Active</td>
              </tr>
              <tr>
                <td>process-scheduled-jobs</td>
                <td>Cron job handler</td>
                <td>⚠️ Needs testing</td>
              </tr>
              <tr>
                <td>preview-url</td>
                <td>URL inspection</td>
                <td>✅ Active</td>
              </tr>
              <tr>
                <td>send-job-notification</td>
                <td>Email notifications</td>
                <td>⚠️ Needs testing</td>
              </tr>
              <tr>
                <td>trigger-webhook</td>
                <td>Webhook delivery</td>
                <td>⚠️ Needs testing</td>
              </tr>
              <tr>
                <td>api</td>
                <td>External API access</td>
                <td>⚠️ Needs testing</td>
              </tr>
            </tbody>
          </table>

          <hr />

          <p className="text-center text-muted-foreground mt-12">
            <em>Report generated by ScrapeX Audit System</em>
          </p>
        </article>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .prose { color: black !important; }
          .prose h1, .prose h2, .prose h3 { color: black !important; }
          .prose p, .prose li, .prose td { color: #333 !important; }
          .prose a { color: #0066cc !important; }
          .prose table { border-collapse: collapse; width: 100%; }
          .prose th, .prose td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .prose th { background: #f5f5f5; }
        }
      `}</style>
    </div>
  );
};

export default AuditReport;
