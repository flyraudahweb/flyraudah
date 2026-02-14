

# Raudah Travels & Tours Ltd. — Complete Implementation Plan

## Overview
A luxury Islamic travel portal for Hajj and Umrah bookings, built incrementally across 4 phases. The platform features a stunning emerald-and-gold design system, four distinct interfaces (Public, User, Agent B2B, Admin), multi-language support (English, Hausa, Arabic with RTL, French), and real Paystack payment integration.

**Backend:** Lovable Cloud (managed Supabase)
**Payments:** Real Paystack integration
**Languages:** English, Hausa, Arabic (RTL), French from the start
**Packages:** 6 pre-seeded packages (Hajj 2026, Ramadan Premium Abuja, Ramadan Standard Abuja/Kano, Sha'ban Budget, Sha'ban Standard, Ramadan Premium Kano)

---

## Phase 1: Foundation & Public Landing Page

### Design System Setup
- Emerald green (#064E3B) + metallic gold (#D4AF37) color palette with dark mode (deep forest green #0A2818)
- Playfair Display for headings, Inter for body, Amiri for Arabic text
- Luxury component styles: gold-bordered cards with hover lift effects, gradient gold CTA buttons with shadow, emerald price badges with gold text
- Custom shadows including gold glow effects

### Internationalization (i18n)
- react-i18next configured with English (default), Hausa, Arabic, French
- Full RTL layout support when Arabic is selected (direction, flex reversal, margin/padding flips)
- Language switcher with flag icons in header
- Translation files for all UI strings (hero, packages, booking flow, navigation, forms, notifications)

### Public Landing Page
- **Sticky header** — transparent-to-solid on scroll, logo, nav links (Home, Packages, About, Contact), language switcher, Login/Sign Up buttons. Mobile: hamburger with slide-in drawer
- **Full-screen hero** — cinematic Kaaba/Madinah background with emerald gradient overlay, gold Playfair Display heading "Begin Your Spiritually Uplifting Journey", dual CTA buttons, floating search widget (filter by package type, month, budget range)
- **Featured Packages section** — all 6 packages displayed as gold-bordered cards with package image, type badge, airline info, inclusions list, price badge (₦ on emerald background), View Details and Book Now CTAs. Grid: 3 columns desktop, 2 tablet, 1 mobile
- **Why Choose Raudah** — 4-card grid: Licensed & Trusted (NAHCON/NSCIA), Luxury Experience, Expert Guides, Flexible Payment
- **Testimonials carousel** — auto-scrolling with manual controls, photo + name + package + 5-star rating + quote
- **CTA banner** — full-width emerald section with gold accents, contact info (+234 803 537 8973, flyraudah@gmail.com), WhatsApp quick chat button, large Book Now CTA
- **Footer** — 4-column layout (Quick Links, Packages, Contact with office address/phone/email, Social Media with WhatsApp), copyright with NAHCON license info
- **Mobile-first** — touch-friendly 44px minimum tap targets, swipe gestures for carousels, lazy-loaded images

### Database Foundation (Lovable Cloud)
- Authentication setup (email/password via Supabase Auth)
- Profiles table (name, phone, role, language preference)
- User roles system with RLS (public, user, agent, admin, super_admin)
- Packages table pre-seeded with all 6 packages including Islamic dates, multi-city departure options, accommodation details
- Bookings table (reference, pilgrim info, package, status, travel preferences)
- Payments table (amount, method, status, proof of payment URL, verification)
- Documents table (type, file URL, pilgrim reference)
- Agent table (business name, contact, commission rate, status)
- Storage buckets for passport photos, payment receipts, and documents

---

## Phase 2: User Portal & Booking System

### Authentication
- Registration with Nigerian phone format (+234), strong password validation (8+ chars, uppercase, number, special char), email uniqueness check
- Login with email or phone + password, show/hide password toggle, remember me, forgot password flow
- Protected routes with role-based redirects

### User Dashboard
- Sidebar navigation: Dashboard, My Bookings, Browse Packages, Payment History, Documents, Profile, Support
- Mobile: bottom tab navigation (Home, Packages, Bookings, Profile)
- Quick stats cards showing active bookings and payment status
- Current booking summary at a glance

### Package Browsing & Search
- Advanced filtering: package type (Hajj/Umrah), season (Ramadan/Sha'ban/Dhul Hijjah), price range slider, departure city, date range, airline preference, hotel rating
- Detailed package view page with all inclusions, accommodation details, travel dates (including Islamic dates where available), capacity/availability indicator

### 5-Step Booking Flow
1. **Package Selection** — choose package, view full details and availability
2. **Pilgrim Information** — full name (as per passport), passport number/expiry, DOB, gender, passport photo upload (to storage), passport data page upload, emergency contact (name, phone, relationship)
3. **Travel Preferences** — departure city selection (based on package options), date selection (for multi-date packages like Ramadan Standard with 6 date options), room preference (Single/Double/Triple/Quad), special requests/medical needs
4. **Payment Selection** — Hajj: deposit (₦2M) or full (₦7.8M); Umrah: full payment only. Methods: Paystack card payment (real integration), bank transfer (WEMA Bank 0122809772 with receipt upload), USSD
5. **Confirmation** — booking reference (RTT-2026-XXXXXX), payment status, next steps, downloadable receipt

### Payments & Installments
- Hajj installment tracking with payment timeline visualization (deposit → 3 installments → final)
- Make additional payments on existing bookings
- Payment history with downloadable receipts
- Bank transfer: upload proof, admin verification queue

### Documents Section
- View and download: booking confirmation, payment receipts, pre-departure guide
- Upload: passport copy, vaccine certificate
- Status indicators for pending documents (visa, flight tickets, hotel vouchers — populated by admin)

### WhatsApp Integration
- Floating WhatsApp button on all pages
- Pre-filled messages with booking reference for quick support
- Properly encoded URLs with encodeURIComponent

---

## Phase 3: Agent Portal (B2B)

### Agent Authentication
- Separate /agent-login page with Agent ID + password
- Agent accounts created exclusively by admin

### Agent Dashboard
- Quick stats: bookings this month, total revenue, pending bookings, commission earned
- Dynamic wholesale pricing display — crossed-out retail price with bold gold agent price
- Price calculation: Agent Price = Public Price - Admin Discount (e.g., Hajj: ₦7.8M - ₦500K = ₦7.3M)

### Agent Booking Management
- Book on behalf of clients: client info form + package selection at wholesale price
- Payment options: client pays direct or agent pre-payment
- Client bookings table: searchable/filterable by name, package, status, payment
- Individual client booking details view

### Commission Tracking
- Commission rate set per agent by admin
- Summary: total bookings value, commission rate, total earned, paid vs pending
- Request payout functionality
- Commission history

---

## Phase 4: Admin Dashboard

### Dashboard Overview
- Key metric cards with month-over-month trends: total bookings, confirmed payments, pending payments, total revenue
- Revenue line chart (monthly using Recharts)
- Package distribution pie chart (all 6 packages)
- Bookings by departure city bar chart (Abuja, Kano, Lagos)
- Recent activity feed (new bookings, payments verified, package updates, agent registrations)

### Package Management (Full CRUD)
- Create/edit/duplicate/archive packages
- Configure: name, type, category, pricing (public + agent discount), deposit settings, capacity, airlines, departure cities, travel dates (with Islamic date support), duration, accommodation (hotel name, distance, rating, room types), inclusions checklist, rich text description, images, status (Active/Draft/Archived)
- Auto-calculate agent price from public price minus discount

### Pilgrim Management
- Searchable records table with filters (package, payment status, booking status, year)
- Individual pilgrim profile: photo, passport info, booking details, payment breakdown, travel documents (view/upload), accommodation assignments, emergency contact
- Export to CSV, print capabilities

### Pilgrim ID Tag Generator
- Printable ID card (85.60 × 53.98 mm) with: company logo, pilgrim photo, QR code (booking ID + emergency contact via qrcode.react), name, booking reference, passport number, package, hotels, emergency contact, group leader info
- PDF generation via jsPDF + html2canvas
- Bulk print: select by package, filter by payment status, layout options (2 or 4 per page), generate multi-tag PDF

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
- Average booking value

### Global Settings
- Company info: name, email, phone, bank details, NAHCON/NSCIA license numbers
- Agent discount configuration: global discount amount OR per-package discounts
- Notification preferences: booking confirmations, payment receipts, travel reminders (30/7/1 day before)

---

## Cross-Cutting Concerns

### Mobile-First Design
- All interfaces fully responsive (mobile 0-639px, tablet 640-1023px, desktop 1024px+)
- Touch-optimized: 44px minimum tap targets, swipe gestures for carousels/galleries
- Mobile dashboard uses bottom tab navigation instead of sidebar
- Lazy loading for images and route-based code splitting
- CSS scroll-snap for package galleries

### Security
- Supabase Auth with RLS policies on all tables
- Role-based access control: user, agent, admin, super_admin with granular permissions
- Input validation with Zod on all forms (client-side) + RLS (server-side)
- File uploads to Lovable Cloud Storage only (never in database)
- Proper URL encoding for WhatsApp/external links

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
- jsPDF + html2canvas for: booking confirmations, payment receipts, pilgrim ID tags, travel itineraries
- Bulk PDF generation for admin (multiple ID tags per page)

