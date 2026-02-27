# Raudah Travels — Prompt Engineering & Feature Implementation Guide

> [!NOTE]
> This guide is designed to help you communicate effectively with AI agents to implement new features while ensuring that existing functionalities remain intact and the system follows established architectural patterns.

---

## 🚀 The Master Implementation Prompt
*Use the prompt below when you are ready to start coding these features. It has been synthesized from your requirements and structured for maximum AI efficiency.*

```markdown
# Objective: Implement Enhanced Staff, Agent, and Support Features
Implement the following features in the Raudah Travels platform while ensuring zero regressions to existing Hajj/Umrah booking flows, RLS policies, or authentication models.

## 1. Support Ticket Routing (Smart Assignment)
- **Feature**: Automatically route support tickets to staff based on their "Specialty".
- **Logic**: When a user creates a ticket in a specific category (e.g., 'payment'), notifications should only be sent to staff members listed in the `staff_support_specialties` table for that category.
- **UI**: Update `AdminSupport.tsx` to filter or highlight tickets assigned to the logged-in staff's specialty.

## 2. Admin/Staff Pilgrim Booking (Direct Registration)
- **Feature**: Allow staff to register pilgrims directly from the Admin Portal.
- **UI**: Create `/admin/book-pilgrim` using a variant of the `BookingWizard` component.
- **Payment**: Skip the Paystack flow. Instead, add a "Direct Payment" method (Cash/Bank Transfer) where the staff manually marks the payment as 'verified' upon creation.

## 3. Agent Signup Requirements & Wallet System
- **Signup Conditions**: Add a "Terms & Conditions" section to the Agent Registration form. These conditions should be fetched from `site_settings` (key: 'agent_terms').
- **Wallet System**: 
  - Create an `agent_wallets` table to track credits.
  - Agents must deposit a balance into their wallet via a new "Top Up" feature.
  - When an agent books for a client, the package price is deducted from their wallet. 
  - Prevent booking if the wallet balance is insufficient.

## 4. Enhanced Booking Amendments
- **Feature**: Expand the `booking_amendment_requests` system.
- **Requirements**: Allow users/agents to request changes to:
  - Flight/Travel Dates.
  - Package switching (e.g., Budget to Premium).
  - Re-uploading expired or blurred documents (Passport, Visa).
- **Admin**: Staff must be able to approve/reject these specific change types in the Amendments dashboard.

## 5. Internal Staff Messaging
- **Feature**: Private staff-to-staff chat.
- **Database**: Create `staff_messages` table for sender, receiver, and content.
- **UI**: Add a "Team Chat" component accessible from the Admin Sidebar.

## 6. Printing & Documentation Enhancements (Visa/Flight)
- **Feature**: Update the Printing/ID Tag system.
- **New Fields**: Add fields to the pilgrim record and the printing template:
  - Visa Provider (Select from a managed list).
  - Flight Number, Arrival Date, Departure Date.
  - Visa Type (e.g., Tourist, Umrah, Hajj).
- **UI**: Update `AdminIdTags.tsx` and `PilgrimIdCard.tsx`.

## 7. Advanced Document Management (Bulk Download)
- **Feature**: Allow bulk downloading of passports and other documents.
- **Roles**: Agents can bulk download their own clients' docs. Admins/Staff can bulk download for everyone.
- **Filters**: Filter by payment status (Verified/Pending) before bulk downloading.
- **Super Admin**: Ability to view a specific agent's passport documents and bulk download them directly from the agent's profile.

## 8. Booking Safeguards & Legal Disclaimers
- **Passport Validation**: Enforce a minimum 7-month validity for passports (current is 6 months). Reject and notify the user if it's less.
- **Disclaimers**: Add a mandatory disclaimer/confirmation step before booking submission.
- **Agent Accountability**: Explicitly state in the agent's disclaimer that the company is not liable for hidden pilgrims or visa overstays once flights have departed.
- **Rules Page**: Create a dedicated section for agents to view all rules and liability conditions.

## 9. Real-Time Visa & Passport Tracking
- **Visa Management Dashboard**: Add a new section in Admin for tracking visa statuses (Approved/In-Progress/Rejected).
- **Notifications**: Notify agents and users immediately when a visa is approved or if it's taking longer and their passport is nearing expiry.
- **Passport Watchlist**: Real-time listing for agents showing upcoming passport expiries for their clients.

## 10. Agent Gamification & Support Rating
- **Agent Ratings**: Implement a 1-5 star rating system for agents.
- **Special Attention**: Give high-rated agents (4-5 stars) special privileges, such as premium support channels and special discounts/gifts.
- **Visa Support Pop-ups**: If a user's passport upload/info fails repeatedly, trigger a "Visa Support" pop-up to offer immediate assistance.
- **Tracking**: Track ratings and performance metrics in the Admin dashboard.
```

---

## 🛠️ How to Improve Your Own Prompts (Guide)
To ensure that "implementing new features current functionalities are not broken or lost," follow these 5 rules when writing prompts for AI agents:

### 1. Reference the "Memory" Files
Always tell the AI: *"Reference `memory/PROJECT_INDEX.md` and `memory/CHANGELOG.md` before starting."* 
This ensures the AI knows the current state of User Roles, Routes, and Database Schema.

### 2. Explicitly State "Non-Breaking"
Include a "Regressions Lock" statement in every prompt:
> *"Do not modify existing RLS policies or authentication hooks unless absolutely necessary. If a change is required, justify it first."*

### 3. Use the "Database First" Rule
When adding features like your "Agent Wallet," describe the intended schema before the UI:
- **Wrong**: *"Make a wallet page for agents."*
- **Right**: *"Create an `agent_wallets` table with a `balance` column, and then build a UI to display this."*

### 4. Component Reusability
Encourage the AI to use existing components to maintain UI consistency:
> *"Use the existing `DashboardCard` and `StatusBadge` components from `@/components/ui` to build the new feature."*

### 5. Structured Feature Breakdown
Break your request into logical chunks based on the app's structure:
- **Database**: (Tables, Enums, Functions)
- **Backend**: (Edge Functions, RLS)
- **Frontend**: (Pages, Components, Contexts)

---

## 📌 Maintenance Checklist for NEW Features
When you add a new feature, make sure the AI updates these files:
- [ ] **`supabase/migrations`**: New SQL migration file.
- [ ] **`src/integrations/supabase/types.ts`**: Run `npx supabase gen types` (or ask the AI to update it).
- [ ] **`memory/PROJECT_INDEX.md`**: Update the "Database Schema" and "Route Map" sections.
- [ ] **`memory/CHANGELOG.md`**: Add a new entry summarizing the feature.

*By following this workflow, Raudah Travels will remain stable and scalable as you add more complex business logic.*
