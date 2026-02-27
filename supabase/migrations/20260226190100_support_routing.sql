-- 20260226190100_support_routing.sql

-- Ensure staff_support_specialties is well-defined
CREATE TABLE IF NOT EXISTS public.staff_support_specialties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, category)
);

ALTER TABLE public.staff_support_specialties ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Enable read access for all users" ON public.staff_support_specialties
        FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all access for admins and super_admins" ON public.staff_support_specialties
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM user_roles 
                WHERE user_id = auth.uid() 
                AND role IN ('admin', 'super_admin')
            )
        );
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- Replace the support message notification trigger to be specialty-aware
CREATE OR REPLACE FUNCTION public.handle_new_support_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  ticket_owner_id UUID;
  ticket_subject TEXT;
  ticket_category TEXT;
  ticket_assigned_to UUID;
  sender_name TEXT;
  admin_user_id UUID;
  notified BOOLEAN := false;
BEGIN
  SELECT user_id, subject, category, assigned_to 
  INTO ticket_owner_id, ticket_subject, ticket_category, ticket_assigned_to 
  FROM support_tickets WHERE id = NEW.ticket_id;
  
  UPDATE support_tickets SET last_message_at = NEW.created_at, updated_at = now() WHERE id = NEW.ticket_id;
  
  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;

  IF NEW.sender_id = ticket_owner_id THEN
    -- Message from user: Notify staff
    
    IF ticket_assigned_to IS NOT NULL THEN
      -- If assigned, only notify assignee
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (ticket_assigned_to, 'New Support Message', sender_name || ' sent a message regarding: ' || ticket_subject, 'info', '/admin/support');
      notified := true;
    ELSE
      -- Notify specialists for this category
      FOR admin_user_id IN 
        SELECT user_id FROM staff_support_specialties WHERE category = ticket_category
      LOOP
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (admin_user_id, 'New Support Message (Specialty Match)', sender_name || ' sent a message regarding: ' || ticket_subject, 'info', '/admin/support');
        notified := true;
      END LOOP;
      
      -- Fallback: If no specialists, notify all admins/super_admins
      IF NOT notified THEN
        FOR admin_user_id IN 
          SELECT user_id FROM user_roles WHERE role IN ('admin', 'super_admin')
        LOOP
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (admin_user_id, 'New Support Message', sender_name || ' sent a message regarding: ' || ticket_subject, 'info', '/admin/support');
        END LOOP;
      END IF;
    END IF;
    
    UPDATE support_tickets SET unread_count_admin = unread_count_admin + 1 WHERE id = NEW.ticket_id;
  ELSE
    -- Message from staff: Notify user
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (ticket_owner_id, 'New Support Reply', 'Support has replied to your ticket: ' || ticket_subject, 'success', '/dashboard/support');
    UPDATE support_tickets SET unread_count_admin = 0 WHERE id = NEW.ticket_id;
  END IF;
  
  RETURN NEW;
END; $$;


-- Create function and trigger for initial ticket creation
CREATE OR REPLACE FUNCTION public.handle_new_support_ticket()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  sender_name TEXT;
  admin_user_id UUID;
  notified BOOLEAN := false;
BEGIN
  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.user_id;

  -- Notify specialists for this category
  FOR admin_user_id IN 
    SELECT user_id FROM staff_support_specialties WHERE category = NEW.category
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (admin_user_id, 'New Ticket (Specialty Match)', sender_name || ' opened a new ticket: ' || NEW.subject, 'info', '/admin/support');
    notified := true;
  END LOOP;
  
  -- Fallback: If no specialists, notify all admins/super_admins
  IF NOT notified THEN
    FOR admin_user_id IN 
      SELECT user_id FROM user_roles WHERE role IN ('admin', 'super_admin')
    LOOP
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (admin_user_id, 'New Support Ticket', sender_name || ' opened a new ticket: ' || NEW.subject, 'info', '/admin/support');
    END LOOP;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_ticket_created ON public.support_tickets;
CREATE TRIGGER on_ticket_created
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_support_ticket();
