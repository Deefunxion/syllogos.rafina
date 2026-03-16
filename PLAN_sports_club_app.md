# 🏛️ Σχέδιο Εφαρμογής: Μητρώο Αθλητικού Συλλόγου
## Comprehensive Build Plan for Claude Code

---

## 1. PROJECT OVERVIEW

**What we're building:** A single `.html` file application (zero install, zero internet) that manages a sports club's member registry and monthly subscription payment tracking.

**How it runs:** Double-click the `.html` file → opens in Chrome/Firefox → works fully offline. All data is stored in the browser's `localStorage` (persists between sessions on the same machine).

**Users:** Single administrator (the club secretary/treasurer).

**Scale:** 150+ members (parent + child pairs).

---

## 2. TECH STACK

- **Single file:** `syllógos.html` — HTML + CSS + Vanilla JavaScript all in one file
- **No frameworks, no dependencies, no npm** — pure browser APIs only
- **Storage:** `localStorage` (browser built-in, no database needed)
- **Export:** SheetJS (loaded from CDN for Excel export) + browser Print API for PDF
- **Fonts:** Load from Google Fonts (graceful fallback if offline)
- **Icons:** Unicode symbols + CSS-drawn icons (no icon library dependency)

> ⚠️ **CDN note for Claude Code:** SheetJS and Google Fonts require internet the FIRST time. After that, everything works offline. Consider embedding SheetJS inline as a fallback.

---

## 3. FILE STRUCTURE

Since this is a single `.html` file, the internal structure is:

```
syllógos.html
├── <head>
│   ├── Meta tags, title
│   ├── Google Fonts link
│   └── <style> — ALL CSS here
└── <body>
    ├── #app-shell (sidebar + main content area)
    ├── Modals (member form, payment form, confirm dialog)
    └── <script> — ALL JavaScript here
        ├── CONFIG — app settings, category definitions
        ├── STORE — localStorage read/write layer
        ├── DATA — in-memory state
        ├── ROUTER — which view is active
        ├── VIEWS — render functions for each screen
        └── EVENTS — user interaction handlers
```

---

## 4. DATA MODELS

### 4.1 Member (Γονιός-Μέλος)

```javascript
{
  id: "uuid-v4",                    // auto-generated unique ID
  // Personal info
  lastName: "",                     // Επώνυμο
  firstName: "",                    // Όνομα
  fatherName: "",                   // Πατρώνυμο (optional)
  idNumber: "",                     // Αριθμός Ταυτότητας
  dateOfBirth: "",                  // Ημ. Γέννησης (YYYY-MM-DD)
  address: "",                      // Διεύθυνση
  phone: "",                        // Τηλέφωνο
  email: "",                        // Email
  profession: "",                   // Επάγγελμα
  registrationDate: "",             // Ημ. Εγγραφής (YYYY-MM-DD)
  // Classification
  category: "adult",               // "adult" | "child" | "honorary" | "custom"
  monthlyFee: 0,                    // €/μήνα (auto-filled from category, editable)
  status: "active",                 // "active" | "inactive"
  notes: "",                        // Σημειώσεις ελεύθερου κειμένου
  // Child link
  child: {
    lastName: "",
    firstName: "",
    dateOfBirth: "",                // Ημ. Γέννησης παιδιού
    sport: "",                      // Άθλημα / Τμήμα
    notes: ""
  },
  // Metadata
  createdAt: "ISO timestamp",
  updatedAt: "ISO timestamp"
}
```

### 4.2 Payment Record (Πληρωμή)

```javascript
{
  id: "uuid-v4",
  memberId: "uuid-v4",              // Foreign key → Member
  year: 2025,                       // Έτος
  month: 3,                         // Μήνας (1–12)
  amount: 25.00,                    // Ποσό που πληρώθηκε (€)
  paidDate: "YYYY-MM-DD",          // Ημ. πληρωμής
  notes: "",                        // π.χ. "Μερική πληρωμή"
  createdAt: "ISO timestamp"
}
```

> **Design note:** One payment record = one month for one member. A member paying 3 months at once = 3 separate records. This gives granular historical tracking.

### 4.3 App Config (Ρυθμίσεις)

```javascript
{
  clubName: "Αθλητικός Σύλλογος",
  currentYear: 2025,               // Default year shown in payment views
  categories: [
    { id: "adult",    label: "Ενήλικας",      fee: 25 },
    { id: "child",    label: "Παιδί",          fee: 15 },
    { id: "honorary", label: "Επίτιμο Μέλος",  fee: 0  }
  ]
  // User can add/edit categories from Settings
}
```

### 4.4 LocalStorage Keys

```
syllógos_members    → JSON array of Member objects
syllógos_payments   → JSON array of Payment objects
syllógos_config     → JSON object of App Config
```

---

## 5. APPLICATION VIEWS (Screens)

### Screen 1: Dashboard (Αρχική)

**Purpose:** Quick overview of the club's current state.

**Shows:**
- Total active members count
- Members with unpaid months in current month (count + alert badge)
- Total collected this month (€)
- Total collected this year (€)
- Quick-action buttons: "+ Νέο Μέλος", "Καταχώρηση Πληρωμής"
- Mini-list: Last 5 payment entries (who paid, when, amount)

---

### Screen 2: Μέλη (Member Registry)

**Purpose:** Browse, search, add, edit, delete members.

**Layout:**
- Top bar: Search input (searches name, child name, ID number) + Filter dropdown (Όλα / Ενεργά / Ανενεργά / by category) + "+ Νέο Μέλος" button
- Member list: Table or card grid showing:
  - Α/Α (sequential number), Full name (Γονιός), Child name, Category, Monthly fee, Status badge, Action buttons (Προβολή, Επεξεργασία, Διαγραφή)
- Clicking a member opens Member Detail View (see Screen 3)

**Member Form (Modal):**
- Tab 1: "Γονιός" — all member fields
- Tab 2: "Αθλούμενος" — child fields
- Validation: required fields highlighted, phone format check, date format check
- Category selection auto-fills monthlyFee (but user can override)

---

### Screen 3: Καρτέλα Μέλους (Member Detail)

**Purpose:** Full profile of one member + payment history.

**Layout:**
- Left column: Member info card (all fields, "Επεξεργασία" button)
- Right column: Child info card
- Bottom: Payment grid (see below) + Payment history table

**Payment Grid:**
- Year selector (dropdown: 2020–2030+)
- 12 month buttons in a row: ΙΑΝ | ΦΕΒ | ΜΑΡ | ΑΠΡ | ΜΑΙ | ΙΟΥ | ΙΟΥ | ΑΥΓ | ΣΕΠ | ΟΚΤ | ΝΟΕ | ΔΕΚ
  - 🟢 Green = paid (shows amount on hover)
  - 🔴 Red = unpaid
  - Clicking unpaid month → opens quick payment modal
  - Clicking paid month → shows payment details + option to delete
- Below grid: "Ιστορικό Πληρωμών" table (date, month, year, amount, notes, delete button)

---

### Screen 4: Πληρωμές (Payments Overview)

**Purpose:** Log payments and see monthly/yearly summaries.

**Sub-views (tabs):**

**Tab A: Καταχώρηση Πληρωμής**
- Search/select member → shows their name + child name + current debt
- Select year + month(s) — checkboxes for multiple months
- Enter amount + date + notes
- Submit → creates payment records

**Tab B: Μηνιαία Εικόνα**
- Month/Year selector
- Table: all members with their status for that month (paid ✓ / unpaid ✗ / inactive -)
- Summary: total collected, total expected, difference
- "Οφειλέτες μήνα" highlighted section

**Tab C: Ετήσια Εικόνα**
- Year selector
- Per-member row with 12 month columns (paid/unpaid grid for all members)
- Row totals + column totals
- Exportable to Excel

---

### Screen 5: Αναφορές (Reports)

**Purpose:** Ready-made reports for decision-making.

**Report 1: Οφειλέτες**
- Shows all active members who have ≥1 unpaid month in selected year
- Columns: Όνομα, Παιδί, Μήνες που χρωστά, Συνολικό ποσό οφειλής
- Sortable by: name / amount owed / months owed
- Export to PDF + Excel

**Report 2: Εισπράξεις ανά Μήνα**
- Bar chart (CSS-only) + table
- Selected year: Jan–Dec, total collected each month
- Export to Excel

**Report 3: Εισπράξεις ανά Έτος**
- Table: year by year totals (all years with data)
- Export to Excel

**Report 4: Ιστορικό Μέλους**
- Search member → full payment history across all years
- Formatted for printing (Print button)

---

### Screen 6: Ρυθμίσεις (Settings)

**Purpose:** Configure the app, manage data.

**Sections:**

**Γενικά:**
- Club name (shown in header + exports)
- Default year

**Κατηγορίες & Εισφορές:**
- Table of categories with editable fee amounts
- Add new category / delete category
- Note: changing a fee does NOT retroactively change paid amounts

**Backup & Restore:**
- "💾 Αποθήκευση Αντιγράφου" → downloads a `.json` file with ALL data (members + payments + config)
- "📂 Επαναφορά από Αρχείο" → file picker → imports `.json` → replaces all data (with confirmation dialog)
- ⚠️ Warning: "Η επαναφορά θα αντικαταστήσει ΟΛΑ τα υπάρχοντα δεδομένα"

**Εξαγωγή:**
- Export all members to Excel
- Export all payments to Excel

---

## 6. UI/UX DESIGN DIRECTION

**Aesthetic:** Clean administrative / institutional — this is a tool for a Greek sports club administrator. It must feel trustworthy, legible, and efficient. NOT flashy. Think: refined utility.

**Color palette:**
```css
--primary:       #1a3a5c;   /* Deep navy blue — authority */
--primary-light: #2563a8;   /* Mid blue — interactive */
--accent:        #e8b84b;   /* Gold/amber — Greek club energy */
--success:       #2d7a4f;   /* Paid / active */
--danger:        #c0392b;   /* Unpaid / inactive / delete */
--warning:       #d68910;   /* Partial / attention */
--bg:            #f4f6f9;   /* Light grey background */
--surface:       #ffffff;   /* Card/panel background */
--border:        #dde1e7;   /* Subtle borders */
--text:          #1a2332;   /* Primary text */
--text-muted:    #6b7a8d;   /* Secondary text */
```

**Typography:**
```css
--font-display: 'Playfair Display', serif;   /* Headers, club name */
--font-body:    'IBM Plex Sans', sans-serif; /* All UI text */
--font-mono:    'IBM Plex Mono', monospace;  /* Numbers, amounts */
```

**Layout:**
- Left sidebar (220px, dark navy): Navigation links with icons
- Main content area: scrollable, padded
- Modals: centered overlay with backdrop blur
- Responsive: sidebar collapses to top bar on narrow screens

**Key UI decisions:**
- Payment grid months: large clickable tiles, color-coded green/red
- Member list: table (not cards) — easier to scan 150+ names
- All money values: right-aligned monospace, always show € symbol
- Dates: Greek format (dd/mm/yyyy) for display, ISO for storage
- Confirmation dialogs for all destructive actions (delete, restore)

---

## 7. JAVASCRIPT ARCHITECTURE

```javascript
// ─── CONFIG ───────────────────────────────────────────
const CONFIG = { ... }  // Default settings

// ─── STORE (localStorage layer) ───────────────────────
const Store = {
  getMembers()    → Member[]
  saveMembers()   → void
  getPayments()   → Payment[]
  savePayments()  → void
  getConfig()     → Config
  saveConfig()    → void
  exportBackup()  → downloads JSON file
  importBackup()  → reads JSON file, replaces data
}

// ─── UTILS ────────────────────────────────────────────
const Utils = {
  generateId()         → uuid string
  formatDate()         → "dd/mm/yyyy"
  formatMoney()        → "25,00 €"
  getMemberFullName()  → "Παπαδόπουλος Γιώργος"
  getMonthName()       → "Ιανουάριος"
  getMemberDebt()      → { months: [], totalAmount: number }
}

// ─── STATE ────────────────────────────────────────────
const State = {
  currentView: 'dashboard',
  currentMemberId: null,
  currentYear: 2025,
  currentMonth: (current month),
  searchQuery: '',
  filterStatus: 'all'
}

// ─── ROUTER ───────────────────────────────────────────
function navigate(view, params) { ... }
// Updates State, re-renders main content

// ─── VIEWS (render functions) ──────────────────────────
const Views = {
  dashboard()       → HTML string
  memberList()      → HTML string
  memberDetail(id)  → HTML string
  payments()        → HTML string
  reports()         → HTML string
  settings()        → HTML string
}

// ─── MODALS ───────────────────────────────────────────
const Modals = {
  openMemberForm(memberId | null)   // null = new member
  openPaymentForm(memberId, month, year)
  openConfirm(message, onConfirm)
  close()
}

// ─── EVENTS ───────────────────────────────────────────
// All event listeners attached via event delegation on #app
document.getElementById('app').addEventListener('click', handleClick)
document.getElementById('app').addEventListener('change', handleChange)
document.getElementById('app').addEventListener('input', handleInput)

// ─── EXPORT ───────────────────────────────────────────
const Export = {
  toExcel(data, filename)    // Uses SheetJS
  toPDF(elementId)           // Uses window.print() with print CSS
}

// ─── INIT ─────────────────────────────────────────────
function init() {
  // Load data from localStorage
  // Set current year/month
  // Render sidebar
  // Navigate to dashboard
}

window.addEventListener('DOMContentLoaded', init)
```

---

## 8. KEY BUSINESS LOGIC

### 8.1 Calculating Member Debt

```
For a given member + year:
  expectedMonths = all months from registrationDate (or Jan, whichever is later) to today
  paidMonths = payment records for that member + year (one record per month)
  debtMonths = expectedMonths - paidMonths
  debtAmount = debtMonths.length × member.monthlyFee
```

### 8.2 Monthly Report Totals

```
For a given month + year:
  collected = SUM of all payment.amount where payment.month == month AND payment.year == year
  expected  = SUM of monthlyFee for all active members who should pay that month
  delta     = expected - collected
```

### 8.3 Member Status "should pay this month"

A member **should pay** a given month if:
- `status === "active"` AND
- `registrationDate <= first day of that month` AND
- `monthlyFee > 0` (honorary members with fee=0 are excluded)

### 8.4 Payment Entry (multiple months)

When user logs a payment for months [Jan, Feb, Mar]:
- Create 3 separate Payment records, each with `amount = totalPaid / 3`
- OR ask user to split manually (simpler: just create one record per month with the same amount)
- Recommended: create one payment record and let user specify which month it covers (one at a time)

---

## 9. EXPORT SPECIFICATIONS

### Excel Export (via SheetJS)

**Members sheet columns:**
A/A | Επώνυμο | Όνομα | Κατηγορία | Τηλέφωνο | Email | Ημ.Εγγραφής | Κατάσταση | Παιδί (Όνομα) | Παιδί (Άθλημα)

**Payments sheet columns:**
Ημ.Πληρωμής | Επώνυμο | Όνομα | Έτος | Μήνας | Ποσό (€) | Σημειώσεις

**Annual grid sheet:**
Rows = members, Columns = Jan–Dec + Total, Values = ✓ or €amount or ✗

### PDF Export (via Print CSS)

```css
@media print {
  #sidebar, .no-print { display: none; }
  body { font-size: 11pt; }
  table { border-collapse: collapse; }
  /* etc. */
}
```

---

## 10. IMPLEMENTATION PHASES (for Claude Code)

### Phase 1 — Foundation
- [ ] HTML shell: sidebar + main area + modal container
- [ ] CSS: full design system (variables, typography, layout, components)
- [ ] Store: localStorage read/write for members, payments, config
- [ ] Utils: all helper functions
- [ ] Router: navigate() + basic view switching

### Phase 2 — Members Module
- [ ] Member list view (table with search + filter)
- [ ] Member form modal (add + edit, with child tab)
- [ ] Member detail view (info cards)
- [ ] Delete member (with confirmation)

### Phase 3 — Payments Module
- [ ] Payment grid (12-month visual per member)
- [ ] Payment entry modal
- [ ] Payment deletion
- [ ] Payments overview tab (monthly status table)

### Phase 4 — Reports Module
- [ ] Debtors report
- [ ] Monthly collections report
- [ ] Annual collections report
- [ ] Member payment history

### Phase 5 — Export & Settings
- [ ] Excel export (SheetJS)
- [ ] PDF/Print export
- [ ] Settings screen (categories, club name)
- [ ] Backup (download JSON) + Restore (upload JSON)

### Phase 6 — Polish
- [ ] Dashboard with live stats
- [ ] Empty states (no members yet, no payments yet)
- [ ] Form validation + error messages in Greek
- [ ] Keyboard shortcuts (Escape to close modal, etc.)
- [ ] Loading states for large data sets

---

## 11. IMPORTANT NOTES FOR CLAUDE CODE

1. **Language:** ALL UI text must be in Greek. Variable names and code comments can be in English.

2. **Date handling:** Store all dates as `YYYY-MM-DD` strings (ISO). Display as `dd/mm/yyyy` (Greek format). Never use `new Date()` for display without formatting.

3. **Money:** Store as plain numbers (e.g., `25.5`). Always display with `toLocaleString('el-GR', { style: 'currency', currency: 'EUR' })`.

4. **IDs:** Use `crypto.randomUUID()` — available in all modern browsers.

5. **localStorage limits:** ~5MB. With 200 members and 5 years of monthly payments = ~200 × 60 = 12,000 payment records. Each ~200 bytes = ~2.4MB. Safe, but add a size warning in Settings if nearing 4MB.

6. **No frameworks:** Do NOT use React, Vue, Angular, etc. Pure vanilla JS only.

7. **Single file rule:** Everything must live in `syllógos.html`. No separate `.css` or `.js` files.

8. **SheetJS CDN:** `<script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>` — load in `<head>`. Wrap Excel export functions in a check: `if (typeof XLSX === 'undefined') { alert('Απαιτείται σύνδεση στο internet για την πρώτη φόρτωση'); return; }`

9. **Accessibility:** All form inputs must have `<label>`. Color is not the only indicator of paid/unpaid (add text or icon too).

10. **Greek month names:**
```javascript
const MONTHS_GR = ['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος',
                   'Μάιος','Ιούνιος','Ιούλιος','Αύγουστος',
                   'Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος'];
const MONTHS_SHORT = ['ΙΑΝ','ΦΕΒ','ΜΑΡ','ΑΠΡ','ΜΑΙ','ΙΟΥΝ',
                      'ΙΟΥΛ','ΑΥΓ','ΣΕΠ','ΟΚΤ','ΝΟΕ','ΔΕΚ'];
```

---

## 12. STARTER PROMPT FOR CLAUDE CODE

Use this to start the build session:

```
I need you to build a single-file HTML application for a Greek sports club 
member registry and payment tracking system. 

Please read the file PLAN_sports_club_app.md in this directory first — 
it contains the complete specification.

Start with Phase 1 (Foundation): build the HTML shell, complete CSS design system, 
localStorage Store layer, utility functions, and router. 

Do not start Phase 2 until Phase 1 is complete and reviewed.

Output a single file: syllógos.html
```

---

*Plan generated: March 2026*
*Ready for implementation in VS Code + Claude Code*
