/* ============================================================
   voice.js — v6.1 FINAL
   ============================================================
   FIX:
   - listenForNew เป็น primary source
   - delete ใช้ firestoreId เสมอ
   - ล้าง listener เมื่อออกจากหน้า
   - Loading state ระหว่าง submit
   - Toast แจ้งเตือน 1 อัน (ไม่ซ้อน)
   ============================================================ */

'use strict';

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

const COMMENT_COOLDOWN_SEC = 30;
let lastCommentTime  = 0;
let cooldownInterval = null;
let isSubmitting     = false;

function startCooldown() {
  const bar       = document.getElementById('cooldownBar');
  const timerEl   = document.getElementById('cooldownTimer');
  const submitBtn = document.getElementById('submitCommentBtn');
  if (!bar) return;
  bar.style.display = 'flex';
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '📨 ส่งความคิดเห็น'; }
  let remaining = COMMENT_COOLDOWN_SEC;
  if (timerEl) timerEl.textContent = remaining;
  cooldownInterval = setInterval(() => {
    remaining--;
    if (timerEl) timerEl.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(cooldownInterval);
      bar.style.display = 'none';
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '📨 ส่งความคิดเห็น'; }
    }
  }, 1000);
}

const SEED_COMMENTS = [
  { id:'seed-c1', name:'นักเรียน ม.3', date:'25 พ.ค. 2567',
    text:'อยากให้มีกิจกรรมพัฒนาทักษะดิจิทัลให้นักเรียนมากขึ้น และเปิดเผยงบประมาณอย่างต่อเนื่อง',
    cat:'ข้อเสนอแนะทั่วไป' },
  { id:'seed-c2', name:'ผู้ปกครอง', date:'20 พ.ค. 2567',
    text:'ชื่นชมที่โรงเรียนมีเว็บไซต์ความโปร่งใส ช่วยให้ผู้ปกครองติดตามการใช้งบประมาณได้อย่างสะดวก',
    cat:'ความโปร่งใส' },
];

const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

// FIX: ล้าง listener ได้เมื่อออกจากหน้า
let _unsubscribeComments = () => {};

function cleanupVoiceListeners() {
  _unsubscribeComments();
  _unsubscribeComments = () => {};
}

async function renderAllComments() {
  // ล้าง listener เก่าก่อน
  cleanupVoiceListeners();

  if (isOnline && _db) {
    // Online: ใช้ real-time listener
    _unsubscribeComments = DB.comments.listenForNew(freshComments => {
      _renderCommentList(freshComments);
    });
    // โหลดครั้งแรก
    const initial = await DB.comments.getAll();
    _renderCommentList(initial);
  } else {
    // Offline: localStorage
    const stored = await DB.comments.getAll();
    _renderCommentList(stored);
  }
}

function _renderCommentList(storedComments) {
  const list = document.getElementById('commentList');
  list.innerHTML = '';
  storedComments.forEach(c => list.appendChild(buildCommentCard(c, true)));
  SEED_COMMENTS.forEach(c => list.appendChild(buildCommentCard(c, false)));
  updateCommentCount(storedComments.length);
}

function buildCommentCard(item, deletable = false) {
  const card = document.createElement('div');
  card.className = 'comment-card';
  card.setAttribute('role', 'listitem');

  const meta       = document.createElement('div');
  meta.className   = 'comment-meta';
  const authorWrap = document.createElement('div');
  authorWrap.className = 'comment-author-wrap';

  const author = document.createElement('span');
  author.className   = 'comment-author';
  author.textContent = item.name;
  authorWrap.appendChild(author);

  if (deletable) {
    const delBtn = document.createElement('button');
    delBtn.className   = 'comment-del admin-only';
    delBtn.textContent = '🗑';
    delBtn.title       = 'ลบความคิดเห็น';
    const capturedItem = { ...item };
    delBtn.onclick = () => {
      showConfirm(
        'ต้องการลบความคิดเห็นนี้?',
        async () => {
          await DB.comments.delete(capturedItem);
          if (!isOnline) await renderAllComments();
          showToast('🗑️ ลบความคิดเห็นเรียบร้อยแล้ว');
        },
        '🗑️', 'ลบความคิดเห็น'
      );
    };
    authorWrap.appendChild(delBtn);
  }

  const dateEl = document.createElement('span');
  dateEl.className   = 'comment-date';
  dateEl.textContent = item.date;

  meta.appendChild(authorWrap);
  meta.appendChild(dateEl);

  const textEl = document.createElement('div');
  textEl.className   = 'comment-text';
  textEl.textContent = item.text;

  const catEl = document.createElement('span');
  catEl.className   = 'comment-category';
  catEl.textContent = item.cat;

  card.append(meta, textEl, catEl);
  return card;
}

async function submitComment() {
  const nameInput = document.getElementById('commentName');
  const catSel    = document.getElementById('commentCat');
  const textInput = document.getElementById('commentText');
  const errEl     = document.getElementById('commentTextError');
  const submitBtn = document.getElementById('submitCommentBtn');

  if (isSubmitting) return;

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
  const commentData = { id: 'c-' + Date.now(), name, cat, text: rawText, date };

  // FIX: Loading state ที่ชัดเจน
  isSubmitting = true;
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '⏳ กำลังส่ง...'; }

  try {
    await DB.comments.add(commentData);
    await addLog('ความคิดเห็นใหม่จาก: ' + name);
    if (!isOnline) await renderAllComments();

    nameInput.value = '';
    textInput.value = '';
    document.getElementById('commentCharCount').textContent = '0 / 500 ตัวอักษร';

    lastCommentTime = Date.now();
    startCooldown();

    // FIX: Toast เดียว — ไม่ซ้อน
    await notifyComment(commentData);

  } catch (err) {
    showToast('❌ เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    console.error('submitComment error:', err);
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '📨 ส่งความคิดเห็น'; }
  } finally {
    isSubmitting = false;
  }
}

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
