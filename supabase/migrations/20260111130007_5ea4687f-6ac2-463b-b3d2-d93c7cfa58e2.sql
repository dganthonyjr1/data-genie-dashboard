-- Add restrictive UPDATE policy for payments table
-- Only service role (via edge functions) should be able to update payment records
-- This prevents users from modifying their payment records directly

-- First check if the policy exists, then create it if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payments' 
    AND policyname = 'Payments cannot be updated by users'
  ) THEN
    -- Create a restrictive update policy that denies all user updates
    -- Only service role (used by edge functions) can update payments
    CREATE POLICY "Payments cannot be updated by users"
      ON public.payments
      FOR UPDATE
      USING (false);
  END IF;
END $$;