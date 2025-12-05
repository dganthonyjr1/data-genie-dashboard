-- Add target_location column to scraping_jobs table
ALTER TABLE public.scraping_jobs 
ADD COLUMN target_country TEXT DEFAULT NULL,
ADD COLUMN target_state TEXT DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.scraping_jobs.target_country IS 'Target country for geo-targeted scraping (ISO code e.g., US, GB, AU)';
COMMENT ON COLUMN public.scraping_jobs.target_state IS 'Target state/region for location-aware validation';