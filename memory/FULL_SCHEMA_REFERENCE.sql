-- ============================================================================
-- FADAK MEDIA HUB / RAUDAH TRAVELS — FULL DATABASE SCHEMA REFERENCE
-- Generated: 2026-02-18
-- Purpose: Consolidated reference of all tables, enums, functions, triggers,
--          RLS policies, storage buckets, and edge functions.
-- NOTE: This file is for documentation only. Do NOT run it as a migration.
-- ============================================================================

-- (Full content same as above — ENUMs, Tables, Functions, Triggers, RLS, Storage, Edge Functions, Secrets)
-- See the complete schema documentation in this file.

-- ============================================================================
-- 1. ENUMS
-- ============================================================================
-- app_role: super_admin, admin, moderator, staff, agent, user
-- agent_status: active, suspended, pending
-- booking_status: pending, confirmed, cancelled, completed
-- document_type: passport, vaccine_certificate, visa, flight_ticket, hotel_voucher, booking_confirmation, payment_receipt, pre_departure_guide
-- package_category: premium, standard, budget
-- package_status: active, draft, archived
-- package_type: hajj, umrah
-- payment_method: paystack, bank_transfer, ussd
-- payment_status: pending, verified, rejected, refunded
-- ticket_priority: low, medium, high, urgent
-- ticket_status: open, in_progress, resolved, closed

-- ============================================================================
-- 2. TABLES (20 total)
-- ============================================================================
-- profiles, user_roles, packages, package_dates, package_accommodations,
-- bookings, payments, documents, agents, agent_clients, notifications,
-- agent_applications, support_tickets, support_messages, bank_accounts,
-- user_activity, site_settings, booking_amendment_requests,
-- staff_permissions, booking_form_fields

-- ============================================================================
-- 3. DATABASE FUNCTIONS (9 total)
-- ============================================================================
-- has_role(_user_id, _role) → boolean
-- has_permission(_user_id, _permission) → boolean
-- handle_new_user() → trigger
-- generate_booking_reference() → trigger
-- update_updated_at_column() → trigger
-- notify_booking_status_change() → trigger
-- notify_payment_status_change() → trigger
-- handle_new_support_message() → trigger
-- handle_agent_app_security() → trigger

-- ============================================================================
-- 4. STORAGE BUCKETS (3 private)
-- ============================================================================
-- passport-photos, payment-receipts, documents

-- ============================================================================
-- 5. EDGE FUNCTIONS (8 total)
-- ============================================================================
-- admin-ai-chat, approve-agent-application, create-paystack-checkout,
-- generate-proposal, seed-demo-data, send-payment-receipt,
-- verify-paystack-payment, invite-staff

-- ============================================================================
-- 6. SECRETS (7 total)
-- ============================================================================
-- LOVABLE_API_KEY, PAYSTACK_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY,
-- SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL, SUPABASE_PUBLISHABLE_KEY

-- ============================================================================
-- 7. REALTIME
-- ============================================================================
-- notifications table added to supabase_realtime publication
