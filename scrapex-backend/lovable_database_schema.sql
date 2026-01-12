-- Create call_records table if it doesn't exist
CREATE TABLE IF NOT EXISTS call_records (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  call_id TEXT UNIQUE NOT NULL,
  facility_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  outcome TEXT,
  duration INTEGER DEFAULT 0,
  lead_score INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_call_records_facility_name ON call_records(facility_name);
CREATE INDEX IF NOT EXISTS idx_call_records_created_at ON call_records(created_at);
CREATE INDEX IF NOT EXISTS idx_call_records_status ON call_records(status);

-- Update scraping_jobs table to include analysis results
ALTER TABLE scraping_jobs 
ADD COLUMN IF NOT EXISTS result JSONB,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for scraping_jobs
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_created_at ON scraping_jobs(created_at);

-- Create facility_analysis table for storing detailed analysis
CREATE TABLE IF NOT EXISTS facility_analysis (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  facility_name TEXT NOT NULL,
  url TEXT,
  lead_score INTEGER,
  urgency TEXT,
  revenue_opportunities JSONB,
  operational_gaps JSONB,
  recommended_pitch TEXT,
  analysis_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for facility_analysis
CREATE INDEX IF NOT EXISTS idx_facility_analysis_lead_score ON facility_analysis(lead_score);
CREATE INDEX IF NOT EXISTS idx_facility_analysis_urgency ON facility_analysis(urgency);
CREATE INDEX IF NOT EXISTS idx_facility_analysis_created_at ON facility_analysis(created_at);

-- Create call_statistics view
CREATE OR REPLACE VIEW call_statistics AS
SELECT
  COUNT(*) as total_calls,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_calls,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_calls,
  ROUND(
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as success_rate,
  ROUND(AVG(CASE WHEN duration > 0 THEN duration ELSE NULL END), 0) as average_duration,
  DATE_TRUNC('day', created_at) as date
FROM call_records
GROUP BY DATE_TRUNC('day', created_at);

-- Create lead_quality view
CREATE OR REPLACE VIEW lead_quality AS
SELECT
  facility_name,
  COUNT(*) as total_calls,
  SUM(CASE WHEN outcome = 'interested' THEN 1 ELSE 0 END) as interested_count,
  SUM(CASE WHEN outcome = 'callback_requested' THEN 1 ELSE 0 END) as callback_count,
  ROUND(
    SUM(CASE WHEN outcome = 'interested' OR outcome = 'callback_requested' THEN 1 ELSE 0 END)::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as engagement_rate,
  AVG(lead_score) as avg_lead_score
FROM call_records
GROUP BY facility_name;

-- Enable RLS (Row Level Security) if needed
ALTER TABLE call_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_analysis ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for now, restrict later)
CREATE POLICY "Allow all access to call_records" ON call_records
  FOR ALL USING (true);

CREATE POLICY "Allow all access to facility_analysis" ON facility_analysis
  FOR ALL USING (true);
