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

    const { businessName, niche, description } = await req.json();

    if (!businessName) {
      throw new Error("Business name is required");
    }

    console.log(`Auditing revenue leak for: ${businessName} (${niche || 'general'})`);

    // Step 1: Classify if this is a medical/healthcare business
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

    // Call Gemini to classify the business
    const classificationResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: classificationPrompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 512 }
        }),
      }
    );

    if (!classificationResponse.ok) {
      const errorText = await classificationResponse.text();
      console.error("Gemini classification error:", classificationResponse.status, errorText);
      throw new Error(`Gemini API error: ${classificationResponse.status}`);
    }

    const classificationData = await classificationResponse.json();
    const classificationText = classificationData.candidates?.[0]?.content?.parts?.[0]?.text;
    
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

    // Step 3: Use Gemini with Google Search to find administrative bottlenecks
    const auditPrompt = `You are a healthcare revenue leak analyst specializing in identifying administrative bottlenecks. Your task is to find REAL complaints about operational and administrative issues for a specific medical facility.

Business Name: ${businessName}
Medical Category: ${classification.medicalCategory}
Facility Type: ${facilityType} (Cost per missed patient: $${costPerLead})

INSTRUCTIONS:
1. Search Google for real reviews and complaints about "${businessName}" related to ADMINISTRATIVE BOTTLENECKS common in ${classification.medicalCategory} practices, such as:
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

2. Look at Google Reviews, Yelp, Healthgrades, Vitals, ZocDoc, and other healthcare review sites.

3. Based on REAL evidence you find, provide:

PAIN SCORE (1-10):
- 1-3: Few complaints, operations seem smooth
- 4-6: Moderate complaints, some patients frustrated with administrative processes
- 7-10: Significant complaints, major administrative bottlenecks affecting patient experience and retention

EVIDENCE:
Provide exactly 2 specific quotes or detailed summaries of actual complaints you found online. Focus on the most common bottleneck type for ${classification.medicalCategory} practices.

CALCULATED LEAK:
Estimate monthly revenue loss based on:
- Medical Category: ${classification.medicalCategory}
- Cost per missed/lost patient: $${costPerLead}
- For pain score 1-3: estimate 5-10 missed patients/month
- For pain score 4-6: estimate 15-30 missed patients/month  
- For pain score 7-10: estimate 40-100+ missed patients/month

Respond in this exact JSON format:
{
  "painScore": <number 1-10>,
  "evidence": [
    "<first quote or summary of real complaint found>",
    "<second quote or summary of real complaint found>"
  ],
  "calculatedLeak": <estimated monthly dollar loss as number>,
  "calculatedLeakExplanation": "<brief explanation including medical category and cost per patient>",
  "bottleneckType": "<primary bottleneck category: Wait Times, Billing Issues, Staff Accessibility, Scheduling, Communication, Insurance/Payment, Records/Referrals>"
}`;

    // Call Gemini API with Google Search grounding enabled for audit
    const auditResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: auditPrompt }] }],
          tools: [{ googleSearch: {} }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
        }),
      }
    );

    if (!auditResponse.ok) {
      const errorText = await auditResponse.text();
      console.error("Gemini audit API error:", auditResponse.status, errorText);
      throw new Error(`Gemini API error: ${auditResponse.status}`);
    }

    const auditData = await auditResponse.json();
    console.log("Gemini audit response received");

    // Extract the text content from Gemini response
    const auditTextContent = auditData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!auditTextContent) {
      console.error("No text content in audit response:", JSON.stringify(auditData));
      throw new Error("No response from Gemini");
    }

    // Parse the JSON response from Gemini
    let auditResult;
    try {
      const jsonMatch = auditTextContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        auditResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not find JSON in response");
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", auditTextContent);
      auditResult = {
        painScore: 5,
        evidence: [
          "Unable to find specific reviews - using industry average estimates",
          "Consider checking Google Reviews directly for more accurate data"
        ],
        calculatedLeak: 15 * costPerLead,
        calculatedLeakExplanation: `Based on industry average of 15 missed patients/month at $${costPerLead} per patient (${classification.medicalCategory})`,
        bottleneckType: "Unknown"
      };
    }

    // Validate and normalize the response
    const result = {
      status: 'SUCCESS',
      painScore: Math.min(10, Math.max(1, Number(auditResult.painScore) || 5)),
      evidence: Array.isArray(auditResult.evidence) 
        ? auditResult.evidence.slice(0, 2) 
        : ["No specific complaints found", "Consider manual review"],
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
