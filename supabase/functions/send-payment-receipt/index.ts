import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentReceiptRequest {
  email: string;
  planName: string;
  amount: number;
  currency: string;
  transactionId: string;
  customerName?: string;
}

const formatAmount = (amount: number, currency: string): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount / 100);
};

const generateReceiptHtml = (data: PaymentReceiptRequest): string => {
  const formattedAmount = formatAmount(data.amount, data.currency);
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt - ScrapeX</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0f;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #111118; border-radius: 16px; border: 1px solid #1e1e2e; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);">
              <div style="display: inline-block; margin-bottom: 20px;">
                <span style="font-size: 28px; font-weight: 800; background: linear-gradient(90deg, #ec4899, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -0.5px;">ScrapeX</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #ffffff;">Payment Successful!</h1>
              <p style="margin: 10px 0 0; font-size: 14px; color: #9ca3af;">Thank you for your purchase</p>
            </td>
          </tr>

          <!-- Success Icon -->
          <tr>
            <td align="center" style="padding: 30px 40px 20px;">
              <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%); display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 40px; line-height: 80px;">✓</span>
              </div>
            </td>
          </tr>

          <!-- Receipt Details -->
          <tr>
            <td style="padding: 20px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #1a1a24; border-radius: 12px; border: 1px solid #2a2a3a;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #2a2a3a;">
                          <span style="font-size: 13px; color: #9ca3af;">Date</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #2a2a3a; text-align: right;">
                          <span style="font-size: 14px; color: #ffffff; font-weight: 500;">${date}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #2a2a3a;">
                          <span style="font-size: 13px; color: #9ca3af;">Plan</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #2a2a3a; text-align: right;">
                          <span style="font-size: 14px; color: #06b6d4; font-weight: 600;">ScrapeX ${data.planName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #2a2a3a;">
                          <span style="font-size: 13px; color: #9ca3af;">Transaction ID</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #2a2a3a; text-align: right;">
                          <span style="font-size: 12px; color: #6b7280; font-family: monospace;">${data.transactionId.slice(0, 20)}...</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 0 8px;">
                          <span style="font-size: 15px; color: #ffffff; font-weight: 600;">Total Paid</span>
                        </td>
                        <td style="padding: 16px 0 8px; text-align: right;">
                          <span style="font-size: 24px; color: #22c55e; font-weight: 700;">${formattedAmount}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 20px 40px 30px;">
              <a href="https://scrapex.lovable.app/dashboard" style="display: inline-block; padding: 14px 32px; background: linear-gradient(90deg, #06b6d4, #0891b2); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px;">
                Go to Dashboard →
              </a>
            </td>
          </tr>

          <!-- What's Next -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <div style="background-color: #1a1a24; border-radius: 12px; border: 1px solid #2a2a3a; padding: 24px;">
                <h3 style="margin: 0 0 16px; font-size: 16px; color: #ffffff; font-weight: 600;">What's included in your ${data.planName} plan:</h3>
                <ul style="margin: 0; padding: 0 0 0 20px; color: #9ca3af; font-size: 14px; line-height: 1.8;">
                  ${data.planName === "Pro" ? `
                    <li>2,500 scrapes per month</li>
                    <li>AI Revenue Leak Analysis</li>
                    <li>100 AI Sales Calls/month</li>
                    <li>Lead scoring & prioritization</li>
                    <li>API access (10K requests/mo)</li>
                  ` : `
                    <li>Unlimited scrapes</li>
                    <li>Unlimited AI Sales Calls</li>
                    <li>Unlimited API access</li>
                    <li>Dedicated account manager</li>
                    <li>Custom integrations</li>
                  `}
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #0d0d12; border-top: 1px solid #1e1e2e; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 12px; color: #6b7280;">
                Questions? Contact us at <a href="mailto:support@scrapex.com" style="color: #06b6d4; text-decoration: none;">support@scrapex.com</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #4b5563;">
                © ${new Date().getFullYear()} ScrapeX. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: PaymentReceiptRequest = await req.json();

    console.log(`Sending payment receipt to ${data.email} for ${data.planName} plan`);

    const html = generateReceiptHtml(data);

    const emailResponse = await resend.emails.send({
      from: "ScrapeX <onboarding@resend.dev>",
      to: [data.email],
      subject: `Payment Receipt - ScrapeX ${data.planName} Plan`,
      html,
    });

    console.log("Payment receipt sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, ...emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send receipt";
    console.error("Error sending payment receipt:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
