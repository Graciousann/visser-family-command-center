function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

function authorized(request, env) {
  const supplied = request.headers.get('X-Household-Code') || '';
  return Boolean(env.HOUSEHOLD_TOKEN) && supplied === env.HOUSEHOLD_TOKEN;
}

export async function onRequestGet({ request, env }) {
  if (!authorized(request, env)) return json({ error: 'Unauthorized' }, 401);
  const row = await env.DB.prepare('SELECT payload, updated_at FROM household_state WHERE id = ?').bind('visser').first();
  if (!row) return json({ state: null });
  return json({ state: JSON.parse(row.payload), updatedAt: row.updated_at });
}

export async function onRequestPut({ request, env }) {
  if (!authorized(request, env)) return json({ error: 'Unauthorized' }, 401);
  const body = await request.json().catch(() => null);
  if (!body?.state || typeof body.state !== 'object') return json({ error: 'Invalid state' }, 400);
  const payload = JSON.stringify(body.state);
  if (payload.length > 500000) return json({ error: 'State too large' }, 413);
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO household_state (id, payload, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`)
    .bind('visser', payload, now).run();
  return json({ ok: true, updatedAt: now });
}
