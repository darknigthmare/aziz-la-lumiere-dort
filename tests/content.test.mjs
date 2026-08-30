import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../src/data.js',import.meta.url),'utf8');
const context={};vm.createContext(context);vm.runInContext(source,context);
const data=context.AZIZ_DATA;

test('jalon et contrat de contenu v1.2.0',()=>{
  assert.equal(data.VERSION,'1.2.0');
  assert.equal(data.CHAPTERS.length,6);
  assert.equal(data.totalInteractives,89);
  assert.deepEqual(Array.from(data.CHAPTERS,c=>c.objects.length),[15,15,15,15,15,14]);
  assert.equal(Object.keys(data.THREATS).length,6);
  assert.equal(data.ARCHIVES.length,18);
  assert.equal(data.ACHIEVEMENTS.length,16);
  assert.equal(Object.keys(data.ENDINGS).length,4);
  assert.equal(Object.keys(data.DIFFICULTIES).length,3);
});

test('cartes et entités sont jouables et dans les limites',()=>{
  const ids=new Set();
  for(const chapter of data.CHAPTERS){
    assert.equal(chapter.grid.length,chapter.h);
    assert.ok(chapter.grid.every(row=>row.length===chapter.w));
    assert.equal(chapter.grid[Math.floor(chapter.start.y)][Math.floor(chapter.start.x)],0);
    assert.equal(chapter.grid[Math.floor(chapter.exit.y)][Math.floor(chapter.exit.x)],0);
    assert.equal(chapter.objects.filter(o=>o.type===chapter.kind).length,chapter.target);
    for(const thing of [...chapter.objects,...chapter.enemies]){
      assert.ok(thing.x>0&&thing.x<chapter.w-1&&thing.y>0&&thing.y<chapter.h-1);
      assert.equal(chapter.grid[Math.floor(thing.y)][Math.floor(thing.x)],0);
      assert.ok(!ids.has(thing.id),`id dupliqué: ${thing.id}`);ids.add(thing.id);
    }
  }
});

test('chaque chapitre possède trois archives et une sortie',()=>{
  for(let i=0;i<6;i++)assert.equal(data.ARCHIVES.filter(a=>a.chapter===i).length,3);
  assert.ok(data.CHAPTERS.every(c=>Number.isFinite(c.exit.x)&&Number.isFinite(c.exit.y)));
});
