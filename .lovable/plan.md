# Raudah Travels & Tours Ltd. — Complete Implementation Plan

## Overview
A luxury Islamic travel portal for Hajj and Umrah bookings, built incrementally across 4 phases. The platform features a stunning emerald-and-gold design system, four distinct interfaces (Public, User, Agent B2B, Admin), multi-language support (English, Hausa, Arabic with RTL, French), and real Paystack payment integration.

**Backend:** Lovable Cloud (managed Supabase)
**Payments:** Real Paystack integration
**Languages:** English, Hausa, Arabic (RTL), French from the start
**Packages:** 6 pre-seeded packages (Hajj 2026, Ramadan Premium Abuja, Ramadan Standard Abuja/Kano, Sha'ban Budget, Sha'ban Standard, Ramadan Premium Kano)

---

## Phase 1: Foundation & Public Landing Page ✅

### Design System Setup ✅
- Emerald green (#064E3B) + metallic gold (#D4AF37) color palette with dark mode
- Playfair Display for headings, Inter for body, Amiri for Arabic text
- Luxury component styles with gold-bordered cards, gradient CTAs, emerald price badges

### Internationalization (i18n) ✅
- react-i18next with English, Hausa, Arabic (RTL), French
- Full RTL layout support, language switcher with flags

### Public Landing Page ✅
- Sticky header, full-screen hero, 6 package cards, Why Choose section, testimonials, CTA banner, footer, WhatsApp float

### Database Foundation (Lovable Cloud) ✅
- 9 enums, 9 tables with RLS, has_role() security definer function
- Auto-profile trigger on signup, booking reference generator
- 3 storage buckets (passport-photos, payment-receipts, documents)
- 6 packages seeded with dates and accommodations

---

## Phase 2: User Portal & Booking System

### Authentication
- Registration with Nigerian phone format (+234), strong password validation
- Login with email/password, forgot password flow
- Protected routes with role-based redirects

### User Dashboard
- Sidebar navigation: Dashboard, My Bookings, Browse Packages, Payment History, Documents, Profile, Support
- Mobile: bottom tab navigation
- Quick stats cards, current booking summary

### Package Browsing & Search
- Advanced filtering: type, season, price range, departure city, date, airline, hotel rating
- Detailed package view with all inclusions, accommodations, dates, availability

### 5-Step Booking Flow
1. Package Selection
2. Pilgrim Information (passport, photo upload, emergency contact)
3. Travel Preferences (departure city, date, room, special requests)
4. Payment Selection (Paystack card, bank transfer with receipt upload, USSD)
5. Confirmation (reference, status, receipt download)

### Payments & Installments
- Hajj installment tracking with timeline visualization
- Additional payments on existing bookings
- Payment history with downloadable receipts

### Documents Section
- View/download booking confirmation, receipts, pre-departure guide
- Upload passport copy, vaccine certificate

### WhatsApp Integration
- Pre-filled messages with booking reference

---

## Phase 3: Agent Portal (B2B)

### Agent Authentication
- Separate /agent-login with Agent ID + password
- Agent accounts created by admin only

### Agent Dashboard
- Stats: bookings, revenue, pending, commission earned
- Wholesale pricing: crossed-out retail with bold agent price
- Agent Price = Public Price - Admin Discount

### Agent Booking Management
- Book on behalf of clients at wholesale price
- Client bookings table with search/filter

### Commission Tracking
- Per-agent commission rate, summary, payout requests, history

---

## Phase 4: Admin Dashboard

### Dashboard Overview
- KPI cards with trends, revenue chart, package distribution, bookings by city, activity feed

### Package Management (Full CRUD)
- Create/edit/duplicate/archive packages with all details

### Pilgrim Management
- Searchable records, individual profiles, export to CSV

### Pilgrim ID Tag Generator
- Printable ID cards (85.60 × 53.98mm) with QR code, bulk print PDF

### Payment Management
- Verification queue, payment history, installment tracking

### Agent Management
- Create/activate/suspend agents, performance table

### Analytics
- Revenue, booking metrics, capacity utilization, geographic distribution, agent rankings

### Global Settings
- Company info, bank details, agent discounts, notification preferences
