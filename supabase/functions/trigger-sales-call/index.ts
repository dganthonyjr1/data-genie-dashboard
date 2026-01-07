import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
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

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const token = authHeader.replace('Bearer ', '');
    
    // Use service role client to validate the user's JWT
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate the JWT token by getting the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log(`Trigger sales call for user: ${userId}`);

    // Get the Make.com webhook URL from secrets
    const MAKE_WEBHOOK_URL = Deno.env.get('MAKE_WEBHOOK_URL');
    if (!MAKE_WEBHOOK_URL) {
      console.error('MAKE_WEBHOOK_URL not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the payload
    const payload = await req.json();
    const { business_name, phone_number, pain_score, evidence_summary, niche, monthly_revenue, revenue_leak } = payload;

    if (!business_name || !phone_number) {
      return new Response(
        JSON.stringify({ error: 'business_name and phone_number are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Triggering call for: ${business_name} at ${phone_number}`);

    // Forward to Make.com webhook
    const webhookPayload = {
      business_name,
      phone_number,
      pain_score: pain_score || 0,
      evidence_summary: evidence_summary || 'No audit data available',
      niche: niche || 'Unknown',
      monthly_revenue: monthly_revenue || 0,
      revenue_leak: revenue_leak || 0,
      user_id: userId,
      triggered_at: new Date().toISOString(),
    };

    const webhookResponse = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error(`Make.com webhook failed: ${webhookResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: 'Failed to trigger call', details: errorText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sales call triggered successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Sales call triggered' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in trigger-sales-call:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
