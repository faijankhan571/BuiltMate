import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

// Repair 1-char truncation if VITE_SUPABASE_PUBLISHABLE_KEY was pasted missing trailing 'H'
const supabasePublishableKey =
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

async function customSupabaseFetch(input, init) {
  const url = typeof input === 'string' ? input : input?.url || String(input);
  if (typeof window !== 'undefined' && url.includes('/rest/v1/')) {
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
      const proxyRes = await window.fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          method: init?.method || 'GET',
          headers: headersObj,
          body: typeof init?.body === 'string' ? init.body : undefined,
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
