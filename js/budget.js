/* ============================================================
   budget.js — v6.1 FINAL
   ============================================================
   FIX:
   - Seed data มี id field ครบทุก item
   - เพิ่มรายการใหม่ที่หัว (unshift) สอดคล้องกับ activity
   - deleteRow ใช้ id แทน DOM index
   - _budgetInitDone flag declared ถูกต้อง
   ============================================================ */

'use strict';

const SEED_BUDGET_DATA = [
  { id:'seed-b1', name:'วันไหว้ครูประจำปี 2569',      amount:15000, status:'done',     dateDisplay:'8 มิ.ย. 2569' },
  { id:'seed-b2', name:'โครงการอบรมคุณธรรมจริยธรรม', amount:28500, status:'progress', dateDisplay:'มิถุนายน 2569' },
  { id:'seed-b3', name:'กีฬาสีประจำปี',               amount:45000, status:'pending',  dateDisplay:'กรกฎาคม 2569' },
  { id:'seed-b4', name:'โครงการห้องสมุดมีชีวิต',      amount:12000, status:'done',     dateDisplay:'พฤษภาคม 2569' },
];

const BADGE_MAP = {
  done:     '<span class="badge badge-done">✓ เสร็จสิ้น</span>',
  progress: '<span class="badge badge-progress">⟳ กำลังดำเนินการ</span>',
  pending:  '<span class="badge badge-pending">○ ยังไม่เริ่ม</span>',
};

// FIX: declared ที่ระดับ module scope
let _budgetInitDone = false;

/* ── Render ── */
async function renderBudgetRows() {
  const tbody = document.getElementById('budgetBody');
  tbody.innerHTML = '';

  if (!_budgetInitDone) {
    const hasSeeded = await DB.get('budgetSeeded');
    if (!hasSeeded) {
      await DB.set('budgetData',   SEED_BUDGET_DATA);
      await DB.set('budgetSeeded', true);
    }
    _budgetInitDone = true;
  }

  const data = (await DB.get('budgetData')) || [];
  data.forEach((item, index) => tbody.appendChild(buildBudgetRow(item, index + 1)));
  toggleBudgetEmpty();
}

/* ── Build row ── */
function buildBudgetRow(item, rowNum) {
  const tr = document.createElement('tr');

  const tdNum = document.createElement('td');
  tdNum.textContent = rowNum;

  const tdName = document.createElement('td');
  tdName.textContent = item.name;

  const tdAmount = document.createElement('td');
  tdAmount.textContent = Number(item.amount).toLocaleString('th-TH');

  const tdDate = document.createElement('td');
  tdDate.textContent = item.dateDisplay || '—';

  const tdStatus = document.createElement('td');
  tdStatus.innerHTML = BADGE_MAP[item.status] || BADGE_MAP.pending;

  const tdAction = document.createElement('td');
  tdAction.className = 'admin-only-td';
  const delBtn = document.createElement('button');
  delBtn.className   = 'btn btn-red';
  delBtn.textContent = 'ลบ';
  // FIX: ใช้ item.id แทน DOM index
  delBtn.onclick = () => deleteBudgetRow(item.id);
  tdAction.appendChild(delBtn);

  tr.append(tdNum, tdName, tdAmount, tdDate, tdStatus, tdAction);
  return tr;
}

/* ── Add ── */
async function addBudgetRow() {
  const nameInput   = document.getElementById('bName');
  const amountInput = document.getElementById('bAmount');
  const statusSel   = document.getElementById('bStatus');
  const dateInput   = document.getElementById('bDate');
  const nameErr     = document.getElementById('bNameError');
  const amountErr   = document.getElementById('bAmountError');

  nameErr.classList.remove('show');
  amountErr.classList.remove('show');

  const name    = nameInput.value.trim();
  const amount  = amountInput.value.trim();
  const status  = statusSel.value;
  const dateVal = dateInput ? dateInput.value : '';

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

  const dateDisplay = dateVal ? formatDateDisplay(dateVal) : '—';
  const newItem = {
    id: 'b-' + Date.now(),
    name,
    amount: Math.round(amountNum),
    status,
    dateDisplay,
  };

  // FIX: เพิ่มที่หัว (unshift) สอดคล้องกับ activity
  const data = (await DB.get('budgetData')) || [];
  data.unshift(newItem);
  await DB.set('budgetData', data);

  await renderBudgetRows();
  await addLog('เพิ่มรายการงบประมาณ: ' + name);
  closeBudgetModal();
  await notifyBudget(newItem);
}

/* ── Delete — ใช้ id แทน index ── */
function deleteBudgetRow(itemId) {
  if (!isAdmin) return;
  showConfirm(
    'ต้องการลบรายการงบประมาณนี้?',
    async () => {
      const data    = (await DB.get('budgetData')) || [];
      const updated = data.filter(item => item.id !== itemId);
      await DB.set('budgetData', updated);
      await renderBudgetRows();
      showToast('🗑️ ลบรายการเรียบร้อยแล้ว');
    },
    '🗑️', 'ลบรายการงบประมาณ'
  );
}

/* ── Empty state ── */
function toggleBudgetEmpty() {
  const tbody   = document.getElementById('budgetBody');
  const emptyEl = document.getElementById('budgetEmpty');
  const tableEl = document.getElementById('budgetTable');
  if (!emptyEl) return;
  const isEmpty = tbody.querySelectorAll('tr').length === 0;
  emptyEl.style.display = isEmpty ? 'block' : 'none';
  if (tableEl) tableEl.style.display = isEmpty ? 'none' : 'table';
}

/* ── Close modal ── */
function closeBudgetModal() {
  ['bName','bAmount'].forEach(id => { document.getElementById(id).value = ''; });
  const bDate = document.getElementById('bDate');
  if (bDate) bDate.value = '';
  document.getElementById('bStatus').selectedIndex = 0;
  document.getElementById('bNameError').classList.remove('show');
  document.getElementById('bAmountError').classList.remove('show');
  closeModal('addBudget');
}

/* ── Block non-numeric ── */
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('bAmount');
  if (!input) return;
  input.addEventListener('keydown', e => {
    const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Enter','Home','End'];
    if (!(e.key >= '0' && e.key <= '9') && !allowed.includes(e.key) && !e.ctrlKey && !e.metaKey)
      e.preventDefault();
  });
  input.addEventListener('paste', e => {
    e.preventDefault();
    const cleaned = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
    if (cleaned) {
      const start   = input.selectionStart;
      const end     = input.selectionEnd;
      // FIX: ใช้ direct value assignment แทน execCommand (deprecated)
      input.value   = input.value.slice(0, start) + cleaned + input.value.slice(end);
      input.setSelectionRange(start + cleaned.length, start + cleaned.length);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
});
