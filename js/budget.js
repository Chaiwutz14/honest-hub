/* ============================================================
   budget.js — Budget Hub v5.0
   ============================================================ */

'use strict';

const SEED_BUDGET_DATA = [
  { name: 'วันไหว้ครูประจำปี 2567',      amount: 15000, status: 'done'     },
  { name: 'โครงการอบรมคุณธรรมจริยธรรม', amount: 28500, status: 'progress' },
  { name: 'กีฬาสีประจำปี',               amount: 45000, status: 'pending'  },
  { name: 'โครงการห้องสมุดมีชีวิต',     amount: 12000, status: 'done'     },
];

const BADGE_MAP = {
  done:     '<span class="badge badge-done">✓ เสร็จสิ้น</span>',
  progress: '<span class="badge badge-progress">⟳ กำลังดำเนินการ</span>',
  pending:  '<span class="badge badge-pending">○ ยังไม่เริ่ม</span>',
};

// seed init flag — ทำครั้งเดียวต่อ session
let _budgetInitDone = false;

async function renderBudgetRows() {
  const tbody = document.getElementById('budgetBody');
  tbody.innerHTML = '';

  // seed init ครั้งเดียว
  if (!_budgetInitDone) {
    const hasSeeded = await DB.get('budgetSeeded');
    if (!hasSeeded) {
      await DB.set('budgetData',   SEED_BUDGET_DATA);
      await DB.set('budgetSeeded', true);
      console.log('✅ Budget seed data initialized');
    }
    _budgetInitDone = true;
  }

  const data = (await DB.get('budgetData')) || [];
  data.forEach((item, index) => tbody.appendChild(buildBudgetRow(item, index + 1)));
  toggleBudgetEmpty();
}

function buildBudgetRow(item, rowNum) {
  const tr = document.createElement('tr');

  const tdNum    = document.createElement('td');
  tdNum.textContent = rowNum;

  const tdName   = document.createElement('td');
  tdName.textContent = item.name;

  const tdAmount = document.createElement('td');
  tdAmount.textContent = Number(item.amount).toLocaleString('th-TH');

  // วันที่ (ถ้ามี)
  const tdDate   = document.createElement('td');
  tdDate.textContent = item.dateDisplay || '—';

  const tdStatus = document.createElement('td');
  tdStatus.innerHTML = BADGE_MAP[item.status] || BADGE_MAP.pending;

  const tdAction = document.createElement('td');
  tdAction.className = 'admin-only-td';
  const delBtn = document.createElement('button');
  delBtn.className   = 'btn btn-red';
  delBtn.textContent = 'ลบ';
  delBtn.onclick     = () => deleteBudgetRow(delBtn);
  tdAction.appendChild(delBtn);

  tr.append(tdNum, tdName, tdAmount, tdDate, tdStatus, tdAction);
  return tr;
}

async function addBudgetRow() {
  const nameInput   = document.getElementById('bName');
  const amountInput = document.getElementById('bAmount');
  const statusSel   = document.getElementById('bStatus');
  const dateInput   = document.getElementById('bDate');
  const nameErr     = document.getElementById('bNameError');
  const amountErr   = document.getElementById('bAmountError');

  nameErr.classList.remove('show');
  amountErr.classList.remove('show');

  const name      = nameInput.value.trim();
  const amount    = amountInput.value.trim();
  const status    = statusSel.value;
  const dateVal   = dateInput ? dateInput.value : '';

  let valid = true;
  if (!name) {
    nameErr.textContent = 'กรุณากรอกชื่อกิจกรรม';
    nameErr.classList.add('show');
    valid = false;
  }

  const amountNum = parseFloat(amount);
  if (!amount || isNaN(amountNum) || amountNum <= 0) {
    amountErr.textContent = 'กรุณากรอกจำนวนเงินที่ถูกต้อง';
    amountErr.classList.add('show');
    valid = false;
  }
  if (valid && amountNum > 99999999) {
    amountErr.textContent = 'จำนวนเงินเกินขีดจำกัด (สูงสุด 99,999,999 บาท)';
    amountErr.classList.add('show');
    valid = false;
  }
  if (!valid) return;

  // แปลง date → display string
  const dateDisplay = dateVal ? formatDateDisplay(dateVal) : '—';

  const newItem = { name, amount: Math.round(amountNum), status, dateDisplay };
  const data    = (await DB.get('budgetData')) || [];
  data.push(newItem);
  await DB.set('budgetData', data);

  await renderBudgetRows();
  await addLog('เพิ่มรายการงบประมาณ: ' + name);
  closeBudgetModal();

  // แจ้งเตือน
  await notifyBudget(newItem);
}

function deleteBudgetRow(btn) {
  if (!isAdmin) return;
  const tr      = btn.closest('tr');
  const rows    = Array.from(document.getElementById('budgetBody').querySelectorAll('tr'));
  const rowIdx  = rows.indexOf(tr);

  showConfirm('ต้องการลบรายการงบประมาณนี้?', async () => {
    const data = (await DB.get('budgetData')) || [];
    data.splice(rowIdx, 1);
    await DB.set('budgetData', data);
    await renderBudgetRows();
    showToast('🗑️ ลบรายการเรียบร้อยแล้ว');
  }, '🗑️', 'ลบรายการงบประมาณ');
}

function toggleBudgetEmpty() {
  const tbody   = document.getElementById('budgetBody');
  const emptyEl = document.getElementById('budgetEmpty');
  const tableEl = document.getElementById('budgetTable');
  if (!emptyEl) return;
  const isEmpty = tbody.querySelectorAll('tr').length === 0;
  emptyEl.style.display = isEmpty ? 'block' : 'none';
  if (tableEl) tableEl.style.display = isEmpty ? 'none' : 'table';
}

function closeBudgetModal() {
  ['bName','bAmount'].forEach(id => { document.getElementById(id).value = ''; });
  const bDate = document.getElementById('bDate');
  if (bDate) bDate.value = '';
  document.getElementById('bStatus').selectedIndex = 0;
  document.getElementById('bNameError').classList.remove('show');
  document.getElementById('bAmountError').classList.remove('show');
  closeModal('addBudget');
}

// Block non-numeric
document.addEventListener('DOMContentLoaded', () => {
  const amountInput = document.getElementById('bAmount');
  if (!amountInput) return;
  amountInput.addEventListener('keydown', e => {
    const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Enter','Home','End'];
    if (!(e.key >= '0' && e.key <= '9') && !allowed.includes(e.key) && !e.ctrlKey && !e.metaKey)
      e.preventDefault();
  });
  amountInput.addEventListener('paste', e => {
    e.preventDefault();
    const cleaned = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
    if (cleaned) document.execCommand('insertText', false, cleaned);
  });
});
