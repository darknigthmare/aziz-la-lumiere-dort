import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../sw.js',import.meta.url),'utf8');
test('une mise à jour AZIZ conserve les caches des autres applications',async()=>{
  const handlers={};
  const deleted=[];
  let claimed=false;
  const caches={
    keys:async()=>['autre-application-v1','aziz-shell-v1.2.0-r4','aziz-shell-v1.2.0-r5'],
    delete:async key=>{deleted.push(key);return true;}
  };
  vm.runInNewContext(source,{
    caches,
    self:{addEventListener:(name,handler)=>{handlers[name]=handler;},clients:{claim:async()=>{claimed=true;}}}
  });
  let completion;
  handlers.activate({waitUntil:promise=>{completion=promise;}});
  await completion;
  assert.deepEqual(deleted,['aziz-shell-v1.2.0-r4']);
  assert.equal(claimed,true);
});

test('le worker laisse passer les écritures et les autres origines',()=>{
  const handlers={};
  vm.runInNewContext(source,{
    URL,
    location:{origin:'https://aziz.example'},
    self:{addEventListener:(name,handler)=>{handlers[name]=handler;}}
  });
  let intercepted=0;
  const respondWith=()=>intercepted++;
  handlers.fetch({request:{method:'POST',url:'https://aziz.example/'},respondWith});
  handlers.fetch({request:{method:'GET',url:'https://other.example/'},respondWith});
  assert.equal(intercepted,0);
});
