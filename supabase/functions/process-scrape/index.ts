import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    
    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Job ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('scraping_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('Error fetching job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to processing
    await supabase
      .from('scraping_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    console.log(`Processing job ${jobId} for URL: ${job.url}`);

    // Scrape the website using Firecrawl
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: job.url,
        formats: ['markdown', 'html'],
      }),
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error('Firecrawl error:', errorText);
      
      await supabase
        .from('scraping_jobs')
        .update({ 
          status: 'failed',
          results: [{ error: 'Failed to scrape website', details: errorText }]
        })
        .eq('id', jobId);

      // Send failure notification
      await sendNotifications(supabase, job, jobId, 'failed', 0, errorText);

      return new Response(
        JSON.stringify({ error: 'Scraping failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scrapeData = await scrapeResponse.json();
    console.log('Scrape successful, extracting data...');

    // Extract data based on scrape type
    let results: any[] = [];
    const markdownContent = scrapeData.data?.markdown || '';
    const htmlContent = scrapeData.data?.html || '';

    switch (job.scrape_type) {
      case 'emails':
        results = extractEmails(markdownContent);
        break;
      case 'phone_numbers':
        results = extractPhoneNumbers(markdownContent);
        break;
      case 'text_content':
        results = extractTextContent(markdownContent);
        break;
      case 'tables':
        results = extractTables(htmlContent);
        break;
      case 'custom_ai_extraction':
        results = await extractWithAI(markdownContent, job.ai_instructions);
        break;
      case 'complete_business_data':
        // Run ALL extractors simultaneously and merge results
        results = await extractCompleteBusinessData(markdownContent, htmlContent, job.url);
        break;
      default:
        results = [{ content: markdownContent }];
    }

    console.log(`Extracted ${results.length} results`);

    // Save results to database
    const { error: updateError } = await supabase
      .from('scraping_jobs')
      .update({ 
        status: 'completed',
        results: results
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Error updating job:', updateError);
      throw updateError;
    }

    // Send success notifications
    await sendNotifications(supabase, job, jobId, 'completed', results.length);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-scrape:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to send notifications
async function sendNotifications(
  supabase: any, 
  job: any, 
  jobId: string, 
  status: 'completed' | 'failed',
  resultsCount: number,
  errorMessage?: string
) {
  const formatScrapeType = (type: string) => {
    return type.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  // Send email notification
  try {
    await supabase.functions.invoke('send-job-notification', {
      body: {
        userId: job.user_id,
        jobId: jobId,
        jobUrl: job.url,
        scrapeType: job.scrape_type,
        status: status,
        resultsCount: resultsCount,
        errorMessage: errorMessage,
      }
    });
    console.log(`${status} notification email sent`);
  } catch (emailError) {
    console.error('Failed to send notification email:', emailError);
  }

  // Create in-app notification
  try {
    const message = status === 'completed'
      ? `${formatScrapeType(job.scrape_type)} completed with ${resultsCount} results from ${job.url.substring(0, 50)}...`
      : `${formatScrapeType(job.scrape_type)} failed for ${job.url.substring(0, 50)}...`;

    await supabase
      .from('notifications')
      .insert({
        user_id: job.user_id,
        job_id: jobId,
        type: job.schedule_enabled ? `scheduled_job_${status}` : `job_${status}`,
        title: status === 'completed' ? 'Scraping Job Completed' : 'Scraping Job Failed',
        message: message
      });
    console.log('In-app notification created');
  } catch (notifError) {
    console.error('Failed to create in-app notification:', notifError);
  }
}

// ============= EXTRACTION FUNCTIONS =============

function extractEmails(content: string): any[] {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = content.match(emailRegex) || [];
  const uniqueEmails = [...new Set(emails)];
  return uniqueEmails.map(email => ({ email, source: 'regex' }));
}

function extractPhoneNumbers(content: string): any[] {
  // Match various phone number formats
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = content.match(phoneRegex) || [];
  const uniquePhones = [...new Set(phones)];
  return uniquePhones.map(phone => ({ phone_number: phone.trim(), source: 'regex' }));
}

function extractTextContent(content: string): any[] {
  const paragraphs = content
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  return paragraphs.map((text, index) => ({ 
    paragraph: index + 1,
    text: text.substring(0, 500)
  }));
}

function extractTables(html: string): any[] {
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables = html.match(tableRegex) || [];
  
  if (tables.length === 0) {
    return [{ message: 'No tables found on this page' }];
  }

  return tables.map((table, index) => {
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows = [...table.matchAll(rowRegex)];
    
    return {
      table_number: index + 1,
      row_count: rows.length,
      preview: table.substring(0, 200).replace(/<[^>]*>/g, ' ').trim()
    };
  });
}

// Clean URL by removing trailing punctuation and markdown artifacts
function cleanUrl(url: string): string {
  return url
    .replace(/['"<>]/g, '')
    .replace(/[\)\]\}]+$/, '') // Remove trailing ), ], }
    .replace(/[,;.!?]+$/, '') // Remove trailing punctuation
    .trim();
}

// Extract social media links from content
function extractSocialLinks(content: string, html: string): Record<string, string> {
  const socialPatterns = {
    facebook: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[^\s"'<>]+/gi,
    instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[^\s"'<>]+/gi,
    twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[^\s"'<>]+/gi,
    linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/[^\s"'<>]+/gi,
    youtube: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:channel|c|user|@)[^\s"'<>]+/gi,
    tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[^\s"'<>]+/gi,
    pinterest: /(?:https?:\/\/)?(?:www\.)?pinterest\.com\/[^\s"'<>]+/gi,
  };

  const combinedContent = content + ' ' + html;
  const socialLinks: Record<string, string> = {};

  for (const [platform, regex] of Object.entries(socialPatterns)) {
    const matches = combinedContent.match(regex);
    if (matches && matches.length > 0) {
      const cleanedUrl = cleanUrl(matches[0]);
      socialLinks[platform] = cleanedUrl.startsWith('http') ? cleanedUrl : `https://${cleanedUrl}`;
    }
  }

  return socialLinks;
}

// Extract addresses using regex patterns
function extractAddresses(content: string): string[] {
  // Match common US address patterns
  const addressPatterns = [
    /\d{1,5}\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl|highway|hwy)[\s,]+[\w\s]+,?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?/gi,
    /\d{1,5}\s+[\w\s]+,\s*[\w\s]+,\s*[A-Z]{2}\s*\d{5}/gi,
  ];

  const addresses: string[] = [];
  for (const pattern of addressPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      addresses.push(...matches.map(a => a.trim()));
    }
  }

  return [...new Set(addresses)];
}

// Extract Google Maps URLs
function extractGoogleMapsData(html: string): { embedUrl: string; placeId: string; coordinates: { lat: string; lng: string } } | null {
  // Look for Google Maps embed iframes
  const iframeRegex = /<iframe[^>]*src=["']([^"']*google\.com\/maps[^"']*)["'][^>]*>/gi;
  const matches = [...html.matchAll(iframeRegex)];
  
  if (matches.length > 0) {
    const embedUrl = matches[0][1];
    
    // Try to extract place ID
    const placeIdMatch = embedUrl.match(/place_id[=:]([^&"']+)/i);
    const placeId = placeIdMatch ? placeIdMatch[1] : '';
    
    // Try to extract coordinates
    const coordsMatch = embedUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    const coordinates = coordsMatch 
      ? { lat: coordsMatch[1], lng: coordsMatch[2] }
      : { lat: '', lng: '' };
    
    return { embedUrl, placeId, coordinates };
  }

  // Also check for Google Maps links
  const linkRegex = /https?:\/\/(?:www\.)?google\.com\/maps[^\s"'<>]*/gi;
  const linkMatches = html.match(linkRegex);
  
  if (linkMatches && linkMatches.length > 0) {
    const url = linkMatches[0];
    const placeIdMatch = url.match(/place_id[=:]([^&"']+)/i);
    const coordsMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    
    return {
      embedUrl: url,
      placeId: placeIdMatch ? placeIdMatch[1] : '',
      coordinates: coordsMatch 
        ? { lat: coordsMatch[1], lng: coordsMatch[2] }
        : { lat: '', lng: '' }
    };
  }

  return null;
}

// Extract website URLs from content
function extractWebsites(content: string, sourceUrl: string): string[] {
  const urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  const matches = content.match(urlRegex) || [];
  
  // Filter out social media, images, and common non-business URLs
  const socialDomains = ['facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com', 'youtube.com', 'tiktok.com', 'pinterest.com', 'x.com'];
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp'];
  const cdnDomains = ['ctfassets.net', 'cloudinary.com', 'imgix.net', 'imgur.com', 'unsplash.com'];
  
  const websites = matches
    .map(url => cleanUrl(url))
    .filter(url => {
      try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname;
        const pathname = parsedUrl.pathname.toLowerCase();
        
        // Exclude social media
        if (socialDomains.some(social => hostname.includes(social))) return false;
        
        // Exclude image URLs
        if (imageExtensions.some(ext => pathname.endsWith(ext))) return false;
        
        // Exclude CDN domains (typically images/assets)
        if (cdnDomains.some(cdn => hostname.includes(cdn))) return false;
        
        // Exclude URLs that are just anchors on the same page
        if (url.includes('#') && !url.includes('?')) return false;
        
        return true;
      } catch {
        return false;
      }
    });

  return [...new Set(websites)].slice(0, 10);
}

// Complete Business Data extraction - runs ALL extractors
async function extractCompleteBusinessData(markdownContent: string, htmlContent: string, sourceUrl: string): Promise<any[]> {
  console.log('Running complete business data extraction...');
  
  // Run all regex-based extractors in parallel
  const [
    regexEmails,
    regexPhones,
    socialLinks,
    regexAddresses,
    googleMapsData,
    websites
  ] = await Promise.all([
    Promise.resolve(extractEmails(markdownContent)),
    Promise.resolve(extractPhoneNumbers(markdownContent)),
    Promise.resolve(extractSocialLinks(markdownContent, htmlContent)),
    Promise.resolve(extractAddresses(markdownContent)),
    Promise.resolve(extractGoogleMapsData(htmlContent)),
    Promise.resolve(extractWebsites(markdownContent, sourceUrl))
  ]);

  console.log(`Regex extraction complete - Emails: ${regexEmails.length}, Phones: ${regexPhones.length}`);

  // Run AI extraction for deeper business insights
  const aiResults = await extractBusinessDataWithAI(markdownContent);
  
  // Merge all results into comprehensive output
  const mergedResult = {
    extraction_type: 'complete_business_data',
    source_url: sourceUrl,
    extracted_at: new Date().toISOString(),
    
    // Business Identity
    business_name: aiResults.business_name || '',
    about_or_description: aiResults.about_or_description || '',
    
    // Contact Information - merged from regex and AI
    emails: deduplicateArray([
      ...regexEmails.map(e => e.email),
      ...(aiResults.email_address ? [aiResults.email_address] : [])
    ]),
    phone_numbers: deduplicateArray([
      ...regexPhones.map(p => p.phone_number),
      ...(aiResults.phone_number ? [aiResults.phone_number] : [])
    ]),
    
    // Address - from regex and AI
    addresses: deduplicateArray([
      ...regexAddresses,
      ...(aiResults.full_address ? [aiResults.full_address] : [])
    ]),
    
    // Website
    website_url: aiResults.website_url || websites[0] || sourceUrl,
    related_websites: websites.filter(w => w !== (aiResults.website_url || websites[0])),
    
    // Social Media - merged
    social_links: {
      facebook: socialLinks.facebook || aiResults.social_links?.facebook || '',
      instagram: socialLinks.instagram || aiResults.social_links?.instagram || '',
      linkedin: socialLinks.linkedin || aiResults.social_links?.linkedin || '',
      twitter: socialLinks.twitter || aiResults.social_links?.twitter || '',
      youtube: socialLinks.youtube || aiResults.social_links?.youtube || '',
      tiktok: socialLinks.tiktok || aiResults.social_links?.tiktok || '',
      pinterest: socialLinks.pinterest || '',
    },
    
    // Google Maps
    google_maps: {
      embed_url: googleMapsData?.embedUrl || aiResults.google_maps_embed_url || '',
      place_id: googleMapsData?.placeId || aiResults.google_maps_place_id || '',
      coordinates: {
        latitude: googleMapsData?.coordinates?.lat || aiResults.coordinates?.latitude || '',
        longitude: googleMapsData?.coordinates?.lng || aiResults.coordinates?.longitude || '',
      }
    },
    
    // Business Details
    hours_of_operation: aiResults.hours_of_operation || '',
    services_or_products: aiResults.services_or_products || '',
    
    // Extraction metadata
    extraction_sources: {
      regex_emails_found: regexEmails.length,
      regex_phones_found: regexPhones.length,
      regex_addresses_found: regexAddresses.length,
      social_links_found: Object.keys(socialLinks).length,
      ai_extraction_success: !!aiResults.business_name,
    }
  };

  return [mergedResult];
}

// Helper to deduplicate arrays
function deduplicateArray(arr: string[]): string[] {
  return [...new Set(arr.filter(item => item && item.trim()))];
}

// AI extraction specifically for business data
async function extractBusinessDataWithAI(content: string): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured');
    return {};
  }

  try {
    const systemPrompt = `You are a business information extraction assistant. Extract ALL available structured business data from webpage content.
Focus on finding:
- Business name
- Complete address (street, city, state/province, zip/postal code, country)
- Phone numbers (all formats)
- Email addresses
- Website URL
- Social media links (Facebook, Instagram, TikTok, LinkedIn, YouTube, Twitter)
- Hours of operation
- Google Maps embed URL and place ID
- Coordinates (latitude, longitude)
- Services or products offered
- Business description

Search everywhere: footer, header, contact sections, about pages, schema markup, meta tags, and embedded content.
If information is not found, return empty strings for those fields.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract all business information from this webpage content:\n${content.substring(0, 50000)}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_business_info',
              description: 'Extract structured business information from webpage content',
              parameters: {
                type: 'object',
                properties: {
                  business_name: { type: 'string', description: 'Name of the business' },
                  full_address: { type: 'string', description: 'Complete address' },
                  phone_number: { type: 'string', description: 'Primary business phone number' },
                  email_address: { type: 'string', description: 'Primary business email' },
                  website_url: { type: 'string', description: 'Business website URL' },
                  social_links: {
                    type: 'object',
                    properties: {
                      facebook: { type: 'string' },
                      instagram: { type: 'string' },
                      tiktok: { type: 'string' },
                      linkedin: { type: 'string' },
                      youtube: { type: 'string' },
                      twitter: { type: 'string' }
                    }
                  },
                  hours_of_operation: { type: 'string', description: 'Business hours' },
                  google_maps_embed_url: { type: 'string', description: 'Google Maps embed URL' },
                  google_maps_place_id: { type: 'string', description: 'Google Maps place ID' },
                  coordinates: {
                    type: 'object',
                    properties: {
                      latitude: { type: 'string' },
                      longitude: { type: 'string' }
                    }
                  },
                  services_or_products: { type: 'string', description: 'Services or products offered' },
                  about_or_description: { type: 'string', description: 'Business description' }
                },
                required: ['business_name']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_business_info' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      return {};
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall && toolCall.function.name === 'extract_business_info') {
      return JSON.parse(toolCall.function.arguments);
    }

    return {};
  } catch (error) {
    console.error('Error in AI extraction:', error);
    return {};
  }
}

// Legacy AI extraction function for custom_ai_extraction type
async function extractWithAI(content: string, instructions: string | null): Promise<any[]> {
  const result = await extractBusinessDataWithAI(content);
  
  if (Object.keys(result).length === 0) {
    return [{ error: 'AI extraction failed or returned no data' }];
  }
  
  return [result];
}
