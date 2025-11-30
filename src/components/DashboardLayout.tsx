import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Database, FileText, Settings, LogOut, Sparkles, CalendarClock, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { NotificationBell } from "./NotificationBell";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  
  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Jobs", href: "/jobs", icon: Database },
    { name: "Bulk Scrape", href: "/bulk-scrape", icon: Layers },
    { name: "Scheduled Jobs", href: "/scheduled-jobs", icon: CalendarClock },
    { name: "Results", href: "/results", icon: FileText },
    { name: "Settings", href: "/settings", icon: Settings },
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
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-cyan-500 rounded-xl rotate-6 opacity-80"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500 to-pink-500 rounded-xl -rotate-6 opacity-60"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white drop-shadow-lg" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/>
                  <line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </div>
            </div>
            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent drop-shadow-sm">
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

          {/* Credits Badge */}
          <div className="border-t border-sidebar-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-sidebar-foreground">Credits</span>
              <Badge className="bg-gradient-primary text-white">
                <Sparkles className="mr-1 h-3 w-3" />
                1,250
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
      <main className="pl-64">
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
