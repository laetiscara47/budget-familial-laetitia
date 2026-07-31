const CURRENT='budget-laetitia-v2-cleanup';
self.addEventListener('install',event=>self.skipWaiting());
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.map(key=>caches.delete(key)));
    await self.registration.unregister();
    const clientsList=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clientsList){
      const url=new URL(client.url);
      url.searchParams.set('v','2.0.0');
      client.navigate(url.toString());
    }
  })());
});
self.addEventListener('fetch',()=>{});
