# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-file HTML + JS application for managing a Greek wrestling club's member registry and monthly subscription payments. Used by one administrator (club secretary/treasurer) to track ~150+ members. Greek UI, English code/comments.

## Tech Stack

- **No build system, no npm, no frameworks** — pure vanilla JavaScript split across 7 `.js` files
- **Storage:** File System Access API (primary, .json on disk) → localStorage fallback → IndexedDB for file handle persistence
- **Icons:** FontAwesome 7.0.0 (local at `fontawesome/`) — no emojis in UI
- **Fonts (CDN):** Google Fonts (Inter Tight, Instrument Serif, JetBrains Mono)
- **Other CDN deps:** SheetJS (xlsx) for Excel export
- Opens directly via `file://` or any HTTP server; works offline after first load

## Design System

Swiss Brutalist aesthetic: `#111` black + `#ff3b30` red accent on `#fafafa` background. No border-radius, 2px solid black borders throughout. Typography: Instrument Serif (italic) for headings, Inter Tight (uppercase, heavy weight) for body/labels, JetBrains Mono for data/monospace. All icons are FontAwesome 7 — no emojis anywhere in the codebase.

## How to Run

Double-click `syllogos.html` in Chrome/Edge. No build step required.

## Architecture

`syllogos.html` contains CSS + HTML shell. JS is split into 7 files loaded via `<script>` tags in dependency order:

| File | Contents |
|---|---|
| `js/store.js` | Constants (MONTHS_GR, PAYMENT_METHODS, INCOME/EXPENSE/ASSET_CATEGORIES, LS_KEYS, DEFAULT_CONFIG), FileStorage, Store (localStorage CRUD for members, payments, receipts, transactions, assets) |
| `js/utils.js` | Utils — UUID, date/money formatting, payment logic, receipt/member numbering, HTML escaping, `getPaymentMethodLabel` |
| `js/app.js` | State, Router (`navigate`/`renderView`), Modals, `showToast`, `toggleSidebar` |
| `js/views.js` | Views — `dashboard()`, `memberList()`, `memberDetail(id)`, `payments()`, `reports()`, `transactions()`, `assets()`, `settings()` |
| `js/forms.js` | Member, payment, transaction, and asset form handlers (CRUD for all entities) |
| `js/actions.js` | Settings save, receipt display/print, Excel exports (members, payments, receipts, transactions, assets, annual statement, GA list), file connect modal, `importBackup` |
| `js/init.js` | `init()` bootstrap, `migrateDataV2`, `migrateDataV3`, `DOMContentLoaded` listener |

**Load order matters:** `store → utils → app → views → forms → actions → init`

Event handling uses delegation on the `#app` container.

## Data Models (v3.0)

- **Member:** `{id, memberNumber, lastName, firstName, fatherName, idNumber, afm, dateOfBirth, phone, email, category, monthlyFee, status ("active"|"inactive"), departureDate, departureReason, child: {...}, ...}`
- **Payment:** `{id, receiptId, memberId, year, month, amount, paidDate, paymentMethod, notes, createdAt}`
- **Receipt:** `{id, receiptNumber, year, memberId, amount, paidDate, paymentMethod, notes, status ("active"|"cancelled"), ...}`
- **Transaction:** `{id, type ("income"|"expense"), date, amount, category, description, documentNumber, documentType, paymentMethod, relatedReceiptId, notes, status, ...}`
- **Asset:** `{id, name, description, category, purchaseDate, purchaseValue, documentNumber, location, status ("active"|"damaged"|"disposed"), disposalDate, notes, ...}`
- **Config:** `{clubName, currentYear, dataVersion: 3, lastMemberNumber, lastReceiptNumberByYear, categories: [{id, label, fee}], activeMonths}`

## Key Business Rules

- Only active members with `monthlyFee > 0` and `registrationDate ≤ payment month` owe payments
- Receipt numbers are sequential per year, ordered by `paidDate` then `createdAt`
- Dates stored as ISO (YYYY-MM-DD), displayed as dd/mm/yyyy
- Money stored as numbers, formatted via `toLocaleString('el-GR')` with EUR symbol

## Known Issues (from CODE_REVIEW_NOTES.md)

- CDN dependencies (SheetJS, Google Fonts) break true offline on first load
- Receipt number can be reused if last payment of year is deleted
- Legacy payments in JSON may lack `receiptNumber` (no migration yet)
- JSON import validation is basic and not atomic
- UTC `toISOString()` can cause date drift near midnight

## Legal Compliance Features (v3.0)

- **Member Registry:** ΑΦΜ (Tax ID), sequential member number (Αύξων Αρ. Μέλους), departure date/reason
- **Payment Method:** Cash/Bank Transfer/POS tracked on every payment and receipt
- **Income-Expense Book (Βιβλίο Εσόδων-Εξόδων):** Full transaction ledger with auto-created income from subscription payments, manual income/expense entry, year/month/type filtering
- **Asset Registry (Βιβλίο Περιουσιακών Στοιχείων):** Equipment and fixed assets tracking with CRUD, category/status filtering
- **Reports:** Annual Financial Statement (Ετήσιος Απολογισμός), Quarterly Print Report (Τριμηνιαία), General Assembly Member List Export
- **Data Migration:** v2→v3 auto-migration assigns member numbers, defaults payment methods, initializes new collections

## Reference Files

- `PLAN_sports_club_app.md` — full specification and build plan
- `CODE_REVIEW_NOTES.md` — detailed technical review with improvement proposals
- `docs/plans/2026-03-16-receipt-system-overhaul.md` — receipt system overhaul plan (16 tasks)
- `docs/plans/2026-03-16-file-split.md` — file split plan (completed)
- `docs/plans/2026-03-16-legal-compliance.md` — legal compliance plan (17 tasks, completed)
- `syllogos_data.json` — sample/production data file
