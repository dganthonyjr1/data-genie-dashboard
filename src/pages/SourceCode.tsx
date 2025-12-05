import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Check, Copy, FileCode, FolderOpen, ChevronRight, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const files: Record<string, string> = {
  "supabase/functions/process-scrape/index.ts": `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    
    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Job ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('scraping_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('Error fetching job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to processing
    await supabase
      .from('scraping_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    console.log(\`Processing job \${jobId} for URL: \${job.url}\`);

    // Scrape the website using Firecrawl
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${FIRECRAWL_API_KEY}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: job.url,
        formats: ['markdown', 'html'],
      }),
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error('Firecrawl error:', errorText);
      
      await supabase
        .from('scraping_jobs')
        .update({ 
          status: 'failed',
          results: [{ error: 'Failed to scrape website', details: errorText }]
        })
        .eq('id', jobId);

      // Send failure notification email
      try {
        await supabase.functions.invoke('send-job-notification', {
          body: {
            userId: job.user_id,
            jobId: jobId,
            jobUrl: job.url,
            scrapeType: job.scrape_type,
            status: 'failed',
            errorMessage: errorText,
          }
        });
        console.log('Failure notification sent');
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
      }

      // Create in-app notification for failure
      try {
        const formatScrapeType = (type: string) => {
          return type.split("_").map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(" ");
        };

        await supabase
          .from('notifications')
          .insert({
            user_id: job.user_id,
            job_id: jobId,
            type: job.schedule_enabled ? 'scheduled_job_failed' : 'job_failed',
            title: \`Scraping Job Failed\`,
            message: \`\${formatScrapeType(job.scrape_type)} failed for \${job.url.substring(0, 50)}...\`
          });
        console.log('In-app failure notification created');
      } catch (notifError) {
        console.error('Failed to create in-app notification:', notifError);
      }

      return new Response(
        JSON.stringify({ error: 'Scraping failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scrapeData = await scrapeResponse.json();
    console.log('Scrape successful, extracting data...');

    // Extract data based on scrape type
    let results: any[] = [];
    const content = scrapeData.data?.markdown || scrapeData.data?.html || '';

    switch (job.scrape_type) {
      case 'emails':
        results = extractEmails(content);
        break;
      case 'phone_numbers':
        results = extractPhoneNumbers(content);
        break;
      case 'text_content':
        results = extractTextContent(content);
        break;
      case 'tables':
        results = extractTables(scrapeData.data?.html || '');
        break;
      case 'custom_ai_extraction':
        results = await extractWithAI(content, job.ai_instructions);
        break;
      default:
        results = [{ content }];
    }

    console.log(\`Extracted \${results.length} results\`);

    // Save results to database
    const { error: updateError } = await supabase
      .from('scraping_jobs')
      .update({ 
        status: 'completed',
        results: results
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Error updating job:', updateError);
      throw updateError;
    }

    // Send success notification email
    try {
      await supabase.functions.invoke('send-job-notification', {
        body: {
          userId: job.user_id,
          jobId: jobId,
          jobUrl: job.url,
          scrapeType: job.scrape_type,
          status: 'completed',
          resultsCount: results.length,
        }
      });
      console.log('Success notification sent');
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
    }

    // Create in-app notification
    try {
      const formatScrapeType = (type: string) => {
        return type.split("_").map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(" ");
      };

      await supabase
        .from('notifications')
        .insert({
          user_id: job.user_id,
          job_id: jobId,
          type: job.schedule_enabled ? 'scheduled_job_complete' : 'job_complete',
          title: \`Scraping Job Completed\`,
          message: \`\${formatScrapeType(job.scrape_type)} completed with \${results.length} results from \${job.url.substring(0, 50)}...\`
        });
      console.log('In-app notification created');
    } catch (notifError) {
      console.error('Failed to create in-app notification:', notifError);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-scrape:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractEmails(content: string): any[] {
  const emailRegex = /\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b/g;
  const emails = content.match(emailRegex) || [];
  const uniqueEmails = [...new Set(emails)];
  return uniqueEmails.map(email => ({ email }));
}

function extractPhoneNumbers(content: string): any[] {
  const phoneRegex = /(\\+?\\d{1,3}[-.\\s]?)?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}/g;
  const phones = content.match(phoneRegex) || [];
  const uniquePhones = [...new Set(phones)];
  return uniquePhones.map(phone => ({ phone_number: phone.trim() }));
}

function extractTextContent(content: string): any[] {
  const paragraphs = content
    .split('\\n\\n')
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  return paragraphs.map((text, index) => ({ 
    paragraph: index + 1,
    text: text.substring(0, 500)
  }));
}

function extractTables(html: string): any[] {
  const tableRegex = /<table[^>]*>([\\s\\S]*?)<\\/table>/gi;
  const tables = html.match(tableRegex) || [];
  
  if (tables.length === 0) {
    return [{ message: 'No tables found on this page' }];
  }

  return tables.map((table, index) => {
    const rowRegex = /<tr[^>]*>([\\s\\S]*?)<\\/tr>/gi;
    const rows = [...table.matchAll(rowRegex)];
    
    return {
      table_number: index + 1,
      row_count: rows.length,
      preview: table.substring(0, 200).replace(/<[^>]*>/g, ' ').trim()
    };
  });
}

async function extractWithAI(content: string, instructions: string | null): Promise<any[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured');
    return [{ error: 'AI extraction is not configured. Please contact support.' }];
  }

  try {
    const systemPrompt = \`You are a business information extraction assistant...\`;
    const userPrompt = instructions 
      ? \`\${instructions}\\n\\nWebpage content:\\n\${content.substring(0, 50000)}\`
      : \`Extract business information from this webpage content:\\n\${content.substring(0, 50000)}\`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${LOVABLE_API_KEY}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [/* tool definition */],
        tool_choice: { type: 'function', function: { name: 'extract_business_info' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      return [{ error: 'AI extraction failed. Please try again.' }];
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall && toolCall.function.name === 'extract_business_info') {
      const extractedData = JSON.parse(toolCall.function.arguments);
      return [extractedData];
    }

    return [{ error: 'AI extraction did not return structured data' }];
  } catch (error) {
    console.error('Error in extractWithAI:', error);
    return [{ error: 'AI extraction failed', details: error instanceof Error ? error.message : 'Unknown error' }];
  }
}`,
  "supabase/functions/preview-url/index.ts": `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(\`Fetching preview for URL: \${url}\`);

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: \`Failed to fetch URL: \${response.status} \${response.statusText}\` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    
    // Extract basic information
    const titleMatch = html.match(/<title[^>]*>(.*?)<\\/title>/is);
    const title = titleMatch ? titleMatch[1].trim() : 'No title found';

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    // Extract text content
    let textContent = html
      .replace(/<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>/gi, '')
      .replace(/<style\\b[^<]*(?:(?!<\\/style>)<[^<]*)*<\\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\\s+/g, ' ')
      .trim();

    const previewLength = 3000;
    if (textContent.length > previewLength) {
      textContent = textContent.substring(0, previewLength) + '...';
    }

    // Extract OG image
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
    const ogImage = ogImageMatch ? ogImageMatch[1] : null;

    const preview = {
      url,
      title,
      description,
      textContent,
      ogImage,
      contentLength: html.length,
      previewGenerated: new Date().toISOString(),
    };

    console.log(\`Preview generated successfully for \${url}\`);

    return new Response(
      JSON.stringify(preview),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in preview-url:', error);
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      return new Response(
        JSON.stringify({ error: 'Request timeout - URL took too long to respond' }),
        { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch URL preview' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});`,
  "supabase/functions/process-scheduled-jobs/index.ts": `import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Checking for scheduled jobs to run...");

    // Find all jobs that are scheduled and due to run
    const { data: scheduledJobs, error: fetchError } = await supabaseClient
      .from("scraping_jobs")
      .select("*")
      .eq("schedule_enabled", true)
      .lte("next_run_at", new Date().toISOString())
      .order("next_run_at", { ascending: true });

    if (fetchError) {
      console.error("Error fetching scheduled jobs:", fetchError);
      throw fetchError;
    }

    console.log(\`Found \${scheduledJobs?.length || 0} jobs to process\`);

    const results = [];

    for (const job of scheduledJobs || []) {
      try {
        console.log(\`Processing scheduled job: \${job.id}\`);

        // Calculate next run time based on frequency and interval
        const now = new Date();
        let nextRunAt = new Date(now);

        switch (job.schedule_frequency) {
          case "hourly":
            nextRunAt.setHours(nextRunAt.getHours() + (job.schedule_interval || 1));
            break;
          case "daily":
            nextRunAt.setDate(nextRunAt.getDate() + (job.schedule_interval || 1));
            break;
          case "weekly":
            nextRunAt.setDate(nextRunAt.getDate() + ((job.schedule_interval || 1) * 7));
            break;
          default:
            console.error(\`Unknown schedule frequency: \${job.schedule_frequency}\`);
            continue;
        }

        // Create a new job run with the same configuration
        const { data: newJob, error: createError } = await supabaseClient
          .from("scraping_jobs")
          .insert({
            user_id: job.user_id,
            url: job.url,
            scrape_type: job.scrape_type,
            ai_instructions: job.ai_instructions,
            status: "pending",
            results: [],
          })
          .select()
          .single();

        if (createError) {
          console.error(\`Error creating new job run for \${job.id}:\`, createError);
          results.push({ job_id: job.id, success: false, error: createError.message });
          continue;
        }

        console.log(\`Created new job run: \${newJob.id}\`);

        // Trigger the process-scrape function for the new job
        const { error: invokeError } = await supabaseClient.functions.invoke(
          "process-scrape",
          { body: { jobId: newJob.id } }
        );

        if (invokeError) {
          console.error(\`Error invoking process-scrape for \${newJob.id}:\`, invokeError);
        }

        // Update the original scheduled job with next run time and last run time
        const { error: updateError } = await supabaseClient
          .from("scraping_jobs")
          .update({
            next_run_at: nextRunAt.toISOString(),
            last_run_at: now.toISOString(),
          })
          .eq("id", job.id);

        if (updateError) {
          console.error(\`Error updating scheduled job \${job.id}:\`, updateError);
        }

        results.push({
          job_id: job.id,
          new_job_id: newJob.id,
          success: true,
          next_run_at: nextRunAt.toISOString(),
        });
      } catch (error) {
        console.error(\`Error processing job \${job.id}:\`, error);
        results.push({
          job_id: job.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.log(\`Processed \${results.length} scheduled jobs\`);

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-scheduled-jobs:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});`,
  "supabase/functions/send-job-notification/index.ts": `import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  userId: string;
  jobId: string;
  jobUrl: string;
  scrapeType: string;
  status: "completed" | "failed";
  resultsCount?: number;
  errorMessage?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, jobId, jobUrl, scrapeType, status, resultsCount, errorMessage }: NotificationRequest = await req.json();

    console.log("Sending notification for job:", jobId, "with status:", status);

    // Initialize Supabase client to get user's email
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's email from auth
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !userData?.user?.email) {
      console.error("Error getting user email:", userError);
      throw new Error("Could not retrieve user email");
    }

    const userEmail = userData.user.email;
    
    // Check user notification preferences
    const { data: preferencesData, error: preferencesError } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (preferencesError) {
      console.error("Error fetching preferences:", preferencesError);
    }

    // Determine if we should send email based on preferences
    const shouldSendEmail = preferencesData 
      ? (status === "completed" 
          ? preferencesData.email_on_scheduled_job_complete 
          : preferencesData.email_on_scheduled_job_failure)
      : true;

    if (!shouldSendEmail) {
      console.log("Email notification disabled by user preferences");
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "User preferences" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const formatScrapeType = (type: string) => {
      return type.split("_").map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(" ");
    };

    const subject = status === "completed" 
      ? \`✓ Scraping Job Completed - \${formatScrapeType(scrapeType)}\`
      : \`✗ Scraping Job Failed - \${formatScrapeType(scrapeType)}\`;

    const html = status === "completed"
      ? \`<div style="font-family: sans-serif;">
          <h2 style="color: #10b981;">✓ Scraping Job Completed Successfully</h2>
          <p><strong>URL:</strong> \${jobUrl}</p>
          <p><strong>Type:</strong> \${formatScrapeType(scrapeType)}</p>
          <p><strong>Results Found:</strong> \${resultsCount || 0} items</p>
        </div>\`
      : \`<div style="font-family: sans-serif;">
          <h2 style="color: #ef4444;">✗ Scraping Job Failed</h2>
          <p><strong>URL:</strong> \${jobUrl}</p>
          <p><strong>Type:</strong> \${formatScrapeType(scrapeType)}</p>
          <p><strong>Error:</strong> \${errorMessage || "Unknown error occurred"}</p>
        </div>\`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": \`Bearer \${RESEND_API_KEY}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "DataGeniePro <onboarding@resend.dev>",
        to: [userEmail],
        subject: subject,
        html: html,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(\`Resend API error: \${errorText}\`);
    }

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, emailId: emailData.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-job-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);`,
};

interface FileTreeItem {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileTreeItem[];
}

function buildFileTree(filePaths: string[]): FileTreeItem[] {
  const root: FileTreeItem[] = [];

  filePaths.forEach((path) => {
    const parts = path.split("/");
    let currentLevel = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const existingItem = currentLevel.find((item) => item.name === part);

      if (existingItem) {
        if (!isFile && existingItem.children) {
          currentLevel = existingItem.children;
        }
      } else {
        const newItem: FileTreeItem = {
          name: part,
          path: parts.slice(0, index + 1).join("/"),
          type: isFile ? "file" : "folder",
          children: isFile ? undefined : [],
        };
        currentLevel.push(newItem);
        if (!isFile && newItem.children) {
          currentLevel = newItem.children;
        }
      }
    });
  });

  return root;
}

function FileTreeNode({
  item,
  selectedFile,
  onSelectFile,
  depth = 0,
}: {
  item: FileTreeItem;
  selectedFile: string;
  onSelectFile: (path: string) => void;
  depth?: number;
}) {
  const [isOpen, setIsOpen] = useState(true);

  if (item.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-1 w-full px-2 py-1.5 text-left text-sm hover:bg-muted/50 rounded transition-colors",
            "text-muted-foreground"
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isOpen ? (
            <ChevronDown className="h-3 w-3 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0" />
          )}
          <FolderOpen className="h-4 w-4 text-cyan-400 shrink-0" />
          <span className="truncate">{item.name}</span>
        </button>
        {isOpen && item.children && (
          <div>
            {item.children.map((child) => (
              <FileTreeNode
                key={child.path}
                item={child}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelectFile(item.path)}
      className={cn(
        "flex items-center gap-2 w-full px-2 py-1.5 text-left text-sm rounded transition-colors",
        selectedFile === item.path
          ? "bg-primary/20 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted/50"
      )}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <FileCode className="h-4 w-4 text-pink-400 shrink-0" />
      <span className="truncate">{item.name}</span>
    </button>
  );
}

const SourceCode = () => {
  const [selectedFile, setSelectedFile] = useState(Object.keys(files)[0]);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const fileTree = buildFileTree(Object.keys(files));
  const currentCode = files[selectedFile] || "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Source code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-64px)]">
        {/* File Tree Sidebar */}
        <div className="w-72 border-r border-border bg-card/30 flex flex-col shrink-0">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-cyan-400" />
              Backend Code
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Edge Functions</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              {fileTree.map((item) => (
                <FileTreeNode
                  key={item.path}
                  item={item}
                  selectedFile={selectedFile}
                  onSelectFile={setSelectedFile}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Code View */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between p-4 border-b border-border bg-card/30 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <FileCode className="h-5 w-5 text-pink-400 shrink-0" />
              <span className="font-mono text-sm text-foreground truncate">{selectedFile}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <pre className="p-4 text-xs font-mono whitespace-pre-wrap text-foreground/90 leading-relaxed">
              {currentCode}
            </pre>
          </ScrollArea>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SourceCode;
