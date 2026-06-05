/* ============================================================
   utils.js — Firebase Firestore Edition v5.1
   ============================================================
   🔧 FIX v5.1:
   - Firebase init เสร็จก่อน ค่อย fire event 'firebase:ready'
   - app.js รอ event นี้ก่อน render ทุกอย่าง
   - แก้ race condition ทั้งหมด
   ============================================================ */

'use strict';

/* ============================================================
   A. FIREBASE CONFIG
   ============================================================ */
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyDBxjQyLCb4DWY36QhCGb3qM-L4S2Mh854',
  authDomain:        'honest-hub-ce8e4.firebaseapp.com',
  projectId:         'honest-hub-ce8e4',
  storageBucket:     'honest-hub-ce8e4.firebasestorage.app',
  messagingSenderId: '102820431622',
  appId:             '1:102820431622:web:45b722ee3553e2a928c087',
};


/* ============================================================
   C. GLOBAL STATE
   ============================================================ */
let isAdmin  = false;
let isOnline = false;

// Promise ที่ทุกโมดูลรอได้ — resolve เมื่อ Firebase init เสร็จ
let _firebaseReadyResolve;
const firebaseReady = new Promise(resolve => { _firebaseReadyResolve = resolve; });


/* ============================================================
   B. DB LAYER
   ============================================================ */
let _db        = null;
let _firestore = null;

async function initFirebase() {
  try {
    const { initializeApp } = await import(
      'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'
    );
    const {
      getFirestore, doc, getDoc, setDoc, deleteDoc,
      collection, addDoc, getDocs, query, orderBy,
      onSnapshot, serverTimestamp,
    } = await import(
      'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'
    );

    const app  = initializeApp(FIREBASE_CONFIG);
    _db        = getFirestore(app);
    _firestore = {
      doc, getDoc, setDoc, deleteDoc,
      collection, addDoc, getDocs,
      query, orderBy, onSnapshot, serverTimestamp,
    };
    isOnline = true;
    console.log('✅ Firebase Firestore connected');

  } catch (err) {
    console.warn('⚠️ Firebase init failed — localStorage fallback:', err.message);
    isOnline = false;
  } finally {
    // ไม่ว่า Firebase จะสำเร็จหรือไม่ — บอก app.js ว่าพร้อมแล้ว
    _firebaseReadyResolve();
    document.dispatchEvent(new CustomEvent('firebase:ready', { detail: { isOnline } }));
  }
}


/* ── localStorage helpers ── */
function _lsGet(key) {
  try { return JSON.parse(localStorage.getItem('hh_' + key) || 'null'); }
  catch { return null; }
}
function _lsSet(key, value) {
  try { localStorage.setItem('hh_' + key, JSON.stringify(value)); return true; }
  catch { return false; }
}


const DB = {

  /* รอ Firebase พร้อมก่อนทุก operation */
  async ready() { await firebaseReady; },

  async get(key) {
    await this.ready();
    if (isOnline && _db) {
      try {
        const snap = await _firestore.getDoc(_firestore.doc(_db, 'hh_data', key));
        return snap.exists() ? snap.data().value : null;
      } catch (err) { console.warn('DB.get error:', err.message); }
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
      } catch (err) { console.warn('DB.set error:', err.message); }
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
      catch (err) { console.warn('DB.remove error:', err.message); }
    }
    try { localStorage.removeItem('hh_' + key); } catch { /* silent */ }
  },

  /* ── COMMENTS ── */
  comments: {

    async add(data) {
      await firebaseReady;
      if (isOnline && _db) {
        try {
          const ref = await _firestore.addDoc(
            _firestore.collection(_db, 'hh_comments'),
            { ...data, ts: _firestore.serverTimestamp() }
          );
          return ref.id;
        } catch (err) { console.warn('comments.add error:', err.message); }
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
          const q    = _firestore.query(
            _firestore.collection(_db, 'hh_comments'),
            _firestore.orderBy('ts', 'desc')
          );
          const snap = await _firestore.getDocs(q);
          return snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
        } catch (err) { console.warn('comments.getAll error:', err.message); }
      }
      return _lsGet('comments') || [];
    },

    async delete(item) {
      await firebaseReady;
      // ลบจาก Firestore ถ้ามี firestoreId
      if (isOnline && _db && item.firestoreId) {
        try {
          await _firestore.deleteDoc(
            _firestore.doc(_db, 'hh_comments', item.firestoreId)
          );
          return true;
        } catch (err) { console.warn('comments.delete Firestore error:', err.message); }
      }
      // localStorage fallback
      let arr = _lsGet('comments') || [];
      arr = arr.filter(c => c.id !== item.id);
      _lsSet('comments', arr);
      return true;
    },

    listenForNew(callback) {
      if (!isOnline || !_db) return () => {};
      try {
        const q = _firestore.query(
          _firestore.collection(_db, 'hh_comments'),
          _firestore.orderBy('ts', 'desc')
        );
        return _firestore.onSnapshot(q,
          snap => callback(snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }))),
          err  => console.warn('comments listener error:', err.message)
        );
      } catch (err) {
        console.warn('listenForNew setup error:', err.message);
        return () => {};
      }
    },
  },

  /* ── ANNOUNCEMENTS ── */
  announcements: {

    async add(data) {
      await firebaseReady;
      if (isOnline && _db) {
        try {
          const ref = await _firestore.addDoc(
            _firestore.collection(_db, 'hh_announcements'),
            { ...data, ts: _firestore.serverTimestamp() }
          );
          return ref.id;
        } catch (err) { console.warn('announcements.add error:', err.message); }
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
          const q    = _firestore.query(
            _firestore.collection(_db, 'hh_announcements'),
            _firestore.orderBy('ts', 'desc')
          );
          const snap = await _firestore.getDocs(q);
          return snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
        } catch (err) { console.warn('announcements.getAll error:', err.message); }
      }
      return _lsGet('announcements') || [];
    },

    async delete(item) {
      await firebaseReady;
      if (isOnline && _db && item.firestoreId) {
        try {
          await _firestore.deleteDoc(
            _firestore.doc(_db, 'hh_announcements', item.firestoreId)
          );
          return true;
        } catch (err) { console.warn('announcements.delete error:', err.message); }
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
          // ใช้ merge:true + แค่ field pinned — ไม่ spread Timestamp object
          await _firestore.setDoc(
            _firestore.doc(_db, 'hh_announcements', item.firestoreId),
            { pinned: !item.pinned },
            { merge: true }
          );
          return;
        } catch (err) { console.warn('announcements.togglePin error:', err.message); }
      }
      let arr = _lsGet('announcements') || [];
      arr = arr.map(a => a.id === item.id ? { ...a, pinned: !a.pinned } : a);
      _lsSet('announcements', arr);
    },

    listenForNew(callback) {
      if (!isOnline || !_db) return () => {};
      try {
        const q = _firestore.query(
          _firestore.collection(_db, 'hh_announcements'),
          _firestore.orderBy('ts', 'desc')
        );
        return _firestore.onSnapshot(q,
          snap => callback(snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }))),
          err  => console.warn('announcements listener error:', err.message)
        );
      } catch (err) {
        console.warn('announcements listenForNew error:', err.message);
        return () => {};
      }
    },
  },
};


/* ============================================================
   D. TOAST
   ============================================================ */
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


/* ============================================================
   E. CONFIRM DIALOG
   ============================================================ */
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

  newOk.addEventListener('click', () => {
    overlay.classList.remove('open');
    if (typeof onConfirm === 'function') onConfirm();
  });
  newCancel.addEventListener('click', () => overlay.classList.remove('open'));
}


/* ============================================================
   F. MODAL HELPERS
   ============================================================ */
function openModal(id) {
  const el = document.getElementById('modal-' + id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  const el = document.getElementById('modal-' + id);
  if (el) el.classList.remove('open');
}
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function (e) {
      if (this.id === 'modal-confirm') return;
      if (e.target === this) this.classList.remove('open');
    });
  });
});


/* ============================================================
   G. ACTIVITY LOG
   ============================================================ */
async function addLog(text) {
  await DB.push('logs', {
    text,
    time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
  }, 30);
}


/* ============================================================
   H. BOOTSTRAP — เริ่ม Firebase ทันที ไม่รอ DOMContentLoaded
   ============================================================ */
(async function bootstrap() {
  // localStorage availability check
  try {
    localStorage.setItem('__hh_test__', '1');
    localStorage.removeItem('__hh_test__');
  } catch {
    document.addEventListener('DOMContentLoaded', () => {
      const b = document.createElement('div');
      b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#b94040;color:#fff;text-align:center;padding:10px;font-size:0.84rem;font-family:Sarabun,sans-serif';
      b.textContent   = '⚠️ กรุณาปิด Private Mode หรือเปิด Cookies';
      document.body.prepend(b);
    });
  }

  // เริ่ม Firebase init ทันที — ไม่รอ DOM
  await initFirebase();
})();
