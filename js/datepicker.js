/* ============================================================
   datepicker.js — Thai Date Picker v5.0
   ============================================================
   แปลง <input type="date"> ให้แสดงผลเป็น พ.ศ. ไทย
   + ฟังก์ชัน formatDateDisplay() ใช้ทั้งโปรเจกต์
   ============================================================ */

'use strict';

const THAI_MONTH_FULL = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
];
const THAI_MONTH_SHORT = [
  'ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
  'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'
];


/* ============================================================
   formatDateDisplay
   รับค่า:
     - "2025-06-15"  → "15 มิถุนายน 2568"
     - "2025-06"     → "มิถุนายน 2568"   (month+year only)
     - ""            → "—"
   ============================================================ */
function formatDateDisplay(value) {
  if (!value) return '—';

  // month+year only: "2025-06"
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split('-').map(Number);
    return `${THAI_MONTH_FULL[month - 1]} ${year + 543}`;
  }

  // full date: "2025-06-15"
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return `${day} ${THAI_MONTH_SHORT[month - 1]} ${year + 543}`;
  }

  return value; // fallback: คืนค่าเดิม
}


/* ============================================================
   initDatePickers
   เพิ่ม label แสดงวันที่เป็นภาษาไทยใต้ทุก date input
   ============================================================ */
function initDatePickers() {
  document.querySelectorAll('input[data-datepicker]').forEach(input => {
    // สร้าง preview label
    const preview = document.createElement('div');
    preview.className = 'datepicker-preview';
    preview.style.cssText = 'font-size:0.78rem;color:#c9a84c;margin-top:4px;min-height:18px;';
    input.parentNode.insertBefore(preview, input.nextSibling);

    // อัปเดต preview เมื่อเลือกวัน
    input.addEventListener('change', () => {
      preview.textContent = input.value ? '📅 ' + formatDateDisplay(input.value) : '';
    });
  });

  // Month-only picker: เปลี่ยน type เป็น month
  document.querySelectorAll('input[data-monthpicker]').forEach(input => {
    input.type = 'month';

    const preview = document.createElement('div');
    preview.className = 'datepicker-preview';
    preview.style.cssText = 'font-size:0.78rem;color:#c9a84c;margin-top:4px;min-height:18px;';
    input.parentNode.insertBefore(preview, input.nextSibling);

    input.addEventListener('change', () => {
      preview.textContent = input.value ? '📅 ' + formatDateDisplay(input.value) : '';
    });
  });
}

document.addEventListener('DOMContentLoaded', initDatePickers);
