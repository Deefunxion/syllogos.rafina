// ─── SETTINGS FUNCTIONS ───────────────────────────────
function saveGeneralSettings() {
  const config = Store.getConfig();
  config.clubName = document.getElementById('setting-club-name').value.trim() || 'ΠΑΛΑΙΣΤΙΚΟΣ ΠΟΛ. ΣΥΛΛΟΓΟΣ ΡΑΦΗΝΑΣ ΚΑΙ ΠΕΡΙΧΩΡΩΝ';
  config.currentYear = parseInt(document.getElementById('setting-default-year').value) || new Date().getFullYear();
  Store.saveConfig(config);
  document.getElementById('sidebar-club-name').textContent = config.clubName;
  showToast('Οι ρυθμίσεις αποθηκεύτηκαν', 'success');
}

function saveCategories() {
  const config = Store.getConfig();
  const rows = document.querySelectorAll('#categories-tbody tr');
  const categories = [];
  rows.forEach(row => {
    const labelInput = row.querySelector('[data-field="label"]');
    const feeInput = row.querySelector('[data-field="fee"]');
    if (labelInput && feeInput) {
      categories.push({
        id: labelInput.getAttribute('data-cat-id'),
        label: labelInput.value.trim(),
        fee: parseFloat(feeInput.value) || 0
      });
    }
  });
  config.categories = categories;
  Store.saveConfig(config);
  showToast('Οι κατηγορίες αποθηκεύτηκαν', 'success');
  renderView();
}

function addCategory() {
  const config = Store.getConfig();
  const id = 'cat_' + Date.now();
  config.categories.push({ id, label: 'Νέα Κατηγορία', fee: 0 });
  Store.saveConfig(config);
  renderView();
}

function deleteCategory(catId) {
  const members = Store.getMembers();
  const using = members.filter(m => m.category === catId);
  if (using.length > 0) {
    showToast(`Δεν μπορεί να διαγραφεί — χρησιμοποιείται από ${using.length} μέλ${using.length === 1 ? 'ος' : 'η'}`, 'error');
    return;
  }
  Modals.confirm('Διαγραφή κατηγορίας;', '', () => {
    const config = Store.getConfig();
    config.categories = config.categories.filter(c => c.id !== catId);
    Store.saveConfig(config);
    renderView();
    showToast('Η κατηγορία διαγράφηκε', 'success');
  });
}

function saveActiveMonths() {
  const config = Store.getConfig();
  const checked = document.querySelectorAll('[name="activeMonth"]:checked');
  config.activeMonths = Array.from(checked).map(cb => parseInt(cb.value));
  Store.saveConfig(config);
  showToast('Οι ενεργοί μήνες αποθηκεύτηκαν', 'success');
  renderView();
}

function importBackup(file) {
  if (!file) return;
  Modals.confirm(
    'Επαναφορά δεδομένων από αρχείο;',
    'ΠΡΟΣΟΧΗ: Θα αντικατασταθούν ΟΛΑ τα υπάρχοντα δεδομένα!',
    async () => {
      try {
        await Store.importBackup(file);
        showToast('Τα δεδομένα επαναφέρθηκαν επιτυχώς', 'success');
        const config = Store.getConfig();
        document.getElementById('sidebar-club-name').textContent = config.clubName;
        navigate('dashboard');
      } catch (err) {
        showToast(err, 'error');
      }
    }
  );
}

// ─── PAYMENT DETAIL ───────────────────────────────────
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

// ─── RECEIPT FUNCTIONS ────────────────────────────────
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

// Legacy wrapper
function showReceipt(paymentIds) {
  const payments = Store.getPayments();
  const p = payments.find(pp => pp.id === paymentIds[0]);
  if (p && p.receiptId) {
    showReceiptById(p.receiptId);
  }
}

function printReceipt() {
  const content = document.getElementById('receipt-content');
  if (!content) return;
  const printWin = window.open('', '_blank', 'width=600,height=700');
  const config = Store.getConfig();
  printWin.document.write(`
    <html><head><title>Απόδειξη - ${Utils.escapeHtml(config.clubName)}</title>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
      body { font-family: 'IBM Plex Sans', sans-serif; margin: 20px; }
      .receipt { border: 2px solid #1a3a5c; border-radius: 8px; padding: 32px; max-width: 500px; margin: 0 auto; }
      .receipt-header { text-align: center; border-bottom: 2px solid #1a3a5c; padding-bottom: 16px; margin-bottom: 20px; }
      .receipt-club { font-size: 1.2rem; font-weight: 700; color: #1a3a5c; margin-bottom: 4px; }
      .receipt-title { font-size: 1rem; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
      .receipt-number { text-align: right; font-family: 'IBM Plex Mono', monospace; font-size: 1.3rem; font-weight: 700; color: #1a3a5c; margin-bottom: 16px; }
      .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; font-size: 0.92rem; }
      .receipt-row:last-child { border-bottom: none; }
      .receipt-label { color: #6b7a8d; font-weight: 500; }
      .receipt-val { font-weight: 600; }
      .receipt-val.amount { font-family: 'IBM Plex Mono', monospace; font-size: 1.1rem; color: #2d7a4f; }
      .receipt-footer { margin-top: 24px; padding-top: 16px; border-top: 2px solid #1a3a5c; display: flex; justify-content: space-between; align-items: flex-end; }
      .receipt-stamp { text-align: center; font-size: 0.8rem; color: #6b7a8d; }
      .stamp-line { display: block; width: 140px; border-top: 1px solid #333; margin-top: 40px; padding-top: 4px; }
      .receipt-cancelled { opacity: 0.7; position: relative; }
      .receipt-cancelled .receipt-body .receipt-val { text-decoration: line-through; }
      .receipt-cancel-stamp { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 4rem; font-weight: 900; color: rgba(192, 57, 43, 0.3); letter-spacing: 8px; pointer-events: none; z-index: 1; }
      @media print { body { margin: 0; } }
    </style></head><body>
    ${content.innerHTML}
    <script>setTimeout(function(){window.print();}, 500);<\/script>
    </body></html>
  `);
  printWin.document.close();
}

// ─── REPORT: MEMBER HISTORY SEARCH ────────────────────
function searchMemberForReport(query) {
  const dropdown = document.getElementById('report-member-dropdown');
  if (!query || query.length < 1) {
    dropdown.classList.remove('show');
    return;
  }
  const members = Store.getMembers();
  const q = query.toLowerCase();
  const results = members.filter(m =>
    Utils.getMemberFullName(m).toLowerCase().includes(q) ||
    Utils.getChildFullName(m).toLowerCase().includes(q)
  ).slice(0, 8);

  if (results.length === 0) {
    dropdown.classList.remove('show');
    return;
  }

  dropdown.innerHTML = results.map(m => `
    <div class="member-search-result" onclick="showMemberHistoryReport('${m.id}')">
      <div class="msr-name">${Utils.escapeHtml(Utils.getMemberFullName(m))}</div>
      ${m.child?.firstName ? `<div class="msr-child">Παιδί: ${Utils.escapeHtml(Utils.getChildFullName(m))}</div>` : ''}
    </div>
  `).join('');
  dropdown.classList.add('show');
}

function showMemberHistoryReport(memberId) {
  const members = Store.getMembers();
  const member = members.find(m => m.id === memberId);
  if (!member) return;

  document.getElementById('report-member-dropdown').classList.remove('show');
  document.getElementById('report-member-search').value = Utils.getMemberFullName(member);

  const payments = Store.getPayments()
    .filter(p => p.memberId === memberId)
    .sort((a, b) => (b.year - a.year) || (b.month - a.month));

  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);

  const content = document.getElementById('report-member-history-content');
  content.innerHTML = `
    <div class="mt-2 mb-2">
      <strong>${Utils.escapeHtml(Utils.getMemberFullName(member))}</strong>
      ${member.child?.firstName ? ` — Παιδί: ${Utils.escapeHtml(Utils.getChildFullName(member))}` : ''}
      <span class="badge ${member.status === 'active' ? 'badge-active' : 'badge-inactive'} ml-1">
        ${member.status === 'active' ? '● Ενεργό' : '○ Ανενεργό'}
      </span>
    </div>

    ${payments.length === 0 ? `
      <p class="text-muted">Δεν υπάρχουν πληρωμές για αυτό το μέλος</p>
    ` : `
      <div class="mb-1">
        <span class="text-muted">Σύνολο πληρωμών:</span> <strong class="money">${Utils.formatMoney(totalPaid)}</strong>
        <span class="text-muted ml-2">(${payments.length} εγγραφ${payments.length === 1 ? 'ή' : 'ές'})</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ημ. Πληρωμής</th>
              <th>Έτος</th>
              <th>Μήνας</th>
              <th class="text-right">Ποσό</th>
              <th>Σημειώσεις</th>
            </tr>
          </thead>
          <tbody>
            ${payments.map(p => `
              <tr>
                <td>${Utils.formatDate(p.paidDate)}</td>
                <td>${p.year}</td>
                <td>${Utils.getMonthName(p.month)}</td>
                <td class="text-right money">${Utils.formatMoney(p.amount)}</td>
                <td class="text-muted">${Utils.escapeHtml(p.notes || '')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <button class="btn btn-outline btn-sm mt-1 no-print" onclick="window.print()">🖨️ Εκτύπωση</button>
    `}
  `;
}

// ─── EXCEL EXPORT FUNCTIONS ───────────────────────────
function checkSheetJS() {
  if (typeof XLSX === 'undefined') {
    showToast('Απαιτείται σύνδεση στο internet για εξαγωγή Excel (πρώτη φόρτωση SheetJS)', 'error');
    return false;
  }
  return true;
}

function exportMembersExcel() {
  if (!checkSheetJS()) return;
  const members = Store.getMembers().sort((a,b) => a.lastName.localeCompare(b.lastName, 'el'));
  const data = members.map((m, i) => ({
    'Α/Α': i + 1,
    'Επώνυμο': m.lastName,
    'Όνομα': m.firstName,
    'Πατρώνυμο': m.fatherName || '',
    'Αρ. Ταυτότητας': m.idNumber || '',
    'Κατηγορία': Utils.getCategoryLabel(m.category),
    'Τηλέφωνο': m.phone || '',
    'Email': m.email || '',
    'Ημ. Εγγραφής': Utils.formatDate(m.registrationDate),
    'Εισφορά (€)': m.monthlyFee,
    'Κατάσταση': m.status === 'active' ? 'Ενεργό' : 'Ανενεργό',
    'Παιδί (Όνομα)': Utils.getChildFullName(m),
    'Παιδί (Άθλημα)': m.child?.sport || ''
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Μέλη');
  XLSX.writeFile(wb, Utils.sanitizeFilename(`Μέλη_${Utils.formatDateISO(new Date())}`) + '.xlsx');
  showToast('Εξαγωγή μελών ολοκληρώθηκε', 'success');
}

function exportPaymentsExcel() {
  if (!checkSheetJS()) return;
  const payments = Store.getPayments().sort((a,b) => (b.year - a.year) || (b.month - a.month));
  const members = Store.getMembers();
  const receipts = Store.getReceipts();
  const data = payments.map(p => {
    const m = members.find(mm => mm.id === p.memberId);
    const rn = Utils.getReceiptNumberForPayment(p);
    const receipt = p.receiptId ? receipts.find(r => r.id === p.receiptId) : null;
    const status = receipt && receipt.status === 'cancelled' ? 'ΑΚΥΡΟ' : 'Ενεργή';
    return {
      'Αρ. Απόδ.': rn,
      'Ημ. Πληρωμής': Utils.formatDate(p.paidDate),
      'Επώνυμο': m ? m.lastName : 'Διαγραμμένο',
      'Όνομα': m ? m.firstName : '',
      'Έτος': p.year,
      'Μήνας': Utils.getMonthName(p.month),
      'Ποσό (€)': p.amount,
      'Κατάσταση': status,
      'Σημειώσεις': p.notes || ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Πληρωμές');
  XLSX.writeFile(wb, Utils.sanitizeFilename(`Πληρωμές_${Utils.formatDateISO(new Date())}`) + '.xlsx');
  showToast('Εξαγωγή πληρωμών ολοκληρώθηκε', 'success');
}

function exportReceiptsExcel(year) {
  if (!checkSheetJS()) return;
  const receipts = Store.getReceipts()
    .filter(r => r.year === year)
    .sort((a, b) => a.receiptNumber - b.receiptNumber);
  const allPayments = Store.getPayments();
  const members = Store.getMembers();
  const config = Store.getConfig();

  const data = receipts.map(r => {
    const m = members.find(mm => mm.id === r.memberId);
    const linkedPayments = allPayments.filter(p => p.receiptId === r.id);
    const monthsList = linkedPayments.map(p => Utils.getMonthShort(p.month)).join(', ');
    const isCancelled = r.status === 'cancelled';
    return {
      'Αρ. Απόδειξης': r.receiptNumber,
      'Ημ. Πληρωμής': Utils.formatDate(r.paidDate),
      'Επώνυμο': m ? m.lastName : 'Διαγραμμένο',
      'Όνομα': m ? m.firstName : '',
      'Παιδί': m ? Utils.getChildFullName(m) : '',
      'Μήνες': monthsList,
      'Ποσό (€)': r.amount,
      'Κατάσταση': isCancelled ? 'ΑΚΥΡΟ' : 'Ενεργή',
      'Σημειώσεις': r.notes || ''
    };
  });

  // Summary row — only active receipt totals
  const activeReceipts = receipts.filter(r => r.status !== 'cancelled');
  const totalAmount = activeReceipts.reduce((s, r) => s + (r.amount || 0), 0);
  data.push({
    'Αρ. Απόδειξης': '',
    'Ημ. Πληρωμής': '',
    'Επώνυμο': 'ΣΥΝΟΛΟ',
    'Όνομα': `${activeReceipts.length} ενεργές αποδείξεις`,
    'Παιδί': '',
    'Μήνες': '',
    'Ποσό (€)': totalAmount,
    'Κατάσταση': '',
    'Σημειώσεις': ''
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Αποδείξεις ${year}`);
  XLSX.writeFile(wb, Utils.sanitizeFilename(`${config.clubName}_Αποδείξεις_${year}`) + '.xlsx');
  showToast(`Εξαγωγή αποδείξεων ${year} ολοκληρώθηκε`, 'success');
}

function exportAnnualGrid(year) {
  if (!checkSheetJS()) return;
  const config = Store.getConfig();
  const activeMonths = config.activeMonths || [9,10,11,12,1,2,3,4,5,6];
  const members = Store.getMembers().filter(m => m.status === 'active').sort((a,b) => a.lastName.localeCompare(b.lastName, 'el'));

  const data = members.map(m => {
    const row = { 'Μέλος': Utils.getMemberFullName(m) };
    let rowTotal = 0;
    for (let mo = 1; mo <= 12; mo++) {
      if (!activeMonths.includes(mo)) {
        row[MONTHS_SHORT[mo-1]] = '—';
        continue;
      }
      const payment = Utils.isMemberPaidForMonth(m.id, year, mo);
      const shouldPay = Utils.memberShouldPay(m, mo, year);
      if (payment) {
        row[MONTHS_SHORT[mo-1]] = payment.amount;
        rowTotal += payment.amount;
      } else if (shouldPay) {
        row[MONTHS_SHORT[mo-1]] = '✗';
      } else {
        row[MONTHS_SHORT[mo-1]] = '—';
      }
    }
    row['Σύνολο'] = rowTotal;
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Ετήσια ${year}`);
  XLSX.writeFile(wb, Utils.sanitizeFilename(`Ετήσια_Εικόνα_${year}`) + '.xlsx');
  showToast('Εξαγωγή ετήσιας εικόνας ολοκληρώθηκε', 'success');
}

function exportDebtors(year) {
  if (!checkSheetJS()) return;
  const members = Store.getMembers().filter(m => m.status === 'active');
  const debtors = [];
  members.forEach(m => {
    const debt = Utils.getMemberDebt(m, year);
    if (debt.months.length > 0) {
      debtors.push({
        'Μέλος': Utils.getMemberFullName(m),
        'Παιδί': Utils.getChildFullName(m),
        'Μήνες Οφειλής': debt.months.map(mm => MONTHS_SHORT[mm-1]).join(', '),
        'Πλήθος Μηνών': debt.months.length,
        'Οφειλόμενο (€)': debt.totalAmount
      });
    }
  });
  debtors.sort((a,b) => b['Οφειλόμενο (€)'] - a['Οφειλόμενο (€)']);

  const ws = XLSX.utils.json_to_sheet(debtors);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Οφειλέτες ${year}`);
  XLSX.writeFile(wb, Utils.sanitizeFilename(`Οφειλέτες_${year}`) + '.xlsx');
  showToast('Εξαγωγή οφειλετών ολοκληρώθηκε', 'success');
}

function exportMonthlyCollections(year) {
  if (!checkSheetJS()) return;
  const payments = Store.getPayments().filter(p => p.year === year);
  const data = [];
  for (let m = 1; m <= 12; m++) {
    const monthPayments = payments.filter(p => p.month === m);
    data.push({
      'Μήνας': MONTHS_GR[m-1],
      'Πληρωμές': monthPayments.length,
      'Ποσό (€)': monthPayments.reduce((s, p) => s + (p.amount || 0), 0)
    });
  }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Εισπράξεις ${year}`);
  XLSX.writeFile(wb, Utils.sanitizeFilename(`Εισπράξεις_ανά_Μήνα_${year}`) + '.xlsx');
  showToast('Εξαγωγή εισπράξεων ολοκληρώθηκε', 'success');
}

function exportYearlyCollections() {
  if (!checkSheetJS()) return;
  const payments = Store.getPayments();
  const yearMap = {};
  payments.forEach(p => {
    if (!yearMap[p.year]) yearMap[p.year] = { total: 0, count: 0 };
    yearMap[p.year].total += p.amount || 0;
    yearMap[p.year].count++;
  });
  const data = Object.keys(yearMap).sort().map(y => ({
    'Έτος': parseInt(y),
    'Πληρωμές': yearMap[y].count,
    'Σύνολο (€)': yearMap[y].total
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ετήσιες Εισπράξεις');
  XLSX.writeFile(wb, Utils.sanitizeFilename('Εισπράξεις_ανά_Έτος') + '.xlsx');
  showToast('Εξαγωγή ετήσιων εισπράξεων ολοκληρώθηκε', 'success');
}

// ─── FILE CONNECT MODAL ───────────────────────────────
function showFileConnectModal() {
  const hasPending = !!FileStorage._pendingHandle;
  const pendingName = hasPending ? FileStorage._pendingHandle.name : '';

  Modals.open(`
    <div class="modal-header">
      <h3>📁 Σύνδεση Αρχείου Δεδομένων</h3>
      <button class="modal-close" onclick="Modals.close()">&times;</button>
    </div>
    <div class="modal-body">
      <p class="text-muted mb-2" style="font-size:0.9rem">
        Επιλέξτε ένα αρχείο .json για μόνιμη αποθήκευση όλων των δεδομένων.
        Κάθε αλλαγή θα σώζεται αυτόματα στο αρχείο.
      </p>

      ${hasPending ? `
        <button class="welcome-action-btn" style="width:100%;margin-bottom:12px;border-color:var(--accent)" onclick="reconnectPendingFile()">
          <span class="wab-icon">🔄</span>
          <span class="wab-text">
            <strong>Επανασύνδεση: ${Utils.escapeHtml(pendingName)}</strong>
            <span>Συνέχεια με το τελευταίο αρχείο</span>
          </span>
        </button>
      ` : ''}

      <div class="welcome-actions">
        <button class="welcome-action-btn" onclick="createNewFileFromModal()">
          <span class="wab-icon">📄</span>
          <span class="wab-text">
            <strong>Δημιουργία Νέου Αρχείου</strong>
            <span>Ξεκινήστε από την αρχή με κενή βάση</span>
          </span>
        </button>
        <button class="welcome-action-btn" onclick="openExistingFileFromModal()">
          <span class="wab-icon">📂</span>
          <span class="wab-text">
            <strong>Άνοιγμα Υπάρχοντος Αρχείου</strong>
            <span>Φόρτωση δεδομένων από αρχείο .json</span>
          </span>
        </button>
      </div>

      ${!FileStorage.isSupported() ? `
        <div class="alert alert-danger mt-2">
          ⚠️ Ο browser σας δεν υποστηρίζει File System API.<br>
          Χρησιμοποιήστε <strong>Google Chrome</strong> ή <strong>Microsoft Edge</strong> για αυτόματη αποθήκευση σε αρχείο.
          <br><br>Εναλλακτικά, τα δεδομένα θα αποθηκευτούν στον browser (localStorage) — 
          χρησιμοποιήστε τακτικά Backup.
        </div>
      ` : ''}
    </div>
  `);
}

async function createNewFileFromModal() {
  Modals.close();
  const ok = await FileStorage.createNewFile();
  if (ok) {
    const config = Store.getConfig();
    document.getElementById('sidebar-club-name').textContent = config.clubName;
    navigate('dashboard');
  }
}

async function openExistingFileFromModal() {
  Modals.close();
  const ok = await FileStorage.openExistingFile();
  if (ok) {
    const config = Store.getConfig();
    document.getElementById('sidebar-club-name').textContent = config.clubName;
    navigate('dashboard');
  }
}

async function reconnectPendingFile() {
  Modals.close();
  const ok = await FileStorage.requestPendingPermission();
  if (ok) {
    const config = Store.getConfig();
    document.getElementById('sidebar-club-name').textContent = config.clubName;
    showToast('Επανασυνδέθηκε στο αρχείο', 'success');
    navigate('dashboard');
  } else {
    showToast('Δεν δόθηκε άδεια πρόσβασης', 'warning');
  }
}

// ─── CLOSE DROPDOWNS ON OUTSIDE CLICK ─────────────────
document.addEventListener('click', (e) => {
  if (!e.target.closest('#payment-member-search') && !e.target.closest('#payment-member-dropdown')) {
    const dd = document.getElementById('payment-member-dropdown');
    if (dd) dd.classList.remove('show');
  }
  if (!e.target.closest('#report-member-search') && !e.target.closest('#report-member-dropdown')) {
    const dd = document.getElementById('report-member-dropdown');
    if (dd) dd.classList.remove('show');
  }
});
