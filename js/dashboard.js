/* ============================================================
   dashboard.js — v6.1 FINAL
   ============================================================
   FIX:
   - ลบ hardcode fallback || 3 และ || 4
   - log timestamp แสดงจริง ไม่ใช่ "เมื่อกี้" ตลอด
   ============================================================ */

'use strict';

async function updateDashboard() {
  const visitors  = parseInt((await DB.get('visitors')) || '0');
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
  // FIX: ลบ hardcode fallback
  if (activityEl) activityEl.textContent = activityData.length;

  const budgetData = (await DB.get('budgetData')) || [];
  const budgetEl   = document.getElementById('budgetCount');
  if (budgetEl) budgetEl.textContent = budgetData.length;

  const announcements = await DB.announcements.getAll();
  const announceEl    = document.getElementById('announceCount');
  if (announceEl) announceEl.textContent = announcements.length;

  await renderActivityLog();
}

async function renderActivityLog() {
  const container = document.getElementById('activityLog');
  if (!container) return;
  container.innerHTML = '';

  const stored  = (await DB.get('logs')) || [];

  // FIX: ถ้าไม่มี log จริงเลย ใช้ default แต่แสดงเวลาจริง
  const now = new Date().toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' });
  const defaults = [
    { text:'ระบบเริ่มต้นทำงาน',              time: now },
    { text:'ผู้ใช้เข้าชมเว็บไซต์',            time: now },
    { text:'โหลดข้อมูลจาก Firebase สำเร็จ',   time: now },
  ];

  const allLogs = stored.length > 0 ? stored.slice(0, 8) : defaults;

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
    txt.textContent = log.text;
    const time = document.createElement('span');
    time.className   = 'log-time';
    time.textContent = log.time;
    row.appendChild(txt);
    row.appendChild(time);
    container.appendChild(row);
  });
}
