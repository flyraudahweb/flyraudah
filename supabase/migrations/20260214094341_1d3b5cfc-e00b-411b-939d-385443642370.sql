
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, error
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT, -- optional link to navigate to
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (user_id = auth.uid());

-- Admins can manage all notifications (for sending)
CREATE POLICY "Admins can manage all notifications"
ON public.notifications FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role inserts (from triggers/functions)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create trigger to auto-notify on booking status change
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
END;
$$;

CREATE TRIGGER on_booking_status_change
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_booking_status_change();

-- Create trigger to notify on payment verification
CREATE OR REPLACE FUNCTION public.notify_payment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
END;
$$;

CREATE TRIGGER on_payment_status_change
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.notify_payment_status_change();
