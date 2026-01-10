import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Email syntax validation
function isValidEmailSyntax(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email.trim().toLowerCase());
}

// Check for disposable email domains
const disposableDomains = new Set([
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  '10minutemail.com', 'tempail.com', 'fakeinbox.com', 'yopmail.com',
  'temp-mail.org', 'getnada.com', 'trashmail.com', 'maildrop.cc',
  'sharklasers.com', 'guerrillamail.info', 'grr.la', 'pokemail.net',
  'spam4.me', 'dispostable.com', 'mailnesia.com', 'mytemp.email',
  'tempmailaddress.com', 'burnermail.io', 'tempinbox.com', 'mohmal.com'
]);

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return disposableDomains.has(domain);
}

// Check for common typos in popular domains
function checkDomainTypos(email: string): { hasSuggestion: boolean; suggestion?: string } {
  const domain = email.split('@')[1]?.toLowerCase();
  const typoMap: Record<string, string> = {
    'gmial.com': 'gmail.com',
    'gmal.com': 'gmail.com',
    'gmaill.com': 'gmail.com',
    'gamil.com': 'gmail.com',
    'gnail.com': 'gmail.com',
    'gmail.co': 'gmail.com',
    'hotmal.com': 'hotmail.com',
    'hotmial.com': 'hotmail.com',
    'hotmail.co': 'hotmail.com',
    'outlok.com': 'outlook.com',
    'outloo.com': 'outlook.com',
    'outlook.co': 'outlook.com',
    'yahooo.com': 'yahoo.com',
    'yaho.com': 'yahoo.com',
    'yahoo.co': 'yahoo.com',
    'yhaoo.com': 'yahoo.com',
    'aol.co': 'aol.com',
    'icloud.co': 'icloud.com',
    'icoud.com': 'icloud.com',
  };

  if (typoMap[domain]) {
    return {
      hasSuggestion: true,
      suggestion: email.replace(domain, typoMap[domain])
    };
  }
  return { hasSuggestion: false };
}

// Check if domain has MX records (can receive email)
async function checkMXRecords(domain: string): Promise<{ valid: boolean; mxRecords?: string[] }> {
  try {
    // Use DNS over HTTPS (DoH) to check MX records
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`, {
      headers: { 'Accept': 'application/dns-json' }
    });
    
    if (!response.ok) {
      console.log(`DNS lookup failed for ${domain}: ${response.status}`);
      return { valid: false };
    }
    
    const data = await response.json();
    
    if (data.Answer && data.Answer.length > 0) {
      const mxRecords = data.Answer
        .filter((record: any) => record.type === 15) // MX record type
        .map((record: any) => record.data);
      return { valid: mxRecords.length > 0, mxRecords };
    }
    
    return { valid: false };
  } catch (error) {
    console.error(`MX lookup error for ${domain}:`, error);
    return { valid: false };
  }
}

// Check for role-based emails (often not personal/deliverable)
function isRoleBasedEmail(email: string): boolean {
  const rolePatterns = [
    'admin', 'administrator', 'webmaster', 'postmaster', 'hostmaster',
    'info', 'support', 'help', 'contact', 'sales', 'marketing',
    'noreply', 'no-reply', 'donotreply', 'mailer-daemon', 'root',
    'abuse', 'security', 'privacy', 'compliance', 'billing', 'legal',
    'hr', 'careers', 'jobs', 'press', 'media', 'feedback', 'hello'
  ];
  
  const localPart = email.split('@')[0]?.toLowerCase();
  return rolePatterns.some(pattern => localPart === pattern || localPart.startsWith(pattern + '.'));
}

// Known free email providers (good to know for B2B)
const freeEmailProviders = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com',
  'gmx.com', 'tutanota.com', 'fastmail.com', 'hushmail.com', 'live.com',
  'msn.com', 'me.com', 'inbox.com', 'comcast.net', 'verizon.net'
]);

function isFreeEmailProvider(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return freeEmailProviders.has(domain);
}

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
  score: number; // 0-100, higher is better
  verified_at: string;
}

async function verifyEmail(email: string): Promise<EmailVerificationResult> {
  const cleanEmail = email.trim().toLowerCase();
  const domain = cleanEmail.split('@')[1];
  
  // Initialize checks
  const checks = {
    syntax_valid: false,
    mx_valid: false,
    is_disposable: false,
    is_role_based: false,
    is_free_provider: false,
    has_typo_suggestion: false,
    typo_suggestion: undefined as string | undefined,
  };
  
  let score = 0;
  let status: 'valid' | 'invalid' | 'risky' | 'unknown' = 'unknown';
  let reason = '';
  
  // Check syntax
  checks.syntax_valid = isValidEmailSyntax(cleanEmail);
  if (!checks.syntax_valid) {
    return {
      email: cleanEmail,
      is_valid: false,
      status: 'invalid',
      reason: 'Invalid email syntax',
      checks,
      score: 0,
      verified_at: new Date().toISOString(),
    };
  }
  score += 20;
  
  // Check for typos
  const typoCheck = checkDomainTypos(cleanEmail);
  checks.has_typo_suggestion = typoCheck.hasSuggestion;
  checks.typo_suggestion = typoCheck.suggestion;
  if (typoCheck.hasSuggestion) {
    score -= 30; // Likely a typo
  }
  
  // Check for disposable email
  checks.is_disposable = isDisposableEmail(cleanEmail);
  if (checks.is_disposable) {
    return {
      email: cleanEmail,
      is_valid: false,
      status: 'invalid',
      reason: 'Disposable/temporary email address',
      checks,
      score: 10,
      verified_at: new Date().toISOString(),
    };
  }
  score += 15;
  
  // Check MX records
  const mxCheck = await checkMXRecords(domain);
  checks.mx_valid = mxCheck.valid;
  if (!checks.mx_valid) {
    return {
      email: cleanEmail,
      is_valid: false,
      status: 'invalid',
      reason: 'Domain cannot receive emails (no MX records)',
      checks,
      score: 15,
      verified_at: new Date().toISOString(),
    };
  }
  score += 40;
  
  // Check role-based
  checks.is_role_based = isRoleBasedEmail(cleanEmail);
  if (checks.is_role_based) {
    score -= 15;
    reason = 'Role-based email address (may not reach a person)';
    status = 'risky';
  } else {
    score += 10;
  }
  
  // Check free provider
  checks.is_free_provider = isFreeEmailProvider(cleanEmail);
  if (checks.is_free_provider) {
    score -= 5; // Slight penalty for B2B context
  } else {
    score += 15; // Business email bonus
  }
  
  // Determine final status
  if (status !== 'risky') {
    if (score >= 70) {
      status = 'valid';
      reason = 'Email appears valid and deliverable';
    } else if (score >= 50) {
      status = 'risky';
      reason = 'Email may have deliverability issues';
    } else {
      status = 'unknown';
      reason = 'Could not fully verify email';
    }
  }
  
  return {
    email: cleanEmail,
    is_valid: status === 'valid',
    status,
    reason,
    checks,
    score: Math.max(0, Math.min(100, score)),
    verified_at: new Date().toISOString(),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emails, jobId } = await req.json();
    
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: 'emails array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit batch size
    const emailsToVerify = emails.slice(0, 50);
    console.log(`Verifying ${emailsToVerify.length} emails`);

    // Verify all emails in parallel
    const results = await Promise.all(
      emailsToVerify.map(email => verifyEmail(email))
    );

    // Calculate summary stats
    const summary = {
      total: results.length,
      valid: results.filter(r => r.status === 'valid').length,
      invalid: results.filter(r => r.status === 'invalid').length,
      risky: results.filter(r => r.status === 'risky').length,
      unknown: results.filter(r => r.status === 'unknown').length,
      avg_score: Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length),
    };

    console.log(`Verification complete: ${summary.valid} valid, ${summary.invalid} invalid, ${summary.risky} risky`);

    // If jobId provided, update the job results with verification data
    if (jobId) {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Fetch current job results
        const { data: job, error: jobError } = await supabase
          .from('scraping_jobs')
          .select('results')
          .eq('id', jobId)
          .single();
        
        if (!jobError && job?.results) {
          // Create a map of verification results by email
          const verificationMap = new Map(results.map(r => [r.email, r]));
          
          // Update results with verification data
          const updatedResults = (job.results as any[]).map(result => {
            const emails = result.emails || [];
            const verifiedEmails = emails.map((email: string) => {
              const verification = verificationMap.get(email.toLowerCase());
              return verification ? { email, verification } : { email, verification: null };
            });
            
            return {
              ...result,
              email_verification: verifiedEmails.length > 0 ? verifiedEmails : undefined,
            };
          });
          
          await supabase
            .from('scraping_jobs')
            .update({ results: updatedResults })
            .eq('id', jobId);
          
          console.log(`Updated job ${jobId} with email verification data`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        summary,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Email verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Verification failed';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
