import { cp, mkdir, rm } from 'node:fs/promises';
const files=['index.html','manifest.webmanifest','sw.js','vercel.json','src','assets'];
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const file of files) await cp(file,`dist/${file}`,{recursive:true});
console.log('Build statique AZIZ v1.2.0 prêt dans dist/.');
