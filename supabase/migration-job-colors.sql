ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS color TEXT;

UPDATE public.jobs
SET color = '#7aa6bd'
WHERE color IS NULL OR btrim(color) = '';

ALTER TABLE public.jobs ALTER COLUMN color SET DEFAULT '#7aa6bd';
ALTER TABLE public.jobs ALTER COLUMN color SET NOT NULL;

NOTIFY pgrst, 'reload schema';
