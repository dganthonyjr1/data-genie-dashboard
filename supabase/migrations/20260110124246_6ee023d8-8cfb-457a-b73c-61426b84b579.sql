-- Create call_attempts table to track all auto-call attempts
CREATE TABLE public.call_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID REFERENCES public.scraping_jobs(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed
  error_message TEXT,
  auto_triggered BOOLEAN NOT NULL DEFAULT true,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own call attempts"
ON public.call_attempts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own call attempts"
ON public.call_attempts
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_call_attempts_user_id ON public.call_attempts(user_id);
CREATE INDEX idx_call_attempts_created_at ON public.call_attempts(created_at DESC);