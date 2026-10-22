ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS payment_note TEXT;

CREATE INDEX IF NOT EXISTS idx_entries_user_paid_at ON public.entries (user_id, paid_at);

NOTIFY pgrst, 'reload schema';
