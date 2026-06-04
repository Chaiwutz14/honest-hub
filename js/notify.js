/* ============================================================
   notify.js — Notification System v5.0
   ============================================================
   ส่งแจ้งเตือนทั้งในเว็บ (Toast) และ LINE ทุก action
   A. sendLineNotify  — ส่งไป Cloudflare Worker → LINE
   B. notifyComment   — แจ้งเตือน comment ใหม่
   C. notifyActivity  — แจ้งเตือนกิจกรรมใหม่
   D. notifyBudget    — แจ้งเตือนงบประมาณใหม่
   E. notifyAnnounce  — แจ้งเตือนประกาศใหม่
   ============================================================ */

'use strict';

/* ============================================================
   Worker URL — ✅ ไม่มี trailing slash
   ============================================================ */
const WORKER_URL = 'https://honest-hub-notify.peeza1482546.workers.dev';


/* ============================================================
   A. sendLineNotify — core function ส่งไป Worker
   ============================================================ */
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

    const data = await res.json();
    console.log('✅ LINE notification sent:', data);
    return true;

  } catch (err) {
    // ไม่ให้ crash ระบบหลัก — notification เป็น non-critical
    console.warn('LINE notify failed (non-critical):', err.message);
    return false;
  }
}


/* ============================================================
   B. notifyComment — ความคิดเห็นใหม่
   ============================================================ */
async function notifyComment(commentData) {
  // Toast ในเว็บ
  showToast('💬 มีความคิดเห็นใหม่จาก ' + commentData.name, 'info');

  // LINE
  await sendLineNotify({
    type:     'comment',
    name:     commentData.name,
    category: commentData.cat,
    message:  commentData.text,
    date:     commentData.date,
    source:   'HONEST HUB — โรงเรียนเทศบาลจุ่งฮั่ว',
  });

  // Toast ยืนยันการส่ง LINE
  showToast('📬 แจ้งเตือนไลน์ผู้ดูแลระบบแล้ว', 'success');
}


/* ============================================================
   C. notifyActivity — กิจกรรมใหม่
   ============================================================ */
async function notifyActivity(activityData) {
  showToast('📅 เพิ่มกิจกรรมใหม่: ' + activityData.name, 'info');

  await sendLineNotify({
    type:     'activity',
    name:     'ผู้ดูแลระบบ',
    category: activityData.status || 'กิจกรรม',
    message:  activityData.name + (activityData.desc ? '\n' + activityData.desc : ''),
    date:     activityData.date || '',
    source:   'HONEST HUB — โรงเรียนเทศบาลจุ่งฮั่ว',
  });
}


/* ============================================================
   D. notifyBudget — งบประมาณใหม่
   ============================================================ */
async function notifyBudget(budgetData) {
  showToast('💰 เพิ่มรายการงบประมาณใหม่: ' + budgetData.name, 'info');

  await sendLineNotify({
    type:     'budget',
    name:     'ผู้ดูแลระบบ',
    category: 'งบประมาณ',
    message:  budgetData.name + ' — ' + Number(budgetData.amount).toLocaleString('th-TH') + ' บาท',
    date:     new Date().toLocaleDateString('th-TH'),
    source:   'HONEST HUB — โรงเรียนเทศบาลจุ่งฮั่ว',
  });
}


/* ============================================================
   E. notifyAnnounce — ประกาศใหม่
   ============================================================ */
async function notifyAnnounce(announceData) {
  showToast('📢 ประกาศใหม่: ' + announceData.title, 'info');

  await sendLineNotify({
    type:     'announcement',
    name:     'ผู้ดูแลระบบ',
    category: announceData.category || 'ประกาศ',
    message:  announceData.title + (announceData.body ? '\n' + announceData.body : ''),
    date:     announceData.date || new Date().toLocaleDateString('th-TH'),
    source:   'HONEST HUB — โรงเรียนเทศบาลจุ่งฮั่ว',
  });
}
