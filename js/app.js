/* ============================================================
   app.js — Navigation & Initialisation v3.0
   ============================================================
   A. showPage         — สลับหน้า + อัปเดต active nav
   B. toggleMobileMenu / closeMobileMenu
   C. trackVisitor     — นับผู้เข้าชม
   D. DOMContentLoaded — init ทั้งระบบ
   ============================================================ */

'use strict';

const PAGES = ['home', 'budget', 'activity', 'dashboard', 'voice', 'integrity'];


/* ============================================================
   A. PAGE NAVIGATION
   ============================================================ */
function showPage(id) {
  if (!PAGES.includes(id)) return;

  PAGES.forEach(p => document.getElementById(p).classList.remove('active'));
  document.getElementById(id).classList.add('active');

  // Desktop nav active state
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('nav-active'));
  const navEl = document.getElementById('nav-' + id);
  if (navEl) navEl.classList.add('nav-active');

  // Mobile nav active state
  document.querySelectorAll('.mobile-menu a').forEach(a => a.classList.remove('nav-active'));
  const mNavEl = document.getElementById('mnav-' + id);
  if (mNavEl) mNavEl.classList.add('nav-active');

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Page-specific init
  if (id === 'dashboard') updateDashboard();
  if (id === 'voice')     updateCommentCount();
}


/* ============================================================
   B. MOBILE HAMBURGER
   ============================================================ */
function toggleMobileMenu() {
  const btn  = document.getElementById('hamburgerBtn');
  const menu = document.getElementById('mobileMenu');
  const isOpen = menu.classList.toggle('open');
  btn.classList.toggle('open', isOpen);
  btn.setAttribute('aria-expanded', isOpen);
}

function closeMobileMenu() {
  const btn  = document.getElementById('hamburgerBtn');
  const menu = document.getElementById('mobileMenu');
  menu.classList.remove('open');
  btn.classList.remove('open');
  btn.setAttribute('aria-expanded', 'false');
}

// ปิด mobile menu เมื่อคลิกนอก nav
document.addEventListener('click', function (e) {
  const nav  = document.querySelector('nav');
  const menu = document.getElementById('mobileMenu');
  if (menu && menu.classList.contains('open') && !nav.contains(e.target)) {
    closeMobileMenu();
  }
});

// Keyboard navigation support
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeMobileMenu();
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      // ไม่ปิด confirm dialog ด้วย Escape
      if (m.id !== 'modal-confirm') m.classList.remove('open');
    });
  }
});


/* ============================================================
   C. VISITOR TRACKING
   ============================================================ */
async function trackVisitor() {
  let count = parseInt((await DB.get('visitors')) || '0');
  await DB.set('visitors', count + 1);
}


/* ============================================================
   D. INITIALISATION
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  // Set home as active nav
  const navHome  = document.getElementById('nav-home');
  const mNavHome = document.getElementById('mnav-home');
  if (navHome)  navHome.classList.add('nav-active');
  if (mNavHome) mNavHome.classList.add('nav-active');

  // โหลด admin state (loginAttempts, lockoutUntil) จาก DB
  if (typeof loadAdminState === 'function') await loadAdminState();

  // Track visitor
  await trackVisitor();

  // Render all persisted data (async — Firestore)
  await renderBudgetRows();
  await renderActivityCards();
  await renderAllComments();
  await updateCommentCount();

  // Log visit
  addLog('ผู้ใช้เข้าชมเว็บไซต์');
});
