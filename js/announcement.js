/* ============================================================
   announcement.js — Announcement Hub v5.0 (HUB 06)
   ============================================================
   A. ANNOUNCE_TYPES    — ประเภทประกาศ + badge config
   B. renderAnnouncements — โหลด + render ทั้งหมด
   C. buildAnnounceCard — สร้าง DOM card
   D. addAnnouncement   — validate + persist + notify
   E. removeAnnouncement — ลบ
   F. togglePin         — ปักหมุด/ยกเลิกปักหมุด
   G. checkExpired      — ซ่อนประกาศที่หมดอายุ
   H. renderUrgentBanner — แสดง Banner บนหน้าหลัก
   ============================================================ */

'use strict';

const ANNOUNCE_TYPES = {
  urgent:      { label:'🔴 ด่วนมาก',    color:'#b94040', bg:'#fff0f0', border:'#f5c6c6' },
  announce:    { label:'📌 ประกาศ',      color:'#1a4a8a', bg:'#eef2ff', border:'#c3cfe2' },
  activity:    { label:'📅 กิจกรรม',     color:'#2d7a4f', bg:'#f0faf4', border:'#a8d5b8' },
  mourning:    { label:'🎗️ ไว้อาลัย',   color:'#333333', bg:'#f5f5f5', border:'#cccccc' },
  general:     { label:'ℹ️ ทั่วไป',      color:'#6b7280', bg:'#f9fafb', border:'#e5e7eb' },
};

let unsubscribeAnnouncements = () => {};


/* ── A. renderAnnouncements ── */
async function renderAnnouncements() {
  const grid = document.getElementById('announcementGrid');
  if (!grid) return;
  grid.innerHTML = '';

  let data = await DB.announcements.getAll();

  // กรองที่หมดอายุแล้วออก (ถ้าไม่ปักหมุด)
  const now = new Date();
  data = data.filter(item => {
    if (item.pinned) return true; // ปักหมุดแสดงเสมอ
    if (!item.expireDate) return true; // ไม่มีวันหมดอายุแสดงเสมอ
    return new Date(item.expireDate) >= now;
  });

  // เรียงลำดับ: ปักหมุดก่อน → ด่วนก่อน → ล่าสุดก่อน
  data.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (a.type === 'urgent' && b.type !== 'urgent') return -1;
    if (a.type !== 'urgent' && b.type === 'urgent') return 1;
    return 0;
  });

  if (data.length === 0) {
    const emptyEl = document.getElementById('announceEmpty');
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }

  const emptyEl = document.getElementById('announceEmpty');
  if (emptyEl) emptyEl.style.display = 'none';

  data.forEach(item => grid.appendChild(buildAnnounceCard(item)));

  // render urgent banner บนหน้าหลัก
  renderUrgentBanner(data.filter(i => i.type === 'urgent'));

  // Real-time listener
  unsubscribeAnnouncements();
  unsubscribeAnnouncements = DB.announcements.listenForNew(fresh => {
    renderAnnouncements();
  });
}


/* ── B. buildAnnounceCard ── */
function buildAnnounceCard(item) {
  const cfg  = ANNOUNCE_TYPES[item.type] || ANNOUNCE_TYPES.general;

  const card = document.createElement('div');
  card.className        = 'announce-card' + (item.pinned ? ' announce-card--pinned' : '');
  card.dataset.id       = item.id;
  card.style.borderLeft = `4px solid ${cfg.border}`;
  card.style.background = cfg.bg;

  // Top row: badge + pin + delete
  const topRow = document.createElement('div');
  topRow.className = 'announce-top';

  const badge = document.createElement('span');
  badge.className       = 'announce-badge';
  badge.style.color     = cfg.color;
  badge.style.background = cfg.bg;
  badge.style.border    = `1px solid ${cfg.border}`;
  badge.textContent     = cfg.label;
  badge.dataset.type    = item.type;

  const rightBtns = document.createElement('div');
  rightBtns.className = 'announce-actions';

  // ปักหมุด (admin only)
  const pinBtn = document.createElement('button');
  pinBtn.className   = 'announce-pin-btn admin-only';
  pinBtn.title       = item.pinned ? 'ยกเลิกปักหมุด' : 'ปักหมุด';
  pinBtn.textContent = item.pinned ? '📌' : '📍';
  pinBtn.onclick     = async () => {
    await DB.announcements.togglePin(item);
    await renderAnnouncements();
  };

  // ลบ (admin only)
  const delBtn = document.createElement('button');
  delBtn.className   = 'announce-del-btn admin-only';
  delBtn.textContent = '🗑';
  delBtn.title       = 'ลบประกาศ';
  delBtn.onclick     = () => removeAnnouncement(item);

  rightBtns.appendChild(pinBtn);
  rightBtns.appendChild(delBtn);
  topRow.appendChild(badge);
  topRow.appendChild(rightBtns);

  // หัวข้อ
  const titleEl = document.createElement('div');
  titleEl.className   = 'announce-title';
  titleEl.style.color = cfg.color;
  titleEl.textContent = item.title;

  // วันที่ + หมดอายุ
  const metaEl = document.createElement('div');
  metaEl.className = 'announce-meta';

  const dateEl = document.createElement('span');
  dateEl.textContent = '📅 ' + (item.dateDisplay || '—');

  metaEl.appendChild(dateEl);

  if (item.expireDate) {
    const expEl = document.createElement('span');
    expEl.className   = 'announce-expire';
    expEl.textContent = '⏰ หมดอายุ: ' + formatDateDisplay(item.expireDate);
    metaEl.appendChild(expEl);
  }

  if (item.pinned) {
    const pinTag = document.createElement('span');
    pinTag.className   = 'announce-pin-tag';
    pinTag.textContent = '📌 ปักหมุด';
    metaEl.appendChild(pinTag);
  }

  // เนื้อหา
  const bodyEl = document.createElement('div');
  bodyEl.className   = 'announce-body';
  bodyEl.textContent = item.body || '';

  card.append(topRow, titleEl, metaEl, bodyEl);
  return card;
}


/* ── C. addAnnouncement ── */
async function addAnnouncement() {
  const titleInput  = document.getElementById('anTitle');
  const bodyInput   = document.getElementById('anBody');
  const typeSelect  = document.getElementById('anType');
  const dateInput   = document.getElementById('anDate');
  const expireInput = document.getElementById('anExpire');
  const titleErr    = document.getElementById('anTitleError');

  titleErr.classList.remove('show');

  const title      = titleInput.value.trim();
  const body       = bodyInput.value.trim();
  const type       = typeSelect.value;
  const dateVal    = dateInput ? dateInput.value : '';
  const expireVal  = expireInput ? expireInput.value : '';

  if (!title) {
    titleErr.textContent = 'กรุณากรอกหัวข้อประกาศ';
    titleErr.classList.add('show');
    titleInput.focus();
    return;
  }

  const dateDisplay = dateVal ? formatDateDisplay(dateVal) : formatDateDisplay(new Date().toISOString().split('T')[0]);

  const newItem = {
    id:          'an-' + Date.now(),
    title, body, type,
    dateDisplay,
    expireDate:  expireVal || null,
    pinned:      false,
  };

  await DB.announcements.add(newItem);
  await addLog('เพิ่มประกาศ: ' + title);
  await renderAnnouncements();
  closeAnnounceModal();
  await notifyAnnounce(newItem);
}


/* ── D. removeAnnouncement ── */
function removeAnnouncement(item) {
  if (!isAdmin) return;
  showConfirm('ต้องการลบประกาศนี้?', async () => {
    await DB.announcements.delete(item);
    await renderAnnouncements();
    showToast('🗑️ ลบประกาศเรียบร้อยแล้ว');
  }, '🗑️', 'ลบประกาศ');
}


/* ── E. renderUrgentBanner ── */
function renderUrgentBanner(urgentItems) {
  const banner = document.getElementById('urgentBanner');
  if (!banner) return;

  if (urgentItems.length === 0) {
    banner.style.display = 'none';
    return;
  }

  banner.style.display = 'flex';
  const text = banner.querySelector('.urgent-text');
  if (text) {
    text.textContent = urgentItems.map(i => '🔴 ' + i.title).join('  ·  ');
  }
}


/* ── F. closeAnnounceModal ── */
function closeAnnounceModal() {
  ['anTitle','anBody'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['anDate','anExpire'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const sel = document.getElementById('anType');
  if (sel) sel.selectedIndex = 0;
  document.getElementById('anTitleError').classList.remove('show');
  closeModal('addAnnouncement');
}
