-- Migration to secure the process_agent_booking RPC
-- Prevents frontend tampering of _amount by calculating the exact wholesale price server-side

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
  _amount NUMERIC -- Kept for TS signature backwards compatibility, but ignored for deduction logic
) RETURNS UUID AS $$
DECLARE
  v_booking_id UUID;
  v_user_id UUID;
  v_current_balance NUMERIC;
  v_pkg_price NUMERIC;
  v_pkg_discount NUMERIC;
  v_agent_comm_rate NUMERIC;
  v_agent_comm_type TEXT;
  v_calculated_price NUMERIC;
BEGIN
  -- 1. Get authenticating user (Security Definer wrapper)
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Verify agent belongs to user & get agent commission stats
  SELECT commission_rate, commission_type 
  INTO v_agent_comm_rate, v_agent_comm_type
  FROM public.agents 
  WHERE id = _agent_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: Agent does not belong to user';
  END IF;

  -- 3. Get Package Pricing info
  SELECT price, COALESCE(agent_discount, 0)
  INTO v_pkg_price, v_pkg_discount
  FROM public.packages
  WHERE id = _package_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Package not found';
  END IF;

  -- 4. Calculate proper server-side amount (replicates TS app logic securely)
  v_agent_comm_rate := COALESCE(v_agent_comm_rate, 0);
  v_agent_comm_type := COALESCE(v_agent_comm_type, 'percentage');
  
  IF v_agent_comm_type = 'fixed' THEN
    v_calculated_price := GREATEST(0, v_pkg_price - v_agent_comm_rate);
  ELSIF v_agent_comm_rate > 0 THEN
    v_calculated_price := GREATEST(0, v_pkg_price - (v_pkg_price * (v_agent_comm_rate / 100.0)));
  ELSE
    v_calculated_price := GREATEST(0, v_pkg_price - v_pkg_discount);
  END IF;

  -- Security Check: Throw error if frontend tries to pass a maliciously small value
  IF _amount < v_calculated_price THEN
    RAISE EXCEPTION 'Security Error: Tampered booking amount detected. Requested: %, Actual: %', _amount, v_calculated_price;
  END IF;

  -- 5. Lock the wallet row for update
  SELECT balance INTO v_current_balance 
  FROM public.agent_wallets 
  WHERE agent_id = _agent_id 
  FOR UPDATE;

  -- ENFORCE SERVER-SIDE CALCULATED PRICE FOR DEDUCTION
  IF v_current_balance < v_calculated_price THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Please top up your wallet.';
  END IF;

  -- 6. Deduct from wallet securely
  UPDATE public.agent_wallets
  SET balance = balance - v_calculated_price,
      updated_at = now()
  WHERE agent_id = _agent_id;

  -- 7. Insert Booking
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

  -- 8. Insert Payment
  INSERT INTO public.payments (
    booking_id, amount, method, status
  ) VALUES (
    v_booking_id, v_calculated_price, 'wallet', 'verified'
  );

  -- 9. Log transaction securely
  INSERT INTO public.wallet_transactions (
    agent_id, amount, type, reference, description
  ) VALUES (
    _agent_id, v_calculated_price, 'deduction', v_booking_id::text, 'Package booking deduction'
  );

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
