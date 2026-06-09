/* ============================================================
   announcement.js — v6.1 FINAL
   ============================================================
   FIX:
   - ย้าย filterAnnounce เข้ามาใน module นี้
   - แก้ infinite loop จาก listenForNew → renderAnnouncements
   - ล้าง listener เมื่อออกจากหน้า
   - badge มี data-type สำหรับ filter
   ============================================================ */

'use strict';

const ANNOUNCE_TYPES = {
  urgent:   { label:'🔴 ด่วนมาก',   color:'#b94040', bg:'#fff0f0', border:'#f5c6c6' },
  announce: { label:'📌 ประกาศ',     color:'#1a4a8a', bg:'#eef2ff', border:'#c3cfe2' },
  activity: { label:'📅 กิจกรรม',    color:'#2d7a4f', bg:'#f0faf4', border:'#a8d5b8' },
  mourning: { label:'🎗️ ไว้อาลัย',  color:'#333333', bg:'#f5f5f5', border:'#cccccc' },
  general:  { label:'ℹ️ ทั่วไป',     color:'#6b7280', bg:'#f9fafb', border:'#e5e7eb' },
};

// FIX: แยก listener และ render — ป้องกัน infinite loop
let _unsubscribeAnnouncements = () => {};
let _currentFilter = 'all';

function cleanupAnnouncementListeners() {
  _unsubscribeAnnouncements();
  _unsubscribeAnnouncements = () => {};
}

/* ── Render ── */
async function renderAnnouncements() {
  // ล้าง listener เก่า
  cleanupAnnouncementListeners();

  const grid = document.getElementById('announcementGrid');
  if (!grid) return;

  if (isOnline && _db) {
    // Online: real-time listener
    // FIX: listener เรียก _renderAnnouncementList โดยตรง ไม่เรียก renderAnnouncements
    _unsubscribeAnnouncements = DB.announcements.listenForNew(freshData => {
      _renderAnnouncementList(freshData);
    });
    // โหลดครั้งแรก
    const initial = await DB.announcements.getAll();
    _renderAnnouncementList(initial);
  } else {
    const data = await DB.announcements.getAll();
    _renderAnnouncementList(data);
  }
}

function _renderAnnouncementList(rawData) {
  const grid    = document.getElementById('announcementGrid');
  const emptyEl = document.getElementById('announceEmpty');
  if (!grid) return;

  grid.innerHTML = '';

  const now = new Date();

  // กรองหมดอายุ (ยกเว้นปักหมุด)
  // FIX: นับถึงสิ้นวัน 23:59:59 ของวันหมดอายุ
  let data = rawData.filter(item => {
    if (item.pinned) return true;
    if (!item.expireDate) return true;
    // สร้าง Date ของวันหมดอายุ + ตั้งเวลาเป็น 23:59:59
    const expireEnd = new Date(item.expireDate);
    expireEnd.setHours(23, 59, 59, 999);
    return expireEnd >= now;
  });

  // เรียงลำดับ: ปักหมุด → ด่วน → ล่าสุด
  data.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned)  return 1;
    if (a.type === 'urgent' && b.type !== 'urgent') return -1;
    if (a.type !== 'urgent' && b.type === 'urgent')  return 1;
    return 0;
  });

  // apply filter
  const filtered = _currentFilter === 'all' ? data : data.filter(i => i.type === _currentFilter);

  if (filtered.length === 0) {
    if (emptyEl) emptyEl.style.display = 'block';
  } else {
    if (emptyEl) emptyEl.style.display = 'none';
    filtered.forEach(item => grid.appendChild(buildAnnounceCard(item)));
  }

  // urgent banner
  renderUrgentBanner(data.filter(i => i.type === 'urgent'));
}

/* ── Build card ── */
function buildAnnounceCard(item) {
  const cfg  = ANNOUNCE_TYPES[item.type] || ANNOUNCE_TYPES.general;
  const card = document.createElement('div');
  card.className        = 'announce-card' + (item.pinned ? ' announce-card--pinned' : '');
  card.dataset.id       = item.id || '';
  card.style.borderLeft = `4px solid ${cfg.border}`;
  card.style.background = cfg.bg;

  // top row
  const topRow  = document.createElement('div');
  topRow.className = 'announce-top';

  const badge = document.createElement('span');
  badge.className      = 'announce-badge';
  badge.style.color    = cfg.color;
  badge.style.background = cfg.bg;
  badge.style.border   = `1px solid ${cfg.border}`;
  badge.textContent    = cfg.label;
  badge.dataset.type   = item.type; // FIX: สำหรับ filter

  const rightBtns = document.createElement('div');
  rightBtns.className = 'announce-actions';

  const pinBtn = document.createElement('button');
  pinBtn.className   = 'announce-pin-btn admin-only';
  pinBtn.title       = item.pinned ? 'ยกเลิกปักหมุด' : 'ปักหมุด';
  pinBtn.textContent = item.pinned ? '📌' : '📍';
  pinBtn.onclick     = async () => {
    await DB.announcements.togglePin(item);
    const latest = await DB.announcements.getAll();
    _renderAnnouncementList(latest);
  };

  const delBtn = document.createElement('button');
  delBtn.className   = 'announce-del-btn admin-only';
  delBtn.textContent = '🗑';
  delBtn.title       = 'ลบประกาศ';
  delBtn.onclick     = () => removeAnnouncement(item);

  rightBtns.appendChild(pinBtn);
  rightBtns.appendChild(delBtn);
  topRow.appendChild(badge);
  topRow.appendChild(rightBtns);

  // title
  const titleEl = document.createElement('div');
  titleEl.className   = 'announce-title';
  titleEl.style.color = cfg.color;
  titleEl.textContent = item.title;

  // meta
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

  // body
  const bodyEl = document.createElement('div');
  bodyEl.className   = 'announce-body';
  bodyEl.textContent = item.body || '';

  card.append(topRow, titleEl, metaEl, bodyEl);
  return card;
}

/* ── Add ── */
async function addAnnouncement() {
  const titleInput  = document.getElementById('anTitle');
  const bodyInput   = document.getElementById('anBody');
  const typeSelect  = document.getElementById('anType');
  const dateInput   = document.getElementById('anDate');
  const expireInput = document.getElementById('anExpire');
  const titleErr    = document.getElementById('anTitleError');

  titleErr.classList.remove('show');

  const title     = titleInput.value.trim();
  const body      = bodyInput.value.trim();
  const type      = typeSelect.value;
  const dateVal   = dateInput   ? dateInput.value   : '';
  const expireVal = expireInput ? expireInput.value  : '';

  if (!title) {
    titleErr.textContent = 'กรุณากรอกหัวข้อประกาศ';
    titleErr.classList.add('show');
    titleInput.focus();
    return;
  }

  const today       = new Date().toISOString().split('T')[0];
  const dateDisplay = dateVal ? formatDateDisplay(dateVal) : formatDateDisplay(today);

  const newItem = {
    id: 'an-' + Date.now(),
    title, body, type,
    dateDisplay,
    expireDate: expireVal || null,
    pinned:     false,
  };

  await DB.announcements.add(newItem);
  await addLog('เพิ่มประกาศ: ' + title);
  // FIX: render ทุกกรณี — online ใช้ getAll ทันที, offline ใช้ localStorage
  // ไม่พึ่ง listener อย่างเดียวเพราะอาจยังไม่ได้ subscribe
  const latest = await DB.announcements.getAll();
  _renderAnnouncementList(latest);
  closeAnnounceModal();
  await notifyAnnounce(newItem);
}

/* ── Remove ── */
function removeAnnouncement(item) {
  if (!isAdmin) return;
  showConfirm(
    'ต้องการลบประกาศนี้?',
    async () => {
      await DB.announcements.delete(item);
      const latest = await DB.announcements.getAll();
      _renderAnnouncementList(latest);
      showToast('🗑️ ลบประกาศเรียบร้อยแล้ว');
    },
    '🗑️', 'ลบประกาศ'
  );
}

/* ── Urgent Banner ── */
function renderUrgentBanner(urgentItems) {
  const banner = document.getElementById('urgentBanner');
  if (!banner) return;
  if (urgentItems.length === 0) { banner.style.display = 'none'; return; }
  banner.style.display = 'flex';
  const text = banner.querySelector('.urgent-text');
  if (text) text.textContent = urgentItems.map(i => '🔴 ' + i.title).join('  ·  ');
}

/* ── Filter — FIX: ย้ายมาอยู่ใน module ── */
function filterAnnounce(btn, type) {
  document.querySelectorAll('.announce-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _currentFilter = type;

  // re-render ด้วย filter ใหม่ โดยไม่ subscribe ใหม่
  const cards = document.querySelectorAll('.announce-card');
  if (cards.length === 0) return;

  cards.forEach(card => {
    if (type === 'all') {
      card.style.display = '';
    } else {
      const badgeType = card.querySelector('.announce-badge')?.dataset.type;
      card.style.display = (badgeType === type) ? '' : 'none';
    }
  });
}

/* ── Close modal ── */
function closeAnnounceModal() {
  ['anTitle','anBody'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['anDate','anExpire'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const sel = document.getElementById('anType');
  if (sel) sel.selectedIndex = 0;
  const err = document.getElementById('anTitleError');
  if (err) err.classList.remove('show');
  closeModal('addAnnouncement');
}

/* ── initAnnounceModal — ตั้งค่า default วันที่ตอนเปิด modal ── */
function initAnnounceModal() {
  const today    = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const fmt = d => d.toISOString().split('T')[0];

  const anDate   = document.getElementById('anDate');
  const anExpire = document.getElementById('anExpire');

  if (anDate) {
    anDate.value = fmt(today);
    anDate.min   = fmt(today);
    // trigger datepicker preview
    anDate.dispatchEvent(new Event('change'));

    // เมื่อเปลี่ยนวันประกาศ → อัปเดต min ของวันหมดอายุ
    anDate.addEventListener('change', function() {
      if (anExpire) {
        anExpire.min = this.value || fmt(today);
        // ถ้าวันหมดอายุน้อยกว่าวันประกาศ → reset
        if (anExpire.value && anExpire.value < this.value) {
          anExpire.value = this.value;
          anExpire.dispatchEvent(new Event('change'));
        }
      }
    }, { once: false });
  }

  if (anExpire) {
    // default = วันนี้ (ประกาศ 1 วัน)
    anExpire.value = fmt(today);
    anExpire.min   = fmt(today);
    anExpire.dispatchEvent(new Event('change'));
  }

  openModal('addAnnouncement');
}
