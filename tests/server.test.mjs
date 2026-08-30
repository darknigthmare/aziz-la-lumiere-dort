import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('le serveur local ne laisse sortir aucun fichier privé',async t=>{
  const port=43000+(process.pid%1000);
  const child=spawn(process.execPath,['server.mjs'],{
    cwd:new URL('../',import.meta.url),
    env:{...process.env,PORT:String(port)},
    stdio:['ignore','pipe','pipe']
  });
  t.after(()=>child.kill());
  const ready=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('serveur local non démarré')),5000);
    child.stdout.on('data',chunk=>{
      if(String(chunk).includes('http://localhost:')){clearTimeout(timer);resolve();}
    });
    child.once('exit',code=>reject(new Error(`serveur arrêté: ${code}`)));
  });
  await ready;
  const base=`http://127.0.0.1:${port}`;
  for(const path of ['/','/src/game.js','/src/mechanics.js','/manifest.webmanifest','/assets/aziz-giza-1926-keyart.webp','/assets/aziz-giza-1926-social.jpg','/assets/icon-192.png']){
    const response=await fetch(base+path);
    assert.equal(response.status,200,path);
    assert.equal(response.headers.get('x-content-type-options'),'nosniff');
    if(path.endsWith('.webp'))assert.equal(response.headers.get('content-type'),'image/webp');
    if(path.endsWith('.jpg'))assert.equal(response.headers.get('content-type'),'image/jpeg');
    if(path.endsWith('.png'))assert.equal(response.headers.get('content-type'),'image/png');
  }
  for(const path of ['/package.json','/.env.local','/vercel.json','/assets/%2e%2e%2fpackage.json','/src/%2e%2e%2f.env.local']){
    const response=await fetch(base+path);
    assert.equal(response.status,404,path);
  }
  const head=await fetch(base+'/index.html',{method:'HEAD'});
  assert.equal(head.status,200);
  assert.equal(await head.text(),'');
  child.kill();
  await once(child,'exit');
});
