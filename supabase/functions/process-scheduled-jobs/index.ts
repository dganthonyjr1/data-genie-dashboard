import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    console.log(`Found ${scheduledJobs?.length || 0} jobs to process`);

    const results = [];

    for (const job of scheduledJobs || []) {
      try {
        console.log(`Processing scheduled job: ${job.id}`);

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
            console.error(`Unknown schedule frequency: ${job.schedule_frequency}`);
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
          console.error(`Error creating new job run for ${job.id}:`, createError);
          results.push({ job_id: job.id, success: false, error: createError.message });
          continue;
        }

        console.log(`Created new job run: ${newJob.id}`);

        // Trigger the process-scrape function for the new job
        const { error: invokeError } = await supabaseClient.functions.invoke(
          "process-scrape",
          {
            body: { jobId: newJob.id },
          }
        );

        if (invokeError) {
          console.error(`Error invoking process-scrape for ${newJob.id}:`, invokeError);
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
          console.error(`Error updating scheduled job ${job.id}:`, updateError);
        }

        results.push({
          job_id: job.id,
          new_job_id: newJob.id,
          success: true,
          next_run_at: nextRunAt.toISOString(),
        });
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);
        results.push({
          job_id: job.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.log(`Processed ${results.length} scheduled jobs`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in process-scheduled-jobs:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
