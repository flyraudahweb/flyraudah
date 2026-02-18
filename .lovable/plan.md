
# Add Toggle for Team Section in Proposal

## What Changes

Add a "Show Team Section" toggle (switch) above the proposal content, next to the existing Print/Download buttons. When toggled off, the team members and their photos will be hidden from both the on-screen view and the generated PDF. The contact info (email, website, address) will still be shown.

## Technical Details

**File: `src/pages/Proposal.tsx`**

1. **New state variable**: Add `const [showTeam, setShowTeam] = useState(true);` at the top of the `Proposal` component.

2. **Toggle UI**: Add a labeled Switch component in the button bar area (near the Print/Download buttons):
   ```
   [Switch] Include Team Section
   ```

3. **Pass prop to ContactTeamPage**: Change `<ContactTeamPage />` to `<ContactTeamPage showTeam={showTeam} />`.

4. **Update `ContactTeamPage` component**: Accept a `showTeam` prop. Conditionally render the team member cards (Fatima, Abubakar, Aliyu) only when `showTeam` is `true`. The contact info block (email, website, address) and section header will always remain visible but the title will change:
   - `showTeam = true` --> "Contact & Team" (section 08)
   - `showTeam = false` --> "Contact Information" (section 08)

This keeps the letterhead, footer, and contact details intact while letting users remove team profiles for proposals where they are not needed.
