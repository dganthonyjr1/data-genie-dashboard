-- Add target_language column for locale targeting
ALTER TABLE public.scraping_jobs 
ADD COLUMN target_language TEXT DEFAULT NULL;