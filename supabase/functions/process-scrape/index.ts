import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to get languages for geo-targeting
function getLanguagesForCountry(countryCode: string): string[] {
  const languageMap: Record<string, string[]> = {
    'US': ['en'],
    'GB': ['en'],
    'CA': ['en', 'fr'],
    'AU': ['en'],
    'DE': ['de'],
    'FR': ['fr'],
    'ES': ['es'],
    'IT': ['it'],
    'NL': ['nl'],
    'BR': ['pt'],
    'MX': ['es'],
    'IN': ['en', 'hi'],
    'JP': ['ja'],
    'ZA': ['en'],
    'NG': ['en'],
    'KE': ['en'],
  };
  return languageMap[countryCode] || ['en'];
}

// Phone validation patterns by country
function getPhoneValidationForCountry(countryCode: string): { minDigits: number; maxDigits: number; patterns: RegExp[] } {
  const validationMap: Record<string, { minDigits: number; maxDigits: number; patterns: RegExp[] }> = {
    'US': { minDigits: 10, maxDigits: 11, patterns: [/^1?\d{10}$/] },
    'GB': { minDigits: 10, maxDigits: 11, patterns: [/^0?\d{10}$/, /^44\d{10}$/] },
    'CA': { minDigits: 10, maxDigits: 11, patterns: [/^1?\d{10}$/] },
    'AU': { minDigits: 9, maxDigits: 11, patterns: [/^0?\d{9}$/, /^61\d{9}$/] },
    'DE': { minDigits: 10, maxDigits: 12, patterns: [/^0?\d{10,11}$/, /^49\d{10,11}$/] },
    'FR': { minDigits: 10, maxDigits: 11, patterns: [/^0?\d{9}$/, /^33\d{9}$/] },
    'ZA': { minDigits: 9, maxDigits: 11, patterns: [/^0?\d{9}$/, /^27\d{9}$/] },
    'NG': { minDigits: 10, maxDigits: 13, patterns: [/^0?\d{10}$/, /^234\d{10}$/] },
  };
  return validationMap[countryCode] || { minDigits: 10, maxDigits: 15, patterns: [] };
}

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
    const SERPAPI_API_KEY = Deno.env.get('SERPAPI_API_KEY');
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

    console.log(`Processing job ${jobId} for URL: ${job.url}, Country: ${job.target_country || 'any'}, State: ${job.target_state || 'any'}`);

    // Handle Google Business Profiles scraping with SerpAPI
    if (job.scrape_type === 'google_business_profiles') {
      if (!SERPAPI_API_KEY) {
        throw new Error('SERPAPI_API_KEY not configured');
      }

      console.log(`Starting Google Business Profile search for: ${job.url} with limit: ${job.search_limit || 20}`);
      
      // Build location string for SerpAPI
      let locationStr = '';
      if (job.target_state && job.target_country === 'US') {
        locationStr = `${job.target_state}, United States`;
      } else if (job.target_country) {
        const countryNames: Record<string, string> = {
          'US': 'United States', 'GB': 'United Kingdom', 'CA': 'Canada', 
          'AU': 'Australia', 'DE': 'Germany', 'FR': 'France'
        };
        locationStr = countryNames[job.target_country] || job.target_country;
      }

      // Use SerpAPI Google Maps API
      const searchParams = new URLSearchParams({
        engine: 'google_maps',
        q: job.url, // Search query (e.g., "plumbers in Newark NJ")
        api_key: SERPAPI_API_KEY,
        type: 'search',
      });
      
      if (locationStr) {
        searchParams.append('ll', '@40.7128,-74.0060,15.1z'); // Default to NYC area, will be overridden by location
        // SerpAPI uses location parameter for text-based location
      }

      const serpApiUrl = `https://serpapi.com/search.json?${searchParams.toString()}`;
      console.log('Calling SerpAPI Google Maps:', serpApiUrl.replace(SERPAPI_API_KEY, 'REDACTED'));

      const serpResponse = await fetch(serpApiUrl);
      
      if (!serpResponse.ok) {
        const errorText = await serpResponse.text();
        console.error('SerpAPI error:', errorText);
        
        await supabase
          .from('scraping_jobs')
          .update({ 
            status: 'failed',
            results: [{ error: 'Google Maps search failed', details: errorText }],
            results_count: 0
          })
          .eq('id', jobId);

        await sendNotifications(supabase, job, jobId, 'failed', 0, errorText);

        return new Response(
          JSON.stringify({ error: 'Google Maps search failed', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const serpData = await serpResponse.json();
      console.log(`SerpAPI returned ${serpData.local_results?.length || 0} local results`);

      // Extract business data from SerpAPI results
      const businessResults: any[] = [];
      const localResults = serpData.local_results || [];
      const limit = job.search_limit || 20;

      for (let i = 0; i < Math.min(localResults.length, limit); i++) {
        const result = localResults[i];
        try {
          businessResults.push({
            business_name: result.title || '',
            full_address: result.address || '',
            phone_number: result.phone || '',
            website_url: result.website || '',
            rating: result.rating || null,
            reviews_count: result.reviews || null,
            type: result.type || '',
            place_id: result.place_id || '',
            gps_coordinates: result.gps_coordinates || null,
            hours: result.hours || result.operating_hours || null,
            thumbnail: result.thumbnail || '',
            source: 'google_maps',
            source_url: result.link || '',
          });
        } catch (e) {
          console.error(`Error extracting from result ${i}:`, e);
        }
      }

      console.log(`Extracted ${businessResults.length} businesses from Google Maps`);

      // Save results
      const { error: updateError } = await supabase
        .from('scraping_jobs')
        .update({ 
          status: 'completed',
          results: businessResults,
          results_count: businessResults.length
        })
        .eq('id', jobId);

      if (updateError) {
        console.error('Error updating job:', updateError);
      }

      await sendNotifications(supabase, job, jobId, 'completed', businessResults.length);

      return new Response(
        JSON.stringify({ success: true, results: businessResults }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper function to check if input is a URL or search query
    const isValidUrl = (str: string): boolean => {
      try {
        // Remove quotes if present
        const cleaned = str.replace(/^["']|["']$/g, '').trim();
        const url = new URL(cleaned);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    };

    // Handle bulk business search with Firecrawl OR search queries for complete_business_data
    const isSearchQuery = !isValidUrl(job.url);
    
    if (job.scrape_type === 'bulk_business_search' || (job.scrape_type === 'complete_business_data' && isSearchQuery)) {
      console.log(`Starting ${isSearchQuery ? 'search query' : 'bulk business search'} for: ${job.url} with limit: ${job.search_limit || 20}`);
      
      // Use Firecrawl search API
      const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: job.url, // In bulk search, url field contains the search query
          limit: job.search_limit || 20,
          lang: job.target_country ? getLanguagesForCountry(job.target_country)[0] : 'en',
          country: job.target_country || 'US',
          scrapeOptions: {
            formats: ['markdown', 'html'],
          },
        }),
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('Firecrawl search error:', errorText);
        
        await supabase
          .from('scraping_jobs')
          .update({ 
            status: 'failed',
            results: [{ error: 'Search failed', details: errorText }],
            results_count: 0
          })
          .eq('id', jobId);

        await sendNotifications(supabase, job, jobId, 'failed', 0, errorText);

        return new Response(
          JSON.stringify({ error: 'Search failed', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const searchData = await searchResponse.json();
      console.log(`Search returned ${searchData.data?.length || 0} results`);

      // Domains to skip - these are not actual business websites
      const irrelevantDomains = [
        'reddit.com', 'quora.com', 'yelp.com/topic', 'facebook.com/groups',
        'linkedin.com/pulse', 'medium.com', 'wikipedia.org', 'wikihow.com',
        'cnet.com', 'forbes.com/lists', 'businessinsider.com', 'huffpost.com',
        'buzzfeed.com', 'pinterest.com', 'twitter.com', 'x.com',
        'news.google.com', 'youtube.com', 'tiktok.com',
        'amazon.com', 'ebay.com', 'etsy.com/market',
        'tripadvisor.com/ShowTopic', 'indeed.com', 'glassdoor.com',
        'craigslist.org', 'nextdoor.com', 'patch.com',
        'nytimes.com', 'washingtonpost.com', 'cnn.com', 'bbc.com',
        'theguardian.com', 'usatoday.com', 'newsweek.com', 'time.com',
      ];
      
      // URL patterns that indicate non-business content
      const irrelevantPatterns = [
        /\/article\//i,
        /\/news\//i,
        /\/blog\//i,
        /\/story\//i,
        /\/opinion\//i,
        /\/comments\//i,
        /\/forum\//i,
        /\/thread\//i,
        /\/discussion\//i,
        /\/list-of-/i,
        /\/best-\d+-/i,
        /\/top-\d+-/i,
      ];

      // Extract business data from each search result
      const businessResults: any[] = [];
      const searchResults = searchData.data || [];
      let skippedCount = 0;

      for (const result of searchResults) {
        try {
          const sourceUrl = result.url || '';
          
          // Skip irrelevant domains
          const isIrrelevantDomain = irrelevantDomains.some(domain => sourceUrl.toLowerCase().includes(domain));
          if (isIrrelevantDomain) {
            console.log(`Skipping irrelevant domain: ${sourceUrl}`);
            skippedCount++;
            continue;
          }
          
          // Skip URLs matching irrelevant patterns
          const isIrrelevantPattern = irrelevantPatterns.some(pattern => pattern.test(sourceUrl));
          if (isIrrelevantPattern) {
            console.log(`Skipping irrelevant URL pattern: ${sourceUrl}`);
            skippedCount++;
            continue;
          }
          
          const markdown = result.markdown || '';
          const html = result.html || '';

          // Extract basic info from search result
          const businessData = await extractCompleteBusinessData(markdown, html, sourceUrl);
          
          if (businessData.length > 0) {
            const data = businessData[0];
            
            // Calculate a simple relevance score based on extracted data quality
            let relevanceScore = 0;
            if (data.business_name && data.business_name.length > 2) relevanceScore += 20;
            if (data.phone_numbers?.length > 0) relevanceScore += 25;
            if (data.emails?.length > 0) relevanceScore += 20;
            if (data.full_address) relevanceScore += 15;
            if (data.website_url) relevanceScore += 10;
            if (Object.keys(data.social_links || {}).length > 0) relevanceScore += 10;
            
            // Only include results with minimum relevance
            if (relevanceScore >= 20) {
              businessResults.push({
                ...data,
                search_result_title: result.title || '',
                search_result_description: result.description || '',
                source_url: sourceUrl,
                relevance_score: relevanceScore,
              });
            } else {
              console.log(`Skipping low-relevance result (score: ${relevanceScore}): ${sourceUrl}`);
              skippedCount++;
            }
          }
        } catch (e) {
          console.error(`Error extracting from ${result.url}:`, e);
        }
      }

      console.log(`Extracted business data from ${businessResults.length} results (skipped ${skippedCount} irrelevant)`);

      // Save results
      const { error: updateError } = await supabase
        .from('scraping_jobs')
        .update({ 
          status: 'completed',
          results: businessResults,
          results_count: businessResults.length
        })
        .eq('id', jobId);

      if (updateError) {
        console.error('Error updating job:', updateError);
      }

      await sendNotifications(supabase, job, jobId, 'completed', businessResults.length);

      return new Response(
        JSON.stringify({ success: true, results: businessResults }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Firecrawl request with optional geo-targeting (for non-bulk scrapes)
    const firecrawlBody: any = {
      url: job.url,
      formats: ['markdown', 'html'],
    };
    
    // Add location for geo-targeted scraping if specified
    if (job.target_country) {
      firecrawlBody.location = {
        country: job.target_country,
        languages: getLanguagesForCountry(job.target_country),
      };
      console.log(`Using geo-targeting for country: ${job.target_country}`);
    }

    // Scrape the website using Firecrawl
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(firecrawlBody),
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error('Firecrawl error:', errorText);
      
      await supabase
        .from('scraping_jobs')
        .update({ 
          status: 'failed',
          results: [{ error: 'Failed to scrape website', details: errorText }],
          results_count: 0
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

    // Calculate fields_count for single-URL jobs (count non-empty fields in first result)
    let fieldsCount = 0;
    if (results.length === 1 && typeof results[0] === 'object') {
      fieldsCount = Object.entries(results[0]).filter(([key, value]) => {
        if (value === null || value === undefined || value === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return false;
        return true;
      }).length;
    }

    // Save results to database
    const { error: updateError } = await supabase
      .from('scraping_jobs')
      .update({ 
        status: 'completed',
        results: results,
        results_count: results.length,
        fields_count: fieldsCount
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

    // Map status to notification type (constraint expects 'complete' not 'completed')
    const notifType = status === 'completed' 
      ? (job.schedule_enabled ? 'scheduled_job_complete' : 'job_complete')
      : (job.schedule_enabled ? 'scheduled_job_failed' : 'job_failed');

    await supabase
      .from('notifications')
      .insert({
        user_id: job.user_id,
        job_id: jobId,
        type: notifType,
        title: status === 'completed' ? 'Scraping Job Completed' : 'Scraping Job Failed',
        message: message
      });
    console.log('In-app notification created');
  } catch (notifError) {
    console.error('Failed to create in-app notification:', notifError);
  }

  // Trigger webhooks
  try {
    const webhookEvent = status === 'completed' ? 'job.completed' : 'job.failed';
    await supabase.functions.invoke('trigger-webhook', {
      body: {
        jobId: jobId,
        event: webhookEvent,
        userId: job.user_id,
      }
    });
    console.log(`Webhook triggered for ${webhookEvent}`);
  } catch (webhookError) {
    console.error('Failed to trigger webhook:', webhookError);
  }
}

// ============= EXTRACTION FUNCTIONS =============

function extractEmails(content: string, html?: string): any[] {
  const emails: string[] = [];
  
  // Standard email regex
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi;
  const textMatches = content.match(emailRegex) || [];
  emails.push(...textMatches);
  
  // If HTML provided, also extract from mailto: links
  if (html) {
    const mailtoRegex = /mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/gi;
    let match;
    while ((match = mailtoRegex.exec(html)) !== null) {
      emails.push(match[1]);
    }
    
    // Look for emails in href attributes
    const hrefEmailRegex = /href=["'][^"']*?([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})[^"']*?["']/gi;
    while ((match = hrefEmailRegex.exec(html)) !== null) {
      emails.push(match[1]);
    }
  }
  
  // Filter out common non-email patterns (image filenames, etc.)
  const filteredEmails = emails.filter(email => {
    const lowerEmail = email.toLowerCase();
    // Filter out common false positives
    if (lowerEmail.endsWith('.png') || lowerEmail.endsWith('.jpg') || lowerEmail.endsWith('.gif')) return false;
    if (lowerEmail.includes('example.com') || lowerEmail.includes('domain.com')) return false;
    if (lowerEmail.includes('sentry.io') || lowerEmail.includes('wixstatic')) return false;
    return true;
  });
  
  const uniqueEmails = [...new Set(filteredEmails)];
  return uniqueEmails.map(email => ({ email: email.toLowerCase(), source: 'regex' }));
}

function extractPhoneNumbers(content: string, html?: string): any[] {
  const phones: string[] = [];
  let combinedContent = html ? content + ' ' + html : content;
  
  // Remove URLs from content to avoid false positives from image paths, CDN URLs, etc.
  // This prevents extracting numbers like "984-0956367" from URLs like "/assets/2050a7ae-c278-4d60-b984-0956367382cf"
  const urlPatterns = [
    /https?:\/\/[^\s<>"']+/gi,                    // Full URLs
    /src=["'][^"']+["']/gi,                        // src attributes
    /href=["'](?!tel:)[^"']+["']/gi,              // href attributes (except tel:)
    /url\([^)]+\)/gi,                              // CSS url()
    /\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.[a-zA-Z]{2,4}/gi,  // File paths
    /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,  // UUIDs
    /\?[^\s<>"']*=[^\s<>"']*/gi,                   // Query strings
  ];
  
  // Create a cleaned version of content without URLs for phone extraction
  let cleanedContent = combinedContent;
  for (const pattern of urlPatterns) {
    cleanedContent = cleanedContent.replace(pattern, ' ');
  }
  
  // Multiple phone regex patterns to catch various formats
  const phonePatterns = [
    // US format: (123) 456-7890, 123-456-7890, 123.456.7890
    /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    // International with country code: +1 123-456-7890, +44 20 7123 4567
    /\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{0,4}/g,
    // US toll-free: 1-800-123-4567, 800-123-4567
    /1?[-.\s]?8[0-9]{2}[-.\s]?\d{3}[-.\s]?\d{4}/g,
    // 10-digit with optional 1 prefix: 1 123 456 7890
    /1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g,
  ];
  
  for (const pattern of phonePatterns) {
    const matches = cleanedContent.match(pattern) || [];
    phones.push(...matches);
  }
  
  // Extract from tel: links in HTML (these are legitimate phone numbers)
  if (html) {
    const telRegex = /tel:([+\d\s().-]+)/gi;
    let match;
    while ((match = telRegex.exec(html)) !== null) {
      phones.push(match[1]);
    }
    
    // Look for phones in href="tel:" attributes more specifically
    const hrefTelRegex = /href=["']tel:([^"']+)["']/gi;
    while ((match = hrefTelRegex.exec(html)) !== null) {
      phones.push(match[1]);
    }
  }
  
  // Clean and filter phone numbers
  const cleanedPhones = phones
    .map(phone => phone.replace(/[^\d+\s().-]/g, '').trim())
    .filter(phone => {
      const digits = phone.replace(/\D/g, '');
      
      // Must have at least 10 digits and max 15
      if (digits.length < 10 || digits.length > 15) return false;
      
      // Filter out invalid patterns
      if (!isValidPhoneNumber(digits)) return false;
      
      return true;
    });
  
  const uniquePhones = [...new Set(cleanedPhones)];
  console.log(`Phone extraction: found ${uniquePhones.length} valid phones after URL filtering`);
  return uniquePhones.map(phone => ({ phone_number: phone.trim(), source: 'regex' }));
}

// Validate phone numbers - filter out obviously fake/invalid numbers
function isValidPhoneNumber(digits: string): boolean {
  // Remove leading 1 for US numbers for pattern checking
  const normalizedDigits = digits.startsWith('1') && digits.length === 11 
    ? digits.substring(1) 
    : digits;
  
  // Filter out numbers with too many repeating digits (e.g., 1999999999, 1111111111)
  const digitCounts: Record<string, number> = {};
  for (const d of normalizedDigits) {
    digitCounts[d] = (digitCounts[d] || 0) + 1;
  }
  const maxRepeat = Math.max(...Object.values(digitCounts));
  if (maxRepeat >= 7) return false; // More than 7 of the same digit is suspicious
  
  // Filter out sequential numbers (1234567890, 0987654321)
  if (normalizedDigits === '1234567890' || normalizedDigits === '0987654321') return false;
  
  // Filter out common fake patterns
  const fakePatterns = [
    /^0{10}$/,           // All zeros
    /^1{10}$/,           // All ones
    /^9{10}$/,           // All nines
    /^(.)\1{9}$/,        // Any single digit repeated 10 times
    /^123456/,           // Starts with 123456
    /^000/,              // Starts with 000 (invalid area code)
    /^555\d{3}55/,       // 555-xxx-55xx (TV/movie numbers)
  ];
  
  for (const pattern of fakePatterns) {
    if (pattern.test(normalizedDigits)) return false;
  }
  
  // Filter out numbers where the last 7 digits are all the same (e.g., 6109999999)
  if (normalizedDigits.length >= 10) {
    const last7 = normalizedDigits.slice(-7);
    if (/^(.)\1{6}$/.test(last7)) return false;
  }
  
  return true;
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
  let cleaned = url
    .replace(/['"<>]/g, '')
    .replace(/[\)\]\}]+$/, '') // Remove trailing ), ], }
    .replace(/[,;.!?]+$/, '') // Remove trailing punctuation
    .trim();
  
  // Remove hash-only fragments with artifacts like "#)"
  cleaned = cleaned.replace(/#\)?$/, '');
  
  // Remove any remaining trailing special chars
  cleaned = cleaned.replace(/[)\]}>]+$/, '');
  
  return cleaned;
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
  const cdnDomains = ['ctfassets.net', 'cloudinary.com', 'imgix.net', 'imgur.com', 'unsplash.com', 'wixstatic.com', 'wix.com', 'squarespace-cdn.com', 'shopify.com/cdn', 'amazonaws.com', 'googleusercontent.com', 'gstatic.com'];
  
  const websites = matches
    .map(url => cleanUrl(url))
    .filter(url => {
      try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname;
        const pathname = parsedUrl.pathname.toLowerCase();
        const searchParams = parsedUrl.search.toLowerCase();
        
        // Exclude social media
        if (socialDomains.some(social => hostname.includes(social))) return false;
        
        // Exclude image URLs by extension
        if (imageExtensions.some(ext => pathname.endsWith(ext))) return false;
        
        // Exclude image URLs by query params (w=, h=, q=, fm=)
        if (searchParams.includes('w=') && (searchParams.includes('q=') || searchParams.includes('fm='))) return false;
        
        // Exclude CDN domains (typically images/assets)
        if (cdnDomains.some(cdn => hostname.includes(cdn))) return false;
        
        // Exclude URLs that are just anchors on the same page
        if (url.includes('#') && !url.includes('?')) return false;
        
        // Exclude very short paths that are likely navigation
        if (pathname === '/' || pathname === '') return false;
        
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
  
  // Run all regex-based extractors in parallel (pass HTML for tel:/mailto: extraction)
  const [
    regexEmails,
    regexPhones,
    socialLinks,
    regexAddresses,
    googleMapsData,
    websites
  ] = await Promise.all([
    Promise.resolve(extractEmails(markdownContent, htmlContent)),
    Promise.resolve(extractPhoneNumbers(markdownContent, htmlContent)),
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
