
-- Create agent_clients table for agents to manage their client directory
CREATE TABLE public.agent_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  passport_number TEXT,
  passport_expiry DATE,
  date_of_birth DATE,
  gender TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can manage own clients"
ON public.agent_clients FOR ALL
USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_clients.agent_id AND a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_clients.agent_id AND a.user_id = auth.uid()));

CREATE POLICY "Admins can manage all agent clients"
ON public.agent_clients FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_agent_clients_updated_at
BEFORE UPDATE ON public.agent_clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add agent tracking columns to bookings
ALTER TABLE public.bookings ADD COLUMN agent_id UUID REFERENCES public.agents(id);
ALTER TABLE public.bookings ADD COLUMN agent_client_id UUID REFERENCES public.agent_clients(id);

-- Allow agents to INSERT bookings on behalf of clients
CREATE POLICY "Agents can create bookings for clients"
ON public.bookings FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'agent'::app_role)
  AND agent_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.agents a WHERE a.id = bookings.agent_id AND a.user_id = auth.uid())
);

-- Allow agents to update their own bookings
CREATE POLICY "Agents can update own bookings"
ON public.bookings FOR UPDATE
USING (
  agent_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.agents a WHERE a.id = bookings.agent_id AND a.user_id = auth.uid())
)
WITH CHECK (
  agent_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.agents a WHERE a.id = bookings.agent_id AND a.user_id = auth.uid())
);

-- Allow agents to create payments for their bookings
CREATE POLICY "Agents can create payments for own bookings"
ON public.payments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN agents a ON a.id = b.agent_id
    WHERE b.id = payments.booking_id AND a.user_id = auth.uid()
  )
);

-- Allow agents to view payments for their bookings
CREATE POLICY "Agents can view own booking payments"
ON public.payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN agents a ON a.id = b.agent_id
    WHERE b.id = payments.booking_id AND a.user_id = auth.uid()
  )
);
