// ─── CONSTANTS ─────────────────────────────────────────
const MONTHS_GR = ['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος',
                   'Μάιος','Ιούνιος','Ιούλιος','Αύγουστος',
                   'Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος'];
const MONTHS_SHORT = ['ΙΑΝ','ΦΕΒ','ΜΑΡ','ΑΠΡ','ΜΑΙ','ΙΟΥΝ',
                      'ΙΟΥΛ','ΑΥΓ','ΣΕΠ','ΟΚΤ','ΝΟΕ','ΔΕΚ'];

const LS_MEMBERS  = 'syllógos_members';
const LS_PAYMENTS = 'syllógos_payments';
const LS_CONFIG   = 'syllógos_config';

const DEFAULT_CONFIG = {
  clubName: 'ΠΑΛΑΙΣΤΙΚΟΣ ΠΟΛ. ΣΥΛΛΟΓΟΣ ΡΑΦΗΝΑΣ ΚΑΙ ΠΕΡΙΧΩΡΩΝ',
  currentYear: new Date().getFullYear(),
  categories: [
    { id: 'adult',    label: 'Ενήλικας',      fee: 25 },
    { id: 'child',    label: 'Παιδί',          fee: 15 },
    { id: 'honorary', label: 'Επίτιμο Μέλος',  fee: 0  }
  ]
};

// ─── FILE STORAGE (File System Access API) ────────────
// Primary storage: real .json file on disk
// Fallback: localStorage (when File API not available)
const FileStorage = {
  fileHandle: null,
  fileName: null,
  _saveTimer: null,
  _idbDB: null,

  // Check browser support
  isSupported() {
    return 'showSaveFilePicker' in window;
  },

  // ─ IndexedDB helpers (to persist file handle across sessions) ─
  async _openIDB() {
    if (this._idbDB) return this._idbDB;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('syllogos_file_handles', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('handles');
      req.onsuccess = () => { this._idbDB = req.result; resolve(req.result); };
      req.onerror = () => reject(req.error);
    });
  },

  async _saveHandleToIDB(handle) {
    try {
      const db = await this._openIDB();
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(handle, 'dataFile');
    } catch (e) { console.warn('Could not save handle to IDB:', e); }
  },

  async _getHandleFromIDB() {
    try {
      const db = await this._openIDB();
      return new Promise((resolve) => {
        const tx = db.transaction('handles', 'readonly');
        const req = tx.objectStore('handles').get('dataFile');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch { return null; }
  },

  async _clearHandleFromIDB() {
    try {
      const db = await this._openIDB();
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').delete('dataFile');
    } catch {}
  },

  // ─ Try to reconnect to last used file on startup ─
  async tryReconnect() {
    if (!this.isSupported()) return false;
    const handle = await this._getHandleFromIDB();
    if (!handle) return false;

    try {
      // Request permission (user may need to click)
      const perm = await handle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        this.fileHandle = handle;
        this.fileName = handle.name;
        await this._readFromFile();
        this._updateStatusUI(true);
        return true;
      }
      // Permission prompt needed — we'll handle this in the welcome screen
      // Store the handle for later use
      this._pendingHandle = handle;
      return false;
    } catch {
      return false;
    }
  },

  // ─ Request permission for a pending handle (needs user gesture) ─
  async requestPendingPermission() {
    if (!this._pendingHandle) return false;
    try {
      const perm = await this._pendingHandle.requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        this.fileHandle = this._pendingHandle;
        this.fileName = this._pendingHandle.name;
        this._pendingHandle = null;
        await this._readFromFile();
        this._updateStatusUI(true);
        return true;
      }
    } catch {}
    return false;
  },

  // ─ Create a new data file ─
  async createNewFile() {
    if (!this.isSupported()) {
      showToast('Ο browser δεν υποστηρίζει File System API. Χρησιμοποιήστε Chrome ή Edge.', 'error');
      return false;
    }
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'syllogos_data.json',
        types: [{
          description: 'JSON Data File',
          accept: { 'application/json': ['.json'] }
        }]
      });
      this.fileHandle = handle;
      this.fileName = handle.name;
      await this._saveHandleToIDB(handle);

      // Write initial empty data
      const initData = {
        version: '2.0',
        lastSaved: new Date().toISOString(),
        members: [],
        payments: [],
        config: { ...DEFAULT_CONFIG }
      };
      await this._writeToFile(initData);

      // Also sync to localStorage
      localStorage.setItem(LS_MEMBERS, JSON.stringify(initData.members));
      localStorage.setItem(LS_PAYMENTS, JSON.stringify(initData.payments));
      localStorage.setItem(LS_CONFIG, JSON.stringify(initData.config));

      this._updateStatusUI(true);
      showToast(`Αρχείο "${handle.name}" δημιουργήθηκε`, 'success');
      return true;
    } catch (e) {
      if (e.name !== 'AbortError') showToast('Σφάλμα δημιουργίας αρχείου: ' + e.message, 'error');
      return false;
    }
  },

  // ─ Open an existing data file ─
  async openExistingFile() {
    if (!this.isSupported()) {
      showToast('Ο browser δεν υποστηρίζει File System API. Χρησιμοποιήστε Chrome ή Edge.', 'error');
      return false;
    }
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'JSON Data File',
          accept: { 'application/json': ['.json'] }
        }]
      });
      this.fileHandle = handle;
      this.fileName = handle.name;
      await this._saveHandleToIDB(handle);
      await this._readFromFile();
      this._updateStatusUI(true);
      showToast(`Αρχείο "${handle.name}" φορτώθηκε`, 'success');
      return true;
    } catch (e) {
      if (e.name !== 'AbortError') showToast('Σφάλμα ανοίγματος αρχείου: ' + e.message, 'error');
      return false;
    }
  },

  // ─ Read data from file and sync to localStorage ─
  async _readFromFile() {
    if (!this.fileHandle) return;
    try {
      const file = await this.fileHandle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate
      if (!Array.isArray(data.members) || !Array.isArray(data.payments)) {
        throw new Error('Μη έγκυρη δομή αρχείου');
      }

      // Sync to localStorage (used as fast read cache)
      localStorage.setItem(LS_MEMBERS, JSON.stringify(data.members));
      localStorage.setItem(LS_PAYMENTS, JSON.stringify(data.payments));
      if (data.config) localStorage.setItem(LS_CONFIG, JSON.stringify(data.config));

      return data;
    } catch (e) {
      showToast('Σφάλμα ανάγνωσης αρχείου: ' + e.message, 'error');
      throw e;
    }
  },

  // ─ Write all current data to file ─
  async _writeToFile(data) {
    if (!this.fileHandle) return;
    try {
      const writable = await this.fileHandle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
    } catch (e) {
      console.error('File write error:', e);
      throw e;
    }
  },

  // ─ Auto-save: called after every data mutation ─
  scheduleAutoSave() {
    if (!this.fileHandle) return;

    // Debounce: wait 500ms after last change
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._performAutoSave(), 500);
  },

  async _performAutoSave() {
    if (!this.fileHandle) return;
    this._showAutoSaveIndicator('saving');
    try {
      const data = {
        version: '2.0',
        lastSaved: new Date().toISOString(),
        members: Store.getMembers(),
        payments: Store.getPayments(),
        config: Store.getConfig()
      };
      await this._writeToFile(data);
      this._showAutoSaveIndicator('saved');
    } catch (e) {
      this._showAutoSaveIndicator('error');
      showToast('Αποτυχία αυτόματης αποθήκευσης: ' + e.message, 'error');
    }
  },

  // ─ Force save now ─
  async saveNow() {
    if (!this.fileHandle) {
      showToast('Δεν υπάρχει συνδεδεμένο αρχείο', 'warning');
      return;
    }
    await this._performAutoSave();
    showToast('Αποθηκεύτηκε στο αρχείο', 'success');
  },

  // ─ Disconnect from file ─
  disconnect() {
    this.fileHandle = null;
    this.fileName = null;
    this._pendingHandle = null;
    this._clearHandleFromIDB();
    this._updateStatusUI(false);
    showToast('Αποσυνδέθηκε από το αρχείο', 'info');
  },

  // ─ Prompt user to connect (from sidebar click) ─
  async promptConnect() {
    if (this.fileHandle) {
      // Already connected — show options
      Modals.open(`
        <div class="modal-header">
          <h3>📁 Αρχείο Δεδομένων</h3>
          <button class="modal-close" onclick="Modals.close()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="alert alert-success">
            ✓ Συνδεδεμένο: <strong>${Utils.escapeHtml(this.fileName)}</strong>
          </div>
          <p class="text-muted mb-2" style="font-size:0.88rem">
            Τα δεδομένα αποθηκεύονται αυτόματα σε αυτό το αρχείο μετά από κάθε αλλαγή.
          </p>
          <div class="gap-row">
            <button class="btn btn-primary" onclick="FileStorage.saveNow(); Modals.close()">💾 Αποθήκευση Τώρα</button>
            <button class="btn btn-outline" onclick="Modals.close(); FileStorage.switchFile()">📂 Αλλαγή Αρχείου</button>
            <button class="btn btn-danger btn-sm" onclick="FileStorage.disconnect(); Modals.close(); renderView()">Αποσύνδεση</button>
          </div>
        </div>
      `);
    } else {
      // Not connected — show welcome-like options
      showFileConnectModal();
    }
  },

  // ─ Switch to different file ─
  async switchFile() {
    const ok = await this.openExistingFile();
    if (!ok) return;
    renderView();
  },

  // ─ UI Helpers ─
  _updateStatusUI(connected) {
    const dot = document.getElementById('file-status-dot');
    const text = document.getElementById('file-status-text');
    if (!dot || !text) return;

    if (connected && this.fileHandle) {
      dot.className = 'file-status-dot connected';
      text.innerHTML = `<strong>📁 ${Utils.escapeHtml(this.fileName)}</strong>Αυτόματη αποθήκευση`;
    } else {
      dot.className = 'file-status-dot disconnected';
      text.innerHTML = `<strong>Χωρίς αρχείο</strong>Κλικ για σύνδεση`;
    }
  },

  _showAutoSaveIndicator(state) {
    const el = document.getElementById('autosave-indicator');
    if (!el) return;
    el.className = `autosave-indicator show ${state}`;
    if (state === 'saving') {
      el.textContent = '⏳ Αποθήκευση...';
    } else if (state === 'saved') {
      el.textContent = '✓ Αποθηκεύτηκε';
      setTimeout(() => el.classList.remove('show'), 2000);
    } else if (state === 'error') {
      el.textContent = '✗ Σφάλμα αποθήκευσης';
      setTimeout(() => el.classList.remove('show'), 4000);
    }
  },

  isConnected() {
    return !!this.fileHandle;
  }
};

// ─── STORE (localStorage as cache + file auto-save) ───
const Store = {
  getMembers() {
    try {
      return JSON.parse(localStorage.getItem(LS_MEMBERS)) || [];
    } catch { return []; }
  },
  saveMembers(members) {
    localStorage.setItem(LS_MEMBERS, JSON.stringify(members));
    FileStorage.scheduleAutoSave();
  },
  getPayments() {
    try {
      return JSON.parse(localStorage.getItem(LS_PAYMENTS)) || [];
    } catch { return []; }
  },
  savePayments(payments) {
    localStorage.setItem(LS_PAYMENTS, JSON.stringify(payments));
    FileStorage.scheduleAutoSave();
  },
  getConfig() {
    try {
      const cfg = JSON.parse(localStorage.getItem(LS_CONFIG));
      return cfg || { ...DEFAULT_CONFIG };
    } catch { return { ...DEFAULT_CONFIG }; }
  },
  saveConfig(config) {
    localStorage.setItem(LS_CONFIG, JSON.stringify(config));
    FileStorage.scheduleAutoSave();
  },
  getStorageSize() {
    let total = 0;
    for (let key of [LS_MEMBERS, LS_PAYMENTS, LS_CONFIG]) {
      const item = localStorage.getItem(key);
      if (item) total += item.length * 2; // UTF-16
    }
    return total;
  },
  exportBackup() {
    const data = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      members: this.getMembers(),
      payments: this.getPayments(),
      config: this.getConfig()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `syllógos_backup_${Utils.formatDateISO(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Το αντίγραφο ασφαλείας κατέβηκε επιτυχώς', 'success');
  },
  importBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.members || !data.payments) {
            reject('Μη έγκυρο αρχείο backup');
            return;
          }
          this.saveMembers(data.members);
          this.savePayments(data.payments);
          if (data.config) this.saveConfig(data.config);
          resolve(data);
        } catch (err) {
          reject('Σφάλμα ανάγνωσης αρχείου: ' + err.message);
        }
      };
      reader.onerror = () => reject('Σφάλμα ανάγνωσης αρχείου');
      reader.readAsText(file);
    });
  }
};
