/* ============================================================
   app.js — v6.1 FINAL
   ============================================================
   FIX:
   - รอ firebase:ready ก่อน render ทุกอย่าง
   - ล้าง listeners เมื่อเปลี่ยนหน้า
   ============================================================ */

'use strict';

const PAGES = ['home','budget','activity','dashboard','voice','integrity','announcement'];

function showPage(id) {
  if (!PAGES.includes(id)) return;

  // ล้าง listeners ของหน้าเก่าก่อนออก
  const activePage = document.querySelector('.page.active');
  if (activePage) {
    const oldId = activePage.id;
    if (oldId === 'voice'        && typeof cleanupVoiceListeners        === 'function') cleanupVoiceListeners();
    if (oldId === 'announcement' && typeof cleanupAnnouncementListeners === 'function') cleanupAnnouncementListeners();
  }

  PAGES.forEach(p => document.getElementById(p).classList.remove('active'));
  document.getElementById(id).classList.add('active');

  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('nav-active'));
  const navEl = document.getElementById('nav-' + id);
  if (navEl) navEl.classList.add('nav-active');

  document.querySelectorAll('.mobile-menu a').forEach(a => a.classList.remove('nav-active'));
  const mNavEl = document.getElementById('mnav-' + id);
  if (mNavEl) mNavEl.classList.add('nav-active');

  window.scrollTo({ top:0, behavior:'smooth' });

  if (id === 'dashboard')    updateDashboard();
  if (id === 'voice')        renderAllComments();
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
  document.getElementById('hamburgerBtn').setAttribute('aria-expanded','false');
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

// รอ firebase:ready ก่อน render
document.addEventListener('firebase:ready', async () => {
  console.log('🚀 App init — Firebase:', isOnline ? 'online' : 'offline (localStorage)');

  if (typeof loadAdminState === 'function') await loadAdminState();
  await trackVisitor();

  // ทำ Loading skeleton หายก่อน render
  hideLoadingSkeleton();

  await renderBudgetRows();
  await renderActivityCards();
  await renderAllComments();
  await updateCommentCount();
  await renderAnnouncements();

  await addLog('ผู้ใช้เข้าชมเว็บไซต์');
});

// set home nav active ทันทีที่ DOM พร้อม
document.addEventListener('DOMContentLoaded', () => {
  const navHome  = document.getElementById('nav-home');
  const mNavHome = document.getElementById('mnav-home');
  if (navHome)  navHome.classList.add('nav-active');
  if (mNavHome) mNavHome.classList.add('nav-active');
});

/* ── Loading Skeleton ── */
function showLoadingSkeleton() {
  const skeletons = document.querySelectorAll('.skeleton-loader');
  skeletons.forEach(el => el.style.display = 'block');
}
function hideLoadingSkeleton() {
  const skeletons = document.querySelectorAll('.skeleton-loader');
  skeletons.forEach(el => el.style.display = 'none');
}
