import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  planName: string;
  priceInCents: number;
  successUrl: string;
  cancelUrl: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY_RAW = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    const STRIPE_SECRET_KEY = STRIPE_SECRET_KEY_RAW.trim();

    if (!STRIPE_SECRET_KEY) {
      throw new Error("Stripe secret key not configured");
    }

    const keyPrefix = STRIPE_SECRET_KEY.slice(0, 8);
    console.log(`Stripe key prefix=${keyPrefix}, length=${STRIPE_SECRET_KEY.length}`);

    // Stripe secret keys must be sk_test_/sk_live_ or restricted rk_test_/rk_live_
    const looksValid = /^(sk|rk)_(test|live)_/.test(STRIPE_SECRET_KEY);
    if (!looksValid) {
      return new Response(
        JSON.stringify({
          error:
            `Stripe secret key looks invalid (expected sk_test_/sk_live_/rk_test_/rk_live_). Current prefix: ${STRIPE_SECRET_KEY.slice(0, 3)}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.slice("Bearer ".length);
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    const userId = claimsData?.claims?.sub ?? null;
    const userEmail = (claimsData?.claims as { email?: string } | null)?.email ?? null;

    if (claimsError || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as CheckoutRequest;
    const { planName, priceInCents, successUrl, cancelUrl } = body;

    if (!planName || !priceInCents || !successUrl || !cancelUrl) {
      throw new Error("Missing required fields");
    }

    console.log(`Creating Stripe checkout for user ${userId}, plan=${planName}, amount=${priceInCents}`);

    // Create Stripe checkout session
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode": "subscription",
        "success_url": successUrl,
        "cancel_url": cancelUrl,
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][product_data][name]": `ScrapeX ${planName} Plan`,
        "line_items[0][price_data][unit_amount]": priceInCents.toString(),
        "line_items[0][price_data][recurring][interval]": "month",
        "line_items[0][quantity]": "1",
        ...(userEmail ? { "customer_email": userEmail } : {}),
        "metadata[user_id]": userId,
        "metadata[plan_name]": planName,
        "subscription_data[metadata][user_id]": userId,
        "subscription_data[metadata][plan_name]": planName,
      }),
    });

    const stripeData = await stripeResponse.json();

    if (!stripeResponse.ok) {
      console.error("Stripe API error:", stripeData);
      throw new Error(stripeData.error?.message || "Failed to create checkout session");
    }

    // Store pending payment in database
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: insertError } = await serviceClient.from("payments").insert({
      user_id: userId,
      payment_link_id: stripeData.id,
      plan_name: planName,
      amount: priceInCents,
      currency: "USD",
      status: "pending",
      metadata: { 
        stripe_session_id: stripeData.id,
        subscription_id: stripeData.subscription
      },
    });

    if (insertError) {
      console.error("Failed to store payment record:", insertError);
    }

    console.log(`Stripe checkout session created: ${stripeData.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: stripeData.id,
        url: stripeData.url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create checkout";
    console.error("Error creating Stripe checkout:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
