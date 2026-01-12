import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'Recording URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL is from Retell's CloudFront CDN
    const allowedDomains = [
      'dxc03zgurdly9.cloudfront.net',
      'cloudfront.net',
      'retellai.com',
    ];

    const urlObj = new URL(url);
    const isAllowed = allowedDomains.some(domain => urlObj.hostname.endsWith(domain));

    if (!isAllowed) {
      console.error('[proxy-recording] Blocked non-Retell URL:', urlObj.hostname);
      return new Response(
        JSON.stringify({ error: 'Invalid recording URL domain' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[proxy-recording] Streaming recording from:', url);

    // Fetch with streaming - don't buffer the entire response
    const response = await fetch(url, {
      headers: { 'Accept': 'audio/*' },
    });

    if (!response.ok) {
      console.error('[proxy-recording] Failed to fetch:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: `Failed to fetch recording: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type') || 'audio/wav';

    console.log('[proxy-recording] Streaming response, size:', contentLength, 'type:', contentType);

    // Stream the response directly - much faster than buffering
    return new Response(response.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        ...(contentLength && { 'Content-Length': contentLength }),
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Accept-Ranges': 'bytes',
      },
    });

  } catch (error) {
    console.error('[proxy-recording] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
