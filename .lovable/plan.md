
# Fix Login Redirect + Create Printable Proposal Page

## 1. Login Redirect Fix

Testing confirmed that the admin and agent redirects are **working correctly** with the current code. The issue you're experiencing is likely caused by a **stale session cached in your browser**. When you click a demo button while already logged in as another user, the old session interferes.

**Fix:** Add a check at the top of the `onSubmit` handler to sign out any existing session before signing in with the new credentials. This ensures a clean login every time.

**File:** `src/pages/Login.tsx`
- Before calling `signIn`, call `signOut()` to clear any cached session
- Import `signOut` from `useAuth`

## 2. Printable A4 Proposal Page

Create a new page at `/proposal` with a professional, printable A4 layout for the Raudah Hajj & Umrah platform proposal from BINAH INNOVATION LTD.

### Page Structure (A4 print-optimized):

**Cover Page**
- BINAH INNOVATION LTD company header
- "Software Development Proposal"
- "Raudah Hajj & Umrah Digital Platform"
- Prepared for: The Chairman, Raudah Hajj & Umrah
- Date: February 2026

**Executive Summary**
- Problem statement: Manual booking processes, lack of transparency, no digital presence
- Solution: Full-stack digital platform for Hajj & Umrah management

**Problems Addressed**
- Manual pilgrim registration and tracking
- No online booking or payment system
- Lack of agent/B2B management tools
- No real-time analytics or reporting
- Paper-based document management

**Features & Deliverables**
- User Portal (booking wizard, payments, documents, profile, support)
- Admin Dashboard (pilgrim management, analytics, payments, packages, AI assistant)
- Agent/B2B Portal (client management, wholesale booking, commissions)
- Landing Page (package showcase, search, agent application)
- Payment Gateway Integration (Paystack)
- PWA Support (offline, installable)
- Multi-language Support (English, Arabic, French, Hausa)

**Pricing Breakdown**

| Item | Cost (NGN) |
|------|-----------|
| Backend Development | 250,000 |
| Frontend Development | 310,000 |
| Payment Gateway Integration (Paystack) | 500,000 |
| Feature Modules (Agent, User, Admin Portals) | 260,000 - 290,000 |
| Hosting, Backend Services & Email (1 Year) | 480,000 |
| Domain Registration | 50,000 |
| **Total** | **1,850,000 - 1,880,000** |

**Timeline**
- 5-7 business days for development, testing, and deployment

**Contact Information**
- Fatima Dauda Kurfi - PROJECT DIRECTOR - 09160628769
- Abubakar Lawal Abba - PROJECT LEAD - 07034681817
- Aliyu Wada Umar - PROJECT TECHNICAL DIRECTOR - 09063412927

**Print Button** at the top (hidden when printing) to trigger `window.print()`

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/Proposal.tsx` | **Create** - Full printable A4 proposal page |
| `src/App.tsx` | **Modify** - Add `/proposal` route |
| `src/pages/Login.tsx` | **Modify** - Add `signOut` before `signIn` to clear stale sessions |

### Technical Details

- The proposal page uses `@media print` CSS for clean A4 printing
- Page breaks between sections using `break-before: page`
- No navigation/header - standalone printable document
- Professional typography using existing Playfair Display + Inter fonts
- Brand colors (emerald green + gold) used throughout
