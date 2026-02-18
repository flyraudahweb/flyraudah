
# Fix AI Proposal Generator + Gombe Template + Letter Address Block

## Problems Identified

### Problem 1 — AI Removes Content
The edge function does two things that cause data loss:
- **Hard truncates input** at 15,000 characters (`text.slice(0, 15000)`). The pasted Gombe text is ~6,000 chars but the prompt + system message overhead means the AI sees less of the actual content.
- **Overly rigid structure mapping**: The `featurePages` schema forces all prose into bullet-point feature blocks, so rich sections like "Justification of Project Costs" (with 5 strategic pillars) and "Conclusion & Call to Action" get silently dropped because they don't fit into `{ title, items[] }` arrays.
- **Fix**: Add two new optional fields to the schema — `coverLetter` (for the formal address block) and `appendixSections` (for free-prose sections like Justification and Conclusion that don't fit feature/pricing formats). Update the system prompt to be explicit that NO content should be omitted.

### Problem 2 — No Letter Address Block on Cover Page
The PDF has a formal left-aligned block:
```
Date: [date]
The Executive Governor of Gombe State, His Excellency...
Government House, Gombe...
Attention: The Honorable Commissioner for Information and Culture Sir,
```
This is a formal **letter header** that appears before the main proposal title. Currently, `ProposalData` has no field for this and `CoverPage` has no UI for it.

### Problem 3 — Gombe Template Missing Sections
The hardcoded `gombeTemplate` in `proposalTemplates.ts` is missing:
- The formal letter address block
- Section 7: Justification of Project Costs (5 detailed pillars)
- Section 8: Conclusion & Call to Action

---

## Changes Required

### 1. Update `ProposalData` interface in `src/data/proposalTemplates.ts`

Add two new optional fields:

```typescript
// Optional: formal letter address (left-aligned before proposal title on cover)
coverLetter?: {
  date?: string;
  recipient: string;        // "The Executive Governor of Gombe State..."
  address?: string;         // "Government House, Gombe..."
  attention?: string;       // "The Honorable Commissioner for Information and Culture Sir,"
  salutation?: string;      // "Sir,"
  subject?: string;         // "LETTER OF PROPOSAL: DOCUMENTING..."
  body?: string;            // The letter body paragraphs
};

// Optional: free-prose appendix sections (Justification, Conclusion, etc.)
appendixSections?: {
  title: string;
  body: string;             // Rich text, may contain \n for paragraphs
  subSections?: { heading: string; content: string }[];
}[];
```

Also update the hardcoded `gombeTemplate` to include:
- `coverLetter` block with the recipient address and attention line
- `appendixSections` with the full Justification of Costs and Conclusion content from the PDF

### 2. Update `CoverPage` component in `src/pages/Proposal.tsx`

Add an optional letter address block **before** the main title section. When `data.coverLetter` exists, render a left-aligned formal block:

```
[Left aligned, formal style]
Date: 2026

The Executive Governor of Gombe State,
His Excellency, Muhammadu Inuwa Yahaya (CON),
Government House, Gombe, Gombe State.

Attention: The Honorable Commissioner for Information and Culture Sir,

[Subject line in bold]

[Letter body paragraphs]
```

This section renders before the centered proposal title box and uses the existing letterhead.

### 3. Add `AppendixPage` component in `src/pages/Proposal.tsx`

A new page component that renders `appendixSections` — free prose sections with optional sub-headings (roman numerals like the Justification section). These render between the Pricing/Timeline page and the MOU page.

### 4. Update `supabase/functions/generate-proposal/index.ts`

Three key fixes:
- **Remove the 15,000 char truncation** — pass the full text (the model supports it)
- **Add `coverLetter` and `appendixSections` to the tool schema** so the AI knows to extract them
- **Update the system prompt** to explicitly say: *"NEVER omit any content. Justification sections, conclusions, letter bodies, and call-to-action paragraphs must go into `appendixSections`. The formal address block (Date, recipient, Attention line) goes into `coverLetter`."*

---

## Files to Modify

| File | Change |
|------|--------|
| `src/data/proposalTemplates.ts` | Add `coverLetter` and `appendixSections` fields to interface + update `gombeTemplate` with all missing content |
| `src/pages/Proposal.tsx` | Update `CoverPage` to render letter address block; add `AppendixPage` component; wire it into the page render loop |
| `supabase/functions/generate-proposal/index.ts` | Remove truncation, add new schema fields, strengthen system prompt |

---

## What Stays the Same

- FADAK letterhead (logo, RC number, company name) — always fixed
- Footer (email, website, address, copyright) — always fixed
- Team section toggle — unchanged
- PDF download & print — unchanged
- All existing templates (Raudah) — unchanged
