import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Database, Download, CreditCard } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const stats = [
    { label: "Total Jobs", value: "24", icon: Database },
    { label: "Active Jobs", value: "3", icon: Database },
    { label: "Credits Left", value: "1,250", icon: CreditCard },
    { label: "Downloads", value: "18", icon: Download },
  ];

  const recentJobs = [
    { id: 1, url: "example.com/products", status: "completed", records: 1250, date: "2 hours ago" },
    { id: 2, url: "sample.io/listings", status: "running", records: 450, date: "5 hours ago" },
    { id: 3, url: "demo.com/items", status: "completed", records: 890, date: "1 day ago" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">Welcome back! Here's your scraping overview</p>
          </div>
          <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
            <Plus className="mr-2 h-4 w-4" />
            New Scraping Job
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="border-border/50 bg-card/50 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold bg-gradient-secondary bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Jobs */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">Recent Jobs</CardTitle>
            <CardDescription>Your latest scraping activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{job.url}</p>
                    <p className="text-sm text-muted-foreground">{job.records} records • {job.date}</p>
                  </div>
                  <Badge
                    variant={job.status === "completed" ? "default" : "secondary"}
                    className={
                      job.status === "completed"
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }
                  >
                    {job.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
