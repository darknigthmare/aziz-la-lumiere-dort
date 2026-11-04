import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('le build vérifie un artefact autonome limité aux fichiers publics',async()=>{
  const root=fileURLToPath(new URL('../',import.meta.url));
  const result=spawnSync(process.execPath,['scripts-build.mjs'],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/ressources, aucun fichier privé/);
  assert.deepEqual((await readdir(new URL('../dist/',import.meta.url))).sort(),['assets','index.html','manifest.webmanifest','src','sw.js']);
  for(const path of ['index.html','src/game.js','src/mechanics.js','src/data.js','src/styles.css','sw.js']){
    const source=await readFile(new URL(`../${path}`,import.meta.url));
    const built=await readFile(new URL(`../dist/${path}`,import.meta.url));
    assert.deepEqual(built,source,`Le fichier publié diffère : ${path}`);
  }
});
