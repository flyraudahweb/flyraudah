
## Fix Missing 'packages.viewAll' Translation Key

### Problem Identified
The "View All Packages" button in `PackagesSection.tsx` uses `t("packages.viewAll")` with a fallback to "View All Packages" hardcoded text. However, the `packages.viewAll` key is missing from all language locale files:
- `src/i18n/locales/en.json`
- `src/i18n/locales/ha.json`
- `src/i18n/locales/fr.json`
- `src/i18n/locales/ar.json`

### Solution
Add the `packages.viewAll` translation key to all four locale files with appropriate translations:

**English (en.json)**: "View All Packages"
**Hausa (ha.json)**: "Duba Duk Fakitoci" (view all packages)
**French (fr.json)**: "Voir Tous les Forfaits"
**Arabic (ar.json)**: "عرض جميع الباقات"

### Files to Modify
1. `src/i18n/locales/en.json` - Add `"viewAll": "View All Packages"` to the `packages` object
2. `src/i18n/locales/ha.json` - Add Hausa translation
3. `src/i18n/locales/fr.json` - Add French translation
4. `src/i18n/locales/ar.json` - Add Arabic translation

This will enable proper multilingual support for the button and remove the reliance on fallback text.
