import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { facility_name, phone_number, analysis_data } = await req.json();

    if (!facility_name || !phone_number) {
      return new Response(
        JSON.stringify({
          error: "facility_name and phone_number are required",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const supabaseKey = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check TCPA compliance
    const complianceCheck = checkTCPACompliance(phone_number);

    if (!complianceCheck.can_call) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Cannot call: ${complianceCheck.reason}`,
          compliance_check: complianceCheck,
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate call ID
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Simulate call outcome
    const callOutcome = simulateCallOutcome();

    // Store call record
    const { error: dbError } = await supabase.from("call_records").insert({
      call_id: callId,
      facility_name,
      phone_number,
      status: callOutcome.status,
      outcome: callOutcome.outcome,
      duration: callOutcome.duration,
      lead_score: analysis_data?.lead_score || 0,
      created_at: new Date().toISOString(),
      notes: callOutcome.notes,
    });

    if (dbError) {
      console.error("Database error:", dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        call_id: callId,
        status: callOutcome.status,
        outcome: callOutcome.outcome,
        facility_name,
        phone_number,
        duration: callOutcome.duration,
        note: "Simulated call (Twilio not configured)",
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

function checkTCPACompliance(phone_number: string): any {
  // Check phone number format
  const phoneRegex = /^(\+?1?\s*[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})$/;
  const formatCheck = phoneRegex.test(phone_number);

  // Check business hours (9 AM - 9 PM)
  const now = new Date();
  const hour = now.getHours();
  const hoursCheck = hour >= 9 && hour < 21;

  // Check day of week (Monday - Saturday)
  const dayOfWeek = now.getDay();
  const dayCheck = dayOfWeek !== 0; // Not Sunday

  // Simulate DNC list check (in production, check actual DNC database)
  const dncCheck = !isOnDNCList(phone_number);

  const canCall = formatCheck && hoursCheck && dayCheck && dncCheck;

  return {
    can_call: canCall,
    checks: {
      format_check: formatCheck,
      hours_check: hoursCheck,
      day_check: dayCheck,
      dnc_check: dncCheck,
    },
    reason: !formatCheck
      ? "Invalid phone number format"
      : !hoursCheck
        ? "Outside business hours"
        : !dayCheck
          ? "Cannot call on Sunday"
          : !dncCheck
            ? "Number on Do Not Call list"
            : null,
  };
}

function isOnDNCList(phone_number: string): boolean {
  // In production, check against actual DNC database
  // For now, return false (not on list)
  return false;
}

function simulateCallOutcome(): any {
  const outcomes = [
    {
      status: "completed",
      outcome: "interested",
      duration: Math.floor(Math.random() * 300) + 60,
      notes: "Prospect expressed interest in learning more",
    },
    {
      status: "completed",
      outcome: "not_interested",
      duration: Math.floor(Math.random() * 120) + 20,
      notes: "Prospect declined the offer",
    },
    {
      status: "no_answer",
      outcome: "no_answer",
      duration: 0,
      notes: "No one answered the call",
    },
    {
      status: "voicemail",
      outcome: "voicemail",
      duration: 0,
      notes: "Call went to voicemail",
    },
    {
      status: "completed",
      outcome: "callback_requested",
      duration: Math.floor(Math.random() * 180) + 30,
      notes: "Prospect requested callback at later time",
    },
  ];

  // Weighted random selection (more likely to get no_answer)
  const rand = Math.random();
  if (rand < 0.3) return outcomes[2]; // 30% no_answer
  if (rand < 0.4) return outcomes[3]; // 10% voicemail
  if (rand < 0.6) return outcomes[0]; // 20% interested
  if (rand < 0.8) return outcomes[1]; // 20% not_interested
  return outcomes[4]; // 20% callback_requested
}
