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
    const { url, facility_name } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const supabaseKey = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create a job record
    const { data: job, error: jobError } = await supabase
      .from("scraping_jobs")
      .insert({
        url,
        facility_name: facility_name || "Unknown",
        status: "processing",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) {
      throw new Error(`Failed to create job: ${jobError.message}`);
    }

    // Scrape the website
    const scrapedData = await scrapeWebsite(url);

    // Update job with results
    const { error: updateError } = await supabase
      .from("scraping_jobs")
      .update({
        status: "completed",
        result: scrapedData,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    if (updateError) {
      console.error("Failed to update job:", updateError);
    }

    return new Response(
      JSON.stringify({
        job_id: job.id,
        status: "processing",
        message: "Scraping job started",
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

async function scrapeWebsite(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return {
        url,
        error: `HTTP ${response.status}`,
        facility_name: "Unknown",
        phone: [],
        address: null,
        hours: null,
        services: [],
        specialties: [],
        website_quality: { score: 0, max_score: 10, percentage: 0 },
      };
    }

    const html = await response.text();

    // Extract facility name
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const facility_name = titleMatch ? titleMatch[1].substring(0, 100) : "Unknown";

    // Extract phone numbers
    const phonePattern = /(\+?1?\s*[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g;
    const phones = [...new Set(html.match(phonePattern) || [])];

    // Extract email addresses
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = [...new Set(html.match(emailPattern) || [])];

    // Extract services (common healthcare terms)
    const services = extractServices(html);

    // Calculate website quality score
    const quality = calculateWebsiteQuality(html);

    return {
      url,
      scraped_at: new Date().toISOString(),
      facility_name,
      phone: phones.slice(0, 5),
      address: extractAddress(html),
      hours: extractHours(html),
      services: services.slice(0, 10),
      specialties: extractSpecialties(html),
      staff_info: extractStaffInfo(html),
      insurance: extractInsuranceInfo(html),
      website_quality: quality,
      contact_methods: {
        phone: phones.length > 0,
        email: emails.length > 0,
        contact_form: html.includes("contact") || html.includes("form"),
        online_booking: html.includes("book") || html.includes("appointment"),
      },
    };
  } catch (error) {
    console.error("Scraping error:", error);
    return {
      url,
      error: error.message,
      facility_name: "Unknown",
      phone: [],
      address: null,
      hours: null,
      services: [],
      specialties: [],
      website_quality: { score: 0, max_score: 10, percentage: 0 },
    };
  }
}

function extractServices(html: string): string[] {
  const services = new Set<string>();
  const serviceKeywords = [
    "primary care",
    "urgent care",
    "emergency",
    "surgery",
    "cardiology",
    "pediatrics",
    "orthopedics",
    "neurology",
    "oncology",
    "psychiatry",
    "dermatology",
    "radiology",
    "laboratory",
    "physical therapy",
    "occupational therapy",
    "mental health",
    "dental",
    "vision",
    "pharmacy",
  ];

  const lowerHtml = html.toLowerCase();
  serviceKeywords.forEach((keyword) => {
    if (lowerHtml.includes(keyword)) {
      services.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
    }
  });

  return Array.from(services);
}

function extractSpecialties(html: string): string[] {
  const specialties = new Set<string>();
  const specialtyKeywords = [
    "cardiologist",
    "neurologist",
    "oncologist",
    "orthopedic",
    "pediatrician",
    "psychiatrist",
    "dermatologist",
    "radiologist",
  ];

  const lowerHtml = html.toLowerCase();
  specialtyKeywords.forEach((keyword) => {
    if (lowerHtml.includes(keyword)) {
      specialties.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
    }
  });

  return Array.from(specialties);
}

function extractAddress(html: string): string | null {
  const addressPattern = /\d+\s+[a-zA-Z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Circle|Cir|Way|Parkway|Pkwy)/i;
  const match = html.match(addressPattern);
  return match ? match[0] : null;
}

function extractHours(html: string): object | null {
  const hoursPattern = /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[:\s]+([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM|am|pm)?)/i;
  const match = html.match(hoursPattern);
  return match ? { found: true, sample: match[0] } : null;
}

function extractStaffInfo(html: string): object {
  const staffPattern = /(?:staff|team|doctors|physicians|nurses|providers)/i;
  return {
    has_staff_info: staffPattern.test(html),
  };
}

function extractInsuranceInfo(html: string): object {
  const lowerHtml = html.toLowerCase();
  return {
    accepts_insurance: lowerHtml.includes("insurance"),
    accepts_medicare: lowerHtml.includes("medicare"),
    accepts_medicaid: lowerHtml.includes("medicaid"),
    accepts_tricare: lowerHtml.includes("tricare"),
  };
}

function calculateWebsiteQuality(html: string): object {
  let score = 0;
  const maxScore = 10;

  if (html.length > 5000) score += 2;
  if (html.includes("<meta") && html.includes("description")) score += 1;
  if (html.includes("https://")) score += 1;
  if (html.includes("contact")) score += 1;
  if (html.includes("appointment") || html.includes("book")) score += 1;
  if (html.includes("insurance") || html.includes("payment")) score += 1;
  if (html.includes("about") || html.includes("team")) score += 1;
  if (html.includes("services") || html.includes("specialties")) score += 1;
  if (html.includes("testimonial") || html.includes("review")) score += 1;
  if (html.includes("accessibility") || html.includes("wcag")) score += 1;

  score = Math.min(score, maxScore);

  return {
    score,
    max_score: maxScore,
    percentage: (score / maxScore) * 100,
  };
}
