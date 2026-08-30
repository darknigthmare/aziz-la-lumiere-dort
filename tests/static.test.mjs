import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');

test('JavaScript valide',()=>{
  for(const file of ['src/data.js','src/game.js','sw.js','server.mjs','scripts-build.mjs']){
    const r=spawnSync(process.execPath,['--check',fileURLToPath(new URL(file,root))],{encoding:'utf8'});
    assert.equal(r.status,0,`${file}: ${r.stderr}`);
  }
});

test('surface PWA et contrôles complets',async()=>{
  const [html,game,manifest,sw]=await Promise.all([read('index.html'),read('src/game.js'),read('manifest.webmanifest'),read('sw.js')]);
  assert.match(html,/AZIZ — LA LUMIÈRE DORT v1\.2\.0/);
  for(const marker of ['game-canvas','touch-controls','wake-meter','ending-overlay','save'])assert.match(html,new RegExp(marker));
  for(const marker of ['KeyW','KeyZ','Gamepad','localStorage','speechSynthesis','Touch:interact','serviceWorker'])assert.match(game,new RegExp(marker));
  assert.equal(JSON.parse(manifest).display,'standalone');
  assert.match(sw,/aziz-shell-v1\.2\.0/);
});

test('provenance honnête et aucun secret publié',async()=>{
  const [provenance,readme,game]=await Promise.all([read('SOURCE_PROVENANCE.md'),read('README.md'),read('src/game.js')]);
  assert.match(provenance,/corps binaire.*n’était présent/is);
  assert.match(provenance,/6f4c4362c5565d47d71fa380d439fcdb671f08fb4490c1d3b312f420938f2a7e/);
  assert.match(readme,/reconstruction fidèle/i);
  for(const text of [provenance,readme,game])assert.doesNotMatch(text,/(ghp_[A-Za-z0-9]{20,}|VERCEL_TOKEN\s*=|sk-[A-Za-z0-9]{20,})/);
});

test('fichiers de production présents',async()=>{
  for(const file of ['index.html','src/styles.css','src/data.js','src/game.js','sw.js','manifest.webmanifest','assets/icon.svg','vercel.json'])await access(new URL(file,root));
});
