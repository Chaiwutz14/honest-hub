/* ============================================================
   activity.js — Activity Hub v3.1
   ============================================================
   A. SEED_ACTIVITY_DATA  — ข้อมูลตั้งต้น (โหลดครั้งแรกเท่านั้น)
   B. renderActivityCards — โหลดจาก DB + render
   C. buildActivityCard   — สร้าง DOM card (XSS safe)
   D. addActivityCard     — validate + บันทึก + render
   E. removeActivityCard  — confirm + ลบจาก DB + render
   F. toggleActivityEmpty — empty state
   G. closeActivityModal  — ปิด + reset

   🐛 BUG FIX v3.1:
   - แยก "ยังไม่เคย init" กับ "ลบจนหมด" ออกจากกันด้วย flag 'activitySeeded'
   - ถ้า DB ว่างเพราะ admin ลบหมด → แสดง empty state ไม่ reset seed
   - ถ้าเป็นการเปิดครั้งแรก (ไม่มีข้อมูลใน DB เลย) → โหลด seed ให้
   ============================================================ */

'use strict';

const SEED_ACTIVITY_DATA = [
  {
    id:     'seed-1',
    name:   'โครงการอบรมคุณธรรมจริยธรรม',
    desc:   'อบรมนักเรียนระดับมัธยมศึกษาเกี่ยวกับคุณธรรม จริยธรรม และการเป็นพลเมืองดี โดยวิทยากรจากภายนอก',
    date:   'มิถุนายน 2567',
    status: 'ongoing',
  },
  {
    id:     'seed-2',
    name:   'กีฬาสีประจำปี 2567',
    desc:   'การแข่งขันกีฬาประจำปีของโรงเรียน แบ่งเป็น 4 สี พร้อมกิจกรรมเชียร์ลีดเดอร์และพิธีเปิดอย่างยิ่งใหญ่',
    date:   'กรกฎาคม 2567',
    status: 'upcoming',
  },
  {
    id:     'seed-3',
    name:   'วันไหว้ครูประจำปี 2567',
    desc:   'พิธีไหว้ครูและมอบทุนการศึกษาให้กับนักเรียนที่มีผลการเรียนดีเด่น',
    date:   'พฤษภาคม 2567',
    status: 'done',
  },
];

const ACTIVITY_STATUS = {
  ongoing:  { label: 'กำลังดำเนินการ', tagClass: 'activity-tag',                          imgClass: 'activity-img' },
  upcoming: { label: 'กำลังจะมาถึง',   tagClass: 'activity-tag activity-tag--green',      imgClass: 'activity-img activity-img--green' },
  done:     { label: 'เสร็จสิ้นแล้ว',  tagClass: 'activity-tag activity-tag--done',       imgClass: 'activity-img activity-img--warm' },
};


/* ============================================================
   B. renderActivityCards
   ============================================================
   Logic การโหลดข้อมูล:
   ┌─────────────────────────────────────────────────────┐
   │ 'activitySeeded' ใน DB = flag ว่าเคย init แล้วหรือยัง │
   │                                                     │
   │  ยังไม่มี flag  →  โหลด seed data + set flag       │
   │  มี flag แล้ว   →  ใช้ข้อมูลจาก DB ตามที่เป็น     │
   │                    (ว่างก็ว่าง = admin ลบเอง)       │
   └─────────────────────────────────────────────────────┘
   ============================================================ */
async function renderActivityCards() {
  const grid = document.getElementById('activityGrid');
  grid.innerHTML = '';

  const hasSeeded = await DB.get('activitySeeded');

  if (!hasSeeded) {
    // ✅ เปิดครั้งแรก — โหลด seed data และ set flag
    await DB.set('activityData',   SEED_ACTIVITY_DATA);
    await DB.set('activitySeeded', true);
  }

  // ดึงข้อมูลจาก DB (อาจเป็น array ว่างถ้า admin ลบหมด — นั่นคือพฤติกรรมที่ถูกต้อง)
  const data = (await DB.get('activityData')) || [];
  data.forEach(item => grid.appendChild(buildActivityCard(item)));

  toggleActivityEmpty();
}


/* ============================================================
   C. buildActivityCard — XSS safe ทั้งหมด
   ============================================================ */
function buildActivityCard(item) {
  const statusInfo = ACTIVITY_STATUS[item.status] || ACTIVITY_STATUS.ongoing;

  const card = document.createElement('div');
  card.className  = 'activity-card';
  card.dataset.id = item.id;
  card.setAttribute('role', 'listitem');

  const bar = document.createElement('div');
  bar.className = statusInfo.imgClass;

  const body = document.createElement('div');
  body.className = 'activity-body';

  const tag = document.createElement('div');
  tag.className   = statusInfo.tagClass;
  tag.textContent = statusInfo.label;

  const title = document.createElement('div');
  title.className   = 'activity-title';
  title.textContent = item.name;        // textContent — XSS safe

  const desc = document.createElement('div');
  desc.className   = 'activity-desc';
  desc.textContent = item.desc || '—';  // textContent

  const footer = document.createElement('div');
  footer.className = 'activity-footer';

  const dateEl = document.createElement('span');
  dateEl.className   = 'activity-date';
  dateEl.textContent = '📅 ' + (item.date || '—');

  const delBtn = document.createElement('button');
  delBtn.className   = 'btn btn-red admin-only';
  delBtn.textContent = 'ลบ';
  delBtn.setAttribute('aria-label', 'ลบกิจกรรม ' + item.name);
  delBtn.onclick = () => removeActivityCard(item.id);

  footer.appendChild(dateEl);
  footer.appendChild(delBtn);
  body.append(tag, title, desc, footer);
  card.append(bar, body);

  return card;
}


/* ============================================================
   D. addActivityCard — validate + persist + render
   ============================================================ */
async function addActivityCard() {
  const nameInput = document.getElementById('aName');
  const descInput = document.getElementById('aDesc');
  const dateInput = document.getElementById('aDate');
  const statusSel = document.getElementById('aStatus');
  const nameErr   = document.getElementById('aNameError');

  nameErr.classList.remove('show');

  const name   = nameInput.value.trim();
  const desc   = descInput.value.trim();
  const date   = dateInput.value.trim();
  const status = statusSel.value;

  if (!name) {
    nameErr.textContent = 'กรุณากรอกชื่อกิจกรรม';
    nameErr.classList.add('show');
    nameInput.focus();
    return;
  }

  const newItem = {
    id: 'act-' + Date.now(),
    name, desc, date, status,
  };

  const data = (await DB.get('activityData')) || [];
  data.unshift(newItem);
  await DB.set('activityData', data);

  // ต้องแน่ใจว่า flag ถูก set ด้วย (กรณีที่ admin เพิ่มหลังจากลบหมดแล้ว)
  await DB.set('activitySeeded', true);

  renderActivityCards();
  await addLog('เพิ่มกิจกรรม: ' + name);
  closeActivityModal();
  showToast('✅ เพิ่มกิจกรรมสำเร็จ', 'success');
}


/* ============================================================
   E. removeActivityCard — confirm + ลบจาก DB + render
   ============================================================ */
function removeActivityCard(id) {
  if (!isAdmin) return;

  showConfirm(
    'ต้องการลบกิจกรรมนี้?',
    async () => {
      let data = (await DB.get('activityData')) || [];
      data     = data.filter(item => item.id !== id);
      await DB.set('activityData', data);
      // ไม่ reset flag — ถ้าลบหมดจะแสดง empty state ไม่ใช่ seed
      await renderActivityCards();
      showToast('🗑️ ลบกิจกรรมเรียบร้อยแล้ว');
    },
    '🗑️',
    'ลบกิจกรรม'
  );
}


/* ============================================================
   F. toggleActivityEmpty — แสดง/ซ่อน empty state
   ============================================================ */
function toggleActivityEmpty() {
  const grid    = document.getElementById('activityGrid');
  const emptyEl = document.getElementById('activityEmpty');
  if (!emptyEl) return;

  const isEmpty = grid.children.length === 0;
  emptyEl.style.display = isEmpty ? 'block' : 'none';
}


/* ============================================================
   G. closeActivityModal — ปิด + reset form
   ============================================================ */
function closeActivityModal() {
  ['aName', 'aDesc', 'aDate'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('aStatus').selectedIndex = 0;
  document.getElementById('aNameError').classList.remove('show');
  closeModal('addActivity');
}
