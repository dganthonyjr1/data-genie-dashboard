import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Key, Webhook, Zap } from "lucide-react";
import { Link } from "react-router";

const ApiDocs = () => {
  const baseUrl = "https://xqxggeceacpkpgvbsspw.supabase.co/functions/v1/api";

  const endpoints = [
    {
      method: "GET",
      path: "/jobs",
      description: "List all your scraping jobs",
      response: `{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "url": "https://example.com",
      "scrape_type": "complete_business_data",
      "status": "completed",
      "created_at": "2025-12-06T00:00:00Z",
      "results_count": 15
    }
  ]
}`,
    },
    {
      method: "GET",
      path: "/jobs/:id",
      description: "Get a specific job with its results",
      response: `{
  "success": true,
  "data": {
    "id": "uuid",
    "url": "https://example.com",
    "status": "completed",
    "results": [...]
  }
}`,
    },
    {
      method: "POST",
      path: "/jobs",
      description: "Create a new scraping job",
      body: `{
  "url": "https://example.com",
  "scrape_type": "complete_business_data",
  "ai_instructions": "Extract business name and phone",
  "target_country": "US",
  "target_state": "CA"
}`,
      response: `{
  "success": true,
  "data": {
    "id": "new-job-uuid",
    "status": "pending"
  }
}`,
    },
  ];

  const codeExamples = {
    javascript: `const API_KEY = 'your_api_key';
const BASE_URL = '${baseUrl}';

// List all jobs
async function listJobs() {
  const response = await fetch(\`\${BASE_URL}/jobs\`, {
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
}

// Create a new job
async function createJob(url, scrapeType) {
  const response = await fetch(\`\${BASE_URL}/jobs\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url,
      scrape_type: scrapeType,
      ai_instructions: 'Extract all business data'
    })
  });
  return response.json();
}

// Get job results
async function getJob(jobId) {
  const response = await fetch(\`\${BASE_URL}/jobs/\${jobId}\`, {
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`
    }
  });
  return response.json();
}`,
    python: `import requests

API_KEY = 'your_api_key'
BASE_URL = '${baseUrl}'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
}

# List all jobs
def list_jobs():
    response = requests.get(f'{BASE_URL}/jobs', headers=headers)
    return response.json()

# Create a new job
def create_job(url, scrape_type):
    data = {
        'url': url,
        'scrape_type': scrape_type,
        'ai_instructions': 'Extract all business data'
    }
    response = requests.post(f'{BASE_URL}/jobs', headers=headers, json=data)
    return response.json()

# Get job results
def get_job(job_id):
    response = requests.get(f'{BASE_URL}/jobs/{job_id}', headers=headers)
    return response.json()`,
    curl: `# List all jobs
curl -X GET '${baseUrl}/jobs' \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json'

# Create a new job
curl -X POST '${baseUrl}/jobs' \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "url": "https://example.com",
    "scrape_type": "complete_business_data",
    "ai_instructions": "Extract business data"
  }'

# Get job results
curl -X GET '${baseUrl}/jobs/JOB_ID' \\
  -H 'Authorization: Bearer YOUR_API_KEY'`,
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-5xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-orbitron bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
            API Documentation
          </h1>
          <p className="text-muted-foreground mt-2">
            Integrate ScrapeX into your applications with our REST API
          </p>
        </div>

        {/* Authentication */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Authentication
            </CardTitle>
            <CardDescription>
              All API requests require authentication using an API key
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Include your API key in the <code className="bg-muted px-1.5 py-0.5 rounded">Authorization</code> header:
            </p>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
              <code>Authorization: Bearer YOUR_API_KEY</code>
            </pre>
            <p className="text-sm text-muted-foreground">
              Create and manage your API keys in{" "}
              <Link to="/settings/api" className="text-primary hover:underline">
                Settings → API Keys
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Base URL */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Base URL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
              <code>{baseUrl}</code>
            </pre>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              Endpoints
            </CardTitle>
            <CardDescription>
              Available API endpoints for managing scraping jobs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {endpoints.map((endpoint, index) => (
              <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Badge
                    className={
                      endpoint.method === "GET"
                        ? "bg-green-500/20 text-green-400 border-green-500/50"
                        : "bg-blue-500/20 text-blue-400 border-blue-500/50"
                    }
                  >
                    {endpoint.method}
                  </Badge>
                  <code className="text-sm font-mono">{endpoint.path}</code>
                </div>
                <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                
                {endpoint.body && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Request Body:</p>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      <code>{endpoint.body}</code>
                    </pre>
                  </div>
                )}
                
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Response:</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                    <code>{endpoint.response}</code>
                  </pre>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Code Examples */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Code Examples</CardTitle>
            <CardDescription>
              Quick start examples in popular programming languages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="javascript" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
                <TabsTrigger value="curl">cURL</TabsTrigger>
              </TabsList>
              <TabsContent value="javascript" className="mt-4">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-96">
                  <code>{codeExamples.javascript}</code>
                </pre>
              </TabsContent>
              <TabsContent value="python" className="mt-4">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-96">
                  <code>{codeExamples.python}</code>
                </pre>
              </TabsContent>
              <TabsContent value="curl" className="mt-4">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-96">
                  <code>{codeExamples.curl}</code>
                </pre>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Webhooks */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-primary" />
              Webhooks
            </CardTitle>
            <CardDescription>
              Receive real-time notifications when jobs complete
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure webhooks to receive POST requests when job events occur.
              Set up webhooks in{" "}
              <Link to="/settings/webhooks" className="text-primary hover:underline">
                Settings → Webhooks
              </Link>
            </p>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Webhook Payload:</p>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                <code>{`{
  "event": "job.completed",
  "job_id": "uuid",
  "status": "completed",
  "results_count": 15,
  "timestamp": "2025-12-06T00:00:00Z"
}`}</code>
              </pre>
            </div>
            <p className="text-sm text-muted-foreground">
              Events: <code className="bg-muted px-1.5 py-0.5 rounded">job.completed</code>,{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded">job.failed</code>,{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded">scheduled_job.completed</code>,{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded">scheduled_job.failed</code>
            </p>
          </CardContent>
        </Card>

        {/* Rate Limits */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Rate Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-primary">100</p>
                <p className="text-sm text-muted-foreground">Requests/minute</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-primary">1,000</p>
                <p className="text-sm text-muted-foreground">Jobs/day</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-primary">50</p>
                <p className="text-sm text-muted-foreground">Concurrent jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ApiDocs;