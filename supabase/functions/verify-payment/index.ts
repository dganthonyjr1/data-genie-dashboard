import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SquareEnv = "sandbox" | "production";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate JWT
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.slice("Bearer ".length);
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    const userId = claimsData?.claims?.sub ?? null;

    if (claimsError || !userId) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const paymentLinkId = typeof body?.paymentLinkId === "string" ? body.paymentLinkId.trim() : "";

    if (!paymentLinkId) {
      return new Response(JSON.stringify({ success: false, error: "Missing paymentLinkId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Verifying payment for user ${userId}, paymentLinkId=${paymentLinkId}`);

    // Use service role to access payment data
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get payment record
    const { data: payment, error: paymentError } = await serviceClient
      .from("payments")
      .select("*")
      .eq("payment_link_id", paymentLinkId)
      .eq("user_id", userId)
      .maybeSingle();

    if (paymentError) {
      console.error("Error fetching payment:", paymentError);
      return new Response(JSON.stringify({ success: false, error: "Failed to fetch payment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!payment) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Payment not found",
        status: "not_found" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If already completed, return success
    if (payment.status === "completed") {
      console.log("Payment already marked as completed");
      return new Response(JSON.stringify({
        success: true,
        status: "completed",
        planName: payment.plan_name,
        amount: payment.amount,
        currency: payment.currency,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If failed/cancelled, return that status
    if (payment.status === "failed" || payment.status === "cancelled") {
      return new Response(JSON.stringify({
        success: false,
        status: payment.status,
        error: `Payment ${payment.status}`,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Payment is pending - verify with Square
    const squareEnv = (payment.square_environment as SquareEnv) || "sandbox";
    const baseUrl = squareEnv === "sandbox" 
      ? "https://connect.squareupsandbox.com" 
      : "https://connect.squareup.com";

    const rawAccessToken = (Deno.env.get("SQUARE_ACCESS_TOKEN") ?? "").trim();
    const SQUARE_ACCESS_TOKEN = rawAccessToken
      .replace(/^Bearer\s+/i, "")
      .replace(/^['"]|['"]$/g, "")
      .replace(/\s+/g, "")
      .trim();

    if (!SQUARE_ACCESS_TOKEN) {
      console.error("Square access token not configured");
      return new Response(JSON.stringify({
        success: false,
        status: "pending",
        error: "Payment verification unavailable",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch payment link details from Square
    console.log(`Fetching payment link from Square (${squareEnv}): ${paymentLinkId}`);
    
    const squareResponse = await fetch(`${baseUrl}/v2/online-checkout/payment-links/${paymentLinkId}`, {
      method: "GET",
      headers: {
        "Square-Version": "2024-01-18",
        Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const squareData = await squareResponse.json().catch(() => null);

    if (!squareResponse.ok) {
      console.error("Square API error:", JSON.stringify(squareData));
      // Return pending status if we can't verify
      return new Response(JSON.stringify({
        success: false,
        status: "pending",
        error: "Unable to verify with Square",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if orders exist for this payment link
    const orderId = squareData?.payment_link?.order_id;
    
    if (!orderId) {
      console.log("No order associated with payment link yet - still pending");
      return new Response(JSON.stringify({
        success: false,
        status: "pending",
        error: "Payment not yet completed",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the order to check if it's been paid
    console.log(`Fetching order from Square: ${orderId}`);
    
    const orderResponse = await fetch(`${baseUrl}/v2/orders/${orderId}`, {
      method: "GET",
      headers: {
        "Square-Version": "2024-01-18",
        Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const orderData = await orderResponse.json().catch(() => null);

    if (!orderResponse.ok) {
      console.error("Square order API error:", JSON.stringify(orderData));
      return new Response(JSON.stringify({
        success: false,
        status: "pending",
        error: "Unable to verify order status",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const order = orderData?.order;
    const orderState = order?.state;
    const tenders = order?.tenders || [];
    
    console.log(`Order state: ${orderState}, tenders: ${tenders.length}`);

    // Check if order is completed (has tenders = payment received)
    const isCompleted = orderState === "COMPLETED" || tenders.length > 0;

    if (isCompleted) {
      console.log("Payment confirmed as completed, upgrading user plan...");

      // Update payment status to completed
      const { error: updatePaymentError } = await serviceClient
        .from("payments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          metadata: {
            ...(payment.metadata as Record<string, unknown> || {}),
            order_id: orderId,
            order_state: orderState,
            verified_at: new Date().toISOString(),
          },
        })
        .eq("id", payment.id);

      if (updatePaymentError) {
        console.error("Error updating payment status:", updatePaymentError);
      }

      // Upgrade user plan
      const { data: existingPlan, error: planFetchError } = await serviceClient
        .from("user_plans")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (planFetchError) {
        console.error("Error fetching user plan:", planFetchError);
      }

      if (existingPlan) {
        // Update existing plan
        const { error: updatePlanError } = await serviceClient
          .from("user_plans")
          .update({
            plan_name: payment.plan_name,
            status: "active",
            payment_id: payment.id,
            started_at: new Date().toISOString(),
            expires_at: null, // Could set expiry for subscription plans
          })
          .eq("user_id", userId);

        if (updatePlanError) {
          console.error("Error updating user plan:", updatePlanError);
        } else {
          console.log(`User ${userId} upgraded to ${payment.plan_name} plan`);
        }
      } else {
        // Insert new plan
        const { error: insertPlanError } = await serviceClient
          .from("user_plans")
          .insert({
            user_id: userId,
            plan_name: payment.plan_name,
            status: "active",
            payment_id: payment.id,
          });

        if (insertPlanError) {
          console.error("Error inserting user plan:", insertPlanError);
        } else {
          console.log(`User ${userId} plan created: ${payment.plan_name}`);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        status: "completed",
        planName: payment.plan_name,
        amount: payment.amount,
        currency: payment.currency,
        upgraded: true,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Still pending
    return new Response(JSON.stringify({
      success: false,
      status: "pending",
      orderState: orderState,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to verify payment";
    console.error("Error verifying payment:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
