/* ============================================================
   notify.js — v6.1 FINAL
   ============================================================
   FIX: Toast เดียวต่อ action (ไม่ซ้อน)
   ============================================================ */

'use strict';

const WORKER_URL = 'https://honest-hub-notify.peeza1482546.workers.dev';

async function sendLineNotify(payload) {
  try {
    const res = await fetch(WORKER_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Worker ${res.status}: ${errText}`);
    }
    return true;
  } catch (err) {
    console.warn('LINE notify failed:', err.message);
    return false;
  }
}

// FIX: Toast เดียว — รวม "ส่งแล้ว + แจ้งเตือนแล้ว" ในอันเดียว
async function notifyComment(commentData) {
  const ok = await sendLineNotify({
    type:     'comment',
    name:     commentData.name,
    category: commentData.cat,
    message:  commentData.text,
    date:     commentData.date,
    source:   'HONEST HUB — โรงเรียนเทศบาลจุ่งฮั่ว',
  });
  showToast(
    ok ? '📬 ส่งความคิดเห็นสำเร็จ และแจ้งเตือนไลน์ผู้ดูแลแล้ว' : '✅ ส่งความคิดเห็นสำเร็จ',
    ok ? 'success' : 'default'
  );
}

async function notifyActivity(activityData) {
  showToast('📅 เพิ่มกิจกรรมใหม่: ' + activityData.name, 'info');
  await sendLineNotify({
    type:     'activity',
    name:     'ผู้ดูแลระบบ',
    category: activityData.status || 'กิจกรรม',
    message:  activityData.name + (activityData.desc ? '\n' + activityData.desc : ''),
    date:     activityData.dateDisplay || '',
    source:   'HONEST HUB — โรงเรียนเทศบาลจุ่งฮั่ว',
  });
}

async function notifyBudget(budgetData) {
  showToast('💰 เพิ่มรายการงบประมาณใหม่: ' + budgetData.name, 'info');
  await sendLineNotify({
    type:     'budget',
    name:     'ผู้ดูแลระบบ',
    category: 'งบประมาณ',
    message:  budgetData.name + ' — ' + Number(budgetData.amount).toLocaleString('th-TH') + ' บาท',
    date:     budgetData.dateDisplay || new Date().toLocaleDateString('th-TH'),
    source:   'HONEST HUB — โรงเรียนเทศบาลจุ่งฮั่ว',
  });
}

async function notifyAnnounce(announceData) {
  showToast('📢 เผยแพร่ประกาศ: ' + announceData.title, 'info');
  await sendLineNotify({
    type:     'announcement',
    name:     'ผู้ดูแลระบบ',
    category: ANNOUNCE_TYPES?.[announceData.type]?.label || 'ประกาศ',
    message:  announceData.title + (announceData.body ? '\n' + announceData.body : ''),
    date:     announceData.dateDisplay || new Date().toLocaleDateString('th-TH'),
    source:   'HONEST HUB — โรงเรียนเทศบาลจุ่งฮั่ว',
  });
}
