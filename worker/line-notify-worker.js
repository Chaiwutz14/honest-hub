/* ============================================================
   line-notify-worker.js — Cloudflare Worker v3.0
   LINE Messaging API — Flex Message (การ์ดสวยงาม)
   ============================================================

   Environment Variables (Settings → Variables → Encrypt ทั้งคู่):
   - LINE_CHANNEL_TOKEN  : Channel Access Token
   - LINE_TARGET_ID      : User ID (Uxxxxxxx) หรือ Group ID (Cxxxxxxx)

   แก้ ALLOWED_ORIGIN ให้ตรงกับ URL เว็บจริงก่อน Deploy
   ============================================================ */

export default {
  async fetch(request, env) {

    const ALLOWED_ORIGIN = 'https://chaiwutz14.github.io';

    const corsHeaders = {
      'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    /* --------------------------------------------------------
       Rate Limiting (ต้องสร้าง KV binding ชื่อ RATE_LIMIT)
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
       Parse + Validate
       -------------------------------------------------------- */
    let body;
    try { body = await request.json(); }
    catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { name, category, message, date, source } = body;
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing field: message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize
    const safeName     = String(name     || 'ไม่ระบุตัวตน').trim().slice(0, 60);
    const safeCategory = String(category || 'ทั่วไป').trim().slice(0, 50);
    const safeMessage  = String(message).trim().slice(0, 500);
    const safeDate     = String(date     || new Date().toLocaleDateString('th-TH')).trim().slice(0, 30);

    /* --------------------------------------------------------
       Flex Message — การ์ดสวยงามพร้อมข้อมูลครบถ้วน
       โครงสร้าง:
         HEADER  — แถบสีน้ำเงิน "ความคิดเห็นใหม่"
         BODY    — ชื่อ / หมวดหมู่ / วันที่ / ข้อความ
         FOOTER  — แหล่งที่มา
       -------------------------------------------------------- */
    const flexMessage = {
      type: 'flex',
      altText: `📬 ความคิดเห็นใหม่จาก ${safeName} — HONEST HUB`,
      contents: {
        type: 'bubble',
        size: 'kilo',

        // ===== HEADER =====
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#0a1628',
          paddingAll: '16px',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '📬',
                  size: 'xl',
                  flex: 0,
                  margin: 'none',
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  margin: 'md',
                  contents: [
                    {
                      type: 'text',
                      text: 'ความคิดเห็นใหม่',
                      color: '#c9a84c',
                      size: 'sm',
                      weight: 'bold',
                      letterSpacing: '1px',
                    },
                    {
                      type: 'text',
                      text: 'HONEST HUB',
                      color: '#ffffff',
                      size: 'xs',
                      margin: 'xs',
                    },
                  ],
                },
              ],
            },
          ],
        },

        // ===== BODY =====
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          paddingAll: '16px',
          contents: [

            // ชื่อผู้ส่ง
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '👤 ชื่อ',
                  color: '#6b7280',
                  size: 'xs',
                  flex: 2,
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: safeName,
                  color: '#0a1628',
                  size: 'xs',
                  flex: 5,
                  wrap: true,
                  weight: 'bold',
                },
              ],
            },

            // หมวดหมู่
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '🏷️ หมวด',
                  color: '#6b7280',
                  size: 'xs',
                  flex: 2,
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: safeCategory,
                  color: '#1a4a8a',
                  size: 'xs',
                  flex: 5,
                },
              ],
            },

            // วันที่
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '📅 วันที่',
                  color: '#6b7280',
                  size: 'xs',
                  flex: 2,
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: safeDate,
                  color: '#6b7280',
                  size: 'xs',
                  flex: 5,
                },
              ],
            },

            // เส้นคั่น
            { type: 'separator', margin: 'md', color: '#e5e7eb' },

            // ความคิดเห็น (label)
            {
              type: 'text',
              text: '💬 ความคิดเห็น',
              color: '#6b7280',
              size: 'xs',
              weight: 'bold',
              margin: 'md',
            },

            // ความคิดเห็น (เนื้อหา)
            {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#f8f7f4',
              cornerRadius: '8px',
              paddingAll: '12px',
              contents: [
                {
                  type: 'text',
                  text: safeMessage,
                  color: '#1a1f2e',
                  size: 'sm',
                  wrap: true,
                  lineSpacing: '6px',
                },
              ],
            },
          ],
        },

        // ===== FOOTER =====
        footer: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#f4f3f0',
          paddingAll: '10px',
          contents: [
            {
              type: 'text',
              text: `📍 ${source || 'โรงเรียนเทศบาลจุ่งฮั่ว จังหวัดพัทลุง'}`,
              color: '#9ca3af',
              size: 'xxs',
              align: 'center',
            },
          ],
        },

        // สไตล์กรอบการ์ด
        styles: {
          header: { separator: false },
          footer: { separator: true },
        },
      },
    };

    /* --------------------------------------------------------
       ส่งไปยัง LINE Messaging API — Push Message
       -------------------------------------------------------- */
    const linePayload = {
      to:       env.LINE_TARGET_ID,
      messages: [flexMessage],
      notificationDisabled: false,
    };

    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${env.LINE_CHANNEL_TOKEN}`,
      },
      body: JSON.stringify(linePayload),
    });

    if (!lineRes.ok) {
      const errText = await lineRes.text();
      console.error('LINE API error:', lineRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'LINE API error', status: lineRes.status }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  },
};
