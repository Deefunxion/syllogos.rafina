// ─── DATA MIGRATION ──────────────────────────────────
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

// ─── DATA MIGRATION V3 ──────────────────────────────
function migrateDataV3() {
  const config = Store.getConfig();
  if (config.dataVersion && config.dataVersion >= 3) return;

  // Initialize new collections
  if (Store.getTransactions().length === 0) {
    localStorage.setItem(LS_TRANSACTIONS, JSON.stringify([]));
  }
  if (Store.getAssets().length === 0) {
    localStorage.setItem(LS_ASSETS, JSON.stringify([]));
  }

  // Initialize member numbers for existing members
  const members = Store.getMembers();
  if (!config.lastMemberNumber) config.lastMemberNumber = 0;

  let needsMemberUpdate = false;
  const sorted = [...members].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  sorted.forEach(m => {
    if (!m.memberNumber) {
      config.lastMemberNumber++;
      m.memberNumber = config.lastMemberNumber;
      needsMemberUpdate = true;
    }
    if (m.afm === undefined) m.afm = '';
    if (m.departureDate === undefined) m.departureDate = '';
    if (m.departureReason === undefined) m.departureReason = '';
  });

  if (needsMemberUpdate) {
    const numberMap = {};
    sorted.forEach(m => { numberMap[m.id] = m.memberNumber; });
    members.forEach(m => {
      if (numberMap[m.id]) m.memberNumber = numberMap[m.id];
      if (m.afm === undefined) m.afm = '';
      if (m.departureDate === undefined) m.departureDate = '';
      if (m.departureReason === undefined) m.departureReason = '';
    });
    Store.saveMembers(members);
  }

  // Initialize payment method on existing payments
  const payments = Store.getPayments();
  let needsPaymentUpdate = false;
  payments.forEach(p => {
    if (!p.paymentMethod) {
      p.paymentMethod = 'cash';
      needsPaymentUpdate = true;
    }
  });
  if (needsPaymentUpdate) Store.savePayments(payments);

  // Same for receipts
  const receipts = Store.getReceipts();
  let needsReceiptUpdate = false;
  receipts.forEach(r => {
    if (!r.paymentMethod) {
      r.paymentMethod = 'cash';
      needsReceiptUpdate = true;
    }
  });
  if (needsReceiptUpdate) Store.saveReceipts(receipts);

  // Update config
  config.dataVersion = 3;
  Store.saveConfig(config);

  console.log(`Migration v3 complete: ${members.length} members updated, new collections initialized`);
}

// ─── INIT ─────────────────────────────────────────────
async function init() {
  // Ensure config exists
  const config = Store.getConfig();

  // Run data migration if needed
  migrateDataV2();
  migrateDataV3();

  // Set club name in sidebar
  document.getElementById('sidebar-club-name').textContent = config.clubName;

  // Set current year from config
  State.currentYear = config.currentYear || new Date().getFullYear();
  State.reportYear = State.currentYear;
  State.detailYear = State.currentYear;

  // Try to reconnect to previously used file
  if (FileStorage.isSupported()) {
    const reconnected = await FileStorage.tryReconnect();
    if (reconnected) {
      // Migrate if file data is older version
      migrateDataV2();
      migrateDataV3();
      const cfg = Store.getConfig();
      document.getElementById('sidebar-club-name').textContent = cfg.clubName;
      State.currentYear = cfg.currentYear || new Date().getFullYear();
      State.reportYear = State.currentYear;
      State.detailYear = State.currentYear;
      navigate('dashboard');
      return;
    }
  }

  // No file connected — show welcome screen with file connection options
  navigate('dashboard');

  // If no data exists yet and File API is supported, show the connect prompt
  const members = Store.getMembers();
  if (FileStorage.isSupported() && !FileStorage.isConnected()) {
    // Show a non-blocking welcome prompt after a moment
    setTimeout(() => {
      if (!FileStorage.isConnected()) {
        showFileConnectModal();
      }
    }, 600);
  }

  // Browser compatibility notice
  if (!FileStorage.isSupported()) {
    setTimeout(() => {
      const main = document.getElementById('main');
      if (main) {
        const banner = document.createElement('div');
        banner.className = 'alert alert-warning mb-2 no-print';
        banner.style.cursor = 'pointer';
        banner.innerHTML = '<i class="fa-solid fa-globe"></i> <strong>Για βέλτιστη λειτουργία χρησιμοποιήστε Google Chrome ή Microsoft Edge.</strong> Ο τρέχων browser δεν υποστηρίζει αυτόματη αποθήκευση σε αρχείο.';
        banner.onclick = () => banner.remove();
        main.insertBefore(banner, main.firstChild);
      }
    }, 300);
  }
}

window.addEventListener('DOMContentLoaded', init);
