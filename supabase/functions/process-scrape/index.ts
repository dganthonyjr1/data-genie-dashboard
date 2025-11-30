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

      // Send failure notification email
      try {
        await supabase.functions.invoke('send-job-notification', {
          body: {
            userId: job.user_id,
            jobId: jobId,
            jobUrl: job.url,
            scrapeType: job.scrape_type,
            status: 'failed',
            errorMessage: errorText,
          }
        });
        console.log('Failure notification sent');
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
      }

      // Create in-app notification for failure
      try {
        const formatScrapeType = (type: string) => {
          return type.split("_").map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(" ");
        };

        await supabase
          .from('notifications')
          .insert({
            user_id: job.user_id,
            job_id: jobId,
            type: job.schedule_enabled ? 'scheduled_job_failed' : 'job_failed',
            title: `Scraping Job Failed`,
            message: `${formatScrapeType(job.scrape_type)} failed for ${job.url.substring(0, 50)}...`
          });
        console.log('In-app failure notification created');
      } catch (notifError) {
        console.error('Failed to create in-app notification:', notifError);
      }

      return new Response(
        JSON.stringify({ error: 'Scraping failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scrapeData = await scrapeResponse.json();
    console.log('Scrape successful, extracting data...');

    // Extract data based on scrape type
    let results: any[] = [];
    const content = scrapeData.data?.markdown || scrapeData.data?.html || '';

    switch (job.scrape_type) {
      case 'emails':
        results = extractEmails(content);
        break;
      case 'phone_numbers':
        results = extractPhoneNumbers(content);
        break;
      case 'text_content':
        results = extractTextContent(content);
        break;
      case 'tables':
        results = extractTables(scrapeData.data?.html || '');
        break;
      case 'custom_ai_extraction':
        results = await extractWithAI(content, job.ai_instructions);
        break;
      default:
        results = [{ content }];
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

    // Send success notification email
    try {
      await supabase.functions.invoke('send-job-notification', {
        body: {
          userId: job.user_id,
          jobId: jobId,
          jobUrl: job.url,
          scrapeType: job.scrape_type,
          status: 'completed',
          resultsCount: results.length,
        }
      });
      console.log('Success notification sent');
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
      // Don't fail the job if email fails
    }

    // Create in-app notification
    try {
      const formatScrapeType = (type: string) => {
        return type.split("_").map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(" ");
      };

      await supabase
        .from('notifications')
        .insert({
          user_id: job.user_id,
          job_id: jobId,
          type: job.schedule_enabled ? 'scheduled_job_complete' : 'job_complete',
          title: `Scraping Job Completed`,
          message: `${formatScrapeType(job.scrape_type)} completed with ${results.length} results from ${job.url.substring(0, 50)}...`
        });
      console.log('In-app notification created');
    } catch (notifError) {
      console.error('Failed to create in-app notification:', notifError);
    }

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

function extractEmails(content: string): any[] {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = content.match(emailRegex) || [];
  const uniqueEmails = [...new Set(emails)];
  return uniqueEmails.map(email => ({ email }));
}

function extractPhoneNumbers(content: string): any[] {
  // Match various phone number formats
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = content.match(phoneRegex) || [];
  const uniquePhones = [...new Set(phones)];
  return uniquePhones.map(phone => ({ phone_number: phone.trim() }));
}

function extractTextContent(content: string): any[] {
  // Split content into paragraphs and filter out empty ones
  const paragraphs = content
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  return paragraphs.map((text, index) => ({ 
    paragraph: index + 1,
    text: text.substring(0, 500) // Limit to 500 chars per paragraph
  }));
}

function extractTables(html: string): any[] {
  // Simple table extraction - looks for HTML tables
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables = html.match(tableRegex) || [];
  
  if (tables.length === 0) {
    return [{ message: 'No tables found on this page' }];
  }

  return tables.map((table, index) => {
    // Extract rows
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows = [...table.matchAll(rowRegex)];
    
    return {
      table_number: index + 1,
      row_count: rows.length,
      preview: table.substring(0, 200).replace(/<[^>]*>/g, ' ').trim()
    };
  });
}

async function extractWithAI(content: string, instructions: string | null): Promise<any[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured');
    return [{
      error: 'AI extraction is not configured. Please contact support.'
    }];
  }

  try {
    const systemPrompt = `You are a business information extraction assistant. Extract structured business data from webpage content.
Focus on finding:
- Business name
- Complete address (including street, city, state/province, zip/postal code)
- Phone numbers
- Email addresses
- Website URL
- Social media links (Facebook, Instagram, TikTok, LinkedIn, YouTube)
- Hours of operation
- Google Maps embed URL and place ID
- Coordinates (latitude, longitude)
- Services or products offered
- Business description

Look for addresses in footer text, contact pages, schema markup (LocalBusiness, Organization), Google Maps embeds, text blocks, sidebars, and any visible text.
For Google Maps embeds, extract the iframe URL, place ID, and coordinates from URL parameters.
If information is not found, return empty strings for those fields.`;

    const userPrompt = instructions 
      ? `${instructions}\n\nWebpage content:\n${content.substring(0, 50000)}`
      : `Extract business information from this webpage content:\n${content.substring(0, 50000)}`;

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
          { role: 'user', content: userPrompt }
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
                  full_address: { type: 'string', description: 'Complete address including street, city, state/province, zip/postal code' },
                  phone_number: { type: 'string', description: 'Business phone number' },
                  email_address: { type: 'string', description: 'Business email address' },
                  website_url: { type: 'string', description: 'Business website URL' },
                  social_links: {
                    type: 'object',
                    properties: {
                      facebook: { type: 'string', description: 'Facebook profile URL' },
                      instagram: { type: 'string', description: 'Instagram profile URL' },
                      tiktok: { type: 'string', description: 'TikTok profile URL' },
                      linkedin: { type: 'string', description: 'LinkedIn profile URL' },
                      youtube: { type: 'string', description: 'YouTube channel URL' }
                    },
                    required: ['facebook', 'instagram', 'tiktok', 'linkedin', 'youtube']
                  },
                  hours_of_operation: { type: 'string', description: 'Business hours of operation' },
                  google_maps_embed_url: { type: 'string', description: 'Google Maps embed iframe URL' },
                  google_maps_place_id: { type: 'string', description: 'Google Maps place ID' },
                  coordinates: {
                    type: 'object',
                    properties: {
                      latitude: { type: 'string', description: 'Latitude coordinate' },
                      longitude: { type: 'string', description: 'Longitude coordinate' }
                    },
                    required: ['latitude', 'longitude']
                  },
                  services_or_products: { type: 'string', description: 'Services or products offered' },
                  about_or_description: { type: 'string', description: 'Business description or about section' }
                },
                required: ['business_name', 'full_address', 'phone_number', 'email_address', 'website_url', 'social_links', 'hours_of_operation', 'google_maps_embed_url', 'google_maps_place_id', 'coordinates', 'services_or_products', 'about_or_description'],
                additionalProperties: false
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
      
      if (response.status === 429) {
        return [{ error: 'Rate limit exceeded. Please try again later.' }];
      }
      if (response.status === 402) {
        return [{ error: 'AI credits exhausted. Please add credits to your workspace.' }];
      }
      
      return [{ error: 'AI extraction failed. Please try again.' }];
    }

    const aiResponse = await response.json();
    console.log('AI extraction response:', JSON.stringify(aiResponse));

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall && toolCall.function.name === 'extract_business_info') {
      const extractedData = JSON.parse(toolCall.function.arguments);
      return [extractedData];
    }

    // Fallback if no tool call was made
    return [{
      error: 'AI extraction did not return structured data',
      raw_response: aiResponse.choices?.[0]?.message?.content || 'No response'
    }];

  } catch (error) {
    console.error('Error in extractWithAI:', error);
    return [{
      error: 'AI extraction failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }];
  }
}
