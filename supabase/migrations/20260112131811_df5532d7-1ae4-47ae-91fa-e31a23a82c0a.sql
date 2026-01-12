-- Create call_records table
CREATE TABLE public.call_records (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL,
  call_id TEXT UNIQUE NOT NULL,
  facility_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  outcome TEXT,
  duration INTEGER DEFAULT 0,
  lead_score INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create facility_analysis table
CREATE TABLE public.facility_analysis (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL,
  facility_name TEXT NOT NULL,
  url TEXT,
  lead_score INTEGER,
  urgency TEXT,
  revenue_opportunities JSONB,
  operational_gaps JSONB,
  recommended_pitch TEXT,
  analysis_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for call_records
CREATE INDEX idx_call_records_user_id ON public.call_records(user_id);
CREATE INDEX idx_call_records_facility_name ON public.call_records(facility_name);
CREATE INDEX idx_call_records_created_at ON public.call_records(created_at);
CREATE INDEX idx_call_records_status ON public.call_records(status);

-- Create indexes for facility_analysis
CREATE INDEX idx_facility_analysis_user_id ON public.facility_analysis(user_id);
CREATE INDEX idx_facility_analysis_lead_score ON public.facility_analysis(lead_score);
CREATE INDEX idx_facility_analysis_urgency ON public.facility_analysis(urgency);
CREATE INDEX idx_facility_analysis_created_at ON public.facility_analysis(created_at);

-- Enable RLS
ALTER TABLE public.call_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_analysis ENABLE ROW LEVEL SECURITY;

-- RLS policies for call_records
CREATE POLICY "Users can view their own call records"
ON public.call_records FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own call records"
ON public.call_records FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own call records"
ON public.call_records FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own call records"
ON public.call_records FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for facility_analysis
CREATE POLICY "Users can view their own facility analysis"
ON public.facility_analysis FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own facility analysis"
ON public.facility_analysis FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own facility analysis"
ON public.facility_analysis FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own facility analysis"
ON public.facility_analysis FOR DELETE
USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_call_records_updated_at
BEFORE UPDATE ON public.call_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_facility_analysis_updated_at
BEFORE UPDATE ON public.facility_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();