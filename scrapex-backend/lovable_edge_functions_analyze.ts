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
    const { facility_data } = await req.json();

    if (!facility_data) {
      return new Response(
        JSON.stringify({ error: "facility_data is required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const supabaseKey = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Analyze the facility
    const analysis = analyzeFacility(facility_data);

    // Store analysis in database
    const { data: analysisRecord, error: dbError } = await supabase
      .from("scraping_jobs")
      .insert({
        facility_name: facility_data.facility_name,
        url: facility_data.url,
        status: "completed",
        result: {
          ...facility_data,
          analysis: analysis,
        },
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
    }

    return new Response(
      JSON.stringify({
        job_id: analysisRecord?.id || "analysis_" + Date.now(),
        status: "completed",
        result: analysis,
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

function analyzeFacility(facility_data: any) {
  // Calculate lead score
  let leadScore = 50;

  if (facility_data.phone && facility_data.phone.length > 0) leadScore += 10;
  if (facility_data.address) leadScore += 10;
  if (facility_data.services && facility_data.services.length > 0)
    leadScore += 15;

  const quality = facility_data.website_quality?.percentage || 0;
  leadScore += Math.floor(quality / 10);

  leadScore = Math.min(leadScore, 100);

  // Identify revenue opportunities
  const opportunities = identifyOpportunities(facility_data);

  // Identify operational gaps
  const gaps = identifyGaps(facility_data);

  // Determine urgency
  const urgency = determineUrgency(leadScore, gaps.length);

  // Generate pitch
  const pitch = generatePitch(facility_data, opportunities);

  return {
    facility_name: facility_data.facility_name,
    url: facility_data.url,
    analyzed_at: new Date().toISOString(),
    lead_score: leadScore,
    urgency: urgency,
    revenue_opportunities: opportunities,
    operational_gaps: gaps,
    recommended_pitch: pitch,
    analysis_details: {
      contact_methods_score: calculateContactScore(facility_data),
      website_quality_score: quality,
      service_completeness: facility_data.services?.length || 0,
      insurance_acceptance: facility_data.insurance?.accepts_insurance
        ? "Yes"
        : "No",
    },
  };
}

function identifyOpportunities(facility_data: any): string[] {
  const opportunities = [];

  if (!facility_data.contact_methods?.online_booking) {
    opportunities.push("Online appointment booking system");
  }

  if (!facility_data.contact_methods?.email) {
    opportunities.push("Email contact capability");
  }

  if (facility_data.website_quality?.percentage < 60) {
    opportunities.push("Website modernization and improvement");
  }

  if (!facility_data.services || facility_data.services.length < 3) {
    opportunities.push("Service expansion and promotion");
  }

  if (!facility_data.contact_methods?.contact_form) {
    opportunities.push("Online contact form implementation");
  }

  if (!facility_data.insurance?.accepts_insurance) {
    opportunities.push("Insurance acceptance expansion");
  }

  if (!facility_data.staff_info?.has_staff_info) {
    opportunities.push("Staff directory and credentials listing");
  }

  if (opportunities.length === 0) {
    opportunities.push("Patient engagement enhancement");
    opportunities.push("Operational efficiency improvement");
  }

  return opportunities.slice(0, 5);
}

function identifyGaps(facility_data: any): string[] {
  const gaps = [];

  if (!facility_data.phone || facility_data.phone.length === 0) {
    gaps.push("No phone number found on website");
  }

  if (!facility_data.address) {
    gaps.push("Address not clearly listed");
  }

  if (!facility_data.hours) {
    gaps.push("Business hours not specified");
  }

  if (!facility_data.contact_methods?.online_booking) {
    gaps.push("No online booking capability");
  }

  if (!facility_data.contact_methods?.email) {
    gaps.push("No email contact method");
  }

  if (facility_data.website_quality?.percentage < 50) {
    gaps.push("Website quality below standard");
  }

  return gaps;
}

function determineUrgency(leadScore: number, gapCount: number): string {
  if (leadScore >= 80 && gapCount >= 3) return "critical";
  if (leadScore >= 75 || gapCount >= 4) return "high";
  if (leadScore >= 60) return "medium";
  return "low";
}

function generatePitch(facility_data: any, opportunities: string[]): string {
  const facility_name = facility_data.facility_name || "Healthcare Facility";
  const primary_opportunity = opportunities[0] || "operational efficiency";

  return `Hi ${facility_name}, we help healthcare facilities like yours improve ${primary_opportunity.toLowerCase()}. We noticed your facility could benefit from ${opportunities[1]?.toLowerCase() || "enhanced patient engagement"}. Would you be open to a brief conversation about how we can help?`;
}

function calculateContactScore(facility_data: any): number {
  let score = 0;
  if (facility_data.contact_methods?.phone) score += 25;
  if (facility_data.contact_methods?.email) score += 25;
  if (facility_data.contact_methods?.contact_form) score += 25;
  if (facility_data.contact_methods?.online_booking) score += 25;
  return score;
}
