import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, ArrowRight, PhoneCall, Shield } from "lucide-react";

const Contact = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const mailtoHref = useMemo(() => {
    const subject = encodeURIComponent("ScrapeX Enterprise — Contact Sales");
    const body = encodeURIComponent(
      `Name: ${name || ""}\nEmail: ${email || ""}\n\nMessage:\n${message || ""}`
    );
    return `mailto:sales@scrapex.io?subject=${subject}&body=${body}`;
  }, [name, email, message]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-foreground font-semibold"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            ScrapeX
          </button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/pricing")}>
              Pricing
            </Button>
            <Button onClick={() => navigate("/signup")}>Get Started</Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4 px-4 py-2">
            <PhoneCall className="w-4 h-4 mr-2 text-primary" />
            Enterprise Sales
          </Badge>
          <h1
            className="text-4xl sm:text-5xl font-bold mb-3"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            Contact Sales
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tell us about your use case (industry, volume, regions, calling needs) and we’ll recommend the right setup.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Send us a message</CardTitle>
              <CardDescription>
                This opens your email client pre-filled (no form submission required).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-foreground">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-foreground">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-foreground">What are you trying to do?</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Example: 10k scrapes/mo across US+EU, auto-calls on scrape completion, webhook to our dialer…"
                  className="min-h-[120px]"
                />
              </div>

              <Button asChild className="w-full">
                <a href={mailtoHref}>
                  <Mail className="w-4 h-4 mr-2" />
                  Email Sales
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>

              <p className="text-xs text-muted-foreground">
                Security note: please don’t include API keys or sensitive credentials.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>What we’ll cover</CardTitle>
              <CardDescription>
                Fast checklist to get your Enterprise rollout right.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Data + compliance</p>
                  <p className="text-sm text-muted-foreground">Regions, retention, and how your team accesses results.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Calling architecture</p>
                  <p className="text-sm text-muted-foreground">Webhook handoff to your voice provider, logging, and controls.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Volume + limits</p>
                  <p className="text-sm text-muted-foreground">Scrapes, API usage, and call-minute overage expectations.</p>
                </div>
              </div>

              <div className="pt-2">
                <Button variant="outline" className="w-full" onClick={() => navigate("/pricing")}>
                  Back to Pricing
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Contact;
