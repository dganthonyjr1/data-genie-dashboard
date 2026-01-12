import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const RETELL_AGENT_PROMPT = `You are a professional sales representative for a healthcare technology company. Your goal is to help healthcare facilities improve patient engagement and operational efficiency. 

Start by briefly introducing yourself and your company. Then ask: 'Are you currently looking to improve patient outreach, appointment scheduling, or administrative efficiency?'

Based on their response, present the specific solution identified in our analysis. Focus on the concrete benefits (time saved, revenue opportunities, operational improvements).

If they show interest, offer to transfer them to a human team member for a deeper discussion. If they're not interested, thank them and ask if they'd like to receive information via email.

Keep the call professional, concise, and focused on their specific needs.`;

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

    console.log(`Triggering Retell call for: ${facility_name} at ${phone_number} for user ${userId}`);

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

    const formattedPhone = formatPhoneNumber(phone_number);

    // Build dynamic prompt with analysis context
    let dynamicPrompt = RETELL_AGENT_PROMPT;
    if (analysis_data) {
      const contextParts: string[] = [];
      if (analysis_data.recommended_pitch) {
        contextParts.push(`\n\nRecommended pitch for this facility: ${analysis_data.recommended_pitch}`);
      }
      if (analysis_data.revenue_opportunities && analysis_data.revenue_opportunities.length > 0) {
        contextParts.push(`\n\nKey revenue opportunities identified: ${analysis_data.revenue_opportunities.join(', ')}`);
      }
      if (analysis_data.operational_gaps && analysis_data.operational_gaps.length > 0) {
        contextParts.push(`\n\nOperational gaps to address: ${analysis_data.operational_gaps.join(', ')}`);
      }
      if (analysis_data.lead_score) {
        contextParts.push(`\n\nThis is a ${analysis_data.lead_score >= 80 ? 'high priority' : analysis_data.lead_score >= 60 ? 'medium priority' : 'standard'} lead with a score of ${analysis_data.lead_score}/100.`);
      }
      dynamicPrompt += contextParts.join('');
    }

    // Step 1: Create a Retell LLM first
    console.log('Creating Retell LLM...');
    const llmResponse = await fetch('https://api.retellai.com/create-retell-llm', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        general_prompt: dynamicPrompt,
        begin_message: `Hello, this is Alex from ScrapeX Healthcare Solutions. Am I speaking with someone from ${facility_name}?`,
        general_tools: [
          {
            type: 'end_call',
            name: 'end_call',
            description: 'End the call politely when the conversation is complete or the customer requests to end the call',
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
    console.log(`Created Retell LLM: ${llmId}`);

    // Step 2: Create Retell agent using the LLM
    console.log('Creating Retell agent...');
    const agentResponse = await fetch('https://api.retellai.com/create-agent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_name: `ScrapeX Sales Agent - ${facility_name.substring(0, 30)}`,
        voice_id: '11labs-Adrian',
        response_engine: {
          type: 'retell-llm',
          llm_id: llmId,
        },
        language: 'en-US',
        enable_backchannel: true,
        backchannel_frequency: 0.8,
        boosted_keywords: ['healthcare', 'patient', 'scheduling', 'efficiency', 'revenue'],
        enable_voicemail_detection: true,
        voicemail_message: `Hi, this is Alex from ScrapeX Healthcare Solutions calling for ${facility_name}. We have some insights that could help improve your patient engagement and operational efficiency. Please give us a call back at your earliest convenience. Thank you!`,
      }),
    });

    if (!agentResponse.ok) {
      const errorText = await agentResponse.text();
      console.error('Failed to create Retell agent:', agentResponse.status, errorText);
      
      // Clean up the LLM we created
      try {
        await fetch(`https://api.retellai.com/delete-retell-llm/${llmId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${RETELL_API_KEY}` },
        });
      } catch (cleanupError) {
        console.error('Failed to cleanup LLM:', cleanupError);
      }

      return new Response(
        JSON.stringify({ error: 'Failed to create Retell agent', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const agentData = await agentResponse.json();
    const agentId = agentData.agent_id;
    console.log(`Created Retell agent: ${agentId}`);

    // Step 3: Initiate the phone call
    console.log(`Initiating Retell call to ${formattedPhone}...`);
    const callResponse = await fetch('https://api.retellai.com/v2/create-phone-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from_number: null, // Retell will use default number
        to_number: formattedPhone,
        agent_id: agentId,
        metadata: {
          facility_name,
          user_id: userId,
          lead_score: analysis_data?.lead_score || null,
          source: 'scrapex_dashboard',
          llm_id: llmId,
        },
        retell_llm_dynamic_variables: {
          facility_name,
          recommended_pitch: analysis_data?.recommended_pitch || 'general healthcare solutions',
        },
        drop_if_machine_detected: false, // Leave voicemail if needed
      }),
    });

    if (!callResponse.ok) {
      const errorText = await callResponse.text();
      console.error('Failed to initiate Retell call:', callResponse.status, errorText);
      
      // Clean up the agent and LLM we created
      try {
        await fetch(`https://api.retellai.com/delete-agent/${agentId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${RETELL_API_KEY}` },
        });
        await fetch(`https://api.retellai.com/delete-retell-llm/${llmId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${RETELL_API_KEY}` },
        });
      } catch (cleanupError) {
        console.error('Failed to cleanup agent/LLM:', cleanupError);
      }

      return new Response(
        JSON.stringify({ error: 'Failed to initiate call', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callData = await callResponse.json();
    console.log('Retell call initiated:', callData);

    const callId = callData.call_id;
    const callStatus = callData.call_status || 'initiated';

    // Store call record in database
    const { data: callRecord, error: insertError } = await supabase
      .from('call_records')
      .insert({
        user_id: userId,
        call_id: callId,
        facility_name,
        phone_number: formattedPhone,
        status: callStatus,
        outcome: 'pending',
        duration: 0,
        lead_score: analysis_data?.lead_score || null,
        notes: JSON.stringify({
          agent_id: agentId,
          llm_id: llmId,
          recording_url: callData.recording_url || null,
          retell_metadata: callData,
          analysis_context: analysis_data || null,
        }),
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
          retell_agent_id: agentId,
          retell_llm_id: llmId,
          facility_name,
          phone_number: formattedPhone,
          analysis_data,
          user_id: userId,
          triggered_at: new Date().toISOString(),
          provider: 'retell_ai',
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
        agent_id: agentId,
        llm_id: llmId,
        call_status: callStatus,
        recording_url: callData.recording_url || null,
        call_record: callRecord,
        tcpa_status: tcpaCheck,
        message: 'Retell AI call initiated successfully',
        provider: 'retell_ai',
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
  if (isOnDNCList(phoneNumber)) {
    return { can_call: false, reason: 'Number is on Do Not Call list' };
  }

  return { can_call: true };
}

function isOnDNCList(phoneNumber: string): boolean {
  // Placeholder - in production, check against actual DNC database
  return false;
}
