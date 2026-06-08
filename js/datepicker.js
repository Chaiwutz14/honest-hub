/* ============================================================
   datepicker.js — v6.1 FINAL
   ============================================================
   FIX: ลบ document.execCommand ที่ deprecated
        ใช้ input.value + dispatchEvent แทน
   ============================================================ */

'use strict';

const THAI_MONTH_FULL = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
];
const THAI_MONTH_SHORT = [
  'ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
  'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.',
];

function formatDateDisplay(value) {
  if (!value) return '—';
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split('-').map(Number);
    return `${THAI_MONTH_FULL[month - 1]} ${year + 543}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return `${day} ${THAI_MONTH_SHORT[month - 1]} ${year + 543}`;
  }
  return value;
}

function initDatePickers() {
  document.querySelectorAll('input[data-datepicker]').forEach(input => {
    const preview = document.createElement('div');
    preview.className   = 'datepicker-preview';
    preview.style.cssText = 'font-size:0.78rem;color:var(--gold,#c9a84c);margin-top:4px;min-height:18px;font-weight:600;';
    input.parentNode.insertBefore(preview, input.nextSibling);
    input.addEventListener('change', () => {
      preview.textContent = input.value ? '📅 ' + formatDateDisplay(input.value) : '';
    });
  });

  document.querySelectorAll('input[data-monthpicker]').forEach(input => {
    input.type = 'month';
    const preview = document.createElement('div');
    preview.className   = 'datepicker-preview';
    preview.style.cssText = 'font-size:0.78rem;color:var(--gold,#c9a84c);margin-top:4px;min-height:18px;font-weight:600;';
    input.parentNode.insertBefore(preview, input.nextSibling);
    input.addEventListener('change', () => {
      preview.textContent = input.value ? '📅 ' + formatDateDisplay(input.value) : '';
    });
  });
}

document.addEventListener('DOMContentLoaded', initDatePickers);
