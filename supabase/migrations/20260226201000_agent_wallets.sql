-- 1. Add 'wallet' to payment_method enum
DO $$ 
BEGIN
  ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'wallet';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. agent_wallets table
CREATE TABLE IF NOT EXISTS public.agent_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their own wallet" 
  ON public.agent_wallets FOR SELECT TO authenticated 
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all wallets" 
  ON public.agent_wallets FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'::app_role));
  
CREATE POLICY "Admins can update wallets" 
  ON public.agent_wallets FOR UPDATE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. wallet_transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'deduction', 'refund')),
  reference TEXT UNIQUE, -- Optional unique ref, like booking_id or topup confirmation
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their own transactions" 
  ON public.wallet_transactions FOR SELECT TO authenticated 
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all transactions" 
  ON public.wallet_transactions FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. admin_otp_requests table
CREATE TABLE IF NOT EXISTS public.admin_otp_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_otp_requests ENABLE ROW LEVEL SECURITY;
-- Internal table, no public RLS needed (handled by service_role in edge functions)

-- 5. Trigger to auto-create wallet when an agent is created
CREATE OR REPLACE FUNCTION public.handle_new_agent_wallet() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.agent_wallets (agent_id, balance) VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_agent_created_create_wallet ON public.agents;
CREATE TRIGGER on_agent_created_create_wallet
  AFTER INSERT ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_agent_wallet();

-- Note: We should probably run a backfill for existing agents
INSERT INTO public.agent_wallets (agent_id, balance)
SELECT id, 0 FROM public.agents
ON CONFLICT (agent_id) DO NOTHING;

-- 6. RPC: process_agent_booking (Atomic Deduction & Booking)
CREATE OR REPLACE FUNCTION public.process_agent_booking(
  _package_id UUID,
  _package_date_id UUID,
  _agent_id UUID,
  _agent_client_id UUID,
  _full_name TEXT,
  _passport_number TEXT,
  _passport_expiry DATE,
  _date_of_birth DATE,
  _gender TEXT,
  _departure_city TEXT,
  _room_preference TEXT,
  _special_requests TEXT,
  _emergency_contact_name TEXT,
  _emergency_contact_phone TEXT,
  _emergency_contact_relationship TEXT,
  _custom_data JSONB,
  _amount NUMERIC
) RETURNS UUID AS $$
DECLARE
  v_booking_id UUID;
  v_user_id UUID;
  v_current_balance NUMERIC;
BEGIN
  -- Get the authenticating user (RPC runs as the invoking user, except we want security definer)
  -- Wait, for RPC we can get auth.uid()
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the agent belongs to this user
  IF NOT EXISTS (SELECT 1 FROM public.agents WHERE id = _agent_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Agent does not belong to user';
  END IF;

  -- Lock the wallet row for update
  SELECT balance INTO v_current_balance 
  FROM public.agent_wallets 
  WHERE agent_id = _agent_id 
  FOR UPDATE;

  IF v_current_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Please top up your wallet.';
  END IF;

  -- Deduct from wallet
  UPDATE public.agent_wallets
  SET balance = balance - _amount,
      updated_at = now()
  WHERE agent_id = _agent_id;

  -- Insert Booking
  INSERT INTO public.bookings (
    user_id, package_id, package_date_id, agent_id, agent_client_id,
    full_name, passport_number, passport_expiry, date_of_birth, gender,
    departure_city, room_preference, special_requests,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
    status, custom_data
  ) VALUES (
    v_user_id, _package_id, _package_date_id, _agent_id, _agent_client_id,
    _full_name, _passport_number, _passport_expiry, _date_of_birth, _gender,
    _departure_city, _room_preference, _special_requests,
    _emergency_contact_name, _emergency_contact_phone, _emergency_contact_relationship,
    'confirmed', _custom_data
  ) RETURNING id INTO v_booking_id;

  -- Insert Payment
  INSERT INTO public.payments (
    booking_id, amount, method, status
  ) VALUES (
    v_booking_id, _amount, 'wallet', 'verified'
  );

  -- Log transaction
  INSERT INTO public.wallet_transactions (
    agent_id, amount, type, reference, description
  ) VALUES (
    _agent_id, _amount, 'deduction', v_booking_id::text, 'Package booking deduction'
  );

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
