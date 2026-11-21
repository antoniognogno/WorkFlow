ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS color TEXT;

WITH ranked_jobs AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (ORDER BY created_at NULLS LAST, id) - 1) % 8 AS color_index
  FROM public.jobs
  WHERE color IS NULL OR btrim(color) = ''
)
UPDATE public.jobs AS jobs
SET color = CASE ranked_jobs.color_index
  WHEN 0 THEN '#7aa6bd'
  WHEN 1 THEN '#79b8ad'
  WHEN 2 THEN '#d6a85f'
  WHEN 3 THEN '#b58bc4'
  WHEN 4 THEN '#d47c79'
  WHEN 5 THEN '#839ac7'
  WHEN 6 THEN '#72a86f'
  ELSE '#c58a61'
END
FROM ranked_jobs
WHERE jobs.id = ranked_jobs.id;

ALTER TABLE public.jobs ALTER COLUMN color SET DEFAULT '#7aa6bd';
ALTER TABLE public.jobs ALTER COLUMN color SET NOT NULL;

NOTIFY pgrst, 'reload schema';
