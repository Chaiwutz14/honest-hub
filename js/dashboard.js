/* ============================================================
   dashboard.js — Dashboard v3.0
   ============================================================
   A. updateDashboard    — อัปเดต stat cards ทั้งหมดจาก DB จริง
   B. renderActivityLog  — แสดง log ล่าสุด (XSS safe)
   ============================================================ */

'use strict';


/* ============================================================
   A. updateDashboard
   ============================================================ */
async function updateDashboard() {
  // Visitor count
  const visitors = parseInt((await DB.get('visitors')) || '1');
  const visitorEl = document.getElementById('visitorCount');
  if (visitorEl) visitorEl.textContent = visitors.toLocaleString('th-TH');

  // Comment count — นับจาก DB จริง + seed
  const stored        = (await DB.comments.getAll()) || [];
  const seedCount     = (typeof SEED_COMMENTS !== 'undefined') ? SEED_COMMENTS.length : 2;
  const totalComments = stored.length + seedCount;
  const suggEl        = document.getElementById('suggestionCount');
  const suggTrend     = document.getElementById('suggTrend');
  if (suggEl)    suggEl.textContent    = totalComments;
  if (suggTrend) suggTrend.textContent = stored.length > 0
    ? `ความคิดเห็นใหม่ ${stored.length} รายการ`
    : 'รอความคิดเห็นจากผู้ใช้';

  // Activity count — จาก DB จริง
  const activityData = (await DB.get('activityData')) || [];
  const activityEl   = document.getElementById('activityCount');
  if (activityEl) activityEl.textContent = activityData.length || 3;

  // Budget count — จาก DB จริง
  const budgetData = (await DB.get('budgetData')) || [];
  const budgetEl   = document.getElementById('budgetCount');
  if (budgetEl) budgetEl.textContent = budgetData.length || 4;

  // Activity log
  await renderActivityLog();
}


/* ============================================================
   B. renderActivityLog — XSS safe (textContent ทั้งหมด)
   ============================================================ */
async function renderActivityLog() {
  const container = document.getElementById('activityLog');
  if (!container) return;
  container.innerHTML = ''; // ล้าง container ของเราเอง

  const defaultLogs = [
    { text: 'ผู้ใช้ใหม่เข้าชมเว็บไซต์',    time: 'เมื่อกี้' },
    { text: 'มีการเพิ่มกิจกรรมใหม่',        time: '1 ชั่วโมงก่อน' },
    { text: 'ผู้ปกครองแสดงความคิดเห็น',     time: '3 ชั่วโมงก่อน' },
  ];

  const stored = (await DB.get('logs')) || [];
  const allLogs = [...stored, ...defaultLogs].slice(0, 8);

  if (allLogs.length === 0) {
    const empty = document.createElement('p');
    empty.style.cssText = 'color:#6b7280;font-size:0.85rem;padding:12px 0;';
    empty.textContent   = 'ยังไม่มีกิจกรรม';
    container.appendChild(empty);
    return;
  }

  allLogs.forEach(log => {
    const row  = document.createElement('div');
    row.className = 'log-item';

    const txt  = document.createElement('span');
    txt.className   = 'log-text';
    txt.textContent = log.text; // textContent — XSS safe

    const time = document.createElement('span');
    time.className   = 'log-time';
    time.textContent = log.time;

    row.appendChild(txt);
    row.appendChild(time);
    container.appendChild(row);
  });
}
