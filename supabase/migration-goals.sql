ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS monthly_hours_goal NUMERIC(8, 2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS monthly_earnings_goal NUMERIC(10, 2) NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS weekly_hours_goal NUMERIC(8, 2) NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS job_monthly_earnings_goals JSONB NOT NULL DEFAULT '{}'::jsonb;

NOTIFY pgrst, 'reload schema';
