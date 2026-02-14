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
- Auto-profile trigger on signup, booking reference generator (RTT-2026-XXXXXX)
- 3 storage buckets (passport-photos, payment-receipts, documents)
- 6 packages seeded with dates and accommodations

---

## Phase 2: User Portal & Booking System

### Part 1: Authentication
- Registration with full name, email, phone (+234 format), password (8+ chars, uppercase, number, special char)
- Login with email + password, show/hide toggle, forgot password flow
- Protected routes with role-based redirects
- Auth pages styled with luxury emerald/gold design

### Part 2: User Dashboard
- Sidebar navigation: Dashboard, My Bookings, Browse Packages, Payment History, Documents, Profile, Support
- Mobile: bottom tab navigation (Home, Packages, Bookings, Profile)
- Quick stats cards showing active bookings and payment status
- Current booking summary at a glance

### Part 3: Package Browsing & Detail View
- Advanced filtering: type (Hajj/Umrah), season, price range slider, departure city, date range, airline, hotel rating
- Detailed package view page with all inclusions, accommodation details, travel dates (including Islamic dates), capacity/availability indicator
- Data fetched from database (replace static data)

### Part 4: 5-Step Booking Flow
1. **Package Selection** — choose package, view full details and availability
2. **Pilgrim Information** — full name (as per passport), passport number/expiry, DOB, gender, passport photo upload, passport data page upload, emergency contact (name, phone, relationship)
3. **Travel Preferences** — departure city selection, date selection (for multi-date packages), room preference (Single/Double/Triple/Quad), special requests/medical needs
4. **Payment Selection** — Hajj: deposit (₦2M) or full (₦7.8M); Umrah: full payment only. Methods: Paystack card, bank transfer (WEMA Bank 0122809772 with receipt upload), USSD
5. **Confirmation** — booking reference (RTT-2026-XXXXXX), payment status, next steps, downloadable receipt

### Part 5: Payments & Documents
- Hajj installment tracking with payment timeline visualization (deposit → installments → final)
- Make additional payments on existing bookings
- Payment history with downloadable receipts
- Bank transfer: upload proof, admin verification queue
- Documents section: view/download booking confirmation, receipts, pre-departure guide; upload passport copy, vaccine certificate

### Part 6: WhatsApp Integration
- Pre-filled messages with booking reference for quick support
- Floating button on all portal pages

---

## Phase 3: Agent Portal (B2B)

### Agent Authentication
- Separate /agent-login page with Agent ID + password
- Agent accounts created exclusively by admin

### Agent Dashboard
- Quick stats: bookings this month, total revenue, pending bookings, commission earned
- Dynamic wholesale pricing display — crossed-out retail price with bold gold agent price
- Price calculation: Agent Price = Public Price - Admin Discount

### Agent Booking Management
- Book on behalf of clients: client info form + package selection at wholesale price
- Payment options: client pays direct or agent pre-payment
- Client bookings table: searchable/filterable by name, package, status, payment

### Commission Tracking
- Commission rate set per agent by admin
- Summary: total bookings value, commission rate, total earned, paid vs pending
- Request payout functionality, commission history

---

## Phase 4: Admin Dashboard

### Dashboard Overview
- KPI cards with month-over-month trends: total bookings, confirmed payments, pending payments, total revenue
- Revenue line chart (monthly using Recharts), package distribution pie chart, bookings by departure city bar chart
- Recent activity feed

### Package Management (Full CRUD)
- Create/edit/duplicate/archive packages
- Configure all details: pricing, deposit settings, capacity, airlines, departure cities, travel dates (with Islamic date support), accommodation, inclusions, rich text description, images, status

### Pilgrim Management
- Searchable records table with filters (package, payment status, booking status, year)
- Individual pilgrim profile: photo, passport info, booking details, payment breakdown, travel documents, accommodation assignments, emergency contact
- Export to CSV, print capabilities

### Pilgrim ID Tag Generator
- Printable ID card (85.60 × 53.98 mm): company logo, pilgrim photo, QR code (booking ID + emergency contact), name, booking reference, passport number, package, hotels, emergency contact, group leader info
- PDF generation via jsPDF + html2canvas
- Bulk print: select by package, filter by payment status, layout options (2 or 4 per page)

### Payment Management
- Verification queue: view uploaded receipt, approve/reject/request more info
- Full payment history with filters and search
- Installment tracking per pilgrim

### Agent Management
- Create agent accounts (business name, contact person, email, phone, auto-generated ID, commission rate)
- View agent performance table (bookings, revenue, commission)
- Activate/suspend agents

### Analytics
- Revenue tracking (total, monthly, by package)
- Booking metrics (total, conversion rate, by source)
- Capacity utilization per package
- Geographic distribution by departure city
- Agent performance rankings

### Global Settings
- Company info: name, email, phone, bank details, NAHCON/NSCIA license numbers
- Agent discount configuration: global discount amount OR per-package discounts
- Notification preferences: booking confirmations, payment receipts, travel reminders

---

## Cross-Cutting Concerns

### Mobile-First Design
- All interfaces fully responsive (mobile 0-639px, tablet 640-1023px, desktop 1024px+)
- Touch-optimized: 44px minimum tap targets, swipe gestures for carousels
- Mobile dashboard uses bottom tab navigation instead of sidebar
- Lazy loading for images and route-based code splitting

### Security
- Supabase Auth with RLS policies on all tables
- Role-based access control: user, agent, admin with granular permissions via user_roles table
- has_role() SECURITY DEFINER function to prevent RLS recursion
- Input validation with Zod on all forms (client-side) + RLS (server-side)
- File uploads to storage buckets only (never in database)

### Paystack Integration
- Real Paystack integration via Edge Function for secure server-side initialization
- Card payment flow: initialize transaction → redirect to Paystack → callback verification
- Webhook handling for payment confirmation
- Amount conversion to kobo (multiply by 100)
- Bank transfer as alternative with manual admin verification

### Notifications
- Toast notifications for in-app events (booking confirmed, payment received)
- Email notifications via Edge Functions (booking confirmation, payment receipt, travel reminders)

### PDF Generation
- jsPDF + html2canvas for: booking confirmations, payment receipts, pilgrim ID tags
- Bulk PDF generation for admin (multiple ID tags per page)
