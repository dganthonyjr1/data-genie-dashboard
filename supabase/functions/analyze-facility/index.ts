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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

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
    const { scraped_data, facility_name, url } = await req.json();

    if (!scraped_data) {
      return new Response(
        JSON.stringify({ error: 'scraped_data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing facility: ${facility_name || 'Unknown'} for user ${userId}`);

    let analysis: any;

    if (LOVABLE_API_KEY) {
      try {
        analysis = await performAIAnalysis(scraped_data, LOVABLE_API_KEY);
        console.log('AI analysis completed successfully');
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
        analysis = generateRuleBasedAnalysis(scraped_data);
      }
    } else {
      console.log('LOVABLE_API_KEY not set, using rule-based analysis');
      analysis = generateRuleBasedAnalysis(scraped_data);
    }

    // Store analysis in database
    const { data: storedAnalysis, error: insertError } = await supabase
      .from('facility_analysis')
      .insert({
        user_id: userId,
        facility_name: facility_name || scraped_data.facility_name || 'Unknown',
        url: url || scraped_data.url,
        lead_score: analysis.lead_score,
        urgency: analysis.urgency,
        revenue_opportunities: analysis.revenue_opportunities,
        operational_gaps: analysis.operational_gaps,
        recommended_pitch: analysis.recommended_pitch,
        analysis_details: analysis,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing analysis:', insertError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis,
        stored_id: storedAnalysis?.id,
        message: 'Facility analyzed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-facility:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function performAIAnalysis(scrapedData: any, apiKey: string): Promise<any> {
  const prompt = `Analyze this healthcare facility data and provide a sales intelligence report.

Facility Data:
${JSON.stringify(scrapedData, null, 2)}

Provide your analysis in this exact JSON format:
{
  "lead_score": <number 0-100>,
  "urgency": "<low|medium|high|critical>",
  "revenue_opportunities": [
    {"opportunity": "<description>", "estimated_value": "<dollar amount>", "confidence": "<low|medium|high>"}
  ],
  "operational_gaps": [
    {"gap": "<description>", "impact": "<low|medium|high>", "solution": "<proposed solution>"}
  ],
  "recommended_pitch": "<2-3 sentence sales pitch tailored to this facility>",
  "key_decision_factors": ["<factor1>", "<factor2>"],
  "competitive_position": "<assessment of market position>",
  "follow_up_timing": "<recommended timing for follow-up>"
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { 
          role: 'system', 
          content: 'You are a healthcare sales intelligence analyst. Analyze facility data and provide actionable insights for sales teams. Always respond with valid JSON only, no additional text.' 
        },
        { role: 'user', content: prompt }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "provide_analysis",
            description: "Provide structured analysis of the healthcare facility",
            parameters: {
              type: "object",
              properties: {
                lead_score: { type: "number", minimum: 0, maximum: 100 },
                urgency: { type: "string", enum: ["low", "medium", "high", "critical"] },
                revenue_opportunities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      opportunity: { type: "string" },
                      estimated_value: { type: "string" },
                      confidence: { type: "string", enum: ["low", "medium", "high"] }
                    },
                    required: ["opportunity", "estimated_value", "confidence"]
                  }
                },
                operational_gaps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      gap: { type: "string" },
                      impact: { type: "string", enum: ["low", "medium", "high"] },
                      solution: { type: "string" }
                    },
                    required: ["gap", "impact", "solution"]
                  }
                },
                recommended_pitch: { type: "string" },
                key_decision_factors: { type: "array", items: { type: "string" } },
                competitive_position: { type: "string" },
                follow_up_timing: { type: "string" }
              },
              required: ["lead_score", "urgency", "revenue_opportunities", "operational_gaps", "recommended_pitch"]
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "provide_analysis" } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API error:', response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Extract from tool call
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    return JSON.parse(toolCall.function.arguments);
  }

  // Fallback to content parsing
  const content = data.choices?.[0]?.message?.content;
  if (content) {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  }

  throw new Error('Could not parse AI response');
}

function generateRuleBasedAnalysis(scrapedData: any): any {
  const extracted = scrapedData.extracted || {};
  const content = scrapedData.content || {};
  
  // Calculate lead score based on available data
  let leadScore = 50; // Base score
  
  if (extracted.has_contact_info) leadScore += 15;
  if (extracted.phones?.length > 0) leadScore += 10;
  if (extracted.emails?.length > 0) leadScore += 5;
  if (extracted.services?.length > 3) leadScore += 10;
  if (content.markdown?.length > 500) leadScore += 10;
  
  // Cap at 100
  leadScore = Math.min(leadScore, 100);
  
  // Determine urgency
  let urgency = 'medium';
  if (leadScore >= 80) urgency = 'high';
  else if (leadScore >= 90) urgency = 'critical';
  else if (leadScore < 50) urgency = 'low';

  return {
    lead_score: leadScore,
    urgency,
    revenue_opportunities: [
      {
        opportunity: 'Digital transformation services',
        estimated_value: '$15,000 - $50,000',
        confidence: 'medium'
      },
      {
        opportunity: 'Patient engagement platform',
        estimated_value: '$10,000 - $30,000',
        confidence: 'medium'
      }
    ],
    operational_gaps: [
      {
        gap: 'Limited online presence',
        impact: 'medium',
        solution: 'Implement comprehensive digital marketing strategy'
      },
      {
        gap: 'Manual scheduling processes',
        impact: 'high',
        solution: 'Automated appointment scheduling system'
      }
    ],
    recommended_pitch: `Based on our analysis, your facility could benefit from modernizing patient engagement systems. We specialize in healthcare technology solutions that improve patient satisfaction and operational efficiency.`,
    key_decision_factors: ['Cost savings', 'Patient satisfaction', 'Operational efficiency'],
    competitive_position: 'Average market position with room for improvement',
    follow_up_timing: 'Within 1 week'
  };
}
