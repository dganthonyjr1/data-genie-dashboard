import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PhoneCall, Webhook, FileText, ShieldCheck, Timer, Route } from "lucide-react";

const AICallingTechnicalExplainer = () => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 px-4 py-2">
            <PhoneCall className="w-4 h-4 mr-2 text-primary" />
            AI Calling (Technical Overview)
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>
            How AI Calling Works
          </h2>
          <p className="text-muted-foreground mt-3 max-w-3xl mx-auto">
            ScrapeX doesn’t act as a telephony carrier. We trigger calls by sending structured lead context to your
            calling provider via a secure webhook, then log call attempts for visibility.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="w-5 h-5 text-primary" />
                Triggers
              </CardTitle>
              <CardDescription>When a call starts automatically.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong className="text-foreground">Auto-call on scrape completion:</strong> if enabled, completed jobs can
                auto-trigger calls for leads with valid phone numbers.
              </p>
              <p>
                <strong className="text-foreground">Instant call on lead add:</strong> when you manually add a lead, a call can
                be triggered immediately.
              </p>
              <p>
                <strong className="text-foreground">Phone normalization:</strong> numbers are normalized to E.164
                (example: +1XXXXXXXXXX) for compatibility.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="w-5 h-5 text-primary" />
                Webhook Handoff
              </CardTitle>
              <CardDescription>What we send to your calling stack.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p>
                ScrapeX sends a JSON payload to your automation layer (e.g., Make) which then connects to a voice
                provider (e.g., Vapi, Bland).
              </p>
              <Separator />
              <div>
                <p className="text-foreground font-medium mb-2">Sample payload (simplified)</p>
                <pre className="text-xs whitespace-pre-wrap rounded-md bg-muted/40 border border-border/50 p-3">
{`{
  "business_name": "Acme Roofing",
  "phone_number": "+14155552671",
  "niche": "Roofing",
  "pain_score": 7,
  "evidence_summary": "No online booking; slow site; weak reviews",
  "monthly_revenue": 35000,
  "revenue_leak": 4200
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Logging + Visibility
              </CardTitle>
              <CardDescription>How you audit what happened.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Every call trigger is logged so you can review status, timestamps, and errors inside the Call Attempts
                dashboard.
              </p>
              <p>
                If your voice provider supports recordings/transcripts, those remain in your provider unless you
                explicitly sync them back.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-primary" />
                Metering + Billing
              </CardTitle>
              <CardDescription>How “minutes” are accounted for.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Plans include a monthly minute allotment (e.g., 100 minutes Pro / 500 minutes Enterprise). Additional
                minutes are billed at your plan’s overage rate.
              </p>
              <p>
                Minute usage is derived from call duration reported by the downstream calling provider.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Security Notes
              </CardTitle>
              <CardDescription>What’s shared and what’s not.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Only the data needed to place the call and personalize the pitch is sent in the webhook payload.
              </p>
              <p>
                You control whether auto-calling is enabled, and you can disable it at any time.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default AICallingTechnicalExplainer;
