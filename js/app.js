/* ============================================================
   app.js — Navigation & Init v5.1
   ============================================================
   🔧 FIX: รอ firebase:ready event ก่อน render ทุกอย่าง
   ============================================================ */

'use strict';

const PAGES = ['home','budget','activity','dashboard','voice','integrity','announcement'];

function showPage(id) {
  if (!PAGES.includes(id)) return;
  PAGES.forEach(p => document.getElementById(p).classList.remove('active'));
  document.getElementById(id).classList.add('active');

  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('nav-active'));
  const navEl = document.getElementById('nav-' + id);
  if (navEl) navEl.classList.add('nav-active');

  document.querySelectorAll('.mobile-menu a').forEach(a => a.classList.remove('nav-active'));
  const mNavEl = document.getElementById('mnav-' + id);
  if (mNavEl) mNavEl.classList.add('nav-active');

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (id === 'dashboard')    updateDashboard();
  if (id === 'voice')        updateCommentCount();
  if (id === 'announcement') renderAnnouncements();
}

function toggleMobileMenu() {
  const btn    = document.getElementById('hamburgerBtn');
  const menu   = document.getElementById('mobileMenu');
  const isOpen = menu.classList.toggle('open');
  btn.classList.toggle('open', isOpen);
  btn.setAttribute('aria-expanded', isOpen);
}
function closeMobileMenu() {
  document.getElementById('hamburgerBtn').classList.remove('open');
  document.getElementById('mobileMenu').classList.remove('open');
  document.getElementById('hamburgerBtn').setAttribute('aria-expanded', 'false');
}

document.addEventListener('click', e => {
  const nav  = document.querySelector('nav');
  const menu = document.getElementById('mobileMenu');
  if (menu && menu.classList.contains('open') && !nav.contains(e.target)) closeMobileMenu();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeMobileMenu();
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      if (m.id !== 'modal-confirm') m.classList.remove('open');
    });
  }
});

async function trackVisitor() {
  let count = parseInt((await DB.get('visitors')) || '0');
  await DB.set('visitors', count + 1);
}


/* ============================================================
   INIT — รอ firebase:ready ก่อน render ทุกอย่าง
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // set home nav active ก่อนเลย (ไม่ต้องรอ Firebase)
  const navHome  = document.getElementById('nav-home');
  const mNavHome = document.getElementById('mnav-home');
  if (navHome)  navHome.classList.add('nav-active');
  if (mNavHome) mNavHome.classList.add('nav-active');
});

// รอ Firebase init เสร็จก่อน render
// firebase:ready ถูก dispatch จาก utils.js หลัง initFirebase() เสร็จ
document.addEventListener('firebase:ready', async () => {
  console.log('🚀 App init — Firebase ready:', isOnline);

  // load admin state
  if (typeof loadAdminState === 'function') await loadAdminState();

  // track visitor
  await trackVisitor();

  // render ทุกส่วน — ตอนนี้ Firebase พร้อมแล้วแน่นอน
  await renderBudgetRows();
  await renderActivityCards();
  await renderAllComments();
  await updateCommentCount();
  await renderAnnouncements();

  await addLog('ผู้ใช้เข้าชมเว็บไซต์');
});
