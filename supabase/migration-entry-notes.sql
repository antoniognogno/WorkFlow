ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS note TEXT;

UPDATE public.entries
SET note = ''
WHERE note IS NULL;

ALTER TABLE public.entries ALTER COLUMN note SET DEFAULT '';
ALTER TABLE public.entries ALTER COLUMN note SET NOT NULL;

NOTIFY pgrst, 'reload schema';
