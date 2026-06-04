/* ============================================================
   app.js — Navigation & Init v5.0
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

  window.scrollTo({ top:0, behavior:'smooth' });

  if (id === 'dashboard')    updateDashboard();
  if (id === 'voice')        updateCommentCount();
  if (id === 'announcement') renderAnnouncements();
}

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

document.addEventListener('DOMContentLoaded', async () => {
  // nav active
  const navHome  = document.getElementById('nav-home');
  const mNavHome = document.getElementById('mnav-home');
  if (navHome)  navHome.classList.add('nav-active');
  if (mNavHome) mNavHome.classList.add('nav-active');

  // load admin state
  if (typeof loadAdminState === 'function') await loadAdminState();

  // track visitor
  await trackVisitor();

  // render all data
  await renderBudgetRows();
  await renderActivityCards();
  await renderAllComments();
  await updateCommentCount();
  await renderAnnouncements();

  await addLog('ผู้ใช้เข้าชมเว็บไซต์');
});
