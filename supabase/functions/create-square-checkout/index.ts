import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  planName: string;
  amount: number;
  currency?: string;
  redirectUrl?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SQUARE_ACCESS_TOKEN = Deno.env.get("SQUARE_ACCESS_TOKEN");
    const SQUARE_LOCATION_ID = Deno.env.get("SQUARE_LOCATION_ID");

    if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
      console.error("Missing Square credentials");
      throw new Error("Square credentials not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      throw new Error("Unauthorized");
    }

    const { planName, amount, currency = "USD", redirectUrl } = await req.json() as CheckoutRequest;

    if (!planName || !amount || amount <= 0) {
      throw new Error("Invalid plan name or amount");
    }

    const sanitizedPlanName = planName.slice(0, 100).replace(/[<>]/g, '');
    
    console.log(`Creating Square checkout for user ${user.id}, plan: ${sanitizedPlanName}, amount: ${amount}`);

    const idempotencyKey = crypto.randomUUID();

    // Determine environment - sandbox tokens/locations contain "sandbox"
    const isSandbox = SQUARE_ACCESS_TOKEN.includes("sandbox") || SQUARE_LOCATION_ID.includes("sandbox");
    const baseUrl = isSandbox 
      ? "https://connect.squareupsandbox.com" 
      : "https://connect.squareup.com";

    console.log(`Using Square ${isSandbox ? 'Sandbox' : 'Production'} environment`);

    const squareResponse = await fetch(`${baseUrl}/v2/online-checkout/payment-links`, {
      method: "POST",
      headers: {
        "Square-Version": "2024-01-18",
        "Authorization": `Bearer ${SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        quick_pay: {
          name: `ScrapeX ${sanitizedPlanName} Plan`,
          price_money: {
            amount: amount,
            currency: currency,
          },
          location_id: SQUARE_LOCATION_ID,
        },
        checkout_options: {
          redirect_url: redirectUrl || `${req.headers.get("origin")}/dashboard?payment=success`,
          ask_for_shipping_address: false,
        },
        pre_populated_data: {
          buyer_email: user.email,
        },
      }),
    });

    const squareData = await squareResponse.json();

    if (!squareResponse.ok) {
      console.error("Square API error:", JSON.stringify(squareData));
      throw new Error(squareData.errors?.[0]?.detail || "Failed to create checkout");
    }

    console.log("Square checkout created successfully:", squareData.payment_link?.id);

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: squareData.payment_link?.url,
        paymentLinkId: squareData.payment_link?.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error creating Square checkout:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create checkout";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: errorMessage === "Unauthorized" ? 401 : 400,
      }
    );
  }
});
