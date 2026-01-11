import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Zap, 
  Target, 
  Phone, 
  TrendingUp, 
  Shield, 
  Globe,
  ArrowRight,
  Play,
  CheckCircle2,
  Sparkles,
  Building2,
  Users,
  BarChart3,
  HelpCircle
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { enableDemoMode } = useDemoMode();
  const [checking, setChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleWatchDemo = () => {
    enableDemoMode();
    navigate("/dashboard");
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setIsAuthenticated(true);
      }
      setChecking(false);
    };

    checkAuth();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const stats = [
    { value: "150+", label: "Countries Supported" },
    { value: "85-90%", label: "Contact Accuracy" },
    { value: "<3s", label: "Average Scrape Time" },
    { value: "Auto", label: "AI Sales Calls" },
  ];

  const features = [
    {
      icon: Target,
      title: "Intelligent Web Scraping",
      description: "Extract business data from websites, Google Business Profiles, and directories. Captures names, phone numbers, emails, and social profiles.",
    },
    {
      icon: Sparkles,
      title: "AI Revenue Analysis",
      description: "Our AI analyzes scraped data to identify business size, service gaps, competitive positioning, and growth opportunities.",
    },
    {
      icon: Phone,
      title: "Autonomous AI Sales Calls",
      description: "AI calls trigger automatically when scraping completes (if enabled) or when you add leads. Personalized pitches based on scraped business data.",
    },
    {
      icon: TrendingUp,
      title: "Lead Scoring & Prioritization",
      description: "AI ranks leads by conversion potential based on business data, helping your team focus on high-value prospects.",
    },
    {
      icon: Shield,
      title: "Secure Infrastructure",
      description: "Built on Supabase with API key authentication, HTTPS encryption, and row-level security. Your data is never sold or shared.",
    },
    {
      icon: Globe,
      title: "REST API & Webhooks",
      description: "Integrate via REST API with real-time webhook notifications. Rate limits: 100 req/min, 1,000 jobs/day.",
    },
  ];

  const pipelineSteps = [
    { step: "1", title: "Scrape", description: "Enter a URL or search query to extract business data" },
    { step: "2", title: "Analyze", description: "AI identifies service gaps & growth opportunities" },
    { step: "3", title: "Score", description: "Leads ranked by conversion potential" },
    { step: "4", title: "Call", description: "Auto-triggered AI calls with personalized pitch" },
  ];

  const testimonials = [
    {
      quote: "We reduced our lead research time by 70% and increased qualified conversations by 3x.",
      author: "Sarah Chen",
      role: "VP Sales, TechFlow Solutions",
      avatar: "SC",
    },
    {
      quote: "The bulk scraping feature alone saves us 20 hours per week on manual data entry.",
      author: "Marcus Johnson",
      role: "Founder, Growth Partners Agency",
      avatar: "MJ",
    },
    {
      quote: "Finally, a tool that handles scraping and calling without switching between platforms.",
      author: "Emily Rodriguez",
      role: "Director of BizDev, ScaleUp Inc",
      avatar: "ER",
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                ScrapeX
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/pricing")} className="hidden sm:inline-flex">
                Pricing
              </Button>
              {isAuthenticated ? (
                <Button onClick={() => navigate("/dashboard")} className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => navigate("/login")}>
                    Sign In
                  </Button>
                  <Button onClick={() => navigate("/signup")} className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                    Get Started Free
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-secondary/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 px-4 py-2 border-primary/50 bg-primary/10">
            <Sparkles className="w-4 h-4 mr-2 text-primary" />
            Scraping + Analysis + Calling in One Platform
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-tight" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            <span className="text-foreground">Scrape. Analyze. Call.</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              All in One Platform.
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Extract business data, identify revenue opportunities, and trigger AI-powered sales calls—without 
            switching between tools. One platform. One price. Faster, simpler, more affordable.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button 
              size="lg" 
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/signup")}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-lg px-8 py-6 h-auto"
            >
              {isAuthenticated ? "Go to Dashboard" : "Start Free Trial"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={handleWatchDemo}
              className="text-lg px-8 py-6 h-auto border-muted-foreground/30 hover:bg-muted/50"
            >
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                <div className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card/30 border-y border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-4 py-2 border-accent/50 bg-accent/10">
              <Zap className="w-4 h-4 mr-2 text-accent" />
              How It Works
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              From Data to <span className="text-primary">Deals</span> in Minutes
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most businesses scraped in under 3 seconds. Review AI analysis, then call with one click.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {pipelineSteps.map((step, index) => (
              <div key={index} className="relative">
                <Card className="bg-background/50 border-border/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-300 h-full">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>{step.step}</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
                {index < pipelineSteps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-4 py-2 border-secondary/50 bg-secondary/10">
              <Shield className="w-4 h-4 mr-2 text-secondary" />
              Platform Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              What <span className="text-secondary">ScrapeX</span> Does
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Combine scraping, AI analysis, and calling in one platform. Simpler than juggling three separate tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card/50 border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card/30 border-y border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-4 py-2 border-primary/50 bg-primary/10">
              <Users className="w-4 h-4 mr-2 text-primary" />
              Trusted by Leaders
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              What Our <span className="text-primary">Customers</span> Say
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-background/50 border-border/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Sparkles key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 italic">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold text-sm">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{testimonial.author}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Logos Section */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-6">Trusted by innovative companies worldwide</p>
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-6 h-6" />
                <span className="font-semibold">TechCorp</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <BarChart3 className="w-6 h-6" />
                <span className="font-semibold">ScaleUp</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="w-6 h-6" />
                <span className="font-semibold">GlobalSales</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="w-6 h-6" />
                <span className="font-semibold">LeadPro</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Zap className="w-6 h-6" />
                <span className="font-semibold">FastGrowth</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Ready to <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Simplify</span> Your Lead Generation?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Stop juggling three different tools. Get scraping, analysis, and calling in one platform 
            for $99/month instead of $300+ for separate subscriptions. Start free.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Button 
              size="lg" 
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/signup")}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-lg px-8 py-6 h-auto"
            >
              {isAuthenticated ? "Go to Dashboard" : "Start Free Trial"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              14-day free trial
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card/30 border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 px-4 py-2 border-primary/50 bg-primary/10">
              <HelpCircle className="w-4 h-4 mr-2 text-primary" />
              Frequently Asked Questions
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Honest <span className="text-primary">Answers</span>
            </h2>
            <p className="text-muted-foreground">
              No marketing fluff. Here's exactly what ScrapeX does and doesn't do.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="accuracy" className="bg-background/50 border border-border/50 rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                How accurate is the scraped data?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p className="mb-2">
                  <strong>Typical accuracy: 85-90%</strong> for contact information (phone numbers, emails).
                </p>
                <p className="mb-2">
                  We extract data from websites, Google Business Profiles, and directories. Accuracy varies by source—Google Business Profiles tend to be most reliable.
                </p>
                <p>
                  <strong>Our recommendation:</strong> Verify critical contact info before outreach. You can manually edit any scraped results directly in the platform.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="international" className="bg-background/50 border border-border/50 rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                Does ScrapeX work internationally?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p className="mb-2">
                  <strong>Yes, with some limitations.</strong> We support scraping in 150+ countries using geo-targeted requests.
                </p>
                <p className="mb-2">
                  <strong>Phone validation:</strong> Most robust for US and UK formats. For other countries, we extract numbers but recommend manual verification.
                </p>
                <p>
                  <strong>Region targeting:</strong> We offer state/province dropdowns for US, Canada, UK, Australia, Germany, France, India, Brazil, Mexico, Spain, Italy, South Africa, Japan, New Zealand, and Ireland.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ai-calls" className="bg-background/50 border border-border/50 rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                How do AI Sales Calls work?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p className="mb-2">
                  <strong>Autonomous calling with two trigger modes:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 mb-2">
                  <li><strong>Auto-Call on Scrape Complete:</strong> Enable this in Settings, and calls trigger automatically for all scraped leads with phone numbers when a job finishes.</li>
                  <li><strong>Instant Call on Lead Add:</strong> When you manually add a lead, an AI call initiates immediately.</li>
                </ul>
                <p className="mb-2">
                  The AI generates a personalized pitch based on the business data (name, niche, services, pain score, revenue metrics) and handles the conversation in real-time.
                </p>
                <p className="mb-2">
                  <strong>Pricing:</strong> AI calls are pay-as-you-go at $0.15/minute (Pro) or $0.12/minute (Enterprise). Pro includes 100 call minutes/month, Enterprise includes 500 minutes/month. Overage is billed monthly.
                </p>
                <p>
                  <strong>Control:</strong> You can disable auto-calling anytime in Settings if you prefer to review leads first. All calls are logged in the Call Attempts dashboard.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="processing-time" className="bg-background/50 border border-border/50 rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                How long does scraping take?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p className="mb-2">Processing time depends on job size and data source:</p>
                <ul className="list-disc list-inside space-y-1 mb-2">
                  <li><strong>Single business:</strong> Under 3 seconds</li>
                  <li><strong>5-10 URLs:</strong> 30 seconds - 1 minute</li>
                  <li><strong>50 URLs:</strong> 2-3 minutes</li>
                  <li><strong>100+ URLs:</strong> 5-10 minutes</li>
                </ul>
                <p>
                  Times may vary based on website response times and server load.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="crm" className="bg-background/50 border border-border/50 rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                Can I integrate with my CRM?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p className="mb-2">
                  <strong>Yes, via REST API.</strong> We provide complete API documentation, code examples (JavaScript, Python, cURL), and webhook support for real-time updates.
                </p>
                <p className="mb-2">
                  <strong>Manual export:</strong> CSV, JSON, and Google Sheets export for direct CRM import.
                </p>
                <p>
                  <strong>Limitation:</strong> We don't have pre-built Salesforce or HubSpot integrations yet. Our API makes custom integration straightforward—contact support if you need help.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="comparison" className="bg-background/50 border border-border/50 rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                How does ScrapeX compare to Apollo/Hunter/ZoomInfo?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p className="mb-2">
                  <strong>ScrapeX combines three functions in one platform:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 mb-2">
                  <li>Web scraping (like Apollo, Hunter)</li>
                  <li>AI analysis (like Clearbit)</li>
                  <li>AI calling (like Outreach, SalesLoft)</li>
                </ul>
                <p className="mb-2">
                  <strong>Trade-offs:</strong> ScrapeX is simpler and cheaper ($99/mo vs $300+ for separate tools). Competitors offer deeper features in their specific areas.
                </p>
                <p>
                  <strong>Best for:</strong> Teams wanting simplicity and cost savings. Consider competitors if you need advanced features in one specific area (e.g., deep email verification).
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-border/50 bg-card/30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-foreground" style={{ fontFamily: 'Orbitron, sans-serif' }}>ScrapeX</span>
          </div>
          <div className="text-sm text-muted-foreground">
            © 2025 ScrapeX. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
