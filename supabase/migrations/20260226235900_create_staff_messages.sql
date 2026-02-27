-- Migration to create the staff_messages table for internal team chat

CREATE TABLE IF NOT EXISTS public.staff_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.staff_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow insert if the user is a staff member and sender_id equals auth.uid(), and receiver_id is also a staff member.
-- (Simplified for now: we rely on application logic to ensure they send to staff, but restrict by sender_id)
CREATE POLICY "staff_can_insert_messages" ON public.staff_messages
    FOR INSERT
    WITH CHECK ( auth.uid() = sender_id );

-- Policy: Allow select if the user is auth.uid() = sender_id or auth.uid() = receiver_id
CREATE POLICY "staff_can_view_own_messages" ON public.staff_messages
    FOR SELECT
    USING ( auth.uid() = sender_id OR auth.uid() = receiver_id );

-- Policy: Allow update (e.g., setting read_at) if receiver_id equals auth.uid()
CREATE POLICY "staff_can_update_read_status" ON public.staff_messages
    FOR UPDATE
    USING ( auth.uid() = receiver_id );

-- Insert into publication for real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_messages;
