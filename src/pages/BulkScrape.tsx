import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { Download, FileJson, FileSpreadsheet, Loader2, Upload, FileText, X, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UrlPreviewModal } from "@/components/UrlPreviewModal";
import { DataDisclaimer } from "@/components/DataDisclaimer";

const formSchema = z.object({
  urls: z.string().min(1, "Please enter at least one URL"),
  scrapeType: z.enum(["emails", "phone_numbers", "text_content", "tables", "custom_ai_extraction"]),
  aiInstructions: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface JobResult {
  id: string;
  url: string;
  status: string;
  results: any[];
  error?: string;
}

interface ValidationResult {
  valid: string[];
  invalid: Array<{ url: string; reason: string }>;
  duplicates: Array<{ url: string; count: number }>;
  totalUrls: number;
}

const BulkScrape = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobResults, setJobResults] = useState<JobResult[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      urls: "",
      scrapeType: "custom_ai_extraction",
      aiInstructions: "",
    },
  });

  const validateUrls = (urlText: string): ValidationResult => {
    const lines = urlText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const urlMap = new Map<string, number>();
    const valid: string[] = [];
    const invalid: Array<{ url: string; reason: string }> = [];

    lines.forEach(line => {
      // Check if empty
      if (!line) return;

      // Check if it's a valid URL
      try {
        const urlObj = new URL(line);
        
        // Check protocol
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          invalid.push({ url: line, reason: 'Invalid protocol (must be http or https)' });
          return;
        }

        // Check if domain exists
        if (!urlObj.hostname || urlObj.hostname.length === 0) {
          invalid.push({ url: line, reason: 'Missing domain' });
          return;
        }

        // Track for duplicates
        const normalizedUrl = line.toLowerCase();
        urlMap.set(normalizedUrl, (urlMap.get(normalizedUrl) || 0) + 1);
        
        // Add to valid if first occurrence
        if (urlMap.get(normalizedUrl) === 1) {
          valid.push(line);
        }
      } catch (error) {
        invalid.push({ url: line, reason: 'Invalid URL format' });
      }
    });

    // Find duplicates
    const duplicates: Array<{ url: string; count: number }> = [];
    urlMap.forEach((count, url) => {
      if (count > 1) {
        // Find original case URL
        const originalUrl = valid.find(v => v.toLowerCase() === url) || url;
        duplicates.push({ url: originalUrl, count });
      }
    });

    return {
      valid,
      invalid,
      duplicates,
      totalUrls: lines.length
    };
  };

  const handleValidateUrls = () => {
    const urlText = form.getValues('urls');
    
    if (!urlText.trim()) {
      toast({
        title: "No URLs provided",
        description: "Please enter or upload URLs first",
        variant: "destructive",
      });
      return;
    }

    const result = validateUrls(urlText);
    setValidationResult(result);
    setShowValidation(true);

    if (result.valid.length === 0) {
      toast({
        title: "No valid URLs",
        description: "All URLs are invalid. Please check and try again.",
        variant: "destructive",
      });
    }
  };

  const handleProceedWithValid = () => {
    if (!validationResult) return;

    // Update form with only valid, deduplicated URLs
    form.setValue('urls', validationResult.valid.join('\n'));
    setShowValidation(false);

    toast({
      title: "URLs cleaned",
      description: `Proceeding with ${validationResult.valid.length} valid URL(s)`,
    });
  };

  const processFile = async (file: File) => {
    if (!file) return;

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 20MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const validTypes = ['text/plain', 'text/csv', 'application/csv'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    
    if (!validTypes.includes(file.type) && !['csv', 'txt'].includes(fileExtension || '')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV or TXT file",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);

    try {
      const text = await file.text();
      let urls: string[] = [];

      if (file.name.endsWith('.csv')) {
        // Parse CSV - assume URLs are in the first column or look for a URL column
        const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
        
        // Check if first line is a header
        const firstLine = lines[0].toLowerCase();
        const hasHeader = firstLine.includes('url') || firstLine.includes('link') || firstLine.includes('website');
        const startIndex = hasHeader ? 1 : 0;

        // Try to find URL column index
        let urlColumnIndex = 0;
        if (hasHeader) {
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          const urlHeaderIndex = headers.findIndex(h => 
            h.includes('url') || h.includes('link') || h.includes('website') || h.includes('domain')
          );
          if (urlHeaderIndex !== -1) {
            urlColumnIndex = urlHeaderIndex;
          }
        }

        // Extract URLs from the identified column
        for (let i = startIndex; i < lines.length; i++) {
          const columns = lines[i].split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
          const potentialUrl = columns[urlColumnIndex];
          
          if (potentialUrl) {
            try {
              new URL(potentialUrl);
              urls.push(potentialUrl);
            } catch {
              // Not a valid URL, skip
            }
          }
        }
      } else {
        // Parse TXT - one URL per line
        urls = text.split('\n')
          .map(line => line.trim())
          .filter(line => {
            try {
              new URL(line);
              return true;
            } catch {
              return false;
            }
          });
      }

      if (urls.length === 0) {
        toast({
          title: "No valid URLs found",
          description: "The file doesn't contain any valid URLs",
          variant: "destructive",
        });
        setUploadedFile(null);
        return;
      }

      // Update the form with extracted URLs
      form.setValue('urls', urls.join('\n'));
      
      toast({
        title: "File uploaded successfully",
        description: `Imported ${urls.length} valid URL(s)`,
      });

    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: "Error reading file",
        description: "Could not parse the uploaded file",
        variant: "destructive",
      });
      setUploadedFile(null);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    form.setValue('urls', '');
  };

  const onSubmit = async (data: FormData) => {
    // Validate URLs before processing
    const validation = validateUrls(data.urls);
    
    if (validation.valid.length === 0) {
      setValidationResult(validation);
      setShowValidation(true);
      toast({
        title: "No valid URLs",
        description: "Please fix the invalid URLs before proceeding",
        variant: "destructive",
      });
      return;
    }

    // Show warning if there are issues
    if (validation.invalid.length > 0 || validation.duplicates.length > 0) {
      setValidationResult(validation);
      setShowValidation(true);
      return;
    }

    const urls = validation.valid;
    
    if (urls.length === 0) {
      toast({
        title: "Invalid URLs",
        description: "Please enter at least one valid URL",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setJobResults([]);
    setCompletedCount(0);
    setTotalCount(urls.length);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to create jobs",
          variant: "destructive",
        });
        return;
      }

      // Create all jobs
      const jobPromises = urls.map(url => 
        supabase.from("scraping_jobs").insert({
          url,
          scrape_type: data.scrapeType,
          ai_instructions: data.aiInstructions || null,
          user_id: user.id,
          status: "pending",
        }).select().single()
      );

      const jobCreationResults = await Promise.all(jobPromises);
      const createdJobs = jobCreationResults
        .filter(result => !result.error)
        .map(result => result.data!);

      if (createdJobs.length === 0) {
        throw new Error("Failed to create any jobs");
      }

      toast({
        title: "Jobs created",
        description: `Created ${createdJobs.length} scraping job(s). Processing...`,
      });

      // Process each job and track progress
      const results: JobResult[] = [];
      
      for (let i = 0; i < createdJobs.length; i++) {
        const job = createdJobs[i];
        
        try {
          // Trigger scraping
          const { error: scrapeError } = await supabase.functions.invoke('process-scrape', {
            body: { jobId: job.id }
          });

          if (scrapeError) {
            results.push({
              id: job.id,
              url: job.url,
              status: 'failed',
              results: [],
              error: scrapeError.message
            });
          } else {
            // Poll for completion (simplified - in production, use realtime subscriptions)
            let attempts = 0;
            let jobData = job;
            
            while (attempts < 30 && jobData.status === 'pending' || jobData.status === 'processing') {
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const { data: updatedJob } = await supabase
                .from('scraping_jobs')
                .select('*')
                .eq('id', job.id)
                .single();
              
              if (updatedJob) {
                jobData = updatedJob;
              }
              attempts++;
            }

            results.push({
              id: jobData.id,
              url: jobData.url,
              status: jobData.status,
              results: Array.isArray(jobData.results) ? jobData.results : []
            });
          }
        } catch (error) {
          results.push({
            id: job.id,
            url: job.url,
            status: 'failed',
            results: [],
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        setCompletedCount(i + 1);
        setProgress(((i + 1) / createdJobs.length) * 100);
      }

      setJobResults(results);

      const successCount = results.filter(r => r.status === 'completed').length;
      toast({
        title: "Bulk scraping completed",
        description: `Successfully completed ${successCount} out of ${results.length} job(s)`,
      });

    } catch (error) {
      console.error("Error in bulk scrape:", error);
      toast({
        title: "Error processing jobs",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const exportToCSV = () => {
    if (jobResults.length === 0) return;

    // For business data extraction
    if (form.getValues('scrapeType') === 'custom_ai_extraction') {
      const headers = [
        'URL',
        'Status',
        'Business Name',
        'Full Address',
        'Phone Number',
        'Email',
        'Website',
        'Facebook',
        'Instagram',
        'TikTok',
        'LinkedIn',
        'YouTube',
        'Hours',
        'Google Maps URL',
        'Place ID',
        'Latitude',
        'Longitude',
        'Services/Products',
        'Description'
      ];

      const rows = jobResults.map(job => {
        const result = job.results[0] || {};
        return [
          job.url,
          job.status,
          result.business_name || '',
          result.full_address || '',
          result.phone_number || '',
          result.email_address || '',
          result.website_url || '',
          result.social_links?.facebook || '',
          result.social_links?.instagram || '',
          result.social_links?.tiktok || '',
          result.social_links?.linkedin || '',
          result.social_links?.youtube || '',
          result.hours_of_operation || '',
          result.google_maps_embed_url || '',
          result.google_maps_place_id || '',
          result.coordinates?.latitude || '',
          result.coordinates?.longitude || '',
          result.services_or_products || '',
          result.about_or_description || ''
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      downloadFile(csvContent, `bulk-scrape-${Date.now()}.csv`, 'text/csv');
    } else {
      // Generic CSV for other scrape types
      const headers = ['URL', 'Status', 'Results Count', 'Data'];
      const rows = jobResults.map(job => [
        job.url,
        job.status,
        job.results.length,
        JSON.stringify(job.results)
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      downloadFile(csvContent, `bulk-scrape-${Date.now()}.csv`, 'text/csv');
    }

    toast({
      title: "Exported to CSV",
      description: `Successfully exported ${jobResults.length} result(s)`,
    });
  };

  const exportToJSON = () => {
    if (jobResults.length === 0) return;

    const json = JSON.stringify(jobResults, null, 2);
    downloadFile(json, `bulk-scrape-${Date.now()}.json`, 'application/json');

    toast({
      title: "Exported to JSON",
      description: `Successfully exported ${jobResults.length} result(s)`,
    });
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportValidationReportTXT = () => {
    if (!validationResult) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const lines: string[] = [];
    
    lines.push('URL VALIDATION REPORT');
    lines.push('='.repeat(60));
    lines.push('');
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push('');
    
    lines.push('SUMMARY');
    lines.push('-'.repeat(60));
    lines.push(`Total URLs: ${validationResult.totalUrls}`);
    lines.push(`Valid URLs: ${validationResult.valid.length}`);
    lines.push(`Invalid URLs: ${validationResult.invalid.length}`);
    lines.push(`Duplicate URLs: ${validationResult.duplicates.length}`);
    lines.push('');
    
    if (validationResult.valid.length > 0) {
      lines.push('VALID URLs');
      lines.push('-'.repeat(60));
      validationResult.valid.forEach((url, index) => {
        lines.push(`${index + 1}. ${url}`);
      });
      lines.push('');
    }
    
    if (validationResult.duplicates.length > 0) {
      lines.push('DUPLICATE URLs');
      lines.push('-'.repeat(60));
      validationResult.duplicates.forEach((dup, index) => {
        lines.push(`${index + 1}. ${dup.url} (found ${dup.count} times)`);
      });
      lines.push('');
    }
    
    if (validationResult.invalid.length > 0) {
      lines.push('INVALID URLs');
      lines.push('-'.repeat(60));
      validationResult.invalid.forEach((invalid, index) => {
        lines.push(`${index + 1}. ${invalid.url}`);
        lines.push(`   Reason: ${invalid.reason}`);
        lines.push('');
      });
    }
    
    const content = lines.join('\n');
    downloadFile(content, `url-validation-report-${timestamp}.txt`, 'text/plain');
    
    toast({
      title: "Report exported",
      description: "Validation report saved as TXT file",
    });
  };

  const exportValidationReportCSV = () => {
    if (!validationResult) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rows: string[][] = [];
    
    // Add header
    rows.push(['URL', 'Status', 'Details', 'Category']);
    
    // Add valid URLs
    validationResult.valid.forEach(url => {
      rows.push([url, 'Valid', '', 'Valid']);
    });
    
    // Add duplicates
    validationResult.duplicates.forEach(dup => {
      rows.push([dup.url, 'Duplicate', `Found ${dup.count} times`, 'Duplicate']);
    });
    
    // Add invalid URLs
    validationResult.invalid.forEach(invalid => {
      rows.push([invalid.url, 'Invalid', invalid.reason, 'Invalid']);
    });
    
    const csvContent = rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    downloadFile(csvContent, `url-validation-report-${timestamp}.csv`, 'text/csv');
    
    toast({
      title: "Report exported",
      description: "Validation report saved as CSV file",
    });
  };

  const formatScrapeType = (type: string) => {
    return type.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold font-orbitron bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
              Bulk Scraping
            </h1>
            <p className="text-muted-foreground mt-2">
              Process multiple URLs at once and export results
            </p>
          </div>

          <DataDisclaimer />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Bulk Job Configuration</CardTitle>
                <CardDescription>
                  Enter multiple URLs (one per line) to scrape simultaneously
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-3">
                      <Label>Import URLs</Label>
                      
                      {/* Drag and Drop Zone */}
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-lg transition-all ${
                          isDragging
                            ? 'border-primary bg-primary/5 scale-[1.02]'
                            : 'border-border/50 bg-background/30'
                        } ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
                        onClick={() => !isProcessing && fileInputRef.current?.click()}
                      >
                        <div className="p-8 text-center">
                          <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${
                            isDragging ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                          <p className="text-sm font-medium mb-1">
                            {isDragging ? 'Drop file here' : 'Drag & drop file here'}
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Supported formats: CSV, TXT (max 20MB)
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                            disabled={isProcessing}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Browse Files
                          </Button>
                          <Input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.txt,text/plain,text/csv,application/csv"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </div>
                      </div>

                      {uploadedFile && (
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{uploadedFile.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(uploadedFile.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveFile}
                            disabled={isProcessing}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name="urls"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URLs (one per line)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="https://example.com&#10;https://another-site.com&#10;https://third-site.com&#10;&#10;Or upload a CSV/TXT file above"
                              {...field}
                              className="bg-background/50 min-h-[200px] font-mono text-sm"
                              disabled={isProcessing}
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
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            disabled={isProcessing}
                          >
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
                            <FormLabel>AI Instructions (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Custom instructions for AI extraction..."
                                className="bg-background/50 min-h-[100px]"
                                {...field}
                                disabled={isProcessing}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleValidateUrls}
                        disabled={isProcessing}
                        className="flex-1"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Validate URLs
                      </Button>
                      <Button
                        type="submit"
                        disabled={isProcessing}
                        className="flex-1 bg-gradient-to-r from-pink-500 to-cyan-500 hover:opacity-90 transition-opacity"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing {completedCount}/{totalCount}
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Start Bulk Scrape
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>
                  {showValidation ? 'URL Validation Report' : 'Progress & Results'}
                </CardTitle>
                <CardDescription>
                  {showValidation 
                    ? 'Review URL validation before processing'
                    : 'Monitor scraping progress and export results'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {showValidation && validationResult && (
                  <div className="space-y-4">
                    {/* Export Buttons */}
                    <div className="flex gap-2 pb-4 border-b border-border/50">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportValidationReportTXT}
                        className="flex-1"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Export TXT
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportValidationReportCSV}
                        className="flex-1"
                      >
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Export CSV
                      </Button>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <Card className="p-3 bg-blue-500/10 border-blue-500/20">
                        <div className="text-xs text-muted-foreground">Total</div>
                        <div className="text-2xl font-bold text-blue-400">
                          {validationResult.totalUrls}
                        </div>
                      </Card>
                      <Card className="p-3 bg-green-500/10 border-green-500/20">
                        <div className="text-xs text-muted-foreground">Valid</div>
                        <div className="text-2xl font-bold text-green-400">
                          {validationResult.valid.length}
                        </div>
                      </Card>
                      <Card className="p-3 bg-red-500/10 border-red-500/20">
                        <div className="text-xs text-muted-foreground">Invalid</div>
                        <div className="text-2xl font-bold text-red-400">
                          {validationResult.invalid.length}
                        </div>
                      </Card>
                    </div>

                    {/* Duplicates Warning */}
                    {validationResult.duplicates.length > 0 && (
                      <Card className="p-4 bg-yellow-500/10 border-yellow-500/20">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 shrink-0">
                            {validationResult.duplicates.length}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-yellow-400 mb-2">
                              Duplicate URLs Found
                            </p>
                            <div className="space-y-1 max-h-[120px] overflow-y-auto">
                              {validationResult.duplicates.map((dup, index) => (
                                <div key={index} className="text-xs text-muted-foreground truncate">
                                  {dup.url} <span className="text-yellow-400">(×{dup.count})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Invalid URLs */}
                    {validationResult.invalid.length > 0 && (
                      <Card className="p-4 bg-red-500/10 border-red-500/20">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 shrink-0">
                            {validationResult.invalid.length}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-red-400 mb-2">
                              Invalid URLs
                            </p>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                              {validationResult.invalid.map((invalid, index) => (
                                <div key={index} className="text-xs space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-foreground truncate font-mono flex-1">{invalid.url}</p>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setPreviewUrl(invalid.url);
                                        setShowPreview(true);
                                      }}
                                      className="h-6 px-2 shrink-0"
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <p className="text-muted-foreground">{invalid.reason}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Valid URLs with Preview */}
                    {validationResult.valid.length > 0 && (
                      <Card className="p-4 bg-green-500/10 border-green-500/20">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 shrink-0">
                            {validationResult.valid.length}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-green-400 mb-2">
                              Valid URLs (Ready to Scrape)
                            </p>
                            <div className="space-y-1 max-h-[200px] overflow-y-auto">
                              {validationResult.valid.slice(0, 10).map((url, index) => (
                                <div key={index} className="flex items-center justify-between gap-2 text-xs">
                                  <p className="text-muted-foreground truncate flex-1 font-mono">{url}</p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setPreviewUrl(url);
                                      setShowPreview(true);
                                    }}
                                    className="h-6 px-2 shrink-0"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              {validationResult.valid.length > 10 && (
                                <p className="text-xs text-muted-foreground italic">
                                  + {validationResult.valid.length - 10} more URLs
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Action Buttons */}
                    {validationResult.valid.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowValidation(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleProceedWithValid}
                          className="flex-1 bg-gradient-to-r from-pink-500 to-cyan-500 hover:opacity-90"
                        >
                          Proceed with {validationResult.valid.length} Valid URL(s)
                        </Button>
                      </div>
                    )}

                    {validationResult.valid.length === 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setShowValidation(false)}
                        className="w-full"
                      >
                        Back to Edit
                      </Button>
                    )}
                  </div>
                )}

                {!showValidation && (
                  <>
                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Processing...</span>
                      <span className="font-medium">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      Completed: {completedCount} / {totalCount}
                    </p>
                  </div>
                )}

                {jobResults.length > 0 && (
                  <>
                    <div className="space-y-3">
                      <Label>Results Summary</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Card className="p-3 bg-green-500/10 border-green-500/20">
                          <div className="text-sm text-muted-foreground">Completed</div>
                          <div className="text-2xl font-bold text-green-400">
                            {jobResults.filter(r => r.status === 'completed').length}
                          </div>
                        </Card>
                        <Card className="p-3 bg-red-500/10 border-red-500/20">
                          <div className="text-sm text-muted-foreground">Failed</div>
                          <div className="text-2xl font-bold text-red-400">
                            {jobResults.filter(r => r.status === 'failed').length}
                          </div>
                        </Card>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Export Results</Label>
                      <div className="flex gap-2">
                        <Button
                          onClick={exportToCSV}
                          variant="outline"
                          className="flex-1"
                        >
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          CSV
                        </Button>
                        <Button
                          onClick={exportToJSON}
                          variant="outline"
                          className="flex-1"
                        >
                          <FileJson className="mr-2 h-4 w-4" />
                          JSON
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      <Label>Job Status</Label>
                      {jobResults.map((result, index) => (
                        <div
                          key={result.id}
                          className="flex items-start justify-between p-3 bg-background/50 rounded-lg border border-border/50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{result.url}</p>
                            {result.error && (
                              <p className="text-xs text-red-400 mt-1">{result.error}</p>
                            )}
                          </div>
                          <Badge
                            variant={result.status === 'completed' ? 'default' : 'destructive'}
                            className="ml-2 shrink-0"
                          >
                            {result.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {!isProcessing && jobResults.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Upload className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Submit URLs to start bulk scraping</p>
                  </div>
                )}
                </>
              )}
              </CardContent>
            </Card>
          </div>
        </div>

        <UrlPreviewModal
          url={previewUrl}
          open={showPreview}
          onOpenChange={setShowPreview}
        />
      </div>
    </DashboardLayout>
  );
};

export default BulkScrape;
