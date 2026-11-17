import { createClient } from '@supabase/supabase-js';

const metaEnv = (typeof import.meta !== 'undefined' && import.meta.env) || {};

const rawUrl = (
  metaEnv.VITE_SUPABASE_URL || 'https://uznmqmvafuyyzgshsogx.supabase.co'
).trim();
const rawKey = (
  metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable__A2zXL397Egt6QGqJB1NfQ_GdSEkigH'
).trim();

// Repair 1-char truncation if VITE_SUPABASE_PUBLISHABLE_KEY was pasted missing trailing 'H'
export const supabasePublishableKey =
  rawKey.startsWith('sb_publishable__A2zXL397Egt6QGqJB1NfQ_GdSEkig') &&
  rawKey.endsWith('fQ_GdSEkig')
    ? `${rawKey}H`
    : rawKey;

export const supabaseUrl = rawUrl;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabasePublishableKey &&
    !supabaseUrl.includes('your-project-id') &&
    supabaseUrl.startsWith('http')
);

async function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function bodyToBase64AndContentType(body) {
  if (!body) return { bodyBase64: undefined, detectedContentType: undefined };
  if (typeof body.arrayBuffer === 'function') {
    const buf = await body.arrayBuffer();
    return {
      bodyBase64: await arrayBufferToBase64(buf),
      detectedContentType: body.type || undefined,
    };
  }
  if (body instanceof ArrayBuffer) {
    return {
      bodyBase64: await arrayBufferToBase64(body),
      detectedContentType: undefined,
    };
  }
  if (ArrayBuffer.isView(body)) {
    return {
      bodyBase64: await arrayBufferToBase64(
        body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)
      ),
      detectedContentType: undefined,
    };
  }
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    for (const [, value] of body.entries()) {
      if (value && typeof value === 'object' && typeof value.arrayBuffer === 'function') {
        const buf = await value.arrayBuffer();
        return {
          bodyBase64: await arrayBufferToBase64(buf),
          detectedContentType: value.type || 'image/jpeg',
        };
      }
    }
  }
  return { bodyBase64: undefined, detectedContentType: undefined };
}

async function customSupabaseFetch(input, init) {
  const url = typeof input === 'string' ? input : input?.url || String(input);
  if (
    typeof window !== 'undefined' &&
    (url.includes('/rest/v1/') || url.includes('/storage/v1/'))
  ) {
    try {
      const headersObj = {};
      if (init?.headers) {
        if (typeof init.headers.forEach === 'function') {
          init.headers.forEach((v, k) => {
            headersObj[k] = v;
          });
        } else if (Array.isArray(init.headers)) {
          for (const [k, v] of init.headers) headersObj[k] = v;
        } else {
          Object.assign(headersObj, init.headers);
        }
      }
      let bodyStr = typeof init?.body === 'string' ? init.body : undefined;
      let bodyBase64 = undefined;
      if (!bodyStr && init?.body) {
        const converted = await bodyToBase64AndContentType(init.body);
        bodyBase64 = converted.bodyBase64;
        if (
          converted.detectedContentType &&
          (!headersObj['content-type'] ||
            String(headersObj['content-type']).includes('multipart/form-data'))
        ) {
          headersObj['content-type'] = converted.detectedContentType;
        }
      }
      const proxyRes = await window.fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          method: init?.method || 'GET',
          headers: headersObj,
          body: bodyStr,
          bodyBase64,
        }),
      });
      if (proxyRes.ok) {
        const payload = await proxyRes.json();
        return new Response(payload.body ?? '', {
          status: payload.status || 200,
          headers: payload.headers || { 'content-type': 'application/json' },
        });
      }
    } catch {
      // Fallback to native fetch if proxy is unavailable
    }
  }
  return fetch(input, init);
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      global: {
        fetch: customSupabaseFetch,
      },
    })
  : null;
