import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExportRequest {
  scriptUrl: string;
  sheetName: string;
  data: Record<string, string>[];
  jobId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scriptUrl, sheetName, data, jobId }: ExportRequest = await req.json();

    console.log(`[export-to-google-sheets] Starting export for job ${jobId}`);
    console.log(`[export-to-google-sheets] Script URL: ${scriptUrl}`);
    console.log(`[export-to-google-sheets] Sheet name: ${sheetName}`);
    console.log(`[export-to-google-sheets] Data rows: ${data?.length || 0}`);

    // Validate inputs
    if (!scriptUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "Script URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No data to export" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!scriptUrl.includes("script.google.com")) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid Google Apps Script URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send data to Google Apps Script
    console.log(`[export-to-google-sheets] Sending ${data.length} rows to Google Apps Script...`);
    
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sheetName: sheetName || "ScrapeX Results",
        data,
      }),
    });

    console.log(`[export-to-google-sheets] Google Apps Script response status: ${response.status}`);

    // Google Apps Script returns redirects for web apps, so we need to handle that
    if (response.redirected) {
      const redirectedResponse = await fetch(response.url);
      const result = await redirectedResponse.text();
      
      try {
        const jsonResult = JSON.parse(result);
        console.log(`[export-to-google-sheets] Parsed response:`, jsonResult);
        
        return new Response(
          JSON.stringify({
            success: jsonResult.success,
            message: jsonResult.message || "Export completed",
            spreadsheetUrl: jsonResult.spreadsheetUrl,
            rowsImported: jsonResult.rowsImported,
            error: jsonResult.error,
          }),
          { 
            status: jsonResult.success ? 200 : 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      } catch (parseError) {
        console.error(`[export-to-google-sheets] Failed to parse response:`, result);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Invalid response from Google Apps Script. Make sure the script is deployed correctly." 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Try to parse direct response
    const responseText = await response.text();
    console.log(`[export-to-google-sheets] Direct response:`, responseText);
    
    try {
      const result = JSON.parse(responseText);
      return new Response(
        JSON.stringify({
          success: result.success,
          message: result.message || "Export completed",
          spreadsheetUrl: result.spreadsheetUrl,
          rowsImported: result.rowsImported,
          error: result.error,
        }),
        { 
          status: result.success ? 200 : 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } catch {
      // If we can't parse the response, check if it was successful based on status
      if (response.ok) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Export request sent. Check your Google Sheet.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Export failed with status ${response.status}` 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: unknown) {
    console.error("[export-to-google-sheets] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
