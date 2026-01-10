import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  Check, 
  ArrowRight, 
  Sparkles,
  Building2,
  Rocket,
  Crown,
  HelpCircle
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Pricing = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Starter",
      icon: Rocket,
      price: "Free",
      period: "",
      description: "Perfect for trying out ScrapeX and small projects",
      popular: false,
      features: [
        "50 scrapes per month",
        "Basic business data extraction",
        "Manual lead management",
        "Email support",
        "1 user",
        "7-day data retention",
      ],
      notIncluded: [
        "AI Revenue Analysis",
        "Autonomous Sales Calls",
        "API Access",
        "Webhooks",
      ],
      cta: "Get Started Free",
      ctaVariant: "outline" as const,
    },
    {
      name: "Pro",
      icon: Zap,
      price: "$99",
      period: "/month",
      description: "For growing teams ready to scale their outreach",
      popular: true,
      features: [
        "2,500 scrapes per month",
        "Complete business intelligence",
        "AI Revenue Leak Analysis",
        "100 AI Sales Calls/month",
        "Lead scoring & prioritization",
        "API access (10K requests/mo)",
        "Webhook integrations",
        "5 team members",
        "30-day data retention",
        "Priority email support",
      ],
      notIncluded: [
        "Dedicated account manager",
        "Custom integrations",
      ],
      cta: "Start Pro Trial",
      ctaVariant: "default" as const,
    },
    {
      name: "Enterprise",
      icon: Crown,
      price: "Custom",
      period: "",
      description: "For organizations with advanced needs and scale",
      popular: false,
      features: [
        "Unlimited scrapes",
        "Complete business intelligence",
        "AI Revenue Leak Analysis",
        "Unlimited AI Sales Calls",
        "Advanced lead scoring",
        "Unlimited API access",
        "Custom webhook integrations",
        "Unlimited team members",
        "90-day data retention",
        "Dedicated account manager",
        "Custom integrations",
        "SSO & SAML",
        "SLA guarantee",
        "On-premise deployment option",
      ],
      notIncluded: [],
      cta: "Contact Sales",
      ctaVariant: "outline" as const,
    },
  ];

  const faqs = [
    {
      question: "How does the free trial work?",
      answer: "Start with our Starter plan completely free. No credit card required. When you're ready to scale, upgrade to Pro for a 14-day free trial with full access to all Pro features.",
    },
    {
      question: "What counts as a 'scrape'?",
      answer: "A scrape is a single data extraction request. This could be scraping one business from Google Maps, analyzing a website, or extracting data from a single URL. Bulk operations count as multiple scrapes based on the number of results returned.",
    },
    {
      question: "How do AI Sales Calls work?",
      answer: "When you scrape a business with a phone number, ScrapeX can automatically initiate an AI-powered sales call. The AI uses the scraped data—including pain points and revenue opportunities—to deliver a personalized pitch.",
    },
    {
      question: "Can I change plans anytime?",
      answer: "Yes! Upgrade or downgrade at any time. When upgrading, you'll get immediate access to new features. When downgrading, changes take effect at the next billing cycle.",
    },
    {
      question: "What integrations are supported?",
      answer: "Pro plans include webhook integrations for real-time data sync. We support popular CRMs like Salesforce, HubSpot, and Pipedrive. Enterprise plans can request custom integrations.",
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use bank-grade encryption, row-level security, and SOC 2-compliant infrastructure. Your data is never shared or sold to third parties.",
    },
  ];

  const comparisonFeatures = [
    { feature: "Monthly Scrapes", starter: "50", pro: "2,500", enterprise: "Unlimited" },
    { feature: "AI Revenue Analysis", starter: false, pro: true, enterprise: true },
    { feature: "AI Sales Calls", starter: false, pro: "100/mo", enterprise: "Unlimited" },
    { feature: "Lead Scoring", starter: false, pro: true, enterprise: true },
    { feature: "API Access", starter: false, pro: "10K/mo", enterprise: "Unlimited" },
    { feature: "Webhooks", starter: false, pro: true, enterprise: true },
    { feature: "Team Members", starter: "1", pro: "5", enterprise: "Unlimited" },
    { feature: "Data Retention", starter: "7 days", pro: "30 days", enterprise: "90 days" },
    { feature: "Dedicated Support", starter: false, pro: false, enterprise: true },
    { feature: "Custom Integrations", starter: false, pro: false, enterprise: true },
    { feature: "SSO/SAML", starter: false, pro: false, enterprise: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                ScrapeX
              </span>
            </button>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/login")}>
                Sign In
              </Button>
              <Button onClick={() => navigate("/signup")} className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 px-4 py-2 border-primary/50 bg-primary/10">
            <Sparkles className="w-4 h-4 mr-2 text-primary" />
            Simple, Transparent Pricing
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl font-bold mb-6" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Scale Your Sales with{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Predictable Pricing
            </span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From startups to enterprises, choose the plan that fits your growth. 
            No hidden fees, no surprises.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative bg-card/50 border-border/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 ${
                  plan.popular ? "border-primary shadow-lg shadow-primary/20 scale-105" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-4">
                    <plan.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl" style={{ fontFamily: 'Orbitron, sans-serif' }}>{plan.name}</CardTitle>
                  <CardDescription className="text-muted-foreground">{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <span className="text-5xl font-bold text-foreground" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>

                  <Button 
                    className={`w-full ${plan.popular ? "bg-gradient-to-r from-primary to-secondary hover:opacity-90" : ""}`}
                    variant={plan.ctaVariant}
                    onClick={() => navigate(plan.name === "Enterprise" ? "/contact" : "/signup")}
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  <div className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </div>
                    ))}
                    {plan.notIncluded.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3 opacity-50">
                        <div className="w-5 h-5 shrink-0 mt-0.5 flex items-center justify-center">
                          <div className="w-1.5 h-0.5 bg-muted-foreground rounded" />
                        </div>
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card/30 border-y border-border/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Compare <span className="text-primary">Plans</span>
            </h2>
            <p className="text-muted-foreground">See exactly what's included in each plan</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-4 px-4 text-left text-foreground font-semibold">Feature</th>
                  <th className="py-4 px-4 text-center text-foreground font-semibold">Starter</th>
                  <th className="py-4 px-4 text-center text-primary font-semibold">Pro</th>
                  <th className="py-4 px-4 text-center text-foreground font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row, index) => (
                  <tr key={index} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-4 text-foreground">{row.feature}</td>
                    <td className="py-4 px-4 text-center">
                      {typeof row.starter === "boolean" ? (
                        row.starter ? (
                          <Check className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <div className="w-5 h-0.5 bg-muted-foreground/30 mx-auto rounded" />
                        )
                      ) : (
                        <span className="text-muted-foreground">{row.starter}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center bg-primary/5">
                      {typeof row.pro === "boolean" ? (
                        row.pro ? (
                          <Check className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <div className="w-5 h-0.5 bg-muted-foreground/30 mx-auto rounded" />
                        )
                      ) : (
                        <span className="text-foreground font-medium">{row.pro}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {typeof row.enterprise === "boolean" ? (
                        row.enterprise ? (
                          <Check className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <div className="w-5 h-0.5 bg-muted-foreground/30 mx-auto rounded" />
                        )
                      ) : (
                        <span className="text-foreground font-medium">{row.enterprise}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ROI Calculator Teaser */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border-primary/30">
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Calculate Your ROI
              </h3>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                On average, ScrapeX customers see a <span className="text-primary font-semibold">340% ROI</span> within the first 3 months. 
                Our AI-powered pipeline identifies opportunities that manual prospecting misses.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div className="p-4 bg-background/50 rounded-lg">
                  <div className="text-3xl font-bold text-primary" style={{ fontFamily: 'Orbitron, sans-serif' }}>4x</div>
                  <div className="text-sm text-muted-foreground">More Qualified Leads</div>
                </div>
                <div className="p-4 bg-background/50 rounded-lg">
                  <div className="text-3xl font-bold text-secondary" style={{ fontFamily: 'Orbitron, sans-serif' }}>67%</div>
                  <div className="text-sm text-muted-foreground">Less Time Prospecting</div>
                </div>
                <div className="p-4 bg-background/50 rounded-lg">
                  <div className="text-3xl font-bold text-accent" style={{ fontFamily: 'Orbitron, sans-serif' }}>2.3x</div>
                  <div className="text-sm text-muted-foreground">Higher Close Rate</div>
                </div>
              </div>
              <Button onClick={() => navigate("/signup")} className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                Start Your Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card/30 border-y border-border/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 px-4 py-2 border-accent/50 bg-accent/10">
              <HelpCircle className="w-4 h-4 mr-2 text-accent" />
              FAQ
            </Badge>
            <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Frequently Asked <span className="text-accent">Questions</span>
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-background/50 border border-border/50 rounded-lg px-6"
              >
                <AccordionTrigger className="text-left font-medium text-foreground hover:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Ready to Transform Your Sales Pipeline?
          </h2>
          <p className="text-muted-foreground mb-8">
            Start with our free plan. No credit card required.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate("/signup")}
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-lg px-8"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-border/50 bg-card/30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-foreground" style={{ fontFamily: 'Orbitron, sans-serif' }}>ScrapeX</span>
          </button>
          <div className="text-sm text-muted-foreground">
            © 2025 ScrapeX. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
