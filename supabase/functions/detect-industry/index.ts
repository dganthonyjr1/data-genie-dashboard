import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Industry keywords for detection
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  healthcare: [
    'medical', 'clinic', 'doctor', 'hospital', 'dental', 'dentist', 'therapy',
    'therapist', 'physician', 'surgery', 'urgent care', 'medspa', 'chiropractor',
    'optometrist', 'dermatology', 'cardiology', 'pediatric', 'orthopedic',
    'physical therapy', 'mental health', 'psychiatry', 'pharmacy', 'veterinary',
    'vet clinic', 'health center', 'wellness center', 'rehab', 'nursing', 'hospice'
  ],
  restaurant: [
    'restaurant', 'cafe', 'coffee shop', 'bakery', 'catering', 'food', 'dining',
    'pizzeria', 'bistro', 'bar', 'grill', 'kitchen', 'eatery', 'deli', 'fast food',
    'takeout', 'delivery', 'food truck', 'brewery', 'winery', 'sushi', 'steakhouse'
  ],
  legal: [
    'attorney', 'lawyer', 'law firm', 'legal', 'paralegal', 'litigation',
    'criminal defense', 'personal injury', 'family law', 'divorce', 'estate planning',
    'bankruptcy', 'immigration', 'corporate law', 'intellectual property'
  ],
  real_estate: [
    'realtor', 'real estate', 'property', 'broker', 'realty', 'homes for sale',
    'real estate agent', 'property management', 'commercial real estate',
    'residential', 'mortgage', 'lending', 'title company', 'escrow', 'appraisal'
  ],
  automotive: [
    'auto repair', 'mechanic', 'car', 'vehicle', 'automotive', 'auto body',
    'collision', 'tire', 'oil change', 'brake', 'transmission', 'engine',
    'car dealership', 'used cars', 'car wash', 'detailing', 'towing'
  ],
  home_services: [
    'plumber', 'plumbing', 'electrician', 'electrical', 'hvac', 'heating',
    'cooling', 'air conditioning', 'contractor', 'construction', 'roofing',
    'landscaping', 'lawn care', 'pest control', 'cleaning', 'handyman', 'painting'
  ],
  professional_services: [
    'accounting', 'accountant', 'cpa', 'bookkeeping', 'consulting', 'consultant',
    'marketing agency', 'digital marketing', 'seo', 'web design', 'it services',
    'staffing', 'recruiting', 'financial advisor', 'insurance agency'
  ],
  spa_wellness: [
    'spa', 'massage', 'yoga', 'fitness', 'salon', 'hair salon', 'nail salon',
    'beauty', 'esthetician', 'facial', 'waxing', 'tanning', 'gym',
    'personal training', 'pilates', 'meditation', 'acupuncture', 'barbershop'
  ]
};

function detectIndustryFromKeywords(content: string): { industry: string; confidence: 'high' | 'medium' | 'low'; matchedKeywords: string[] } {
  const lowerContent = content.toLowerCase();
  const scores: Record<string, { count: number; keywords: string[] }> = {};

  for (const [industryId, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    scores[industryId] = { count: 0, keywords: [] };
    
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = lowerContent.match(regex);
      if (matches) {
        scores[industryId].count += matches.length;
        if (!scores[industryId].keywords.includes(keyword)) {
          scores[industryId].keywords.push(keyword);
        }
      }
    }
  }

  let bestMatch = 'general';
  let highestScore = 0;
  let matchedKeywords: string[] = [];

  for (const [industryId, { count, keywords }] of Object.entries(scores)) {
    if (count > highestScore) {
      highestScore = count;
      bestMatch = industryId;
      matchedKeywords = keywords;
    }
  }

  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (highestScore >= 10 && matchedKeywords.length >= 3) {
    confidence = 'high';
  } else if (highestScore >= 5 && matchedKeywords.length >= 2) {
    confidence = 'medium';
  } else if (highestScore >= 2) {
    confidence = 'low';
  } else {
    bestMatch = 'general';
  }

  return { industry: bestMatch, confidence, matchedKeywords };
}

async function detectIndustryWithAI(content: string, apiKey: string): Promise<{ industry: string; confidence: 'high' | 'medium' | 'low'; reasoning: string }> {
  const prompt = `Analyze this business website content and determine the industry.

Content:
${content.substring(0, 3000)}

Respond with a JSON object containing:
- industry: one of "healthcare", "restaurant", "legal", "real_estate", "automotive", "home_services", "professional_services", "spa_wellness", or "general"
- confidence: "high", "medium", or "low"
- reasoning: brief explanation

Only respond with valid JSON.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'You are a business classification expert. Analyze content and determine the industry category.' },
          { role: 'user', content: prompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_industry",
              description: "Classify the business industry",
              parameters: {
                type: "object",
                properties: {
                  industry: { 
                    type: "string", 
                    enum: ["healthcare", "restaurant", "legal", "real_estate", "automotive", "home_services", "professional_services", "spa_wellness", "general"]
                  },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  reasoning: { type: "string" }
                },
                required: ["industry", "confidence", "reasoning"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "classify_industry" } }
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      return JSON.parse(toolCall.function.arguments);
    }

    // Fallback to content parsing
    const content_response = data.choices?.[0]?.message?.content;
    if (content_response) {
      const jsonMatch = content_response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }

    throw new Error('Could not parse AI response');
  } catch (error) {
    console.error('AI detection error:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, url, use_ai = false } = await req.json();

    if (!content && !url) {
      return new Response(
        JSON.stringify({ error: 'content or url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const textContent = content || '';
    
    // First, try keyword-based detection
    const keywordResult = detectIndustryFromKeywords(textContent);
    
    // If confidence is low and AI is requested, try AI detection
    if (use_ai && keywordResult.confidence === 'low') {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      
      if (LOVABLE_API_KEY) {
        try {
          const aiResult = await detectIndustryWithAI(textContent, LOVABLE_API_KEY);
          
          return new Response(
            JSON.stringify({
              success: true,
              industry: aiResult.industry,
              confidence: aiResult.confidence,
              detection_method: 'ai',
              reasoning: aiResult.reasoning,
              keyword_fallback: keywordResult
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (aiError) {
          console.error('AI detection failed, using keyword fallback:', aiError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        industry: keywordResult.industry,
        confidence: keywordResult.confidence,
        detection_method: 'keywords',
        matched_keywords: keywordResult.matchedKeywords
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in detect-industry:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
