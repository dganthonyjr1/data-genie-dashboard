import { useEffect, useState } from "react";
import { Bell, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface UserPreferences {
  email_on_job_complete: boolean;
  email_on_job_failure: boolean;
  email_on_scheduled_job_complete: boolean;
  email_on_scheduled_job_failure: boolean;
}

const Settings = () => {
  const [preferences, setPreferences] = useState<UserPreferences>({
    email_on_job_complete: true,
    email_on_job_failure: true,
    email_on_scheduled_job_complete: true,
    email_on_scheduled_job_failure: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          email_on_job_complete: data.email_on_job_complete,
          email_on_job_failure: data.email_on_job_failure,
          email_on_scheduled_job_complete: data.email_on_scheduled_job_complete,
          email_on_scheduled_job_failure: data.email_on_scheduled_job_failure,
        });
      } else {
        // Create default preferences if they don't exist
        const { error: insertError } = await supabase
          .from("user_preferences")
          .insert({
            user_id: user.id,
            email_on_job_complete: true,
            email_on_job_failure: true,
            email_on_scheduled_job_complete: true,
            email_on_scheduled_job_failure: true,
          });

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
      toast({
        title: "Error loading preferences",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      const { error } = await supabase
        .from("user_preferences")
        .update(preferences)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Preferences saved",
        description: "Your notification settings have been updated",
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Failed to save preferences",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (key: keyof UserPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your account preferences and notifications
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription className="mt-1">
                  Choose when you want to receive email notifications
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-4">Manual Jobs</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email_on_job_complete" className="text-base">
                      Job Completion
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive emails when manually triggered jobs complete successfully
                    </p>
                  </div>
                  <Switch
                    id="email_on_job_complete"
                    checked={preferences.email_on_job_complete}
                    onCheckedChange={() => togglePreference('email_on_job_complete')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email_on_job_failure" className="text-base">
                      Job Failure
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive emails when manually triggered jobs fail
                    </p>
                  </div>
                  <Switch
                    id="email_on_job_failure"
                    checked={preferences.email_on_job_failure}
                    onCheckedChange={() => togglePreference('email_on_job_failure')}
                  />
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div>
              <h3 className="text-sm font-semibold mb-4">Scheduled Jobs</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email_on_scheduled_job_complete" className="text-base">
                      Scheduled Job Completion
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive emails when scheduled jobs complete successfully
                    </p>
                  </div>
                  <Switch
                    id="email_on_scheduled_job_complete"
                    checked={preferences.email_on_scheduled_job_complete}
                    onCheckedChange={() => togglePreference('email_on_scheduled_job_complete')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email_on_scheduled_job_failure" className="text-base">
                      Scheduled Job Failure
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive emails when scheduled jobs fail
                    </p>
                  </div>
                  <Switch
                    id="email_on_scheduled_job_failure"
                    checked={preferences.email_on_scheduled_job_failure}
                    onCheckedChange={() => togglePreference('email_on_scheduled_job_failure')}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
