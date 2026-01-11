import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Webhook, Plus, Trash2, Edit, Copy, TestTube } from "lucide-react";
import { format } from "date-fns";

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  is_active: boolean;
  created_at: string;
  last_triggered_at: string | null;
}

const AVAILABLE_EVENTS = [
  { id: 'job.completed', label: 'Job Completed', description: 'When a scraping job finishes successfully' },
  { id: 'job.failed', label: 'Job Failed', description: 'When a scraping job fails' },
  { id: 'job.started', label: 'Job Started', description: 'When a scraping job begins processing' },
];

const WebhooksSettings = () => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    secret: "",
    events: ["job.completed"] as string[],
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }
    fetchWebhooks();
  };

  const fetchWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks((data as WebhookConfig[]) || []);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = 'whsec_';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  const saveWebhook = async () => {
    if (!formData.name.trim() || !formData.url.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.events.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one event",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (editingWebhook) {
        const { error } = await supabase
          .from('webhooks')
          .update({
            name: formData.name,
            url: formData.url,
            secret: formData.secret || null,
            events: formData.events,
          })
          .eq('id', editingWebhook.id);

        if (error) throw error;
        toast({ title: "Webhook updated" });
      } else {
        const { error } = await supabase
          .from('webhooks')
          .insert({
            user_id: user.id,
            name: formData.name,
            url: formData.url,
            secret: formData.secret || null,
            events: formData.events,
          });

        if (error) throw error;
        toast({ title: "Webhook created" });
      }

      closeDialog();
      fetchWebhooks();
    } catch (error) {
      console.error('Error saving webhook:', error);
      toast({
        title: "Error",
        description: "Failed to save webhook",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleWebhook = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('webhooks')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      setWebhooks(prev => prev.map(w => w.id === id ? { ...w, is_active: isActive } : w));
    } catch (error) {
      console.error('Error toggling webhook:', error);
    }
  };

  const deleteWebhook = async (id: string) => {
    try {
      const { error } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setWebhooks(prev => prev.filter(w => w.id !== id));
      toast({ title: "Webhook deleted" });
    } catch (error) {
      console.error('Error deleting webhook:', error);
    }
  };

  const testWebhook = async (webhook: WebhookConfig) => {
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhook.secret && { 'X-Webhook-Secret': webhook.secret }),
        },
        body: JSON.stringify({
          event: 'test',
          data: {
            message: 'This is a test webhook from ScrapeX',
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (response.ok) {
        toast({ title: "Test successful", description: "Webhook endpoint responded successfully" });
      } else {
        toast({ 
          title: "Test failed", 
          description: `Endpoint returned status ${response.status}`,
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ 
        title: "Test failed", 
        description: "Could not reach the webhook endpoint",
        variant: "destructive" 
      });
    }
  };

  const openEditDialog = (webhook: WebhookConfig) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      secret: webhook.secret || "",
      events: webhook.events,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingWebhook(null);
    setFormData({ name: "", url: "", secret: "", events: ["job.completed"] });
  };

  const toggleEvent = (eventId: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId],
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold font-orbitron bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
            Webhooks
          </h1>
          <p className="text-muted-foreground mt-1">
            Send scraping results to your applications automatically
          </p>
        </div>

        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook Endpoints
              </CardTitle>
              <CardDescription>
                Configure endpoints to receive real-time notifications
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => closeDialog()}>
                  <Plus className="h-4 w-4" />
                  Add Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingWebhook ? "Edit Webhook" : "Add Webhook"}</DialogTitle>
                  <DialogDescription>
                    Configure where to send scraping notifications
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="My Webhook"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="url">Endpoint URL</Label>
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://your-app.com/webhook"
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="secret">Secret (optional)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secret"
                        placeholder="Signing secret for verification"
                        value={formData.secret}
                        onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, secret: generateSecret() }))}
                      >
                        Generate
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Used to verify webhook authenticity
                    </p>
                  </div>
                  
                  <div>
                    <Label>Events</Label>
                    <div className="space-y-2 mt-2">
                      {AVAILABLE_EVENTS.map(event => (
                        <div key={event.id} className="flex items-start gap-2">
                          <Checkbox
                            id={event.id}
                            checked={formData.events.includes(event.id)}
                            onCheckedChange={() => toggleEvent(event.id)}
                          />
                          <div>
                            <label htmlFor={event.id} className="text-sm font-medium cursor-pointer">
                              {event.label}
                            </label>
                            <p className="text-xs text-muted-foreground">{event.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                  <Button onClick={saveWebhook} disabled={saving}>
                    {saving ? "Saving..." : editingWebhook ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : webhooks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Webhook className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No webhooks configured</p>
                <p className="text-sm">Add a webhook to receive notifications</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Last Triggered</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-[120px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((webhook) => (
                    <TableRow key={webhook.id}>
                      <TableCell className="font-medium">{webhook.name}</TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground truncate max-w-[200px] block">
                          {webhook.url}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {webhook.events.map(e => (
                            <Badge key={e} variant="secondary" className="text-xs">
                              {e.replace('job.', '')}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {webhook.last_triggered_at 
                          ? format(new Date(webhook.last_triggered_at), 'MMM d, HH:mm')
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={webhook.is_active}
                          onCheckedChange={(checked) => toggleWebhook(webhook.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => testWebhook(webhook)}
                            title="Test webhook"
                          >
                            <TestTube className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openEditDialog(webhook)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Webhook?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove this webhook endpoint.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteWebhook(webhook.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Webhook Payload Format</CardTitle>
            <CardDescription>
              Example payload sent to your webhook endpoint
            </CardDescription>
          </CardHeader>
          <CardContent>
            <code className="block p-4 bg-muted rounded-lg text-sm whitespace-pre overflow-x-auto">
{`{
  "event": "job.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "job": {
    "id": "uuid",
    "url": "https://example.com",
    "scrape_type": "complete_business_data",
    "status": "completed",
    "results_count": 25
  },
  "results": [
    {
      "business_name": "Example Corp",
      "email": "contact@example.com",
      "phone": "+1 555-0123"
    }
  ]
}`}
            </code>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default WebhooksSettings;
