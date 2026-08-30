import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../src/data.js',import.meta.url),'utf8');
const context={};vm.createContext(context);vm.runInContext(source,context);
const data=context.AZIZ_DATA;

function reachableKeys(chapter){
  const start=[Math.floor(chapter.start.x),Math.floor(chapter.start.y)],queue=[start],seen=new Set();
  while(queue.length){
    const [x,y]=queue.shift(),key=`${x}:${y}`;
    if(seen.has(key)||x<0||y<0||x>=chapter.w||y>=chapter.h||chapter.grid[y][x]!==0)continue;
    seen.add(key);queue.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
  }
  return seen;
}

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
    const reachable=reachableKeys(chapter);
    assert.equal(chapter.grid.length,chapter.h);
    assert.ok(chapter.grid.every(row=>row.length===chapter.w));
    assert.equal(chapter.grid[Math.floor(chapter.start.y)][Math.floor(chapter.start.x)],0);
    assert.equal(chapter.grid[Math.floor(chapter.exit.y)][Math.floor(chapter.exit.x)],0);
    assert.equal(chapter.objects.filter(o=>o.type===chapter.kind).length,chapter.target);
    for(const thing of [...chapter.objects,...chapter.enemies]){
      assert.ok(thing.x>0&&thing.x<chapter.w-1&&thing.y>0&&thing.y<chapter.h-1);
      assert.equal(chapter.grid[Math.floor(thing.y)][Math.floor(thing.x)],0);
      assert.ok(!ids.has(thing.id),`id dupliqué: ${thing.id}`);ids.add(thing.id);
      assert.ok(reachable.has(`${Math.floor(thing.x)}:${Math.floor(thing.y)}`),`entité inaccessible: ${thing.id}`);
    }
    assert.ok(reachable.has(`${Math.floor(chapter.exit.x)}:${Math.floor(chapter.exit.y)}`),`sortie inaccessible: ${chapter.id}`);
  }
});

test('chaque chapitre possède trois archives et une sortie',()=>{
  for(let i=0;i<6;i++)assert.equal(data.ARCHIVES.filter(a=>a.chapter===i).length,3);
  assert.ok(data.CHAPTERS.every(c=>Number.isFinite(c.exit.x)&&Number.isFinite(c.exit.y)));
});

test('les six chapitres possèdent une règle d’énigme sérialisable',()=>{
  assert.deepEqual(Array.from(data.CHAPTERS,chapter=>chapter.mechanic),['channel','align','sequence','response','sequence','align']);
  for(const chapter of data.CHAPTERS){
    assert.equal(chapter.objects.filter(object=>object.type===chapter.kind).length,chapter.target);
    assert.ok(chapter.hint.length>30);
    for(const objective of chapter.objects.filter(object=>object.type===chapter.kind)){
      assert.ok(Number.isInteger(objective.sequenceSlot));
      assert.ok(Number.isInteger(objective.orientation));
      assert.ok(Number.isInteger(objective.targetOrientation));
    }
  }
  assert.deepEqual(Array.from(data.CHAPTERS[4].sequence),[0,2,4,1,3]);
});
