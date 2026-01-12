-- =============================================
-- TCPA COMPLIANCE DATABASE SCHEMA
-- =============================================

-- 1. Create DNC (Do Not Call) list table
CREATE TABLE public.dnc_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone_number text NOT NULL,
  reason text NOT NULL DEFAULT 'manual_add',
  state text,
  added_by text,
  source text DEFAULT 'internal',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, phone_number)
);

-- Enable RLS
ALTER TABLE public.dnc_list ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dnc_list
CREATE POLICY "Users can view their own DNC list" ON public.dnc_list
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own DNC list" ON public.dnc_list
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own DNC list" ON public.dnc_list
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own DNC list" ON public.dnc_list
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fast phone number lookups
CREATE INDEX idx_dnc_list_phone ON public.dnc_list(user_id, phone_number);

-- 2. Create compliance audit log table
CREATE TABLE public.compliance_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  category text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  result text,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.compliance_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for compliance_audit_log
CREATE POLICY "Users can view their own audit logs" ON public.compliance_audit_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit logs" ON public.compliance_audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_compliance_audit_log_user ON public.compliance_audit_log(user_id, created_at DESC);
CREATE INDEX idx_compliance_audit_log_category ON public.compliance_audit_log(category, created_at DESC);

-- 3. Create legal agreements table
CREATE TABLE public.legal_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agreement_type text NOT NULL,
  version text NOT NULL DEFAULT '1.0',
  accepted boolean NOT NULL DEFAULT false,
  accepted_at timestamp with time zone,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, agreement_type, version)
);

-- Enable RLS
ALTER TABLE public.legal_agreements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for legal_agreements
CREATE POLICY "Users can view their own agreements" ON public.legal_agreements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agreements" ON public.legal_agreements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agreements" ON public.legal_agreements
  FOR UPDATE USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_legal_agreements_user ON public.legal_agreements(user_id, agreement_type);

-- 4. Create data subject requests table (for CCPA/privacy compliance)
CREATE TABLE public.data_subject_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  details jsonb DEFAULT '{}'::jsonb,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  processed_by text,
  response jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for data_subject_requests
CREATE POLICY "Users can view their own requests" ON public.data_subject_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own requests" ON public.data_subject_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_data_subject_requests_user ON public.data_subject_requests(user_id, created_at DESC);

-- 5. Add compliance fields to call_records
ALTER TABLE public.call_records 
  ADD COLUMN IF NOT EXISTS consent_given boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS consent_response text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS called_during_business_hours boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS business_hours_override boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS opted_out boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS callback_number text,
  ADD COLUMN IF NOT EXISTS dnc_checked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_party_consent_state boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recording_access_log jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Index for compliance queries
CREATE INDEX IF NOT EXISTS idx_call_records_compliance ON public.call_records(user_id, consent_given, state);
CREATE INDEX IF NOT EXISTS idx_call_records_opted_out ON public.call_records(user_id, opted_out);

-- 6. Create function to check DNC list (bypasses RLS for internal use)
CREATE OR REPLACE FUNCTION public.is_on_dnc_list(p_user_id uuid, p_phone_number text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dnc_list
    WHERE user_id = p_user_id
    AND phone_number = p_phone_number
  )
$$;

-- 7. Create function to add to DNC list
CREATE OR REPLACE FUNCTION public.add_to_dnc_list(
  p_user_id uuid,
  p_phone_number text,
  p_reason text DEFAULT 'opt_out',
  p_state text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.dnc_list (user_id, phone_number, reason, state, added_by)
  VALUES (p_user_id, p_phone_number, p_reason, p_state, 'system')
  ON CONFLICT (user_id, phone_number) DO UPDATE SET
    reason = EXCLUDED.reason,
    updated_at = now()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- 8. Create function to log compliance actions
CREATE OR REPLACE FUNCTION public.log_compliance_action(
  p_user_id uuid,
  p_action text,
  p_category text,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_result text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.compliance_audit_log (user_id, action, category, details, result)
  VALUES (p_user_id, p_action, p_category, p_details, p_result)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- 9. Create function to check legal agreement acceptance
CREATE OR REPLACE FUNCTION public.has_accepted_agreement(p_user_id uuid, p_agreement_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.legal_agreements
    WHERE user_id = p_user_id
    AND agreement_type = p_agreement_type
    AND accepted = true
  )
$$;

-- 10. Create trigger for updated_at on new tables
CREATE TRIGGER update_dnc_list_updated_at
  BEFORE UPDATE ON public.dnc_list
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_agreements_updated_at
  BEFORE UPDATE ON public.legal_agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_subject_requests_updated_at
  BEFORE UPDATE ON public.data_subject_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();