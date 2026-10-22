-- Import autorizzato per user_id:
-- 0824e081-2eff-4beb-8715-fcf7174ac5bc
-- Idempotente: non reinserisce una voce se esiste già con stesso utente,
-- lavoro, data e intervallo tecnico.

INSERT INTO public.entries (
  user_id,
  job_id,
  date,
  start_time,
  end_time,
  minutes,
  rate,
  break_minutes,
  overtime_minutes,
  overtime_rate,
  paid
)
SELECT
  source.user_id,
  source.job_id,
  source.date,
  source.start_time,
  source.end_time,
  source.minutes,
  source.rate,
  source.break_minutes,
  source.overtime_minutes,
  source.overtime_rate,
  FALSE
FROM (
  VALUES
    ('0824e081-2eff-4beb-8715-fcf7174ac5bc'::uuid, '40440b72-4c7e-4157-86d5-b0878af5fa64'::uuid, '2026-10-22'::date, '00:00'::time, '01:00'::time, 60, 15.00, 0, 0, 15.00),
    ('0824e081-2eff-4beb-8715-fcf7174ac5bc'::uuid, 'd64848b7-f5bd-4d93-9184-c7bedb0440ce'::uuid, '2026-10-21'::date, '00:00'::time, '03:00'::time, 180, 10.00, 0, 0, 10.00),
    ('0824e081-2eff-4beb-8715-fcf7174ac5bc'::uuid, 'd64848b7-f5bd-4d93-9184-c7bedb0440ce'::uuid, '2026-10-19'::date, '00:00'::time, '01:30'::time, 90, 10.00, 0, 0, 10.00),
    ('0824e081-2eff-4beb-8715-fcf7174ac5bc'::uuid, 'd64848b7-f5bd-4d93-9184-c7bedb0440ce'::uuid, '2026-10-17'::date, '00:00'::time, '01:30'::time, 90, 10.00, 0, 0, 10.00),
    ('0824e081-2eff-4beb-8715-fcf7174ac5bc'::uuid, 'd64848b7-f5bd-4d93-9184-c7bedb0440ce'::uuid, '2026-10-16'::date, '00:00'::time, '03:30'::time, 210, 10.00, 0, 0, 10.00),
    ('0824e081-2eff-4beb-8715-fcf7174ac5bc'::uuid, '40440b72-4c7e-4157-86d5-b0878af5fa64'::uuid, '2026-10-15'::date, '00:00'::time, '00:30'::time, 30, 15.00, 0, 0, 15.00),
    ('0824e081-2eff-4beb-8715-fcf7174ac5bc'::uuid, 'd64848b7-f5bd-4d93-9184-c7bedb0440ce'::uuid, '2026-10-14'::date, '00:00'::time, '03:30'::time, 210, 10.00, 0, 0, 10.00),
    ('0824e081-2eff-4beb-8715-fcf7174ac5bc'::uuid, 'd64848b7-f5bd-4d93-9184-c7bedb0440ce'::uuid, '2026-10-12'::date, '00:00'::time, '02:30'::time, 150, 10.00, 0, 0, 10.00),
    ('0824e081-2eff-4beb-8715-fcf7174ac5bc'::uuid, 'd64848b7-f5bd-4d93-9184-c7bedb0440ce'::uuid, '2026-10-09'::date, '00:00'::time, '03:30'::time, 210, 10.00, 0, 0, 10.00),
    ('0824e081-2eff-4beb-8715-fcf7174ac5bc'::uuid, 'd64848b7-f5bd-4d93-9184-c7bedb0440ce'::uuid, '2026-10-07'::date, '00:00'::time, '03:00'::time, 180, 10.00, 0, 0, 10.00),
    ('0824e081-2eff-4beb-8715-fcf7174ac5bc'::uuid, 'd64848b7-f5bd-4d93-9184-c7bedb0440ce'::uuid, '2026-10-05'::date, '00:00'::time, '02:30'::time, 150, 10.00, 0, 0, 10.00),
    ('0824e081-2eff-4beb-8715-fcf7174ac5bc'::uuid, 'd64848b7-f5bd-4d93-9184-c7bedb0440ce'::uuid, '2026-10-03'::date, '00:00'::time, '01:00'::time, 60, 10.00, 0, 0, 10.00),
    ('0824e081-2eff-4beb-8715-fcf7174ac5bc'::uuid, 'd64848b7-f5bd-4d93-9184-c7bedb0440ce'::uuid, '2026-10-02'::date, '00:00'::time, '02:30'::time, 60, 10.00, 0, 90, 10.00)
) AS source(user_id, job_id, date, start_time, end_time, minutes, rate, break_minutes, overtime_minutes, overtime_rate)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.entries existing
  WHERE existing.user_id = source.user_id
    AND existing.job_id = source.job_id
    AND existing.date = source.date
    AND existing.start_time = source.start_time
    AND existing.end_time = source.end_time
);

SELECT
  COUNT(*) AS imported_or_existing_rows,
  COALESCE(SUM(minutes + overtime_minutes), 0) AS total_minutes,
  COALESCE(SUM((minutes / 60.0) * rate + (overtime_minutes / 60.0) * overtime_rate), 0) AS total_amount_eur
FROM public.entries
WHERE user_id = '0824e081-2eff-4beb-8715-fcf7174ac5bc'::uuid
  AND date BETWEEN '2026-10-02'::date AND '2026-10-22'::date
  AND job_id IN (
    '40440b72-4c7e-4157-86d5-b0878af5fa64'::uuid,
    'd64848b7-f5bd-4d93-9184-c7bedb0440ce'::uuid
  );
