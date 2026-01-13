import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  Plus,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  Facebook,
  Linkedin,
  Twitter,
  Instagram,
  Youtube
} from "lucide-react";
import { DataDisclaimer } from "@/components/DataDisclaimer";

interface Job {
  id: string;
  status: string;
  created_at: string;
  results: any[];
  url: string;
}

interface Stats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
}

interface ScrapedBusiness {
  jobId: string;
  businessName: string;
  url: string;
  phone: string[];
  email: string[];
  socialMedia: {
    facebook?: string;
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0,
  });
  const [scrapedBusinesses, setScrapedBusinesses] = useState<ScrapedBusiness[]>([]);

  useEffect(() => {
    fetchJobsAndStats();
  }, []);

  const fetchJobsAndStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("scraping_jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setJobs(data || []);

      // Calculate stats
      const total = data?.length || 0;
      const completed = data?.filter(j => j.status === "completed").length || 0;
      const failed = data?.filter(j => j.status === "failed").length || 0;
      const pending = data?.filter(j => j.status === "pending" || j.status === "processing").length || 0;

      setStats({ total, completed, failed, pending });

      // Extract scraped business data
      const businesses: ScrapedBusiness[] = [];
      data?.forEach(job => {
        if (job.status === "completed" && job.results && job.results.length > 0) {
          const result = job.results[0];
          if (result.social_media && Object.keys(result.social_media).length > 0) {
            businesses.push({
              jobId: job.id,
              businessName: result.business_name || "Unknown Business",
              url: result.url || job.url,
              phone: result.phone || [],
              email: result.email || [],
              socialMedia: result.social_media || {}
            });
          }
        }
      });

      setScrapedBusinesses(businesses);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast({
        title: "Error loading data",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook': return <Facebook className="h-4 w-4" />;
      case 'linkedin': return <Linkedin className="h-4 w-4" />;
      case 'twitter': return <Twitter className="h-4 w-4" />;
      case 'instagram': return <Instagram className="h-4 w-4" />;
      case 'youtube': return <Youtube className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-orbitron bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Overview of your scraping jobs and extracted data
            </p>
          </div>
          <Button onClick={() => navigate("/new-job")} className="gap-2">
            <Plus className="h-4 w-4" />
            New Job
          </Button>
        </div>



        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <Clock className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.failed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Scraped Business Social Media Data */}
        <Card>
          <CardHeader>
            <CardTitle>Scraped Business Social Media</CardTitle>
            <CardDescription>
              Social media links extracted from {scrapedBusinesses.length} businesses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scrapedBusinesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No social media data available yet. Start scraping businesses to see their social profiles here.
              </p>
            ) : (
              <div className="space-y-6">
                {scrapedBusinesses.map((business, index) => (
                  <div key={index} className="border-b border-border pb-4 last:border-0">
                    {/* Business Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{business.businessName}</h3>
                        <a 
                          href={business.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          {business.url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/results/${business.jobId}`)}
                      >
                        View Full Details
                      </Button>
                    </div>

                    {/* Contact Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                      {business.phone.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{business.phone[0]}</span>
                          {business.phone.length > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              +{business.phone.length - 1} more
                            </Badge>
                          )}
                        </div>
                      )}
                      {business.email.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{business.email[0]}</span>
                          {business.email.length > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              +{business.email.length - 1} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Social Media Links */}
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(business.socialMedia).map(([platform, url]) => {
                        if (!url) return null;
                        return (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-md transition-colors"
                          >
                            {getSocialIcon(platform)}
                            <span className="text-sm capitalize">{platform}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/new-job")}>
            <CardHeader>
              <CardTitle className="text-base">Start New Scrape</CardTitle>
              <CardDescription>Scrape a new business website</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/results")}>
            <CardHeader>
              <CardTitle className="text-base">View All Results</CardTitle>
              <CardDescription>Browse all scraped data</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/bulk-scrape")}>
            <CardHeader>
              <CardTitle className="text-base">Bulk Scrape</CardTitle>
              <CardDescription>Process multiple URLs at once</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
