// ─── STATE ────────────────────────────────────────────
const State = {
  currentView: 'dashboard',
  currentMemberId: null,
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1,
  searchQuery: '',
  filterStatus: 'all',
  filterCategory: 'all',
  paymentSubTab: 'entry',
  reportType: 'debtors',
  reportYear: new Date().getFullYear(),
  detailYear: new Date().getFullYear()
};

// ─── TOAST ────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: '<i class="fa-solid fa-check"></i>', error: '<i class="fa-solid fa-xmark"></i>', warning: '<i class="fa-solid fa-triangle-exclamation"></i>', info: '<i class="fa-solid fa-circle-info"></i>' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${Utils.escapeHtml(message)}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ─── SIDEBAR TOGGLE ───────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ─── ROUTER ───────────────────────────────────────────
function navigate(view, params) {
  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');

  State.currentView = view;
  if (params) {
    if (params.memberId) State.currentMemberId = params.memberId;
    if (params.year) State.currentYear = params.year;
  }

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const activeItem = document.querySelector(`.nav-item[data-view="${view === 'memberDetail' ? 'members' : view}"]`);
  if (activeItem) activeItem.classList.add('active');

  renderView();
}

function renderView() {
  const main = document.getElementById('main');
  switch (State.currentView) {
    case 'dashboard':   main.innerHTML = Views.dashboard(); break;
    case 'members':     main.innerHTML = Views.memberList(); break;
    case 'memberDetail': main.innerHTML = Views.memberDetail(State.currentMemberId); break;
    case 'payments':    main.innerHTML = Views.payments(); break;
    case 'reports':     main.innerHTML = Views.reports(); break;
    case 'settings':    main.innerHTML = Views.settings(); break;
    default:            main.innerHTML = Views.dashboard();
  }
}

// ─── MODALS ───────────────────────────────────────────
const Modals = {
  open(content, wide = false) {
    const overlay = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-container');
    container.className = wide ? 'modal modal-wide' : 'modal';
    container.innerHTML = content;
    overlay.classList.add('open');
    // Focus first input
    setTimeout(() => {
      const first = container.querySelector('input:not([type=hidden]), select, textarea');
      if (first) first.focus();
    }, 100);
  },
  close() {
    document.getElementById('modal-overlay').classList.remove('open');
  },
  confirm(message, warningText, onConfirm) {
    this.open(`
      <div class="modal-header">
        <h3>Επιβεβαίωση</h3>
        <button class="modal-close" onclick="Modals.close()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="confirm-body">
          <span class="confirm-icon"><i class="fa-solid fa-triangle-exclamation" style="color:var(--accent)"></i></span>
          <p>${message}</p>
          ${warningText ? `<p class="confirm-warning">${warningText}</p>` : ''}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="Modals.close()">Ακύρωση</button>
        <button class="btn btn-danger" id="confirm-yes-btn">Επιβεβαίωση</button>
      </div>
    `);
    document.getElementById('confirm-yes-btn').addEventListener('click', () => {
      Modals.close();
      onConfirm();
    });
  }
};

// Close modal on overlay click and Escape key
// Only close on overlay click if it's NOT a form (confirm dialogs are ok to dismiss)
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    // Check if modal contains a form — if so, don't close on outside click
    const modal = document.getElementById('modal-container');
    const hasForm = modal && modal.querySelector('form');
    if (hasForm) {
      // Flash the modal to hint that clicking outside doesn't close it
      modal.style.animation = 'none';
      modal.offsetHeight; // reflow
      modal.style.animation = 'modalShake 0.3s ease';
      return;
    }
    Modals.close();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('modal-container');
    const overlay = document.getElementById('modal-overlay');
    if (!overlay.classList.contains('open')) return;
    const hasForm = modal && modal.querySelector('form');
    if (hasForm) {
      // Ask before discarding form
      if (confirm('Θέλετε να κλείσετε τη φόρμα; Οι αλλαγές θα χαθούν.')) {
        Modals.close();
      }
    } else {
      Modals.close();
    }
  }
});
