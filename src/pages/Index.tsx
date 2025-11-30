import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Database, Zap, TrendingUp } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary shadow-glow" />
          
          <h1 className="text-6xl md:text-7xl font-bold leading-tight">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Web Scraping
            </span>
            <br />
            <span className="text-foreground">Made Simple</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl">
            Extract data from any website with DataGeniePro. Powerful scraping tools, 
            automated workflows, and seamless data management in one platform.
          </p>
          
          <div className="flex gap-4 pt-4">
            <Button asChild size="lg" className="bg-gradient-primary hover:opacity-90 transition-opacity">
              <Link to="/signup">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-32 max-w-5xl mx-auto">
          {[
            {
              icon: Database,
              title: "Smart Extraction",
              description: "Intelligent data extraction with customizable selectors and rules",
            },
            {
              icon: Zap,
              title: "Lightning Fast",
              description: "High-performance scraping engine that processes thousands of pages",
            },
            {
              icon: TrendingUp,
              title: "Real-time Tracking",
              description: "Monitor job progress and view results as they're collected",
            },
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur hover:border-primary/50 transition-colors"
              >
                <Icon className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Index;
