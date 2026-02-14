
-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'agent', 'user');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE public.payment_status AS ENUM ('pending', 'verified', 'rejected', 'refunded');
CREATE TYPE public.payment_method AS ENUM ('paystack', 'bank_transfer', 'ussd');
CREATE TYPE public.document_type AS ENUM ('passport', 'vaccine_certificate', 'visa', 'flight_ticket', 'hotel_voucher', 'booking_confirmation', 'payment_receipt', 'pre_departure_guide');
CREATE TYPE public.agent_status AS ENUM ('active', 'suspended', 'pending');
CREATE TYPE public.package_status AS ENUM ('active', 'draft', 'archived');
CREATE TYPE public.package_type AS ENUM ('hajj', 'umrah');
CREATE TYPE public.package_category AS ENUM ('premium', 'standard', 'budget');

-- ============================================
-- TABLES (created before has_role function)
-- ============================================

-- 1. Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  language_preference TEXT NOT NULL DEFAULT 'en',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- 3. Packages
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.package_type NOT NULL,
  category public.package_category NOT NULL,
  season TEXT,
  year INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  agent_discount NUMERIC NOT NULL DEFAULT 0,
  deposit_allowed BOOLEAN NOT NULL DEFAULT false,
  minimum_deposit NUMERIC,
  capacity INTEGER NOT NULL DEFAULT 0,
  available INTEGER NOT NULL DEFAULT 0,
  inclusions TEXT[] DEFAULT '{}',
  airlines TEXT[] DEFAULT '{}',
  departure_cities TEXT[] DEFAULT '{}',
  duration TEXT,
  description TEXT,
  image_url TEXT,
  status public.package_status NOT NULL DEFAULT 'draft',
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Package Dates
CREATE TABLE public.package_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  outbound DATE NOT NULL,
  outbound_route TEXT,
  return_date DATE NOT NULL,
  return_route TEXT,
  airline TEXT,
  islamic_date TEXT,
  islamic_return_date TEXT
);

-- 5. Package Accommodations
CREATE TABLE public.package_accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  city TEXT NOT NULL CHECK (city IN ('makkah', 'madinah')),
  hotel TEXT NOT NULL,
  distance_from_haram TEXT,
  distance_from_masjid TEXT,
  rating INTEGER NOT NULL DEFAULT 3,
  room_types TEXT[] DEFAULT '{}'
);

-- 6. Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.packages(id),
  package_date_id UUID REFERENCES public.package_dates(id),
  status public.booking_status NOT NULL DEFAULT 'pending',
  full_name TEXT NOT NULL,
  passport_number TEXT,
  passport_expiry DATE,
  date_of_birth DATE,
  gender TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  departure_city TEXT,
  room_preference TEXT,
  special_requests TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  method public.payment_method NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  paystack_reference TEXT,
  proof_of_payment_url TEXT,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.document_type NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Agents
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  agent_code TEXT NOT NULL UNIQUE,
  commission_rate NUMERIC NOT NULL DEFAULT 0,
  status public.agent_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- HELPER FUNCTION (after user_roles table exists)
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- USER ROLES
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PACKAGES
CREATE POLICY "Anyone can view active packages" ON public.packages FOR SELECT USING (status = 'active');
CREATE POLICY "Admins can manage packages" ON public.packages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PACKAGE DATES
CREATE POLICY "Anyone can view package dates" ON public.package_dates FOR SELECT USING (true);
CREATE POLICY "Admins can manage package dates" ON public.package_dates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PACKAGE ACCOMMODATIONS
CREATE POLICY "Anyone can view package accommodations" ON public.package_accommodations FOR SELECT USING (true);
CREATE POLICY "Admins can manage package accommodations" ON public.package_accommodations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- BOOKINGS
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create own bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own bookings" ON public.bookings FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage all bookings" ON public.bookings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Agents can view their clients bookings" ON public.bookings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'agent'));

-- PAYMENTS
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()));
CREATE POLICY "Users can create payments for own bookings" ON public.payments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()));
CREATE POLICY "Admins can manage all payments" ON public.payments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- DOCUMENTS
CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can upload own documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage all documents" ON public.documents FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- AGENTS
CREATE POLICY "Agents can view own record" ON public.agents FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all agents" ON public.agents FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- AUTO-PROFILE TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- BOOKING REFERENCE GENERATOR
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_booking_reference()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END;
$$;

CREATE TRIGGER set_booking_reference BEFORE INSERT ON public.bookings FOR EACH ROW WHEN (NEW.reference IS NULL) EXECUTE FUNCTION public.generate_booking_reference();

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('passport-photos', 'passport-photos', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-receipts', 'payment-receipts', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage: passport-photos
CREATE POLICY "Users can upload own passport photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'passport-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own passport photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'passport-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins can view all passport photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'passport-photos' AND public.has_role(auth.uid(), 'admin'));

-- Storage: payment-receipts
CREATE POLICY "Users can upload own payment receipts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own payment receipts" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'payment-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins can view all payment receipts" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'payment-receipts' AND public.has_role(auth.uid(), 'admin'));

-- Storage: documents
CREATE POLICY "Users can upload own documents storage" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own documents storage" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins can view all documents storage" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));
