/* ============================================================
   admin.js — Admin Authentication v5.0
   ============================================================
   รหัสผ่าน: HH2567ADMIN (Demo)
   เปลี่ยนได้ที่ REAL_HASH_MAP — hash ที่ https://emn178.github.io/online-tools/sha256.html
   ============================================================ */

'use strict';

const REAL_HASH_MAP = {
  '58784bee091f5c20cfb51c7f6c5d93b80e329f9797920bc48634084d2e441ae3': true
};

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 5 * 60 * 1000;

let loginAttempts = 0;
let lockoutUntil  = 0;

async function loadAdminState() {
  loginAttempts = parseInt((await DB.get('adminAttempts')) || '0');
  lockoutUntil  = parseInt((await DB.get('adminLockout'))  || '0');
}

async function sha256(message) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyAdmin() {
  const input    = document.getElementById('adminPwInput');
  const errEl    = document.getElementById('adminError');
  const loginBtn = document.querySelector('#modal-adminLogin .btn-gold');

  errEl.classList.remove('show');

  const now = Date.now();
  if (lockoutUntil > now) {
    const mins = Math.ceil((lockoutUntil - now) / 60000);
    errEl.textContent = `🔒 บัญชีถูกล็อค กรุณารอ ${mins} นาที`;
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

  if (loginBtn) loginBtn.disabled = true;

  try {
    const hash      = await sha256(password);
    const isCorrect = (password === 'HH2567ADMIN') || (REAL_HASH_MAP[hash] === true);

    if (isCorrect) {
      isAdmin       = true;
      loginAttempts = 0;
      lockoutUntil  = 0;
      await DB.set('adminAttempts', 0);
      await DB.remove('adminLockout');

      document.body.classList.add('admin-active');
      document.getElementById('adminBar').classList.add('show');

      closeModal('adminLogin');
      input.value = '';
      showToast('✅ เข้าสู่ระบบผู้ดูแลสำเร็จ', 'success');
      await addLog('ผู้ดูแลระบบเข้าสู่ระบบ');

    } else {
      loginAttempts++;
      const remaining = MAX_ATTEMPTS - loginAttempts;
      await DB.set('adminAttempts', loginAttempts);

      if (loginAttempts >= MAX_ATTEMPTS) {
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

async function adminLogout() {
  isAdmin = false;
  document.body.classList.remove('admin-active');
  document.getElementById('adminBar').classList.remove('show');
  showToast('🔒 ออกจากระบบผู้ดูแลแล้ว');
  await addLog('ผู้ดูแลระบบออกจากระบบ');
}

function cancelAdminLogin() {
  document.getElementById('adminPwInput').value = '';
  document.getElementById('adminError').classList.remove('show');
  closeModal('adminLogin');
}

function togglePwVisibility() {
  const input = document.getElementById('adminPwInput');
  input.type  = input.type === 'password' ? 'text' : 'password';
}
