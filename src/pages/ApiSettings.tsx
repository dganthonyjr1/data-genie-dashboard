import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Key, Plus, Copy, Trash2, Eye, EyeOff, Code, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

const ApiSettings = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
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
    fetchApiKeys();
  };

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys((data as ApiKey[]) || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'sx_';
    for (let i = 0; i < 40; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const hashKey = async (key: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your API key",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const key = generateApiKey();
      const keyHash = await hashKey(key);
      const keyPrefix = key.substring(0, 7) + '...';

      const { error } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          name: newKeyName,
          key_hash: keyHash,
          key_prefix: keyPrefix,
        });

      if (error) throw error;

      setNewKeyValue(key);
      setShowNewKey(true);
      fetchApiKeys();
      
      toast({
        title: "API key created",
        description: "Make sure to copy your key now. You won't be able to see it again!",
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setApiKeys(prev => prev.filter(k => k.id !== id));
      toast({
        title: "API key deleted",
        description: "The API key has been revoked",
      });
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setNewKeyName("");
    setNewKeyValue(null);
    setShowNewKey(false);
  };

  const projectUrl = import.meta.env.VITE_SUPABASE_URL;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold font-orbitron bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
            API Access
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage API keys for programmatic access to the scraping API
          </p>
        </div>

        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Create and manage API keys for external integrations
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                  <DialogDescription>
                    {newKeyValue 
                      ? "Your API key has been created. Copy it now - you won't see it again!"
                      : "Give your API key a name to help identify it later."}
                  </DialogDescription>
                </DialogHeader>
                
                {newKeyValue ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <Label className="text-xs text-muted-foreground">Your API Key</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 text-sm font-mono break-all">
                          {showNewKey ? newKeyValue : '•'.repeat(40)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowNewKey(!showNewKey)}
                        >
                          {showNewKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(newKeyValue)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-yellow-500">
                      ⚠️ This is the only time you'll see this key. Store it securely!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="keyName">Key Name</Label>
                      <Input
                        id="keyName"
                        placeholder="e.g., Production API, My App"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                
                <DialogFooter>
                  {newKeyValue ? (
                    <Button onClick={closeDialog}>Done</Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                      <Button onClick={createApiKey} disabled={creating}>
                        {creating ? "Creating..." : "Create Key"}
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No API keys yet</p>
                <p className="text-sm">Create your first API key to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <code className="text-sm text-muted-foreground">{key.key_prefix}</code>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(key.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {key.last_used_at 
                          ? format(new Date(key.last_used_at), 'MMM d, yyyy')
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={key.is_active ? "default" : "secondary"}>
                          {key.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently revoke this API key. Any applications using it will lose access.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteApiKey(key.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              API Documentation
            </CardTitle>
            <CardDescription>
              Quick reference for using the ScrapeX API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Base URL</h3>
              <code className="block p-3 bg-muted rounded-lg text-sm">
                {projectUrl}/functions/v1/api
              </code>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Authentication</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Include your API key in the Authorization header:
              </p>
              <code className="block p-3 bg-muted rounded-lg text-sm whitespace-pre">
{`Authorization: Bearer sx_your_api_key_here`}
              </code>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Create a Scraping Job</h3>
              <code className="block p-3 bg-muted rounded-lg text-sm whitespace-pre overflow-x-auto">
{`POST /functions/v1/api/jobs
Content-Type: application/json
Authorization: Bearer sx_your_api_key

{
  "url": "https://example.com",
  "scrape_type": "complete_business_data",
  "auto_paginate": true,
  "max_pages": 5
}`}
              </code>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Get Job Results</h3>
              <code className="block p-3 bg-muted rounded-lg text-sm whitespace-pre overflow-x-auto">
{`GET /functions/v1/api/jobs/{job_id}
Authorization: Bearer sx_your_api_key`}
              </code>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Available Scrape Types</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li><code>complete_business_data</code> - Extract full business information</li>
                <li><code>bulk_business_search</code> - Search for multiple businesses</li>
                <li><code>google_business_profiles</code> - Get Google Business listings</li>
                <li><code>emails</code> - Extract email addresses</li>
                <li><code>phone_numbers</code> - Extract phone numbers</li>
                <li><code>custom_ai_extraction</code> - Custom AI-powered extraction</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ApiSettings;
