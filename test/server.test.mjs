import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../bin/server.mjs';
test('loopback server exposes only public assets and permits local telemetry', async () => {
 const server=createServer(); await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const get=(path,host='127.0.0.1:4176')=>new Promise((resolve,reject)=>{http.get({hostname:'127.0.0.1',port:server.address().port,path,headers:{Host:host}},r=>{let body='';r.on('data',c=>body+=c);r.on('end',()=>resolve({status:r.statusCode,headers:r.headers,body}));}).on('error',reject)});
 try {
  const page=await get('/'); assert.equal(page.status,200); assert.match(page.body,/<html/); assert.match(page.headers['content-security-policy'],/http:\/\/127\.0\.0\.1:4177/);
  assert.equal((await get('/','attacker.test')).status,403);
  for(const p of ['/package.json','/.env','/bin/telemetry-server.mjs','/%2e%2e%2fpackage.json','/bad%ZZ']) assert.equal((await get(p)).status,404);
 } finally {await new Promise(r=>server.close(r));}
});
