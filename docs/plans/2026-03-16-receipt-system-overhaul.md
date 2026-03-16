# Receipt System Overhaul & Code Review Fixes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Overhaul the payment/receipt data model to match physical receipt books, add active month logic (Sep-Jun), and fix all issues from CODE_REVIEW_NOTES.md.

**Architecture:** Add a `Receipt` entity alongside existing `Payment` records. Receipt = the transaction (one physical receipt slip), Payment = the monthly installment covered. Store a monotonically-increasing receipt counter in config. Replace hard-delete with soft-delete (cancel). Update all views, exports, and import/validation logic.

**Tech Stack:** Multi-file vanilla JS app (7 JS files + `syllógos.html` shell). No build system, no tests, no npm.

---

## Task 1: Add Receipt Counter & Store Methods

**Files:**
- Modify: `js/store.js` (Store object)
- Modify: `js/store.js` (DEFAULT_CONFIG)

**Step 1: Add `receipts` to the Store object and update DEFAULT_CONFIG**

In `DEFAULT_CONFIG` (in `js/store.js`), add the new config fields:

```javascript
const DEFAULT_CONFIG = {
  clubName: 'ΠΑΛΑΙΣΤΙΚΟΣ ΠΟΛ. ΣΥΛΛΟΓΟΣ ΡΑΦΗΝΑΣ ΚΑΙ ΠΕΡΙΧΩΡΩΝ',
  currentYear: new Date().getFullYear(),
  activeMonths: [9, 10, 11, 12, 1, 2, 3, 4, 5, 6],
  lastReceiptNumberByYear: {},
  dataVersion: 2,
  categories: [
    { id: 'adult',    label: 'Ενήλικας',      fee: 25 },
    { id: 'child',    label: 'Παιδί',          fee: 15 },
    { id: 'honorary', label: 'Επίτιμο Μέλος',  fee: 0  }
  ]
};
```

In the `Store` object (in `js/store.js`), add receipt methods:

```javascript
getReceipts() {
  try {
    return JSON.parse(localStorage.getItem('syllógos_receipts')) || [];
  } catch { return []; }
},
saveReceipts(receipts) {
  localStorage.setItem('syllógos_receipts', JSON.stringify(receipts));
  FileStorage.scheduleAutoSave();
},
```

**Step 2: Add `LS_RECEIPTS` constant**

After the existing LS constants (in `js/store.js`):

```javascript
const LS_RECEIPTS = 'syllógos_receipts';
```

And update `getReceipts`/`saveReceipts` to use it.

**Step 3: Update `Store.getStorageSize()` to include receipts**

```javascript
getStorageSize() {
  let total = 0;
  for (let key of [LS_MEMBERS, LS_PAYMENTS, LS_RECEIPTS, LS_CONFIG]) {
    const item = localStorage.getItem(key);
    if (item) total += item.length * 2;
  }
  return total;
},
```

**Step 4: Update `FileStorage._performAutoSave()` to include receipts in saved data**

In `_performAutoSave` (in `js/store.js`):

```javascript
const data = {
  version: '2.0',
  lastSaved: new Date().toISOString(),
  members: Store.getMembers(),
  payments: Store.getPayments(),
  receipts: Store.getReceipts(),
  config: Store.getConfig()
};
```

Also update `createNewFile()` initial data (in `js/store.js`) to include `receipts: []`.

**Step 5: Update `FileStorage._readFromFile()` to read receipts**

In `_readFromFile` (in `js/store.js`), after syncing members and payments to localStorage:

```javascript
localStorage.setItem(LS_RECEIPTS, JSON.stringify(data.receipts || []));
```

**Step 6: Update `Store.exportBackup()` to include receipts**

```javascript
exportBackup() {
  const data = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    members: this.getMembers(),
    payments: this.getPayments(),
    receipts: this.getReceipts(),
    config: this.getConfig()
  };
  // ... rest stays the same
}
```

**Step 7: Commit**

```
feat: add Receipt storage layer and config fields (activeMonths, lastReceiptNumberByYear, dataVersion)
```

---

## Task 2: Update Utils — Receipt Number, Active Months, Date Formatting

**Files:**
- Modify: `js/utils.js` (Utils object)

**Step 1: Replace `getReceiptNumber` and `getNextReceiptNumber` with receipt-aware versions**

Remove the old `getReceiptNumber(payment)` and `getNextReceiptNumber(year)` functions (in `js/utils.js`). Replace with:

```javascript
// Get the next receipt number for a year (monotonically increasing)
getNextReceiptNumber(year) {
  const config = Store.getConfig();
  const counters = config.lastReceiptNumberByYear || {};
  return (counters[year] || 0) + 1;
},

// Increment and persist the receipt counter for a year
incrementReceiptCounter(year) {
  const config = Store.getConfig();
  if (!config.lastReceiptNumberByYear) config.lastReceiptNumberByYear = {};
  const next = (config.lastReceiptNumberByYear[year] || 0) + 1;
  config.lastReceiptNumberByYear[year] = next;
  Store.saveConfig(config);
  return next;
},

// Get receipt number from the Receipt entity
getReceiptNumberForPayment(payment) {
  const receipts = Store.getReceipts();
  const receipt = receipts.find(r => r.id === payment.receiptId);
  return receipt ? receipt.receiptNumber : (payment.receiptNumber || '?');
},
```

**Step 2: Update `memberShouldPay` to use activeMonths**

Replace existing `memberShouldPay` (in `js/utils.js`):

```javascript
memberShouldPay(member, month, year) {
  if (member.status !== 'active') return false;
  if (member.monthlyFee <= 0) return false;
  // Check active months
  const config = Store.getConfig();
  const activeMonths = config.activeMonths || [9,10,11,12,1,2,3,4,5,6];
  if (!activeMonths.includes(month)) return false;
  // Registration date check — registration month counts
  if (!member.registrationDate) return true;
  const regDate = new Date(member.registrationDate);
  const regYear = regDate.getFullYear();
  const regMonth = regDate.getMonth() + 1;
  // Member should pay if the check month is >= registration month
  if (year < regYear) return false;
  if (year === regYear && month < regMonth) return false;
  return true;
},
```

Note: Changed from comparing `regDate <= checkDate` (first day of month) to comparing year/month directly. This ensures that registration on the 15th of January still counts January as payable — because we compare at month granularity, not day.

**Step 3: Update `getMemberDebt` to use activeMonths**

Replace existing `getMemberDebt` (in `js/utils.js`):

```javascript
getMemberDebt(member, year) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const config = Store.getConfig();
  const activeMonths = config.activeMonths || [9,10,11,12,1,2,3,4,5,6];
  const debtMonths = [];

  for (let m = 1; m <= 12; m++) {
    if (!activeMonths.includes(m)) continue;
    if (year === currentYear && m > currentMonth) continue;
    if (!this.memberShouldPay(member, m, year)) continue;
    const paid = this.isMemberPaidForMonth(member.id, year, m);
    if (!paid) debtMonths.push(m);
  }
  return {
    months: debtMonths,
    totalAmount: debtMonths.length * member.monthlyFee
  };
},
```

**Step 4: Fix UTC date issue — add `todayLocalISO` helper**

Replace `formatDateISO` and `todayISO` (in `js/utils.js`):

```javascript
formatDateISO(date) {
  const d = date instanceof Date ? date : new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
},
todayISO() {
  return this.formatDateISO(new Date());
},
```

This replaces the old `toISOString().split('T')[0]` which could return the wrong date near midnight.

**Step 5: Add filename sanitization utility**

Add to Utils:

```javascript
sanitizeFilename(name) {
  return name.replace(/[/\\:*?"<>|]/g, '_').trim();
},
```

**Step 6: Commit**

```
feat: update Utils — receipt counter, active months, local date formatting, filename sanitizer
```

---

## Task 3: Data Migration (v1 → v2)

**Files:**
- Modify: `js/init.js` (init function)

**Step 1: Add migration function before `init()`**

Add this function before the `init()` function (in `js/init.js`):

```javascript
function migrateDataV2() {
  const config = Store.getConfig();
  if (config.dataVersion && config.dataVersion >= 2) return; // Already migrated

  const payments = Store.getPayments();
  if (payments.length === 0) {
    // No data to migrate — just set version
    config.dataVersion = 2;
    if (!config.activeMonths) config.activeMonths = [9,10,11,12,1,2,3,4,5,6];
    if (!config.lastReceiptNumberByYear) config.lastReceiptNumberByYear = {};
    Store.saveConfig(config);
    return;
  }

  // Group payments by memberId + paidDate to form receipts
  const groups = {};
  payments.forEach(p => {
    const key = `${p.memberId}__${p.paidDate || p.createdAt || 'unknown'}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  // Sort groups by earliest paidDate/createdAt for receipt numbering
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const pa = groups[a][0];
    const pb = groups[b][0];
    const da = pa.paidDate || pa.createdAt || '';
    const db = pb.paidDate || pb.createdAt || '';
    if (da !== db) return da.localeCompare(db);
    return (pa.createdAt || '').localeCompare(pb.createdAt || '');
  });

  // Create receipts and link payments
  const receipts = [];
  const counterByYear = {};

  sortedKeys.forEach(key => {
    const group = groups[key];
    const first = group[0];
    const year = first.year;
    if (!counterByYear[year]) counterByYear[year] = 0;
    counterByYear[year]++;

    const receiptId = Utils.generateId();
    const totalAmount = group.reduce((s, p) => s + (p.amount || 0), 0);

    receipts.push({
      id: receiptId,
      receiptNumber: counterByYear[year],
      year: year,
      memberId: first.memberId,
      amount: totalAmount,
      paidDate: first.paidDate || Utils.todayISO(),
      notes: first.notes || '',
      status: 'active',
      cancelledAt: null,
      createdAt: first.createdAt || new Date().toISOString()
    });

    // Link each payment to the receipt
    group.forEach(p => {
      p.receiptId = receiptId;
    });
  });

  // Save migrated data
  Store.saveReceipts(receipts);
  Store.savePayments(payments);

  // Update config
  config.dataVersion = 2;
  config.lastReceiptNumberByYear = counterByYear;
  if (!config.activeMonths) config.activeMonths = [9,10,11,12,1,2,3,4,5,6];
  Store.saveConfig(config);

  console.log(`Migration v2 complete: ${receipts.length} receipts created from ${payments.length} payments`);
}
```

**Step 2: Call migration in `init()`**

Add migration call at the beginning of `init()`, right after `const config = Store.getConfig();` (in `js/init.js`):

```javascript
async function init() {
  const config = Store.getConfig();

  // Run data migration if needed
  migrateDataV2();

  // ... rest of init
}
```

Also call it after reconnect in init (in `js/init.js`), after the data is loaded from file:

```javascript
if (reconnected) {
  migrateDataV2(); // Migrate if file data is v1
  const cfg = Store.getConfig();
  // ...
}
```

**Step 3: Commit**

```
feat: add v1→v2 data migration — creates Receipt entities, links payments, sets receipt counters
```

---

## Task 4: Rewrite `savePayment()` — Create Receipt + Payments

**Files:**
- Modify: `js/forms.js` (savePayment function)

**Step 1: Rewrite `savePayment` to create a Receipt + linked Payments**

Replace the entire `savePayment` function:

```javascript
function savePayment(e) {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const memberId = fd.get('memberId');
  const year = parseInt(fd.get('year'));
  const amount = parseFloat(fd.get('amount'));
  const paidDate = fd.get('paidDate') || Utils.todayISO();
  const notes = fd.get('notes')?.trim() || '';
  const months = fd.getAll('months').map(Number);

  if (!memberId) { showToast('Επιλέξτε μέλος', 'error'); return; }
  if (months.length === 0) { showToast('Επιλέξτε τουλάχιστον έναν μήνα', 'error'); return; }
  if (isNaN(amount) || amount < 0) { showToast('Εισάγετε έγκυρο ποσό', 'error'); return; }

  const payments = Store.getPayments();
  const receipts = Store.getReceipts();

  // Check for duplicate months
  let duplicates = [];
  const validMonths = [];
  months.forEach(month => {
    const existing = payments.find(p =>
      p.memberId === memberId && p.year === year && p.month === month &&
      // Only count payments whose receipt is active
      (!p.receiptId || receipts.find(r => r.id === p.receiptId && r.status === 'active'))
    );
    if (existing) {
      duplicates.push(Utils.getMonthShort(month));
    } else {
      validMonths.push(month);
    }
  });

  if (validMonths.length === 0) {
    if (duplicates.length > 0) {
      showToast(`Υπάρχει ήδη πληρωμή για: ${duplicates.join(', ')}`, 'warning');
    }
    return;
  }

  // Create ONE receipt for all months paid together
  const receiptNumber = Utils.incrementReceiptCounter(year);
  const receiptId = Utils.generateId();
  const totalAmount = validMonths.length * amount;

  receipts.push({
    id: receiptId,
    receiptNumber,
    year,
    memberId,
    amount: totalAmount,
    paidDate,
    notes,
    status: 'active',
    cancelledAt: null,
    createdAt: new Date().toISOString()
  });

  // Create one payment per month, all linked to this receipt
  const newPaymentIds = [];
  validMonths.forEach(month => {
    const paymentId = Utils.generateId();
    payments.push({
      id: paymentId,
      receiptId,
      memberId,
      year,
      month,
      amount,
      paidDate,
      notes,
      createdAt: new Date().toISOString()
    });
    newPaymentIds.push(paymentId);
  });

  Store.saveReceipts(receipts);
  Store.savePayments(payments);

  if (duplicates.length > 0) {
    showToast(`Υπήρχε ήδη πληρωμή για: ${duplicates.join(', ')}`, 'warning');
  }
  const saved = validMonths.length;
  if (saved > 0) {
    showToast(`Καταχωρήθηκαν ${saved} πληρωμ${saved === 1 ? 'ή' : 'ές'} — Απόδειξη #${receiptNumber}`, 'success');
  }

  Modals.close();

  // Show receipt for the new receipt
  if (newPaymentIds.length > 0) {
    showReceiptById(receiptId);
  } else {
    renderView();
  }
}
```

**Step 2: Commit**

```
feat: rewrite savePayment — creates 1 Receipt per transaction with linked payments
```

---

## Task 5: Replace `deletePayment()` with `cancelReceipt()`

**Files:**
- Modify: `js/forms.js` (deletePayment function)

**Step 1: Replace `deletePayment` with `cancelReceipt`**

Remove `deletePayment` and add:

```javascript
function cancelReceipt(receiptId) {
  const receipts = Store.getReceipts();
  const receipt = receipts.find(r => r.id === receiptId);
  if (!receipt) return;

  Modals.confirm(
    `Ακύρωση απόδειξης #${receipt.receiptNumber};`,
    'Η απόδειξη θα παραμείνει στο αρχείο ως ακυρωμένη. Οι αντίστοιχοι μήνες θα γίνουν ξανά απλήρωτοι.',
    () => {
      // Soft-delete: mark receipt as cancelled
      receipt.status = 'cancelled';
      receipt.cancelledAt = new Date().toISOString();
      Store.saveReceipts(receipts);

      // Remove the linked payments (months become unpaid)
      const payments = Store.getPayments().filter(p => p.receiptId !== receiptId);
      Store.savePayments(payments);

      showToast(`Η απόδειξη #${receipt.receiptNumber} ακυρώθηκε`, 'success');
      renderView();
    }
  );
}
```

**Step 2: Commit**

```
feat: replace deletePayment with cancelReceipt — soft delete preserving receipt number
```

---

## Task 6: Rewrite Receipt Display & Printing

**Files:**
- Modify: `js/actions.js` (showReceipt, printReceipt)

**Step 1: Add `showReceiptById` function and update `showReceipt`**

Replace `showReceipt(paymentIds)` with a receipt-centric function:

```javascript
function showReceiptById(receiptId) {
  const receipts = Store.getReceipts();
  const receipt = receipts.find(r => r.id === receiptId);
  if (!receipt) return;

  const payments = Store.getPayments().filter(p => p.receiptId === receiptId);
  const members = Store.getMembers();
  const config = Store.getConfig();
  const member = members.find(m => m.id === receipt.memberId);
  const memberName = member ? Utils.getMemberFullName(member) : 'Άγνωστο μέλος';
  const childName = member ? Utils.getChildFullName(member) : '';
  const monthsList = payments.map(p => Utils.getMonthShort(p.month)).join(', ');
  const isCancelled = receipt.status === 'cancelled';

  Modals.open(`
    <div class="modal-header">
      <h3>🧾 Αποδεικτικό Πληρωμής</h3>
      <button class="modal-close" onclick="Modals.close(); renderView()">&times;</button>
    </div>
    <div class="modal-body" id="receipt-content">
      <div class="receipt ${isCancelled ? 'receipt-cancelled' : ''}">
        ${isCancelled ? '<div class="receipt-cancel-stamp">ΑΚΥΡΟ</div>' : ''}
        <div class="receipt-header">
          <div class="receipt-club">${Utils.escapeHtml(config.clubName)}</div>
          <div class="receipt-title">Αποδεικτικό Πληρωμής</div>
        </div>
        <div class="receipt-number">Αρ. Απόδειξης: #${receipt.receiptNumber}</div>
        <div class="receipt-body">
          <div class="receipt-row">
            <span class="receipt-label">Ημερομηνία:</span>
            <span class="receipt-val">${Utils.formatDate(receipt.paidDate)}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Μέλος:</span>
            <span class="receipt-val">${Utils.escapeHtml(memberName)}</span>
          </div>
          ${childName ? `
          <div class="receipt-row">
            <span class="receipt-label">Αθλούμενος:</span>
            <span class="receipt-val">${Utils.escapeHtml(childName)}</span>
          </div>` : ''}
          <div class="receipt-row">
            <span class="receipt-label">Περίοδος:</span>
            <span class="receipt-val">${monthsList} ${receipt.year}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Μήνες:</span>
            <span class="receipt-val">${payments.length}</span>
          </div>
          ${payments.length > 0 ? `
          <div class="receipt-row">
            <span class="receipt-label">Ποσό ανά μήνα:</span>
            <span class="receipt-val amount">${Utils.formatMoney(payments[0].amount)}</span>
          </div>` : ''}
          ${payments.length > 1 ? `
          <div class="receipt-row" style="border-top:2px solid var(--primary);padding-top:12px;margin-top:8px">
            <span class="receipt-label" style="font-weight:700;font-size:1rem">Σύνολο:</span>
            <span class="receipt-val amount" style="font-size:1.2rem">${Utils.formatMoney(receipt.amount)}</span>
          </div>` : ''}
          ${receipt.notes ? `
          <div class="receipt-row">
            <span class="receipt-label">Σημειώσεις:</span>
            <span class="receipt-val">${Utils.escapeHtml(receipt.notes)}</span>
          </div>` : ''}
        </div>
        <div class="receipt-footer">
          <div class="receipt-stamp">
            <span class="stamp-line">Σφραγίδα / Υπογραφή</span>
          </div>
          <div style="font-size:0.75rem;color:var(--text-muted);text-align:right">
            Εκτυπώθηκε: ${Utils.formatDate(Utils.todayISO())}
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="printReceipt()">🖨️ Εκτύπωση</button>
      <button class="btn btn-outline" onclick="Modals.close(); renderView()">Κλείσιμο</button>
    </div>
  `, true);
}
```

Keep `showReceipt(paymentIds)` as a legacy wrapper for backward compatibility during migration:

```javascript
function showReceipt(paymentIds) {
  // Legacy: find the receipt from a payment
  const payments = Store.getPayments();
  const p = payments.find(pp => pp.id === paymentIds[0]);
  if (p && p.receiptId) {
    showReceiptById(p.receiptId);
  }
}
```

**Step 2: Add CSS for cancelled receipt styling**

In the `<style>` section, add:

```css
.receipt-cancelled {
  opacity: 0.7;
  position: relative;
}
.receipt-cancelled .receipt-body .receipt-val {
  text-decoration: line-through;
}
.receipt-cancel-stamp {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-30deg);
  font-size: 4rem;
  font-weight: 900;
  color: rgba(192, 57, 43, 0.3);
  letter-spacing: 8px;
  pointer-events: none;
  z-index: 1;
}
```

**Step 3: Commit**

```
feat: rewrite receipt display — single receipt per transaction, cancelled stamp styling
```

---

## Task 7: Update Payment Grid (Member Detail View)

**Files:**
- Modify: `js/views.js` (Views.memberDetail)

**Step 1: Update payment grid to show only active months**

Replace the grid generation loop (in `Views.memberDetail` in `js/views.js`):

```javascript
const config = Store.getConfig();
const activeMonths = config.activeMonths || [9,10,11,12,1,2,3,4,5,6];
const receipts = Store.getReceipts();

let gridHtml = '';
for (let m = 1; m <= 12; m++) {
  const isActive = activeMonths.includes(m);
  const payment = Utils.isMemberPaidForMonth(member.id, year, m);
  const shouldPay = Utils.memberShouldPay(member, m, year);

  let cls = 'na', statusIcon = '—', amountText = '';
  if (!isActive) {
    cls = 'inactive-month';
    statusIcon = '—';
  } else if (!shouldPay) {
    cls = 'na';
    statusIcon = '—';
  } else if (payment) {
    cls = 'paid';
    statusIcon = '✓';
    amountText = Utils.formatMoney(payment.amount);
  } else {
    cls = 'unpaid';
    statusIcon = '✗';
  }

  const onclick = payment
    ? `onclick="showPaymentDetail('${payment.id}')"`
    : (shouldPay && isActive ? `onclick="openPaymentForm('${member.id}', ${m}, ${year})"` : '');

  gridHtml += `
    <div class="payment-month ${cls}" ${onclick} title="${MONTHS_GR[m-1]}${payment ? ' - ' + Utils.formatMoney(payment.amount) : ''}">
      <span class="month-label">${MONTHS_SHORT[m-1]}</span>
      <span class="month-status">${statusIcon}</span>
      ${amountText ? `<span class="month-amount">${amountText}</span>` : ''}
    </div>
  `;
}
```

**Step 2: Add CSS for inactive months**

```css
.payment-month.inactive-month {
  background: #f0f0f0;
  color: #bbb;
  cursor: default;
  opacity: 0.5;
}
```

**Step 3: Update payment history table to show receipt number and cancel button**

In the payment history table (in `Views.memberDetail` in `js/views.js`), replace the delete button with cancel:

```javascript
${allPayments.map(p => {
  const receipt = receipts.find(r => r.id === p.receiptId);
  const rn = receipt ? receipt.receiptNumber : (p.receiptNumber || '?');
  const isCancelled = receipt && receipt.status === 'cancelled';
  return `
  <tr ${isCancelled ? 'style="opacity:0.5;text-decoration:line-through"' : ''}>
    <td><span class="receipt-badge">#${rn}</span> ${isCancelled ? '<span style="color:var(--danger);font-size:0.75rem">ΑΚΥΡΟ</span>' : ''}</td>
    <td>${Utils.formatDate(p.paidDate)}</td>
    <td>${Utils.getMonthName(p.month)} ${p.year}</td>
    <td class="text-right money">${Utils.formatMoney(p.amount)}</td>
    <td class="text-muted">${Utils.escapeHtml(p.notes || '')}</td>
    <td class="text-center no-print">
      <button class="btn btn-ghost btn-sm" onclick="showReceiptById('${p.receiptId}')" title="Απόδειξη">🧾</button>
      ${!isCancelled && receipt ? `<button class="btn btn-ghost btn-sm" onclick="cancelReceipt('${receipt.id}')" title="Ακύρωση">❌</button>` : ''}
    </td>
  </tr>`;
}).join('')}
```

Note: For the history table, we also need to show cancelled payments from cancelled receipts. We should load all payments for this member including cancelled ones. Add a helper to get all payments including cancelled:

```javascript
// In the memberDetail view, get all payments including from cancelled receipts
const allPaymentsIncCancelled = Store.getPayments()
  .filter(p => p.memberId === member.id)
  .sort((a, b) => (b.year - a.year) || (b.month - a.month));

// But also include "ghost" entries for cancelled receipts
const cancelledReceipts = receipts.filter(r => r.memberId === member.id && r.status === 'cancelled');
```

Wait — actually since we DELETE the payments when a receipt is cancelled (in cancelReceipt), we need a different approach. We have two options:

**Option A:** Don't delete payments on cancellation, just mark them via the receipt status. The `isMemberPaidForMonth` check should filter out payments from cancelled receipts.

This is cleaner. Let's go with Option A.

**Revised approach for `cancelReceipt`** (update Task 5): Instead of removing payments, keep them. Update `isMemberPaidForMonth` to check receipt status.

**Step 4: Update `Utils.isMemberPaidForMonth` to respect cancelled receipts**

```javascript
isMemberPaidForMonth(memberId, year, month) {
  const payments = Store.getPayments();
  const receipts = Store.getReceipts();
  const payment = payments.find(p =>
    p.memberId === memberId && p.year === year && p.month === month
  );
  if (!payment) return null;
  // Check if receipt is active
  if (payment.receiptId) {
    const receipt = receipts.find(r => r.id === payment.receiptId);
    if (receipt && receipt.status === 'cancelled') return null;
  }
  return payment;
},
```

**Step 5: Revise `cancelReceipt` (from Task 5) — keep payments, don't delete**

```javascript
function cancelReceipt(receiptId) {
  const receipts = Store.getReceipts();
  const receipt = receipts.find(r => r.id === receiptId);
  if (!receipt) return;

  Modals.confirm(
    `Ακύρωση απόδειξης #${receipt.receiptNumber};`,
    'Η απόδειξη θα παραμείνει στο αρχείο ως ακυρωμένη. Οι αντίστοιχοι μήνες θα γίνουν ξανά απλήρωτοι.',
    () => {
      receipt.status = 'cancelled';
      receipt.cancelledAt = new Date().toISOString();
      Store.saveReceipts(receipts);
      showToast(`Η απόδειξη #${receipt.receiptNumber} ακυρώθηκε`, 'success');
      renderView();
    }
  );
}
```

Payments stay in place — `isMemberPaidForMonth` now filters them out via receipt status.

**Step 6: Commit**

```
feat: update member detail view — active month grid, receipt-linked history, cancel support
```

---

## Task 8: Update `showPaymentDetail` and All Receipt-Number References

**Files:**
- Modify: `js/actions.js` (showPaymentDetail)
- Modify: All views that reference `p.receiptNumber || Utils.getReceiptNumber(p)`

**Step 1: Update `showPaymentDetail`**

Replace the `showPaymentDetail` function in `js/actions.js`:

```javascript
function showPaymentDetail(paymentId) {
  const payments = Store.getPayments();
  const receipts = Store.getReceipts();
  const p = payments.find(pp => pp.id === paymentId);
  if (!p) return;

  const receipt = receipts.find(r => r.id === p.receiptId);
  const receiptNum = receipt ? receipt.receiptNumber : (p.receiptNumber || '?');
  const isCancelled = receipt && receipt.status === 'cancelled';
  const members = Store.getMembers();
  const member = members.find(mm => mm.id === p.memberId);

  Modals.open(`
    <div class="modal-header">
      <h3>Στοιχεία Πληρωμής ${isCancelled ? '<span style="color:var(--danger)">(ΑΚΥΡΟ)</span>' : ''}</h3>
      <button class="modal-close" onclick="Modals.close()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="info-row"><span class="info-label">Αρ. Απόδειξης:</span><span class="info-value"><span class="receipt-badge">#${receiptNum}</span></span></div>
      <div class="info-row"><span class="info-label">Μέλος:</span><span class="info-value">${member ? Utils.escapeHtml(Utils.getMemberFullName(member)) : 'Διαγραμμένο'}</span></div>
      <div class="info-row"><span class="info-label">Περίοδος:</span><span class="info-value">${Utils.getMonthName(p.month)} ${p.year}</span></div>
      <div class="info-row"><span class="info-label">Ποσό:</span><span class="info-value money">${Utils.formatMoney(p.amount)}</span></div>
      <div class="info-row"><span class="info-label">Ημ. Πληρωμής:</span><span class="info-value">${Utils.formatDate(p.paidDate)}</span></div>
      ${p.notes ? `<div class="info-row"><span class="info-label">Σημειώσεις:</span><span class="info-value">${Utils.escapeHtml(p.notes)}</span></div>` : ''}
    </div>
    <div class="modal-footer">
      ${p.receiptId ? `<button class="btn btn-outline btn-sm" onclick="Modals.close(); showReceiptById('${p.receiptId}')">🧾 Απόδειξη</button>` : ''}
      ${!isCancelled && receipt ? `<button class="btn btn-danger btn-sm" onclick="Modals.close(); cancelReceipt('${receipt.id}')">❌ Ακύρωση</button>` : ''}
      <button class="btn btn-outline" onclick="Modals.close()">Κλείσιμο</button>
    </div>
  `);
}
```

**Step 2: Update all `p.receiptNumber || Utils.getReceiptNumber(p)` references across views**

These appear at these locations and need to be replaced with receipt-aware lookups:
- Dashboard recent payments (in `js/views.js`, `Views.dashboard`)
- Payments entry tab (in `js/views.js`, `_paymentsEntry`)
- Reports receipts tab (in `js/views.js`, `_reportReceipts`)
- Export functions (in `js/actions.js`)

For each, the pattern changes from:
```javascript
const rn = p.receiptNumber || Utils.getReceiptNumber(p);
```
to:
```javascript
const receipt = receipts.find(r => r.id === p.receiptId);
const rn = receipt ? receipt.receiptNumber : (p.receiptNumber || '?');
const isCancelled = receipt && receipt.status === 'cancelled';
```

Make sure `const receipts = Store.getReceipts();` is loaded at the top of each view/function that uses it.

**Step 3: Update Dashboard recent payments**

In `Views.dashboard()` (in `js/views.js`), add `const receipts = Store.getReceipts();` and update the recent payments rendering to use receipt lookup and skip cancelled.

**Step 4: Update Payments entry tab**

In `Views._paymentsEntry()` (in `js/views.js`), same update — load receipts, update receipt number lookup, replace delete button with cancel button.

**Step 5: Update delete buttons everywhere → cancel buttons**

All `onclick="deletePayment('${p.id}')"` become `onclick="cancelReceipt('${receipt.id}')"` (with proper null check).

**Step 6: Commit**

```
feat: update all views to use Receipt entity for receipt numbers and cancel instead of delete
```

---

## Task 9: Update Payment Form — Active Months Only

**Files:**
- Modify: `js/forms.js` (openPaymentForm)

**Step 1: Filter month checkboxes to show only active months**

In the payment form month grid (in `openPaymentForm` in `js/forms.js`):

```javascript
<div class="form-group">
  <label>Μήνες <span class="required">*</span></label>
  <div class="month-check-grid">
    ${MONTHS_SHORT.map((m, i) => {
      const monthNum = i + 1;
      const config = Store.getConfig();
      const activeMonths = config.activeMonths || [9,10,11,12,1,2,3,4,5,6];
      const isActive = activeMonths.includes(monthNum);
      return `
        <label class="month-check-label ${!isActive ? 'month-inactive' : ''}">
          <input type="checkbox" name="months" value="${monthNum}"
            ${preMonth === monthNum ? 'checked' : ''}
            ${!isActive ? 'disabled' : ''}>
          <span>${m}</span>
        </label>
      `;
    }).join('')}
  </div>
</div>
```

Add CSS:
```css
.month-check-label.month-inactive {
  opacity: 0.35;
  cursor: not-allowed;
}
```

**Step 2: Commit**

```
feat: payment form shows only active months as selectable
```

---

## Task 10: Update Annual Grid & Monthly Views — Active Months

**Files:**
- Modify: `js/views.js` (_paymentsAnnual)
- Modify: `js/views.js` (_paymentsMonthly)

**Step 1: Update annual grid to highlight inactive months**

In `_paymentsAnnual()` (in `js/views.js`), update the month loop and header:

```javascript
const config = Store.getConfig();
const activeMonths = config.activeMonths || [9,10,11,12,1,2,3,4,5,6];

// In header: dim inactive months
${MONTHS_SHORT.map((m, i) => {
  const isActive = activeMonths.includes(i + 1);
  return `<th ${!isActive ? 'style="opacity:0.3"' : ''}>${m}</th>`;
}).join('')}

// In cell rendering: mark inactive months distinctly
for (let mo = 1; mo <= 12; mo++) {
  if (!activeMonths.includes(mo)) {
    cols.push({ na: true, inactive: true });
    continue;
  }
  // ... existing logic
}
```

**Step 2: Update `exportAnnualGrid` to use active months**

In `exportAnnualGrid` (in `js/actions.js`), use `activeMonths` to skip inactive months or mark them clearly.

**Step 3: Update monthly view month selector**

In `_paymentsMonthly()` month dropdown (in `js/views.js`), visually indicate inactive months:

```javascript
${MONTHS_GR.map((mn, i) => {
  const isActive = activeMonths.includes(i + 1);
  return `<option value="${i+1}" ${month === i+1 ? 'selected' : ''} ${!isActive ? 'style="color:#ccc"' : ''}>${mn}${!isActive ? ' (ανενεργός)' : ''}</option>`;
}).join('')}
```

**Step 4: Commit**

```
feat: annual and monthly views respect activeMonths configuration
```

---

## Task 11: Atomic Import & Schema Validation

**Files:**
- Modify: `js/store.js` (Store.importBackup)

**Step 1: Rewrite `Store.importBackup` with validation and atomic apply**

```javascript
importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const errors = this._validateImportData(data);
        if (errors.length > 0) {
          reject('Σφάλματα στο αρχείο:\n' + errors.join('\n'));
          return;
        }
        // Atomic apply — all or nothing
        this.saveMembers(data.members);
        this.savePayments(data.payments);
        this.saveReceipts(data.receipts || []);
        if (data.config) this.saveConfig(data.config);
        resolve(data);
      } catch (err) {
        reject('Σφάλμα ανάγνωσης αρχείου: ' + err.message);
      }
    };
    reader.onerror = () => reject('Σφάλμα ανάγνωσης αρχείου');
    reader.readAsText(file);
  });
},

_validateImportData(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    errors.push('Μη έγκυρο αρχείο JSON');
    return errors;
  }
  if (!Array.isArray(data.members)) {
    errors.push('Λείπει ή δεν είναι πίνακας: members');
  }
  if (!Array.isArray(data.payments)) {
    errors.push('Λείπει ή δεν είναι πίνακας: payments');
  }
  if (errors.length > 0) return errors; // Can't validate further

  // Build member ID set for reference checking
  const memberIds = new Set(data.members.map(m => m.id));

  // Validate members
  data.members.forEach((m, i) => {
    if (!m.lastName) errors.push(`Μέλος #${i+1}: λείπει το επώνυμο`);
    if (!m.firstName) errors.push(`Μέλος #${i+1}: λείπει το όνομα`);
    if (!m.phone) errors.push(`Μέλος #${i+1}: λείπει το τηλέφωνο`);
    if (m.category && !['adult','child','honorary'].includes(m.category) &&
        !(data.config?.categories || []).find(c => c.id === m.category)) {
      errors.push(`Μέλος #${i+1}: άγνωστη κατηγορία "${m.category}"`);
    }
    if (m.status && !['active','inactive'].includes(m.status)) {
      errors.push(`Μέλος #${i+1}: μη έγκυρη κατάσταση "${m.status}"`);
    }
  });

  // Validate payments
  data.payments.forEach((p, i) => {
    if (!p.memberId || !memberIds.has(p.memberId)) {
      errors.push(`Πληρωμή #${i+1}: memberId δεν αντιστοιχεί σε μέλος`);
    }
    if (!p.year || p.year < 2015 || p.year > 2040) {
      errors.push(`Πληρωμή #${i+1}: μη έγκυρο έτος`);
    }
    if (!p.month || p.month < 1 || p.month > 12) {
      errors.push(`Πληρωμή #${i+1}: μη έγκυρος μήνας`);
    }
    if (p.amount == null || isNaN(p.amount) || p.amount < 0) {
      errors.push(`Πληρωμή #${i+1}: μη έγκυρο ποσό`);
    }
  });

  // Validate receipts (if present)
  if (data.receipts && Array.isArray(data.receipts)) {
    data.receipts.forEach((r, i) => {
      if (!r.receiptNumber) errors.push(`Απόδειξη #${i+1}: λείπει αριθμός απόδειξης`);
      if (r.status && !['active','cancelled'].includes(r.status)) {
        errors.push(`Απόδειξη #${i+1}: μη έγκυρη κατάσταση "${r.status}"`);
      }
      if (!r.memberId || !memberIds.has(r.memberId)) {
        errors.push(`Απόδειξη #${i+1}: memberId δεν αντιστοιχεί σε μέλος`);
      }
    });
  }

  // Validate config (if present)
  if (data.config) {
    if (data.config.categories && !Array.isArray(data.config.categories)) {
      errors.push('Config: categories δεν είναι πίνακας');
    }
    if (data.config.activeMonths && !Array.isArray(data.config.activeMonths)) {
      errors.push('Config: activeMonths δεν είναι πίνακας');
    }
  }

  // Limit error display
  if (errors.length > 10) {
    const total = errors.length;
    errors.length = 10;
    errors.push(`... και ${total - 10} ακόμα σφάλματα`);
  }

  return errors;
},
```

**Step 2: Commit**

```
feat: atomic import with full schema validation — members, payments, receipts, config
```

---

## Task 12: Update Export Functions — Filename Sanitization & Receipt Model

**Files:**
- Modify: `js/actions.js` (all export functions)

**Step 1: Apply `Utils.sanitizeFilename()` to all export filenames**

Replace all `XLSX.writeFile(wb, ...)` calls to use sanitized filenames:

```javascript
// exportMembersExcel:
XLSX.writeFile(wb, Utils.sanitizeFilename(`Μέλη_${Utils.formatDateISO(new Date())}`) + '.xlsx');

// exportPaymentsExcel:
XLSX.writeFile(wb, Utils.sanitizeFilename(`Πληρωμές_${Utils.formatDateISO(new Date())}`) + '.xlsx');

// exportReceiptsExcel:
XLSX.writeFile(wb, Utils.sanitizeFilename(`${config.clubName}_Αποδείξεις_${year}`) + '.xlsx');

// exportAnnualGrid:
XLSX.writeFile(wb, Utils.sanitizeFilename(`Ετήσια_Εικόνα_${year}`) + '.xlsx');

// exportDebtors:
XLSX.writeFile(wb, Utils.sanitizeFilename(`Οφειλέτες_${year}`) + '.xlsx');

// exportMonthlyCollections:
XLSX.writeFile(wb, Utils.sanitizeFilename(`Εισπράξεις_ανά_Μήνα_${year}`) + '.xlsx');

// exportYearlyCollections:
XLSX.writeFile(wb, Utils.sanitizeFilename('Εισπράξεις_ανά_Έτος') + '.xlsx');
```

Also sanitize the backup filename in `Store.exportBackup()`:
```javascript
a.download = Utils.sanitizeFilename(`syllógos_backup_${Utils.formatDateISO(new Date())}`) + '.json';
```

**Step 2: Update `exportReceiptsExcel` to use Receipt model**

```javascript
function exportReceiptsExcel(year) {
  if (!checkSheetJS()) return;
  const receipts = Store.getReceipts()
    .filter(r => r.year === year)
    .sort((a, b) => a.receiptNumber - b.receiptNumber);
  const payments = Store.getPayments();
  const members = Store.getMembers();
  const config = Store.getConfig();

  const data = receipts.map(r => {
    const m = members.find(mm => mm.id === r.memberId);
    const rPayments = payments.filter(p => p.receiptId === r.id);
    const monthsList = rPayments.map(p => Utils.getMonthShort(p.month)).join(', ');
    return {
      'Αρ. Απόδειξης': r.receiptNumber,
      'Κατάσταση': r.status === 'cancelled' ? 'ΑΚΥΡΟ' : 'Ενεργή',
      'Ημ. Πληρωμής': Utils.formatDate(r.paidDate),
      'Επώνυμο': m ? m.lastName : 'Διαγραμμένο',
      'Όνομα': m ? m.firstName : '',
      'Παιδί': m ? Utils.getChildFullName(m) : '',
      'Μήνες': monthsList,
      'Ποσό (€)': r.amount,
      'Σημειώσεις': r.notes || ''
    };
  });

  // Summary row (active only)
  const activeReceipts = receipts.filter(r => r.status === 'active');
  const totalAmount = activeReceipts.reduce((s, r) => s + (r.amount || 0), 0);
  data.push({
    'Αρ. Απόδειξης': '',
    'Κατάσταση': '',
    'Ημ. Πληρωμής': '',
    'Επώνυμο': 'ΣΥΝΟΛΟ',
    'Όνομα': `${activeReceipts.length} ενεργές αποδείξεις`,
    'Παιδί': '',
    'Μήνες': '',
    'Ποσό (€)': totalAmount,
    'Σημειώσεις': ''
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Αποδείξεις ${year}`);
  XLSX.writeFile(wb, Utils.sanitizeFilename(`${config.clubName}_Αποδείξεις_${year}`) + '.xlsx');
  showToast(`Εξαγωγή αποδείξεων ${year} ολοκληρώθηκε`, 'success');
}
```

**Step 3: Update `exportPaymentsExcel` to include receipt status**

Add receipt status column and filter out cancelled by default (or mark them).

**Step 4: Commit**

```
feat: sanitize all export filenames, update receipt exports to use Receipt model
```

---

## Task 13: Update Settings View — Active Months & Privacy Warning

**Files:**
- Modify: `js/views.js` (Views.settings)

**Step 1: Add Active Months setting section**

After the "Γενικά" settings card, add:

```javascript
<!-- Active Months -->
<div class="card settings-section">
  <div class="card-header">
    <h3>📅 Ενεργοί Μήνες Χρέωσης</h3>
  </div>
  <p class="text-muted mb-2" style="font-size:0.82rem">Επιλέξτε τους μήνες κατά τους οποίους γίνεται χρέωση εισφοράς</p>
  <div class="month-check-grid">
    ${MONTHS_SHORT.map((m, i) => {
      const monthNum = i + 1;
      const isActive = (config.activeMonths || [9,10,11,12,1,2,3,4,5,6]).includes(monthNum);
      return `
        <label class="month-check-label">
          <input type="checkbox" name="activeMonth" value="${monthNum}" ${isActive ? 'checked' : ''}>
          <span>${m}</span>
        </label>
      `;
    }).join('')}
  </div>
  <button class="btn btn-primary mt-1" onclick="saveActiveMonths()">💾 Αποθήκευση</button>
</div>
```

**Step 2: Add `saveActiveMonths` function**

```javascript
function saveActiveMonths() {
  const config = Store.getConfig();
  const checked = document.querySelectorAll('[name="activeMonth"]:checked');
  config.activeMonths = Array.from(checked).map(cb => parseInt(cb.value));
  Store.saveConfig(config);
  showToast('Οι ενεργοί μήνες αποθηκεύτηκαν', 'success');
  renderView();
}
```

**Step 3: Add privacy warning in Backup section**

After the backup warning alert, add:

```html
<div class="alert alert-warning mt-1" style="font-size:0.82rem">
  🔒 Τα δεδομένα αποθηκεύονται χωρίς κρυπτογράφηση. Φυλάξτε το αρχείο σε ασφαλή τοποθεσία
  και μην το μοιράζεστε χωρίς λόγο.
</div>
```

**Step 4: Add receipt counter info in Storage Info section**

```javascript
<div class="info-row">
  <span class="info-label">Αποδείξεις:</span>
  <span class="info-value">${Store.getReceipts().length} (${Store.getReceipts().filter(r => r.status === 'active').length} ενεργές)</span>
</div>
```

**Step 5: Commit**

```
feat: settings — active months configuration, privacy warning, receipt counter display
```

---

## Task 14: Browser Compatibility Banner

**Files:**
- Modify: `js/init.js` (init function)

**Step 1: Add browser compatibility check in `init()`**

After the existing init logic, before `navigate('dashboard')`:

```javascript
// Browser compatibility notice
if (!FileStorage.isSupported()) {
  // Show a non-blocking banner (will appear in dashboard view)
  setTimeout(() => {
    const main = document.getElementById('main-content');
    if (main) {
      const banner = document.createElement('div');
      banner.className = 'alert alert-warning mb-2 no-print';
      banner.style.cursor = 'pointer';
      banner.innerHTML = '🌐 <strong>Για βέλτιστη λειτουργία χρησιμοποιήστε Google Chrome ή Microsoft Edge.</strong> Ο τρέχων browser δεν υποστηρίζει αυτόματη αποθήκευση σε αρχείο.';
      banner.onclick = () => banner.remove();
      main.insertBefore(banner, main.firstChild);
    }
  }, 300);
}
```

**Step 2: Commit**

```
feat: show browser compatibility banner when File System Access API is unavailable
```

---

## Task 15: Update Reports — Receipts Tab

**Files:**
- Modify: `js/views.js` (_reportReceipts)

**Step 1: Find and update `_reportReceipts()` to use Receipt model**

The receipts report should now show Receipt entities directly:

```javascript
_reportReceipts() {
  const year = State.reportYear;
  const receipts = Store.getReceipts()
    .filter(r => r.year === year)
    .sort((a, b) => a.receiptNumber - b.receiptNumber);
  const payments = Store.getPayments();
  const members = Store.getMembers();

  const activeReceipts = receipts.filter(r => r.status === 'active');
  const totalAmount = activeReceipts.reduce((s, r) => s + (r.amount || 0), 0);

  return `
    <div class="gap-row mb-2">
      <div class="year-selector">
        <button onclick="State.reportYear--; renderView()">◂</button>
        <span class="year-display">${year}</span>
        <button onclick="State.reportYear++; renderView()">▸</button>
      </div>
      <button class="btn btn-outline btn-sm no-print" onclick="exportReceiptsExcel(${year})">📥 Excel</button>
    </div>

    <div class="mb-1">
      <span class="text-muted">Σύνολο ενεργών αποδείξεων:</span> <strong>${activeReceipts.length}</strong>
      <span class="text-muted ml-2">—</span>
      <strong class="money ml-1">${Utils.formatMoney(totalAmount)}</strong>
    </div>

    ${receipts.length === 0 ? `
      <div class="empty-state"><p class="text-muted">Δεν υπάρχουν αποδείξεις για το ${year}</p></div>
    ` : `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Αρ.</th>
              <th>Κατάσταση</th>
              <th>Ημ/νία</th>
              <th>Μέλος</th>
              <th>Μήνες</th>
              <th class="text-right">Ποσό</th>
              <th class="text-center no-print">🧾</th>
            </tr>
          </thead>
          <tbody>
            ${receipts.map(r => {
              const m = members.find(mm => mm.id === r.memberId);
              const rPayments = payments.filter(p => p.receiptId === r.id);
              const monthsList = rPayments.map(p => Utils.getMonthShort(p.month)).join(', ');
              const isCancelled = r.status === 'cancelled';
              return `
              <tr ${isCancelled ? 'style="opacity:0.5"' : ''}>
                <td><span class="receipt-badge">#${r.receiptNumber}</span></td>
                <td>${isCancelled ? '<span style="color:var(--danger)">ΑΚΥΡΟ</span>' : '<span style="color:var(--success)">Ενεργή</span>'}</td>
                <td>${Utils.formatDate(r.paidDate)}</td>
                <td>${m ? Utils.escapeHtml(Utils.getMemberFullName(m)) : '<em>Διαγραμμένο</em>'}</td>
                <td>${monthsList} ${r.year}</td>
                <td class="text-right money ${isCancelled ? '' : ''}">${Utils.formatMoney(r.amount)}</td>
                <td class="text-center no-print">
                  <button class="btn btn-ghost btn-sm" onclick="showReceiptById('${r.id}')">🧾</button>
                  ${!isCancelled ? `<button class="btn btn-ghost btn-sm" onclick="cancelReceipt('${r.id}')">❌</button>` : ''}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;
},
```

**Step 2: Commit**

```
feat: reports receipts tab uses Receipt model with cancel/status support
```

---

## Task 16: Final Cleanup & Verification

**Files:**
- Modify: `js/forms.js`, `js/utils.js`, `js/views.js`, `js/actions.js` (various locations)

**Step 1: Remove old `deletePayment` function entirely**

Make sure it's fully replaced by `cancelReceipt`.

**Step 2: Remove old `getReceiptNumber(payment)` from Utils**

This is replaced by `getReceiptNumberForPayment(payment)`.

**Step 3: Search for any remaining references to old patterns**

Search for:
- `deletePayment` — should be gone (or only in legacy compatibility)
- `getReceiptNumber(` — should not exist (replaced)
- `p.receiptNumber || Utils.` — should all use receipt entity now
- `for (let m = 1; m <= 12` — should respect activeMonths where relevant

**Step 4: Verify `FileStorage._readFromFile` validation handles both v1 and v2 data**

The validation should accept files with or without `receipts` array:
```javascript
if (!Array.isArray(data.members) || !Array.isArray(data.payments)) {
  throw new Error('Μη έγκυρη δομή αρχείου');
}
// receipts is optional for v1 files — migration will handle it
```

**Step 5: Test scenarios to verify manually**

1. Open app with existing v1 data → migration creates receipts
2. Add a new payment (1 month) → creates 1 receipt + 1 payment
3. Add a payment (3 months) → creates 1 receipt + 3 payments
4. Cancel a receipt → marked as cancelled, months show unpaid
5. Cancelled receipt still visible in reports with ΑΚΥΡΟ
6. Receipt numbers never decrease after cancel
7. Payment grid shows only active months (no Jul/Aug)
8. Export Excel has sanitized filenames
9. Import validates schema and rejects bad data
10. Settings allow configuring active months

**Step 6: Commit**

```
chore: final cleanup — remove legacy functions, verify all views use Receipt model
```

---

## Summary of Changes by Area

| Area | What Changes |
|---|---|
| **Data Model** | New `Receipt` entity, `Payment.receiptId`, `Config.activeMonths/lastReceiptNumberByYear/dataVersion` |
| **Store** | Add `getReceipts()/saveReceipts()`, update storage size, auto-save, backup |
| **Utils** | New receipt counter, active months in `memberShouldPay`/`getMemberDebt`, local date formatting, filename sanitizer |
| **Migration** | Auto-migrate v1→v2 on first load |
| **savePayment** | Creates 1 Receipt + N Payments |
| **cancelReceipt** | Replaces deletePayment, soft-delete |
| **Receipt Display** | Shows one receipt per transaction, cancelled stamp |
| **Payment Grid** | Active months only, inactive months dimmed |
| **All Views** | Use Receipt entity for receipt numbers |
| **Settings** | Active months config, privacy warning |
| **Import** | Full schema validation, atomic apply |
| **Export** | Sanitized filenames, receipt-model-aware |
| **Compatibility** | Browser banner for non-Chrome/Edge |
