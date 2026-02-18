
# Render "Key Documentary Pillars" as a Table

## What the User Sees Now
Section 3 ("Key Documentary Pillars") renders as bullet-point blocks — one card per pillar with checklist items. The original PDF has it as a clean two-column table: **Pillar | Key Highlights to Feature**.

## What Changes (3 small, targeted edits — no big refactor)

### 1. `src/data/proposalTemplates.ts` — Add `tableView` flag to interface + Gombe template

Add one optional boolean field `tableView?: boolean` to the `featurePages` entry type. When `true`, the feature page renders as a table instead of bullet blocks.

Update the first `featurePages` entry in `gombeTemplate` (Key Documentary Pillars) to set `tableView: true`. The existing `features` array already has the right data — each feature's `title` becomes the "Pillar" column and `items.join(", ")` becomes the "Key Highlights" column.

```typescript
// In ProposalData interface
featurePages: {
  sectionTitle: string;
  subtitle?: string;
  description?: string;
  tableView?: boolean;   // NEW: render features as a 2-col table
  features: FeatureSection[];
  retainerBox?: { ... };
}[];

// In gombeTemplate, first featurePages entry:
{
  sectionTitle: "Key Documentary Pillars",
  subtitle: 'The "Story" Hubs',
  tableView: true,   // NEW
  features: [ ... ] // unchanged
}
```

### 2. `src/pages/Proposal.tsx` — Update `FeaturePage` to render a table when `tableView` is true

Inside the `FeaturePage` component, after the subtitle/description block, check `page.tableView`. If true, render a styled `<table>` with two columns instead of the `FeatureBlock` grid:

```
| Pillar                | Key Highlights to Feature                                    |
|-----------------------|--------------------------------------------------------------|
| Industrial Revolution | The 1,000-hectare Industrial Park, N60bn+ in private ...    |
| Education & Youth     | Enrolling 450,000+ out-of-school children (BESDA), ...     |
| The Health Miracle    | "1-Ward-1-PHC" project (114 centers), Go-Health ...        |
| Infrastructure        | Network 11-100 project (over 1,000km of roads), ...        |
| Civil Service Reform  | Implementation of the N70,000 minimum wage, ...            |
```

The table uses the same primary-color header style as the pricing tables (dark background, white text), alternating row shading, and the emoji from `feature.title` is preserved in the Pillar cell. The "Key Highlights" cell joins `feature.items` with `", "`.

### What Does NOT Change
- All other templates (Raudah) — untouched
- The AI edge function — untouched
- The Production Strategy, Media Distribution, and all other feature pages — still render as bullet blocks
- Team toggle, PDF download, print, MOU, all other sections — untouched
- The `FeatureBlock` component — stays, still used for all non-tableView pages

## Files to Modify

| File | Change |
|------|--------|
| `src/data/proposalTemplates.ts` | Add `tableView?: boolean` to interface; set it on Gombe's first feature page |
| `src/pages/Proposal.tsx` | Update `FeaturePage` to branch on `page.tableView` and render a `<table>` |
