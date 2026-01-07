-- Add auto_call_on_scrape_complete column to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS auto_call_on_scrape_complete boolean NOT NULL DEFAULT false;