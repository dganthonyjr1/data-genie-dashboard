-- Drop the old constraint and add new one with auto_call_triggered type
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY['job_complete'::text, 'job_failed'::text, 'scheduled_job_complete'::text, 'scheduled_job_failed'::text, 'auto_call_triggered'::text]));