// ─── UTILS ────────────────────────────────────────────
const Utils = {
  generateId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  },
  formatDate(dateStr) {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  },
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
  formatMoney(amount) {
    if (amount == null || isNaN(amount)) return '0,00 €';
    return Number(amount).toLocaleString('el-GR', { style: 'currency', currency: 'EUR' });
  },
  getMemberFullName(member) {
    return `${member.lastName} ${member.firstName}`.trim();
  },
  getChildFullName(member) {
    if (!member.child || !member.child.firstName) return '';
    return `${member.child.lastName || member.lastName} ${member.child.firstName}`.trim();
  },
  getMonthName(m) { return MONTHS_GR[m - 1] || ''; },
  getMonthShort(m) { return MONTHS_SHORT[m - 1] || ''; },
  getCategoryLabel(catId) {
    const config = Store.getConfig();
    const cat = config.categories.find(c => c.id === catId);
    return cat ? cat.label : catId;
  },
  getCategoryFee(catId) {
    const config = Store.getConfig();
    const cat = config.categories.find(c => c.id === catId);
    return cat ? cat.fee : 0;
  },
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
    if (year < regYear) return false;
    if (year === regYear && month < regMonth) return false;
    return true;
  },
  getMemberPaymentsForYear(memberId, year) {
    const payments = Store.getPayments();
    return payments.filter(p => p.memberId === memberId && p.year === year);
  },
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
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
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
  getNextMemberNumber() {
    const config = Store.getConfig();
    return (config.lastMemberNumber || 0) + 1;
  },
  incrementMemberCounter() {
    const config = Store.getConfig();
    const next = (config.lastMemberNumber || 0) + 1;
    config.lastMemberNumber = next;
    Store.saveConfig(config);
    return next;
  },
  // Get receipt number from the Receipt entity
  getReceiptNumberForPayment(payment) {
    const receipts = Store.getReceipts();
    const receipt = receipts.find(r => r.id === payment.receiptId);
    return receipt ? receipt.receiptNumber : (payment.receiptNumber || '?');
  },
  getPaymentMethodLabel(methodId) {
    const method = PAYMENT_METHODS.find(pm => pm.id === methodId);
    return method ? method.label : methodId || 'Μετρητά';
  },
  sanitizeFilename(name) {
    return name.replace(/[/\\:*?"<>|]/g, '_').trim();
  }
};
