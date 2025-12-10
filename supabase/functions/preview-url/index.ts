import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SSRF Protection: Block private IP ranges, localhost, and cloud metadata endpoints
const isBlockedUrl = (urlString: string): { blocked: boolean; reason?: string } => {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    
    // Only allow http and https schemes
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { blocked: true, reason: 'Only HTTP and HTTPS protocols are allowed' };
    }
    
    // Block localhost variations
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return { blocked: true, reason: 'Localhost URLs are not allowed' };
    }
    
    // Block common cloud metadata endpoints
    const metadataPatterns = [
      /^169\.254\.169\.254$/,           // AWS/Azure metadata
      /^metadata\.google\.internal$/i,   // GCP metadata
      /^metadata\.google$/i,             // GCP metadata alternative
      /^169\.254\./,                     // Link-local addresses
    ];
    
    for (const pattern of metadataPatterns) {
      if (pattern.test(hostname)) {
        return { blocked: true, reason: 'Cloud metadata endpoints are not allowed' };
      }
    }
    
    // Block private IP ranges (RFC 1918)
    const privateIpPatterns = [
      /^10\./,                           // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.0.0/12
      /^192\.168\./,                     // 192.168.0.0/16
      /^0\./,                            // 0.0.0.0/8
      /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./, // Carrier-grade NAT
      /^198\.18\./,                      // Benchmarking
      /^198\.19\./,                      // Benchmarking
    ];
    
    for (const pattern of privateIpPatterns) {
      if (pattern.test(hostname)) {
        return { blocked: true, reason: 'Private IP addresses are not allowed' };
      }
    }
    
    // Block internal service names commonly used in container/k8s environments
    const internalPatterns = [
      /\.internal$/i,
      /\.local$/i,
      /\.svc$/i,
      /\.cluster$/i,
      /^kubernetes/i,
    ];
    
    for (const pattern of internalPatterns) {
      if (pattern.test(hostname)) {
        return { blocked: true, reason: 'Internal service URLs are not allowed' };
      }
    }
    
    return { blocked: false };
  } catch {
    return { blocked: true, reason: 'Invalid URL format' };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SSRF Protection: Check if URL is blocked
    const blockCheck = isBlockedUrl(url);
    if (blockCheck.blocked) {
      console.warn(`Blocked SSRF attempt: ${url} - ${blockCheck.reason}`);
      return new Response(
        JSON.stringify({ error: blockCheck.reason || 'URL not allowed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching preview for URL: ${url}`);

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      redirect: 'manual', // Don't follow redirects automatically to prevent redirect-based SSRF
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    // Check redirect targets for SSRF
    if (response.status >= 300 && response.status < 400) {
      const redirectUrl = response.headers.get('location');
      if (redirectUrl) {
        const redirectBlockCheck = isBlockedUrl(redirectUrl);
        if (redirectBlockCheck.blocked) {
          console.warn(`Blocked SSRF redirect attempt: ${redirectUrl} - ${redirectBlockCheck.reason}`);
          return new Response(
            JSON.stringify({ error: 'Redirect to blocked URL not allowed' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Follow safe redirect
        const redirectResponse = await fetch(redirectUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
          signal: AbortSignal.timeout(10000),
        });
        
        if (!redirectResponse.ok) {
          return new Response(
            JSON.stringify({ 
              error: `Failed to fetch URL: ${redirectResponse.status} ${redirectResponse.statusText}` 
            }),
            { status: redirectResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const html = await redirectResponse.text();
        return generatePreviewResponse(url, html);
      }
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch URL: ${response.status} ${response.statusText}` 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    return generatePreviewResponse(url, html);

  } catch (error) {
    console.error('Error in preview-url:', error);
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      return new Response(
        JSON.stringify({ error: 'Request timeout - URL took too long to respond' }),
        { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to fetch URL preview' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generatePreviewResponse(url: string, html: string): Response {
  // Extract basic information
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
  const title = titleMatch ? titleMatch[1].trim() : 'No title found';

  // Extract meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
  const description = descMatch ? descMatch[1].trim() : '';

  // Extract text content (simplified - remove scripts, styles, and HTML tags)
  let textContent = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Limit preview length
  const previewLength = 3000;
  if (textContent.length > previewLength) {
    textContent = textContent.substring(0, previewLength) + '...';
  }

  // Extract some basic meta info
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
  const ogImage = ogImageMatch ? ogImageMatch[1] : null;

  const preview = {
    url,
    title,
    description,
    textContent,
    ogImage,
    contentLength: html.length,
    previewGenerated: new Date().toISOString(),
  };

  console.log(`Preview generated successfully for ${url}`);

  return new Response(
    JSON.stringify(preview),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
