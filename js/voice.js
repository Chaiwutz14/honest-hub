/* ============================================================
   voice.js — Voice Hub v4.0 (Firebase Real-time)
   ============================================================
   A. BAD_WORDS         — กรองคำไม่เหมาะสม
   B. Rate Limiting     — cooldown 30 วินาที
   C. Double Submit Lock
   D. SEED_COMMENTS     — ความคิดเห็นตั้งต้น
   E. renderAllComments — โหลดจาก Firestore + seed
   F. buildCommentCard  — DOM card (XSS safe)
   G. submitComment     — validate + filter + persist + notify
   H. updateCommentCount
   I. Real-time listener — อัปเดตอัตโนมัติเมื่อมี comment ใหม่
   J. sendNotification  — LINE Messaging API via Cloudflare Worker
   ============================================================ */

'use strict';

/* ============================================================
   A. BAD WORDS FILTER
   ============================================================ */
const BAD_WORDS = [
  'ไอสัตว์','ไอ้สัตว์','สัตว์','ระยำ','เหี้ย','ควาย',
  'อีสัตว์','หน้าหี','หี','สวาท','เย็ด','หน้าหิ',
  'อีดอก','ไอ้ชาติหมา','ชาติหมา','มึง','กู',
  'แม่ง','เชี่ย','สาด','บักหำ','หำ','ดอกทอง',
  'fuck','shit','ass','bitch','bastard','damn',
];

function containsBadWord(text) {
  const lower = text.toLowerCase();
  return BAD_WORDS.some(w => lower.includes(w.toLowerCase()));
}


/* ============================================================
   B. RATE LIMITING
   ============================================================ */
const COMMENT_COOLDOWN_SEC = 30;
let lastCommentTime  = 0;
let cooldownInterval = null;
let isSubmitting     = false;

function startCooldown() {
  const bar      = document.getElementById('cooldownBar');
  const timerEl  = document.getElementById('cooldownTimer');
  const submitBtn = document.getElementById('submitCommentBtn');

  if (!bar) return;
  bar.style.display = 'flex';
  if (submitBtn) submitBtn.disabled = true;

  let remaining = COMMENT_COOLDOWN_SEC;
  if (timerEl) timerEl.textContent = remaining;

  cooldownInterval = setInterval(() => {
    remaining--;
    if (timerEl) timerEl.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(cooldownInterval);
      bar.style.display = 'none';
      if (submitBtn) submitBtn.disabled = false;
    }
  }, 1000);
}


/* ============================================================
   D. SEED COMMENTS
   ============================================================ */
const SEED_COMMENTS = [
  {
    id:   'seed-c1',
    name: 'นักเรียน ม.3',
    date: '25 พ.ค. 2567',
    text: 'อยากให้มีกิจกรรมพัฒนาทักษะดิจิทัลให้นักเรียนมากขึ้น และเปิดเผยงบประมาณอย่างต่อเนื่อง',
    cat:  'ข้อเสนอแนะทั่วไป',
  },
  {
    id:   'seed-c2',
    name: 'ผู้ปกครอง',
    date: '20 พ.ค. 2567',
    text: 'ชื่นชมที่โรงเรียนมีเว็บไซต์ความโปร่งใส ช่วยให้ผู้ปกครองติดตามการใช้งบประมาณได้อย่างสะดวก',
    cat:  'ความโปร่งใส',
  },
];

const THAI_MONTHS = [
  'ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
  'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.',
];

// Unsubscribe function สำหรับ real-time listener
let unsubscribeComments = () => {};


/* ============================================================
   E. renderAllComments — โหลดจาก Firestore + seed
   ============================================================ */
async function renderAllComments() {
  const list = document.getElementById('commentList');
  list.innerHTML = '';

  // ดึงจาก Firestore (หรือ localStorage fallback)
  const stored = await DB.comments.getAll();
  stored.forEach(c => list.appendChild(buildCommentCard(c, true)));

  // Seed comments ท้ายรายการ
  SEED_COMMENTS.forEach(c => list.appendChild(buildCommentCard(c, false)));

  toggleCommentEmpty();

  // เปิด Real-time listener (ถ้า Firebase พร้อม)
  unsubscribeComments();
  unsubscribeComments = DB.comments.listenForNew((freshComments) => {
    const list = document.getElementById('commentList');
    list.innerHTML = '';
    freshComments.forEach(c => list.appendChild(buildCommentCard(c, true)));
    SEED_COMMENTS.forEach(c => list.appendChild(buildCommentCard(c, false)));
    updateCommentCount(freshComments.length);
    toggleCommentEmpty();
  });
}


/* ============================================================
   F. buildCommentCard — XSS safe ทั้งหมด
   ============================================================ */
function buildCommentCard(item, deletable = false) {
  const card = document.createElement('div');
  card.className = 'comment-card';
  card.setAttribute('role', 'listitem');

  const meta       = document.createElement('div');
  meta.className   = 'comment-meta';
  const authorWrap = document.createElement('div');
  authorWrap.className = 'comment-author-wrap';

  const author      = document.createElement('span');
  author.className  = 'comment-author';
  author.textContent = item.name; // textContent — XSS safe

  authorWrap.appendChild(author);

  if (deletable) {
    const delBtn = document.createElement('button');
    delBtn.className   = 'comment-del admin-only';
    delBtn.textContent = '🗑';
    delBtn.title       = 'ลบความคิดเห็น';
    delBtn.setAttribute('aria-label', 'ลบความคิดเห็นของ ' + item.name);
    delBtn.onclick = () => {
      showConfirm(
        'ต้องการลบความคิดเห็นนี้?',
        async () => {
          await DB.comments.delete(item);
          await renderAllComments();
          showToast('🗑️ ลบความคิดเห็นเรียบร้อยแล้ว');
        },
        '🗑️', 'ลบความคิดเห็น'
      );
    };
    authorWrap.appendChild(delBtn);
  }

  const dateEl      = document.createElement('span');
  dateEl.className  = 'comment-date';
  dateEl.textContent = item.date;

  meta.appendChild(authorWrap);
  meta.appendChild(dateEl);

  const textEl      = document.createElement('div');
  textEl.className  = 'comment-text';
  textEl.textContent = item.text; // textContent — XSS safe

  const catEl       = document.createElement('span');
  catEl.className   = 'comment-category';
  catEl.textContent = item.cat;

  card.append(meta, textEl, catEl);
  return card;
}


/* ============================================================
   G. submitComment — full validation + Firestore save
   ============================================================ */
async function submitComment() {
  const nameInput  = document.getElementById('commentName');
  const catSel     = document.getElementById('commentCat');
  const textInput  = document.getElementById('commentText');
  const errEl      = document.getElementById('commentTextError');
  const submitBtn  = document.getElementById('submitCommentBtn');

  if (isSubmitting) return;

  // Rate limit check
  const elapsed = (Date.now() - lastCommentTime) / 1000;
  if (lastCommentTime > 0 && elapsed < COMMENT_COOLDOWN_SEC) {
    showToast(`⏳ กรุณารอ ${Math.ceil(COMMENT_COOLDOWN_SEC - elapsed)} วินาที`, 'warning');
    return;
  }

  errEl.classList.remove('show');
  errEl.textContent = '';

  const rawName = nameInput.value.trim();
  const cat     = catSel.value;
  const rawText = textInput.value.trim();

  // Validate
  if (!rawText) {
    errEl.textContent = 'กรุณาพิมพ์ความคิดเห็นก่อนส่ง';
    errEl.classList.add('show');
    textInput.focus();
    return;
  }
  if (rawText.length < 5) {
    errEl.textContent = 'ความคิดเห็นต้องมีอย่างน้อย 5 ตัวอักษร';
    errEl.classList.add('show');
    textInput.focus();
    return;
  }
  if (containsBadWord(rawText) || containsBadWord(rawName)) {
    errEl.textContent = '⚠️ พบคำที่ไม่เหมาะสม กรุณาแก้ไขก่อนส่ง';
    errEl.classList.add('show');
    textInput.focus();
    return;
  }

  const name = rawName || 'ไม่ระบุตัวตน';
  const d    = new Date();
  const date = `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;

  const commentData = {
    id: 'c-' + Date.now(),
    name, cat, text: rawText, date,
  };

  // Lock ปุ่ม
  isSubmitting = true;
  if (submitBtn) submitBtn.disabled = true;

  try {
    // บันทึกลง Firestore (หรือ localStorage fallback)
    await DB.comments.add(commentData);
    await addLog('ความคิดเห็นใหม่จาก: ' + name);

    // render ใหม่เสมอ — real-time listener จะ override ถ้า Firebase พร้อม
    await renderAllComments();

    // Reset form
    nameInput.value  = '';
    textInput.value  = '';
    document.getElementById('commentCharCount').textContent = '0 / 500 ตัวอักษร';

    updateCommentCount();
    lastCommentTime = Date.now();
    startCooldown();

    // Send LINE notification
    sendNotification(commentData);

  } catch (err) {
    showToast('❌ เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    console.error('submitComment error:', err);
    if (submitBtn) submitBtn.disabled = false;
  } finally {
    isSubmitting = false;
  }
}


/* ============================================================
   H. updateCommentCount
   ============================================================ */
async function updateCommentCount(storedCount) {
  const label = document.getElementById('commentCountLabel');
  if (!label) return;

  let count = storedCount;
  if (count === undefined) {
    const stored = await DB.comments.getAll();
    count = stored.length;
  }
  label.textContent = `มีความคิดเห็นทั้งหมด ${count + SEED_COMMENTS.length} รายการ`;
}

function toggleCommentEmpty() {
  const list    = document.getElementById('commentList');
  const emptyEl = document.getElementById('commentEmpty');
  if (!emptyEl) return;
  emptyEl.style.display = list.children.length === 0 ? 'block' : 'none';
}


/* ============================================================
   J. sendNotification — LINE Messaging API via Cloudflare Worker
   ============================================================
   ⚠️  LINE_CHANNEL_TOKEN และ LINE_TARGET_ID เก็บใน Worker เท่านั้น
       ดูโค้ด Worker ได้ที่ /worker/line-notify-worker.js
   ============================================================ */
const WORKER_URL = 'https://honest-hub-notify.peeza1482546.workers.dev/';
// ^ เปลี่ยนเป็น URL จริงหลัง deploy Cloudflare Worker

async function sendNotification(commentData) {
  try {
    const payload = {
      name:     commentData.name,
      category: commentData.cat,
      message:  commentData.text,
      date:     commentData.date,
      source:   'HONEST HUB — โรงเรียนเทศบาลจุ่งฮั่ว',
    };

    const res = await fetch(WORKER_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Worker ${res.status}: ${errText}`);
    }

    showToast('📬 ส่งความคิดเห็นสำเร็จ และแจ้งเตือนไลน์ผู้ดูแลระบบแล้ว', 'success');

  } catch (err) {
    console.warn('Notification failed (non-critical):', err);
    showToast('✅ ส่งความคิดเห็นสำเร็จ', 'default');
  }
}


/* ============================================================
   Event Listeners
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const textInput = document.getElementById('commentText');
  const charCount = document.getElementById('commentCharCount');
  if (!textInput || !charCount) return;

  textInput.addEventListener('input', function () {
    const len = this.value.length;
    charCount.textContent = `${len} / 500 ตัวอักษร`;
    charCount.style.color = len >= 450 ? '#b94040' : '#6b7280';
  });
});
