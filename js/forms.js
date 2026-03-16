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
        <button class="tab active" onclick="switchMemberTab('parent')">👤 Γονιός / Μέλος</button>
        <button class="tab" onclick="switchMemberTab('child')">🧒 Αθλούμενος</button>
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
              <select class="form-control" name="status">
                <option value="active" ${!member || member.status === 'active' ? 'selected' : ''}>Ενεργό</option>
                <option value="inactive" ${member && member.status === 'inactive' ? 'selected' : ''}>Ανενεργό</option>
              </select>
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
    dateOfBirth: fd.get('dateOfBirth') || '',
    address: fd.get('address')?.trim() || '',
    phone: fd.get('phone')?.trim() || '',
    email: fd.get('email')?.trim() || '',
    profession: fd.get('profession')?.trim() || '',
    registrationDate: fd.get('registrationDate') || '',
    category: fd.get('category'),
    monthlyFee: parseFloat(fd.get('monthlyFee')) || 0,
    status: fd.get('status') || 'active',
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

        <div class="form-group">
          <label>Μήνες <span class="required">*</span></label>
          <div class="month-check-grid">
            ${MONTHS_SHORT.map((m, i) => `
              <label class="month-check-label">
                <input type="checkbox" name="months" value="${i + 1}" ${preMonth === (i + 1) ? 'checked' : ''}>
                <span>${m}</span>
              </label>
            `).join('')}
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
        💶 Καταχώρηση
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
