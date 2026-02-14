
-- Drop the overly permissive INSERT policy
DROP POLICY "System can insert notifications" ON public.notifications;

-- Replace with a policy that only allows authenticated users to insert their own notifications
-- (triggers use SECURITY DEFINER so they bypass RLS)
CREATE POLICY "Users can receive notifications"
ON public.notifications FOR INSERT
WITH CHECK (user_id = auth.uid());
