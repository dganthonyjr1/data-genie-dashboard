import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Two-party consent states
const TWO_PARTY_CONSENT_STATES = ['CA', 'CT', 'FL', 'IL', 'MD', 'MA', 'MI', 'MT', 'NV', 'NH', 'PA', 'WA'];

// Area code to state mapping
const AREA_CODE_TO_STATE: Record<string, string> = {
  '205': 'AL', '251': 'AL', '256': 'AL', '334': 'AL', '907': 'AK',
  '480': 'AZ', '520': 'AZ', '602': 'AZ', '623': 'AZ', '928': 'AZ',
  '479': 'AR', '501': 'AR', '870': 'AR',
  '209': 'CA', '213': 'CA', '310': 'CA', '323': 'CA', '408': 'CA', '415': 'CA',
  '424': 'CA', '442': 'CA', '510': 'CA', '530': 'CA', '559': 'CA', '562': 'CA',
  '619': 'CA', '626': 'CA', '650': 'CA', '657': 'CA', '661': 'CA', '669': 'CA',
  '707': 'CA', '714': 'CA', '760': 'CA', '805': 'CA', '818': 'CA', '831': 'CA',
  '858': 'CA', '909': 'CA', '916': 'CA', '925': 'CA', '949': 'CA', '951': 'CA',
  '303': 'CO', '719': 'CO', '720': 'CO', '970': 'CO',
  '203': 'CT', '475': 'CT', '860': 'CT', '302': 'DE',
  '239': 'FL', '305': 'FL', '321': 'FL', '352': 'FL', '386': 'FL', '407': 'FL',
  '561': 'FL', '727': 'FL', '754': 'FL', '772': 'FL', '786': 'FL', '813': 'FL',
  '850': 'FL', '863': 'FL', '904': 'FL', '941': 'FL', '954': 'FL',
  '229': 'GA', '404': 'GA', '470': 'GA', '478': 'GA', '678': 'GA', '706': 'GA', '770': 'GA', '912': 'GA',
  '808': 'HI', '208': 'ID',
  '217': 'IL', '224': 'IL', '309': 'IL', '312': 'IL', '331': 'IL', '618': 'IL',
  '630': 'IL', '708': 'IL', '773': 'IL', '779': 'IL', '815': 'IL', '847': 'IL',
  '219': 'IN', '260': 'IN', '317': 'IN', '574': 'IN', '765': 'IN', '812': 'IN',
  '319': 'IA', '515': 'IA', '563': 'IA', '641': 'IA', '712': 'IA',
  '316': 'KS', '620': 'KS', '785': 'KS', '913': 'KS',
  '270': 'KY', '502': 'KY', '606': 'KY', '859': 'KY',
  '225': 'LA', '318': 'LA', '337': 'LA', '504': 'LA', '985': 'LA',
  '207': 'ME', '240': 'MD', '301': 'MD', '410': 'MD', '443': 'MD',
  '339': 'MA', '351': 'MA', '413': 'MA', '508': 'MA', '617': 'MA', '774': 'MA', '781': 'MA', '857': 'MA', '978': 'MA',
  '231': 'MI', '248': 'MI', '269': 'MI', '313': 'MI', '517': 'MI', '586': 'MI', '616': 'MI', '734': 'MI', '810': 'MI', '906': 'MI', '989': 'MI',
  '218': 'MN', '320': 'MN', '507': 'MN', '612': 'MN', '651': 'MN', '763': 'MN', '952': 'MN',
  '228': 'MS', '601': 'MS', '662': 'MS',
  '314': 'MO', '417': 'MO', '573': 'MO', '636': 'MO', '660': 'MO', '816': 'MO',
  '406': 'MT', '308': 'NE', '402': 'NE',
  '702': 'NV', '775': 'NV', '603': 'NH',
  '201': 'NJ', '551': 'NJ', '609': 'NJ', '732': 'NJ', '848': 'NJ', '856': 'NJ', '862': 'NJ', '908': 'NJ', '973': 'NJ',
  '505': 'NM', '575': 'NM',
  '212': 'NY', '315': 'NY', '347': 'NY', '516': 'NY', '518': 'NY', '585': 'NY', '607': 'NY', '631': 'NY', '646': 'NY', '716': 'NY', '718': 'NY', '845': 'NY', '914': 'NY', '917': 'NY', '929': 'NY',
  '252': 'NC', '336': 'NC', '704': 'NC', '828': 'NC', '910': 'NC', '919': 'NC', '980': 'NC',
  '701': 'ND',
  '216': 'OH', '234': 'OH', '330': 'OH', '419': 'OH', '440': 'OH', '513': 'OH', '567': 'OH', '614': 'OH', '740': 'OH', '937': 'OH',
  '405': 'OK', '539': 'OK', '580': 'OK', '918': 'OK',
  '458': 'OR', '503': 'OR', '541': 'OR', '971': 'OR',
  '215': 'PA', '267': 'PA', '412': 'PA', '484': 'PA', '570': 'PA', '610': 'PA', '717': 'PA', '724': 'PA', '814': 'PA', '878': 'PA',
  '401': 'RI',
  '803': 'SC', '843': 'SC', '864': 'SC',
  '605': 'SD',
  '423': 'TN', '615': 'TN', '731': 'TN', '865': 'TN', '901': 'TN', '931': 'TN',
  '210': 'TX', '214': 'TX', '254': 'TX', '281': 'TX', '325': 'TX', '361': 'TX', '409': 'TX', '432': 'TX', '469': 'TX', '512': 'TX', '682': 'TX', '713': 'TX', '806': 'TX', '817': 'TX', '830': 'TX', '832': 'TX', '903': 'TX', '915': 'TX', '936': 'TX', '940': 'TX', '956': 'TX', '972': 'TX', '979': 'TX',
  '385': 'UT', '435': 'UT', '801': 'UT',
  '802': 'VT',
  '276': 'VA', '434': 'VA', '540': 'VA', '571': 'VA', '703': 'VA', '757': 'VA', '804': 'VA',
  '206': 'WA', '253': 'WA', '360': 'WA', '425': 'WA', '509': 'WA',
  '304': 'WV', '681': 'WV',
  '262': 'WI', '414': 'WI', '608': 'WI', '715': 'WI', '920': 'WI',
  '307': 'WY', '202': 'DC',
};

// State to timezone mapping
const STATE_TO_TIMEZONE: Record<string, string> = {
  'CT': 'America/New_York', 'DE': 'America/New_York', 'FL': 'America/New_York',
  'GA': 'America/New_York', 'IN': 'America/Indiana/Indianapolis', 'KY': 'America/New_York',
  'ME': 'America/New_York', 'MD': 'America/New_York', 'MA': 'America/New_York',
  'MI': 'America/Detroit', 'NH': 'America/New_York', 'NJ': 'America/New_York',
  'NY': 'America/New_York', 'NC': 'America/New_York', 'OH': 'America/New_York',
  'PA': 'America/New_York', 'RI': 'America/New_York', 'SC': 'America/New_York',
  'VT': 'America/New_York', 'VA': 'America/New_York', 'WV': 'America/New_York',
  'DC': 'America/New_York',
  'AL': 'America/Chicago', 'AR': 'America/Chicago', 'IL': 'America/Chicago',
  'IA': 'America/Chicago', 'KS': 'America/Chicago', 'LA': 'America/Chicago',
  'MN': 'America/Chicago', 'MS': 'America/Chicago', 'MO': 'America/Chicago',
  'NE': 'America/Chicago', 'ND': 'America/Chicago', 'OK': 'America/Chicago',
  'SD': 'America/Chicago', 'TN': 'America/Chicago', 'TX': 'America/Chicago',
  'WI': 'America/Chicago',
  'AZ': 'America/Phoenix', 'CO': 'America/Denver', 'ID': 'America/Denver',
  'MT': 'America/Denver', 'NM': 'America/Denver', 'UT': 'America/Denver',
  'WY': 'America/Denver', 'NV': 'America/Los_Angeles',
  'CA': 'America/Los_Angeles', 'OR': 'America/Los_Angeles', 'WA': 'America/Los_Angeles',
  'AK': 'America/Anchorage', 'HI': 'Pacific/Honolulu',
};

function getStateFromPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  let areaCode: string;
  if (digits.length === 11 && digits.startsWith('1')) {
    areaCode = digits.substring(1, 4);
  } else if (digits.length === 10) {
    areaCode = digits.substring(0, 3);
  } else {
    return null;
  }
  return AREA_CODE_TO_STATE[areaCode] || null;
}

function getTimezoneFromState(state: string): string {
  return STATE_TO_TIMEZONE[state] || 'America/New_York';
}

function isTwoPartyConsentState(state: string): boolean {
  return TWO_PARTY_CONSENT_STATES.includes(state);
}

function isWithinBusinessHours(timezone: string): { isValid: boolean; localHour: number } {
  try {
    const now = new Date();
    const localTimeStr = now.toLocaleString('en-US', { timeZone: timezone, hour: '2-digit', hour12: false });
    const localHour = parseInt(localTimeStr.split(':')[0] || localTimeStr, 10);
    return { isValid: localHour >= 8 && localHour < 21, localHour };
  } catch {
    return { isValid: true, localHour: 12 };
  }
}

function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return phone;
}

// Generate consent prompt based on state
function getConsentPrompt(state: string | null, facilityName: string): string {
  const isTwoParty = state ? isTwoPartyConsentState(state) : false;
  
  const basePrompt = `You are a professional sales representative for ScrapeX Healthcare Solutions. Your goal is to help healthcare facilities improve patient engagement and operational efficiency.

CRITICAL COMPLIANCE RULES:
1. You MUST start every call by clearly identifying yourself and your company
2. You MUST inform the recipient that the call may be recorded
3. ${isTwoParty ? 'This is a TWO-PARTY CONSENT state. You MUST obtain explicit verbal consent before continuing. If they do not consent, politely end the call.' : 'This is a one-party consent state, but still request acknowledgment of the recording notice.'}
4. If the recipient asks to be removed from the call list, immediately note this and end the call politely

CALL SCRIPT:
1. Introduction: "Hello, this is Alex from ScrapeX Healthcare Solutions calling for ${facilityName}. Before we continue, I need to let you know that this call may be recorded for quality assurance and training purposes. ${isTwoParty ? 'Do you consent to this recording?' : 'Is that okay with you?'}"

2. ${isTwoParty ? 'If they say NO to recording consent: "I understand completely. Thank you for your time. Have a great day." Then END the call.' : 'If they object, note it but you may continue the conversation.'}

3. If they consent or don't object: "Thank you. Are you currently looking to improve patient outreach, appointment scheduling, or administrative efficiency?"

4. Based on their response, present specific solutions. Focus on concrete benefits.

5. If they show interest, offer to schedule a follow-up with a specialist.

6. If they ask to be removed from the call list, say: "Absolutely, I will remove you from our list immediately. I apologize for any inconvenience. Have a great day." Then END the call.

Keep the call professional, concise, and compliant with all regulations.`;

  return basePrompt;
}

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
    const RETELL_API_KEY = Deno.env.get('RETELL_API_KEY');
    const RETELL_FROM_NUMBER = Deno.env.get('RETELL_FROM_NUMBER');
    const MAKE_WEBHOOK_URL = Deno.env.get('MAKE_WEBHOOK_URL');

    if (!RETELL_API_KEY) {
      console.error('RETELL_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Retell API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
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
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) {
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
    const { facility_name, phone_number, analysis_data, override_business_hours } = await req.json();

    if (!facility_name || !phone_number) {
      return new Response(
        JSON.stringify({ error: 'facility_name and phone_number are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formattedPhone = formatPhoneNumber(phone_number);
    console.log(`Triggering compliant call for: ${facility_name} at ${formattedPhone}`);

    // 1. Check DNC list
    const { data: dncCheck } = await supabase.rpc('is_on_dnc_list', {
      p_user_id: userId,
      p_phone_number: formattedPhone
    });

    if (dncCheck) {
      // Log the blocked call
      await supabase.rpc('log_compliance_action', {
        p_user_id: userId,
        p_action: 'call_blocked_dnc',
        p_category: 'dnc',
        p_details: { phone_number: formattedPhone, facility_name },
        p_result: 'blocked'
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Number is on Do Not Call list',
          compliance: { dnc_blocked: true }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Detect state and timezone
    const state = getStateFromPhone(formattedPhone);
    const timezone = state ? getTimezoneFromState(state) : 'America/New_York';
    const isTwoParty = state ? isTwoPartyConsentState(state) : false;

    // 3. Check business hours
    const businessHours = isWithinBusinessHours(timezone);
    if (!businessHours.isValid && !override_business_hours) {
      // Log the compliance check
      await supabase.rpc('log_compliance_action', {
        p_user_id: userId,
        p_action: 'call_blocked_hours',
        p_category: 'business_hours',
        p_details: { phone_number: formattedPhone, local_hour: businessHours.localHour, timezone, state },
        p_result: 'blocked'
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Outside business hours in recipient timezone (${timezone}). Current local hour: ${businessHours.localHour}`,
          requires_override: true,
          compliance: {
            state,
            timezone,
            local_hour: businessHours.localHour,
            business_hours_valid: false
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Check legal agreement acceptance
    const { data: hasAgreement } = await supabase.rpc('has_accepted_agreement', {
      p_user_id: userId,
      p_agreement_type: 'tcpa_certification'
    });

    if (!hasAgreement) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'TCPA Certification required before making calls',
          requires_agreement: true
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log DNC check
    await supabase.rpc('log_compliance_action', {
      p_user_id: userId,
      p_action: 'dnc_check_passed',
      p_category: 'dnc',
      p_details: { phone_number: formattedPhone, facility_name },
      p_result: 'passed'
    });

    // Build dynamic prompt with compliance
    let dynamicPrompt = getConsentPrompt(state, facility_name);
    if (analysis_data) {
      if (analysis_data.recommended_pitch) {
        dynamicPrompt += `\n\nRecommended pitch: ${analysis_data.recommended_pitch}`;
      }
      if (analysis_data.revenue_opportunities?.length > 0) {
        dynamicPrompt += `\n\nKey opportunities: ${analysis_data.revenue_opportunities.map((o: any) => o.opportunity || o).join(', ')}`;
      }
    }

    // Create Retell LLM
    console.log('Creating Retell LLM with compliance prompt...');
    const llmResponse = await fetch('https://api.retellai.com/create-retell-llm', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        general_prompt: dynamicPrompt,
        begin_message: `Hello, this is Alex from ScrapeX Healthcare Solutions calling for ${facility_name}. Before we continue, I need to let you know that this call may be recorded for quality assurance. ${isTwoParty ? 'Do you consent to this recording?' : 'Is that okay with you?'}`,
        general_tools: [
          {
            type: 'end_call',
            name: 'end_call',
            description: 'End the call when the conversation is complete, the customer declines consent, or asks to be removed from the call list',
          }
        ],
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error('Failed to create Retell LLM:', llmResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create Retell LLM', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const llmData = await llmResponse.json();
    const llmId = llmData.llm_id;

    // Create Retell agent
    console.log('Creating Retell agent...');
    const agentResponse = await fetch('https://api.retellai.com/create-agent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_name: `ScrapeX Compliant Agent - ${facility_name.substring(0, 25)}`,
        voice_id: '11labs-Adrian',
        response_engine: { type: 'retell-llm', llm_id: llmId },
        language: 'en-US',
        enable_backchannel: true,
        enable_voicemail_detection: true,
        voicemail_message: `Hi, this is Alex from ScrapeX Healthcare Solutions calling for ${facility_name}. We have insights that could help improve your operations. Please call us back at your earliest convenience. Thank you!`,
      }),
    });

    if (!agentResponse.ok) {
      const errorText = await agentResponse.text();
      await fetch(`https://api.retellai.com/delete-retell-llm/${llmId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${RETELL_API_KEY}` },
      });
      return new Response(
        JSON.stringify({ error: 'Failed to create Retell agent', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const agentData = await agentResponse.json();
    const agentId = agentData.agent_id;

    // Get outbound phone number - first try secret, then fetch from Retell
    let fromNumber = RETELL_FROM_NUMBER;
    
    if (!fromNumber) {
      console.log('RETELL_FROM_NUMBER not set, fetching from Retell API...');
      try {
        const numbersResponse = await fetch('https://api.retellai.com/list-phone-numbers', {
          headers: { 'Authorization': `Bearer ${RETELL_API_KEY}` },
        });
        if (numbersResponse.ok) {
          const numbers = await numbersResponse.json();
          if (Array.isArray(numbers) && numbers.length > 0) {
            fromNumber = numbers[0].phone_number;
            console.log(`Using Retell phone number: ${fromNumber}`);
          }
        }
      } catch (e) {
        console.error('Error fetching Retell phone numbers:', e);
      }
    }

    if (!fromNumber) {
      // Cleanup created resources
      await fetch(`https://api.retellai.com/delete-agent/${agentId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${RETELL_API_KEY}` },
      });
      await fetch(`https://api.retellai.com/delete-retell-llm/${llmId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${RETELL_API_KEY}` },
      });
      return new Response(
        JSON.stringify({ 
          error: 'No outbound phone number configured',
          details: 'Please set the RETELL_FROM_NUMBER secret or provision a phone number in your Retell dashboard'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initiate the call
    console.log(`Initiating call from ${fromNumber} to ${formattedPhone}...`);
    const callResponse = await fetch('https://api.retellai.com/v2/create-phone-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from_number: fromNumber,
        to_number: formattedPhone,
        agent_id: agentId,
        webhook_url: `${SUPABASE_URL}/functions/v1/retell-webhook`,
        metadata: {
          facility_name,
          user_id: userId,
          state,
          timezone,
          two_party_consent: isTwoParty,
          source: 'scrapex_dashboard',
        },
        drop_if_machine_detected: false,
      }),
    });

    if (!callResponse.ok) {
      const errorText = await callResponse.text();
      await fetch(`https://api.retellai.com/delete-agent/${agentId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${RETELL_API_KEY}` },
      });
      await fetch(`https://api.retellai.com/delete-retell-llm/${llmId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${RETELL_API_KEY}` },
      });
      return new Response(
        JSON.stringify({ error: 'Failed to initiate call', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callData = await callResponse.json();
    const callId = callData.call_id;

    // Store call record with compliance fields
    const { data: callRecord, error: insertError } = await supabase
      .from('call_records')
      .insert({
        user_id: userId,
        call_id: callId,
        facility_name,
        phone_number: formattedPhone,
        status: callData.call_status || 'initiated',
        outcome: 'pending',
        duration: 0,
        lead_score: analysis_data?.lead_score || null,
        state,
        timezone,
        two_party_consent_state: isTwoParty,
        dnc_checked: true,
        called_during_business_hours: businessHours.isValid,
        business_hours_override: override_business_hours || false,
        notes: JSON.stringify({
          agent_id: agentId,
          llm_id: llmId,
          retell_metadata: callData,
          analysis_context: analysis_data || null,
          compliance: { state, timezone, two_party_consent: isTwoParty, dnc_checked: true }
        }),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing call record:', insertError);
    }

    // Log call initiation
    await supabase.rpc('log_compliance_action', {
      p_user_id: userId,
      p_action: 'call_initiated',
      p_category: 'call',
      p_details: { 
        call_id: callId, 
        phone_number: formattedPhone, 
        facility_name, 
        state, 
        timezone,
        two_party_consent: isTwoParty,
        business_hours_override: override_business_hours || false
      },
      p_result: 'success'
    });

    // Forward to Make.com if configured
    if (MAKE_WEBHOOK_URL) {
      try {
        await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            call_id: callId,
            facility_name,
            phone_number: formattedPhone,
            state,
            timezone,
            two_party_consent: isTwoParty,
            user_id: userId,
            triggered_at: new Date().toISOString(),
          }),
        });
      } catch (e) {
        console.error('Make.com webhook error:', e);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        call_id: callId,
        agent_id: agentId,
        call_record: callRecord,
        compliance: {
          state,
          timezone,
          two_party_consent_required: isTwoParty,
          dnc_checked: true,
          business_hours_valid: businessHours.isValid,
          agreement_verified: true
        },
        message: 'Compliant Retell AI call initiated successfully',
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
