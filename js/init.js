// ─── INIT ─────────────────────────────────────────────
async function init() {
  // Ensure config exists
  const config = Store.getConfig();

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
      // Successfully reconnected - load data from file
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
}

window.addEventListener('DOMContentLoaded', init);
