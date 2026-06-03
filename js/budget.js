/* ============================================================
   budget.js — Budget Hub v3.0
   ============================================================
   A. SEED_BUDGET_DATA  — ข้อมูลตั้งต้น
   B. renderBudgetRows  — โหลดข้อมูลจาก DB มาแสดง (persist)
   C. addBudgetRow      — เพิ่มแถว + บันทึก DB
   D. deleteRow         — ลบแถว + บันทึก DB
   E. renumberRows      — เรียงเลข # ใหม่หลังลบ
   F. toggleBudgetEmpty — แสดง/ซ่อน empty state
   G. closeBudgetModal  — ปิด + reset form
   H. Input validation  — block non-numeric, negative
   ============================================================ */

'use strict';

const SEED_BUDGET_DATA = [
  { name: 'วันไหว้ครูประจำปี 2567',         amount: 15000,  status: 'done'     },
  { name: 'โครงการอบรมคุณธรรมจริยธรรม',    amount: 28500,  status: 'progress' },
  { name: 'กีฬาสีประจำปี',                  amount: 45000,  status: 'pending'  },
  { name: 'โครงการห้องสมุดมีชีวิต',        amount: 12000,  status: 'done'     },
];

const BADGE_MAP = {
  done:     '<span class="badge badge-done">✓ เสร็จสิ้น</span>',
  progress: '<span class="badge badge-progress">⟳ กำลังดำเนินการ</span>',
  pending:  '<span class="badge badge-pending">○ ยังไม่เริ่ม</span>',
};


/* ============================================================
   A. renderBudgetRows — โหลดจาก DB และ render ตาราง
   ============================================================ */
async function renderBudgetRows() {
  const tbody   = document.getElementById('budgetBody');
  tbody.innerHTML = '';

  // โหลดครั้งแรก (flag 'budgetSeeded') → ใช้ seed data
  // ถ้าลบหมดแล้ว (seeded=true, data=[]) → แสดง empty state ไม่ reset
  const hasSeeded = await DB.get('budgetSeeded');
  if (!hasSeeded) {
    await DB.set('budgetData',   SEED_BUDGET_DATA);
    await DB.set('budgetSeeded', true);
  }

  const data = (await DB.get('budgetData')) || [];
  data.forEach((item, index) => {
    tbody.appendChild(buildBudgetRow(item, index + 1));
  });

  toggleBudgetEmpty();
}


/* ============================================================
   B. buildBudgetRow — สร้าง <tr> จาก item object
   ============================================================ */
function buildBudgetRow(item, rowNum) {
  const tr = document.createElement('tr');

  const tdNum = document.createElement('td');
  tdNum.textContent = rowNum;

  const tdName = document.createElement('td');
  tdName.textContent = item.name; // textContent — XSS safe

  const tdAmount = document.createElement('td');
  tdAmount.textContent = Number(item.amount).toLocaleString('th-TH');

  const tdStatus = document.createElement('td');
  tdStatus.innerHTML = BADGE_MAP[item.status] || BADGE_MAP.pending; // our own HTML only

  const tdAction = document.createElement('td');
  tdAction.className = 'admin-only-td';
  if (document.body.classList.contains('admin-active')) tdAction.style.display = 'table-cell';

  const delBtn = document.createElement('button');
  delBtn.className  = 'btn btn-red';
  delBtn.textContent = 'ลบ';
  delBtn.onclick    = () => deleteRow(delBtn);
  tdAction.appendChild(delBtn);

  tr.append(tdNum, tdName, tdAmount, tdStatus, tdAction);
  return tr;
}


/* ============================================================
   C. addBudgetRow — validate + บันทึก + render
   ============================================================ */
async function addBudgetRow() {
  const nameInput   = document.getElementById('bName');
  const amountInput = document.getElementById('bAmount');
  const statusSel   = document.getElementById('bStatus');
  const nameErr     = document.getElementById('bNameError');
  const amountErr   = document.getElementById('bAmountError');

  nameErr.classList.remove('show');
  amountErr.classList.remove('show');

  const name   = nameInput.value.trim();
  const amount = amountInput.value.trim();
  const status = statusSel.value;

  let valid = true;

  if (!name) {
    nameErr.textContent = 'กรุณากรอกชื่อกิจกรรม';
    nameErr.classList.add('show');
    valid = false;
  }

  const amountNum = parseFloat(amount);
  if (!amount || isNaN(amountNum) || amountNum <= 0 || !Number.isFinite(amountNum)) {
    amountErr.textContent = 'กรุณากรอกจำนวนเงินที่ถูกต้อง (ตัวเลขบวกเท่านั้น)';
    amountErr.classList.add('show');
    valid = false;
  }

  if (amountNum > 99999999) {
    amountErr.textContent = 'จำนวนเงินเกินขีดจำกัด (สูงสุด 99,999,999 บาท)';
    amountErr.classList.add('show');
    valid = false;
  }

  if (!valid) return;

  // บันทึกลง DB
  const data    = (await DB.get('budgetData')) || [];
  const newItem = { name, amount: Math.round(amountNum), status };
  data.push(newItem);
  await DB.set('budgetData', data);

  // Render ใหม่ทั้งหมด (เพื่อให้เลข # ถูกต้อง)
  renderBudgetRows();

  await addLog('เพิ่มรายการงบประมาณ: ' + name);
  closeBudgetModal();
  showToast('✅ เพิ่มรายการงบประมาณสำเร็จ', 'success');
}


/* ============================================================
   D. deleteRow — ยืนยัน + ลบจาก DB + render ใหม่
   ============================================================ */
function deleteRow(btn) {
  if (!isAdmin) return;

  const tr      = btn.closest('tr');
  const tbody   = document.getElementById('budgetBody');
  const rows    = Array.from(tbody.querySelectorAll('tr'));
  const rowIndex = rows.indexOf(tr);

  showConfirm(
    'ต้องการลบรายการงบประมาณนี้?',
    async () => {
      const data = (await DB.get('budgetData')) || [];
      data.splice(rowIndex, 1);
      await DB.set('budgetData', data);
      await renderBudgetRows();
      showToast('🗑️ ลบรายการเรียบร้อยแล้ว');
    },
    '🗑️',
    'ลบรายการงบประมาณ'
  );
}


/* ============================================================
   E. toggleBudgetEmpty — แสดง/ซ่อน empty state
   ============================================================ */
function toggleBudgetEmpty() {
  const tbody   = document.getElementById('budgetBody');
  const emptyEl = document.getElementById('budgetEmpty');
  const tableEl = document.getElementById('budgetTable');
  if (!emptyEl) return;

  const isEmpty = tbody.querySelectorAll('tr').length === 0;
  emptyEl.style.display = isEmpty ? 'block' : 'none';
  if (tableEl) tableEl.style.display = isEmpty ? 'none' : 'table';
}


/* ============================================================
   F. closeBudgetModal — ปิด + reset form
   ============================================================ */
function closeBudgetModal() {
  document.getElementById('bName').value    = '';
  document.getElementById('bAmount').value  = '';
  document.getElementById('bStatus').selectedIndex = 0;
  document.getElementById('bNameError').classList.remove('show');
  document.getElementById('bAmountError').classList.remove('show');
  closeModal('addBudget');
}


/* ============================================================
   G. Input Guards — block non-numeric ในช่องงบประมาณ
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const amountInput = document.getElementById('bAmount');
  if (!amountInput) return;

  // Block ตัวอักษรที่ไม่ใช่ตัวเลข
  amountInput.addEventListener('keydown', function (e) {
    const controlKeys = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Enter','Home','End'];
    const isDigit     = (e.key >= '0' && e.key <= '9');
    const isControl   = controlKeys.includes(e.key);
    const isShortcut  = e.ctrlKey || e.metaKey;
    if (!isDigit && !isControl && !isShortcut) e.preventDefault();
  });

  // Paste protection — กรอง paste ที่ไม่ใช่ตัวเลข
  amountInput.addEventListener('paste', function (e) {
    e.preventDefault();
    const text    = (e.clipboardData || window.clipboardData).getData('text');
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned) document.execCommand('insertText', false, cleaned);
  });
});
