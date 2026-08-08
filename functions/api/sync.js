function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
  });
}
function normalize(value){
  const raw=String(value||'').trim();
  try{return decodeURIComponent(raw)}catch{return raw}
}
async function sha256Hex(text){
  const data=new TextEncoder().encode(text);
  const digest=await crypto.subtle.digest('SHA-256',data);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function ensureAuthTable(env){
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS household_config (
      id TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `).run();
}
async function authorizeOrInitialize(request,env){
  if(!env.DB) return {ok:false,status:503,error:'DB binding missing'};
  const supplied=normalize(request.headers.get('X-Household-Code'));
  if(!supplied) return {ok:false,status:401,error:'Family code required'};
  await ensureAuthTable(env);
  const hash=await sha256Hex(supplied);
  const row=await env.DB.prepare(
    'SELECT code_hash FROM household_config WHERE id = ?'
  ).bind('visser').first();
  if(!row){
    await env.DB.prepare(
      'INSERT INTO household_config (id, code_hash, created_at) VALUES (?, ?, ?)'
    ).bind('visser',hash,new Date().toISOString()).run();
    return {ok:true,initialized:true};
  }
  if(row.code_hash!==hash) return {ok:false,status:401,error:'Family code does not match'};
  return {ok:true,initialized:false};
}
export async function onRequestGet({request,env}){
  try{
    const auth=await authorizeOrInitialize(request,env);
    if(!auth.ok)return json({error:auth.error},auth.status);
    const row=await env.DB.prepare(
      'SELECT payload, updated_at FROM household_state WHERE id = ?'
    ).bind('visser').first();
    if(!row)return json({state:null,authInitialized:auth.initialized});
    return json({
      state:JSON.parse(row.payload),
      updatedAt:row.updated_at,
      authInitialized:auth.initialized
    });
  }catch(error){
    return json({error:`Database read failed: ${error instanceof Error?error.message:String(error)}`},500);
  }
}
export async function onRequestPut({request,env}){
  try{
    const auth=await authorizeOrInitialize(request,env);
    if(!auth.ok)return json({error:auth.error},auth.status);
    const body=await request.json().catch(()=>null);
    if(!body?.state||typeof body.state!=='object')return json({error:'Invalid state'},400);
    const payload=JSON.stringify(body.state);
    if(payload.length>500000)return json({error:'State too large'},413);
    const now=new Date().toISOString();
    await env.DB.prepare(`
      INSERT INTO household_state (id,payload,updated_at)
      VALUES (?,?,?)
      ON CONFLICT(id) DO UPDATE SET
        payload=excluded.payload,
        updated_at=excluded.updated_at
    `).bind('visser',payload,now).run();
    return json({ok:true,updatedAt:now,authInitialized:auth.initialized});
  }catch(error){
    return json({error:`Database write failed: ${error instanceof Error?error.message:String(error)}`},500);
  }
}