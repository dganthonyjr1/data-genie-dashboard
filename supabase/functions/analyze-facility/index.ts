import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Industry configurations for analysis prompts
const INDUSTRY_ANALYSIS_CONFIGS: Record<string, {
  name: string;
  systemPrompt: string;
  focusAreas: string[];
  costPerLead: number;
  revenueOpportunityTypes: string[];
  operationalGapTypes: string[];
}> = {
  healthcare: {
    name: 'Healthcare',
    systemPrompt: 'You are a healthcare business analyst specializing in medical practices, clinics, and healthcare facilities.',
    focusAreas: [
      'Patient scheduling and appointment management',
      'Insurance and billing efficiency',
      'Patient engagement and retention',
      'Staff workflow optimization',
      'Digital presence and online booking'
    ],
    costPerLead: 150,
    revenueOpportunityTypes: ['Patient acquisition', 'No-show reduction', 'Treatment plan acceptance', 'Recurring visit optimization'],
    operationalGapTypes: ['Scheduling inefficiency', 'Phone handling', 'Patient follow-up', 'Online presence']
  },
  restaurant: {
    name: 'Restaurant & Food Service',
    systemPrompt: 'You are a restaurant business analyst specializing in food service operations and hospitality.',
    focusAreas: [
      'Reservation and table management',
      'Online ordering and delivery optimization',
      'Review and reputation management',
      'Staff scheduling and labor costs',
      'Menu optimization and pricing'
    ],
    costPerLead: 50,
    revenueOpportunityTypes: ['Online ordering increase', 'Table turnover optimization', 'Catering expansion', 'Delivery revenue'],
    operationalGapTypes: ['No-show reservations', 'Order accuracy', 'Review response', 'Menu pricing']
  },
  legal: {
    name: 'Legal Services',
    systemPrompt: 'You are a legal practice business analyst specializing in law firms and legal service providers.',
    focusAreas: [
      'Client intake and case qualification',
      'Lead response time and conversion',
      'Document management efficiency',
      'Billing and time tracking',
      'Client communication and updates'
    ],
    costPerLead: 500,
    revenueOpportunityTypes: ['Case intake acceleration', 'Consultation conversion', 'Client retention', 'Referral generation'],
    operationalGapTypes: ['Response time', 'Follow-up gaps', 'Intake bottlenecks', 'Communication delays']
  },
  real_estate: {
    name: 'Real Estate',
    systemPrompt: 'You are a real estate business analyst specializing in realtors, brokerages, and property management.',
    focusAreas: [
      'Lead capture and response time',
      'Property listing and marketing',
      'Showing scheduling and coordination',
      'Client nurturing and follow-up',
      'Market analysis and pricing tools'
    ],
    costPerLead: 300,
    revenueOpportunityTypes: ['Lead conversion improvement', 'Listing acquisition', 'Referral network growth', 'Marketing ROI'],
    operationalGapTypes: ['Response delay', 'Showing coordination', 'Lead nurturing', 'Market visibility']
  },
  automotive: {
    name: 'Automotive Services',
    systemPrompt: 'You are an automotive business analyst specializing in repair shops, dealerships, and service centers.',
    focusAreas: [
      'Appointment scheduling and reminders',
      'Service follow-up and upselling',
      'Customer retention and loyalty',
      'Inventory and parts management',
      'Technician scheduling and efficiency'
    ],
    costPerLead: 75,
    revenueOpportunityTypes: ['Service upselling', 'Declined service recovery', 'Maintenance program enrollment', 'Parts sales'],
    operationalGapTypes: ['Appointment no-shows', 'Service follow-up', 'Customer communication', 'Scheduling gaps']
  },
  home_services: {
    name: 'Home Services',
    systemPrompt: 'You are a home services business analyst specializing in contractors, plumbers, electricians, and HVAC.',
    focusAreas: [
      'Lead capture and call handling',
      'Quote generation and follow-up',
      'Scheduling and dispatch efficiency',
      'Customer reviews and reputation',
      'Seasonal demand management'
    ],
    costPerLead: 150,
    revenueOpportunityTypes: ['Missed call capture', 'Quote conversion', 'Maintenance agreement sales', 'Seasonal smoothing'],
    operationalGapTypes: ['Call handling', 'Quote follow-up', 'Scheduling efficiency', 'Review management']
  },
  professional_services: {
    name: 'Professional Services',
    systemPrompt: 'You are a professional services business analyst specializing in consulting, accounting, and B2B services.',
    focusAreas: [
      'Proposal and quote generation',
      'Client communication and updates',
      'Project management and tracking',
      'Time tracking and billing',
      'Client retention and upselling'
    ],
    costPerLead: 200,
    revenueOpportunityTypes: ['Proposal speed improvement', 'Client retention increase', 'Service expansion', 'Efficiency gains'],
    operationalGapTypes: ['Proposal delays', 'Client communication', 'Scope management', 'Billing accuracy']
  },
  spa_wellness: {
    name: 'Spa & Wellness',
    systemPrompt: 'You are a spa and wellness business analyst specializing in salons, spas, gyms, and wellness centers.',
    focusAreas: [
      'Appointment booking and optimization',
      'Membership and package management',
      'Client retention and rebooking',
      'Gift card and promotion tracking',
      'Staff scheduling and utilization'
    ],
    costPerLead: 60,
    revenueOpportunityTypes: ['Booking optimization', 'Membership growth', 'Rebooking improvement', 'Gift card redemption'],
    operationalGapTypes: ['Empty slots', 'Member churn', 'Rebooking gaps', 'Staff utilization']
  },
  general: {
    name: 'General Business',
    systemPrompt: 'You are a business analyst providing insights for various business types.',
    focusAreas: [
      'Lead capture and response',
      'Customer communication',
      'Sales process optimization',
      'Operational efficiency',
      'Growth opportunities'
    ],
    costPerLead: 100,
    revenueOpportunityTypes: ['Lead conversion', 'Customer retention', 'Efficiency gains', 'Market expansion'],
    operationalGapTypes: ['Response time', 'Communication gaps', 'Process inefficiency', 'Technology adoption']
  }
};

function getIndustryConfig(industry: string) {
  return INDUSTRY_ANALYSIS_CONFIGS[industry] || INDUSTRY_ANALYSIS_CONFIGS.general;
}

function buildAnalysisPrompt(scrapedData: any, industry: string): string {
  const config = getIndustryConfig(industry);
  
  return `Analyze this ${config.name} business data and provide a sales intelligence report.

Industry: ${config.name}
Cost per missed lead in this industry: $${config.costPerLead}

Focus your analysis on these ${config.name}-specific areas:
${config.focusAreas.map(area => `- ${area}`).join('\n')}

Business Data:
${JSON.stringify(scrapedData, null, 2)}

Provide your analysis in this exact JSON format:
{
  "lead_score": <number 0-100>,
  "urgency": "<low|medium|high|critical>",
  "revenue_opportunities": [
    {"opportunity": "<${config.name}-specific opportunity>", "estimated_value": "<dollar amount based on $${config.costPerLead} cost per lead>", "confidence": "<low|medium|high>"}
  ],
  "operational_gaps": [
    {"gap": "<${config.name}-specific gap>", "impact": "<low|medium|high>", "solution": "<actionable solution>"}
  ],
  "recommended_pitch": "<2-3 sentence sales pitch tailored to ${config.name} businesses>",
  "key_decision_factors": ["<factor1>", "<factor2>"],
  "competitive_position": "<assessment of market position>",
  "follow_up_timing": "<recommended timing for follow-up>"
}`;
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
    const { scraped_data, facility_name, url, industry = 'healthcare' } = await req.json();

    if (!scraped_data) {
      return new Response(
        JSON.stringify({ error: 'scraped_data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const industryConfig = getIndustryConfig(industry);
    console.log(`Analyzing ${industryConfig.name} facility: ${facility_name || 'Unknown'} for user ${userId}`);

    let analysis: any;

    if (LOVABLE_API_KEY) {
      try {
        analysis = await performAIAnalysis(scraped_data, LOVABLE_API_KEY, industry);
        analysis.industry = industry;
        analysis.industry_name = industryConfig.name;
        console.log('AI analysis completed successfully for industry:', industry);
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
        analysis = generateRuleBasedAnalysis(scraped_data, industry);
      }
    } else {
      console.log('LOVABLE_API_KEY not set, using rule-based analysis');
      analysis = generateRuleBasedAnalysis(scraped_data, industry);
    }

    // Store analysis in database with industry
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
        analysis_details: { ...analysis, industry, industry_name: industryConfig.name },
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
        industry,
        industry_name: industryConfig.name,
        stored_id: storedAnalysis?.id,
        message: `${industryConfig.name} facility analyzed successfully`
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

async function performAIAnalysis(scrapedData: any, apiKey: string, industry: string): Promise<any> {
  const config = getIndustryConfig(industry);
  const prompt = buildAnalysisPrompt(scrapedData, industry);

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
          content: `${config.systemPrompt} Analyze business data and provide actionable insights for sales teams. Always respond with valid JSON only, no additional text.`
        },
        { role: 'user', content: prompt }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "provide_analysis",
            description: `Provide structured analysis of the ${config.name} business`,
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

function generateRuleBasedAnalysis(scrapedData: any, industry: string): any {
  const config = getIndustryConfig(industry);
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

  // Generate industry-specific opportunities and gaps
  const opportunities = config.revenueOpportunityTypes.slice(0, 2).map((type, index) => ({
    opportunity: `${type} improvement`,
    estimated_value: `$${(config.costPerLead * (10 + index * 5)).toLocaleString()} - $${(config.costPerLead * (25 + index * 10)).toLocaleString()}/year`,
    confidence: index === 0 ? 'high' : 'medium'
  }));

  const gaps = config.operationalGapTypes.slice(0, 2).map((type, index) => ({
    gap: type,
    impact: index === 0 ? 'high' : 'medium',
    solution: `Implement automated ${type.toLowerCase()} system`
  }));

  return {
    lead_score: leadScore,
    urgency,
    industry,
    industry_name: config.name,
    revenue_opportunities: opportunities,
    operational_gaps: gaps,
    recommended_pitch: `Based on our analysis of your ${config.name.toLowerCase()} business, we can help improve your ${config.focusAreas[0].toLowerCase()} and ${config.focusAreas[1].toLowerCase()}. Our solutions typically deliver ROI within 90 days.`,
    key_decision_factors: ['Cost savings', 'Efficiency gains', 'Revenue growth'],
    competitive_position: 'Average market position with room for improvement',
    follow_up_timing: 'Within 1 week'
  };
}
