-- Allow admins to update trades so admin edits reflect in users' trade history
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'trades' AND policyname = 'Admins can update trades'
  ) THEN
    CREATE POLICY "Admins can update trades"
    ON public.trades
    FOR UPDATE
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));
  END IF;
END $$;