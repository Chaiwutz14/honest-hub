/* ============================================================
   line-notify-worker.js — Cloudflare Worker v4.0
   LINE Messaging API — รองรับทั้ง User ID และ Group ID
   ============================================================

   Environment Variables (Settings → Variables → Encrypt ทั้งหมด):
   ┌─────────────────────────────────────────────────────────┐
   │ LINE_CHANNEL_TOKEN  : Channel Access Token              │
   │ LINE_TARGET_ID      : User ID (Uxxx) หรือ Group ID (Cxxx)│
   │                                                         │
   │ ถ้าอยากส่งหลายคนพร้อมกัน ใช้ LINE_TARGET_IDS แทน       │
   │ LINE_TARGET_IDS     : คั่นด้วย comma เช่น Uxxx,Uxxx     │
   └─────────────────────────────────────────────────────────┘

   ⚠️  สำคัญ — Group ID (Cxxx) ต้องใช้ endpoint /multicast
       User ID (Uxxx) ใช้ /push ได้ปกติ
       Worker นี้ตรวจสอบ prefix แล้วเลือก endpoint อัตโนมัติ

   แก้ ALLOWED_ORIGIN ให้ตรงกับ GitHub Pages URL ของคุณ
   ============================================================ */

export default {
  async fetch(request, env) {

    // ✅ ไม่มี trailing slash
    const ALLOWED_ORIGIN = 'https://chaiwutz14.github.io';

    const corsHeaders = {
      'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // POST only
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    /* --------------------------------------------------------
       Rate Limiting (optional — ต้องสร้าง KV binding ชื่อ RATE_LIMIT)
       -------------------------------------------------------- */
    if (env.RATE_LIMIT) {
      const ip  = request.headers.get('CF-Connecting-IP') || 'unknown';
      const key = `ratelimit:${ip}`;
      if (await env.RATE_LIMIT.get(key)) {
        return new Response(
          JSON.stringify({ error: 'Rate limit: wait 30 seconds' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      await env.RATE_LIMIT.put(key, '1', { expirationTtl: 30 });
    }

    /* --------------------------------------------------------
       Parse + Validate body
       -------------------------------------------------------- */
    let body;
    try { body = await request.json(); }
    catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { name, category, message, date, source, type = 'comment' } = body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Missing or empty field: message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize
    const safeName     = String(name     || 'ไม่ระบุตัวตน').trim().slice(0, 60);
    const safeCategory = String(category || 'ทั่วไป').trim().slice(0, 50);
    const safeMessage  = String(message).trim().slice(0, 500);
    const safeDate     = String(date     || new Date().toLocaleDateString('th-TH')).trim().slice(0, 30);
    const safeSource   = String(source   || 'โรงเรียนเทศบาลจุ่งฮั่ว').trim().slice(0, 60);
    const safeType     = String(type).trim();

    /* --------------------------------------------------------
       เลือก Header config ตาม type ของ notification
       -------------------------------------------------------- */
    const typeConfig = {
      comment:      { emoji: '💬', label: 'ความคิดเห็นใหม่',    color: '#0a1628' },
      activity:     { emoji: '📅', label: 'กิจกรรมใหม่',         color: '#143d2a' },
      budget:       { emoji: '💰', label: 'งบประมาณใหม่',         color: '#1a3a5c' },
      announcement: { emoji: '📢', label: 'ประกาศใหม่',           color: '#6b1818' },
    };
    const cfg = typeConfig[safeType] || typeConfig.comment;

    /* --------------------------------------------------------
       Flex Message
       -------------------------------------------------------- */
    const flexMessage = {
      type:     'flex',
      altText:  `${cfg.emoji} ${cfg.label} — HONEST HUB: ${safeMessage.slice(0, 50)}`,
      contents: {
        type: 'bubble',
        size: 'kilo',

        header: {
          type:            'box',
          layout:          'vertical',
          backgroundColor: cfg.color,
          paddingAll:      '16px',
          contents: [{
            type:   'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: cfg.emoji, size: 'xl', flex: 0, margin: 'none' },
              {
                type: 'box', layout: 'vertical', margin: 'md',
                contents: [
                  { type: 'text', text: cfg.label,    color: '#c9a84c', size: 'sm', weight: 'bold' },
                  { type: 'text', text: 'HONEST HUB', color: '#ffffff', size: 'xs', margin: 'xs' },
                ],
              },
            ],
          }],
        },

        body: {
          type:       'box',
          layout:     'vertical',
          spacing:    'md',
          paddingAll: '16px',
          contents: [
            // ชื่อ
            {
              type: 'box', layout: 'horizontal',
              contents: [
                { type: 'text', text: '👤 ชื่อ',   color: '#6b7280', size: 'xs', flex: 2, weight: 'bold' },
                { type: 'text', text: safeName,     color: '#0a1628', size: 'xs', flex: 5, wrap: true, weight: 'bold' },
              ],
            },
            // หมวด
            {
              type: 'box', layout: 'horizontal',
              contents: [
                { type: 'text', text: '🏷️ หมวด',   color: '#6b7280', size: 'xs', flex: 2, weight: 'bold' },
                { type: 'text', text: safeCategory, color: '#1a4a8a', size: 'xs', flex: 5 },
              ],
            },
            // วันที่
            {
              type: 'box', layout: 'horizontal',
              contents: [
                { type: 'text', text: '📅 วันที่',  color: '#6b7280', size: 'xs', flex: 2, weight: 'bold' },
                { type: 'text', text: safeDate,      color: '#6b7280', size: 'xs', flex: 5 },
              ],
            },
            // separator
            { type: 'separator', margin: 'md', color: '#e5e7eb' },
            // label
            { type: 'text', text: `${cfg.emoji} รายละเอียด`, color: '#6b7280', size: 'xs', weight: 'bold', margin: 'md' },
            // content box
            {
              type: 'box', layout: 'vertical',
              backgroundColor: '#f8f7f4', cornerRadius: '8px', paddingAll: '12px',
              contents: [{
                type: 'text', text: safeMessage,
                color: '#1a1f2e', size: 'sm', wrap: true, lineSpacing: '6px',
              }],
            },
          ],
        },

        footer: {
          type: 'box', layout: 'vertical',
          backgroundColor: '#f4f3f0', paddingAll: '10px',
          contents: [{
            type: 'text', text: `📍 ${safeSource}`,
            color: '#9ca3af', size: 'xxs', align: 'center',
          }],
        },

        styles: {
          header: { separator: false },
          footer: { separator: true },
        },
      },
    };

    /* --------------------------------------------------------
       เลือก LINE API endpoint อัตโนมัติตาม Target ID prefix

       User ID   (Uxxx) → /v2/bot/message/push
       Group ID  (Cxxx) → /v2/bot/message/multicast  (รองรับ group)
       Room ID   (Rxxx) → /v2/bot/message/multicast

       ถ้ามี LINE_TARGET_IDS (หลายคน คั่น comma) → multicast
       -------------------------------------------------------- */

    // รองรับหลาย target คั่นด้วย comma
    const rawTargets = env.LINE_TARGET_IDS || env.LINE_TARGET_ID || '';
    const targets    = rawTargets.split(',').map(t => t.trim()).filter(Boolean);

    if (targets.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No LINE_TARGET_ID configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ตรวจสอบว่าต้องใช้ push หรือ multicast
    // push = User ID เดียว (Uxxx)
    // multicast = Group (Cxxx), Room (Rxxx), หรือหลาย User
    const needsMulticast = targets.length > 1
      || targets[0].startsWith('C')
      || targets[0].startsWith('R');

    let lineEndpoint;
    let lineBody;

    if (needsMulticast) {
      // multicast — ส่งหลาย target หรือ Group/Room
      lineEndpoint = 'https://api.line.me/v2/bot/message/multicast';
      lineBody     = {
        to:       targets,
        messages: [flexMessage],
        notificationDisabled: false,
      };
    } else {
      // push — User ID เดียว
      lineEndpoint = 'https://api.line.me/v2/bot/message/push';
      lineBody     = {
        to:       targets[0],
        messages: [flexMessage],
        notificationDisabled: false,
      };
    }

    /* --------------------------------------------------------
       ส่งไป LINE API
       -------------------------------------------------------- */
    const lineRes = await fetch(lineEndpoint, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${env.LINE_CHANNEL_TOKEN}`,
      },
      body: JSON.stringify(lineBody),
    });

    const lineText = await lineRes.text();

    if (!lineRes.ok) {
      console.error(`LINE API ${lineRes.status}:`, lineText);
      return new Response(
        JSON.stringify({
          error:   'LINE API error',
          status:  lineRes.status,
          detail:  lineText,
          endpoint: lineEndpoint,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, endpoint: lineEndpoint, targets: targets.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  },
};
