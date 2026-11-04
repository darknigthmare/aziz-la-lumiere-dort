import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');

test('JavaScript valide',()=>{
  for(const file of ['src/data.js','src/mechanics.js','src/game.js','sw.js','server.mjs','scripts-build.mjs']){
    const r=spawnSync(process.execPath,['--check',fileURLToPath(new URL(file,root))],{encoding:'utf8'});
    assert.equal(r.status,0,`${file}: ${r.stderr}`);
  }
});

test('surface PWA et contrôles complets',async()=>{
  const [html,game,manifest,sw,build]=await Promise.all([read('index.html'),read('src/game.js'),read('manifest.webmanifest'),read('sw.js'),read('scripts-build.mjs')]);
  assert.match(html,/AZIZ — LA LUMIÈRE DORT v1\.2\.0/);
  for(const marker of ['game-canvas','touch-controls','wake-meter','link-meter','ending-overlay','prologue-overlay','Touch:signal','save'])assert.match(html+game,new RegExp(marker));
  for(const marker of ['KeyW','KeyZ','KeyC','gamepadHeld','uiGamepadHeld','localStorage','speechSynthesis','Touch:interact','serviceWorker'])assert.match(game,new RegExp(marker));
  assert.doesNotMatch(html,/user-scalable\s*=\s*no/i);
  assert.equal(JSON.parse(manifest).display,'standalone');
  assert.match(html,/rel="apple-touch-icon"/);
  assert.equal(JSON.parse(manifest).icons.some(icon=>icon.sizes==='512x512'&&icon.purpose.includes('maskable')),true);
  assert.match(sw,/aziz-shell-v1\.2\.0-r5/);
  assert.match(sw,/mechanics\.js/);
  assert.match(sw,/aziz-giza-1926-keyart\.webp/);
  assert.match(sw,/event\.waitUntil\(update/);
  assert.match(html,/property="og:image"[^>]+aziz-giza-1926-social\.jpg/);
  assert.doesNotMatch(build,/files=.*vercel\.json/);
});

test('provenance honnête et aucun secret publié',async()=>{
  const [provenance,readme,game]=await Promise.all([read('SOURCE_PROVENANCE.md'),read('README.md'),read('src/game.js')]);
  assert.match(provenance,/corps binaire.*n’était présent/is);
  assert.match(provenance,/6f4c4362c5565d47d71fa380d439fcdb671f08fb4490c1d3b312f420938f2a7e/);
  assert.match(readme,/reconstruction fidèle/i);
  for(const text of [provenance,readme,game])assert.doesNotMatch(text,/(ghp_[A-Za-z0-9]{20,}|VERCEL_TOKEN\s*=|sk-[A-Za-z0-9]{20,})/);
});

test('fichiers de production présents',async()=>{
  for(const file of ['index.html','src/styles.css','src/data.js','src/mechanics.js','src/game.js','sw.js','manifest.webmanifest','assets/icon.svg','assets/icon-180.png','assets/icon-192.png','assets/icon-512.png','assets/aziz-giza-1926-keyart.webp','assets/aziz-giza-1926-social.jpg','docs/KEY_ART_PROMPT.md','vercel.json'])await access(new URL(file,root));
});

test('chaque succès déclaré possède un déclencheur runtime',async()=>{
  const [dataSource,game]=await Promise.all([read('src/data.js'),read('src/game.js')]);
  const ids=[...dataSource.matchAll(/\['([a-z0-9_-]+)','[^']+','[^']+'\]/g)].map(match=>match[1]).slice(18,34);
  assert.equal(ids.length,16);
  for(const id of ids)assert.match(game,new RegExp(`['"]${id}['"]`),`succès sans déclencheur: ${id}`);
});
