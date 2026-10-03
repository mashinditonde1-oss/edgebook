const CACHE_PREFIX='edgebook-shell-'+new URL(self.registration.scope).pathname;
const CACHE_NAME=CACHE_PREFIX+'v1';
const SHELL=['./betting-journal.html','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/apple-touch-icon.png','./icons/icon.svg'].map(path=>new URL(path,self.registration.scope).href);
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 // Cloud reads and writes are always sent to the network, never cached.
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 const path=url.pathname.slice(new URL(self.registration.scope).pathname.length);
 const navigation=request.mode==='navigate'&&['','index.html','betting-journal.html'].includes(path);
 if(navigation){
  event.respondWith((async()=>{
   const cache=await caches.open(CACHE_NAME);
   try{
    const response=await fetch(request);
    if(response.ok&&path==='betting-journal.html')await cache.put(new URL('./betting-journal.html',self.registration.scope).href,response.clone());
    return response;
   }catch{
    const shell=await cache.match(new URL('./betting-journal.html',self.registration.scope).href);
    return shell||Response.error();
   }
  })());
 }else if(SHELL.includes(url.href)){
  event.respondWith(caches.open(CACHE_NAME).then(async cache=>{
   const hit=await cache.match(request);
   if(hit)return hit;
   const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;
  }));
 }
});
