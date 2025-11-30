import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Database, FileText, Settings, LogOut, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation();
  
  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Jobs", href: "/jobs", icon: Database },
    { name: "Results", href: "/results", icon: FileText },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary" />
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              DataGeniePro
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
            <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:text-sidebar-accent-foreground">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-64">
        <div className="container mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
