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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { businessName, niche, description } = await req.json();

    if (!businessName) {
      throw new Error("Business name is required");
    }

    console.log(`Auditing revenue leak for: ${businessName} (${niche || 'general'})`);

    // Step 1: Classify if this is a medical/healthcare business using Lovable AI
    const classificationPrompt = `You are a business classifier. Analyze the following business and determine if it is a MEDICAL/HEALTHCARE facility.

Business Name: ${businessName}
Description: ${description || 'No description provided'}
Provided Niche: ${niche || 'Unknown'}

MEDICAL/HEALTHCARE includes:
- Hospitals, Clinics, Urgent Care
- Doctor's offices (any specialty: Pediatrics, Cardiology, Orthopedics, etc.)
- Dental practices
- Mental health / Counseling / Psychiatry
- Physical Therapy / Occupational Therapy
- Chiropractic / Acupuncture
- MedSpas / Aesthetic medicine
- Optometry / Ophthalmology  
- Pharmacy
- Home health / Nursing
- Veterinary clinics
- Lab / Diagnostic centers
- Rehabilitation centers

NOT MEDICAL includes:
- Retail stores
- Restaurants / Food service
- General wellness (gyms, yoga studios without medical component)
- Beauty salons (non-medical)
- Legal, accounting, or other professional services
- Manufacturing / Industrial
- Real estate
- Education (non-medical)
- Chambers of Commerce / Business associations
- Churches / Religious organizations

Respond in this exact JSON format:
{
  "isMedical": <true or false>,
  "medicalCategory": "<specific category if medical, e.g., 'Pediatrics', 'Urgent Care', 'Dental', 'Cardiology', 'MedSpa', 'Mental Health', 'Physical Therapy', etc. Use null if not medical>",
  "facilityType": "<'specialist' | 'general' | 'therapy' based on category. Use null if not medical>",
  "confidence": "<'high' | 'medium' | 'low'>",
  "reasoning": "<brief explanation>"
}`;

    // Call Lovable AI Gateway to classify the business
    const classificationResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a business classifier. Always respond with valid JSON only." },
            { role: "user", content: classificationPrompt }
          ],
          temperature: 0.1,
        }),
      }
    );

    if (!classificationResponse.ok) {
      if (classificationResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (classificationResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await classificationResponse.text();
      console.error("AI Gateway classification error:", classificationResponse.status, errorText);
      throw new Error(`AI Gateway error: ${classificationResponse.status}`);
    }

    const classificationData = await classificationResponse.json();
    const classificationText = classificationData.choices?.[0]?.message?.content;
    
    let classification;
    try {
      const jsonMatch = classificationText?.match(/\{[\s\S]*\}/);
      classification = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
      console.error("Failed to parse classification:", classificationText);
      classification = null;
    }

    // If not medical, return NICHE_MISMATCH
    if (!classification || !classification.isMedical) {
      console.log(`Business "${businessName}" is not medical. Returning NICHE_MISMATCH.`);
      return new Response(JSON.stringify({ 
        status: 'NICHE_MISMATCH',
        message: 'This business does not appear to be a medical/healthcare facility.',
        reasoning: classification?.reasoning || 'Could not classify business type',
        detectedCategory: classification?.medicalCategory || null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Determine facility type and cost per missed lead based on medical category
    const medicalCategory = (classification.medicalCategory || '').toLowerCase();
    let facilityType = classification.facilityType || 'general';
    let costPerLead = 150; // Default: General Practice/Clinic
    
    // Specialist: Surgery, Cardiology, Oncology, Orthopedics, Neurology, Urology, etc.
    if (facilityType === 'specialist' || 
        medicalCategory.includes('surgery') || medicalCategory.includes('cardio') || 
        medicalCategory.includes('oncolog') || medicalCategory.includes('orthoped') ||
        medicalCategory.includes('neurolog') || medicalCategory.includes('urolog') ||
        medicalCategory.includes('gastro') || medicalCategory.includes('pulmon') ||
        medicalCategory.includes('ophthalmolog') || medicalCategory.includes('dermatolog')) {
      facilityType = 'specialist';
      costPerLead = 500;
    } 
    // Therapy/Wellness: Mental health, PT, Chiropractic, MedSpa, etc.
    else if (facilityType === 'therapy' ||
             medicalCategory.includes('therapy') || medicalCategory.includes('mental') ||
             medicalCategory.includes('counseling') || medicalCategory.includes('psychiatr') ||
             medicalCategory.includes('chiropractic') || medicalCategory.includes('acupuncture') ||
             medicalCategory.includes('medspa') || medicalCategory.includes('aesthetic') ||
             medicalCategory.includes('wellness') || medicalCategory.includes('rehab')) {
      facilityType = 'therapy';
      costPerLead = 100;
    }
    // General: Urgent care, primary care, pediatrics, dental, etc.
    else {
      facilityType = 'general';
      costPerLead = 150;
    }

    console.log(`Medical category: ${classification.medicalCategory}, Facility type: ${facilityType}, Cost per lead: $${costPerLead}`);

    // Step 3: Use Lovable AI to analyze potential administrative bottlenecks
    const auditPrompt = `You are a healthcare revenue leak analyst specializing in identifying administrative bottlenecks. Analyze this medical facility and estimate potential revenue leak.

Business Name: ${businessName}
Medical Category: ${classification.medicalCategory}
Facility Type: ${facilityType} (Cost per missed patient: $${costPerLead})

Based on common issues in ${classification.medicalCategory} practices, estimate:

1. PAIN SCORE (1-10):
   - 1-3: Few typical complaints, operations seem smooth
   - 4-6: Moderate issues common to this specialty
   - 7-10: Significant bottlenecks likely affecting patient experience

2. COMMON BOTTLENECKS for ${classification.medicalCategory}:
   - Wait times (in-office, on phone, for appointments)
   - Billing confusion or billing disputes
   - Hard-to-reach staff or unresponsive front desk
   - Scheduling difficulties or appointment availability
   - Insurance/payment processing issues
   - Poor communication about results, follow-ups
   - Complicated intake/registration process

3. CALCULATED LEAK:
   - For pain score 1-3: estimate 5-10 missed patients/month
   - For pain score 4-6: estimate 15-30 missed patients/month  
   - For pain score 7-10: estimate 40-100+ missed patients/month
   - Multiply by cost per patient: $${costPerLead}

Respond in this exact JSON format:
{
  "painScore": <number 1-10>,
  "evidence": [
    "<common issue #1 for this specialty>",
    "<common issue #2 for this specialty>"
  ],
  "calculatedLeak": <estimated monthly dollar loss as number>,
  "calculatedLeakExplanation": "<brief explanation>",
  "bottleneckType": "<primary bottleneck category>"
}`;

    // Call Lovable AI Gateway for audit analysis
    const auditResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a healthcare revenue analyst. Always respond with valid JSON only." },
            { role: "user", content: auditPrompt }
          ],
          temperature: 0.3,
        }),
      }
    );

    if (!auditResponse.ok) {
      if (auditResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (auditResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await auditResponse.text();
      console.error("AI Gateway audit error:", auditResponse.status, errorText);
      throw new Error(`AI Gateway error: ${auditResponse.status}`);
    }

    const auditData = await auditResponse.json();
    const auditTextContent = auditData.choices?.[0]?.message?.content;
    
    if (!auditTextContent) {
      console.error("No content in audit response");
      throw new Error("No response from AI");
    }

    // Parse the JSON response
    let auditResult;
    try {
      const jsonMatch = auditTextContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        auditResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not find JSON in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", auditTextContent);
      auditResult = {
        painScore: 5,
        evidence: [
          "Common scheduling challenges typical for this specialty",
          "Standard billing complexity issues"
        ],
        calculatedLeak: 15 * costPerLead,
        calculatedLeakExplanation: `Based on industry average of 15 missed patients/month at $${costPerLead} per patient (${classification.medicalCategory})`,
        bottleneckType: "Administrative"
      };
    }

    // Validate and normalize the response
    const result = {
      status: 'SUCCESS',
      painScore: Math.min(10, Math.max(1, Number(auditResult.painScore) || 5)),
      evidence: Array.isArray(auditResult.evidence) 
        ? auditResult.evidence.slice(0, 2) 
        : ["No specific issues identified", "Consider manual review"],
      calculatedLeak: Number(auditResult.calculatedLeak) || 0,
      calculatedLeakExplanation: auditResult.calculatedLeakExplanation || "",
      bottleneckType: auditResult.bottleneckType || "Administrative",
      medicalCategory: classification.medicalCategory,
      facilityType: facilityType,
      costPerLead: costPerLead
    };

    console.log(`Audit complete for ${businessName}: Category ${classification.medicalCategory}, Pain Score ${result.painScore}, Leak $${result.calculatedLeak}/month`);

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
