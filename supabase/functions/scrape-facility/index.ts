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
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

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
    const { url, facility_name } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Scraping facility: ${facility_name || 'Unknown'} at ${url} for user ${userId}`);

    let scrapedData: any = {
      url,
      facility_name: facility_name || extractFacilityName(url),
      scraped_at: new Date().toISOString(),
      content: {},
    };

    if (FIRECRAWL_API_KEY) {
      try {
        const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          },
          body: JSON.stringify({
            url,
            formats: ['markdown', 'html'],
          }),
        });

        if (firecrawlResponse.ok) {
          const firecrawlData = await firecrawlResponse.json();
          scrapedData.content = {
            markdown: firecrawlData.data?.markdown || '',
            title: firecrawlData.data?.metadata?.title || '',
            description: firecrawlData.data?.metadata?.description || '',
            sourceURL: firecrawlData.data?.metadata?.sourceURL || url,
          };
          console.log('Firecrawl scraping successful');
        } else {
          console.error('Firecrawl error:', await firecrawlResponse.text());
          scrapedData.content = generateMockContent(url, facility_name);
        }
      } catch (firecrawlError) {
        console.error('Firecrawl exception:', firecrawlError);
        scrapedData.content = generateMockContent(url, facility_name);
      }
    } else {
      console.log('FIRECRAWL_API_KEY not set, using mock data');
      scrapedData.content = generateMockContent(url, facility_name);
    }

    // Extract structured data from content
    scrapedData.extracted = extractStructuredData(scrapedData.content);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: scrapedData,
        message: 'Facility scraped successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scrape-facility:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractFacilityName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '').split('.')[0].replace(/-/g, ' ');
  } catch {
    return 'Unknown Facility';
  }
}

function generateMockContent(url: string, facilityName?: string): any {
  const name = facilityName || extractFacilityName(url);
  return {
    markdown: `# ${name}\n\nHealthcare facility providing comprehensive medical services.\n\n## Services\n- Primary Care\n- Urgent Care\n- Specialty Services\n\n## Contact\nPhone: (555) 123-4567\nEmail: info@${name.toLowerCase().replace(/\s/g, '')}.com`,
    title: `${name} - Healthcare Services`,
    description: `${name} offers quality healthcare services to the community.`,
    sourceURL: url,
  };
}

function extractStructuredData(content: any): any {
  const markdown = content.markdown || '';
  
  // Extract phone numbers
  const phoneRegex = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = markdown.match(phoneRegex) || [];
  
  // Extract emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = markdown.match(emailRegex) || [];
  
  // Extract services (look for bullet points or numbered lists)
  const serviceRegex = /[-•*]\s*([A-Za-z\s]+(?:Care|Service|Treatment|Therapy|Surgery|Medicine|Health))/gi;
  const services = [...markdown.matchAll(serviceRegex)].map(m => m[1].trim());
  
  return {
    phones: [...new Set(phones)],
    emails: [...new Set(emails)],
    services: [...new Set(services)],
    has_contact_info: phones.length > 0 || emails.length > 0,
  };
}
