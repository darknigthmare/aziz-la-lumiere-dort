import { cp, mkdir, rm, readFile, stat, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { prepareRelease } from './scripts-release.mjs';
const release = await prepareRelease({ check: true });
const files=['index.html','manifest.webmanifest','sw.js','src','assets'];
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const file of files) await cp(file,`dist/${file}`,{recursive:true});
const html=await readFile('dist/index.html','utf8');
const manifest=JSON.parse(await readFile('dist/manifest.webmanifest','utf8'));
const localReferences=[...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)].map(match=>match[1]);
const required=[...new Set([...localReferences,...manifest.icons.map(icon=>icon.src.replace(/^\//,'')),'sw.js'])];
for(const path of required){
  assert(!/^(?:https?:|\/\/)|(?:^|\/)\.\.(?:\/|$)/.test(path),`Ressource externe ou chemin interdit : ${path}`);
  const info=await stat(`dist/${path.replace(/^\//,'')}`);
  assert(info.isFile()&&info.size>0,`Ressource absente ou vide : ${path}`);
}
assert.deepEqual((await readdir('dist')).sort(),[...files].sort(),'Le build contient un fichier non public.');
assert.match(html,/AZIZ — LA LUMIÈRE DORT v1\.2\.0/);
assert.equal(manifest.display,'standalone');
console.log(`Build statique AZIZ v1.2.0 vérifié : ${required.length} ressources, aucun fichier privé, dist/ prêt. Révision ${release.revision}.`);
