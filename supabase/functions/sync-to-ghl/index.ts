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

    console.log(`Syncing ${leads.length} leads to GHL`);

    const results: { success: number; failed: number; errors: string[] } = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Send each lead to GHL webhook
    for (const lead of leads) {
      try {
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
          // Standard GHL form fields
          first_name: lead.name || lead.business_name || '',
          last_name: '',
          name: lead.name || lead.business_name || '',
          full_name: lead.name || lead.business_name || '',
          company_name: lead.name || lead.business_name || '',
          phone: phone,
          email: lead.email || '',
          address1: lead.address || '',
          website: lead.website || '',
          // Custom fields
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

        console.log(`Sending lead to GHL: ${lead.name || lead.business_name}`);

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(ghlPayload),
        });

        if (response.ok) {
          results.success++;
          console.log(`Successfully synced: ${lead.name || lead.business_name}`);
        } else {
          results.failed++;
          const errorText = await response.text();
          results.errors.push(`${lead.name || lead.business_name}: ${errorText}`);
          console.error(`Failed to sync ${lead.name || lead.business_name}: ${errorText}`);
        }
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${lead.name || lead.business_name}: ${errorMessage}`);
        console.error(`Error syncing ${lead.name || lead.business_name}:`, error);
      }
    }

    console.log(`Sync complete: ${results.success} success, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        message: `Synced ${results.success} of ${leads.length} leads to GoHighLevel`,
        ...results
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
