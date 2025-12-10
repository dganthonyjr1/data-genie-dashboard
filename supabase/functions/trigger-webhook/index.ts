import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SSRF Protection: Block private IP ranges, localhost, and cloud metadata endpoints
const isBlockedUrl = (urlString: string): { blocked: boolean; reason?: string } => {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    
    // Only allow http and https schemes
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { blocked: true, reason: 'Only HTTP and HTTPS protocols are allowed' };
    }
    
    // Block localhost variations
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return { blocked: true, reason: 'Localhost URLs are not allowed' };
    }
    
    // Block common cloud metadata endpoints
    const metadataPatterns = [
      /^169\.254\.169\.254$/,
      /^metadata\.google\.internal$/i,
      /^metadata\.google$/i,
      /^169\.254\./,
    ];
    
    for (const pattern of metadataPatterns) {
      if (pattern.test(hostname)) {
        return { blocked: true, reason: 'Cloud metadata endpoints are not allowed' };
      }
    }
    
    // Block private IP ranges (RFC 1918)
    const privateIpPatterns = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^0\./,
      /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./,
      /^198\.18\./,
      /^198\.19\./,
    ];
    
    for (const pattern of privateIpPatterns) {
      if (pattern.test(hostname)) {
        return { blocked: true, reason: 'Private IP addresses are not allowed' };
      }
    }
    
    // Block internal service names
    const internalPatterns = [
      /\.internal$/i,
      /\.local$/i,
      /\.svc$/i,
      /\.cluster$/i,
      /^kubernetes/i,
    ];
    
    for (const pattern of internalPatterns) {
      if (pattern.test(hostname)) {
        return { blocked: true, reason: 'Internal service URLs are not allowed' };
      }
    }
    
    return { blocked: false };
  } catch {
    return { blocked: true, reason: 'Invalid URL format' };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { jobId, event, userId } = await req.json();
    
    if (!jobId || !event || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Triggering webhooks for job ${jobId}, event: ${event}`);

    // Fetch job data
    const { data: job, error: jobError } = await supabase
      .from('scraping_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('Job not found:', jobError);
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for job-specific webhook URL
    const webhookUrls: { url: string; secret: string | null; id: string | null }[] = [];
    
    if (job.webhook_url) {
      // Validate job webhook URL for SSRF
      const blockCheck = isBlockedUrl(job.webhook_url);
      if (blockCheck.blocked) {
        console.warn(`Blocked SSRF attempt on job webhook: ${job.webhook_url} - ${blockCheck.reason}`);
      } else {
        webhookUrls.push({ url: job.webhook_url, secret: null, id: null });
      }
    }

    // Fetch user's configured webhooks that match this event
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .contains('events', [event]);

    if (!webhooksError && webhooks) {
      for (const webhook of webhooks) {
        // Validate each webhook URL for SSRF
        const blockCheck = isBlockedUrl(webhook.url);
        if (blockCheck.blocked) {
          console.warn(`Blocked SSRF attempt on webhook ${webhook.id}: ${webhook.url} - ${blockCheck.reason}`);
          continue;
        }
        webhookUrls.push({ 
          url: webhook.url, 
          secret: webhook.secret, 
          id: webhook.id 
        });
      }
    }

    if (webhookUrls.length === 0) {
      console.log('No webhooks configured for this event');
      return new Response(
        JSON.stringify({ success: true, message: 'No webhooks to trigger' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare webhook payload
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      job: {
        id: job.id,
        url: job.url,
        scrape_type: job.scrape_type,
        status: job.status,
        results_count: job.results_count || 0,
        pages_scraped: job.pages_scraped || 0,
        created_at: job.created_at,
        updated_at: job.updated_at,
      },
      results: event === 'job.completed' ? job.results : undefined,
    };

    // Send webhooks
    const results = await Promise.allSettled(
      webhookUrls.map(async ({ url, secret, id }) => {
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Webhook-Event': event,
            'X-Webhook-Timestamp': new Date().toISOString(),
          };

          if (secret) {
            // Create HMAC signature for verification
            const encoder = new TextEncoder();
            const key = await crypto.subtle.importKey(
              'raw',
              encoder.encode(secret),
              { name: 'HMAC', hash: 'SHA-256' },
              false,
              ['sign']
            );
            const signature = await crypto.subtle.sign(
              'HMAC',
              key,
              encoder.encode(JSON.stringify(payload))
            );
            const signatureHex = Array.from(new Uint8Array(signature))
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');
            headers['X-Webhook-Signature'] = `sha256=${signatureHex}`;
          }

          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });

          console.log(`Webhook to ${url}: ${response.status}`);

          // Update last triggered timestamp
          if (id) {
            await supabase
              .from('webhooks')
              .update({ last_triggered_at: new Date().toISOString() })
              .eq('id', id);
          }

          return { url, status: response.status, success: response.ok };
        } catch (error) {
          console.error(`Webhook to ${url} failed:`, error);
          return { url, status: 0, success: false, error: String(error) };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
    
    console.log(`Triggered ${successCount}/${webhookUrls.length} webhooks successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        triggered: webhookUrls.length,
        successful: successCount,
        results: results.map(r => r.status === 'fulfilled' ? r.value : { error: 'failed' })
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook trigger error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
