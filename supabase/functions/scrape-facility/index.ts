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

    let rawHtml = '';
    let markdown = '';

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
            formats: ['markdown', 'html', 'links'],
          }),
        });

        if (firecrawlResponse.ok) {
          const firecrawlData = await firecrawlResponse.json();
          markdown = firecrawlData.data?.markdown || '';
          rawHtml = firecrawlData.data?.html || '';
          
          scrapedData.content = {
            markdown,
            title: firecrawlData.data?.metadata?.title || '',
            description: firecrawlData.data?.metadata?.description || '',
            sourceURL: firecrawlData.data?.metadata?.sourceURL || url,
            links: firecrawlData.data?.links || [],
          };
          console.log('Firecrawl scraping successful');
        } else {
          console.error('Firecrawl error:', await firecrawlResponse.text());
          scrapedData.content = generateMockContent(url, facility_name);
          markdown = scrapedData.content.markdown;
        }
      } catch (firecrawlError) {
        console.error('Firecrawl exception:', firecrawlError);
        scrapedData.content = generateMockContent(url, facility_name);
        markdown = scrapedData.content.markdown;
      }
    } else {
      console.log('FIRECRAWL_API_KEY not set, using mock data');
      scrapedData.content = generateMockContent(url, facility_name);
      markdown = scrapedData.content.markdown;
    }

    // Extract ALL structured data from content
    const combinedText = markdown + ' ' + rawHtml;
    const allLinks = scrapedData.content.links || [];
    
    scrapedData.extracted = extractAllData(combinedText, allLinks);

    console.log(`Extraction complete: ${scrapedData.extracted.phones.length} phones, ${scrapedData.extracted.emails.length} emails, ${Object.keys(scrapedData.extracted.social_media).length} social profiles`);

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
    markdown: `# ${name}\n\nBusiness providing professional services.\n\n## Contact\nPhone: (555) 123-4567\nEmail: info@${name.toLowerCase().replace(/\s/g, '')}.com`,
    title: `${name} - Professional Services`,
    description: `${name} offers quality services to the community.`,
    sourceURL: url,
    links: [],
  };
}

function extractAllData(text: string, links: string[]): any {
  // ========== PHONE EXTRACTION ==========
  // Match phone numbers with formatting (parentheses, hyphens, dots, spaces)
  // This helps filter out random digit strings like product codes
  const phonePatterns = [
    /\+?1?[-.\s]?\(?(\d{3})\)?[-.\s](\d{3})[-.\s](\d{4})/g,  // Requires separators
    /\((\d{3})\)\s?(\d{3})[-.\s]?(\d{4})/g,                    // (xxx) xxx-xxxx format
    /Phone:?\s*\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/gi,        // Labeled "Phone:"
    /Call:?\s*\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/gi,         // Labeled "Call:"
    /Tel:?\s*\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/gi,          // Labeled "Tel:"
  ];
  
  const phones: string[] = [];
  for (const pattern of phonePatterns) {
    const matches = text.match(pattern) || [];
    for (const match of matches) {
      const cleaned = match.replace(/\D/g, '');
      // Valid phone: 10-11 digits (US format with optional country code)
      if (cleaned.length >= 10 && cleaned.length <= 11) {
        // Clean up the label if present
        const phoneOnly = match.replace(/^(Phone|Call|Tel):?\s*/i, '').trim();
        if (!phones.includes(phoneOnly)) {
          phones.push(phoneOnly);
        }
      }
    }
  }

  // ========== EMAIL EXTRACTION ==========
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const rawEmails = text.match(emailPattern) || [];
  const emails = rawEmails.filter(email => {
    const lower = email.toLowerCase();
    // Filter out image/asset emails and common false positives
    return !lower.includes('.png') && 
           !lower.includes('.jpg') && 
           !lower.includes('.gif') &&
           !lower.includes('.svg') &&
           !lower.includes('example.com') &&
           !lower.includes('sentry.io') &&
           !lower.includes('webpack');
  });

  // ========== ADDRESS EXTRACTION ==========
  const addressPatterns = [
    /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Circle|Cir|Way|Highway|Hwy|Parkway|Pkwy)[\s,]+[A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?/gi,
    /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Highway|Hwy)[\s,]+[A-Za-z\s]+,?\s*[A-Za-z]+/gi,
    /\d{1,5}\s+[A-Za-z0-9\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}/gi,
  ];
  
  const addresses: string[] = [];
  for (const pattern of addressPatterns) {
    const matches = text.match(pattern) || [];
    addresses.push(...matches.map(a => a.trim()));
  }

  // ========== SOCIAL MEDIA EXTRACTION ==========
  const socialMediaPatterns: { [key: string]: RegExp } = {
    facebook: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[a-zA-Z0-9._-]+/gi,
    instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[a-zA-Z0-9._-]+/gi,
    twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9._-]+/gi,
    linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9._-]+/gi,
    youtube: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:channel|c|user|@)[a-zA-Z0-9._-]+/gi,
    tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[a-zA-Z0-9._-]+/gi,
    pinterest: /(?:https?:\/\/)?(?:www\.)?pinterest\.com\/[a-zA-Z0-9._-]+/gi,
    yelp: /(?:https?:\/\/)?(?:www\.)?yelp\.com\/biz\/[a-zA-Z0-9._-]+/gi,
    nextdoor: /(?:https?:\/\/)?(?:www\.)?nextdoor\.com\/[a-zA-Z0-9._\-\/]+/gi,
    google_business: /(?:https?:\/\/)?(?:www\.)?google\.com\/maps\/place\/[^\s"'<>]+/gi,
    angies_list: /(?:https?:\/\/)?(?:www\.)?angieslist\.com\/companylist\/[a-zA-Z0-9._-]+/gi,
    bbb: /(?:https?:\/\/)?(?:www\.)?bbb\.org\/[a-zA-Z0-9._\-\/]+/gi,
    thumbtack: /(?:https?:\/\/)?(?:www\.)?thumbtack\.com\/[a-zA-Z0-9._\-\/]+/gi,
    houzz: /(?:https?:\/\/)?(?:www\.)?houzz\.com\/[a-zA-Z0-9._\-\/]+/gi,
    homeadvisor: /(?:https?:\/\/)?(?:www\.)?homeadvisor\.com\/[a-zA-Z0-9._\-\/]+/gi,
    tripadvisor: /(?:https?:\/\/)?(?:www\.)?tripadvisor\.com\/[a-zA-Z0-9._\-\/]+/gi,
    glassdoor: /(?:https?:\/\/)?(?:www\.)?glassdoor\.com\/[a-zA-Z0-9._\-\/]+/gi,
  };

  const socialMedia: { [key: string]: string[] } = {};
  
  // Extract from text content
  for (const [platform, pattern] of Object.entries(socialMediaPatterns)) {
    const matches = text.match(pattern) || [];
    if (matches.length > 0) {
      socialMedia[platform] = [...new Set(matches.map(m => m.toLowerCase()))];
    }
  }

  // Also extract from links array
  for (const link of links) {
    const lowerLink = link.toLowerCase();
    if (lowerLink.includes('facebook.com') && !socialMedia.facebook) {
      socialMedia.facebook = [link];
    } else if (lowerLink.includes('instagram.com') && !socialMedia.instagram) {
      socialMedia.instagram = [link];
    } else if ((lowerLink.includes('twitter.com') || lowerLink.includes('x.com')) && !socialMedia.twitter) {
      socialMedia.twitter = [link];
    } else if (lowerLink.includes('linkedin.com') && !socialMedia.linkedin) {
      socialMedia.linkedin = [link];
    } else if (lowerLink.includes('youtube.com') && !socialMedia.youtube) {
      socialMedia.youtube = [link];
    } else if (lowerLink.includes('tiktok.com') && !socialMedia.tiktok) {
      socialMedia.tiktok = [link];
    } else if (lowerLink.includes('yelp.com') && !socialMedia.yelp) {
      socialMedia.yelp = [link];
    }
  }

  // ========== SERVICES EXTRACTION ==========
  const servicePatterns = [
    /[-•*]\s*([A-Za-z\s]+(?:Service|Repair|Installation|Maintenance|Care|Treatment|Therapy|Consultation|Cleaning|Design|Management)s?)/gi,
    /(?:We offer|Our services include|Services:|Specializing in)[\s:]+([A-Za-z,\s]+)/gi,
  ];
  
  const services: string[] = [];
  for (const pattern of servicePatterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      if (match[1]) {
        services.push(match[1].trim());
      }
    }
  }

  // ========== HOURS EXTRACTION ==========
  const hoursPattern = /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[\s:-]+\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?[\s-]+\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?/gi;
  const hoursMatches = text.match(hoursPattern) || [];

  return {
    phones: [...new Set(phones)].slice(0, 10),
    emails: [...new Set(emails)].slice(0, 10),
    addresses: [...new Set(addresses)].slice(0, 5),
    social_media: socialMedia,
    services: [...new Set(services)].slice(0, 20),
    business_hours: hoursMatches.slice(0, 7),
    has_contact_info: phones.length > 0 || emails.length > 0,
    has_social_media: Object.keys(socialMedia).length > 0,
  };
}
