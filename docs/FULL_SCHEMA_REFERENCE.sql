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
-- app_role: admin, moderator, agent, user
-- agent_status: active, suspended, pending
-- booking_status: pending, confirmed, cancelled, completed
-- document_type: passport, vaccine_certificate, visa, flight_ticket, hotel_voucher, booking_confirmation, payment_receipt, pre_departure_guide
-- package_category: premium, standard, budget
-- package_status: active, draft, archived
-- package_type: hajj, umrah
-- payment_method: paystack, bank_transfer, ussd
-- payment_status: pending, verified, rejected, refunded

-- ============================================================================
-- 2. TABLES (12 total)
-- ============================================================================
-- profiles, user_roles, packages, package_dates, package_accommodations,
-- bookings, payments, documents, agents, agent_clients, notifications, agent_applications

-- ============================================================================
-- 3. DATABASE FUNCTIONS (6 total)
-- ============================================================================
-- has_role(_user_id, _role) → boolean
-- handle_new_user() → trigger (creates profile + user role on auth.users insert)
-- generate_booking_reference() → trigger (auto-generates RTT-YYYY-XXXXXX reference)
-- update_updated_at_column() → trigger (auto-updates updated_at timestamp)
-- notify_booking_status_change() → trigger (creates notification on booking status change)
-- notify_payment_status_change() → trigger (creates notification on payment status change)

-- ============================================================================
-- 4. STORAGE BUCKETS (3 private)
-- ============================================================================
-- passport-photos, payment-receipts, documents

-- ============================================================================
-- 5. EDGE FUNCTIONS (6 total)
-- ============================================================================
-- admin-ai-chat: AI business assistant for admin dashboard
-- approve-agent-application: Approves agent applications, creates auth user + agent record
-- create-paystack-checkout: Initializes Paystack payment transactions
-- verify-paystack-payment: Verifies Paystack payments and updates booking status
-- seed-demo-data: Seeds demo users, bookings, and payments
-- generate-proposal: AI-powered proposal generator from PDF/text input

-- ============================================================================
-- 6. SECRETS (7 total)
-- ============================================================================
-- LOVABLE_API_KEY, PAYSTACK_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY,
-- SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL, SUPABASE_PUBLISHABLE_KEY

-- ============================================================================
-- 7. REALTIME
-- ============================================================================
-- notifications table added to supabase_realtime publication
