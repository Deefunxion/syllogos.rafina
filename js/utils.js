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
    return d.toISOString().split('T')[0];
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
    if (!member.registrationDate) return true;
    const regDate = new Date(member.registrationDate);
    const checkDate = new Date(year, month - 1, 1); // first day of month
    return regDate <= checkDate;
  },
  getMemberPaymentsForYear(memberId, year) {
    const payments = Store.getPayments();
    return payments.filter(p => p.memberId === memberId && p.year === year);
  },
  isMemberPaidForMonth(memberId, year, month) {
    const payments = Store.getPayments();
    return payments.find(p => p.memberId === memberId && p.year === year && p.month === month) || null;
  },
  getMemberDebt(member, year) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const debtMonths = [];

    for (let m = 1; m <= 12; m++) {
      // Only count months up to current month for the current year
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
  // Get receipt number for a payment within its year
  // Receipt numbers are sequential per year, ordered by paidDate then createdAt
  getReceiptNumber(payment) {
    const payments = Store.getPayments();
    // If the payment has a stored receipt number, use it
    if (payment.receiptNumber) return payment.receiptNumber;
    // Otherwise calculate based on position
    const yearPayments = payments
      .filter(p => p.year === payment.year)
      .sort((a, b) => {
        const da = a.paidDate || a.createdAt || '';
        const db = b.paidDate || b.createdAt || '';
        if (da !== db) return da.localeCompare(db);
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
    const idx = yearPayments.findIndex(p => p.id === payment.id);
    return idx >= 0 ? idx + 1 : 0;
  },
  // Get the next receipt number for a given year
  getNextReceiptNumber(year) {
    const payments = Store.getPayments().filter(p => p.year === year);
    // Find max existing receipt number
    let maxNum = 0;
    payments.forEach(p => {
      if (p.receiptNumber && p.receiptNumber > maxNum) maxNum = p.receiptNumber;
    });
    // Also count payments without receipt numbers just in case
    return Math.max(maxNum, payments.length) + 1;
  }
};
