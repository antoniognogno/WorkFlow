ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS break_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS overtime_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS overtime_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_entries_user_deleted ON public.entries (user_id, deleted_at);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS overtime_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS overtime_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.50;

NOTIFY pgrst, 'reload schema';
