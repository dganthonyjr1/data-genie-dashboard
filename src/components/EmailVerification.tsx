import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  HelpCircle, 
  Loader2,
  Mail,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion
} from "lucide-react";

interface EmailVerificationResult {
  email: string;
  is_valid: boolean;
  status: 'valid' | 'invalid' | 'risky' | 'unknown';
  reason?: string;
  checks: {
    syntax_valid: boolean;
    mx_valid: boolean;
    is_disposable: boolean;
    is_role_based: boolean;
    is_free_provider: boolean;
    has_typo_suggestion: boolean;
    typo_suggestion?: string;
  };
  score: number;
  verified_at: string;
}

interface EmailVerificationBadgeProps {
  email: string;
  verification?: EmailVerificationResult;
  onVerify?: (result: EmailVerificationResult) => void;
  showDetails?: boolean;
}

export function EmailVerificationBadge({ 
  email, 
  verification, 
  onVerify,
  showDetails = false 
}: EmailVerificationBadgeProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<EmailVerificationResult | undefined>(verification);
  const { toast } = useToast();

  const handleVerify = async () => {
    if (!email) return;
    
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-email', {
        body: { emails: [email] }
      });

      if (error) throw error;
      
      if (data?.results?.[0]) {
        setResult(data.results[0]);
        onVerify?.(data.results[0]);
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: "Verification failed",
        description: "Could not verify email address",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (!email) return null;

  // If no verification yet, show verify button
  if (!result) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleVerify}
        disabled={isVerifying}
        className="h-6 px-2 text-xs"
      >
        {isVerifying ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <Mail className="h-3 w-3 mr-1" />
        )}
        Verify
      </Button>
    );
  }

  // Status icons and colors
  const statusConfig = {
    valid: { 
      icon: ShieldCheck, 
      color: 'text-green-600', 
      bg: 'bg-green-50 border-green-200',
      badgeVariant: 'default' as const,
      badgeClass: 'bg-green-500 hover:bg-green-600'
    },
    invalid: { 
      icon: XCircle, 
      color: 'text-red-600', 
      bg: 'bg-red-50 border-red-200',
      badgeVariant: 'destructive' as const,
      badgeClass: ''
    },
    risky: { 
      icon: ShieldAlert, 
      color: 'text-yellow-600', 
      bg: 'bg-yellow-50 border-yellow-200',
      badgeVariant: 'secondary' as const,
      badgeClass: 'bg-yellow-500 hover:bg-yellow-600 text-white'
    },
    unknown: { 
      icon: ShieldQuestion, 
      color: 'text-gray-500', 
      bg: 'bg-gray-50 border-gray-200',
      badgeVariant: 'outline' as const,
      badgeClass: ''
    },
  };

  const config = statusConfig[result.status];
  const Icon = config.icon;

  const tooltipContent = (
    <div className="space-y-2 text-xs max-w-xs">
      <div className="font-medium">{result.reason}</div>
      <div className="text-muted-foreground">Score: {result.score}/100</div>
      {showDetails && (
        <div className="space-y-1 pt-1 border-t">
          <div className="flex items-center gap-1">
            {result.checks.syntax_valid ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
            <span>Syntax valid</span>
          </div>
          <div className="flex items-center gap-1">
            {result.checks.mx_valid ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
            <span>Domain can receive email</span>
          </div>
          <div className="flex items-center gap-1">
            {!result.checks.is_disposable ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
            <span>Not disposable</span>
          </div>
          <div className="flex items-center gap-1">
            {!result.checks.is_role_based ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <AlertTriangle className="h-3 w-3 text-yellow-500" />}
            <span>Personal email</span>
          </div>
          {result.checks.is_free_provider && (
            <div className="flex items-center gap-1">
              <HelpCircle className="h-3 w-3 text-blue-500" />
              <span>Free email provider</span>
            </div>
          )}
          {result.checks.has_typo_suggestion && (
            <div className="flex items-center gap-1 text-yellow-600">
              <AlertTriangle className="h-3 w-3" />
              <span>Did you mean: {result.checks.typo_suggestion}?</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant={config.badgeVariant}
          className={`cursor-help ${config.badgeClass}`}
        >
          <Icon className="h-3 w-3 mr-1" />
          {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="p-3">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}

interface BulkEmailVerifierProps {
  emails: string[];
  onComplete?: (results: EmailVerificationResult[]) => void;
  jobId?: string;
}

export function BulkEmailVerifier({ emails, onComplete, jobId }: BulkEmailVerifierProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<EmailVerificationResult[]>([]);
  const { toast } = useToast();

  const handleBulkVerify = async () => {
    if (!emails.length) return;
    
    setIsVerifying(true);
    setProgress(0);
    
    try {
      // Process in batches of 50
      const batchSize = 50;
      const allResults: EmailVerificationResult[] = [];
      
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        
        const { data, error } = await supabase.functions.invoke('verify-email', {
          body: { emails: batch, jobId }
        });

        if (error) throw error;
        
        if (data?.results) {
          allResults.push(...data.results);
        }
        
        setProgress(Math.min(100, Math.round(((i + batch.length) / emails.length) * 100)));
      }
      
      setResults(allResults);
      onComplete?.(allResults);
      
      const valid = allResults.filter(r => r.status === 'valid').length;
      const invalid = allResults.filter(r => r.status === 'invalid').length;
      
      toast({
        title: "Verification complete",
        description: `${valid} valid, ${invalid} invalid out of ${allResults.length} emails`,
      });
    } catch (error) {
      console.error('Bulk verification error:', error);
      toast({
        title: "Verification failed",
        description: "Could not complete email verification",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const summary = {
    total: results.length,
    valid: results.filter(r => r.status === 'valid').length,
    invalid: results.filter(r => r.status === 'invalid').length,
    risky: results.filter(r => r.status === 'risky').length,
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          onClick={handleBulkVerify}
          disabled={isVerifying || emails.length === 0}
          size="sm"
        >
          {isVerifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Verifying... {progress}%
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4 mr-2" />
              Verify {emails.length} Email{emails.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>
        
        {results.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="default" className="bg-green-500">
              {summary.valid} Valid
            </Badge>
            <Badge variant="destructive">
              {summary.invalid} Invalid
            </Badge>
            {summary.risky > 0 && (
              <Badge variant="secondary" className="bg-yellow-500 text-white">
                {summary.risky} Risky
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
