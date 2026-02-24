-- =============================================================================
-- Raudah Travels — Full Schema Snapshot Migration
-- Generated: 2026-02-24
-- Description: Captures the complete current state of all tables, enums,
--              functions, triggers, RLS policies, and storage buckets.
-- =============================================================================

-- ─── 1. CUSTOM ENUMS ────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin','admin','moderator','staff','agent','user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.package_type AS ENUM ('hajj','umrah');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.package_category AS ENUM ('premium','standard','budget');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.package_status AS ENUM ('active','draft','archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM ('pending','confirmed','cancelled','completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('paystack','bank_transfer','ussd');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending','verified','rejected','refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.document_type AS ENUM ('passport','vaccine_certificate','visa','flight_ticket','hotel_voucher','booking_confirmation','payment_receipt','pre_departure_guide');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.agent_status AS ENUM ('active','suspended','pending');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM ('open','in_progress','resolved','closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_priority AS ENUM ('low','medium','high','urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─── 2. TABLES ──────────────────────────────────────────────────────────────

-- 2.1 profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  email       TEXT,
  phone       TEXT,
  avatar_url  TEXT,
  language_preference TEXT NOT NULL DEFAULT 'en',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2.2 user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role    public.app_role NOT NULL DEFAULT 'user'
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2.3 packages
CREATE TABLE IF NOT EXISTS public.packages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  type              public.package_type NOT NULL,
  category          public.package_category NOT NULL,
  season            TEXT,
  year              INTEGER NOT NULL,
  price             NUMERIC NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'NGN',
  agent_discount    NUMERIC NOT NULL DEFAULT 0,
  deposit_allowed   BOOLEAN NOT NULL DEFAULT false,
  minimum_deposit   NUMERIC,
  capacity          INTEGER NOT NULL DEFAULT 0,
  available         INTEGER NOT NULL DEFAULT 0 CHECK (available >= 0),
  inclusions        TEXT[] DEFAULT '{}',
  airlines          TEXT[] DEFAULT '{}',
  departure_cities  TEXT[] DEFAULT '{}',
  duration          TEXT,
  description       TEXT,
  image_url         TEXT,
  status            public.package_status NOT NULL DEFAULT 'draft',
  featured          BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- 2.4 package_dates
CREATE TABLE IF NOT EXISTS public.package_dates (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id           UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  outbound             DATE NOT NULL,
  outbound_route       TEXT,
  return_date          DATE NOT NULL,
  return_route         TEXT,
  airline              TEXT,
  islamic_date         TEXT,
  islamic_return_date  TEXT
);
ALTER TABLE public.package_dates ENABLE ROW LEVEL SECURITY;

-- 2.5 package_accommodations
CREATE TABLE IF NOT EXISTS public.package_accommodations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id          UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  city                TEXT NOT NULL CHECK (city = ANY (ARRAY['makkah','madinah'])),
  hotel               TEXT NOT NULL,
  distance_from_haram TEXT,
  distance_from_masjid TEXT,
  rating              INTEGER NOT NULL DEFAULT 3,
  room_types          TEXT[] DEFAULT '{}'
);
ALTER TABLE public.package_accommodations ENABLE ROW LEVEL SECURITY;

-- 2.6 agents
CREATE TABLE IF NOT EXISTS public.agents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name   TEXT NOT NULL,
  contact_person  TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT NOT NULL,
  agent_code      TEXT NOT NULL UNIQUE,
  commission_rate NUMERIC NOT NULL DEFAULT 0,
  commission_type TEXT NOT NULL DEFAULT 'percentage' CHECK (commission_type = ANY (ARRAY['percentage','fixed'])),
  status          public.agent_status NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- 2.7 agent_clients
CREATE TABLE IF NOT EXISTS public.agent_clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT NOT NULL,
  passport_number TEXT,
  passport_expiry DATE,
  date_of_birth   DATE,
  gender          TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_clients ENABLE ROW LEVEL SECURITY;

-- 2.8 agent_applications
CREATE TABLE IF NOT EXISTS public.agent_applications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id),
  business_name  TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT NOT NULL,
  message        TEXT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending','approved','rejected'])),
  reviewed_by    UUID REFERENCES auth.users(id),
  reviewed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_applications ENABLE ROW LEVEL SECURITY;

-- 2.9 bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference                     TEXT UNIQUE,
  user_id                       UUID NOT NULL REFERENCES auth.users(id),
  package_id                    UUID NOT NULL REFERENCES public.packages(id),
  package_date_id               UUID REFERENCES public.package_dates(id),
  status                        public.booking_status NOT NULL DEFAULT 'pending',
  full_name                     TEXT NOT NULL,
  passport_number               TEXT,
  passport_expiry               DATE,
  date_of_birth                 DATE,
  gender                        TEXT,
  emergency_contact_name        TEXT,
  emergency_contact_phone       TEXT,
  emergency_contact_relationship TEXT,
  departure_city                TEXT,
  room_preference               TEXT,
  special_requests              TEXT,
  agent_id                      UUID REFERENCES public.agents(id),
  agent_client_id               UUID REFERENCES public.agent_clients(id),
  nationality                   TEXT,
  place_of_birth                TEXT,
  marital_status                TEXT CHECK (marital_status = ANY (ARRAY['single','married','widowed','divorced'])),
  occupation                    TEXT,
  phone                         TEXT,
  address                       TEXT,
  fathers_name                  TEXT,
  mothers_name                  TEXT,
  mahram_name                   TEXT,
  mahram_relationship           TEXT,
  mahram_passport               TEXT,
  meningitis_vaccine_date       DATE,
  previous_umrah                BOOLEAN DEFAULT false,
  previous_umrah_year           INTEGER,
  custom_data                   JSONB,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 2.10 payments
CREATE TABLE IF NOT EXISTS public.payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id           UUID NOT NULL REFERENCES public.bookings(id),
  amount               NUMERIC NOT NULL,
  method               public.payment_method NOT NULL,
  status               public.payment_status NOT NULL DEFAULT 'pending',
  paystack_reference   TEXT,
  proof_of_payment_url TEXT,
  verified_by          UUID REFERENCES auth.users(id),
  verified_at          TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 2.11 documents
CREATE TABLE IF NOT EXISTS public.documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID REFERENCES public.bookings(id),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  type        public.document_type NOT NULL,
  file_url    TEXT NOT NULL,
  file_name   TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 2.12 notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'info',
  read       BOOLEAN NOT NULL DEFAULT false,
  link       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 2.13 support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES public.profiles(id),
  subject            TEXT NOT NULL,
  description        TEXT,
  category           TEXT,
  status             public.ticket_status NOT NULL DEFAULT 'open',
  priority           public.ticket_priority NOT NULL DEFAULT 'medium',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at    TIMESTAMPTZ DEFAULT now(),
  unread_count_admin INTEGER DEFAULT 0
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- 2.14 support_messages
CREATE TABLE IF NOT EXISTS public.support_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id      UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id      UUID NOT NULL REFERENCES public.profiles(id),
  message        TEXT NOT NULL,
  attachment_url TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- 2.15 bank_accounts
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name      TEXT NOT NULL,
  account_name   TEXT NOT NULL,
  account_number TEXT NOT NULL,
  sort_code      TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- 2.16 user_activity
CREATE TABLE IF NOT EXISTS public.user_activity (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES public.profiles(id),
  event_type TEXT NOT NULL,
  package_id UUID REFERENCES public.packages(id),
  booking_id UUID REFERENCES public.bookings(id),
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- 2.17 site_settings
CREATE TABLE IF NOT EXISTS public.site_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT NOT NULL UNIQUE,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- 2.18 booking_amendment_requests
CREATE TABLE IF NOT EXISTS public.booking_amendment_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID NOT NULL REFERENCES public.bookings(id),
  user_id           UUID NOT NULL REFERENCES auth.users(id),
  requested_changes JSONB NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending','approved','rejected'])),
  admin_notes       TEXT,
  reviewed_by       UUID REFERENCES auth.users(id),
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.booking_amendment_requests ENABLE ROW LEVEL SECURITY;

-- 2.19 staff_permissions
CREATE TABLE IF NOT EXISTS public.staff_permissions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission = ANY (ARRAY[
    'overview','packages','payments','pilgrims','analytics',
    'id_tags','agents','bank_accounts','activity','amendments',
    'support','settings','staff_management'
  ])),
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

-- 2.20 booking_form_fields
CREATE TABLE IF NOT EXISTS public.booking_form_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT NOT NULL,
  field_name  TEXT,
  field_type  TEXT NOT NULL DEFAULT 'text' CHECK (field_type = ANY (ARRAY['text','textarea','number','select','file'])),
  placeholder TEXT,
  required    BOOLEAN NOT NULL DEFAULT false,
  applies_to  TEXT NOT NULL DEFAULT 'both' CHECK (applies_to = ANY (ARRAY['user','agent','both'])),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  options     JSONB,
  accept      TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT false,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  section     TEXT NOT NULL DEFAULT 'additional' CHECK (section = ANY (ARRAY['pilgrim_info','visa_details','travel','additional'])),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_form_fields ENABLE ROW LEVEL SECURITY;


-- ─── 3. FUNCTIONS ───────────────────────────────────────────────────────────

-- 3.1 has_role — role hierarchy helper
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) THEN
    RETURN true;
  END IF;
  IF _role IN ('admin','moderator') THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin');
  END IF;
  IF _role = 'staff' THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','super_admin'));
  END IF;
  RETURN false;
END; $$;

-- 3.2 has_permission — permission check helper
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin') THEN RETURN true; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin') THEN RETURN true; END IF;
  RETURN EXISTS (SELECT 1 FROM public.staff_permissions WHERE user_id = _user_id AND permission = _permission);
END; $$;

-- 3.3 handle_new_user — auth trigger for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

-- 3.4 update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

-- 3.5 generate_booking_reference
CREATE OR REPLACE FUNCTION public.generate_booking_reference()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  new_ref TEXT;
  ref_exists BOOLEAN;
BEGIN
  LOOP
    new_ref := 'RTT-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS (SELECT 1 FROM public.bookings WHERE reference = new_ref) INTO ref_exists;
    EXIT WHEN NOT ref_exists;
  END LOOP;
  NEW.reference := new_ref;
  RETURN NEW;
END; $$;

-- 3.6 notify_booking_status_change
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      'Booking Status Updated',
      'Your booking ' || COALESCE(NEW.reference, NEW.id::text) || ' status changed to ' || NEW.status,
      CASE
        WHEN NEW.status = 'confirmed' THEN 'success'
        WHEN NEW.status = 'cancelled' THEN 'error'
        ELSE 'info'
      END,
      '/dashboard/bookings'
    );
  END IF;
  RETURN NEW;
END; $$;

-- 3.7 notify_payment_status_change
CREATE OR REPLACE FUNCTION public.notify_payment_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  booking_user_id UUID;
  booking_ref TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT user_id, reference INTO booking_user_id, booking_ref
    FROM public.bookings WHERE id = NEW.booking_id;
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      booking_user_id,
      CASE
        WHEN NEW.status = 'verified' THEN 'Payment Verified'
        WHEN NEW.status = 'rejected' THEN 'Payment Rejected'
        ELSE 'Payment Update'
      END,
      'Payment of ₦' || NEW.amount::text || ' for booking ' || COALESCE(booking_ref, NEW.booking_id::text) || ' is now ' || NEW.status,
      CASE
        WHEN NEW.status = 'verified' THEN 'success'
        WHEN NEW.status = 'rejected' THEN 'error'
        ELSE 'info'
      END,
      '/dashboard/payments'
    );
  END IF;
  RETURN NEW;
END; $$;

-- 3.8 handle_booking_inventory
CREATE OR REPLACE FUNCTION public.handle_booking_inventory()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE packages SET available = available - 1 WHERE id = NEW.package_id;
    RETURN NEW;
  END IF;
  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.status = 'cancelled' AND NEW.status != 'cancelled') THEN
      UPDATE packages SET available = available - 1 WHERE id = NEW.package_id;
    ELSIF (OLD.status != 'cancelled' AND NEW.status = 'cancelled') THEN
      UPDATE packages SET available = available + 1 WHERE id = NEW.package_id;
    END IF;
    RETURN NEW;
  END IF;
  IF (TG_OP = 'DELETE') THEN
    IF (OLD.status != 'cancelled') THEN
      UPDATE packages SET available = available + 1 WHERE id = OLD.package_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;

-- 3.9 protect_booking_integrity
CREATE OR REPLACE FUNCTION public.protect_booking_integrity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    IF OLD.status IS DISTINCT FROM NEW.status OR
       OLD.package_id IS DISTINCT FROM NEW.package_id OR
       OLD.agent_id IS DISTINCT FROM NEW.agent_id OR
       OLD.user_id IS DISTINCT FROM NEW.user_id OR
       OLD.reference IS DISTINCT FROM NEW.reference OR
       OLD.agent_client_id IS DISTINCT FROM NEW.agent_client_id THEN
      RAISE EXCEPTION 'Unauthorized: You cannot modify core booking fields.';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

-- 3.10 verify_payment_amount
CREATE OR REPLACE FUNCTION public.verify_payment_amount()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  pkg_price            DECIMAL;
  pkg_agent_discount   DECIMAL;
  min_deposit          DECIMAL;
  is_deposit_allowed   BOOLEAN;
  booking_agent_id     UUID;
  booking_user_id      UUID;
  agent_comm_rate      DECIMAL;
  agent_comm_type      TEXT;
  wholesale_price      DECIMAL;
BEGIN
  IF NEW.status = 'verified' AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can create pre-verified payment records.';
  END IF;
  IF has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;

  SELECT p.price, COALESCE(p.agent_discount, 0), p.minimum_deposit, p.deposit_allowed, b.agent_id, b.user_id
  INTO pkg_price, pkg_agent_discount, min_deposit, is_deposit_allowed, booking_agent_id, booking_user_id
  FROM packages p JOIN bookings b ON b.package_id = p.id WHERE b.id = NEW.booking_id;

  IF booking_agent_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM agents a WHERE a.id = booking_agent_id AND a.user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized: You do not own this agent booking.';
    END IF;
    SELECT commission_rate, commission_type INTO agent_comm_rate, agent_comm_type FROM agents WHERE id = booking_agent_id;
    agent_comm_rate := COALESCE(agent_comm_rate, 0);
    agent_comm_type := COALESCE(agent_comm_type, 'percentage');
    IF agent_comm_type = 'fixed' THEN
      wholesale_price := GREATEST(0, pkg_price - agent_comm_rate);
    ELSIF agent_comm_rate > 0 THEN
      wholesale_price := pkg_price - (pkg_price * agent_comm_rate / 100);
    ELSE
      wholesale_price := GREATEST(0, pkg_price - pkg_agent_discount);
    END IF;
    IF ROUND(NEW.amount) = ROUND(wholesale_price) THEN RETURN NEW; END IF;
    IF is_deposit_allowed AND min_deposit IS NOT NULL AND ROUND(NEW.amount) = ROUND(min_deposit) THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'Agent payment amount does not match wholesale price or deposit.';
  ELSE
    IF booking_user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Unauthorized: You do not own this booking.';
    END IF;
    IF ROUND(NEW.amount) = ROUND(pkg_price) THEN RETURN NEW;
    ELSIF is_deposit_allowed AND min_deposit IS NOT NULL AND ROUND(NEW.amount) = ROUND(min_deposit) THEN RETURN NEW;
    ELSE RAISE EXCEPTION 'Payment amount must match package price or deposit.';
    END IF;
  END IF;
END; $$;

-- 3.11 enforce_payment_amount
CREATE OR REPLACE FUNCTION public.enforce_payment_amount()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_package_id       UUID;
  v_package_price    NUMERIC;
  v_agent_id         UUID;
  v_commission_rate  NUMERIC;
  v_commission_type  TEXT;
  v_correct_amount   NUMERIC;
  v_min_deposit      NUMERIC;
  v_deposit_allowed  BOOLEAN;
BEGIN
  IF NEW.method = 'paystack' THEN RETURN NEW; END IF;
  SELECT b.package_id, b.agent_id INTO v_package_id, v_agent_id FROM bookings b WHERE b.id = NEW.booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found for payment'; END IF;
  SELECT p.price, p.minimum_deposit, p.deposit_allowed INTO v_package_price, v_min_deposit, v_deposit_allowed FROM packages p WHERE p.id = v_package_id;
  IF v_package_price IS NULL THEN RAISE EXCEPTION 'Package price not found'; END IF;

  IF v_agent_id IS NOT NULL THEN
    SELECT a.commission_rate, COALESCE(a.commission_type, 'percentage') INTO v_commission_rate, v_commission_type FROM agents a WHERE a.id = v_agent_id;
    IF v_commission_type = 'fixed' THEN
      v_correct_amount := GREATEST(0, v_package_price - COALESCE(v_commission_rate, 0));
    ELSE
      v_correct_amount := v_package_price * (1 - COALESCE(v_commission_rate, 0) / 100);
    END IF;
  ELSE
    v_correct_amount := v_package_price;
  END IF;

  IF v_deposit_allowed AND v_min_deposit IS NOT NULL AND ROUND(NEW.amount) = ROUND(v_min_deposit) THEN
    RETURN NEW;
  END IF;
  NEW.amount := v_correct_amount;
  RETURN NEW;
END; $$;

-- 3.12 check_agent_application_security
CREATE OR REPLACE FUNCTION public.check_agent_application_security()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  recent_app_count INT;
BEGIN
  IF EXISTS (SELECT 1 FROM public.agents WHERE email = NEW.email OR phone = NEW.phone) THEN
    RAISE EXCEPTION 'This email or phone number is already registered to an active agent account.';
  END IF;
  IF NEW.user_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.agents WHERE user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'You already have an active agent account.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.agent_applications WHERE user_id = NEW.user_id AND status = 'pending' AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')) THEN
      RAISE EXCEPTION 'You already have a pending agent application.';
    END IF;
  END IF;
  SELECT COUNT(*) INTO recent_app_count FROM public.agent_applications WHERE email = NEW.email AND created_at > (now() - interval '1 hour');
  IF recent_app_count >= 3 THEN
    RAISE EXCEPTION 'Too many application attempts. Please try again after an hour.';
  END IF;
  RETURN NEW;
END; $$;

-- 3.13 handle_new_support_message
CREATE OR REPLACE FUNCTION public.handle_new_support_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  ticket_owner_id UUID;
  ticket_subject TEXT;
  sender_name TEXT;
  admin_user_id UUID;
BEGIN
  SELECT user_id, subject INTO ticket_owner_id, ticket_subject FROM support_tickets WHERE id = NEW.ticket_id;
  UPDATE support_tickets SET last_message_at = NEW.created_at, updated_at = now() WHERE id = NEW.ticket_id;
  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;

  IF NEW.sender_id = ticket_owner_id THEN
    FOR admin_user_id IN SELECT user_id FROM user_roles WHERE role = 'admin' LOOP
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (admin_user_id, 'New Support Message', sender_name || ' sent a message regarding: ' || ticket_subject, 'info', '/admin/support');
    END LOOP;
    UPDATE support_tickets SET unread_count_admin = unread_count_admin + 1 WHERE id = NEW.ticket_id;
  ELSE
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (ticket_owner_id, 'New Support Reply', 'Support has replied to your ticket: ' || ticket_subject, 'success', '/dashboard/support');
    UPDATE support_tickets SET unread_count_admin = 0 WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END; $$;


-- ─── 4. TRIGGERS ────────────────────────────────────────────────────────────

-- Auth trigger (on auth.users — may already exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- packages
DROP TRIGGER IF EXISTS update_packages_updated_at ON public.packages;
CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- bookings
DROP TRIGGER IF EXISTS set_booking_reference ON public.bookings;
CREATE TRIGGER set_booking_reference
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.generate_booking_reference();

DROP TRIGGER IF EXISTS ensure_booking_integrity ON public.bookings;
CREATE TRIGGER ensure_booking_integrity
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.protect_booking_integrity();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS on_booking_status_change ON public.bookings;
CREATE TRIGGER on_booking_status_change
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_status_change();

DROP TRIGGER IF EXISTS trigger_booking_inventory ON public.bookings;
CREATE TRIGGER trigger_booking_inventory
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_booking_inventory();

-- payments
DROP TRIGGER IF EXISTS ensure_payment_amount ON public.payments;
CREATE TRIGGER ensure_payment_amount
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.verify_payment_amount();

DROP TRIGGER IF EXISTS trg_enforce_payment_amount ON public.payments;
CREATE TRIGGER trg_enforce_payment_amount
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_payment_amount();

DROP TRIGGER IF EXISTS on_payment_status_change ON public.payments;
CREATE TRIGGER on_payment_status_change
  AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_payment_status_change();

-- agents
DROP TRIGGER IF EXISTS update_agents_updated_at ON public.agents;
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- agent_clients
DROP TRIGGER IF EXISTS update_agent_clients_updated_at ON public.agent_clients;
CREATE TRIGGER update_agent_clients_updated_at
  BEFORE UPDATE ON public.agent_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- agent_applications
DROP TRIGGER IF EXISTS trigger_agent_app_security ON public.agent_applications;
CREATE TRIGGER trigger_agent_app_security
  BEFORE INSERT ON public.agent_applications
  FOR EACH ROW EXECUTE FUNCTION public.check_agent_application_security();

-- support_tickets
DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- support_messages
DROP TRIGGER IF EXISTS on_support_message_created ON public.support_messages;
CREATE TRIGGER on_support_message_created
  AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_support_message();


-- ─── 5. RLS POLICIES ───────────────────────────────────────────────────────

-- ── profiles ──
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ── user_roles ──
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ── packages ──
DROP POLICY IF EXISTS "Anyone can view active packages" ON public.packages;
CREATE POLICY "Anyone can view active packages" ON public.packages FOR SELECT USING (status = 'active'::package_status);
DROP POLICY IF EXISTS "Admins can manage packages" ON public.packages;
CREATE POLICY "Admins can manage packages" ON public.packages FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ── package_dates ──
DROP POLICY IF EXISTS "Anyone can view package dates" ON public.package_dates;
CREATE POLICY "Anyone can view package dates" ON public.package_dates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage package dates" ON public.package_dates;
CREATE POLICY "Admins can manage package dates" ON public.package_dates FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ── package_accommodations ──
DROP POLICY IF EXISTS "Anyone can view package accommodations" ON public.package_accommodations;
CREATE POLICY "Anyone can view package accommodations" ON public.package_accommodations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage package accommodations" ON public.package_accommodations;
CREATE POLICY "Admins can manage package accommodations" ON public.package_accommodations FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ── agents ──
DROP POLICY IF EXISTS "Agents can view own record" ON public.agents;
CREATE POLICY "Agents can view own record" ON public.agents FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins can manage all agents" ON public.agents;
CREATE POLICY "Admins can manage all agents" ON public.agents FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ── agent_clients ──
DROP POLICY IF EXISTS "Agents can manage own clients" ON public.agent_clients;
CREATE POLICY "Agents can manage own clients" ON public.agent_clients FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_clients.agent_id AND a.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_clients.agent_id AND a.user_id = auth.uid()));
DROP POLICY IF EXISTS "Admins can manage all agent clients" ON public.agent_clients;
CREATE POLICY "Admins can manage all agent clients" ON public.agent_clients FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ── agent_applications ──
DROP POLICY IF EXISTS "Anyone can submit agent applications" ON public.agent_applications;
CREATE POLICY "Anyone can submit agent applications" ON public.agent_applications FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Users can view own applications" ON public.agent_applications;
CREATE POLICY "Users can view own applications" ON public.agent_applications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins can view all agent applications" ON public.agent_applications;
CREATE POLICY "Admins can view all agent applications" ON public.agent_applications FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can update agent applications" ON public.agent_applications;
CREATE POLICY "Admins can update agent applications" ON public.agent_applications FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ── bookings ──
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can create own bookings" ON public.bookings;
CREATE POLICY "Users can create own bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update own bookings (non-status fields only)" ON public.bookings;
CREATE POLICY "Users can update own bookings (non-status fields only)" ON public.bookings FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND status = 'pending'::booking_status);
DROP POLICY IF EXISTS "Agents can view their clients bookings" ON public.bookings;
CREATE POLICY "Agents can view their clients bookings" ON public.bookings FOR SELECT TO authenticated USING (agent_id IS NOT NULL AND EXISTS (SELECT 1 FROM agents WHERE agents.id = bookings.agent_id AND agents.user_id = auth.uid()));
DROP POLICY IF EXISTS "Agents can create bookings for clients" ON public.bookings;
CREATE POLICY "Agents can create bookings for clients" ON public.bookings FOR INSERT WITH CHECK (has_role(auth.uid(), 'agent'::app_role) AND agent_id IS NOT NULL AND EXISTS (SELECT 1 FROM agents a WHERE a.id = bookings.agent_id AND a.user_id = auth.uid()));
DROP POLICY IF EXISTS "Agents can update own bookings" ON public.bookings;
CREATE POLICY "Agents can update own bookings" ON public.bookings FOR UPDATE USING (agent_id IS NOT NULL AND EXISTS (SELECT 1 FROM agents a WHERE a.id = bookings.agent_id AND a.user_id = auth.uid())) WITH CHECK (agent_id IS NOT NULL AND EXISTS (SELECT 1 FROM agents a WHERE a.id = bookings.agent_id AND a.user_id = auth.uid()));
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;
CREATE POLICY "Admins can manage all bookings" ON public.bookings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ── payments ──
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM bookings b WHERE b.id = payments.booking_id AND b.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can create payments for own bookings (pending only)" ON public.payments;
CREATE POLICY "Users can create payments for own bookings (pending only)" ON public.payments FOR INSERT TO authenticated WITH CHECK (status = 'pending'::payment_status AND EXISTS (SELECT 1 FROM bookings b WHERE b.id = payments.booking_id AND b.user_id = auth.uid()));
DROP POLICY IF EXISTS "Agents can view own booking payments" ON public.payments;
CREATE POLICY "Agents can view own booking payments" ON public.payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM bookings b JOIN agents a ON a.id = b.agent_id WHERE b.id = payments.booking_id AND a.user_id = auth.uid()));
DROP POLICY IF EXISTS "Agents can create payments for own bookings" ON public.payments;
CREATE POLICY "Agents can create payments for own bookings" ON public.payments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM bookings b JOIN agents a ON a.id = b.agent_id WHERE b.id = payments.booking_id AND a.user_id = auth.uid()));
DROP POLICY IF EXISTS "Agents can update own booking payments" ON public.payments;
CREATE POLICY "Agents can update own booking payments" ON public.payments FOR UPDATE USING (EXISTS (SELECT 1 FROM bookings b JOIN agents a ON a.id = b.agent_id WHERE b.id = payments.booking_id AND a.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM bookings b JOIN agents a ON a.id = b.agent_id WHERE b.id = payments.booking_id AND a.user_id = auth.uid()));
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
CREATE POLICY "Admins can manage all payments" ON public.payments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ── documents ──
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can upload own documents" ON public.documents;
CREATE POLICY "Users can upload own documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins can manage all documents" ON public.documents;
CREATE POLICY "Admins can manage all documents" ON public.documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ── notifications ──
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can receive notifications" ON public.notifications;
CREATE POLICY "Users can receive notifications" ON public.notifications FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;
CREATE POLICY "Admins can manage all notifications" ON public.notifications FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ── support_tickets ──
DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can create own tickets" ON public.support_tickets;
CREATE POLICY "Users can create own tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update own tickets" ON public.support_tickets;
CREATE POLICY "Users can update own tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins can manage all tickets" ON public.support_tickets;
CREATE POLICY "Admins can manage all tickets" ON public.support_tickets FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ── support_messages ──
DROP POLICY IF EXISTS "Users can view ticket messages" ON public.support_messages;
CREATE POLICY "Users can view ticket messages" ON public.support_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = support_messages.ticket_id AND support_tickets.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can send ticket messages" ON public.support_messages;
CREATE POLICY "Users can send ticket messages" ON public.support_messages FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = support_messages.ticket_id AND support_tickets.user_id = auth.uid()));
DROP POLICY IF EXISTS "Admins can manage all messages" ON public.support_messages;
CREATE POLICY "Admins can manage all messages" ON public.support_messages FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ── bank_accounts ──
DROP POLICY IF EXISTS "Public can read active bank accounts" ON public.bank_accounts;
CREATE POLICY "Public can read active bank accounts" ON public.bank_accounts FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage bank accounts" ON public.bank_accounts;
CREATE POLICY "Admins can manage bank accounts" ON public.bank_accounts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ── user_activity ──
DROP POLICY IF EXISTS "Allow anyone to insert activity" ON public.user_activity;
CREATE POLICY "Allow anyone to insert activity" ON public.user_activity FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can read all activity" ON public.user_activity;
CREATE POLICY "Admins can read all activity" ON public.user_activity FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ── site_settings ──
DROP POLICY IF EXISTS "anyone_read_settings" ON public.site_settings;
CREATE POLICY "anyone_read_settings" ON public.site_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert settings" ON public.site_settings;
CREATE POLICY "Admins can insert settings" ON public.site_settings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can update settings" ON public.site_settings;
CREATE POLICY "Admins can update settings" ON public.site_settings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ── booking_amendment_requests ──
DROP POLICY IF EXISTS "Users can view their own amendment requests" ON public.booking_amendment_requests;
CREATE POLICY "Users can view their own amendment requests" ON public.booking_amendment_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can create their own amendment requests" ON public.booking_amendment_requests;
CREATE POLICY "Users can create their own amendment requests" ON public.booking_amendment_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins can manage all amendment requests" ON public.booking_amendment_requests;
CREATE POLICY "Admins can manage all amendment requests" ON public.booking_amendment_requests FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role));

-- ── staff_permissions ──
DROP POLICY IF EXISTS "Users can view own permissions" ON public.staff_permissions;
CREATE POLICY "Users can view own permissions" ON public.staff_permissions FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins can manage staff permissions" ON public.staff_permissions;
CREATE POLICY "Admins can manage staff permissions" ON public.staff_permissions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Super admins can manage all permissions" ON public.staff_permissions;
CREATE POLICY "Super admins can manage all permissions" ON public.staff_permissions FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ── booking_form_fields ──
DROP POLICY IF EXISTS "Authenticated users can read form fields" ON public.booking_form_fields;
CREATE POLICY "Authenticated users can read form fields" ON public.booking_form_fields FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage form fields" ON public.booking_form_fields;
CREATE POLICY "Admins manage form fields" ON public.booking_form_fields FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


-- ─── 6. STORAGE BUCKETS ─────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;


-- ─── 7. REALTIME ────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
