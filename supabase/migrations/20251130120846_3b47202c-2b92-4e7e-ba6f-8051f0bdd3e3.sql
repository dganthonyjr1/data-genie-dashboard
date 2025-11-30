-- Add results column to scraping_jobs table to store scraped data
ALTER TABLE public.scraping_jobs 
ADD COLUMN results JSONB DEFAULT '[]'::jsonb;