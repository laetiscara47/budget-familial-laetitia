"use strict";

const $ = id => document.getElementById(id);
const euro = value => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(Number(value||0));
function animateNumber(id,value){
  const element=$(id);
  if(!element)return;
  const end=Number(value||0);
  const start=Number(element.dataset.value||0);
  const duration=240;
  const begin=performance.now();
   function frame(now){
    const progress=Math.min(1,(now-begin)/duration);
    const eased=1-Math.pow(1-progress,3);
    const current=start+(end-start)*eased;
    element.textContent=euro(current);
    if(progress<1){
      requestAnimationFrame(frame);
    }else{
      element.textContent=euro(end);
      element.dataset.value=String(end);
    }
  }
  requestAnimationFrame(frame);
}
 const today = () => new Date().toISOString().slice(0,10);
const monthKey = date => String(date).slice(0,7);
const money = value => Number(String(value||"").replace(/\s/g,"").replace(",", ".")) || 0;
const clone = value => JSON.parse(JSON.stringify(value));
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
 async function cleanOldApplicationCaches(){
  try{
    if("serviceWorker" in navigator){
      const registrations=await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration=>registration.unregister()));
    }
    if("caches" in window){
      const names=await caches.keys();
      await Promise.all(names.map(name=>caches.delete(name)));
    }
    localStorage.setItem("mon_budget_cache_cleaned_10_2","yes");
  }catch(error){
    console.warn("Nettoyage du cache non bloquant",error);
  }
}

window.MonBudgetUtils = Object.freeze({
  $,
  euro,
  animateNumber,
  today,
  monthKey,
  money,
  clone,
  uid
});
