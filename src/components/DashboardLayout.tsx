import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { LayoutDashboard, Database, FileText, Settings, LogOut, Sparkles, CalendarClock, Layers, BookOpen, Users, PhoneCall, Play, Square, CreditCard, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { NotificationBell } from "./NotificationBell";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { Switch } from "./ui/switch";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDemoMode, toggleDemoMode } = useDemoMode();
  const [isLoading, setIsLoading] = useState(true);
  
  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Leads", href: "/leads", icon: Users },
    { name: "Call Attempts", href: "/call-attempts", icon: PhoneCall },
    { name: "Jobs", href: "/jobs", icon: Database },
    { name: "Bulk Scrape", href: "/bulk-scrape", icon: Layers },
    { name: "Scheduled Jobs", href: "/scheduled-jobs", icon: CalendarClock },
    { name: "Results", href: "/results", icon: FileText },
    { name: "Billing", href: "/billing", icon: CreditCard },
    { name: "Payment Settings", href: "/settings/payments", icon: CreditCard },
    { name: "API Docs", href: "/api-docs", icon: BookOpen },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Diagnostics", href: "/diagnostics", icon: Activity },
  ];

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      }
      setIsLoading(false);
    };
    
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed out successfully",
        description: "See you next time!",
      });
      
      navigate("/login");
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6 group cursor-pointer">
            <div className="relative w-10 h-10 transition-all duration-300 group-hover:scale-110">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-cyan-500 rounded-lg rotate-45 opacity-20 blur-sm group-hover:opacity-40 group-hover:blur-md transition-all duration-300"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 40 40" className="w-10 h-10 transition-all duration-300" fill="none">
                  {/* Outer frame */}
                  <path d="M8 4 L32 4 L36 8 L36 32 L32 36 L8 36 L4 32 L4 8 Z" 
                    stroke="url(#gradient1)" 
                    strokeWidth="2" 
                    fill="none"
                    className="animate-pulse"/>
                  {/* Inner X shape */}
                  <path d="M14 14 L26 26 M26 14 L14 26" 
                    stroke="url(#gradient2)" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    className="group-hover:drop-shadow-[0_0_8px_rgba(236,72,153,0.6)] transition-all duration-300"/>
                  {/* Corner accents */}
                  <circle cx="8" cy="8" r="2" fill="url(#gradient1)" className="group-hover:drop-shadow-[0_0_4px_rgba(6,182,212,0.8)]"/>
                  <circle cx="32" cy="8" r="2" fill="url(#gradient1)" className="group-hover:drop-shadow-[0_0_4px_rgba(6,182,212,0.8)]"/>
                  <circle cx="32" cy="32" r="2" fill="url(#gradient1)" className="group-hover:drop-shadow-[0_0_4px_rgba(6,182,212,0.8)]"/>
                  <circle cx="8" cy="32" r="2" fill="url(#gradient1)" className="group-hover:drop-shadow-[0_0_4px_rgba(6,182,212,0.8)]"/>
                  
                  <defs>
                    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ec4899"/>
                      <stop offset="100%" stopColor="#06b6d4"/>
                    </linearGradient>
                    <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#06b6d4"/>
                      <stop offset="100%" stopColor="#ec4899"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
            <span className="text-2xl font-black tracking-tight font-orbitron bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent drop-shadow-sm group-hover:drop-shadow-[0_0_12px_rgba(236,72,153,0.5)] transition-all duration-300">
              ScrapeX
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Demo Mode Toggle */}
          <div className="border-t border-sidebar-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isDemoMode ? (
                  <Play className="h-4 w-4 text-green-500 fill-green-500" />
                ) : (
                  <Square className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm text-sidebar-foreground">Demo Mode</span>
              </div>
              <Switch
                checked={isDemoMode}
                onCheckedChange={toggleDemoMode}
                className="data-[state=checked]:bg-green-500"
              />
            </div>
            {isDemoMode && (
              <p className="text-xs text-muted-foreground">
                Showing sample data for investor demos
              </p>
            )}
          </div>

          {/* Credits Badge */}
          <div className="border-t border-sidebar-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-sidebar-foreground">Credits</span>
              <Badge className="bg-gradient-primary text-white">
                <Sparkles className="mr-1 h-3 w-3" />
                {isDemoMode ? "∞" : "1,250"}
              </Badge>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-sidebar-foreground hover:text-sidebar-accent-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-64 h-screen overflow-y-auto">
        <div className="container mx-auto p-8">
          <div className="flex justify-end mb-4">
            <NotificationBell />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
