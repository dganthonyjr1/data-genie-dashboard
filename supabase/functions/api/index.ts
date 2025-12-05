import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Extract API key from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = authHeader.replace('Bearer ', '');
    
    // Validate API key format
    if (!apiKey.startsWith('sx_')) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash the API key and look it up
    const keyHash = await hashKey(apiKey);
    const { data: apiKeyRecord, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id, is_active')
      .eq('key_hash', keyHash)
      .single();

    if (keyError || !apiKeyRecord) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!apiKeyRecord.is_active) {
      return new Response(
        JSON.stringify({ error: 'API key is inactive' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyRecord.id);

    const url = new URL(req.url);
    const path = url.pathname.replace('/api', '').replace('/functions/v1/api', '');
    
    console.log(`API request: ${req.method} ${path} from user ${apiKeyRecord.user_id}`);

    // Route: POST /jobs - Create a scraping job
    if (req.method === 'POST' && (path === '/jobs' || path === '')) {
      const body = await req.json();
      
      const { url: targetUrl, scrape_type, ai_instructions, auto_paginate, max_pages, target_country, target_state, search_limit, webhook_url } = body;

      if (!targetUrl) {
        return new Response(
          JSON.stringify({ error: 'URL is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const validScrapeTypes = ['complete_business_data', 'bulk_business_search', 'google_business_profiles', 'emails', 'phone_numbers', 'text_content', 'tables', 'custom_ai_extraction'];
      const finalScrapeType = scrape_type && validScrapeTypes.includes(scrape_type) ? scrape_type : 'complete_business_data';

      // Create the job
      const { data: job, error: createError } = await supabase
        .from('scraping_jobs')
        .insert({
          url: targetUrl,
          scrape_type: finalScrapeType,
          ai_instructions: ai_instructions || null,
          user_id: apiKeyRecord.user_id,
          api_key_id: apiKeyRecord.id,
          status: 'pending',
          auto_paginate: auto_paginate || false,
          max_pages: max_pages || 10,
          target_country: target_country || null,
          target_state: target_state || null,
          search_limit: search_limit || 20,
          webhook_url: webhook_url || null,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating job:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create job' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Trigger the scraping process
      const { error: invokeError } = await supabase.functions.invoke('process-scrape', {
        body: { jobId: job.id }
      });

      if (invokeError) {
        console.error('Error triggering scrape:', invokeError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          job: {
            id: job.id,
            url: job.url,
            scrape_type: job.scrape_type,
            status: job.status,
            created_at: job.created_at,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: GET /jobs - List jobs
    if (req.method === 'GET' && (path === '/jobs' || path === '')) {
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const status = url.searchParams.get('status');

      let query = supabase
        .from('scraping_jobs')
        .select('id, url, scrape_type, status, created_at, updated_at, results_count')
        .eq('user_id', apiKeyRecord.user_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data: jobs, error: listError } = await query;

      if (listError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch jobs' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, jobs, limit, offset }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: GET /jobs/:id - Get job details
    const jobMatch = path.match(/^\/jobs\/([a-f0-9-]+)$/);
    if (req.method === 'GET' && jobMatch) {
      const jobId = jobMatch[1];
      
      const { data: job, error: fetchError } = await supabase
        .from('scraping_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', apiKeyRecord.user_id)
        .single();

      if (fetchError || !job) {
        return new Response(
          JSON.stringify({ error: 'Job not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, job }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found', path }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
