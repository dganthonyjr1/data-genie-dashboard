import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Lead {
  name?: string;
  business_name?: string;
  phone?: string;
  phone_number?: string;
  email?: string;
  address?: string;
  website?: string;
  category?: string;
  niche?: string;
  rating?: number;
  reviews?: number;
  revenue?: number;
  pain_score?: number;
}

interface LeadResult {
  name: string;
  status: 'success' | 'failed';
  error?: string;
  attempts: number;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function syncLeadWithRetry(
  lead: Lead,
  webhookUrl: string
): Promise<LeadResult> {
  const leadName = lead.name || lead.business_name || 'Unknown';
  
  // Normalize phone number to E.164 format
  let phone = lead.phone || lead.phone_number || '';
  if (phone) {
    phone = phone.replace(/\D/g, '');
    if (phone.length === 10) {
      phone = '+1' + phone;
    } else if (phone.length === 11 && phone.startsWith('1')) {
      phone = '+' + phone;
    } else if (!phone.startsWith('+')) {
      phone = '+' + phone;
    }
  }

  const ghlPayload = {
    first_name: leadName,
    last_name: '',
    name: leadName,
    full_name: leadName,
    company_name: leadName,
    phone: phone,
    email: lead.email || '',
    address1: lead.address || '',
    website: lead.website || '',
    source: 'Lovable Lead Scraper',
    tags: lead.category || lead.niche || '',
    customField: {
      category: lead.category || lead.niche || '',
      rating: lead.rating?.toString() || '',
      reviews: lead.reviews?.toString() || '',
      revenue: lead.revenue?.toString() || '',
      pain_score: lead.pain_score?.toString() || '',
      website: lead.website || ''
    }
  };

  let lastError = '';
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${MAX_RETRIES} for: ${leadName}`);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ghlPayload),
      });

      if (response.ok) {
        console.log(`Successfully synced: ${leadName}`);
        return {
          name: leadName,
          status: 'success',
          attempts: attempt
        };
      }

      // Check for non-retryable errors (4xx except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        const errorText = await response.text();
        console.error(`Non-retryable error for ${leadName}: ${response.status} - ${errorText}`);
        return {
          name: leadName,
          status: 'failed',
          error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`,
          attempts: attempt
        };
      }

      // Retryable error
      lastError = `HTTP ${response.status}: ${await response.text()}`;
      console.warn(`Retryable error for ${leadName}: ${lastError}`);
      
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Network error';
      console.error(`Network error for ${leadName}: ${lastError}`);
    }

    // Exponential backoff before retry
    if (attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`Waiting ${delay}ms before retry...`);
      await sleep(delay);
    }
  }

  // All retries exhausted
  return {
    name: leadName,
    status: 'failed',
    error: lastError.substring(0, 200),
    attempts: MAX_RETRIES
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = Deno.env.get('GHL_WEBHOOK_URL');
    if (!webhookUrl) {
      console.error('GHL_WEBHOOK_URL not configured');
      return new Response(
        JSON.stringify({ error: 'GHL webhook URL not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { leads } = await req.json() as { leads: Lead[] };

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No leads provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Syncing ${leads.length} leads to GHL with retry support`);

    // Process leads concurrently with retry logic
    const results = await Promise.all(
      leads.map(lead => syncLeadWithRetry(lead, webhookUrl))
    );

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    console.log(`Sync complete: ${successCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        message: `Synced ${successCount} of ${leads.length} leads to GoHighLevel`,
        success: successCount,
        failed: failedCount,
        results: results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in sync-to-ghl:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
