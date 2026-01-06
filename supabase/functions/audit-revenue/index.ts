import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const { businessName, niche } = await req.json();

    if (!businessName) {
      throw new Error("Business name is required");
    }

    console.log(`Auditing revenue leak for: ${businessName} (${niche || 'general'})`);

    // Determine facility type and cost per missed lead
    const nicheLower = (niche || '').toLowerCase();
    let facilityType = 'general';
    let costPerLead = 150; // Default: General Practice/Clinic
    
    if (nicheLower.includes('surgery') || nicheLower.includes('cardio') || nicheLower.includes('cardiac') || 
        nicheLower.includes('orthopedic') || nicheLower.includes('specialist') || nicheLower.includes('oncolog') ||
        nicheLower.includes('neurology') || nicheLower.includes('urolog')) {
      facilityType = 'specialist';
      costPerLead = 500;
    } else if (nicheLower.includes('therapy') || nicheLower.includes('wellness') || nicheLower.includes('massage') ||
               nicheLower.includes('chiropractic') || nicheLower.includes('acupuncture') || nicheLower.includes('mental health') ||
               nicheLower.includes('counseling') || nicheLower.includes('physical therapy') || nicheLower.includes('spa')) {
      facilityType = 'therapy';
      costPerLead = 100;
    }

    console.log(`Facility type: ${facilityType}, Cost per lead: $${costPerLead}`);

    // Use Gemini with Google Search grounding to find real administrative bottlenecks
    const prompt = `You are a business revenue leak analyst specializing in identifying administrative bottlenecks. Your task is to find REAL complaints about operational and administrative issues for a specific business.

Business Name: ${businessName}
Industry/Niche: ${niche || 'local business'}
Facility Type: ${facilityType} (Cost per missed lead: $${costPerLead})

INSTRUCTIONS:
1. Search Google for real reviews and complaints about "${businessName}" related to ADMINISTRATIVE BOTTLENECKS common in ${niche || 'this type of business'}, such as:
   - Long wait times (in-office, on phone, for appointments)
   - Billing confusion or billing disputes
   - Hard-to-reach staff or unresponsive front desk
   - Scheduling difficulties or appointment availability
   - Insurance/payment processing issues
   - Poor communication about results, follow-ups, or next steps
   - Complicated intake/registration process
   - Difficulty getting referrals or records
   - Online portal issues
   - Prescription refill problems

2. Look at Google Reviews, Yelp, BBB, Facebook reviews, Healthgrades, Vitals, and other review sites.

3. Based on REAL evidence you find, provide:

PAIN SCORE (1-10):
- 1-3: Few complaints, operations seem smooth
- 4-6: Moderate complaints, some customers frustrated with administrative processes
- 7-10: Significant complaints, major administrative bottlenecks affecting customer experience and retention

EVIDENCE:
Provide exactly 2 specific quotes or detailed summaries of actual complaints you found online about their administrative issues. Focus on the most common bottleneck type for this specific niche. If you cannot find specific complaints, note that and estimate based on industry averages for ${niche || 'similar businesses'}.

CALCULATED LEAK:
Estimate monthly revenue loss based on:
- Facility Type: ${facilityType}
- Cost per missed/lost lead: $${costPerLead}
- For pain score 1-3: estimate 5-10 missed leads/month
- For pain score 4-6: estimate 15-30 missed leads/month  
- For pain score 7-10: estimate 40-100+ missed leads/month

BOTTLENECK TYPE:
Identify the PRIMARY administrative bottleneck category (e.g., "Wait Times", "Billing Issues", "Staff Accessibility", "Scheduling", "Communication", "Insurance/Payment", "Records/Referrals").

Respond in this exact JSON format:
{
  "painScore": <number 1-10>,
  "evidence": [
    "<first quote or summary of real complaint found>",
    "<second quote or summary of real complaint found>"
  ],
  "calculatedLeak": <estimated monthly dollar loss as number>,
  "calculatedLeakExplanation": "<brief explanation including facility type and cost per lead>",
  "bottleneckType": "<primary bottleneck category>",
  "facilityType": "${facilityType}",
  "costPerLead": ${costPerLead}
}`;

    // Call Gemini API with Google Search grounding enabled
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          tools: [
            {
              googleSearch: {}
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Gemini response received");

    // Extract the text content from Gemini response
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) {
      console.error("No text content in response:", JSON.stringify(data));
      throw new Error("No response from Gemini");
    }

    // Parse the JSON response from Gemini
    let auditResult;
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        auditResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not find JSON in response");
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", textContent);
      // Provide a fallback response if parsing fails
      auditResult = {
        painScore: 5,
        evidence: [
          "Unable to find specific reviews - using industry average estimates",
          "Consider checking Google Reviews directly for more accurate data"
        ],
        calculatedLeak: 15 * costPerLead,
        calculatedLeakExplanation: `Based on industry average of 15 missed leads/month at $${costPerLead} per lead (${facilityType})`,
        bottleneckType: "Unknown",
        facilityType: facilityType,
        costPerLead: costPerLead
      };
    }

    // Validate and normalize the response
    const result = {
      painScore: Math.min(10, Math.max(1, Number(auditResult.painScore) || 5)),
      evidence: Array.isArray(auditResult.evidence) 
        ? auditResult.evidence.slice(0, 2) 
        : ["No specific complaints found", "Consider manual review"],
      calculatedLeak: Number(auditResult.calculatedLeak) || 0,
      calculatedLeakExplanation: auditResult.calculatedLeakExplanation || "",
      bottleneckType: auditResult.bottleneckType || "Administrative",
      facilityType: auditResult.facilityType || facilityType,
      costPerLead: auditResult.costPerLead || costPerLead
    };

    console.log(`Audit complete for ${businessName}: Pain Score ${result.painScore}, Leak $${result.calculatedLeak}/month`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in audit-revenue function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
