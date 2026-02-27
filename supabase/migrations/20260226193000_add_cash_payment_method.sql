-- 20260226193000_add_cash_payment_method.sql
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'cash';
