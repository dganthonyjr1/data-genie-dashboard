import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Phone, Globe, User, Building2, ExternalLink, Copy, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataDisclaimer } from "@/components/DataDisclaimer";

interface Job {
  id: string;
  url: string;
  scrape_type: string;
  results: any[];
  status: string;
}

export default function SimpleResultsViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobResults();
  }, [id]);

  const fetchJobResults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to view results",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("scraping_jobs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        toast({
          title: "Error loading results",
          description: error.message,
          variant: "destructive",
        });
        navigate("/results");
        return;
      }

      setJob({
        ...data,
        results: Array.isArray(data.results) ? data.results : []
      });
    } catch (error) {
      console.error("Error fetching job results:", error);
      toast({
        title: "Error",
        description: "Failed to load job results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const exportToCSV = () => {
    if (!job || job.results.length === 0) return;

    const result = job.results[0];
    const headers = ['Field', 'Value'];
    const rows: string[][] = [];

    // Business Info
    if (result.business_name) rows.push(['Business Name', result.business_name]);
    if (result.url) rows.push(['Website', result.url]);
    if (result.address) rows.push(['Address', result.address]);
    
    // Contact Info
    if (result.phone && result.phone.length > 0) {
      result.phone.forEach((p: string, i: number) => {
        rows.push([`Phone ${i + 1}`, p]);
      });
    }
    if (result.email && result.email.length > 0) {
      result.email.forEach((e: string, i: number) => {
        rows.push([`Email ${i + 1}`, e]);
      });
    }

    // People
    if (result.business_owner_name) rows.push(['Owner/Manager', result.business_owner_name]);
    if (result.key_decision_makers && result.key_decision_makers.length > 0) {
      result.key_decision_makers.forEach((person: any, i: number) => {
        rows.push([`Decision Maker ${i + 1}`, `${person.name} - ${person.title}`]);
      });
    }

    // Social Media
    if (result.social_media) {
      Object.entries(result.social_media).forEach(([platform, url]) => {
        if (url) rows.push([platform.charAt(0).toUpperCase() + platform.slice(1), url as string]);
      });
    }

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.business_name || 'business'}_data.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: "Data exported to CSV",
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!job || job.results.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Button variant="ghost" onClick={() => navigate("/results")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Results
          </Button>
          <p className="text-muted-foreground">No results available for this job.</p>
        </div>
      </DashboardLayout>
    );
  }

  const result = job.results[0];

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/results")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Results
          </Button>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <DataDisclaimer variant="compact" />

        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {result.business_name || "Business Information"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.url && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {result.url}
                  </a>
                  <ExternalLink className="h-3 w-3" />
                </div>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(result.url, "Website")}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
            {result.description && (
              <p className="text-sm text-muted-foreground">{result.description}</p>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Phone Numbers */}
            {result.phone && result.phone.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Numbers
                </h3>
                <div className="space-y-2">
                  {result.phone.map((phone: string, index: number) => (
                    <div key={index} className="flex items-center justify-between bg-muted/30 p-2 rounded">
                      <span className="font-mono">{phone}</span>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(phone, "Phone number")}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Email Addresses */}
            {result.email && result.email.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Addresses
                </h3>
                <div className="space-y-2">
                  {result.email.map((email: string, index: number) => (
                    <div key={index} className="flex items-center justify-between bg-muted/30 p-2 rounded">
                      <span className="font-mono">{email}</span>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(email, "Email")}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!result.phone || result.phone.length === 0) && (!result.email || result.email.length === 0) && (
              <p className="text-sm text-muted-foreground">No contact information found on public website.</p>
            )}
          </CardContent>
        </Card>

        {/* Key People */}
        {(result.business_owner_name || (result.key_decision_makers && result.key_decision_makers.length > 0)) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Key People
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.business_owner_name && (
                <div className="flex items-center justify-between bg-muted/30 p-3 rounded">
                  <div>
                    <p className="font-semibold">{result.business_owner_name}</p>
                    <p className="text-sm text-muted-foreground">{result.business_owner_title || "Owner/Manager"}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(result.business_owner_name, "Name")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {result.key_decision_makers && result.key_decision_makers.map((person: any, index: number) => (
                <div key={index} className="flex items-center justify-between bg-muted/30 p-3 rounded">
                  <div>
                    <p className="font-semibold">{person.name}</p>
                    <p className="text-sm text-muted-foreground">{person.title}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`${person.name} - ${person.title}`, "Name")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Social Media */}
        {result.social_media && Object.keys(result.social_media).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Social Media</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(result.social_media).map(([platform, url]) => {
                  if (!url) return null;
                  return (
                    <div key={platform} className="flex items-center justify-between bg-muted/30 p-3 rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{platform}</Badge>
                        <a href={url as string} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate max-w-[200px]">
                          {url as string}
                        </a>
                        <ExternalLink className="h-3 w-3" />
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(url as string, platform)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Completeness */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Data Completeness</p>
                <p className="text-xs text-muted-foreground">Based on publicly available information</p>
              </div>
              <Badge variant={result.data_completeness_score >= 70 ? "default" : "secondary"}>
                {result.data_completeness_score || 0}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
