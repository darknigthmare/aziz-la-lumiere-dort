const CACHE='aziz-shell-v1.2.0-r4';
const FILES=['/','/index.html','/src/styles.css','/src/data.js','/src/mechanics.js','/src/game.js','/manifest.webmanifest','/assets/icon.svg','/assets/icon-180.png','/assets/icon-192.png','/assets/icon-512.png','/assets/aziz-giza-1926-keyart.webp'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

async function navigationResponse(request){
  try{
    const response=await fetch(request);
    if(response.ok)await (await caches.open(CACHE)).put(request,response.clone());
    return response;
  }catch{
    return await caches.match(request)||await caches.match('/index.html');
  }
}

async function assetResponse(request,event){
  const cached=await caches.match(request);
  const update=fetch(request).then(async response=>{
    if(response.ok&&new URL(request.url).origin===location.origin)await (await caches.open(CACHE)).put(request,response.clone());
    return response;
  }).catch(()=>null);
  if(cached){
    event.waitUntil(update.then(()=>undefined));
    return cached;
  }
  return await update||new Response('Hors ligne',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
  event.respondWith(event.request.mode==='navigate'?navigationResponse(event.request):assetResponse(event.request,event));
});
