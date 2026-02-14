
-- Create agent_applications table
CREATE TABLE public.agent_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  business_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (for public agent application form)
CREATE POLICY "Anyone can submit agent applications"
ON public.agent_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Admins can view all applications
CREATE POLICY "Admins can view all agent applications"
ON public.agent_applications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update applications (approve/reject)
CREATE POLICY "Admins can update agent applications"
ON public.agent_applications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own applications
CREATE POLICY "Users can view own applications"
ON public.agent_applications
FOR SELECT
USING (user_id = auth.uid());
