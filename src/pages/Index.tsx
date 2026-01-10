import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  BarChart3
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
    { value: "10M+", label: "Businesses Indexed" },
    { value: "99.7%", label: "Data Accuracy" },
    { value: "<3s", label: "Average Scrape Time" },
    { value: "24/7", label: "Automated Outreach" },
  ];

  const features = [
    {
      icon: Target,
      title: "Intelligent Scraping",
      description: "Extract verified business data from any source—Google Maps, websites, directories—with AI-powered accuracy.",
    },
    {
      icon: Sparkles,
      title: "Revenue Leak Analysis",
      description: "AI identifies missed revenue opportunities, poor online presence, and competitive gaps for each lead.",
    },
    {
      icon: Phone,
      title: "Autonomous Sales Calls",
      description: "Instantly trigger AI-powered sales calls with personalized scripts based on scraped intelligence.",
    },
    {
      icon: TrendingUp,
      title: "Lead Scoring & Prioritization",
      description: "Smart algorithms rank leads by conversion potential so your team focuses on high-value prospects.",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-grade encryption, row-level security, and SOC 2-ready infrastructure protect your data.",
    },
    {
      icon: Globe,
      title: "API-First Architecture",
      description: "RESTful API with webhooks enables seamless integration with your existing tech stack.",
    },
  ];

  const pipelineSteps = [
    { step: "1", title: "Scrape", description: "Enter a query or URL to extract business data" },
    { step: "2", title: "Analyze", description: "AI identifies pain points & revenue opportunities" },
    { step: "3", title: "Score", description: "Leads ranked by conversion potential" },
    { step: "4", title: "Call", description: "Autonomous AI calls with personalized pitch" },
  ];

  const testimonials = [
    {
      quote: "ScrapeX transformed our lead gen. We went from 50 cold calls a day to 200 qualified conversations.",
      author: "Sarah Chen",
      role: "VP Sales, TechFlow Solutions",
      avatar: "SC",
    },
    {
      quote: "The revenue leak analysis alone paid for a year of subscription in the first month.",
      author: "Marcus Johnson",
      role: "Founder, Growth Partners Agency",
      avatar: "MJ",
    },
    {
      quote: "Finally, a scraper that actually understands B2B sales. The AI calling feature is game-changing.",
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
            The Future of B2B Lead Generation
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-tight" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            <span className="text-foreground">Scrape. Analyze.</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Close Deals Automatically.
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            ScrapeX is the world's first AI-powered sales intelligence platform that extracts business data, 
            identifies revenue opportunities, and initiates personalized sales calls—all autonomously.
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
              Our end-to-end pipeline transforms raw business data into closed deals with zero manual intervention.
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
              Enterprise-Grade <span className="text-secondary">Intelligence</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for scale, designed for results. Every feature optimized for B2B sales excellence.
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
            Ready to <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Automate</span> Your Sales Pipeline?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join hundreds of sales teams who've transformed their lead generation with ScrapeX. 
            Start your free trial today—no credit card required.
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
