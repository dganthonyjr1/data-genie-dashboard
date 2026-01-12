import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const MAKE_WEBHOOK_URL = Deno.env.get('MAKE_WEBHOOK_URL');

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Handle GET request for call history
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const limit = parseInt(url.searchParams.get('limit') || '50');
      
      const { data: callRecords, error: fetchError } = await supabase
        .from('call_records')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) {
        console.error('Error fetching call records:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch call records' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, records: callRecords }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST request for triggering a call
    const { facility_name, phone_number, analysis_data } = await req.json();

    if (!facility_name || !phone_number) {
      return new Response(
        JSON.stringify({ error: 'facility_name and phone_number are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Triggering call for: ${facility_name} at ${phone_number} for user ${userId}`);

    // Check TCPA compliance
    const tcpaCheck = checkTCPACompliance(phone_number);
    if (!tcpaCheck.can_call) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'TCPA compliance check failed',
          reason: tcpaCheck.reason 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique call ID
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Simulate call outcome (in production, this would come from the external call provider)
    const callOutcome = simulateCallOutcome();

    // Store call record
    const { data: callRecord, error: insertError } = await supabase
      .from('call_records')
      .insert({
        user_id: userId,
        call_id: callId,
        facility_name,
        phone_number: formatPhoneNumber(phone_number),
        status: callOutcome.status,
        outcome: callOutcome.outcome,
        duration: callOutcome.duration,
        lead_score: analysis_data?.lead_score || null,
        notes: callOutcome.notes,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing call record:', insertError);
    }

    // Forward to Make.com webhook if configured
    if (MAKE_WEBHOOK_URL) {
      try {
        const webhookPayload = {
          call_id: callId,
          facility_name,
          phone_number: formatPhoneNumber(phone_number),
          analysis_data,
          user_id: userId,
          triggered_at: new Date().toISOString(),
        };

        const webhookResponse = await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        });

        if (!webhookResponse.ok) {
          console.error('Make.com webhook failed:', await webhookResponse.text());
        } else {
          console.log('Make.com webhook triggered successfully');
        }
      } catch (webhookError) {
        console.error('Make.com webhook error:', webhookError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        call_id: callId,
        call_record: callRecord,
        tcpa_status: tcpaCheck,
        message: 'Call triggered successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in trigger-call:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Format as E.164 for US numbers
  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  return phone;
}

function checkTCPACompliance(phoneNumber: string): { can_call: boolean; reason?: string } {
  // Validate phone number format
  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length < 10) {
    return { can_call: false, reason: 'Invalid phone number format' };
  }

  // Check business hours (9 AM - 9 PM local time)
  const now = new Date();
  const hour = now.getHours();
  if (hour < 9 || hour >= 21) {
    return { can_call: false, reason: 'Outside business hours (9 AM - 9 PM)' };
  }

  // Check day of week (no Sunday calls)
  const dayOfWeek = now.getDay();
  if (dayOfWeek === 0) {
    return { can_call: false, reason: 'No calls on Sunday' };
  }

  // In production, check against Do Not Call list
  // For now, we simulate this check
  if (isOnDNCList(phoneNumber)) {
    return { can_call: false, reason: 'Number is on Do Not Call list' };
  }

  return { can_call: true };
}

function isOnDNCList(phoneNumber: string): boolean {
  // Placeholder - in production, check against actual DNC database
  return false;
}

function simulateCallOutcome(): { status: string; outcome: string; duration: number; notes: string } {
  const outcomes = [
    { outcome: 'interested', weight: 25, notes: 'Prospect showed interest in services' },
    { outcome: 'not_interested', weight: 20, notes: 'Prospect declined at this time' },
    { outcome: 'no_answer', weight: 25, notes: 'Call went unanswered' },
    { outcome: 'voicemail', weight: 20, notes: 'Left voicemail message' },
    { outcome: 'callback_requested', weight: 10, notes: 'Requested callback at later time' },
  ];

  const totalWeight = outcomes.reduce((sum, o) => sum + o.weight, 0);
  let random = Math.random() * totalWeight;
  
  let selectedOutcome = outcomes[0];
  for (const outcome of outcomes) {
    random -= outcome.weight;
    if (random <= 0) {
      selectedOutcome = outcome;
      break;
    }
  }

  const isCompleted = ['interested', 'not_interested', 'callback_requested'].includes(selectedOutcome.outcome);
  
  return {
    status: isCompleted ? 'completed' : (selectedOutcome.outcome === 'voicemail' ? 'completed' : 'no_answer'),
    outcome: selectedOutcome.outcome,
    duration: isCompleted ? Math.floor(Math.random() * 300) + 60 : (selectedOutcome.outcome === 'voicemail' ? 30 : 0),
    notes: selectedOutcome.notes,
  };
}
