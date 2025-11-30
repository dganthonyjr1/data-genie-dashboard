import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
      // Continue with email if we can't fetch preferences (default to sending)
    }

    // Determine if we should send email based on preferences
    const shouldSendEmail = preferencesData 
      ? (status === "completed" 
          ? preferencesData.email_on_scheduled_job_complete 
          : preferencesData.email_on_scheduled_job_failure)
      : true; // Default to sending if no preferences found

    if (!shouldSendEmail) {
      console.log("Email notification disabled by user preferences");
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "User preferences" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    const formatScrapeType = (type: string) => {
      return type.split("_").map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(" ");
    };

    // Prepare email content based on status
    const subject = status === "completed" 
      ? `✓ Scraping Job Completed - ${formatScrapeType(scrapeType)}`
      : `✗ Scraping Job Failed - ${formatScrapeType(scrapeType)}`;

    const html = status === "completed"
      ? `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;">
          <h2 style="color: #10b981;">✓ Scraping Job Completed Successfully</h2>
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 8px 0;"><strong>URL:</strong> ${jobUrl}</p>
            <p style="margin: 8px 0;"><strong>Type:</strong> ${formatScrapeType(scrapeType)}</p>
            <p style="margin: 8px 0;"><strong>Results Found:</strong> ${resultsCount || 0} items</p>
          </div>
          <p>Your scheduled scraping job has completed successfully. You can view the results in your dashboard.</p>
          <p style="margin-top: 30px;">
            <a href="${supabaseUrl.replace('supabase.co', 'lovableproject.com')}/results/${jobId}" 
               style="background: linear-gradient(135deg, #ec4899, #06b6d4); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Results
            </a>
          </p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            This is an automated notification from DataGeniePro for your scheduled scraping jobs.
          </p>
        </div>
      `
      : `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;">
          <h2 style="color: #ef4444;">✗ Scraping Job Failed</h2>
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 8px 0;"><strong>URL:</strong> ${jobUrl}</p>
            <p style="margin: 8px 0;"><strong>Type:</strong> ${formatScrapeType(scrapeType)}</p>
            <p style="margin: 8px 0;"><strong>Error:</strong> ${errorMessage || "Unknown error occurred"}</p>
          </div>
          <p>Unfortunately, your scheduled scraping job encountered an error and could not complete.</p>
          <p style="margin-top: 30px;">
            <a href="${supabaseUrl.replace('supabase.co', 'lovableproject.com')}/jobs" 
               style="background: linear-gradient(135deg, #ec4899, #06b6d4); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Job Details
            </a>
          </p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            This is an automated notification from DataGeniePro for your scheduled scraping jobs.
          </p>
        </div>
      `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
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
      throw new Error(`Resend API error: ${errorText}`);
    }

    const emailData = await emailResponse.json();

    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, emailId: emailData.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-job-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
