
# Proposal Updates: Standard Media, Team Photos, Contact Details, and More

## Summary of All Changes

### 1. Upgrade Media Section to Standard Package (N600,000)
Replace "Basic Package" with "Standard Package" in Section 04. Add expanded services and a paragraph on why Standard is important for Raudah. Show price as N600,000/month.

**Standard Package includes:**
- Content calendar planning, scheduling, and community engagement
- Performance analytics and monthly reporting
- Professional graphics, branded templates, reels, stories, copywriting
- Promotional video production
- Professional photoshoots for branding and marketing
- Event coverage and documentation
- Digital marketing campaign execution
- Brand positioning and messaging strategy
- Target audience analysis and engagement planning

**Why Standard matters:** A short paragraph explaining that the Standard tier provides the right balance of consistent brand building, dedicated campaign execution, and measurable results needed to compete in the Hajj & Umrah market.

### 2. Adjust Platform Pricing (Total = N2,000,000)
Platform subtotal reduced to N1,400,000. Media Standard = N600,000. Grand Total = N2,000,000.

| Item | New Cost |
|------|----------|
| Backend Development (Database, Auth, APIs, Edge Functions) | N250,000 |
| Frontend Development (UI/UX, Components, Responsive Design) | N300,000 |
| Payment Gateway Integration (Paystack) | N250,000 |
| Feature Modules (Agent, User & Admin Portals) | N250,000 |
| Hosting, Backend Services & Email (1 Year) | N300,000 |
| Domain Registration | N50,000 |
| **Platform Subtotal** | **N1,400,000** |
| Media & Branding Standard | N600,000 |
| **Grand Total** | **N2,000,000** |

### 3. Change "Partnership Proposal" to "Proposal"
On the cover page, replace the text "Partnership Proposal" with just "Proposal".

### 4. Add Platform Demo Link
Add the demo link `https://raudahtravels.lovable.app` to both the cover page and the footer.

### 5. Team Photos in Contact Section
Copy the 3 uploaded team images into the project and replace the colored-circle initials with actual photos:
- Fatima Dauda Kurfi -- fatima-2.jpg
- Abubakar Lawal Abba -- abubakar-2.jpg
- Aliyu Wada Umar -- aliyu-2.jpg

### 6. Company Contact Details
Add below the team cards:
- **Email:** fadakmediacompany@gmail.com
- **Website:** www.fadakmediahub.com
- **Address:** No 15 NNPC Plaza, WTC Roundabout, Katsina, Katsina State

---

## Technical Details

### Assets to Copy
- `user-uploads://fatima-2.jpg` to `src/assets/team-fatima.jpg`
- `user-uploads://abubakar-2.jpg` to `src/assets/team-abubakar.jpg`
- `user-uploads://aliyu-2.jpg` to `src/assets/team-aliyu.jpg`

### File: `src/pages/Proposal.tsx`

**Imports:** Add 3 team image imports.

**Cover page (line 92):** Change "Partnership Proposal" to "Proposal". Add demo link below the date.

**Media section (lines 200-232):** Change "Basic" to "Standard", expand services, add importance paragraph, update price box to N600,000.

**Pricing table (lines 247-283):** Adjust platform line items to sum to N1,400,000. Update Part B to "Standard" at N600,000. Grand Total = N2,000,000.

**Contact section (lines 304-322):** Replace initials circle with `<img>` tags using team photos. Add company address/email/website block below.

**Footer (lines 324-328):** Add demo link.
