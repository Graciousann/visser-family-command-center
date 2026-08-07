function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function normalize(value) {
  const raw = String(value || '').trim();
  try { return decodeURIComponent(raw); } catch { return raw; }
}

function authorized(request, env) {
  const supplied = normalize(request.headers.get('X-Household-Code'));
  const expected = String(env.HOUSEHOLD_TOKEN || '').trim();
  return Boolean(expected) && supplied === expected;
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'DB binding missing' }, 503);
  if (!String(env.HOUSEHOLD_TOKEN || '').trim()) return json({ error: 'HOUSEHOLD_TOKEN missing' }, 503);
  if (!authorized(request, env)) return json({ error: 'Unauthorized: family code does not match' }, 401);
  try {
    const row = await env.DB.prepare('SELECT payload, updated_at FROM household_state WHERE id = ?').bind('visser').first();
    if (!row) return json({ state: null });
    return json({ state: JSON.parse(row.payload), updatedAt: row.updated_at });
  } catch (error) {
    return json({ error: `Database read failed: ${error instanceof Error ? error.message : String(error)}` }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  if (!env.DB) return json({ error: 'DB binding missing' }, 503);
  if (!String(env.HOUSEHOLD_TOKEN || '').trim()) return json({ error: 'HOUSEHOLD_TOKEN missing' }, 503);
  if (!authorized(request, env)) return json({ error: 'Unauthorized: family code does not match' }, 401);
  try {
    const body = await request.json().catch(() => null);
    if (!body?.state || typeof body.state !== 'object') return json({ error: 'Invalid state' }, 400);
    const payload = JSON.stringify(body.state);
    if (payload.length > 500000) return json({ error: 'State too large' }, 413);
    const now = new Date().toISOString();
    await env.DB.prepare(`INSERT INTO household_state (id, payload, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`)
      .bind('visser', payload, now).run();
    return json({ ok: true, updatedAt: now });
  } catch (error) {
    return json({ error: `Database write failed: ${error instanceof Error ? error.message : String(error)}` }, 500);
  }
}
