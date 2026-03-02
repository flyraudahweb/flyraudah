-- Migration: Add visa provider tracking and ticket upload columns to bookings
-- Created: 2026-03-02

-- Track which visa provider processed the visa
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS visa_provider_id uuid REFERENCES public.visa_providers(id) ON DELETE SET NULL;

-- Track flight ticket uploads
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS ticket_document_url text,
  ADD COLUMN IF NOT EXISTS ticket_delivery_message text,
  ADD COLUMN IF NOT EXISTS ticket_uploaded_at timestamptz;

-- Index for fast provider filtering
CREATE INDEX IF NOT EXISTS bookings_visa_provider_id_idx ON public.bookings(visa_provider_id);
