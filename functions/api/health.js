function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
  });
}
export async function onRequestGet({env}){
  const result={ok:true,dbBound:Boolean(env.DB),databaseReady:false,authConfigured:false};
  if(!env.DB)return json(result);
  try{
    const table=await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='household_state'"
    ).first();
    result.databaseReady=Boolean(table?.name==='household_state');
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS household_config (
        id TEXT PRIMARY KEY,
        code_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `).run();
    const auth=await env.DB.prepare(
      'SELECT code_hash FROM household_config WHERE id = ?'
    ).bind('visser').first();
    result.authConfigured=Boolean(auth?.code_hash);
  }catch(error){
    result.databaseError=error instanceof Error?error.message:String(error);
  }
  return json(result);
}