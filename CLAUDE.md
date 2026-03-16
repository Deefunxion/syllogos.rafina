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
| `js/store.js` | Constants (MONTHS_GR, LS_KEYS, DEFAULT_CONFIG), FileStorage (File System Access API, auto-save, IndexedDB), Store (localStorage CRUD) |
| `js/utils.js` | Utils — UUID, date/money formatting, payment logic (`memberShouldPay`, `getMemberDebt`), receipt numbering, HTML escaping |
| `js/app.js` | State, Router (`navigate`/`renderView`), Modals (`open`/`close`/`confirm`), `showToast`, `toggleSidebar` |
| `js/views.js` | Views — `dashboard()`, `memberList()`, `memberDetail(id)`, `payments()`, `reports()`, `settings()` |
| `js/forms.js` | Member and payment form handlers (`openMemberForm`, `saveMember`, `openPaymentForm`, `savePayment`, delete functions) |
| `js/actions.js` | Settings save, receipt display/print, Excel exports, file connect modal, `importBackup` |
| `js/init.js` | `init()` bootstrap, `DOMContentLoaded` listener |

**Load order matters:** `store → utils → app → views → forms → actions → init`

Event handling uses delegation on the `#app` container.

## Data Models

- **Member:** `{id, lastName, firstName, fatherName, idNumber, dateOfBirth, phone, email, category ("adult"|"child"|"honorary"), monthlyFee, status ("active"|"inactive"), child: {lastName, firstName, dateOfBirth, sport, notes}, ...}`
- **Payment:** `{id, memberId, year, month, amount, paidDate, receiptNumber, notes, createdAt}`
- **Config:** `{clubName, currentYear, categories: [{id, label, fee}]}`

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

## Reference Files

- `PLAN_sports_club_app.md` — full specification and build plan
- `CODE_REVIEW_NOTES.md` — detailed technical review with improvement proposals
- `docs/plans/2026-03-16-receipt-system-overhaul.md` — receipt system overhaul plan (16 tasks)
- `docs/plans/2026-03-16-file-split.md` — file split plan (completed)
- `syllogos_data.json` — sample/production data file
