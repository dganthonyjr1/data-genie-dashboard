-- Add results_count column to scraping_jobs
ALTER TABLE public.scraping_jobs 
ADD COLUMN results_count integer DEFAULT 0;

-- Update existing rows to calculate count from results array
UPDATE public.scraping_jobs 
SET results_count = COALESCE(jsonb_array_length(results), 0)
WHERE results IS NOT NULL;