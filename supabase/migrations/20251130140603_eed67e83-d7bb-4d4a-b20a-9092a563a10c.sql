-- Add scheduling fields to scraping_jobs table
ALTER TABLE public.scraping_jobs
ADD COLUMN schedule_enabled boolean DEFAULT false,
ADD COLUMN schedule_frequency text CHECK (schedule_frequency IN ('hourly', 'daily', 'weekly')),
ADD COLUMN schedule_interval integer DEFAULT 1,
ADD COLUMN next_run_at timestamp with time zone,
ADD COLUMN last_run_at timestamp with time zone;

-- Create index for efficient scheduled job queries
CREATE INDEX idx_scraping_jobs_next_run ON public.scraping_jobs(next_run_at) 
WHERE schedule_enabled = true;

-- Add comment for documentation
COMMENT ON COLUMN public.scraping_jobs.schedule_enabled IS 'Whether this job should run on a schedule';
COMMENT ON COLUMN public.scraping_jobs.schedule_frequency IS 'Frequency of the schedule: hourly, daily, or weekly';
COMMENT ON COLUMN public.scraping_jobs.schedule_interval IS 'Number of hours/days/weeks between runs';
COMMENT ON COLUMN public.scraping_jobs.next_run_at IS 'When the job should next be executed';
COMMENT ON COLUMN public.scraping_jobs.last_run_at IS 'When the job was last executed';