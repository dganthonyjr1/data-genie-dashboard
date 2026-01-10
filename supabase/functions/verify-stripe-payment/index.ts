import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      throw new Error("Stripe secret key not configured");
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

    if (claimsError || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error("Missing session ID");
    }

    console.log(`Verifying Stripe session ${sessionId} for user ${userId}`);

    // Fetch session from Stripe
    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
      {
        headers: {
          "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        },
      }
    );

    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      console.error("Stripe API error:", session);
      throw new Error(session.error?.message || "Failed to fetch session");
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if payment is complete
    if (session.payment_status === "paid") {
      const planName = session.metadata?.plan_name || "Pro";

      // Update payment status
      await serviceClient
        .from("payments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          metadata: {
            stripe_session_id: sessionId,
            subscription_id: session.subscription,
            customer_id: session.customer,
          },
        })
        .eq("payment_link_id", sessionId);

      // Update or insert user plan
      const { data: existingPlan } = await serviceClient
        .from("user_plans")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existingPlan) {
        await serviceClient
          .from("user_plans")
          .update({
            plan_name: planName,
            status: "active",
            started_at: new Date().toISOString(),
            expires_at: null, // Subscription doesn't expire unless cancelled
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
      } else {
        await serviceClient.from("user_plans").insert({
          user_id: userId,
          plan_name: planName,
          status: "active",
          started_at: new Date().toISOString(),
        });
      }

      console.log(`User ${userId} upgraded to ${planName}`);

      return new Response(
        JSON.stringify({
          success: true,
          status: "completed",
          planName,
          upgraded: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Payment still pending or failed
    return new Response(
      JSON.stringify({
        success: true,
        status: session.payment_status === "unpaid" ? "pending" : session.payment_status,
        planName: session.metadata?.plan_name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Verification failed";
    console.error("Error verifying Stripe payment:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
