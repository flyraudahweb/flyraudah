

# Add Fadak Logo and RC Number to Proposal

## Changes

### 1. Add Fadak Logo Image
Copy the uploaded `fadak_logo.jpg` to `src/assets/fadak-logo.jpg` and import it in `Proposal.tsx`. Replace the current green circle with "FMH" text on the cover page with the actual Fadak Media Hub logo image.

### 2. Add RC Number
Add "RC: 8426199" below the company name on the cover page, and also in the footer section at the bottom of the last page.

---

## Technical Details

### File: `src/assets/fadak-logo.jpg`
Copy from `user-uploads://fadak_logo.jpg`.

### File: `src/pages/Proposal.tsx`

**Import:**
- Add `import fadakLogo from "@/assets/fadak-logo.jpg";`

**Cover Page (lines 83-89):**
Replace the circular div with "FMH" text with an `<img>` tag using the imported logo:
```
<img src={fadakLogo} alt="Fadak Media Hub" className="h-20 mx-auto object-contain" />
```
Update the company name line to include the RC number:
```
FADAK MEDIA HUB NIGERIA LIMITED
RC: 8426199
```

**Footer (last page, bottom section):**
Add "RC: 8426199" next to the company name in the confidentiality footer.

