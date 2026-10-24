CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  price INTEGER NOT NULL CHECK (price > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  group_id UUID NOT NULL REFERENCES groups(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  paid_month DATE NOT NULL,
  CONSTRAINT payments_paid_month_first_day_check
    CHECK (EXTRACT(DAY FROM paid_month) = 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_month DATE;

-- Convert the earlier day-based payment date to month-based attribution.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'paid_at'
  ) THEN
    EXECUTE
      'UPDATE public.payments
       SET paid_month = date_trunc(''month'', paid_at)::DATE
       WHERE paid_month IS NULL';
  END IF;
END $$;

UPDATE payments
SET paid_month = date_trunc('month', paid_month)::DATE
WHERE paid_month IS NOT NULL
  AND EXTRACT(DAY FROM paid_month) <> 1;

ALTER TABLE payments ALTER COLUMN paid_month SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.payments'::regclass
      AND conname = 'payments_paid_month_first_day_check'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_paid_month_first_day_check
      CHECK (EXTRACT(DAY FROM paid_month) = 1);
  END IF;
END $$;

ALTER TABLE payments DROP COLUMN IF EXISTS paid_at;
DROP INDEX IF EXISTS idx_payments_student_date;

CREATE INDEX IF NOT EXISTS idx_payments_student_month ON payments(student_id, paid_month);

-- RLS with no policies: the service role key bypasses RLS, the anon key gets no access.
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Debtors for a month, using payments assigned to that month.
-- The owed amount is the student's group price. LEFT JOIN keeps zero-payment students;
-- HAVING excludes fully-paid (or overpaid) students.
CREATE OR REPLACE FUNCTION get_debtors(month_start DATE)
RETURNS TABLE (
  student_id UUID, name TEXT, phone TEXT,
  group_id UUID, group_name TEXT, monthly_amount INTEGER, paid BIGINT, debt BIGINT
)
LANGUAGE sql STABLE AS $$
  SELECT s.id, s.name, s.phone, g.id, g.name, g.price,
         COALESCE(SUM(p.amount), 0)::BIGINT AS paid,
         (g.price - COALESCE(SUM(p.amount), 0))::BIGINT AS debt
  FROM students s
  JOIN groups g ON g.id = s.group_id
  LEFT JOIN payments p
    ON p.student_id = s.id
   AND p.paid_month = date_trunc('month', month_start)::DATE
  GROUP BY s.id, g.id
  HAVING COALESCE(SUM(p.amount), 0) < g.price
  ORDER BY debt DESC;
$$;
