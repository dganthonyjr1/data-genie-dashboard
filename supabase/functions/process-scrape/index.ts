import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Backend API configuration
const BACKEND_API_URL = 'https://scrapex-backend.onrender.com/api/v1';

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

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Validate caller's authorization
    const authHeader = req.headers.get('Authorization');
    let callerUserId: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        callerUserId = user.id;
      }
    }

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

    // Security check
    if (callerUserId && callerUserId !== job.user_id) {
      console.error(`Unauthorized: User ${callerUserId} attempted to process job ${jobId} owned by ${job.user_id}`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: You do not own this job' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Job ${jobId} ownership verified. Caller: ${callerUserId || 'system/scheduled'}, Owner: ${job.user_id}`);

    // Update status to processing
    await supabase
      .from('scraping_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    console.log(`Processing job ${jobId} for URL: ${job.url}, Type: ${job.scrape_type}`);

    // Call YOUR backend instead of Firecrawl
    try {
      // Start scrape job on your backend
      const scrapeResponse = await fetch(`${BACKEND_API_URL}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: job.url,
          business_name: job.business_name || null,
          business_type: job.scrape_type || 'complete_business_data',
        }),
      });

      if (!scrapeResponse.ok) {
        const errorText = await scrapeResponse.text();
        throw new Error(`Backend scrape failed: ${errorText}`);
      }

      const scrapeData = await scrapeResponse.json();
      const backendJobId = scrapeData.job_id;

      console.log(`Backend job started: ${backendJobId}`);

      // Poll backend for completion (max 60 seconds)
      let backendJob = null;
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

        const statusResponse = await fetch(`${BACKEND_API_URL}/jobs/${backendJobId}`);
        if (!statusResponse.ok) {
          throw new Error('Failed to check backend job status');
        }

        backendJob = await statusResponse.json();

        if (backendJob.status === 'completed') {
          console.log(`Backend job ${backendJobId} completed successfully`);
          break;
        }

        if (backendJob.status === 'failed') {
          throw new Error(backendJob.error || 'Backend scraping failed');
        }
      }

      if (!backendJob || backendJob.status !== 'completed') {
        throw new Error('Backend job timeout');
      }

      // Extract result from backend
      const result = backendJob.result;

      // Transform backend result to match Supabase schema
      const transformedResult = {
        business_name: result.business_name || result.facility_name || 'Unknown',
        url: result.url || job.url,
        phone: result.phone || [],
        email: result.email || [],
        address: result.address ? (Array.isArray(result.address) ? result.address[0] : result.address) : null,
        website: result.website || job.url,
        description: result.description || null,
        services: result.services || [],
        social_media: result.social_media || {},
        business_owner_name: result.business_owner_name || null,
        business_owner_title: result.business_owner_title || null,
        key_decision_makers: result.key_decision_makers || [],
        employee_count: result.employee_count || null,
        industries: result.industries || [],
        revenue_opportunities: result.revenue_opportunities || {
          total_opportunities_found: 0,
          estimated_monthly_revenue_loss: 0,
          opportunities: [],
        },
        missing_services: result.missing_services || [],
        technology_gaps: result.technology_gaps || [],
        competitive_weaknesses: result.competitive_weaknesses || [],
        urgency_score: result.urgency_score || 0,
        data_completeness_score: result.data_completeness_score || 0,
        disclaimer: result.disclaimer || 'Contains only publicly available information. Completeness depends on website content.',
        scraped_at: result.scraped_at || new Date().toISOString(),
      };

      // Update Supabase job with results
      await supabase
        .from('scraping_jobs')
        .update({
          status: 'completed',
          results: [transformedResult],
          results_count: 1,
        })
        .eq('id', jobId);

      console.log(`Job ${jobId} completed successfully`);

      return new Response(
        JSON.stringify({
          success: true,
          jobId: jobId,
          results: [transformedResult],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Scraping error:', error);

      await supabase
        .from('scraping_jobs')
        .update({
          status: 'failed',
          results: [{ error: error.message }],
          results_count: 0,
        })
        .eq('id', jobId);

      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error processing job:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
