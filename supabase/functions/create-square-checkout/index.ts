import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SquareEnv = "sandbox" | "production";

interface CheckoutRequest {
  planName: string;
  amount: number; // cents
  currency?: string; // ISO 4217
  redirectUrl?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Normalize secrets (users sometimes paste tokens with a "Bearer " prefix, quotes, or hidden newlines)
    const rawAccessToken = (Deno.env.get("SQUARE_ACCESS_TOKEN") ?? "").trim();
    const rawLocationId = (Deno.env.get("SQUARE_LOCATION_ID") ?? "").trim();

    const SQUARE_ACCESS_TOKEN = rawAccessToken
      .replace(/^Bearer\s+/i, "")
      .replace(/^['"]|['"]$/g, "")
      // tokens must not contain whitespace; remove any hidden \n/\r/\t/spaces from copy-paste
      .replace(/\s+/g, "")
      .trim();

    const SQUARE_LOCATION_ID = rawLocationId
      .replace(/^['"]|['"]$/g, "")
      .replace(/\s+/g, "")
      .trim();

    if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
      throw new Error("Square credentials not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate JWT (signing-keys compatible)
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
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as CheckoutRequest;

    const planName = typeof body?.planName === "string" ? body.planName.trim() : "";
    const amount = typeof body?.amount === "number" ? body.amount : NaN;
    const currency =
      typeof body?.currency === "string" && body.currency.trim()
        ? body.currency.trim().toUpperCase()
        : "USD";

    const redirectUrl =
      typeof body?.redirectUrl === "string" && body.redirectUrl.trim()
        ? body.redirectUrl.trim()
        : undefined;

    if (!planName) throw new Error("Invalid plan name");
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
      throw new Error("Invalid amount");
    }
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Invalid currency");

    const origin = req.headers.get("origin") ?? "";
    // We'll build the final redirect URL after we have the paymentLinkId
    const baseRedirectUrl = redirectUrl ?? (origin ? `${origin}/payment/success` : null);
    if (!baseRedirectUrl) throw new Error("Missing redirect URL");

    const sanitizedPlanName = planName.slice(0, 100).replace(/[<>]/g, "");

    console.log(`Creating Square checkout for user ${userId}, plan=${sanitizedPlanName}, amount=${amount}`);

    const idempotencyKey = crypto.randomUUID();

    // Prefer sandbox while testing in preview, but fall back to production if auth fails.
    const configuredEnv = (Deno.env.get("SQUARE_ENVIRONMENT") ?? "").toLowerCase();
    const isPreviewOrigin = origin.includes("lovable") || origin.includes("localhost");
    const preferSandbox = configuredEnv === "sandbox" || (configuredEnv !== "production" && isPreviewOrigin);

    const envOrder: SquareEnv[] = preferSandbox ? ["sandbox", "production"] : ["production", "sandbox"];

    const squareHeaders = {
      "Square-Version": "2024-01-18",
      Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    };

    const createPaymentLink = async (baseUrl: string, locationId: string) => {
      const response = await fetch(`${baseUrl}/v2/online-checkout/payment-links`, {
        method: "POST",
        headers: squareHeaders,
        body: JSON.stringify({
          idempotency_key: idempotencyKey,
          quick_pay: {
            name: `ScrapeX ${sanitizedPlanName} Plan`,
            price_money: { amount, currency },
            location_id: locationId,
          },
          checkout_options: {
            redirect_url: baseRedirectUrl,
            ask_for_shipping_address: false,
          },
          ...(userEmail ? { pre_populated_data: { buyer_email: userEmail } } : {}),
        }),
      });

      const data = await response.json().catch(() => null as any);
      return { response, data };
    };

    const fetchFirstActiveLocationId = async (baseUrl: string): Promise<string | null> => {
      try {
        const res = await fetch(`${baseUrl}/v2/locations`, { headers: squareHeaders });
        const data = await res.json().catch(() => null as any);

        if (!res.ok) {
          console.warn(`Square locations lookup failed (${res.status})`, JSON.stringify(data));
          return null;
        }

        const locations =
          (data?.locations as Array<{ id?: string; status?: string }> | undefined) ?? [];

        const chosen =
          locations.find((l) => l.status === "ACTIVE" && l.id) ?? locations.find((l) => l.id);

        return chosen?.id ?? null;
      } catch (e) {
        console.warn("Square locations lookup threw:", e);
        return null;
      }
    };

    const respondWithPaymentLink = async (env: SquareEnv, baseUrl: string, squareData: any) => {
      const paymentLinkId = squareData?.payment_link?.id;
      const checkoutUrl = squareData?.payment_link?.url;

      // Store payment record in database BEFORE redirecting
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { error: insertError } = await serviceClient.from("payments").insert({
        user_id: userId,
        payment_link_id: paymentLinkId,
        plan_name: sanitizedPlanName,
        amount,
        currency,
        status: "pending",
        square_environment: env,
        metadata: { idempotency_key: idempotencyKey },
      });

      if (insertError) {
        console.error("Failed to store payment record:", insertError);
      } else {
        console.log(`Payment record created for paymentLinkId=${paymentLinkId}`);
      }

      // Build final redirect URL with paymentLinkId
      const finalRedirectUrl = new URL(baseRedirectUrl);
      finalRedirectUrl.searchParams.set("paymentLinkId", paymentLinkId);

      // Update the payment link with the correct redirect URL
      const updateResponse = await fetch(`${baseUrl}/v2/online-checkout/payment-links/${paymentLinkId}`, {
        method: "PUT",
        headers: squareHeaders,
        body: JSON.stringify({
          payment_link: {
            checkout_options: {
              redirect_url: finalRedirectUrl.toString(),
              ask_for_shipping_address: false,
            },
          },
        }),
      });

      if (!updateResponse.ok) {
        console.warn("Could not update redirect URL, using original");
      }

      return new Response(
        JSON.stringify({
          success: true,
          checkoutUrl,
          paymentLinkId,
          environment: env,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    };

    const resolvedLocationIdByEnv: Partial<Record<SquareEnv, string>> = {};

    let lastDetail = "This request could not be authorized.";

    for (const env of envOrder) {
      const baseUrl = env === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";
      console.log(`Attempting Square ${env} environment`);

      const configuredLocationId = resolvedLocationIdByEnv[env] ?? SQUARE_LOCATION_ID;

      let { response: squareResponse, data: squareData } = await createPaymentLink(baseUrl, configuredLocationId);

      if (squareResponse.ok) {
        return await respondWithPaymentLink(env, baseUrl, squareData);
      }

      const detail = squareData?.errors?.[0]?.detail || `Square API error (${squareResponse.status})`;
      lastDetail = detail;

      const category = squareData?.errors?.[0]?.category;
      const code = squareData?.errors?.[0]?.code;
      const isAuthError =
        squareResponse.status === 401 || category === "AUTHENTICATION_ERROR" || code === "UNAUTHORIZED";

      console.error(`Square API error (${env}):`, JSON.stringify(squareData));

      // Workaround: when Location ID is from the wrong environment/account, Square can respond as "UNAUTHORIZED".
      // If auth fails, try to fetch the first ACTIVE location for this token/environment and retry once.
      if (isAuthError && !resolvedLocationIdByEnv[env]) {
        const resolved = await fetchFirstActiveLocationId(baseUrl);

        if (resolved && resolved !== configuredLocationId) {
          resolvedLocationIdByEnv[env] = resolved;
          console.warn("Retrying with Location ID resolved from Square locations list.");

          ({ response: squareResponse, data: squareData } = await createPaymentLink(baseUrl, resolved));

          if (squareResponse.ok) {
            return await respondWithPaymentLink(env, baseUrl, squareData);
          }

          const retryDetail =
            squareData?.errors?.[0]?.detail || `Square API error (${squareResponse.status})`;
          lastDetail = retryDetail;

          const retryCategory = squareData?.errors?.[0]?.category;
          const retryCode = squareData?.errors?.[0]?.code;
          const isAuthErrorRetry =
            squareResponse.status === 401 ||
            retryCategory === "AUTHENTICATION_ERROR" ||
            retryCode === "UNAUTHORIZED";

          console.error(`Square API error (${env}, retry):`, JSON.stringify(squareData));

          if (!isAuthErrorRetry) {
            throw new Error(retryDetail);
          }
        }
      }

      if (isAuthError) continue;

      throw new Error(detail);
    }

    if (lastDetail === "This request could not be authorized.") {
      throw new Error(
        "Square authorization failed. Double-check that SQUARE_ACCESS_TOKEN is a valid token (paste ONLY the token, not 'Bearer ...') and that it matches the same environment as SQUARE_LOCATION_ID."
      );
    }

    throw new Error(lastDetail);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create checkout";
    console.error("Error creating Square checkout:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
