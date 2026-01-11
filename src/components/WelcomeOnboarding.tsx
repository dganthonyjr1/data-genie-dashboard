import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Rocket, 
  Search, 
  Phone, 
  TrendingUp, 
  ArrowRight, 
  Sparkles,
  Target,
  Zap,
  Play,
  CheckCircle2
} from "lucide-react";
import { useDemoMode } from "@/contexts/DemoModeContext";

const WelcomeOnboarding = () => {
  const navigate = useNavigate();
  const { enableDemoMode } = useDemoMode();

  const steps = [
    {
      number: 1,
      title: "Scrape Business Data",
      description: "Enter a location or business type to discover leads with complete contact information",
      icon: Search,
      action: () => navigate("/new-job"),
      buttonText: "Start Scraping",
      color: "from-pink-500 to-pink-600",
    },
    {
      number: 2,
      title: "AI Analyzes Revenue Leaks",
      description: "Our AI identifies businesses losing money and calculates exactly how much",
      icon: TrendingUp,
      action: null,
      buttonText: null,
      color: "from-purple-500 to-purple-600",
    },
    {
      number: 3,
      title: "Trigger Sales Calls",
      description: "AI makes personalized calls to prospects, pitching your solution to their specific problems",
      icon: Phone,
      action: null,
      buttonText: null,
      color: "from-cyan-500 to-cyan-600",
    },
  ];

  const features = [
    { icon: Target, text: "Find businesses losing $10K+/month" },
    { icon: Zap, text: "AI-powered lead scoring" },
    { icon: Phone, text: "Autonomous sales calls" },
    { icon: TrendingUp, text: "Revenue leak detection" },
  ];

  const handleWatchDemo = () => {
    enableDemoMode();
  };

  return (
    <div className="space-y-8">
      {/* Welcome Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-muted/20 border border-border/50 p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
            <Sparkles className="h-3 w-3 mr-1" />
            New Account
          </Badge>
        </div>
        
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-3xl font-bold font-orbitron bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent mb-3">
            Welcome to ScrapeX! 🚀
          </h2>
          <p className="text-lg text-muted-foreground mb-6">
            You're 3 steps away from discovering high-value leads and closing deals with AI-powered sales calls.
          </p>
          
          {/* Quick Feature Pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 text-sm"
              >
                <feature.icon className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">{feature.text}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button 
              size="lg"
              onClick={() => navigate("/new-job")}
              className="bg-gradient-to-r from-pink-500 to-cyan-500 hover:opacity-90 transition-opacity"
            >
              <Rocket className="mr-2 h-4 w-4" />
              Create Your First Job
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={handleWatchDemo}
              className="border-muted-foreground/30"
            >
              <Play className="mr-2 h-4 w-4" />
              See Demo Data
            </Button>
          </div>
        </div>
      </div>

      {/* How It Works Steps */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">How ScrapeX Works</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card 
              key={step.number}
              className={`relative overflow-hidden bg-card/50 border-border/50 transition-all duration-300 hover:border-primary/30 hover:shadow-lg ${
                index === 0 ? 'ring-2 ring-primary/30 ring-offset-2 ring-offset-background' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center`}>
                    <step.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">STEP {step.number}</span>
                      {index === 0 && (
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                          Start Here
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-semibold mb-1">{step.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                    {step.action && (
                      <Button 
                        size="sm" 
                        onClick={step.action}
                        className="bg-gradient-to-r from-pink-500 to-cyan-500 hover:opacity-90"
                      >
                        {step.buttonText}
                        <ArrowRight className="ml-2 h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight className="h-5 w-5 text-muted-foreground/30" />
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Stats Preview */}
      <Card className="bg-gradient-to-br from-card to-muted/10 border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium">Account Ready</p>
                <p className="text-sm text-muted-foreground">Your workspace is set up and ready to go</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">0</p>
                <p className="text-xs text-muted-foreground">Jobs Created</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-2xl font-bold text-accent">0</p>
                <p className="text-xs text-muted-foreground">Leads Found</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-2xl font-bold text-green-500">$0</p>
                <p className="text-xs text-muted-foreground">Revenue Leaks</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WelcomeOnboarding;
