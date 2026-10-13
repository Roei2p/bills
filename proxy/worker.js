// Private proxy between the bills app and NVIDIA's API.
// The NVIDIA key lives only here, as a Worker secret. Callers must come from an
// allowed origin AND send the private access code, so strangers can't use it.
//
// Secrets (set with `npx wrangler secret put <NAME>`):
//   NVIDIA_API_KEY  - nvapi-...
//   ACCESS_CODE     - a long random password you share only with your family
// Vars (wrangler.toml):
//   ALLOWED_ORIGINS - comma-separated, e.g. https://roei2p.github.io

const UPSTREAM = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODELS = ['meta/llama-3.2-90b-vision-instruct', 'meta/llama-3.2-11b-vision-instruct'];
const MAX_BODY = 4 * 1024 * 1024;
const MAX_TOKENS = 2048;

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-access-code',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(status, body, headers) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
}

async function sameSecret(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const u = new Uint8Array(x), v = new Uint8Array(y);
  let d = 0;
  for (let i = 0; i < u.length; i++) d |= u[i] ^ v[i];
  return d === 0;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!allowed.includes(origin)) return json(403, { error: 'origin_not_allowed' });
    const h = cors(origin);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/v1/chat/completions') return json(404, { error: 'not_found' }, h);
    if (!env.NVIDIA_API_KEY || !env.ACCESS_CODE) return json(500, { error: 'proxy_not_configured' }, h);
    if (!(await sameSecret(request.headers.get('x-access-code') || '', env.ACCESS_CODE))) return json(401, { error: 'bad_access_code' }, h);

    const len = Number(request.headers.get('content-length') || 0);
    if (len > MAX_BODY) return json(413, { error: 'too_large' }, h);
    const raw = await request.text();
    if (raw.length > MAX_BODY) return json(413, { error: 'too_large' }, h);
    let body;
    try { body = JSON.parse(raw); } catch { return json(400, { error: 'bad_json' }, h); }
    if (!MODELS.includes(body.model)) return json(400, { error: 'model_not_allowed' }, h);

    // Forward only the fields the app uses.
    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'accept': 'application/json', 'authorization': 'Bearer ' + env.NVIDIA_API_KEY },
      body: JSON.stringify({
        model: body.model,
        messages: body.messages,
        max_tokens: Math.min(Number(body.max_tokens) || 1024, MAX_TOKENS),
        temperature: typeof body.temperature === 'number' ? body.temperature : 0.1,
        stream: false
      })
    });
    return new Response(upstream.body, { status: upstream.status, headers: { 'content-type': upstream.headers.get('content-type') || 'application/json', ...h } });
  }
};
