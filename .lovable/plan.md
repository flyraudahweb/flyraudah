
# Move MOU Before the Contact/Footer Page

## Change

Swap the order of `<MOUPage />` and `<ContactPage />` in the render output so the MOU appears before the footer/contact info section.

## Technical Details

### File: `src/pages/Proposal.tsx`

**Line 88-89** -- Swap the two components:

```
Before:
  <ContactPage />
  <MOUPage />

After:
  <MOUPage />
  <ContactPage />
```

This places the MOU (Section 08) right after the Pricing/Timeline page and before the final contact details and footer.
