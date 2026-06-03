/* ============================================================
   utils.js — Firebase Firestore Edition v4.0
   ============================================================
   A. Firebase Config    — ใส่ค่าจาก Firebase Console ตรงนี้
   B. DB Layer           — Firestore (Real-time sync ทุกเครื่อง)
   C. Global State       — isAdmin flag
   D. showToast          — Toast notifications
   E. showConfirm        — Custom confirm dialog
   F. openModal/closeModal
   G. addLog             — Activity log
   H. Storage Check      — Fallback กรณี offline
   ============================================================

   วิธีใช้งาน:
   1. ไปที่ https://console.firebase.google.com
   2. สร้าง Project → เปิด Firestore Database → Spark Plan (ฟรี)
   3. ไปที่ Project Settings → Your apps → Add app → Web (</>)
   4. Copy firebaseConfig มาวางแทนค่าด้านล่าง
   5. ไปที่ Firestore → Rules → วางกฎด้านล่างแล้ว Publish
   ============================================================

   Firestore Security Rules (วางใน Firebase Console → Firestore → Rules):
   ─────────────────────────────────────────────────────────────
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {

       // hh_comments — ทุกคนอ่านได้ เขียนได้ (สำหรับส่ง comment)
       match /hh_comments/{doc} {
         allow read: if true;
         allow create: if request.resource.data.text is string
                       && request.resource.data.text.size() <= 500
                       && request.resource.data.name is string
                       && request.resource.data.name.size() <= 60;
         allow update, delete: if false; // ลบผ่าน Admin เท่านั้น
       }

       // hh_data — ข้อมูลหลัก (budget, activity, logs, visitors)
       // อ่านได้ทุกคน เขียนได้เฉพาะ admin (ผ่าน Worker หรือ Console)
       match /hh_data/{doc} {
         allow read: if true;
         allow write: if false; // ในอนาคตเปิดผ่าน Firebase Auth
       }
     }
   }
   ─────────────────────────────────────────────────────────────
   ============================================================ */

'use strict';

/* ============================================================
   A. FIREBASE CONFIG
   ✏️  วางค่าจาก Firebase Console ตรงนี้
   ============================================================ */
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyCKarzRuQnMXbhFnQyCFbMy9dpoZmkMsvI',
  authDomain:        'honest-hub.firebaseapp.com',
  projectId:         'honest-hub',
  storageBucket:     'honest-hub.firebasestorage.app',
  messagingSenderId: '816486271635',
  appId:             '1:816486271635:web:76c320aba571254cb79b66',
};

/* ============================================================
   B. DB LAYER — Firebase Firestore
   ─────────────────────────────────────────────────────────
   Collection structure ใน Firestore:
   ┌─ hh_data/               ← ข้อมูลหลัก (key-value)
   │   ├─ visitors            { value: 42 }
   │   ├─ budgetData          { value: [...] }
   │   ├─ activityData        { value: [...] }
   │   ├─ activitySeeded      { value: true }
   │   ├─ budgetSeeded        { value: true }
   │   └─ logs                { value: [...] }
   │
   └─ hh_comments/           ← ความคิดเห็น (แต่ละ doc = 1 comment)
       ├─ {auto-id}           { id, name, cat, text, date, ts }
       └─ ...
   ─────────────────────────────────────────────────────────
   ทุกฟังก์ชันรองรับทั้ง Firestore (online) และ localStorage (fallback)
   ============================================================ */

// Firebase SDK (โหลดจาก CDN ใน index.html)
let db        = null;
let firestore = null;
let isOnline  = false;

// Initialize Firebase
async function initFirebase() {
  try {
    const { initializeApp }     = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getFirestore, doc, getDoc, setDoc, collection,
            addDoc, getDocs, deleteDoc, orderBy,
            query, onSnapshot, serverTimestamp }
          = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    // ตรวจสอบว่า config ถูกกรอกแล้ว
    if (FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') {
      console.warn('⚠️  Firebase config ยังไม่ได้กรอก — ใช้ localStorage แทน');
      return false;
    }

    const app = initializeApp(FIREBASE_CONFIG);
    db        = getFirestore(app);
    firestore = { doc, getDoc, setDoc, collection, addDoc,
                  getDocs, deleteDoc, orderBy, query,
                  onSnapshot, serverTimestamp };
    isOnline  = true;

    console.log('✅ Firebase Firestore connected');
    return true;

  } catch (err) {
    console.warn('⚠️  Firebase init failed — fallback to localStorage:', err.message);
    isOnline = false;
    return false;
  }
}

/* ────────────────────────────────────────────────────────────
   DB object — API เหมือนเดิมทุกอย่าง ไฟล์อื่นไม่ต้องแก้เลย
   ──────────────────────────────────────────────────────────── */
const DB = {

  /* ----------------------------------------------------------
     get(key) — ดึงข้อมูลจาก Firestore หรือ localStorage
     ---------------------------------------------------------- */
  async get(key) {
    if (isOnline && db) {
      try {
        const ref  = firestore.doc(db, 'hh_data', key);
        const snap = await firestore.getDoc(ref);
        return snap.exists() ? snap.data().value : null;
      } catch (err) {
        console.warn('DB.get Firestore error, fallback:', err.message);
      }
    }
    // Fallback: localStorage
    try {
      return JSON.parse(localStorage.getItem('hh_' + key) || 'null');
    } catch { return null; }
  },

  /* ----------------------------------------------------------
     set(key, value) — บันทึกลง Firestore หรือ localStorage
     ---------------------------------------------------------- */
  async set(key, value) {
    if (isOnline && db) {
      try {
        const ref = firestore.doc(db, 'hh_data', key);
        await firestore.setDoc(ref, { value, updatedAt: firestore.serverTimestamp() });
        return true;
      } catch (err) {
        console.warn('DB.set Firestore error, fallback:', err.message);
      }
    }
    // Fallback: localStorage
    try {
      localStorage.setItem('hh_' + key, JSON.stringify(value));
      return true;
    } catch { return false; }
  },

  /* ----------------------------------------------------------
     push(key, item, limit) — เพิ่มรายการใหม่ไว้หัวสุด
     ---------------------------------------------------------- */
  async push(key, item, limit = 100) {
    const arr = (await this.get(key)) || [];
    arr.unshift(item);
    await this.set(key, arr.slice(0, limit));
  },

  /* ----------------------------------------------------------
     remove(key) — ลบ key ออก
     ---------------------------------------------------------- */
  async remove(key) {
    if (isOnline && db) {
      try {
        await firestore.deleteDoc(firestore.doc(db, 'hh_data', key));
      } catch (err) {
        console.warn('DB.remove error:', err.message);
      }
    }
    try { localStorage.removeItem('hh_' + key); } catch { /* silent */ }
  },

  /* ----------------------------------------------------------
     COMMENTS — collection แยกต่างหาก (real-time capable)
     ---------------------------------------------------------- */
  comments: {

    // เพิ่ม comment ใหม่
    async add(commentData) {
      if (isOnline && db) {
        try {
          const ref = await firestore.addDoc(
            firestore.collection(db, 'hh_comments'),
            { ...commentData, ts: firestore.serverTimestamp() }
          );
          return ref.id;
        } catch (err) {
          console.warn('comments.add Firestore error, fallback:', err.message);
        }
      }
      // Fallback: localStorage
      const arr = JSON.parse(localStorage.getItem('hh_comments') || '[]');
      arr.unshift(commentData);
      localStorage.setItem('hh_comments', JSON.stringify(arr.slice(0, 200)));
      return commentData.id;
    },

    // ดึง comments ทั้งหมด (เรียงล่าสุดก่อน)
    async getAll() {
      if (isOnline && db) {
        try {
          const q    = firestore.query(
            firestore.collection(db, 'hh_comments'),
            firestore.orderBy('ts', 'desc')
          );
          const snap = await firestore.getDocs(q);
          return snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
        } catch (err) {
          console.warn('comments.getAll Firestore error, fallback:', err.message);
        }
      }
      // Fallback: localStorage
      try {
        return JSON.parse(localStorage.getItem('hh_comments') || '[]');
      } catch { return []; }
    },

    // ลบ comment (ใช้ firestoreId สำหรับ Firestore, id สำหรับ localStorage)
    async delete(commentItem) {
      if (isOnline && db && commentItem.firestoreId) {
        try {
          await firestore.deleteDoc(
            firestore.doc(db, 'hh_comments', commentItem.firestoreId)
          );
          return;
        } catch (err) {
          console.warn('comments.delete Firestore error, fallback:', err.message);
        }
      }
      // Fallback: localStorage
      try {
        let arr = JSON.parse(localStorage.getItem('hh_comments') || '[]');
        arr     = arr.filter(c => c.id !== commentItem.id);
        localStorage.setItem('hh_comments', JSON.stringify(arr));
      } catch { /* silent */ }
    },

    // Real-time listener — อัปเดตหน้าเว็บทันทีเมื่อมี comment ใหม่
    listenForNew(callback) {
      if (!isOnline || !db) return () => {}; // คืน unsubscribe fn ว่าง

      const q = firestore.query(
        firestore.collection(db, 'hh_comments'),
        firestore.orderBy('ts', 'desc')
      );

      // onSnapshot คืนค่า unsubscribe function
      return firestore.onSnapshot(q, (snap) => {
        const comments = snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
        callback(comments);
      }, (err) => {
        console.warn('Real-time listener error:', err.message);
      });
    },
  },
};


/* ============================================================
   C. GLOBAL STATE
   ============================================================ */
let isAdmin = false;


/* ============================================================
   D. TOAST NOTIFICATIONS
   showToast(message, type)  type: 'default' | 'success' | 'error' | 'warning'
   ============================================================ */
function showToast(message, type = 'default') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast' + (type !== 'default' ? ' toast--' + type : '');
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.parentNode && toast.parentNode.removeChild(toast), 320);
  }, 4000);
}


/* ============================================================
   E. CUSTOM CONFIRM DIALOG
   showConfirm(message, onConfirm, icon, title)
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
  newCancel.addEventListener('click', () => {
    overlay.classList.remove('open');
  });
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
   H. FIREBASE INIT ON LOAD
   รัน initFirebase() ก่อน DOMContentLoaded จะทำงาน
   ทำให้ทุก async DB call ในไฟล์อื่นใช้ Firestore ได้เลย
   ============================================================ */
(async function bootstrap() {
  // ตรวจ localStorage ก่อน
  try {
    localStorage.setItem('__hh_test__', '1');
    localStorage.removeItem('__hh_test__');
  } catch {
    document.addEventListener('DOMContentLoaded', () => {
      const banner = document.createElement('div');
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#b94040;color:#fff;text-align:center;padding:10px 16px;font-size:0.84rem;font-family:Sarabun,sans-serif';
      banner.textContent   = '⚠️ เบราว์เซอร์บล็อกการจัดเก็บข้อมูล กรุณาปิด Private Mode หรือเปิด Cookies';
      document.body.prepend(banner);
    });
  }

  // Init Firebase
  await initFirebase();

  // ถ้า Firebase ยังไม่ได้ config → แจ้งเตือนใน console เท่านั้น (ไม่ crash)
  if (!isOnline) {
    console.info('ℹ️  ทำงานในโหมด offline (localStorage) — กรอก Firebase config ใน utils.js เพื่อเปิด Real-time sync');
  }
})();
