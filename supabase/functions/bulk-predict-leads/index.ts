import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadData {
  id: string;
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
  leadId: string;
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

    const { leads } = await req.json() as { leads: LeadData[] };

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Leads array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Bulk scoring ${leads.length} leads for user ${user.id}`);

    // Build a comprehensive prompt for all leads
    const leadsDescription = leads.map((lead, index) => `
LEAD ${index + 1} (ID: ${lead.id}):
- Business Name: ${lead.businessName}
- Industry/Niche: ${lead.niche}
- Pain Score (1-100): ${lead.painScore ?? 'Unknown'}
- Monthly Revenue Leak: $${lead.revenueLeak ?? 'Unknown'}
- Review Rating: ${lead.reviewRating ?? 'Unknown'}/5
- Number of Reviews: ${lead.reviewCount ?? 'Unknown'}
- Has Phone: ${lead.hasPhone ? 'Yes' : 'No'}
- Has Email: ${lead.hasEmail ? 'Yes' : 'No'}
- Has Website: ${lead.hasWebsite ? 'Yes' : 'No'}
- Pain Evidence: ${lead.evidence?.join('; ') || 'None'}
`).join('\n---\n');

    const prompt = `You are an expert B2B sales analyst. Analyze these ${leads.length} business leads and predict their conversion likelihood. Rank them from highest to lowest conversion potential.

${leadsDescription}

SCORING CRITERIA:
1. Higher pain scores = more motivated to change (weight: 30%)
2. Larger revenue leaks = more urgency to act (weight: 25%)
3. Lower review ratings = may be seeking improvement (weight: 15%)
4. Complete contact info = faster outreach possible (weight: 15%)
5. Industry conversion patterns (weight: 15%)

For EACH lead, respond with a JSON array containing objects with this EXACT structure:
[
  {
    "leadId": "<exact lead ID from input>",
    "conversionProbability": <number 0-100>,
    "confidence": "<low|medium|high>",
    "optimalContactTime": "<specific time>",
    "optimalContactDay": "<day of week>",
    "urgencyLevel": "<low|medium|high|critical>",
    "reasoning": "<1-2 sentence explanation>",
    "keyFactors": ["<factor 1>", "<factor 2>"],
    "recommendedApproach": "<brief approach>"
  }
]

IMPORTANT: Return ONLY valid JSON array, no markdown, no extra text. Include ALL ${leads.length} leads.`;

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
            content: "You are a B2B sales intelligence AI. Always respond with valid JSON only, no markdown or extra text. You must analyze ALL leads provided and return predictions for each one."
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

    console.log("AI Response received, parsing...");

    // Parse the JSON response
    let predictions: PredictionResult[];
    try {
      // Clean the response
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
      predictions = JSON.parse(cleanContent.trim());

      // Validate and clamp values
      predictions = predictions.map(p => ({
        ...p,
        conversionProbability: Math.max(0, Math.min(100, Math.round(p.conversionProbability || 0)))
      }));

    } catch (parseError) {
      console.error("Failed to parse AI response, generating fallback scores");
      // Generate fallback predictions for all leads
      predictions = leads.map(lead => {
        const baseScore = lead.painScore ?? 50;
        const leakBonus = lead.revenueLeak ? Math.min(lead.revenueLeak / 500, 20) : 0;
        const contactBonus = (lead.hasPhone ? 10 : 0) + (lead.hasEmail ? 5 : 0);
        const probability = Math.min(100, Math.round(baseScore * 0.5 + leakBonus + contactBonus));
        
        return {
          leadId: lead.id,
          conversionProbability: probability,
          confidence: "medium" as const,
          optimalContactTime: "10:00 AM",
          optimalContactDay: "Tuesday",
          urgencyLevel: baseScore > 70 ? "high" : baseScore > 40 ? "medium" : "low",
          reasoning: "Score calculated based on pain score, revenue leak, and contact availability.",
          keyFactors: [
            `Pain: ${lead.painScore ?? 'Unknown'}`,
            `Leak: $${lead.revenueLeak ?? 'Unknown'}`
          ],
          recommendedApproach: "Focus on their specific pain points."
        };
      });
    }

    // Sort by conversion probability (highest first)
    predictions.sort((a, b) => b.conversionProbability - a.conversionProbability);

    console.log(`Successfully scored ${predictions.length} leads`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        predictions,
        analyzedAt: new Date().toISOString(),
        totalLeads: predictions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in bulk-predict-leads:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
