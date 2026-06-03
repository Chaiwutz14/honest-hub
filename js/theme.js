/* ============================================================
   theme.js — Theme System v1.0
   ============================================================
   A. THEMES         — นิยาม 7 ธีม (CSS variables ทั้งหมด)
   B. applyTheme     — inject CSS variables เข้า :root
   C. buildSwitcher  — สร้าง UI picker ใน nav
   D. initTheme      — โหลดธีมที่บันทึกไว้ + render switcher
   ============================================================ */

'use strict';

/* ============================================================
   A. THEME DEFINITIONS
   แต่ละธีมกำหนดค่า CSS variables ทั้งหมดที่ style.css ใช้
   ============================================================ */
const THEMES = [
  {
    id:      'navy',
    name:    'Navy Classic',
    emoji:   '🏛️',
    desc:    'ทางการ · ราชการ',
    vars: {
      '--navy':          '#0a1628',
      '--navy-mid':      '#0f2444',
      '--navy-light':    '#1a3a5c',
      '--gold':          '#c9a84c',
      '--gold-light':    '#e8c97a',
      '--gold-dim':      'rgba(201,168,76,0.15)',
      '--accent':        '#c9a84c',
      '--accent-light':  '#e8c97a',
      '--accent-dim':    'rgba(201,168,76,0.15)',
      '--hero-grad-a':   '#0a1628',
      '--hero-grad-b':   '#0f2444',
      '--hero-grad-c':   '#0a1628',
      '--nav-bg':        'rgba(10,22,40,0.97)',
      '--nav-border':    'rgba(201,168,76,0.25)',
      '--card-bg':       'rgba(255,255,255,0.03)',
      '--card-border':   'rgba(201,168,76,0.15)',
      '--card-hover':    'rgba(201,168,76,0.55)',
      '--grid-line':     'rgba(201,168,76,0.035)',
      '--hero-text':     '#ffffff',
      '--hero-sub':      'rgba(255,255,255,0.55)',
      '--hero-desc':     'rgba(255,255,255,0.5)',
      '--page-bg':       '#f4f3f0',
      '--inner-body-bg': '#f4f3f0',
      '--text-primary':  '#0a1628',
      '--text-gray':     '#6b7280',
      '--white':         '#ffffff',
      '--green':         '#2d7a4f',
      '--green-light':   '#d1fae5',
      '--red':           '#b94040',
      '--red-light':     '#fff0f0',
      '--blue':          '#1a4a8a',
      '--footer-bg':     '#0a1628',
    },
    swatch: 'linear-gradient(135deg,#0a1628 50%,#c9a84c 50%)',
  },
  {
    id:      'forest',
    name:    'Forest Green',
    emoji:   '🌿',
    desc:    'ธรรมชาติ · สดชื่น',
    vars: {
      '--navy':          '#0d2b1f',
      '--navy-mid':      '#143d2a',
      '--navy-light':    '#1e5c3e',
      '--gold':          '#c9a84c',
      '--gold-light':    '#e8c97a',
      '--gold-dim':      'rgba(201,168,76,0.15)',
      '--accent':        '#c9a84c',
      '--accent-light':  '#e8c97a',
      '--accent-dim':    'rgba(201,168,76,0.15)',
      '--hero-grad-a':   '#0d2b1f',
      '--hero-grad-b':   '#143d2a',
      '--hero-grad-c':   '#0d2b1f',
      '--nav-bg':        'rgba(13,43,31,0.97)',
      '--nav-border':    'rgba(201,168,76,0.25)',
      '--card-bg':       'rgba(255,255,255,0.04)',
      '--card-border':   'rgba(201,168,76,0.2)',
      '--card-hover':    'rgba(201,168,76,0.55)',
      '--grid-line':     'rgba(201,168,76,0.04)',
      '--hero-text':     '#ffffff',
      '--hero-sub':      'rgba(255,255,255,0.6)',
      '--hero-desc':     'rgba(255,255,255,0.5)',
      '--page-bg':       '#f0f4f1',
      '--inner-body-bg': '#f0f4f1',
      '--text-primary':  '#0d2b1f',
      '--text-gray':     '#4a7060',
      '--white':         '#ffffff',
      '--green':         '#2d7a4f',
      '--green-light':   '#d1fae5',
      '--red':           '#b94040',
      '--red-light':     '#fff0f0',
      '--blue':          '#1a5a3a',
      '--footer-bg':     '#0d2b1f',
    },
    swatch: 'linear-gradient(135deg,#0d2b1f 50%,#c9a84c 50%)',
  },
  {
    id:      'purple',
    name:    'Royal Purple',
    emoji:   '👑',
    desc:    'หรูหรา · สร้างสรรค์',
    vars: {
      '--navy':          '#1a0a2e',
      '--navy-mid':      '#2a1050',
      '--navy-light':    '#3d1870',
      '--gold':          '#c0b4e0',
      '--gold-light':    '#d8d0f0',
      '--gold-dim':      'rgba(192,180,224,0.15)',
      '--accent':        '#c0b4e0',
      '--accent-light':  '#d8d0f0',
      '--accent-dim':    'rgba(192,180,224,0.15)',
      '--hero-grad-a':   '#1a0a2e',
      '--hero-grad-b':   '#2a1050',
      '--hero-grad-c':   '#1a0a2e',
      '--nav-bg':        'rgba(26,10,46,0.97)',
      '--nav-border':    'rgba(192,180,224,0.25)',
      '--card-bg':       'rgba(255,255,255,0.04)',
      '--card-border':   'rgba(192,180,224,0.2)',
      '--card-hover':    'rgba(192,180,224,0.55)',
      '--grid-line':     'rgba(192,180,224,0.04)',
      '--hero-text':     '#ffffff',
      '--hero-sub':      'rgba(255,255,255,0.6)',
      '--hero-desc':     'rgba(255,255,255,0.5)',
      '--page-bg':       '#f3f0f8',
      '--inner-body-bg': '#f3f0f8',
      '--text-primary':  '#1a0a2e',
      '--text-gray':     '#6b6080',
      '--white':         '#ffffff',
      '--green':         '#2d7a4f',
      '--green-light':   '#d1fae5',
      '--red':           '#b94040',
      '--red-light':     '#fff0f0',
      '--blue':          '#5a3a9a',
      '--footer-bg':     '#1a0a2e',
    },
    swatch: 'linear-gradient(135deg,#1a0a2e 50%,#c0b4e0 50%)',
  },
  {
    id:      'crimson',
    name:    'Crimson Red',
    emoji:   '🔥',
    desc:    'กล้าหาญ · พลังงาน',
    vars: {
      '--navy':          '#2d0a0a',
      '--navy-mid':      '#4a1010',
      '--navy-light':    '#6b1818',
      '--gold':          '#e8b84c',
      '--gold-light':    '#f5d070',
      '--gold-dim':      'rgba(232,184,76,0.15)',
      '--accent':        '#e8b84c',
      '--accent-light':  '#f5d070',
      '--accent-dim':    'rgba(232,184,76,0.15)',
      '--hero-grad-a':   '#2d0a0a',
      '--hero-grad-b':   '#4a1010',
      '--hero-grad-c':   '#2d0a0a',
      '--nav-bg':        'rgba(45,10,10,0.97)',
      '--nav-border':    'rgba(232,184,76,0.25)',
      '--card-bg':       'rgba(255,255,255,0.04)',
      '--card-border':   'rgba(232,184,76,0.2)',
      '--card-hover':    'rgba(232,184,76,0.55)',
      '--grid-line':     'rgba(232,184,76,0.04)',
      '--hero-text':     '#ffffff',
      '--hero-sub':      'rgba(255,255,255,0.6)',
      '--hero-desc':     'rgba(255,255,255,0.5)',
      '--page-bg':       '#f8f0f0',
      '--inner-body-bg': '#f8f0f0',
      '--text-primary':  '#2d0a0a',
      '--text-gray':     '#7a4040',
      '--white':         '#ffffff',
      '--green':         '#2d7a4f',
      '--green-light':   '#d1fae5',
      '--red':           '#b94040',
      '--red-light':     '#fff0f0',
      '--blue':          '#8a2020',
      '--footer-bg':     '#2d0a0a',
    },
    swatch: 'linear-gradient(135deg,#2d0a0a 50%,#e8b84c 50%)',
  },
  {
    id:      'slate',
    name:    'Slate Gray',
    emoji:   '🌑',
    desc:    'มินิมอล · โมเดิร์น',
    vars: {
      '--navy':          '#1a1f2e',
      '--navy-mid':      '#252b3d',
      '--navy-light':    '#333a50',
      '--gold':          '#c9a84c',
      '--gold-light':    '#e8c97a',
      '--gold-dim':      'rgba(201,168,76,0.15)',
      '--accent':        '#c9a84c',
      '--accent-light':  '#e8c97a',
      '--accent-dim':    'rgba(201,168,76,0.15)',
      '--hero-grad-a':   '#1a1f2e',
      '--hero-grad-b':   '#252b3d',
      '--hero-grad-c':   '#1a1f2e',
      '--nav-bg':        'rgba(26,31,46,0.97)',
      '--nav-border':    'rgba(201,168,76,0.2)',
      '--card-bg':       'rgba(255,255,255,0.04)',
      '--card-border':   'rgba(201,168,76,0.15)',
      '--card-hover':    'rgba(201,168,76,0.5)',
      '--grid-line':     'rgba(201,168,76,0.03)',
      '--hero-text':     '#ffffff',
      '--hero-sub':      'rgba(255,255,255,0.55)',
      '--hero-desc':     'rgba(255,255,255,0.48)',
      '--page-bg':       '#f0f1f4',
      '--inner-body-bg': '#f0f1f4',
      '--text-primary':  '#1a1f2e',
      '--text-gray':     '#6b7280',
      '--white':         '#ffffff',
      '--green':         '#2d7a4f',
      '--green-light':   '#d1fae5',
      '--red':           '#b94040',
      '--red-light':     '#fff0f0',
      '--blue':          '#3a4a7a',
      '--footer-bg':     '#1a1f2e',
    },
    swatch: 'linear-gradient(135deg,#1a1f2e 50%,#c9a84c 50%)',
  },
  {
    id:      'pink',
    name:    'Blossom Pink',
    emoji:   '🌸',
    desc:    'อ่อนโยน · สดใส',
    vars: {
      '--navy':          '#3d0a28',
      '--navy-mid':      '#5c1040',
      '--navy-light':    '#7a1858',
      '--gold':          '#e8a0c0',
      '--gold-light':    '#f5c0d8',
      '--gold-dim':      'rgba(232,160,192,0.15)',
      '--accent':        '#e8a0c0',
      '--accent-light':  '#f5c0d8',
      '--accent-dim':    'rgba(232,160,192,0.15)',
      '--hero-grad-a':   '#3d0a28',
      '--hero-grad-b':   '#5c1040',
      '--hero-grad-c':   '#3d0a28',
      '--nav-bg':        'rgba(61,10,40,0.97)',
      '--nav-border':    'rgba(232,160,192,0.3)',
      '--card-bg':       'rgba(255,255,255,0.05)',
      '--card-border':   'rgba(232,160,192,0.2)',
      '--card-hover':    'rgba(232,160,192,0.55)',
      '--grid-line':     'rgba(232,160,192,0.05)',
      '--hero-text':     '#ffffff',
      '--hero-sub':      'rgba(255,255,255,0.65)',
      '--hero-desc':     'rgba(255,255,255,0.55)',
      '--page-bg':       '#fdf0f5',
      '--inner-body-bg': '#fdf0f5',
      '--text-primary':  '#3d0a28',
      '--text-gray':     '#8a5070',
      '--white':         '#ffffff',
      '--green':         '#2d7a4f',
      '--green-light':   '#d1fae5',
      '--red':           '#b94040',
      '--red-light':     '#fff0f0',
      '--blue':          '#c0507a',
      '--footer-bg':     '#3d0a28',
    },
    swatch: 'linear-gradient(135deg,#3d0a28 50%,#e8a0c0 50%)',
  },
  {
    id:      'light',
    name:    'Light Mode',
    emoji:   '☀️',
    desc:    'สว่าง · อ่านง่าย',
    vars: {
      '--navy':          '#f0f4ff',
      '--navy-mid':      '#e4ecff',
      '--navy-light':    '#d0dcf5',
      '--gold':          '#1a4a8a',
      '--gold-light':    '#2a6ac0',
      '--gold-dim':      'rgba(26,74,138,0.12)',
      '--accent':        '#1a4a8a',
      '--accent-light':  '#2a6ac0',
      '--accent-dim':    'rgba(26,74,138,0.12)',
      '--hero-grad-a':   '#e8f0ff',
      '--hero-grad-b':   '#d0dcf5',
      '--hero-grad-c':   '#e8f0ff',
      '--nav-bg':        'rgba(240,244,255,0.97)',
      '--nav-border':    'rgba(26,74,138,0.2)',
      '--card-bg':       'rgba(255,255,255,0.8)',
      '--card-border':   'rgba(26,74,138,0.15)',
      '--card-hover':    'rgba(26,74,138,0.4)',
      '--grid-line':     'rgba(26,74,138,0.04)',
      '--hero-text':     '#0a1628',
      '--hero-sub':      'rgba(10,22,40,0.65)',
      '--hero-desc':     'rgba(10,22,40,0.55)',
      '--page-bg':       '#f8f9ff',
      '--inner-body-bg': '#f8f9ff',
      '--text-primary':  '#0a1628',
      '--text-gray':     '#5a6a80',
      '--white':         '#ffffff',
      '--green':         '#2d7a4f',
      '--green-light':   '#d1fae5',
      '--red':           '#b94040',
      '--red-light':     '#fff0f0',
      '--blue':          '#1a4a8a',
      '--footer-bg':     '#1a2a4a',
    },
    swatch: 'linear-gradient(135deg,#e8f0ff 50%,#1a4a8a 50%)',
    light: true, // ธีมสว่าง — ใช้สีตัวอักษรต่างออกไป
  },
];


/* ============================================================
   B. applyTheme — inject CSS variables เข้า document root
   ============================================================ */
function applyTheme(themeId) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const root  = document.documentElement;

  // Inject ทุก variable ของธีม
  Object.entries(theme.vars).forEach(([prop, val]) => {
    root.style.setProperty(prop, val);
  });

  // ธีม light ต้องปรับ nav text/logo color
  document.body.dataset.theme = theme.id;

  // อัปเดต active state ใน switcher
  document.querySelectorAll('.theme-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeId === theme.id);
    btn.setAttribute('aria-pressed', btn.dataset.themeId === theme.id);
  });

  // บันทึกลง localStorage
  DB.set('selectedTheme', themeId);
}


/* ============================================================
   C. buildSwitcher — สร้าง Theme Picker UI ใน nav
   ============================================================ */
function buildSwitcher() {
  // Container wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'theme-switcher';
  wrapper.setAttribute('role', 'group');
  wrapper.setAttribute('aria-label', 'เลือกธีมสี');

  // Toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.className   = 'theme-toggle-btn';
  toggleBtn.innerHTML   = '🎨';
  toggleBtn.title       = 'เปลี่ยนธีมสี';
  toggleBtn.setAttribute('aria-label', 'เปิดเมนูเลือกธีมสี');
  toggleBtn.setAttribute('aria-expanded', 'false');
  toggleBtn.setAttribute('aria-controls', 'themeDropdown');

  // Dropdown panel
  const dropdown = document.createElement('div');
  dropdown.className = 'theme-dropdown';
  dropdown.id        = 'themeDropdown';
  dropdown.setAttribute('role', 'listbox');
  dropdown.setAttribute('aria-label', 'รายการธีม');

  // Header
  const header = document.createElement('div');
  header.className   = 'theme-dropdown-header';
  header.textContent = '🎨 เลือกธีมสี';

  dropdown.appendChild(header);

  // Theme options
  THEMES.forEach(theme => {
    const btn = document.createElement('button');
    btn.className        = 'theme-option';
    btn.dataset.themeId  = theme.id;
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', `ธีม ${theme.name} — ${theme.desc}`);

    // Swatch circle
    const swatch = document.createElement('span');
    swatch.className          = 'theme-swatch';
    swatch.style.background   = theme.swatch;
    swatch.setAttribute('aria-hidden', 'true');

    // Text block
    const textBlock = document.createElement('span');
    textBlock.className = 'theme-option-text';

    const nameEl = document.createElement('span');
    nameEl.className   = 'theme-option-name';
    nameEl.textContent = `${theme.emoji} ${theme.name}`;

    const descEl = document.createElement('span');
    descEl.className   = 'theme-option-desc';
    descEl.textContent = theme.desc;

    textBlock.appendChild(nameEl);
    textBlock.appendChild(descEl);

    // Checkmark
    const check = document.createElement('span');
    check.className        = 'theme-check';
    check.textContent      = '✓';
    check.setAttribute('aria-hidden', 'true');

    btn.appendChild(swatch);
    btn.appendChild(textBlock);
    btn.appendChild(check);

    btn.addEventListener('click', () => {
      applyTheme(theme.id);
      closeThemeDropdown();
    });

    dropdown.appendChild(btn);
  });

  wrapper.appendChild(toggleBtn);
  wrapper.appendChild(dropdown);

  // Toggle open/close
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle('open');
    toggleBtn.setAttribute('aria-expanded', isOpen);
    toggleBtn.classList.toggle('active', isOpen);
  });

  // ปิดเมื่อคลิกนอก
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) closeThemeDropdown();
  });

  function closeThemeDropdown() {
    dropdown.classList.remove('open');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.classList.remove('active');
  }

  // แทรกก่อน hamburger button ใน nav
  const nav = document.querySelector('nav');
  const hamburger = document.getElementById('hamburgerBtn');
  if (nav && hamburger) {
    nav.insertBefore(wrapper, hamburger);
  } else if (nav) {
    nav.appendChild(wrapper);
  }
}


/* ============================================================
   D. initTheme — โหลดธีมที่บันทึกไว้ + สร้าง UI
   ============================================================ */
function initTheme() {
  buildSwitcher();

  // โหลดธีมที่เคยเลือก หรือใช้ navy เป็น default
  const saved = DB.get('selectedTheme') || 'navy';
  applyTheme(saved);
}

// รัน init หลัง DOM พร้อม
document.addEventListener('DOMContentLoaded', initTheme);
