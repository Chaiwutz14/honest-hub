# 🏫 HONEST HUB v3.0
### ศูนย์กลางความโปร่งใส — โรงเรียนเทศบาลจุ่งฮั่ว จังหวัดพัทลุง

---

## 📁 โครงสร้างไฟล์

```
honest-hub/
├── index.html              ← HTML โครงสร้าง
├── css/
│   └── style.css           ← ทุก Style (23 sections)
├── js/
│   ├── utils.js            ← DB layer, Toast, Confirm Dialog
│   ├── app.js              ← Navigation, Init
│   ├── admin.js            ← Authentication (SHA-256 + Lockout)
│   ├── budget.js           ← Budget Hub (persist + validate)
│   ├── activity.js         ← Activity Hub (persist)
│   ├── voice.js            ← Voice Hub (rate limit + bad word filter)
│   └── dashboard.js        ← Dashboard (live stats)
└── worker/
    └── line-notify-worker.js ← Cloudflare Worker (LINE Notify)
```

---

## 🔐 รหัสผ่าน Admin (Demo)

```
รหัสผ่าน: HH2567ADMIN
```

**วิธีเปลี่ยนรหัสผ่าน:**
1. ไปที่ https://emn178.github.io/online-tools/sha256.html
2. พิมพ์รหัสใหม่ → Copy Hash
3. แก้ไข `admin.js` บรรทัด `REAL_HASH_MAP` ใส่ Hash ใหม่

---


## 🔥 STEP 0 — ตั้งค่า Firebase Firestore (Real-time Sync)

> ทำขั้นตอนนี้ก่อน Deploy เพื่อให้ข้อมูลซิงค์ทุกเครื่อง

### 0.1 สร้าง Firebase Project
1. ไปที่ https://console.firebase.google.com
2. กด **Add project** → ตั้งชื่อ `honest-hub`
3. ปิด Google Analytics → กด **Create project**

### 0.2 เปิด Firestore Database
1. เมนูซ้าย → **Build** → **Firestore Database**
2. กด **Create database**
3. เลือก **Start in production mode** → เลือก region ใกล้ที่สุด (asia-southeast1)
4. กด **Done**

### 0.3 ตั้งค่า Security Rules
1. แท็บ **Rules** → ลบโค้ดเดิมทั้งหมด → วางโค้ดด้านล่าง:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /hh_comments/{doc} {
      allow read: if true;
      allow create: if request.resource.data.text is string
                    && request.resource.data.text.size() <= 500;
      allow update, delete: if false;
    }
    match /hh_data/{doc} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

2. กด **Publish**

### 0.4 เอา Firebase Config
1. ⚙️ Project Settings → **Your apps** → กด **</>** (Web)
2. ตั้งชื่อ App: `honest-hub-web` → กด **Register app**
3. Copy ค่า `firebaseConfig` ที่ได้

### 0.5 วาง Config ลงในโค้ด
เปิด `js/utils.js` บรรทัด `FIREBASE_CONFIG` แล้วแทนค่า:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSy...',        // ← วางค่าจาก Firebase
  authDomain:        'honest-hub.firebaseapp.com',
  projectId:         'honest-hub',
  storageBucket:     'honest-hub.appspot.com',
  messagingSenderId: '123456789',
  appId:             '1:123456789:web:abc123',
};
```

6. บันทึกไฟล์ → Push ขึ้น GitHub → ✅ Real-time sync พร้อมใช้งาน

---
## 🌐 STEP 1 — Deploy GitHub Pages (ฟรี)

### 1.1 สมัคร GitHub
- ไปที่ https://github.com → Sign up (ฟรี)

### 1.2 สร้าง Repository
1. กด **New repository**
2. ตั้งชื่อ: `honest-hub`
3. เลือก **Public**
4. กด **Create repository**

### 1.3 Upload ไฟล์
```
วิธีที่ 1 — ผ่าน GitHub Web:
1. เปิด repository → กด "uploading an existing file"
2. ลาก folder ทั้งหมดมาวาง
3. กด Commit changes

วิธีที่ 2 — ผ่าน VS Code (แนะนำ):
1. เปิด VS Code → ติดตั้ง Git
2. git init
3. git add .
4. git commit -m "HONEST HUB v3.0"
5. git remote add origin https://github.com/USERNAME/honest-hub.git
6. git push -u origin main
```

### 1.4 เปิด GitHub Pages
1. ไปที่ **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** → folder: **/ (root)**
4. กด **Save**
5. รอ 2-3 นาที → URL จะปรากฏ

**URL ที่ได้:**
```
https://YOUR-USERNAME.github.io/honest-hub
```

---

## 📲 STEP 2 — ตั้งค่า LINE Messaging API

> ⚠️ LINE Notify หยุดให้บริการแล้วตั้งแต่ 1 เมษายน 2568
> ใช้ **LINE Messaging API** แทน (ฟรี 200 push messages/เดือน)

### 2.1 สร้าง LINE Official Account และ Messaging API Channel
1. ไปที่ https://developers.line.biz/console/
2. กด **Create a Provider** → ตั้งชื่อ เช่น `โรงเรียนเทศบาลจุ่งฮั่ว`
3. กด **Create a Messaging API channel**
4. กรอกข้อมูล:
   - Channel name: `HONEST HUB แจ้งเตือน`
   - Channel description: ระบบแจ้งเตือนความคิดเห็น
   - Category: Education
5. กด **Create**

### 2.2 เอา Channel Access Token
1. เปิด Channel ที่สร้าง → แท็บ **Messaging API**
2. เลื่อนลงหา **Channel access token** → กด **Issue**
3. **Copy Token** เก็บไว้ (ใส่ใน Cloudflare Worker ในขั้นตอนถัดไป)

### 2.3 หา User ID หรือ Group ID ผู้รับแจ้งเตือน
```
วิธีที่ 1 — User ID (รับแจ้งเตือนคนเดียว):
1. เพิ่ม LINE Official Account ของคุณเป็นเพื่อน
2. ส่งข้อความหา Bot สักอย่าง
3. ดู Webhook event ใน Cloudflare Worker logs
   หรือใช้เครื่องมือ: https://developers.line.biz/en/docs/messaging-api/getting-user-ids/
4. User ID จะขึ้นต้นด้วย U เช่น Uxxxxxxxxxxxxxxxxx

วิธีที่ 2 — Group ID (รับแจ้งเตือนทั้ง Group):
1. เชิญ LINE Official Account เข้า Group LINE
2. ส่งข้อความใน Group
3. Group ID จะขึ้นต้นด้วย C เช่น Cxxxxxxxxxxxxxxxxx
```

---

## ☁️ STEP 3 — Deploy Cloudflare Worker (ฟรี)

### 3.1 สมัคร Cloudflare
- ไปที่ https://dash.cloudflare.com → Sign up (ฟรี)

### 3.2 สร้าง Worker
1. ไปที่ **Workers & Pages** → **Create application**
2. เลือก **Create Worker**
3. ตั้งชื่อ: `honest-hub-notify`
4. กด **Deploy** (โค้ดเดิมไม่ต้องสน)
5. กด **Edit code** → ลบโค้ดเดิมทั้งหมด
6. Copy โค้ดจาก `worker/line-notify-worker.js` มาวาง
7. แก้ `ALLOWED_ORIGIN` เป็น URL จริงของ GitHub Pages:
   ```javascript
   const ALLOWED_ORIGIN = 'https://YOUR-USERNAME.github.io';
   ```
8. กด **Save and Deploy**

### 3.3 ใส่ Environment Variables (สำคัญมาก!)
1. ไปที่ Worker → **Settings** → **Variables**
2. กด **Add variable** และเพิ่ม **2 ตัว** นี้:

   | Variable name | Value | Encrypt |
   |---|---|---|
   | `LINE_CHANNEL_TOKEN` | Channel Access Token จาก Step 2.2 | ✅ ต้อง Encrypt |
   | `LINE_TARGET_ID` | User ID หรือ Group ID จาก Step 2.3 | ✅ ต้อง Encrypt |

3. กด **Save and deploy**

### 3.4 Copy Worker URL
```
รูปแบบ: https://honest-hub-notify.YOUR-SUBDOMAIN.workers.dev
```

### 3.5 อัปเดต voice.js
เปิด `js/voice.js` บรรทัด:
```javascript
const WORKER_URL = 'https://honest-hub-notify.YOUR-SUBDOMAIN.workers.dev';
```
เปลี่ยนเป็น URL จริงของ Worker แล้ว push ขึ้น GitHub อีกครั้ง

---

## 🔓 STEP 4 — เปิดใช้ Production Fetch ใน voice.js

หลัง deploy Worker แล้ว เปิด `js/voice.js` หา comment นี้:

```javascript
/* Production: uncomment นี้หลัง deploy Worker
const res = await fetch(WORKER_URL, {
```

ลบ `/*` และ `*/` ออก เพื่อเปิดใช้ fetch จริง

---

## 💾 STEP 5 (อนาคต) — เปลี่ยนเป็น Firebase Firestore

เมื่อต้องการให้ข้อมูลซิงค์ข้ามอุปกรณ์:

### 5.1 สมัคร Firebase
1. ไปที่ https://console.firebase.google.com
2. สร้าง Project → ตั้งชื่อ `honest-hub`
3. เปิด **Firestore Database** → เลือก **Production mode**
4. ไปที่ **Project Settings** → **Your apps** → เพิ่ม Web App
5. Copy `firebaseConfig`

### 5.2 แก้ utils.js
เปิด `js/utils.js` แก้ไข `DB` object:

```javascript
// 1. เพิ่ม Firebase SDK ใน index.html
// <script src="https://www.gstatic.com/firebasejs/10.x.x/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.x.x/firebase-firestore.js"></script>

// 2. แก้ DB object ใน utils.js:
const firebaseConfig = { /* ใส่ config จาก Firebase Console */ };
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const DB = {
  async get(key) {
    const doc = await db.collection('hh_data').doc(key).get();
    return doc.exists ? doc.data().value : null;
  },
  async set(key, value) {
    await db.collection('hh_data').doc(key).set({ value });
  },
  async push(key, item, limit = 100) {
    const current = await this.get(key) || [];
    current.unshift(item);
    await this.set(key, current.slice(0, limit));
  }
};
```

---

## ✅ Checklist ก่อนนำเสนอ

- [ ] กรอก Firebase Config ใน js/utils.js
- [ ] เปลี่ยนรหัสผ่าน Admin จาก `HH2567ADMIN` เป็นรหัสจริง
- [ ] Deploy GitHub Pages → ทดสอบ URL ทำงานปกติ
- [ ] สร้าง LINE Messaging API Channel → เอา Channel Access Token และ Target ID
- [ ] ตั้งค่า LINE_CHANNEL_TOKEN และ LINE_TARGET_ID ใน Cloudflare Worker
- [ ] Deploy Worker → ทดสอบส่ง comment → รับแจ้งเตือนใน LINE
- [ ] Uncomment fetch() ใน voice.js
- [ ] ทดสอบบนมือถือ iOS และ Android
- [ ] ทดสอบ Admin login / logout
- [ ] ทดสอบ Rate limit (ส่ง comment ติดกัน → ต้องถูก block)
- [ ] ทดสอบ Bad word filter
- [ ] ทดสอบ Budget add/delete → refresh → ข้อมูลยังอยู่

---

## 📊 บริการทั้งหมด — ฟรี 100%

| บริการ | แผน | ข้อจำกัด |
|--------|-----|----------|
| GitHub Pages | Free | ไม่จำกัด |
| Cloudflare Worker | Free | 100K req/วัน |
| LINE Notify | Free | ไม่จำกัด |
| Firebase Firestore | Spark (Free) | 50K reads/วัน |

---

© 2567 HONEST HUB · โรงเรียนเทศบาลจุ่งฮั่ว จังหวัดพัทลุง
