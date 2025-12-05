-- Add fields_count column to track number of extracted fields for single-URL jobs
ALTER TABLE public.scraping_jobs ADD COLUMN fields_count integer DEFAULT 0;

-- Update existing jobs to calculate fields_count from results
UPDATE public.scraping_jobs 
SET fields_count = (
  SELECT COUNT(*)
  FROM jsonb_each(COALESCE(results->0, '{}'::jsonb)) AS fields
  WHERE fields.value IS NOT NULL 
    AND fields.value != 'null'::jsonb 
    AND fields.value != '""'::jsonb
    AND fields.value != '[]'::jsonb
    AND fields.value != '{}'::jsonb
)
WHERE results_count = 1 AND status = 'completed';