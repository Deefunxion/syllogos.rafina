// ─── VIEWS ────────────────────────────────────────────
const Views = {

  // ── Dashboard ──
  dashboard() {
    const members = Store.getMembers();
    const payments = Store.getPayments();
    const config = Store.getConfig();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const activeMembers = members.filter(m => m.status === 'active');
    const totalMembers = activeMembers.length;

    // Unpaid this month
    let unpaidCount = 0;
    activeMembers.forEach(m => {
      if (Utils.memberShouldPay(m, month, year)) {
        if (!Utils.isMemberPaidForMonth(m.id, year, month)) {
          unpaidCount++;
        }
      }
    });

    // Collections this month
    const monthPayments = payments.filter(p => p.year === year && p.month === month);
    const monthTotal = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);

    // Collections this year
    const yearPayments = payments.filter(p => p.year === year);
    const yearTotal = yearPayments.reduce((s, p) => s + (p.amount || 0), 0);

    // Last 5 payments
    const recentPayments = [...payments].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5);
    const receipts = Store.getReceipts();

    return `
      <div class="view-header">
        <h2><i class="fa-solid fa-gauge-high"></i> Αρχική</h2>
      </div>

      ${!FileStorage.isConnected() && FileStorage.isSupported() ? `
        <div class="alert alert-warning mb-2 no-print" style="cursor:pointer" onclick="showFileConnectModal()">
          <i class="fa-solid fa-triangle-exclamation"></i> <strong>Τα δεδομένα δεν αποθηκεύονται σε αρχείο.</strong> 
          Κάντε κλικ εδώ για να συνδέσετε ένα αρχείο μόνιμης αποθήκευσης.
        </div>
      ` : ''}

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue"><i class="fa-solid fa-users"></i></div>
          <div class="stat-info">
            <h4>Ενεργά Μέλη</h4>
            <div class="stat-value">${totalMembers}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <div class="stat-info">
            <h4>Ανεξόφλητα (${MONTHS_SHORT[month - 1]})</h4>
            <div class="stat-value ${unpaidCount > 0 ? 'danger' : ''}">${unpaidCount}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><i class="fa-solid fa-coins"></i></div>
          <div class="stat-info">
            <h4>Εισπράξεις Μήνα</h4>
            <div class="stat-value money">${Utils.formatMoney(monthTotal)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon gold"><i class="fa-solid fa-calendar-days"></i></div>
          <div class="stat-info">
            <h4>Εισπράξεις Έτους</h4>
            <div class="stat-value money">${Utils.formatMoney(yearTotal)}</div>
          </div>
        </div>
      </div>

      <div class="quick-actions no-print">
        <button class="quick-action-btn" onclick="openMemberForm()">
          <span class="qa-icon"><i class="fa-solid fa-user-plus"></i></span> Νέο Μέλος
        </button>
        <button class="quick-action-btn" onclick="openPaymentForm()">
          <span class="qa-icon"><i class="fa-solid fa-coins"></i></span> Καταχώρηση Πληρωμής
        </button>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Πρόσφατες Πληρωμές</h3>
        </div>
        ${recentPayments.length === 0 ? `
          <div class="empty-state">
            <span class="empty-icon"><i class="fa-solid fa-money-bill-transfer"></i></span>
            <h3>Δεν υπάρχουν πληρωμές</h3>
            <p>Ξεκινήστε καταχωρώντας πληρωμές μελών</p>
          </div>
        ` : `
          <div class="table-wrap" style="border:none;box-shadow:none">
            <table>
              <thead>
                <tr>
                  <th>Αρ.</th>
                  <th>Ημ/νία</th>
                  <th>Μέλος</th>
                  <th>Περίοδος</th>
                  <th class="text-right">Ποσό</th>
                </tr>
              </thead>
              <tbody>
                ${recentPayments.map(p => {
                  const m = members.find(mm => mm.id === p.memberId);
                  const receipt = receipts.find(r => r.id === p.receiptId);
                  const rn = receipt ? receipt.receiptNumber : (p.receiptNumber || '?');
                  const isCancelled = receipt && receipt.status === 'cancelled';
                  return `<tr${isCancelled ? ' style="opacity:0.6"' : ''}>
                    <td><span class="receipt-badge">#${rn}</span>${isCancelled ? ' <span class="badge badge-inactive" style="font-size:0.7rem">ΑΚΥΡΟ</span>' : ''}</td>
                    <td${isCancelled ? ' style="text-decoration:line-through"' : ''}>${Utils.formatDate(p.paidDate)}</td>
                    <td>${m ? Utils.escapeHtml(Utils.getMemberFullName(m)) : '<em>Διαγραμμένο</em>'}</td>
                    <td>${Utils.getMonthShort(p.month)} ${p.year}</td>
                    <td class="text-right money"${isCancelled ? ' style="text-decoration:line-through"' : ''}>${Utils.formatMoney(p.amount)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },

  // ── Member List ──
  memberList() {
    const members = Store.getMembers();
    let filtered = [...members];

    // Filter by status
    if (State.filterStatus === 'active') filtered = filtered.filter(m => m.status === 'active');
    else if (State.filterStatus === 'inactive') filtered = filtered.filter(m => m.status === 'inactive');

    // Filter by category
    if (State.filterCategory !== 'all') filtered = filtered.filter(m => m.category === State.filterCategory);

    // Search
    if (State.searchQuery) {
      const q = State.searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        Utils.getMemberFullName(m).toLowerCase().includes(q) ||
        Utils.getChildFullName(m).toLowerCase().includes(q) ||
        (m.idNumber && m.idNumber.toLowerCase().includes(q)) ||
        (m.phone && m.phone.includes(q))
      );
    }

    // Sort by last name
    filtered.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '', 'el'));

    const config = Store.getConfig();
    const catOptions = config.categories.map(c =>
      `<option value="${c.id}" ${State.filterCategory === c.id ? 'selected' : ''}>${Utils.escapeHtml(c.label)}</option>`
    ).join('');

    return `
      <div class="view-header">
        <h2><i class="fa-solid fa-id-card"></i> Μητρώο Μελών</h2>
        <div class="view-header-actions no-print">
          <button class="btn btn-primary" onclick="openMemberForm()"><i class="fa-solid fa-plus"></i> Νέο Μέλος</button>
        </div>
      </div>

      <div class="toolbar no-print">
        <div class="search-input">
          <input type="text" placeholder="Αναζήτηση μέλους..."
            value="${Utils.escapeHtml(State.searchQuery)}"
            oninput="State.searchQuery = this.value; renderView()">
        </div>
        <select class="filter-select" onchange="State.filterStatus = this.value; renderView()">
          <option value="all" ${State.filterStatus === 'all' ? 'selected' : ''}>Όλα</option>
          <option value="active" ${State.filterStatus === 'active' ? 'selected' : ''}>Ενεργά</option>
          <option value="inactive" ${State.filterStatus === 'inactive' ? 'selected' : ''}>Ανενεργά</option>
        </select>
        <select class="filter-select" onchange="State.filterCategory = this.value; renderView()">
          <option value="all" ${State.filterCategory === 'all' ? 'selected' : ''}>Όλες οι κατηγορίες</option>
          ${catOptions}
        </select>
      </div>

      ${filtered.length === 0 ? `
        <div class="empty-state">
          <span class="empty-icon"><i class="fa-solid fa-user"></i></span>
          <h3>Δεν βρέθηκαν μέλη</h3>
          <p>${members.length === 0 ? 'Προσθέστε το πρώτο μέλος του συλλόγου' : 'Δοκιμάστε διαφορετικά φίλτρα'}</p>
          ${members.length === 0 ? '<button class="btn btn-primary" onclick="openMemberForm()"><i class="fa-solid fa-plus"></i> Νέο Μέλος</button>' : ''}
        </div>
      ` : `
        <div class="mb-1 text-muted" style="font-size:0.82rem">${filtered.length} μέλ${filtered.length === 1 ? 'ος' : 'η'}</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Αρ.Μ.</th>
                <th>Επώνυμο - Όνομα</th>
                <th>Αθλούμενος</th>
                <th>Κατηγορία</th>
                <th class="text-right">Εισφορά</th>
                <th>Κατάσταση</th>
                <th class="text-center no-print">Ενέργειες</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map((m, i) => `
                <tr class="clickable-row" ondblclick="navigate('memberDetail', {memberId:'${m.id}'})">
                  <td>${m.memberNumber || '—'}</td>
                  <td><strong>${Utils.escapeHtml(Utils.getMemberFullName(m))}</strong></td>
                  <td>${Utils.escapeHtml(Utils.getChildFullName(m))}${m.child?.sport ? ` <span class="text-muted">(${Utils.escapeHtml(m.child.sport)})</span>` : ''}</td>
                  <td>${Utils.escapeHtml(Utils.getCategoryLabel(m.category))}</td>
                  <td class="text-right money">${Utils.formatMoney(m.monthlyFee)}</td>
                  <td><span class="badge ${m.status === 'active' ? 'badge-active' : 'badge-inactive'}">${m.status === 'active' ? '● Ενεργό' : '○ Ανενεργό'}</span></td>
                  <td class="text-center no-print">
                    <button class="btn btn-ghost btn-sm" onclick="navigate('memberDetail', {memberId:'${m.id}'})" title="Προβολή"><i class="fa-solid fa-eye"></i></button>
                    <button class="btn btn-ghost btn-sm" onclick="openMemberForm('${m.id}')" title="Επεξεργασία"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btn btn-ghost btn-sm" onclick="deleteMember('${m.id}')" title="Διαγραφή"><i class="fa-solid fa-trash-can"></i></button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  },

  // ── Member Detail ──
  memberDetail(memberId) {
    const members = Store.getMembers();
    const member = members.find(m => m.id === memberId);
    if (!member) {
      return `<div class="empty-state"><h3>Μέλος δεν βρέθηκε</h3>
        <button class="btn btn-primary" onclick="navigate('members')">Επιστροφή</button></div>`;
    }

    const year = State.detailYear;
    const config = Store.getConfig();
    const activeMonths = config.activeMonths || [9,10,11,12,1,2,3,4,5,6];
    const receipts = Store.getReceipts();
    const payments = Utils.getMemberPaymentsForYear(member.id, year);
    const allPayments = Store.getPayments()
      .filter(p => p.memberId === member.id)
      .sort((a, b) => (b.year - a.year) || (b.month - a.month));

    // Payment grid html
    let gridHtml = '';
    for (let m = 1; m <= 12; m++) {
      // Check if month is in active months
      if (!activeMonths.includes(m)) {
        gridHtml += `
          <div class="payment-month inactive-month" title="${MONTHS_GR[m-1]} — Μη ενεργός μήνας">
            <span class="month-label">${MONTHS_SHORT[m-1]}</span>
            <span class="month-status">—</span>
          </div>
        `;
        continue;
      }

      const payment = Utils.isMemberPaidForMonth(member.id, year, m);
      const shouldPay = Utils.memberShouldPay(member, m, year);

      let cls = 'na', statusIcon = '—', amountText = '';
      if (!shouldPay) {
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
        : (shouldPay ? `onclick="openPaymentForm('${member.id}', ${m}, ${year})"` : '');

      gridHtml += `
        <div class="payment-month ${cls}" ${onclick} title="${MONTHS_GR[m-1]}${payment ? ' - ' + Utils.formatMoney(payment.amount) : ''}">
          <span class="month-label">${MONTHS_SHORT[m-1]}</span>
          <span class="month-status">${statusIcon}</span>
          ${amountText ? `<span class="month-amount">${amountText}</span>` : ''}
        </div>
      `;
    }

    const debt = Utils.getMemberDebt(member, year);

    return `
      <div class="view-header">
        <h2>
          <a onclick="navigate('members')" style="cursor:pointer;color:var(--text-muted);text-decoration:none"><i class="fa-solid fa-users"></i> Μέλη</a>
          <span style="color:var(--text-muted);margin:0 8px">›</span>
          ${Utils.escapeHtml(Utils.getMemberFullName(member))}
        </h2>
        <div class="view-header-actions no-print">
          <button class="btn btn-outline" onclick="openMemberForm('${member.id}')"><i class="fa-solid fa-pen-to-square"></i> Επεξεργασία</button>
          <button class="btn btn-danger btn-sm" onclick="deleteMember('${member.id}')"><i class="fa-solid fa-trash-can"></i> Διαγραφή</button>
        </div>
      </div>

      <div class="member-detail-grid">
        <!-- Member Info -->
        <div class="card">
          <div class="card-header">
            <h3><i class="fa-solid fa-user"></i> Στοιχεία Μέλους</h3>
            <span class="badge ${member.status === 'active' ? 'badge-active' : 'badge-inactive'}">
              ${member.status === 'active' ? '● Ενεργό' : '○ Ανενεργό'}
            </span>
          </div>
          <div class="info-row"><span class="info-label">Αρ. Μητρώου:</span><span class="info-value"><strong>#${member.memberNumber || '—'}</strong></span></div>
          <div class="info-row"><span class="info-label">Επώνυμο:</span><span class="info-value">${Utils.escapeHtml(member.lastName)}</span></div>
          <div class="info-row"><span class="info-label">Όνομα:</span><span class="info-value">${Utils.escapeHtml(member.firstName)}</span></div>
          <div class="info-row"><span class="info-label">Πατρώνυμο:</span><span class="info-value">${Utils.escapeHtml(member.fatherName || '—')}</span></div>
          <div class="info-row"><span class="info-label">Αρ. Ταυτότητας:</span><span class="info-value">${Utils.escapeHtml(member.idNumber || '—')}</span></div>
          ${member.afm ? `<div class="info-row"><span class="info-label">ΑΦΜ:</span><span class="info-value">${Utils.escapeHtml(member.afm)}</span></div>` : ''}
          <div class="info-row"><span class="info-label">Ημ. Γέννησης:</span><span class="info-value">${Utils.formatDate(member.dateOfBirth)}</span></div>
          <div class="info-row"><span class="info-label">Διεύθυνση:</span><span class="info-value">${Utils.escapeHtml(member.address || '—')}</span></div>
          <div class="info-row"><span class="info-label">Τηλέφωνο:</span><span class="info-value">${Utils.escapeHtml(member.phone || '—')}</span></div>
          <div class="info-row"><span class="info-label">Email:</span><span class="info-value">${Utils.escapeHtml(member.email || '—')}</span></div>
          <div class="info-row"><span class="info-label">Επάγγελμα:</span><span class="info-value">${Utils.escapeHtml(member.profession || '—')}</span></div>
          <div class="info-row"><span class="info-label">Ημ. Εγγραφής:</span><span class="info-value">${Utils.formatDate(member.registrationDate)}</span></div>
          <div class="info-row"><span class="info-label">Κατηγορία:</span><span class="info-value">${Utils.escapeHtml(Utils.getCategoryLabel(member.category))}</span></div>
          <div class="info-row"><span class="info-label">Εισφορά:</span><span class="info-value money">${Utils.formatMoney(member.monthlyFee)}</span></div>
          ${member.departureDate ? `<div class="info-row"><span class="info-label">Ημ. Αποχώρησης:</span><span class="info-value">${Utils.formatDate(member.departureDate)}</span></div>` : ''}
          ${member.departureReason ? `<div class="info-row"><span class="info-label">Λόγος:</span><span class="info-value">${Utils.escapeHtml(member.departureReason)}</span></div>` : ''}
          ${member.notes ? `<div class="info-row"><span class="info-label">Σημειώσεις:</span><span class="info-value">${Utils.escapeHtml(member.notes)}</span></div>` : ''}
        </div>

        <!-- Child Info -->
        <div class="card">
          <div class="card-header">
            <h3><i class="fa-solid fa-child"></i> Αθλούμενος</h3>
          </div>
          ${member.child && member.child.firstName ? `
            <div class="info-row"><span class="info-label">Επώνυμο:</span><span class="info-value">${Utils.escapeHtml(member.child.lastName || member.lastName)}</span></div>
            <div class="info-row"><span class="info-label">Όνομα:</span><span class="info-value">${Utils.escapeHtml(member.child.firstName)}</span></div>
            <div class="info-row"><span class="info-label">Ημ. Γέννησης:</span><span class="info-value">${Utils.formatDate(member.child.dateOfBirth)}</span></div>
            <div class="info-row"><span class="info-label">Άθλημα:</span><span class="info-value">${Utils.escapeHtml(member.child.sport || '—')}</span></div>
            ${member.child.notes ? `<div class="info-row"><span class="info-label">Σημειώσεις:</span><span class="info-value">${Utils.escapeHtml(member.child.notes)}</span></div>` : ''}
          ` : `
            <div class="empty-state" style="padding:30px">
              <p class="text-muted">Δεν έχουν καταχωρηθεί στοιχεία αθλούμενου</p>
            </div>
          `}
        </div>
      </div>

      <!-- Payment Grid -->
      <div class="card">
        <div class="card-header">
          <h3><i class="fa-solid fa-coins"></i> Πληρωμές</h3>
          <div class="year-selector">
            <button onclick="State.detailYear--; renderView()">◂</button>
            <span class="year-display">${year}</span>
            <button onclick="State.detailYear++; renderView()">▸</button>
          </div>
        </div>

        ${debt.months.length > 0 ? `
          <div class="alert alert-danger mb-2">
            <i class="fa-solid fa-triangle-exclamation"></i> Οφειλή ${year}: ${debt.months.length} μήν${debt.months.length === 1 ? 'ας' : 'ες'} — ${Utils.formatMoney(debt.totalAmount)}
          </div>
        ` : ''}

        <div class="payment-grid">
          ${gridHtml}
        </div>

        <!-- Payment History -->
        <h3 style="margin:20px 0 12px; font-family:var(--font-body); font-size:0.95rem; font-weight:600">
          Ιστορικό Πληρωμών
        </h3>
        ${allPayments.length === 0 ? `
          <p class="text-muted" style="font-size:0.88rem">Δεν υπάρχουν καταχωρημένες πληρωμές</p>
        ` : `
          <div class="table-wrap" style="border:none;box-shadow:none">
            <table>
              <thead>
                <tr>
                  <th>Αρ.</th>
                  <th>Ημ. Πληρωμής</th>
                  <th>Περίοδος</th>
                  <th class="text-right">Ποσό</th>
                  <th>Σημειώσεις</th>
                  <th class="text-center no-print">Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                ${allPayments.map(p => {
                  const receipt = receipts.find(r => r.id === p.receiptId);
                  const rn = receipt ? receipt.receiptNumber : (p.receiptNumber || '?');
                  const isCancelled = receipt && receipt.status === 'cancelled';
                  return `
                  <tr${isCancelled ? ' style="opacity:0.6"' : ''}>
                    <td><span class="receipt-badge">#${rn}</span>${isCancelled ? ' <span class="badge badge-inactive" style="font-size:0.7rem">ΑΚΥΡΟ</span>' : ''}</td>
                    <td${isCancelled ? ' style="text-decoration:line-through"' : ''}>${Utils.formatDate(p.paidDate)}</td>
                    <td${isCancelled ? ' style="text-decoration:line-through"' : ''}>${Utils.getMonthName(p.month)} ${p.year}</td>
                    <td class="text-right money"${isCancelled ? ' style="text-decoration:line-through"' : ''}>${Utils.formatMoney(p.amount)}</td>
                    <td class="text-muted">${Utils.escapeHtml(p.notes || '')}</td>
                    <td class="text-center no-print">
                      ${receipt ? `<button class="btn btn-ghost btn-sm" onclick="showReceiptById('${receipt.id}')" title="Απόδειξη"><i class="fa-solid fa-receipt"></i></button>` : ''}
                      ${receipt && !isCancelled ? `<button class="btn btn-ghost btn-sm" onclick="cancelReceipt('${receipt.id}')" title="Ακύρωση"><i class="fa-solid fa-trash-can"></i></button>` : ''}
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },

  // ── Payments Overview ──
  payments() {
    return `
      <div class="view-header">
        <h2><i class="fa-solid fa-coins"></i> Πληρωμές</h2>
        <div class="view-header-actions no-print">
          <button class="btn btn-success" onclick="openPaymentForm()"><i class="fa-solid fa-plus"></i> Νέα Πληρωμή</button>
        </div>
      </div>

      <div class="sub-tabs no-print">
        <button class="sub-tab ${State.paymentSubTab === 'entry' ? 'active' : ''}" onclick="State.paymentSubTab='entry'; renderView()">Καταχώρηση</button>
        <button class="sub-tab ${State.paymentSubTab === 'monthly' ? 'active' : ''}" onclick="State.paymentSubTab='monthly'; renderView()">Μηνιαία Εικόνα</button>
        <button class="sub-tab ${State.paymentSubTab === 'annual' ? 'active' : ''}" onclick="State.paymentSubTab='annual'; renderView()">Ετήσια Εικόνα</button>
      </div>

      <div id="payment-tab-content">
        ${State.paymentSubTab === 'entry' ? this._paymentsEntry() :
          State.paymentSubTab === 'monthly' ? this._paymentsMonthly() :
          this._paymentsAnnual()}
      </div>
    `;
  },

  _paymentsEntry() {
    const payments = Store.getPayments();
    const members = Store.getMembers();
    const receipts = Store.getReceipts();
    const recent = [...payments].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 20);

    return `
      <div class="quick-actions no-print">
        <button class="quick-action-btn" onclick="openPaymentForm()">
          <span class="qa-icon"><i class="fa-solid fa-coins"></i></span> Καταχώρηση Πληρωμής
        </button>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Τελευταίες Πληρωμές</h3>
        </div>
        ${recent.length === 0 ? `
          <div class="empty-state" style="padding:30px">
            <p class="text-muted">Δεν υπάρχουν πληρωμές</p>
          </div>
        ` : `
          <div class="table-wrap" style="border:none;box-shadow:none">
            <table>
              <thead>
                <tr>
                  <th>Αρ.</th>
                  <th>Ημ/νία</th>
                  <th>Μέλος</th>
                  <th>Περίοδος</th>
                  <th class="text-right">Ποσό</th>
                  <th>Σημειώσεις</th>
                  <th class="text-center no-print">Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                ${recent.map(p => {
                  const m = members.find(mm => mm.id === p.memberId);
                  const receipt = receipts.find(r => r.id === p.receiptId);
                  const rn = receipt ? receipt.receiptNumber : (p.receiptNumber || '?');
                  const isCancelled = receipt && receipt.status === 'cancelled';
                  return `<tr${isCancelled ? ' style="opacity:0.6"' : ''}>
                    <td><span class="receipt-badge">#${rn}</span>${isCancelled ? ' <span class="badge badge-inactive" style="font-size:0.7rem">ΑΚΥΡΟ</span>' : ''}</td>
                    <td${isCancelled ? ' style="text-decoration:line-through"' : ''}>${Utils.formatDate(p.paidDate)}</td>
                    <td>${m ? `<a style="cursor:pointer;color:var(--primary-light)" onclick="navigate('memberDetail',{memberId:'${m.id}'})">${Utils.escapeHtml(Utils.getMemberFullName(m))}</a>` : '<em>Διαγραμμένο</em>'}</td>
                    <td>${Utils.getMonthShort(p.month)} ${p.year}</td>
                    <td class="text-right money"${isCancelled ? ' style="text-decoration:line-through"' : ''}>${Utils.formatMoney(p.amount)}</td>
                    <td class="text-muted">${Utils.escapeHtml(p.notes || '')}</td>
                    <td class="text-center no-print">
                      ${receipt ? `<button class="btn btn-ghost btn-sm" onclick="showReceiptById('${receipt.id}')" title="Απόδειξη"><i class="fa-solid fa-receipt"></i></button>` : ''}
                      ${receipt && !isCancelled ? `<button class="btn btn-ghost btn-sm" onclick="cancelReceipt('${receipt.id}')" title="Ακύρωση"><i class="fa-solid fa-trash-can"></i></button>` : ''}
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },

  _paymentsMonthly() {
    const year = State.currentYear;
    const month = State.currentMonth;
    const config = Store.getConfig();
    const activeMonths = config.activeMonths || [9,10,11,12,1,2,3,4,5,6];
    const members = Store.getMembers().filter(m => m.status === 'active').sort((a,b) => a.lastName.localeCompare(b.lastName, 'el'));
    const payments = Store.getPayments();

    let totalCollected = 0, totalExpected = 0;
    const rows = members.map(m => {
      const shouldPay = Utils.memberShouldPay(m, month, year);
      const payment = Utils.isMemberPaidForMonth(m.id, year, month);
      if (shouldPay) {
        totalExpected += m.monthlyFee;
        if (payment) totalCollected += payment.amount;
      }
      return { member: m, shouldPay, payment };
    });

    return `
      <div class="gap-row mb-2">
        <div class="year-selector">
          <button onclick="State.currentYear--; renderView()">◂</button>
          <span class="year-display">${year}</span>
          <button onclick="State.currentYear++; renderView()">▸</button>
        </div>
        <select class="filter-select" onchange="State.currentMonth = parseInt(this.value); renderView()">
          ${MONTHS_GR.map((mn, i) => {
            const isActive = activeMonths.includes(i+1);
            return `<option value="${i+1}" ${month === i+1 ? 'selected' : ''}${!isActive ? ' style="color:#ccc"' : ''}>${mn}${!isActive ? ' (ανενεργός)' : ''}</option>`;
          }).join('')}
        </select>
      </div>

      <div class="stats-grid mb-2">
        <div class="stat-card">
          <div class="stat-info">
            <h4>Εισπράχθηκαν</h4>
            <div class="stat-value money success">${Utils.formatMoney(totalCollected)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <h4>Αναμενόμενα</h4>
            <div class="stat-value money">${Utils.formatMoney(totalExpected)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <h4>Υπόλοιπο</h4>
            <div class="stat-value money ${totalExpected - totalCollected > 0 ? 'danger' : 'success'}">${Utils.formatMoney(totalExpected - totalCollected)}</div>
          </div>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Α/Α</th>
              <th>Μέλος</th>
              <th>Παιδί</th>
              <th class="text-right">Εισφορά</th>
              <th class="text-center">Κατάσταση</th>
              <th class="text-right">Πληρωμή</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr class="clickable-row" onclick="navigate('memberDetail',{memberId:'${r.member.id}'})">
                <td>${i+1}</td>
                <td><strong>${Utils.escapeHtml(Utils.getMemberFullName(r.member))}</strong></td>
                <td>${Utils.escapeHtml(Utils.getChildFullName(r.member))}</td>
                <td class="text-right money">${Utils.formatMoney(r.member.monthlyFee)}</td>
                <td class="text-center">
                  ${!r.shouldPay 
                    ? '<span class="text-muted">—</span>' 
                    : r.payment 
                      ? '<span class="badge badge-active">✓ Πληρώθηκε</span>' 
                      : '<span class="badge badge-inactive">✗ Οφείλει</span>'}
                </td>
                <td class="text-right money">${r.payment ? Utils.formatMoney(r.payment.amount) : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  _paymentsAnnual() {
    const year = State.currentYear;
    const config = Store.getConfig();
    const activeMonths = config.activeMonths || [9,10,11,12,1,2,3,4,5,6];
    const members = Store.getMembers().filter(m => m.status === 'active').sort((a,b) => a.lastName.localeCompare(b.lastName, 'el'));

    let monthTotals = new Array(12).fill(0);

    const rows = members.map(m => {
      const cols = [];
      let rowTotal = 0;
      for (let mo = 1; mo <= 12; mo++) {
        if (!activeMonths.includes(mo)) {
          cols.push({ inactive: true });
          continue;
        }
        const payment = Utils.isMemberPaidForMonth(m.id, year, mo);
        const shouldPay = Utils.memberShouldPay(m, mo, year);
        if (payment) {
          cols.push({ paid: true, amount: payment.amount });
          rowTotal += payment.amount;
          monthTotals[mo-1] += payment.amount;
        } else if (shouldPay) {
          cols.push({ paid: false, amount: 0 });
        } else {
          cols.push({ na: true });
        }
      }
      return { member: m, cols, rowTotal };
    });

    const grandTotal = monthTotals.reduce((s, v) => s + v, 0);

    return `
      <div class="gap-row mb-2">
        <div class="year-selector">
          <button onclick="State.currentYear--; renderView()">◂</button>
          <span class="year-display">${year}</span>
          <button onclick="State.currentYear++; renderView()">▸</button>
        </div>
        <button class="btn btn-outline btn-sm no-print" onclick="exportAnnualGrid(${year})"><i class="fa-solid fa-file-arrow-down"></i> Excel</button>
      </div>

      <div class="annual-grid-wrap">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Μέλος</th>
                ${MONTHS_SHORT.map((m, i) => `<th${!activeMonths.includes(i+1) ? ' style="opacity:0.3"' : ''}>${m}</th>`).join('')}
                <th>Σύνολο</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr class="clickable-row" onclick="navigate('memberDetail',{memberId:'${r.member.id}'})">
                  <td><strong>${Utils.escapeHtml(Utils.getMemberFullName(r.member))}</strong></td>
                  ${r.cols.map(c => {
                    if (c.inactive) return '<td class="month-cell-na" style="background:#f0f0f0;opacity:0.3">—</td>';
                    if (c.na) return '<td class="month-cell-na">—</td>';
                    if (c.paid) return `<td class="month-cell-paid" title="${Utils.formatMoney(c.amount)}">✓</td>`;
                    return '<td class="month-cell-unpaid">✗</td>';
                  }).join('')}
                  <td class="text-right money fw-600">${Utils.formatMoney(r.rowTotal)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight:700;background:var(--bg)">
                <td>Σύνολα</td>
                ${monthTotals.map((t, i) => `<td class="text-center money"${!activeMonths.includes(i+1) ? ' style="opacity:0.3"' : ''}>${t > 0 ? Utils.formatMoney(t) : '—'}</td>`).join('')}
                <td class="text-right money">${Utils.formatMoney(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  },

  // ── Reports ──
  reports() {
    return `
      <div class="view-header">
        <h2><i class="fa-solid fa-square-poll-vertical"></i> Αναφορές</h2>
      </div>

      <div class="sub-tabs no-print">
        <button class="sub-tab ${State.reportType === 'debtors' ? 'active' : ''}" onclick="State.reportType='debtors'; renderView()">Οφειλέτες</button>
        <button class="sub-tab ${State.reportType === 'monthlyCol' ? 'active' : ''}" onclick="State.reportType='monthlyCol'; renderView()">Εισπράξεις/Μήνα</button>
        <button class="sub-tab ${State.reportType === 'yearlyCol' ? 'active' : ''}" onclick="State.reportType='yearlyCol'; renderView()">Εισπράξεις/Έτος</button>
        <button class="sub-tab ${State.reportType === 'memberHistory' ? 'active' : ''}" onclick="State.reportType='memberHistory'; renderView()">Ιστορικό Μέλους</button>
        <button class="sub-tab ${State.reportType === 'receipts' ? 'active' : ''}" onclick="State.reportType='receipts'; renderView()"><i class="fa-solid fa-receipt"></i> Αποδείξεις</button>
      </div>

      ${State.reportType === 'debtors' ? this._reportDebtors() :
        State.reportType === 'monthlyCol' ? this._reportMonthlyCollections() :
        State.reportType === 'yearlyCol' ? this._reportYearlyCollections() :
        State.reportType === 'receipts' ? this._reportReceipts() :
        this._reportMemberHistory()}
    `;
  },

  _reportDebtors() {
    const year = State.reportYear;
    const members = Store.getMembers().filter(m => m.status === 'active');

    const debtors = [];
    members.forEach(m => {
      const debt = Utils.getMemberDebt(m, year);
      if (debt.months.length > 0) {
        debtors.push({
          member: m,
          months: debt.months,
          total: debt.totalAmount
        });
      }
    });

    debtors.sort((a, b) => b.total - a.total);

    return `
      <div class="gap-row mb-2">
        <div class="year-selector">
          <button onclick="State.reportYear--; renderView()">◂</button>
          <span class="year-display">${year}</span>
          <button onclick="State.reportYear++; renderView()">▸</button>
        </div>
        <button class="btn btn-outline btn-sm no-print" onclick="exportDebtors(${year})"><i class="fa-solid fa-file-arrow-down"></i> Excel</button>
        <button class="btn btn-outline btn-sm no-print" onclick="window.print()"><i class="fa-solid fa-print"></i> Εκτύπωση</button>
      </div>

      ${debtors.length === 0 ? `
        <div class="alert alert-success"><i class="fa-solid fa-check"></i> Δεν υπάρχουν οφειλέτες για το ${year}!</div>
      ` : `
        <div class="alert alert-danger mb-2">
          ${debtors.length} μέλ${debtors.length === 1 ? 'ος' : 'η'} με οφειλές — Σύνολο: ${Utils.formatMoney(debtors.reduce((s, d) => s + d.total, 0))}
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Α/Α</th>
                <th>Μέλος</th>
                <th>Παιδί</th>
                <th>Μήνες Οφειλής</th>
                <th class="text-center">Πλήθος</th>
                <th class="text-right">Οφειλόμενο</th>
              </tr>
            </thead>
            <tbody>
              ${debtors.map((d, i) => `
                <tr class="clickable-row" onclick="navigate('memberDetail',{memberId:'${d.member.id}'})">
                  <td>${i+1}</td>
                  <td><strong>${Utils.escapeHtml(Utils.getMemberFullName(d.member))}</strong></td>
                  <td>${Utils.escapeHtml(Utils.getChildFullName(d.member))}</td>
                  <td>${d.months.map(m => MONTHS_SHORT[m-1]).join(', ')}</td>
                  <td class="text-center">${d.months.length}</td>
                  <td class="text-right money fw-600 text-danger">${Utils.formatMoney(d.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  },

  _reportMonthlyCollections() {
    const year = State.reportYear;
    const payments = Store.getPayments().filter(p => p.year === year);

    const monthData = [];
    let maxVal = 0;
    for (let m = 1; m <= 12; m++) {
      const monthPayments = payments.filter(p => p.month === m);
      const total = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);
      monthData.push({ month: m, total, count: monthPayments.length });
      if (total > maxVal) maxVal = total;
    }
    const yearTotal = monthData.reduce((s, d) => s + d.total, 0);

    return `
      <div class="gap-row mb-2">
        <div class="year-selector">
          <button onclick="State.reportYear--; renderView()">◂</button>
          <span class="year-display">${year}</span>
          <button onclick="State.reportYear++; renderView()">▸</button>
        </div>
        <button class="btn btn-outline btn-sm no-print" onclick="exportMonthlyCollections(${year})"><i class="fa-solid fa-file-arrow-down"></i> Excel</button>
      </div>

      <div class="card mb-2">
        <div class="card-header">
          <h3>Εισπράξεις ανά Μήνα — ${year}</h3>
          <span class="money fw-600">Σύνολο: ${Utils.formatMoney(yearTotal)}</span>
        </div>
        <div class="chart-bar-container">
          ${monthData.map(d => `
            <div class="chart-bar-col">
              <span class="chart-bar-value">${d.total > 0 ? Utils.formatMoney(d.total) : ''}</span>
              <div class="chart-bar" style="height:${maxVal > 0 ? Math.max((d.total / maxVal) * 100, 2) : 2}%"></div>
              <span class="chart-bar-label">${MONTHS_SHORT[d.month - 1]}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Μήνας</th>
              <th class="text-center">Πληρωμές</th>
              <th class="text-right">Ποσό</th>
            </tr>
          </thead>
          <tbody>
            ${monthData.map(d => `
              <tr>
                <td>${MONTHS_GR[d.month - 1]}</td>
                <td class="text-center">${d.count}</td>
                <td class="text-right money">${Utils.formatMoney(d.total)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight:700;background:var(--bg)">
              <td>Σύνολο</td>
              <td class="text-center">${monthData.reduce((s,d) => s + d.count, 0)}</td>
              <td class="text-right money">${Utils.formatMoney(yearTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  },

  _reportYearlyCollections() {
    const payments = Store.getPayments();
    const yearMap = {};
    payments.forEach(p => {
      if (!yearMap[p.year]) yearMap[p.year] = { total: 0, count: 0 };
      yearMap[p.year].total += p.amount || 0;
      yearMap[p.year].count++;
    });
    const years = Object.keys(yearMap).sort((a,b) => b - a);
    const grandTotal = years.reduce((s, y) => s + yearMap[y].total, 0);

    return `
      <div class="gap-row mb-2">
        <button class="btn btn-outline btn-sm no-print" onclick="exportYearlyCollections()"><i class="fa-solid fa-file-arrow-down"></i> Excel</button>
      </div>

      ${years.length === 0 ? `
        <div class="empty-state">
          <span class="empty-icon"><i class="fa-solid fa-chart-simple"></i></span>
          <h3>Δεν υπάρχουν δεδομένα</h3>
          <p>Καταχωρήστε πληρωμές για να δείτε ετήσιες εισπράξεις</p>
        </div>
      ` : `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Έτος</th>
                <th class="text-center">Πληρωμές</th>
                <th class="text-right">Σύνολο</th>
              </tr>
            </thead>
            <tbody>
              ${years.map(y => `
                <tr>
                  <td class="fw-600">${y}</td>
                  <td class="text-center">${yearMap[y].count}</td>
                  <td class="text-right money">${Utils.formatMoney(yearMap[y].total)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight:700;background:var(--bg)">
                <td>Γενικό Σύνολο</td>
                <td class="text-center">${years.reduce((s,y) => s + yearMap[y].count, 0)}</td>
                <td class="text-right money">${Utils.formatMoney(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `}
    `;
  },

  _reportMemberHistory() {
    return `
      <div class="card">
        <div class="card-header">
          <h3>Ιστορικό Πληρωμών Μέλους</h3>
        </div>
        <div class="form-group">
          <label>Αναζήτηση Μέλους</label>
          <div style="position:relative">
            <input type="text" class="form-control" id="report-member-search"
              placeholder="Πληκτρολογήστε όνομα..."
              oninput="searchMemberForReport(this.value)"
              autocomplete="off">
            <div class="member-search-dropdown" id="report-member-dropdown"></div>
          </div>
        </div>
        <div id="report-member-history-content"></div>
      </div>
    `;
  },

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
        <button class="btn btn-outline btn-sm no-print" onclick="exportReceiptsExcel(${year})"><i class="fa-solid fa-file-arrow-down"></i> Excel</button>
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
                <th class="text-center no-print"><i class="fa-solid fa-receipt"></i></th>
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
                  <td class="text-right money">${Utils.formatMoney(r.amount)}</td>
                  <td class="text-center no-print">
                    <button class="btn btn-ghost btn-sm" onclick="showReceiptById('${r.id}')"><i class="fa-solid fa-receipt"></i></button>
                    ${!isCancelled ? `<button class="btn btn-ghost btn-sm" onclick="cancelReceipt('${r.id}')"><i class="fa-solid fa-ban"></i></button>` : ''}
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  },

  // ── Income-Expense Book (Βιβλίο Εσόδων-Εξόδων) ──
  transactions() {
    const allTx = Store.getTransactions().filter(t => t.status !== 'cancelled');
    const year = State.txFilterYear;
    const month = State.txFilterMonth;
    const typeFilter = State.txFilterType;

    let filtered = allTx.filter(t => {
      const txDate = new Date(t.date);
      if (txDate.getFullYear() !== year) return false;
      if (month > 0 && (txDate.getMonth() + 1) !== month) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      return true;
    });

    filtered.sort((a, b) => b.date.localeCompare(a.date));

    const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpense;

    const getCategoryLabel = (tx) => {
      const cats = tx.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      const cat = cats.find(c => c.id === tx.category);
      return cat ? cat.label : tx.category;
    };

    return `
      <div class="view-header">
        <h2><i class="fa-solid fa-book"></i> Βιβλίο Εσόδων-Εξόδων</h2>
        <div class="view-actions no-print">
          <button class="btn btn-success btn-sm" onclick="openTransactionForm('income')"><i class="fa-solid fa-plus"></i> Έσοδο</button>
          <button class="btn btn-danger btn-sm" onclick="openTransactionForm('expense')"><i class="fa-solid fa-minus"></i> Έξοδο</button>
        </div>
      </div>

      <div class="gap-row mb-2 no-print">
        <div class="year-selector">
          <button onclick="State.txFilterYear--; renderView()">◂</button>
          <span class="year-display">${year}</span>
          <button onclick="State.txFilterYear++; renderView()">▸</button>
        </div>
        <select class="form-control" style="max-width:140px" onchange="State.txFilterMonth = parseInt(this.value); renderView()">
          <option value="0" ${month === 0 ? 'selected' : ''}>Όλοι οι μήνες</option>
          ${MONTHS_GR.map((m, i) => `<option value="${i+1}" ${month === i+1 ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
        <select class="form-control" style="max-width:120px" onchange="State.txFilterType = this.value; renderView()">
          <option value="all" ${typeFilter === 'all' ? 'selected' : ''}>Όλα</option>
          <option value="income" ${typeFilter === 'income' ? 'selected' : ''}>Έσοδα</option>
          <option value="expense" ${typeFilter === 'expense' ? 'selected' : ''}>Έξοδα</option>
        </select>
        <button class="btn btn-outline btn-sm" onclick="exportTransactionsExcel(${year})"><i class="fa-solid fa-file-arrow-down"></i> Excel</button>
      </div>

      <div class="stats-grid mb-2">
        <div class="stat-card">
          <div class="stat-label">Έσοδα</div>
          <div class="stat-value" style="color:var(--success)">${Utils.formatMoney(totalIncome)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Έξοδα</div>
          <div class="stat-value" style="color:var(--danger)">${Utils.formatMoney(totalExpense)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Υπόλοιπο</div>
          <div class="stat-value" style="color:${balance >= 0 ? 'var(--success)' : 'var(--danger)'}">${Utils.formatMoney(balance)}</div>
        </div>
      </div>

      ${filtered.length === 0 ? `
        <div class="empty-state">
          <span class="empty-icon"><i class="fa-solid fa-book-open"></i></span>
          <h3>Δεν υπάρχουν εγγραφές</h3>
          <p>Καταχωρήστε έσοδα ή έξοδα για αυτή την περίοδο</p>
        </div>
      ` : `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ημ/νία</th>
                <th>Τύπος</th>
                <th>Κατηγορία</th>
                <th>Περιγραφή</th>
                <th>Παραστατικό</th>
                <th class="text-right">Ποσό</th>
                <th class="text-center no-print">Ενέργειες</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(t => `
                <tr>
                  <td>${Utils.formatDate(t.date)}</td>
                  <td>${t.type === 'income'
                    ? '<span style="color:var(--success)"><i class="fa-solid fa-arrow-down"></i> Έσοδο</span>'
                    : '<span style="color:var(--danger)"><i class="fa-solid fa-arrow-up"></i> Έξοδο</span>'}</td>
                  <td>${getCategoryLabel(t)}</td>
                  <td>${Utils.escapeHtml(t.description)}</td>
                  <td class="text-muted">${Utils.escapeHtml(t.documentNumber || '—')}</td>
                  <td class="text-right money ${t.type === 'income' ? '' : 'text-danger'}">${t.type === 'expense' ? '-' : ''}${Utils.formatMoney(t.amount)}</td>
                  <td class="text-center no-print">
                    ${!t.relatedReceiptId ? `
                      <button class="btn btn-ghost btn-sm" onclick="openTransactionForm('${t.type}', '${t.id}')"><i class="fa-solid fa-pen"></i></button>
                      <button class="btn btn-ghost btn-sm" onclick="deleteTransaction('${t.id}')"><i class="fa-solid fa-trash"></i></button>
                    ` : `<span class="text-muted" title="Αυτόματη εγγραφή από συνδρομή"><i class="fa-solid fa-link"></i></span>`}
                  </td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight:700;background:var(--bg)">
                <td colspan="5">Σύνολα Περιόδου</td>
                <td class="text-right money">${Utils.formatMoney(balance)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      `}
    `;
  },

  // ── Asset Registry (Βιβλίο Περιουσιακών Στοιχείων) ──
  assets() {
    const allAssets = Store.getAssets();
    const catFilter = State.assetFilterCategory;
    const statusFilter = State.assetFilterStatus;

    let filtered = allAssets.filter(a => {
      if (catFilter !== 'all' && a.category !== catFilter) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      return true;
    });

    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'el'));

    const totalValue = filtered.filter(a => a.status === 'active').reduce((s, a) => s + (a.purchaseValue || 0), 0);

    const getAssetCategoryLabel = (catId) => {
      const cat = ASSET_CATEGORIES.find(c => c.id === catId);
      return cat ? cat.label : catId;
    };

    const statusLabels = { active: 'Ενεργό', damaged: 'Κατεστραμμένο', disposed: 'Αποσυρμένο' };

    return `
      <div class="view-header">
        <h2><i class="fa-solid fa-boxes-stacked"></i> Περιουσιακά Στοιχεία</h2>
        <div class="view-actions no-print">
          <button class="btn btn-primary btn-sm" onclick="openAssetForm()"><i class="fa-solid fa-plus"></i> Νέο Στοιχείο</button>
        </div>
      </div>

      <div class="gap-row mb-2 no-print">
        <select class="form-control" style="max-width:200px" onchange="State.assetFilterCategory = this.value; renderView()">
          <option value="all">Όλες οι κατηγορίες</option>
          ${ASSET_CATEGORIES.map(c => `<option value="${c.id}" ${catFilter === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}
        </select>
        <select class="form-control" style="max-width:160px" onchange="State.assetFilterStatus = this.value; renderView()">
          <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>Όλες οι καταστάσεις</option>
          <option value="active" ${statusFilter === 'active' ? 'selected' : ''}>Ενεργά</option>
          <option value="damaged" ${statusFilter === 'damaged' ? 'selected' : ''}>Κατεστραμμένα</option>
          <option value="disposed" ${statusFilter === 'disposed' ? 'selected' : ''}>Αποσυρμένα</option>
        </select>
        <button class="btn btn-outline btn-sm" onclick="exportAssetsExcel()"><i class="fa-solid fa-file-arrow-down"></i> Excel</button>
      </div>

      <div class="mb-1">
        <span class="text-muted">Ενεργά στοιχεία:</span> <strong>${filtered.filter(a => a.status === 'active').length}</strong>
        <span class="text-muted ml-2">— Συνολική αξία:</span> <strong class="money">${Utils.formatMoney(totalValue)}</strong>
      </div>

      ${filtered.length === 0 ? `
        <div class="empty-state">
          <span class="empty-icon"><i class="fa-solid fa-box-open"></i></span>
          <h3>Δεν υπάρχουν περιουσιακά στοιχεία</h3>
          <p>Προσθέστε τον εξοπλισμό και τα πάγια του συλλόγου</p>
        </div>
      ` : `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ονομασία</th>
                <th>Κατηγορία</th>
                <th>Ημ. Αγοράς</th>
                <th class="text-right">Αξία</th>
                <th>Θέση</th>
                <th>Κατάσταση</th>
                <th class="text-center no-print">Ενέργειες</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(a => `
                <tr ${a.status === 'disposed' ? 'style="opacity:0.5"' : ''}>
                  <td><strong>${Utils.escapeHtml(a.name)}</strong>${a.description ? `<br><span class="text-muted" style="font-size:0.82rem">${Utils.escapeHtml(a.description)}</span>` : ''}</td>
                  <td>${getAssetCategoryLabel(a.category)}</td>
                  <td>${Utils.formatDate(a.purchaseDate)}</td>
                  <td class="text-right money">${Utils.formatMoney(a.purchaseValue)}</td>
                  <td class="text-muted">${Utils.escapeHtml(a.location || '—')}</td>
                  <td>${statusLabels[a.status] || a.status}</td>
                  <td class="text-center no-print">
                    <button class="btn btn-ghost btn-sm" onclick="openAssetForm('${a.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-ghost btn-sm" onclick="deleteAsset('${a.id}')"><i class="fa-solid fa-trash"></i></button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  },

  // ── Settings ──
  settings() {
    const config = Store.getConfig();
    const storageSize = Store.getStorageSize();
    const storageMB = (storageSize / (1024 * 1024)).toFixed(2);
    const storagePercent = ((storageSize / (5 * 1024 * 1024)) * 100).toFixed(1);

    return `
      <div class="view-header">
        <h2><i class="fa-solid fa-wrench"></i> Ρυθμίσεις</h2>
      </div>

      <!-- File Storage Status -->
      <div class="card settings-section">
        <div class="card-header">
          <h3><i class="fa-solid fa-hard-drive"></i> Αρχείο Δεδομένων</h3>
          ${FileStorage.isConnected() 
            ? '<span class="badge badge-active">● Συνδεδεμένο</span>' 
            : '<span class="badge badge-inactive">○ Αποσυνδεδεμένο</span>'}
        </div>
        ${FileStorage.isConnected() ? `
          <div class="alert alert-success mb-2">
            <i class="fa-solid fa-check"></i> Τα δεδομένα αποθηκεύονται αυτόματα στο αρχείο: <strong>${Utils.escapeHtml(FileStorage.fileName)}</strong>
          </div>
          <div class="gap-row">
            <button class="btn btn-primary" onclick="FileStorage.saveNow()"><i class="fa-solid fa-floppy-disk"></i> Αποθήκευση Τώρα</button>
            <button class="btn btn-outline" onclick="FileStorage.switchFile()"><i class="fa-solid fa-folder-open"></i> Αλλαγή Αρχείου</button>
            <button class="btn btn-danger btn-sm" onclick="FileStorage.disconnect(); renderView()">Αποσύνδεση</button>
          </div>
        ` : `
          <div class="alert alert-warning mb-2">
            <i class="fa-solid fa-triangle-exclamation"></i> Τα δεδομένα αποθηκεύονται μόνο στον browser (localStorage) — μπορεί να χαθούν!
            ${FileStorage.isSupported() ? '<br>Συνδέστε ένα αρχείο για μόνιμη αποθήκευση.' : '<br><strong>Ο browser σας δεν υποστηρίζει File System API.</strong> Χρησιμοποιήστε Chrome/Edge.'}
          </div>
          ${FileStorage.isSupported() ? `
            <div class="gap-row">
              <button class="btn btn-success" onclick="createNewFileFromModal()"><i class="fa-solid fa-file"></i> Νέο Αρχείο</button>
              <button class="btn btn-primary" onclick="openExistingFileFromModal()"><i class="fa-solid fa-folder-open"></i> Άνοιγμα Αρχείου</button>
            </div>
          ` : ''}
        `}
      </div>

      <!-- General Settings -->
      <div class="card settings-section">
        <div class="card-header">
          <h3>Γενικά</h3>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Όνομα Συλλόγου</label>
            <input type="text" class="form-control" id="setting-club-name" value="${Utils.escapeHtml(config.clubName)}">
          </div>
          <div class="form-group">
            <label>Προεπιλεγμένο Έτος</label>
            <input type="number" class="form-control" id="setting-default-year" value="${config.currentYear}" min="2015" max="2035">
          </div>
        </div>
        <button class="btn btn-primary mt-1" onclick="saveGeneralSettings()"><i class="fa-solid fa-floppy-disk"></i> Αποθήκευση</button>
      </div>

      <!-- Active Months -->
      <div class="card settings-section">
        <div class="card-header">
          <h3><i class="fa-solid fa-calendar-days"></i> Ενεργοί Μήνες Χρέωσης</h3>
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
        <button class="btn btn-primary mt-1" onclick="saveActiveMonths()"><i class="fa-solid fa-floppy-disk"></i> Αποθήκευση</button>
      </div>

      <!-- Categories -->
      <div class="card settings-section">
        <div class="card-header">
          <h3>Κατηγορίες & Εισφορές</h3>
        </div>
        <p class="text-muted mb-2" style="font-size:0.82rem"><i class="fa-solid fa-triangle-exclamation"></i> Η αλλαγή εισφοράς ΔΕΝ αλλάζει αναδρομικά τις ήδη καταχωρημένες πληρωμές</p>
        <div class="table-wrap mb-2" style="border:none;box-shadow:none">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Κατηγορία</th>
                <th class="text-right">Εισφορά (€)</th>
                <th class="text-center">Ενέργειες</th>
              </tr>
            </thead>
            <tbody id="categories-tbody">
              ${config.categories.map(c => `
                <tr>
                  <td class="text-muted" style="font-family:var(--font-mono);font-size:0.8rem">${Utils.escapeHtml(c.id)}</td>
                  <td>
                    <input type="text" class="form-control" value="${Utils.escapeHtml(c.label)}" data-cat-id="${c.id}" data-field="label" style="max-width:200px">
                  </td>
                  <td class="text-right">
                    <input type="number" class="form-control" value="${c.fee}" step="0.01" min="0" data-cat-id="${c.id}" data-field="fee" style="max-width:120px;text-align:right">
                  </td>
                  <td class="text-center cat-actions">
                    <button class="btn btn-ghost btn-sm" onclick="deleteCategory('${c.id}')" title="Διαγραφή"><i class="fa-solid fa-trash-can"></i></button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="gap-row">
          <button class="btn btn-outline btn-sm" onclick="addCategory()"><i class="fa-solid fa-plus"></i> Νέα Κατηγορία</button>
          <button class="btn btn-primary btn-sm" onclick="saveCategories()"><i class="fa-solid fa-floppy-disk"></i> Αποθήκευση Κατηγοριών</button>
        </div>
      </div>

      <!-- Backup -->
      <div class="card settings-section">
        <div class="card-header">
          <h3>Αντίγραφα Ασφαλείας</h3>
        </div>
        <div class="gap-row mb-2">
          <button class="btn btn-success" onclick="Store.exportBackup()"><i class="fa-solid fa-floppy-disk"></i> Αποθήκευση Αντιγράφου</button>
          <button class="btn btn-warning" onclick="document.getElementById('import-file').click()"><i class="fa-solid fa-folder-open"></i> Επαναφορά από Αρχείο</button>
          <input type="file" id="import-file" accept=".json" style="display:none" onchange="importBackup(this.files[0])">
        </div>
        <div class="alert alert-warning">
          <i class="fa-solid fa-triangle-exclamation"></i> Η επαναφορά θα αντικαταστήσει ΟΛΑ τα υπάρχοντα δεδομένα
        </div>
        <div class="alert alert-warning mt-1" style="font-size:0.82rem">
          <i class="fa-solid fa-lock"></i> Τα δεδομένα αποθηκεύονται χωρίς κρυπτογράφηση. Φυλάξτε το αρχείο σε ασφαλή τοποθεσία
          και μην το μοιράζεστε χωρίς λόγο.
        </div>
      </div>

      <!-- Export -->
      <div class="card settings-section">
        <div class="card-header">
          <h3>Εξαγωγή Δεδομένων</h3>
        </div>
        <div class="gap-row">
          <button class="btn btn-outline" onclick="exportMembersExcel()"><i class="fa-solid fa-file-arrow-down"></i> Μέλη → Excel</button>
          <button class="btn btn-outline" onclick="exportPaymentsExcel()"><i class="fa-solid fa-file-arrow-down"></i> Πληρωμές → Excel</button>
        </div>
      </div>

      <!-- Storage Info -->
      <div class="card settings-section">
        <div class="card-header">
          <h3>Αποθηκευτικός Χώρος</h3>
        </div>
        <div class="info-row">
          <span class="info-label">Χρήση:</span>
          <span class="info-value">${storageMB} MB / 5 MB (${storagePercent}%)</span>
        </div>
        <div style="height:8px;background:var(--bg);border-radius:4px;margin-top:8px;overflow:hidden">
          <div style="height:100%;width:${Math.min(storagePercent, 100)}%;background:${storagePercent > 80 ? 'var(--danger)' : 'var(--success)'};border-radius:4px;transition:width 0.3s"></div>
        </div>
        ${storagePercent > 80 ? '<div class="alert alert-warning mt-1"><i class="fa-solid fa-triangle-exclamation"></i> Ο αποθηκευτικός χώρος πλησιάζει το όριο</div>' : ''}
        <div class="info-row mt-1">
          <span class="info-label">Μέλη:</span>
          <span class="info-value">${Store.getMembers().length}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Πληρωμές:</span>
          <span class="info-value">${Store.getPayments().length}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Αποδείξεις:</span>
          <span class="info-value">${Store.getReceipts().length} (${Store.getReceipts().filter(r => r.status === 'active').length} ενεργές)</span>
        </div>
      </div>
    `;
  }
};
