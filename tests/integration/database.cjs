/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { createHash, randomBytes, scryptSync } = require('node:crypto');
const { mkdtempSync, readFileSync, writeFileSync } = require('node:fs');
const net = require('node:net');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { PGlite } = require('@electric-sql/pglite');
const { PGLiteSocketServer } = require('@electric-sql/pglite-socket');

async function main() {
  const db = await PGlite.create();
  const freePort=()=>new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});
  const dbPort=await freePort(),appPort=await freePort();
  const socket = new PGLiteSocketServer({db,host:'127.0.0.1',port:dbPort});
  const files=['tsconfig.json','next-env.d.ts'].map(name=>({name,original:readFileSync(name,'utf8'),generated:null}));
  let app;
  try {
    await socket.start();
    const salt = randomBytes(16).toString('hex');
    const env = {...process.env,DATABASE_URL:`postgresql://postgres:postgres@127.0.0.1:${dbPort}/postgres?sslmode=disable&pgbouncer=true&connection_limit=1`,EMS_READING_SOURCE:'csv-import',EMS_USERNAME:'test-admin',EMS_INITIAL_PASSWORD_HASH:`${salt}:${scryptSync('test-password-123',salt,64).toString('hex')}`,EMS_ACCOUNT_DATA_DIR:mkdtempSync(path.join(tmpdir(),'ems-db-account-')),EMS_DEMO_DATA_DIR:mkdtempSync(path.join(tmpdir(),'ems-db-workflow-')),NEXT_DIST_DIR:'.next-db-test'};
    const run = (script,args) => new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,[script,...args],{env,stdio:'inherit'});
      child.once('error',reject);
      child.once('exit',code=>code===0?resolve():reject(new Error(`Command failed: ${script} (${code})`)));
    });
    await run(require.resolve('prisma/build/index.js'),['migrate','deploy']);
    await run(path.join(process.cwd(),'prisma','seed.cjs'),[]);
    app=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--port',String(appPort)],{env,stdio:'inherit'});
    const base=`http://127.0.0.1:${appPort}`;
    let ready=false;
    for(let i=0;i<90;i++){
      if(app.exitCode!==null) throw new Error('Test server stopped before becoming ready');
      try {await fetch(`${base}/api/v1/account`);ready=true;break;} catch {await new Promise(resolve=>setTimeout(resolve,1000));}
    }
    if(!ready)throw new Error('Test server did not start');
    for(const file of files)file.generated=readFileSync(file.name,'utf8');
    const login=await fetch(`${base}/api/v1/account`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'test-admin',password:'test-password-123'})});
    assert.equal(login.status,200);
    const cookie=login.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
    const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const csv=`date,value\n${date},123.5`;
    const send=async(action,text=csv)=>fetch(`${base}/api/v1/energy/import`,{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify({action,csv:text})});
    const preview=await send('preview');assert.equal(preview.status,200);assert.equal((await preview.json()).valid,1);
    const imported=await send('import');assert.equal(imported.status,200);const first=await imported.json();assert.equal(first.imported,1);assert.equal(first.duplicates,0);
    const repeated=await send('import');assert.equal(repeated.status,200);const second=await repeated.json();assert.equal(second.imported,0);assert.equal(second.duplicates,1);
    const invalid=await send('import',`date,value\n${date},-1`);assert.equal(invalid.status,400);
    const energy=await fetch(`${base}/api/v1/energy`,{headers:{cookie}});assert.equal(energy.status,200);const data=await energy.json();assert.ok(data.readings.some(row=>row.date===date&&row.value===123.5&&row.siteId==='pyeongtaek'));
    const batches=await db.query('SELECT * FROM "ImportBatch" ORDER BY "receivedAt"');
    const batch=batches.rows.find(item=>item.id===first.batchId);
    const duplicate=batches.rows.find(item=>item.id===second.batchId);
    assert.ok(batch);assert.ok(duplicate);
    assert.equal(batch.sha256,createHash('sha256').update(csv,'utf8').digest('hex'));assert.equal(batch.actor,'test-admin');assert.equal(batch.importedRows,1);
    const readings=await db.query('SELECT * FROM "MeterReading" WHERE "importBatchId" = $1',[first.batchId]);assert.equal(readings.rows.length,1);
    assert.equal(duplicate.duplicateRows,1);assert.equal(batches.rows.length,2);
    console.log('Database integration passed: migrations, seed, preview, import, duplicates, rejection, reading and lineage.');
  } finally {
    if(app){app.kill();await new Promise(resolve=>{if(app.exitCode!==null)resolve();else app.once('exit',resolve);});}
    for(const file of files){if(file.generated!==null&&readFileSync(file.name,'utf8')===file.generated&&file.generated!==file.original)writeFileSync(file.name,file.original);}
    await socket.stop();await db.close();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
