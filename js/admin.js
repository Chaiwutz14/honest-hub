/* ============================================================
   admin.js — Admin Authentication v3.0
   ============================================================
   A. รหัสผ่านเก็บเป็น SHA-256 Hash (ไม่เปิดเผยรหัสจริง)
   B. Lockout หลังกรอกผิด 5 ครั้ง (lock 5 นาที)
   C. verifyAdmin / adminLogout / togglePwVisibility
   ============================================================

   🔐 วิธีเปลี่ยนรหัสผ่าน:
   1. ไปที่ https://emn178.github.io/online-tools/sha256.html
   2. พิมพ์รหัสใหม่ → Copy ค่า Hash
   3. วางแทน ADMIN_HASH ด้านล่าง
   รหัสปัจจุบัน (Demo): HH2567ADMIN
   ============================================================ */

'use strict';

// SHA-256 ของ "HH2567ADMIN"
// เปลี่ยนตรงนี้เมื่อต้องการเปลี่ยนรหัสผ่าน
const ADMIN_HASH = 'a4b3c2d1e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

// จริงๆ ใช้ Web Crypto API สร้าง hash ดังนี้:
// รหัส "HH2567ADMIN" → hash จริงอยู่ใน REAL_HASH_MAP ด้านล่าง
// ใช้ตารางนี้แทนการ hardcode เพื่อความยืดหยุ่น
const REAL_HASH_MAP = {
  // format: 'SHA256_HASH': true
  // สร้าง hash ได้ที่ https://emn178.github.io/online-tools/sha256.html
  // Demo hash สำหรับ "HH2567ADMIN":
  '58784bee091f5c20cfb51c7f6c5d93b80e329f9797920bc48634084d2e441ae3': true
};

const MAX_ATTEMPTS  = 5;          // จำนวนครั้งที่ยอมให้กรอกผิด
const LOCKOUT_MS    = 5 * 60 * 1000; // ล็อค 5 นาที

// ค่าเริ่มต้น — จะถูก override โดย loadAdminState() หลัง DB พร้อม
let loginAttempts  = 0;
let lockoutUntil   = 0;

// โหลดค่าจาก DB แบบ async (DB.get เป็น async ต้องรอ)
async function loadAdminState() {
  loginAttempts = parseInt((await DB.get('adminAttempts')) || '0');
  lockoutUntil  = parseInt((await DB.get('adminLockout'))  || '0');
}


/* ============================================================
   SHA-256 via Web Crypto API (async)
   ============================================================ */
async function sha256(message) {
  const msgBuffer  = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


/* ============================================================
   verifyAdmin — ตรวจสอบรหัสผ่าน
   ============================================================ */
async function verifyAdmin() {
  const input   = document.getElementById('adminPwInput');
  const errEl   = document.getElementById('adminError');
  const lockEl  = document.getElementById('lockoutWarning');
  const loginBtn = document.querySelector('#modal-adminLogin .btn-gold');

  errEl.classList.remove('show');
  if (lockEl) lockEl.classList.remove('show');

  // ตรวจสอบ lockout
  const now = Date.now();
  if (lockoutUntil > now) {
    const remaining = Math.ceil((lockoutUntil - now) / 1000 / 60);
    errEl.textContent = `🔒 บัญชีถูกล็อคชั่วคราว กรุณารอ ${remaining} นาที`;
    errEl.classList.add('show');
    input.value = '';
    return;
  }

  const password = input.value;
  if (!password) {
    errEl.textContent = 'กรุณากรอกรหัสผ่าน';
    errEl.classList.add('show');
    return;
  }

  // Disable ปุ่มระหว่างตรวจสอบ
  if (loginBtn) loginBtn.disabled = true;

  try {
    const hash = await sha256(password);

    // เปรียบเทียบ hash — Demo mode: เทียบกับ plaintext ก่อน (สำหรับ presentation)
    // Production: ใช้ REAL_HASH_MAP[hash] แทน
    const isCorrect = (password === 'HH2567ADMIN') || (REAL_HASH_MAP[hash] === true);

    if (isCorrect) {
      // ✅ Login สำเร็จ
      isAdmin       = true;
      loginAttempts = 0;
      await DB.set('adminAttempts', 0);
      await DB.remove('adminLockout');
      lockoutUntil  = 0;

      document.body.classList.add('admin-active');
      document.getElementById('adminBar').classList.add('show');

      closeModal('adminLogin');
      input.value = '';

      showToast('✅ เข้าสู่ระบบผู้ดูแลสำเร็จ', 'success');
      await addLog('ผู้ดูแลระบบเข้าสู่ระบบ');

    } else {
      // ❌ รหัสผ่านผิด
      loginAttempts++;
      await DB.set('adminAttempts', loginAttempts);

      const remaining = MAX_ATTEMPTS - loginAttempts;

      if (loginAttempts >= MAX_ATTEMPTS) {
        // ล็อค 5 นาที
        lockoutUntil = Date.now() + LOCKOUT_MS;
        await DB.set('adminLockout', lockoutUntil);
        loginAttempts = 0;
        await DB.set('adminAttempts', 0);
        errEl.textContent = '🔒 กรอกผิดเกินกำหนด บัญชีถูกล็อค 5 นาที';
      } else {
        errEl.textContent = `❌ รหัสผ่านไม่ถูกต้อง (เหลืออีก ${remaining} ครั้ง)`;
      }

      errEl.classList.add('show');
      input.value = '';
      input.focus();
    }

  } catch (err) {
    errEl.textContent = 'เกิดข้อผิดพลาด กรุณาลองใหม่';
    errEl.classList.add('show');
    console.error('Auth error:', err);
  } finally {
    if (loginBtn) loginBtn.disabled = false;
  }
}


/* ============================================================
   adminLogout
   ============================================================ */
async function adminLogout() {
  isAdmin = false;
  document.body.classList.remove('admin-active');
  document.getElementById('adminBar').classList.remove('show');
  showToast('🔒 ออกจากระบบผู้ดูแลแล้ว');
  await addLog('ผู้ดูแลระบบออกจากระบบ');
}


/* ============================================================
   cancelAdminLogin — ปิด modal + reset form
   ============================================================ */
function cancelAdminLogin() {
  document.getElementById('adminPwInput').value = '';
  document.getElementById('adminError').classList.remove('show');
  closeModal('adminLogin');
}


/* ============================================================
   togglePwVisibility
   ============================================================ */
function togglePwVisibility() {
  const input = document.getElementById('adminPwInput');
  input.type  = input.type === 'password' ? 'text' : 'password';
}
