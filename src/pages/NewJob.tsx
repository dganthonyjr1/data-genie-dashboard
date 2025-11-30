import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const formSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL" }),
  scrapeType: z.enum(["emails", "phone_numbers", "text_content", "tables", "custom_ai_extraction"]),
  aiInstructions: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const NewJob = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      scrapeType: "emails",
      aiInstructions: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to create a job",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      const { error } = await supabase.from("scraping_jobs").insert({
        url: data.url,
        scrape_type: data.scrapeType,
        ai_instructions: data.aiInstructions || null,
        user_id: user.id,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Job created successfully",
        description: "Your scraping job has been queued",
      });

      navigate("/jobs");
    } catch (error) {
      console.error("Error creating job:", error);
      toast({
        title: "Error creating job",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
              Add New Scraping Job
            </CardTitle>
            <CardDescription>
              Enter the URL and configure your scraping preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com"
                          {...field}
                          className="bg-background/50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scrapeType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scrape Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background/50">
                            <SelectValue placeholder="Select scrape type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover z-50">
                          <SelectItem value="emails">Email Addresses</SelectItem>
                          <SelectItem value="phone_numbers">Phone Numbers</SelectItem>
                          <SelectItem value="text_content">Text Content</SelectItem>
                          <SelectItem value="tables">Tables</SelectItem>
                          <SelectItem value="custom_ai_extraction">Custom AI Extraction</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("scrapeType") === "custom_ai_extraction" && (
                  <FormField
                    control={form.control}
                    name="aiInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>AI Instructions</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe what you want to extract..."
                            className="bg-background/50 min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 hover:opacity-90 transition-opacity"
                >
                  {isSubmitting ? "Creating..." : "Start Scrape"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default NewJob;
