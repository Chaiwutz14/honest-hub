/* ============================================================
   activity.js — Activity Hub v5.1
   🔧 FIX: รอ DB.ready() ก่อนทุก operation
           แยก seed init ออกจาก render loop
   ============================================================ */

'use strict';

const SEED_ACTIVITY_DATA = [
  { id:'seed-1', name:'โครงการอบรมคุณธรรมจริยธรรม',
    desc:'อบรมนักเรียนระดับมัธยมศึกษาเกี่ยวกับคุณธรรม จริยธรรม และการเป็นพลเมืองดี',
    dateDisplay:'มิถุนายน 2567', status:'ongoing' },
  { id:'seed-2', name:'กีฬาสีประจำปี 2567',
    desc:'การแข่งขันกีฬาประจำปีของโรงเรียน แบ่งเป็น 4 สี พร้อมกิจกรรมเชียร์ลีดเดอร์',
    dateDisplay:'กรกฎาคม 2567', status:'upcoming' },
  { id:'seed-3', name:'วันไหว้ครูประจำปี 2567',
    desc:'พิธีไหว้ครูและมอบทุนการศึกษาให้กับนักเรียนที่มีผลการเรียนดีเด่น',
    dateDisplay:'พฤษภาคม 2567', status:'done' },
];

const ACTIVITY_STATUS = {
  ongoing:  { label:'กำลังดำเนินการ', tagClass:'activity-tag',                    imgClass:'activity-img' },
  upcoming: { label:'กำลังจะมาถึง',   tagClass:'activity-tag activity-tag--green', imgClass:'activity-img activity-img--green' },
  done:     { label:'เสร็จสิ้นแล้ว',  tagClass:'activity-tag activity-tag--done',  imgClass:'activity-img activity-img--warm' },
};

// flag ว่า seed init ทำแล้วหรือยัง (ในหน่วยความจำ ไม่ต้องถามDB ซ้ำ)
let _activityInitDone = false;

async function renderActivityCards() {
  const grid = document.getElementById('activityGrid');
  grid.innerHTML = '';

  // ทำ seed init ครั้งเดียว
  if (!_activityInitDone) {
    const hasSeeded = await DB.get('activitySeeded');
    if (!hasSeeded) {
      // เปิดครั้งแรกจริงๆ — ใส่ seed data
      await DB.set('activityData',   SEED_ACTIVITY_DATA);
      await DB.set('activitySeeded', true);
      console.log('✅ Activity seed data initialized');
    }
    _activityInitDone = true;
  }

  const data = (await DB.get('activityData')) || [];
  data.forEach(item => grid.appendChild(buildActivityCard(item)));
  toggleActivityEmpty();
}

function buildActivityCard(item) {
  const st   = ACTIVITY_STATUS[item.status] || ACTIVITY_STATUS.ongoing;
  const card = document.createElement('div');
  card.className  = 'activity-card';
  card.dataset.id = item.id;
  card.setAttribute('role', 'listitem');

  const bar  = document.createElement('div');
  bar.className  = st.imgClass;

  const body = document.createElement('div');
  body.className = 'activity-body';

  const tag  = document.createElement('div');
  tag.className   = st.tagClass;
  tag.textContent = st.label;

  const title = document.createElement('div');
  title.className   = 'activity-title';
  title.textContent = item.name;

  const desc  = document.createElement('div');
  desc.className   = 'activity-desc';
  desc.textContent = item.desc || '—';

  const footer = document.createElement('div');
  footer.className = 'activity-footer';

  const dateEl = document.createElement('span');
  dateEl.className   = 'activity-date';
  dateEl.textContent = '📅 ' + (item.dateDisplay || '—');

  const delBtn = document.createElement('button');
  delBtn.className   = 'btn btn-red admin-only';
  delBtn.textContent = 'ลบ';
  delBtn.onclick     = () => removeActivityCard(item.id);

  footer.appendChild(dateEl);
  footer.appendChild(delBtn);
  body.append(tag, title, desc, footer);
  card.append(bar, body);
  return card;
}

async function addActivityCard() {
  const nameInput = document.getElementById('aName');
  const descInput = document.getElementById('aDesc');
  const dateInput = document.getElementById('aDate');
  const statusSel = document.getElementById('aStatus');
  const nameErr   = document.getElementById('aNameError');

  nameErr.classList.remove('show');

  const name    = nameInput.value.trim();
  const desc    = descInput.value.trim();
  const status  = statusSel.value;
  const dateVal = dateInput ? dateInput.value : '';

  if (!name) {
    nameErr.textContent = 'กรุณากรอกชื่อกิจกรรม';
    nameErr.classList.add('show');
    nameInput.focus();
    return;
  }

  const dateDisplay = dateVal ? formatDateDisplay(dateVal) : '—';
  const newItem     = { id: 'act-' + Date.now(), name, desc, dateDisplay, status };

  // อ่านข้อมูลปัจจุบัน → เพิ่ม → บันทึก
  const current = (await DB.get('activityData')) || [];
  current.unshift(newItem);
  await DB.set('activityData',   current);
  await DB.set('activitySeeded', true);

  await renderActivityCards();
  await addLog('เพิ่มกิจกรรม: ' + name);
  closeActivityModal();
  await notifyActivity(newItem);
}

function removeActivityCard(id) {
  if (!isAdmin) return;
  showConfirm(
    'ต้องการลบกิจกรรมนี้?',
    async () => {
      const current = (await DB.get('activityData')) || [];
      const updated = current.filter(item => item.id !== id);
      await DB.set('activityData', updated);
      await renderActivityCards();
      showToast('🗑️ ลบกิจกรรมเรียบร้อยแล้ว');
    },
    '🗑️', 'ลบกิจกรรม'
  );
}

function toggleActivityEmpty() {
  const grid    = document.getElementById('activityGrid');
  const emptyEl = document.getElementById('activityEmpty');
  if (!emptyEl) return;
  emptyEl.style.display = grid.children.length === 0 ? 'block' : 'none';
}

function closeActivityModal() {
  ['aName','aDesc'].forEach(id => { document.getElementById(id).value = ''; });
  const aDate = document.getElementById('aDate');
  if (aDate) aDate.value = '';
  document.getElementById('aStatus').selectedIndex = 0;
  document.getElementById('aNameError').classList.remove('show');
  closeModal('addActivity');
}
