CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client TEXT,
  rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  overtime_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  overtime_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  minutes INTEGER NOT NULL,
  rate NUMERIC(10, 2) NOT NULL,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  overtime_minutes INTEGER NOT NULL DEFAULT 0,
  overtime_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  template_row TEXT NOT NULL DEFAULT '{giorno} {data}: {da}–{a} ({ore} h) → {euro}',
  template_total TEXT NOT NULL DEFAULT 'Totale: {ore} h = {euro}',
  theme TEXT NOT NULL DEFAULT 'system',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can manage their own presets" ON public.presets;
DROP POLICY IF EXISTS "Users can manage their own entries" ON public.entries;
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.settings;

CREATE POLICY "Users can manage their own jobs" ON public.jobs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own presets" ON public.presets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own entries" ON public.entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own settings" ON public.settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_entries_user_date ON public.entries (user_id, date);
CREATE INDEX IF NOT EXISTS idx_jobs_user ON public.jobs (user_id);
CREATE INDEX IF NOT EXISTS idx_entries_user_deleted ON public.entries (user_id, deleted_at);

ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS break_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS overtime_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS overtime_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS overtime_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS overtime_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.50;
