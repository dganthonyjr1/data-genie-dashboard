-- Add search_limit column for bulk business search
ALTER TABLE public.scraping_jobs 
ADD COLUMN search_limit INTEGER DEFAULT 20;

COMMENT ON COLUMN public.scraping_jobs.search_limit IS 'Number of results to return for bulk business search';