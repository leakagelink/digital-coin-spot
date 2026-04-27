-- Enable full row data on realtime updates
ALTER TABLE public.deposit_requests REPLICA IDENTITY FULL;

-- Add table to realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'deposit_requests'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_requests';
  END IF;
END $$;