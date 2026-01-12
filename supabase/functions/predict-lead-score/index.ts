import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadData {
  businessName: string;
  niche: string;
  painScore: number | null;
  revenueLeak: number | null;
  reviewRating?: number;
  reviewCount?: number;
  hasPhone: boolean;
  hasEmail: boolean;
  hasWebsite: boolean;
  evidence?: string[];
}

interface PredictionResult {
  conversionProbability: number;
  confidence: string;
  optimalContactTime: string;
  optimalContactDay: string;
  urgencyLevel: string;
  reasoning: string;
  keyFactors: string[];
  recommendedApproach: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    
    // Support both { lead: {...} } format and flat format for backwards compatibility
    let lead: LeadData;
    if (body.lead) {
      lead = body.lead;
    } else {
      // Convert flat format to LeadData
      lead = {
        businessName: body.business_name || body.businessName || 'Unknown Business',
        niche: body.niche || 'general',
        painScore: body.pain_score || body.painScore || null,
        revenueLeak: body.revenue_leak || body.revenueLeak || null,
        reviewRating: body.review_rating || body.reviewRating,
        reviewCount: body.review_count || body.reviewCount,
        hasPhone: Boolean(body.phone || body.hasPhone),
        hasEmail: Boolean(body.email || body.hasEmail),
        hasWebsite: Boolean(body.website || body.hasWebsite),
        evidence: body.evidence,
      };
    }

    if (!lead || !lead.businessName) {
      return new Response(
        JSON.stringify({ error: 'Lead data with businessName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Predicting lead score for: ${lead.businessName}`);

    const prompt = `You are an expert B2B sales analyst. Analyze this business lead and predict the likelihood of conversion.

BUSINESS DATA:
- Business Name: ${lead.businessName}
- Industry/Niche: ${lead.niche}
- Pain Score (1-100, higher = more pain points): ${lead.painScore ?? 'Unknown'}
- Estimated Monthly Revenue Leak: $${lead.revenueLeak ?? 'Unknown'}
- Review Rating: ${lead.reviewRating ?? 'Unknown'}/5
- Number of Reviews: ${lead.reviewCount ?? 'Unknown'}
- Has Phone Number: ${lead.hasPhone ? 'Yes' : 'No'}
- Has Email: ${lead.hasEmail ? 'Yes' : 'No'}
- Has Website: ${lead.hasWebsite ? 'Yes' : 'No'}
- Evidence of Pain Points: ${lead.evidence?.join('; ') || 'None identified'}

Based on this data, provide a JSON response with your analysis. Consider:
1. Higher pain scores indicate more motivation to change
2. Larger revenue leaks create urgency
3. Lower review ratings may indicate openness to help
4. Complete contact info enables faster outreach
5. Industry patterns (some niches convert better)

Current time context: It's a business day. Consider typical business hours for ${lead.niche} businesses.

Respond with ONLY valid JSON in this exact format:
{
  "conversionProbability": <number 0-100>,
  "confidence": "<low|medium|high>",
  "optimalContactTime": "<specific time like '10:00 AM' or '2:00 PM'>",
  "optimalContactDay": "<day of week>",
  "urgencyLevel": "<low|medium|high|critical>",
  "reasoning": "<2-3 sentence explanation>",
  "keyFactors": ["<factor 1>", "<factor 2>", "<factor 3>"],
  "recommendedApproach": "<brief sales approach recommendation>"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { 
            role: "system", 
            content: "You are a B2B sales intelligence AI. Always respond with valid JSON only, no markdown or extra text." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("AI Response:", content);

    // Parse the JSON response
    let prediction: PredictionResult;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      prediction = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Fallback prediction based on available data
      const baseScore = lead.painScore ?? 50;
      const leakBonus = lead.revenueLeak ? Math.min(lead.revenueLeak / 500, 20) : 0;
      const contactBonus = (lead.hasPhone ? 10 : 0) + (lead.hasEmail ? 5 : 0);
      
      prediction = {
        conversionProbability: Math.min(100, Math.round(baseScore * 0.5 + leakBonus + contactBonus)),
        confidence: "medium",
        optimalContactTime: "10:00 AM",
        optimalContactDay: "Tuesday",
        urgencyLevel: baseScore > 70 ? "high" : baseScore > 40 ? "medium" : "low",
        reasoning: "Score calculated based on pain score, revenue leak potential, and contact information availability.",
        keyFactors: [
          `Pain score: ${lead.painScore ?? 'Unknown'}`,
          `Revenue leak: $${lead.revenueLeak ?? 'Unknown'}`,
          lead.hasPhone ? "Phone available" : "No phone"
        ],
        recommendedApproach: "Focus on addressing their specific pain points identified in the analysis."
      };
    }

    // Validate and clamp values
    prediction.conversionProbability = Math.max(0, Math.min(100, Math.round(prediction.conversionProbability)));

    console.log(`Prediction for ${lead.businessName}: ${prediction.conversionProbability}% conversion probability`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        prediction,
        analyzedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in predict-lead-score:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
