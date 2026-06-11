/* ============================================================
   utils.js — v6.1 FINAL
   ============================================================
   FIX:
   - firebase:ready รอ DOMContentLoaded ก่อน dispatch
   - DB layer ครบถ้วน + error handling
   - addLog throttle ป้องกัน quota leak
   ============================================================ */

'use strict';

/* ── Firebase Config ── */
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyDBxjQyLCb4DWY36QhCGb3qM-L4S2Mh854',
  authDomain:        'honest-hub-ce8e4.firebaseapp.com',
  projectId:         'honest-hub-ce8e4',
  storageBucket:     'honest-hub-ce8e4.firebasestorage.app',
  messagingSenderId: '102820431622',
  appId:             '1:102820431622:web:45b722ee3553e2a928c087',
};

/* ── Global State ── */
let isAdmin  = false;
let isOnline = false;
let _db        = null;
let _firestore = null;

/* ── Firebase Ready Promise ── */
let _firebaseReadyResolve;
const firebaseReady = new Promise(r => { _firebaseReadyResolve = r; });

/* ── addLog throttle — ป้องกัน quota leak ── */
let _lastLogText = '';
let _lastLogTime = 0;

/* ── localStorage helpers ── */
function _lsGet(key) {
  try { return JSON.parse(localStorage.getItem('hh_' + key) || 'null'); }
  catch { return null; }
}
function _lsSet(key, value) {
  try { localStorage.setItem('hh_' + key, JSON.stringify(value)); return true; }
  catch { return false; }
}

/* ── Firebase init ── */
async function initFirebase() {
  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const {
      getFirestore, doc, getDoc, setDoc, deleteDoc,
      collection, addDoc, getDocs, query, orderBy,
      onSnapshot, serverTimestamp,
    } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    const app  = initializeApp(FIREBASE_CONFIG);
    _db        = getFirestore(app);
    _firestore = { doc, getDoc, setDoc, deleteDoc, collection, addDoc, getDocs, query, orderBy, onSnapshot, serverTimestamp };
    isOnline   = true;
    console.log('✅ Firebase connected');
  } catch (err) {
    console.warn('⚠️ Firebase failed → localStorage fallback:', err.message);
    isOnline = false;
  }
}

/* ── DB Object ── */
const DB = {
  async ready() { await firebaseReady; },

  async get(key) {
    await this.ready();
    if (isOnline && _db) {
      try {
        const snap = await _firestore.getDoc(_firestore.doc(_db, 'hh_data', key));
        return snap.exists() ? snap.data().value : null;
      } catch (e) { console.warn('DB.get:', e.message); }
    }
    return _lsGet(key);
  },

  async set(key, value) {
    await this.ready();
    if (isOnline && _db) {
      try {
        await _firestore.setDoc(
          _firestore.doc(_db, 'hh_data', key),
          { value, updatedAt: _firestore.serverTimestamp() }
        );
        return true;
      } catch (e) { console.warn('DB.set:', e.message); }
    }
    return _lsSet(key, value);
  },

  async push(key, item, limit = 100) {
    const arr = (await this.get(key)) || [];
    arr.unshift(item);
    await this.set(key, arr.slice(0, limit));
  },

  async remove(key) {
    await this.ready();
    if (isOnline && _db) {
      try { await _firestore.deleteDoc(_firestore.doc(_db, 'hh_data', key)); }
      catch (e) { console.warn('DB.remove:', e.message); }
    }
    try { localStorage.removeItem('hh_' + key); } catch { /* silent */ }
  },

  comments: {
    async add(data) {
      await firebaseReady;
      if (isOnline && _db) {
        try {
          const ref = await _firestore.addDoc(_firestore.collection(_db, 'hh_comments'), { ...data, ts: _firestore.serverTimestamp() });
          return ref.id;
        } catch (e) { console.warn('comments.add:', e.message); }
      }
      const arr = _lsGet('comments') || [];
      arr.unshift(data);
      _lsSet('comments', arr.slice(0, 200));
      return data.id;
    },

    async getAll() {
      await firebaseReady;
      if (isOnline && _db) {
        try {
          const snap = await _firestore.getDocs(_firestore.query(_firestore.collection(_db, 'hh_comments'), _firestore.orderBy('ts', 'desc')));
          return snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
        } catch (e) { console.warn('comments.getAll:', e.message); }
      }
      return _lsGet('comments') || [];
    },

    async delete(item) {
      await firebaseReady;
      if (isOnline && _db && item.firestoreId) {
        try {
          await _firestore.deleteDoc(_firestore.doc(_db, 'hh_comments', item.firestoreId));
          return true;
        } catch (e) { console.warn('comments.delete:', e.message); }
      }
      let arr = _lsGet('comments') || [];
      arr = arr.filter(c => c.id !== item.id);
      _lsSet('comments', arr);
      return true;
    },

    listenForNew(callback) {
      if (!isOnline || !_db) return () => {};
      try {
        const q = _firestore.query(_firestore.collection(_db, 'hh_comments'), _firestore.orderBy('ts', 'desc'));
        return _firestore.onSnapshot(q,
          snap => callback(snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }))),
          err  => console.warn('comments listener:', err.message)
        );
      } catch (e) { console.warn('listenForNew:', e.message); return () => {}; }
    },
  },

  announcements: {
    async add(data) {
      await firebaseReady;
      if (isOnline && _db) {
        try {
          const ref = await _firestore.addDoc(_firestore.collection(_db, 'hh_announcements'), { ...data, ts: _firestore.serverTimestamp() });
          return ref.id;
        } catch (e) { console.warn('announcements.add:', e.message); }
      }
      const arr = _lsGet('announcements') || [];
      arr.unshift(data);
      _lsSet('announcements', arr.slice(0, 100));
      return data.id;
    },

    async getAll() {
      await firebaseReady;
      if (isOnline && _db) {
        try {
          const snap = await _firestore.getDocs(_firestore.query(_firestore.collection(_db, 'hh_announcements'), _firestore.orderBy('ts', 'desc')));
          return snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
        } catch (e) { console.warn('announcements.getAll:', e.message); }
      }
      return _lsGet('announcements') || [];
    },

    async delete(item) {
      await firebaseReady;
      if (isOnline && _db && item.firestoreId) {
        try {
          await _firestore.deleteDoc(_firestore.doc(_db, 'hh_announcements', item.firestoreId));
          return true;
        } catch (e) { console.warn('announcements.delete:', e.message); }
      }
      let arr = _lsGet('announcements') || [];
      arr = arr.filter(a => a.id !== item.id);
      _lsSet('announcements', arr);
      return true;
    },

    async togglePin(item) {
      await firebaseReady;
      if (isOnline && _db && item.firestoreId) {
        try {
          await _firestore.setDoc(_firestore.doc(_db, 'hh_announcements', item.firestoreId), { pinned: !item.pinned }, { merge: true });
          return;
        } catch (e) { console.warn('togglePin:', e.message); }
      }
      let arr = _lsGet('announcements') || [];
      arr = arr.map(a => a.id === item.id ? { ...a, pinned: !a.pinned } : a);
      _lsSet('announcements', arr);
    },

    listenForNew(callback) {
      if (!isOnline || !_db) return () => {};
      try {
        const q = _firestore.query(_firestore.collection(_db, 'hh_announcements'), _firestore.orderBy('ts', 'desc'));
        return _firestore.onSnapshot(q,
          snap => callback(snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }))),
          err  => console.warn('announcements listener:', err.message)
        );
      } catch (e) { console.warn('announcements listenForNew:', e.message); return () => {}; }
    },
  },
};

/* ── Toast ── */
function showToast(message, type = 'default', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className   = 'toast' + (type !== 'default' ? ' toast--' + type : '');
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.parentNode && toast.parentNode.removeChild(toast), 320);
  }, duration);
}

/* ── Confirm Dialog ── */
function showConfirm(message, onConfirm, icon = '⚠️', title = 'ยืนยันการดำเนินการ') {
  const overlay   = document.getElementById('modal-confirm');
  const msgEl     = document.getElementById('confirmMsg');
  const titleEl   = document.getElementById('confirmTitle');
  const iconEl    = document.getElementById('confirmIcon');
  const okBtn     = document.getElementById('confirmOkBtn');
  const cancelBtn = document.getElementById('confirmCancelBtn');

  iconEl.textContent  = icon;
  titleEl.textContent = title;
  msgEl.textContent   = message;
  overlay.classList.add('open');

  const newOk     = okBtn.cloneNode(true);
  const newCancel = cancelBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOk, okBtn);
  cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
  newOk.addEventListener('click',     () => { overlay.classList.remove('open'); if (typeof onConfirm === 'function') onConfirm(); });
  newCancel.addEventListener('click', () => overlay.classList.remove('open'));
}

/* ── Modal ── */
function openModal(id) { const el = document.getElementById('modal-' + id); if (el) el.classList.add('open'); }
function closeModal(id) { const el = document.getElementById('modal-' + id); if (el) el.classList.remove('open'); }

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function(e) {
      if (this.id === 'modal-confirm') return;
      if (e.target === this) this.classList.remove('open');
    });
  });
});

/* ── addLog — throttle 60s ป้องกัน quota leak ── */
async function addLog(text) {
  const now = Date.now();
  if (text === _lastLogText && now - _lastLogTime < 60000) return;
  _lastLogText = text;
  _lastLogTime = now;
  await DB.push('logs', {
    text,
    time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
  }, 30);
}

/* ── Bootstrap ── */
(async function bootstrap() {
  try {
    localStorage.setItem('__hh_test__', '1');
    localStorage.removeItem('__hh_test__');
  } catch {
    document.addEventListener('DOMContentLoaded', () => {
      const b = document.createElement('div');
      b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#b94040;color:#fff;text-align:center;padding:10px;font-size:0.84rem;font-family:Sarabun,sans-serif';
      b.textContent   = '⚠️ กรุณาปิด Private Mode หรือเปิด Cookies เพื่อใช้งานเว็บไซต์';
      document.body.prepend(b);
    });
  }

  await initFirebase();

  // รอ DOM พร้อมก่อน dispatch — FIX race condition
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      _firebaseReadyResolve();
      document.dispatchEvent(new CustomEvent('firebase:ready', { detail: { isOnline } }));
    });
  } else {
    // DOM พร้อมแล้ว (script โหลดช้า)
    _firebaseReadyResolve();
    document.dispatchEvent(new CustomEvent('firebase:ready', { detail: { isOnline } }));
  }
})();
