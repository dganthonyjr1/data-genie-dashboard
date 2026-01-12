-- Fix 1: Add policy for service role to insert notifications
-- The service role bypasses RLS by default, but we need to ensure the policy exists
CREATE POLICY "Service role can insert notifications" 
ON public.notifications 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Also add a policy that allows authenticated users to receive notifications addressed to them
-- This is already handled by existing SELECT policy, but let's ensure INSERT works for system
CREATE POLICY "System can create notifications for any user" 
ON public.notifications 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix 2: Restrict public access to scraping_templates - hide AI instructions for system templates
-- First, remove the overly permissive SELECT policy for system templates
DROP POLICY IF EXISTS "System templates are viewable by everyone" ON public.scraping_templates;
DROP POLICY IF EXISTS "Anyone can view system templates" ON public.scraping_templates;

-- Create a more restrictive policy that only shows templates to authenticated users
CREATE POLICY "Authenticated users can view system templates" 
ON public.scraping_templates 
FOR SELECT 
TO authenticated
USING (is_system = true OR user_id = auth.uid());