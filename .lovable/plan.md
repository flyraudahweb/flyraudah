
# Fix Hero Buttons, Search Widget & Footer Location

## 1. "Explore Packages" Button -- Make It Work
Currently the button has no `onClick` or link behavior. It will be wrapped to navigate to the `#packages` section on the landing page (smooth scroll).

Similarly, the "Contact Us" button will scroll to the footer contact section.

**File:** `src/components/landing/Hero.tsx`
- Add `useNavigate` or use anchor scroll for "Explore Packages" to smooth-scroll to `#packages`
- Add WhatsApp or scroll-to-footer for "Contact Us"

## 2. Make Search Widget Functional
The search widget (Package Type + Month + Search button) currently does nothing. It will be wired up to:
- Track selected type (hajj/umrah) and month (feb/mar/jun/jul) in local state
- On "Search" click, navigate to `/packages` with query parameters (e.g., `/packages?type=hajj&month=mar`)
- The `/packages` page already supports filtering, so it will read query params and pre-filter results

**File:** `src/components/landing/Hero.tsx`
- Add `useState` for `selectedType` and `selectedMonth`
- Add `useNavigate` from react-router-dom
- Wire `onChange` handlers on both `<select>` elements
- Wire `onClick` on Search button to navigate to `/packages?type=...&month=...`

**File:** `src/pages/Packages.tsx`
- Read `type` and `month` query params using `useSearchParams`
- Pre-populate filter state from URL params so results show filtered on arrival

## 3. Change Footer Location from "Abuja" to "Kano"
Simple text change in the footer contact section.

**File:** `src/components/landing/Footer.tsx`
- Change line 72: `Abuja, Nigeria` to `Kano, Nigeria`

## Technical Details

### Hero.tsx Changes
- Import `useState` from React and `useNavigate` from react-router-dom
- Add state: `const [selectedType, setSelectedType] = useState("")` and `const [selectedMonth, setSelectedMonth] = useState("")`
- "Explore Packages" button: `onClick` scrolls to `#packages` section using `document.getElementById("packages")?.scrollIntoView({ behavior: "smooth" })`
- "Contact Us" button: opens WhatsApp link (`https://wa.me/2348035378973`)
- Search button: calls `navigate(/packages?type=${selectedType}&month=${selectedMonth})`
- Both `<select>` elements get `value` and `onChange` props

### Packages.tsx Changes
- Import `useSearchParams`
- On mount, read `type` and `month` from URL and set initial filter state accordingly
- Map month abbreviations (feb, mar, jun, jul) to actual month numbers for date-based filtering

### Footer.tsx Changes
- Line 72: Replace "Abuja, Nigeria" with "Kano, Nigeria"
