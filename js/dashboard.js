/* ============================================================
   dashboard.js — Dashboard v5.0
   ============================================================ */

'use strict';

async function updateDashboard() {
  const visitors = parseInt((await DB.get('visitors')) || '1');
  const visitorEl = document.getElementById('visitorCount');
  if (visitorEl) visitorEl.textContent = visitors.toLocaleString('th-TH');

  const stored    = await DB.comments.getAll();
  const seedCount = (typeof SEED_COMMENTS !== 'undefined') ? SEED_COMMENTS.length : 2;
  const suggEl    = document.getElementById('suggestionCount');
  const suggTrend = document.getElementById('suggTrend');
  if (suggEl)    suggEl.textContent    = stored.length + seedCount;
  if (suggTrend) suggTrend.textContent = stored.length > 0
    ? `ความคิดเห็นใหม่ ${stored.length} รายการ`
    : 'รอความคิดเห็นจากผู้ใช้';

  const activityData = (await DB.get('activityData')) || [];
  const activityEl   = document.getElementById('activityCount');
  if (activityEl) activityEl.textContent = activityData.length || 3;

  const budgetData = (await DB.get('budgetData')) || [];
  const budgetEl   = document.getElementById('budgetCount');
  if (budgetEl) budgetEl.textContent = budgetData.length || 4;

  const announcements  = await DB.announcements.getAll();
  const announceEl     = document.getElementById('announceCount');
  if (announceEl) announceEl.textContent = announcements.length;

  await renderActivityLog();
}

async function renderActivityLog() {
  const container = document.getElementById('activityLog');
  if (!container) return;
  container.innerHTML = '';

  const defaults = [
    { text:'ผู้ใช้ใหม่เข้าชมเว็บไซต์',   time:'เมื่อกี้' },
    { text:'มีการเพิ่มกิจกรรมใหม่',       time:'1 ชั่วโมงก่อน' },
    { text:'ผู้ปกครองแสดงความคิดเห็น',    time:'3 ชั่วโมงก่อน' },
  ];

  const stored  = (await DB.get('logs')) || [];
  const allLogs = [...stored, ...defaults].slice(0, 8);

  allLogs.forEach(log => {
    const row  = document.createElement('div');
    row.className = 'log-item';
    const txt  = document.createElement('span');
    txt.className   = 'log-text';
    txt.textContent = log.text;
    const time = document.createElement('span');
    time.className   = 'log-time';
    time.textContent = log.time;
    row.appendChild(txt);
    row.appendChild(time);
    container.appendChild(row);
  });
}
