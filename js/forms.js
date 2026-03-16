// ─── MEMBER FORM ──────────────────────────────────────
function openMemberForm(memberId = null) {
  const isEdit = memberId !== null;
  let member = null;
  if (isEdit) {
    const members = Store.getMembers();
    member = members.find(m => m.id === memberId);
    if (!member) { showToast('Μέλος δεν βρέθηκε', 'error'); return; }
  }

  const config = Store.getConfig();
  const catOptions = config.categories.map(c =>
    `<option value="${c.id}" ${member && member.category === c.id ? 'selected' : ''}>${Utils.escapeHtml(c.label)} (${Utils.formatMoney(c.fee)})</option>`
  ).join('');

  Modals.open(`
    <div class="modal-header">
      <h3>${isEdit ? 'Επεξεργασία Μέλους' : 'Νέο Μέλος'}</h3>
      <button class="modal-close" onclick="Modals.close()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="tabs" id="member-form-tabs">
        <button class="tab active" onclick="switchMemberTab('parent')"><i class="fa-solid fa-user"></i> Γονιός / Μέλος</button>
        <button class="tab" onclick="switchMemberTab('child')"><i class="fa-solid fa-child"></i> Αθλούμενος</button>
      </div>

      <form id="member-form" onsubmit="saveMember(event, '${memberId || ''}')">
        <!-- Parent Tab -->
        <div id="tab-parent" class="tab-content active">
          <div class="form-row">
            <div class="form-group">
              <label>Επώνυμο <span class="required">*</span></label>
              <input type="text" class="form-control" name="lastName" value="${member ? Utils.escapeHtml(member.lastName) : ''}" required>
            </div>
            <div class="form-group">
              <label>Όνομα <span class="required">*</span></label>
              <input type="text" class="form-control" name="firstName" value="${member ? Utils.escapeHtml(member.firstName) : ''}" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Πατρώνυμο</label>
              <input type="text" class="form-control" name="fatherName" value="${member ? Utils.escapeHtml(member.fatherName || '') : ''}">
            </div>
            <div class="form-group">
              <label>Αρ. Ταυτότητας</label>
              <input type="text" class="form-control" name="idNumber" value="${member ? Utils.escapeHtml(member.idNumber || '') : ''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>ΑΦΜ <span class="required">*</span></label>
              <input type="text" class="form-control" name="afm" value="${member ? Utils.escapeHtml(member.afm || '') : ''}" pattern="\\d{9}" maxlength="9" title="9 ψηφία" placeholder="123456789">
            </div>
            <div class="form-group"></div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Ημ. Γέννησης</label>
              <input type="date" class="form-control" name="dateOfBirth" value="${member ? member.dateOfBirth || '' : ''}">
            </div>
            <div class="form-group">
              <label>Ημ. Εγγραφής <span class="required">*</span></label>
              <input type="date" class="form-control" name="registrationDate" value="${member ? member.registrationDate || '' : Utils.todayISO()}" required>
            </div>
          </div>
          <div class="form-group">
            <label>Διεύθυνση</label>
            <input type="text" class="form-control" name="address" value="${member ? Utils.escapeHtml(member.address || '') : ''}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Τηλέφωνο <span class="required">*</span></label>
              <input type="tel" class="form-control" name="phone" value="${member ? Utils.escapeHtml(member.phone || '') : ''}" required>
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" class="form-control" name="email" value="${member ? Utils.escapeHtml(member.email || '') : ''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Επάγγελμα</label>
              <input type="text" class="form-control" name="profession" value="${member ? Utils.escapeHtml(member.profession || '') : ''}">
            </div>
            <div class="form-group">
              <label>Κατηγορία <span class="required">*</span></label>
              <select class="form-control" name="category" onchange="onCategoryChange(this)" required>
                ${catOptions}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Μηνιαία Εισφορά (€)</label>
              <input type="number" class="form-control" name="monthlyFee" step="0.01" min="0" value="${member ? member.monthlyFee : Utils.getCategoryFee(config.categories[0]?.id || 'adult')}">
            </div>
            <div class="form-group">
              <label>Κατάσταση</label>
              <select class="form-control" name="status" onchange="document.getElementById('departure-fields').style.display = this.value === 'inactive' ? '' : 'none'">
                <option value="active" ${!member || member.status === 'active' ? 'selected' : ''}>Ενεργό</option>
                <option value="inactive" ${member && member.status === 'inactive' ? 'selected' : ''}>Ανενεργό</option>
              </select>
            </div>
          </div>
          <div class="form-row" id="departure-fields" style="${!member || member.status === 'active' ? 'display:none' : ''}">
            <div class="form-group">
              <label>Ημ. Αποχώρησης</label>
              <input type="date" class="form-control" name="departureDate" value="${member ? member.departureDate || '' : ''}">
            </div>
            <div class="form-group">
              <label>Λόγος Αποχώρησης</label>
              <input type="text" class="form-control" name="departureReason" value="${member ? Utils.escapeHtml(member.departureReason || '') : ''}" placeholder="π.χ. Αίτηση διαγραφής">
            </div>
          </div>
          <div class="form-group">
            <label>Σημειώσεις</label>
            <textarea class="form-control" name="notes" rows="2">${member ? Utils.escapeHtml(member.notes || '') : ''}</textarea>
          </div>
        </div>

        <!-- Child Tab -->
        <div id="tab-child" class="tab-content">
          <div class="form-row">
            <div class="form-group">
              <label>Επώνυμο Παιδιού</label>
              <input type="text" class="form-control" name="childLastName" value="${member && member.child ? Utils.escapeHtml(member.child.lastName || '') : ''}">
            </div>
            <div class="form-group">
              <label>Όνομα Παιδιού</label>
              <input type="text" class="form-control" name="childFirstName" value="${member && member.child ? Utils.escapeHtml(member.child.firstName || '') : ''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Ημ. Γέννησης Παιδιού</label>
              <input type="date" class="form-control" name="childDateOfBirth" value="${member && member.child ? member.child.dateOfBirth || '' : ''}">
            </div>
            <div class="form-group">
              <label>Άθλημα / Τμήμα</label>
              <input type="text" class="form-control" name="childSport" value="${member && member.child ? Utils.escapeHtml(member.child.sport || '') : ''}">
            </div>
          </div>
          <div class="form-group">
            <label>Σημειώσεις Παιδιού</label>
            <textarea class="form-control" name="childNotes" rows="2">${member && member.child ? Utils.escapeHtml(member.child.notes || '') : ''}</textarea>
          </div>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="Modals.close()">Ακύρωση</button>
      <button class="btn btn-primary" onclick="document.getElementById('member-form').requestSubmit()">
        ${isEdit ? 'Αποθήκευση' : 'Προσθήκη'}
      </button>
    </div>
  `, true);
}

function switchMemberTab(tab) {
  document.querySelectorAll('#member-form-tabs .tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  if (tab === 'parent') {
    document.querySelector('#member-form-tabs .tab:first-child').classList.add('active');
    document.getElementById('tab-parent').classList.add('active');
  } else {
    document.querySelector('#member-form-tabs .tab:last-child').classList.add('active');
    document.getElementById('tab-child').classList.add('active');
  }
}

function onCategoryChange(select) {
  const fee = Utils.getCategoryFee(select.value);
  const feeInput = document.querySelector('#member-form [name="monthlyFee"]');
  if (feeInput) feeInput.value = fee;
}

function saveMember(e, editId) {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const members = Store.getMembers();
  const now = new Date().toISOString();

  const memberData = {
    lastName: fd.get('lastName').trim(),
    firstName: fd.get('firstName').trim(),
    fatherName: fd.get('fatherName')?.trim() || '',
    idNumber: fd.get('idNumber')?.trim() || '',
    afm: fd.get('afm')?.trim() || '',
    dateOfBirth: fd.get('dateOfBirth') || '',
    address: fd.get('address')?.trim() || '',
    phone: fd.get('phone')?.trim() || '',
    email: fd.get('email')?.trim() || '',
    profession: fd.get('profession')?.trim() || '',
    registrationDate: fd.get('registrationDate') || '',
    category: fd.get('category'),
    monthlyFee: parseFloat(fd.get('monthlyFee')) || 0,
    status: fd.get('status') || 'active',
    departureDate: fd.get('departureDate') || '',
    departureReason: fd.get('departureReason')?.trim() || '',
    notes: fd.get('notes')?.trim() || '',
    child: {
      lastName: fd.get('childLastName')?.trim() || '',
      firstName: fd.get('childFirstName')?.trim() || '',
      dateOfBirth: fd.get('childDateOfBirth') || '',
      sport: fd.get('childSport')?.trim() || '',
      notes: fd.get('childNotes')?.trim() || ''
    },
    updatedAt: now
  };

  // Validate required fields
  if (!memberData.lastName || !memberData.firstName) {
    showToast('Συμπληρώστε Επώνυμο και Όνομα', 'error');
    return;
  }
  if (!memberData.phone) {
    showToast('Συμπληρώστε Τηλέφωνο', 'error');
    return;
  }

  if (editId) {
    const idx = members.findIndex(m => m.id === editId);
    if (idx === -1) { showToast('Μέλος δεν βρέθηκε', 'error'); return; }
    members[idx] = { ...members[idx], ...memberData };
    Store.saveMembers(members);
    showToast('Το μέλος ενημερώθηκε επιτυχώς', 'success');
  } else {
    memberData.id = Utils.generateId();
    memberData.memberNumber = Utils.incrementMemberCounter();
    memberData.createdAt = now;
    members.push(memberData);
    Store.saveMembers(members);
    showToast('Το μέλος προστέθηκε επιτυχώς', 'success');
  }

  Modals.close();
  renderView();
}

function deleteMember(id) {
  const members = Store.getMembers();
  const member = members.find(m => m.id === id);
  if (!member) return;
  Modals.confirm(
    `Διαγραφή μέλους: ${Utils.getMemberFullName(member)};`,
    'Θα διαγραφούν και όλες οι πληρωμές αυτού του μέλους.',
    () => {
      const updated = members.filter(m => m.id !== id);
      Store.saveMembers(updated);
      // Also delete payments and receipts
      const payments = Store.getPayments().filter(p => p.memberId !== id);
      Store.savePayments(payments);
      const receipts = Store.getReceipts().filter(r => r.memberId !== id);
      Store.saveReceipts(receipts);
      showToast('Το μέλος διαγράφηκε', 'success');
      if (State.currentView === 'memberDetail') {
        navigate('members');
      } else {
        renderView();
      }
    }
  );
}

// ─── PAYMENT FORM ─────────────────────────────────────
function openPaymentForm(memberId = null, preMonth = null, preYear = null) {
  const members = Store.getMembers().filter(m => m.status === 'active');
  const year = preYear || State.currentYear;
  const member = memberId ? members.find(m => m.id === memberId) : null;

  Modals.open(`
    <div class="modal-header">
      <h3>Καταχώρηση Πληρωμής</h3>
      <button class="modal-close" onclick="Modals.close()">&times;</button>
    </div>
    <div class="modal-body">
      <form id="payment-form" onsubmit="savePayment(event)">
        <div class="form-group">
          <label>Μέλος <span class="required">*</span></label>
          <div style="position:relative">
            <input type="text" class="form-control" id="payment-member-search"
              placeholder="Αναζήτηση μέλους..."
              value="${member ? Utils.getMemberFullName(member) : ''}"
              oninput="searchMemberForPayment(this.value)"
              onfocus="searchMemberForPayment(this.value)"
              autocomplete="off">
            <input type="hidden" name="memberId" id="payment-member-id" value="${memberId || ''}">
            <div class="member-search-dropdown" id="payment-member-dropdown"></div>
          </div>
          ${member ? `<div class="mt-1 text-muted" style="font-size:0.82rem">
            ${member.child?.firstName ? 'Παιδί: ' + Utils.getChildFullName(member) : ''} · 
            Εισφορά: ${Utils.formatMoney(member.monthlyFee)}
          </div>` : ''}
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Έτος <span class="required">*</span></label>
            <input type="number" class="form-control" name="year" value="${year}" min="2015" max="2035" required>
          </div>
          <div class="form-group">
            <label>Ημ. Πληρωμής</label>
            <input type="date" class="form-control" name="paidDate" value="${Utils.todayISO()}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Τρόπος Πληρωμής</label>
            <select class="form-control" name="paymentMethod">
              ${PAYMENT_METHODS.map(pm => `<option value="${pm.id}">${pm.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"></div>
        </div>

        <div class="form-group">
          <label>Μήνες <span class="required">*</span></label>
          <div class="month-check-grid">
            ${(() => {
              const cfg = Store.getConfig();
              const am = cfg.activeMonths || [9,10,11,12,1,2,3,4,5,6];
              return MONTHS_SHORT.map((m, i) => {
                const monthNum = i + 1;
                const isActive = am.includes(monthNum);
                return `
                  <label class="month-check-label ${!isActive ? 'month-inactive' : ''}">
                    <input type="checkbox" name="months" value="${monthNum}"
                      ${preMonth === monthNum ? 'checked' : ''}
                      ${!isActive ? 'disabled' : ''}>
                    <span>${m}</span>
                  </label>
                `;
              }).join('');
            })()}
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Ποσό ανά μήνα (€)</label>
            <input type="number" class="form-control" name="amount" step="0.01" min="0"
              value="${member ? member.monthlyFee : ''}" id="payment-amount">
          </div>
          <div class="form-group">
            <label>Σημειώσεις</label>
            <input type="text" class="form-control" name="notes" placeholder="π.χ. Μερική πληρωμή">
          </div>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="Modals.close()">Ακύρωση</button>
      <button class="btn btn-success" onclick="document.getElementById('payment-form').requestSubmit()">
        <i class="fa-solid fa-coins"></i> Καταχώρηση
      </button>
    </div>
  `);
}

function searchMemberForPayment(query) {
  const dropdown = document.getElementById('payment-member-dropdown');
  if (!query || query.length < 1) {
    dropdown.classList.remove('show');
    return;
  }
  const members = Store.getMembers().filter(m => m.status === 'active');
  const q = query.toLowerCase();
  const results = members.filter(m =>
    Utils.getMemberFullName(m).toLowerCase().includes(q) ||
    Utils.getChildFullName(m).toLowerCase().includes(q) ||
    (m.idNumber && m.idNumber.toLowerCase().includes(q))
  ).slice(0, 8);

  if (results.length === 0) {
    dropdown.classList.remove('show');
    return;
  }

  dropdown.innerHTML = results.map(m => `
    <div class="member-search-result" onclick="selectMemberForPayment('${m.id}')">
      <div class="msr-name">${Utils.escapeHtml(Utils.getMemberFullName(m))}</div>
      ${m.child?.firstName ? `<div class="msr-child">Παιδί: ${Utils.escapeHtml(Utils.getChildFullName(m))} · ${Utils.escapeHtml(m.child.sport || '')}</div>` : ''}
    </div>
  `).join('');
  dropdown.classList.add('show');
}

function selectMemberForPayment(memberId) {
  const members = Store.getMembers();
  const member = members.find(m => m.id === memberId);
  if (!member) return;
  document.getElementById('payment-member-search').value = Utils.getMemberFullName(member);
  document.getElementById('payment-member-id').value = memberId;
  document.getElementById('payment-member-dropdown').classList.remove('show');
  const amountInput = document.getElementById('payment-amount');
  if (amountInput && !amountInput.value) amountInput.value = member.monthlyFee;
}

function savePayment(e) {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const memberId = fd.get('memberId');
  const year = parseInt(fd.get('year'));
  const amount = parseFloat(fd.get('amount'));
  const paidDate = fd.get('paidDate') || Utils.todayISO();
  const notes = fd.get('notes')?.trim() || '';
  const paymentMethod = fd.get('paymentMethod') || 'cash';
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
    paymentMethod,
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
      paymentMethod,
      notes,
      createdAt: new Date().toISOString()
    });
    newPaymentIds.push(paymentId);
  });

  Store.saveReceipts(receipts);
  Store.savePayments(payments);

  // Auto-create income transaction for the income-expense book
  const transactions = Store.getTransactions();
  const txMember = Store.getMembers().find(m => m.id === memberId);
  transactions.push({
    id: Utils.generateId(),
    type: 'income',
    date: paidDate,
    amount: totalAmount,
    category: 'subscriptions',
    description: `Συνδρομή: ${txMember ? Utils.getMemberFullName(txMember) : 'Άγνωστο μέλος'} — ${validMonths.map(m => Utils.getMonthShort(m)).join(', ')} ${year}`,
    documentNumber: `ΑΠ-${receiptNumber}/${year}`,
    documentType: 'receipt',
    paymentMethod: paymentMethod || 'cash',
    relatedReceiptId: receiptId,
    notes: notes,
    status: 'active',
    createdAt: new Date().toISOString()
  });
  Store.saveTransactions(transactions);

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
      // Mark linked transaction as cancelled
      const transactions = Store.getTransactions();
      const linkedTx = transactions.find(t => t.relatedReceiptId === receiptId);
      if (linkedTx) {
        linkedTx.status = 'cancelled';
        linkedTx.cancelledAt = new Date().toISOString();
        Store.saveTransactions(transactions);
      }
      showToast(`Η απόδειξη #${receipt.receiptNumber} ακυρώθηκε`, 'success');
      renderView();
    }
  );
}

// ─── TRANSACTION FORM (INCOME-EXPENSE BOOK) ──────────
function openTransactionForm(type = 'expense', txId = null) {
  const isEdit = txId !== null;
  let tx = null;
  if (isEdit) {
    tx = Store.getTransactions().find(t => t.id === txId);
    if (!tx) { showToast('Εγγραφή δεν βρέθηκε', 'error'); return; }
    type = tx.type;
  }

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const catOptions = categories
    .filter(c => c.id !== 'subscriptions')
    .map(c => `<option value="${c.id}" ${tx && tx.category === c.id ? 'selected' : ''}>${c.label}</option>`)
    .join('');

  const title = type === 'income' ? 'Καταχώρηση Εσόδου' : 'Καταχώρηση Εξόδου';
  const icon = type === 'income' ? 'fa-arrow-down' : 'fa-arrow-up';
  const btnClass = type === 'income' ? 'btn-success' : 'btn-danger';

  Modals.open(`
    <div class="modal-header">
      <h3><i class="fa-solid ${icon}"></i> ${isEdit ? 'Επεξεργασία' : title}</h3>
      <button class="modal-close" onclick="Modals.close()">&times;</button>
    </div>
    <div class="modal-body">
      <form id="transaction-form" onsubmit="saveTransaction(event, '${type}', '${txId || ''}')">
        <input type="hidden" name="type" value="${type}">
        <div class="form-row">
          <div class="form-group">
            <label>Ημερομηνία <span class="required">*</span></label>
            <input type="date" class="form-control" name="date" value="${tx ? tx.date : Utils.todayISO()}" required>
          </div>
          <div class="form-group">
            <label>Κατηγορία <span class="required">*</span></label>
            <select class="form-control" name="category" required>
              <option value="">— Επιλέξτε —</option>
              ${catOptions}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Περιγραφή <span class="required">*</span></label>
          <input type="text" class="form-control" name="description" value="${tx ? Utils.escapeHtml(tx.description || '') : ''}" required placeholder="π.χ. Κορμάκια για αγώνες">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Ποσό (€) <span class="required">*</span></label>
            <input type="number" class="form-control" name="amount" step="0.01" min="0.01" value="${tx ? tx.amount : ''}" required>
          </div>
          <div class="form-group">
            <label>Τρόπος Πληρωμής</label>
            <select class="form-control" name="paymentMethod">
              ${PAYMENT_METHODS.map(pm => `<option value="${pm.id}" ${tx && tx.paymentMethod === pm.id ? 'selected' : ''}>${pm.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Αρ. Παραστατικού</label>
            <input type="text" class="form-control" name="documentNumber" value="${tx ? Utils.escapeHtml(tx.documentNumber || '') : ''}" placeholder="π.χ. ΤΙΜ-1234">
          </div>
          <div class="form-group">
            <label>Τύπος Παραστατικού</label>
            <select class="form-control" name="documentType">
              <option value="receipt" ${tx && tx.documentType === 'receipt' ? 'selected' : ''}>Απόδειξη</option>
              <option value="invoice" ${tx && tx.documentType === 'invoice' ? 'selected' : ''}>Τιμολόγιο</option>
              <option value="bank_statement" ${tx && tx.documentType === 'bank_statement' ? 'selected' : ''}>Κίνηση Τράπεζας</option>
              <option value="other" ${tx && tx.documentType === 'other' ? 'selected' : ''}>Άλλο</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Σημειώσεις</label>
          <textarea class="form-control" name="notes" rows="2">${tx ? Utils.escapeHtml(tx.notes || '') : ''}</textarea>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="Modals.close()">Ακύρωση</button>
      <button class="btn ${btnClass}" onclick="document.getElementById('transaction-form').requestSubmit()">
        <i class="fa-solid fa-floppy-disk"></i> ${isEdit ? 'Αποθήκευση' : 'Καταχώρηση'}
      </button>
    </div>
  `, true);
}

function saveTransaction(e, type, editId) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const transactions = Store.getTransactions();
  const now = new Date().toISOString();

  const txData = {
    type: type,
    date: fd.get('date'),
    amount: parseFloat(fd.get('amount')),
    category: fd.get('category'),
    description: fd.get('description')?.trim() || '',
    documentNumber: fd.get('documentNumber')?.trim() || '',
    documentType: fd.get('documentType') || 'receipt',
    paymentMethod: fd.get('paymentMethod') || 'cash',
    notes: fd.get('notes')?.trim() || '',
    relatedReceiptId: null,
    updatedAt: now
  };

  if (!txData.date) { showToast('Εισάγετε ημερομηνία', 'error'); return; }
  if (!txData.category) { showToast('Επιλέξτε κατηγορία', 'error'); return; }
  if (!txData.description) { showToast('Εισάγετε περιγραφή', 'error'); return; }
  if (isNaN(txData.amount) || txData.amount <= 0) { showToast('Εισάγετε έγκυρο ποσό', 'error'); return; }

  if (editId) {
    const idx = transactions.findIndex(t => t.id === editId);
    if (idx === -1) { showToast('Εγγραφή δεν βρέθηκε', 'error'); return; }
    transactions[idx] = { ...transactions[idx], ...txData };
    Store.saveTransactions(transactions);
    showToast('Η εγγραφή ενημερώθηκε', 'success');
  } else {
    txData.id = Utils.generateId();
    txData.status = 'active';
    txData.createdAt = now;
    transactions.push(txData);
    Store.saveTransactions(transactions);
    const label = type === 'income' ? 'Το έσοδο' : 'Το έξοδο';
    showToast(`${label} καταχωρήθηκε`, 'success');
  }

  Modals.close();
  renderView();
}

function deleteTransaction(txId) {
  const transactions = Store.getTransactions();
  const tx = transactions.find(t => t.id === txId);
  if (!tx) return;
  if (tx.relatedReceiptId) {
    showToast('Δεν μπορεί να διαγραφεί — συνδέεται με απόδειξη συνδρομής', 'error');
    return;
  }
  Modals.confirm(
    'Διαγραφή εγγραφής;',
    `${tx.description} — ${Utils.formatMoney(tx.amount)}`,
    () => {
      const updated = transactions.filter(t => t.id !== txId);
      Store.saveTransactions(updated);
      showToast('Η εγγραφή διαγράφηκε', 'success');
      renderView();
    }
  );
}
