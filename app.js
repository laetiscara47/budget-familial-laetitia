(() => {
  "use strict";

  const KEY = "mon_budget_v10_stable";
  const BACKUP_KEY = "mon_budget_v10_backup";
  const HISTORY_KEY = "mon_budget_v2_backup_history";
  const MAX_BACKUPS = 10;
  const DATA_SCHEMA_VERSION = 2;
  const OLD_KEYS = ["mon_budget_v9_premium","mon_budget_v9_backup",
    "mon_budget_v8_foundation","mon_budget_familial_v8","mon_budget_familial_1_0",
    "mon_budget_essentiel_v7","mon_budget_essentiel_v6_5","mon_budget_essentiel_v6",
    "mon_budget_essentiel_v5_2_5","mon_budget_essentiel_v5_2_4","mon_budget_essentiel_v5_2_3",
    "mon_budget_essentiel_v5_2_2","mon_budget_essentiel_v5_2_1","mon_budget_essentiel_v5_2",
    "mon_budget_essentiel_v5_1","mon_budget_essentiel_v5","mon_budget_essentiel_v4",
    "budget_essentiel_v3","budget_essentiel_v2","budget_essentiel_v1"
  ];

  const defaults = {
    version: DATA_SCHEMA_VERSION,
    theme: "light",
    cardDebitDay: 4,
    accounts: [
      {id:"current",name:"Compte courant",type:"current",balance:2697.32,icon:"🏦"},
      {id:"savings",name:"Épargne",type:"savings",balance:0,icon:"💰"},
      {id:"cash",name:"Espèces",type:"cash",balance:0,icon:"💵"},
      {id:"deferred",name:"CB différée",type:"deferred",balance:0,icon:"💳"}
    ],
    operations: [],
    rules: [
      {id:"caf",type:"income",label:"CAF",amount:867.92,day:5,accountId:"current",active:true},
      {id:"eau",type:"expense",label:"Eau de Garonne",amount:64,day:3,accountId:"current",active:true},
      {id:"orange",type:"expense",label:"Orange",amount:28.99,day:6,accountId:"current",active:true}
    ],
    lastSavedAt: null
  };

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


  function parseStore(key){
    try{
      const raw=localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }catch{
      return null;
    }
  }

  function dataChecksum(value){
    try{
      const text=JSON.stringify(value);
      let hash=2166136261;
      for(let i=0;i<text.length;i++){
        hash^=text.charCodeAt(i);
        hash=Math.imul(hash,16777619);
      }
      return (hash>>>0).toString(16);
    }catch{
      return "";
    }
  }

  function isValidDate(value){
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value||"")) &&
      !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
  }

  function validateData(value){
    if(!value || typeof value!=="object")return false;
    if(!Array.isArray(value.accounts) || value.accounts.length===0)return false;
    if(!Array.isArray(value.operations) || !Array.isArray(value.rules))return false;

    const accountIds=new Set();
    for(const item of value.accounts){
      if(!item || typeof item.id!=="string" || !item.id.trim())return false;
      if(accountIds.has(item.id))return false;
      accountIds.add(item.id);
      if(!Number.isFinite(Number(item.balance)))return false;
    }

    for(const op of value.operations){
      if(!op || typeof op.id!=="string" || !op.id)return false;
      if(!["income","expense","transfer"].includes(op.type))return false;
      if(!Number.isFinite(Number(op.amount)) || Number(op.amount)<0)return false;
      if(!isValidDate(op.date))return false;
      if(!accountIds.has(op.accountId))return false;
      if(op.type==="transfer" && !accountIds.has(op.toAccountId))return false;
    }

    for(const rule of value.rules){
      if(!rule || typeof rule.id!=="string" || !rule.id)return false;
      if(!["income","expense"].includes(rule.type))return false;
      if(!Number.isFinite(Number(rule.amount)) || Number(rule.amount)<0)return false;
      const day=Number(rule.day);
      if(!Number.isInteger(day) || day<1 || day>28)return false;
      if(!accountIds.has(rule.accountId))return false;
    }

    return true;
  }

  function readBackupHistory(){
    const history=parseStore(HISTORY_KEY);
    return Array.isArray(history) ? history : [];
  }

  function writeBackupHistory(history){
    localStorage.setItem(HISTORY_KEY,JSON.stringify(history.slice(0,MAX_BACKUPS)));
  }

  function createSnapshot(value,reason="automatic"){
    const safe=normalize(value);
    return {
      savedAt:new Date().toISOString(),
      reason,
      checksum:dataChecksum(safe),
      data:safe
    };
  }

  function pushBackup(value,reason="automatic"){
    try{
      const snapshot=createSnapshot(value,reason);
      if(!validateData(snapshot.data))return false;

      const history=readBackupHistory();
      const duplicate=history[0] && history[0].checksum===snapshot.checksum;
      if(!duplicate){
        history.unshift(snapshot);
        writeBackupHistory(history);
      }

      localStorage.setItem(BACKUP_KEY,JSON.stringify(snapshot));
      return true;
    }catch{
      return false;
    }
  }

  function bestValidBackup(){
    const candidates=[];
    const direct=parseStore(BACKUP_KEY);
    if(direct)candidates.push(direct);
    candidates.push(...readBackupHistory());

    for(const candidate of candidates){
      const candidateData=candidate && candidate.data ? candidate.data : candidate;
      const normalized=normalize(candidateData);
      if(validateData(normalized)){
        return {
          data:normalized,
          savedAt:candidate.savedAt||null,
          source:"backup"
        };
      }
    }
    return null;
  }

  function normalize(old){
    if(!old) return clone(defaults);
    if(Array.isArray(old.accounts)){
      const normalized={
        ...clone(defaults),
        ...old,
        version:DATA_SCHEMA_VERSION,
        accounts:old.accounts.map(a=>({
          ...a,
          id:String(a.id||uid()),
          name:String(a.name||"Compte"),
          type:String(a.type||"other"),
          balance:Number(a.balance)||0,
          icon:a.icon||"💳"
        })),
        operations:Array.isArray(old.operations)?old.operations:[],
        rules:Array.isArray(old.rules)?old.rules:clone(defaults.rules)
      };

      const validAccountIds=new Set(normalized.accounts.map(a=>a.id));
      const fallbackId=normalized.accounts[0]?.id||"current";

      normalized.operations=normalized.operations.map(op=>({
        ...op,
        id:String(op.id||uid()),
        type:["income","expense","transfer"].includes(op.type)?op.type:"expense",
        label:String(op.label||"Opération"),
        amount:Math.max(0,Number(op.amount)||0),
        date:isValidDate(op.date)?op.date:today(),
        category:String(op.category||"Autre"),
        accountId:validAccountIds.has(op.accountId)?op.accountId:fallbackId,
        toAccountId:op.type==="transfer"&&validAccountIds.has(op.toAccountId)?op.toAccountId:null,
        recurringKey:op.recurringKey||null
      })).filter(op=>op.type!=="transfer"||op.toAccountId);

      normalized.rules=normalized.rules.map(rule=>({
        ...rule,
        id:String(rule.id||uid()),
        type:rule.type==="income"?"income":"expense",
        label:String(rule.label||"Échéance"),
        amount:Math.max(0,Number(rule.amount)||0),
        day:Math.max(1,Math.min(28,Math.round(Number(rule.day)||1))),
        accountId:validAccountIds.has(rule.accountId)?rule.accountId:fallbackId,
        active:rule.active!==false
      }));

      return normalized;
    }

    const migrated = clone(defaults);
    migrated.theme = old.theme || "light";
    migrated.cardDebitDay = Number(old.cardDebitDay)||4;
    migrated.accounts[0].balance = Number(old.balance)||2697.32;
    migrated.accounts[1].balance = Number(old.savings)||0;

    migrated.operations = (Array.isArray(old.operations)?old.operations:[]).map(op=>({
      id:op.id||uid(),
      type:op.type||"expense",
      label:op.label||"Opération",
      amount:Number(op.amount)||0,
      date:op.date||today(),
      category:op.category||"Autre",
      accountId:op.payment==="deferred"?"deferred":"current",
      toAccountId:op.toAccountId||null,
      recurringKey:op.recurringKey||null
    }));

    const incomeRules = Array.isArray(old.incomeRules)?old.incomeRules:[];
    const chargeRules = Array.isArray(old.chargeRules)?old.chargeRules:[];
    migrated.rules = [
      ...incomeRules.map(r=>({id:r.id||uid(),type:"income",label:r.label,amount:Number(r.amount),day:Number(r.day),accountId:"current",active:r.active!==false})),
      ...chargeRules.map(r=>({id:r.id||uid(),type:"expense",label:r.label,amount:Number(r.amount),day:Number(r.day),accountId:"current",active:r.active!==false}))
    ];
    if(!migrated.rules.length) migrated.rules = clone(defaults.rules);
    migrated.lastSavedAt = old.lastSavedAt || null;
    return migrated;
  }

  function score(value){
    if(!value||typeof value!=="object")return -1;
    let total=0;
    if(Array.isArray(value.accounts)) total += value.accounts.reduce((s,a)=>s+Math.abs(Number(a.balance)||0),0)/10;
    if(Number(value.balance)) total+=1000;
    total+=(Array.isArray(value.operations)?value.operations.length:0)*20;
    return total;
  }

  function load(){
    const currentRaw=parseStore(KEY);
    const current=normalize(currentRaw);

    if(currentRaw && validateData(current)){
      current.dataHealth="ok";
      return current;
    }

    const restored=bestValidBackup();
    if(restored){
      restored.data.dataHealth="restored";
      restored.data.restoredAt=new Date().toISOString();
      localStorage.setItem(KEY,JSON.stringify(restored.data));
      return restored.data;
    }

    const keys=OLD_KEYS;
    let best=null,bestKey="",bestScore=-1;
    for(const key of keys){
      const candidate=parseStore(key);
      const candidateData=candidate&&candidate.data?candidate.data:candidate;
      const normalized=normalize(candidateData);
      const candidateScore=validateData(normalized)?score(normalized):-1;
      if(candidateScore>bestScore){
        best=normalized;
        bestKey=key;
        bestScore=candidateScore;
      }
    }

    const result=best||normalize(defaults);
    result.migratedFrom=bestKey||"";
    result.dataHealth=best?"migrated":"new";
    localStorage.setItem(KEY,JSON.stringify(result));
    pushBackup(result,best?"migration":"initial");
    return result;
  }

  if(localStorage.getItem("mon_budget_cache_cleaned_10_2")!=="yes") cleanOldApplicationCaches();

  let data=load();
  let operationType="expense";
  let deferredPrompt=null;

  function backup(reason="manual"){
    return pushBackup(data,reason);
  }

  function save(){
    try{
      const previousRaw=parseStore(KEY);
      const previous=normalize(previousRaw);
      if(previousRaw && validateData(previous)){
        pushBackup(previous,"before-change");
      }

      data=normalize(data);
      data.version=DATA_SCHEMA_VERSION;
      data.lastSavedAt=new Date().toISOString();
      data.dataHealth="ok";

      if(!validateData(data)){
        throw new Error("Données invalides");
      }

      localStorage.setItem(KEY,JSON.stringify(data));
      pushBackup(data,"after-change");
    }catch(error){
      const restored=bestValidBackup();
      if(restored){
        data=restored.data;
        localStorage.setItem(KEY,JSON.stringify(data));
        alert("Une erreur a été détectée. La dernière sauvegarde valide a été restaurée.");
      }else{
        alert("La sauvegarde locale a échoué. Aucune donnée n’a été supprimée.");
      }
      renderAll();
      return;
    }
    renderAll();
  }

  function accountTypeLabel(type){
    const labels={
      current:"Compte principal",
      savings:"Épargne",
      cash:"Espèces",
      deferred:"Carte à débit différé",
      other:"Autre compte"
    };
    return labels[type] || "Compte";
  }

  function account(id){ return data.accounts.find(a=>a.id===id); }
  function accountBalance(id){ return Number(account(id)?.balance||0); }
  function currentAccount(){ return data.accounts.find(a=>a.type==="current")||data.accounts[0]; }
  function deferredAccount(){ return data.accounts.find(a=>a.type==="deferred"); }
  function totalNetWorth(){ return data.accounts.filter(a=>a.type!=="deferred").reduce((s,a)=>s+Number(a.balance),0)-Math.abs(accountBalance(deferredAccount()?.id)); }
  function available(){ return accountBalance(currentAccount().id)-Math.abs(accountBalance(deferredAccount()?.id)); }
  function monthOps(offset=0){
    const d=new Date(); d.setMonth(d.getMonth()+offset);
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    return data.operations.filter(op=>monthKey(op.date)===key);
  }
  function monthIncome(offset=0){ return monthOps(offset).filter(o=>o.type==="income").reduce((s,o)=>s+Number(o.amount),0); }
  function monthExpense(offset=0){ return monthOps(offset).filter(o=>o.type==="expense").reduce((s,o)=>s+Number(o.amount),0); }
  function daysInMonth(){ const d=new Date(); return new Date(d.getFullYear(),d.getMonth()+1,0).getDate(); }
  function daysLeft(){ return Math.max(1,daysInMonth()-new Date().getDate()+1); }
  function ruleDate(day,monthOffset=0){
    const d=new Date(); d.setMonth(d.getMonth()+monthOffset);
    const max=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(Math.min(Number(day),max)).padStart(2,"0")}`;
  }
  function futureRules(){
    return data.rules.filter(r=>r.active!==false).map(r=>({...r,date:ruleDate(r.day)})).filter(r=>r.date>=today()).sort((a,b)=>a.date.localeCompare(b.date));
  }
  function remainingIncome(){ return futureRules().filter(r=>r.type==="income").reduce((s,r)=>s+Number(r.amount),0); }
  function remainingCharges(){ return futureRules().filter(r=>r.type==="expense").reduce((s,r)=>s+Number(r.amount),0); }
  function forecast(){ return available()+remainingIncome()-remainingCharges(); }
  function dailyBudget(){ return Math.max(0,forecast()/daysLeft()); }
  function statusInfo(){
    if(forecast()<0)return {title:"Situation tendue",text:"La projection de fin de mois est négative.",color:"var(--red)"};
    if(dailyBudget()<20)return {title:"Situation prudente",text:"Gardez les dépenses non essentielles sous contrôle.",color:"var(--orange)"};
    return {title:"Situation confortable",text:`Vous pouvez viser environ ${euro(dailyBudget())} aujourd’hui.`,color:"var(--green)"};
  }

  function applyOperation(op,direction=1){
    const from=account(op.accountId);
    if(op.type==="income"&&from) from.balance+=direction*Number(op.amount);
    if(op.type==="expense"&&from) from.balance-=direction*Number(op.amount);
    if(op.type==="transfer"){
      if(from)from.balance-=direction*Number(op.amount);
      const to=account(op.toAccountId); if(to)to.balance+=direction*Number(op.amount);
    }
  }

  function materializeRecurring(){
    const now=new Date(),year=now.getFullYear(),month=now.getMonth(),todayDay=now.getDate();
    let changed=false;
    data.rules.filter(r=>r.active!==false&&Number(r.day)<=todayDay).forEach(rule=>{
      const key=`${rule.id}:${year}-${String(month+1).padStart(2,"0")}`;
      if(data.operations.some(op=>op.recurringKey===key))return;
      const op={id:uid(),type:rule.type,label:rule.label,amount:Number(rule.amount),date:ruleDate(rule.day),category:"Récurrent",accountId:rule.accountId||currentAccount().id,toAccountId:null,recurringKey:key};
      data.operations.push(op); applyOperation(op,1); changed=true;
    });
    if(changed){
      data.lastSavedAt=new Date().toISOString();
      data=normalize(data);
      if(validateData(data)){
        localStorage.setItem(KEY,JSON.stringify(data));
        pushBackup(data,"recurring");
      }
    }
  }

  function showScreen(id){
    const target=$(id);
    if(!target)return;
    document.querySelectorAll(".screen").forEach(
      screen=>screen.classList.toggle("active",screen===target)
    );
    document.querySelectorAll("[data-screen]").forEach(button=>{
      const selected=button.dataset.screen===id;
      button.classList.toggle("active",selected);
      if(selected)button.setAttribute("aria-current","page");
      else button.removeAttribute("aria-current");
    });
    requestAnimationFrame(()=>window.scrollTo({top:0,behavior:"smooth"}));
  }
  function toast(text){
    const el=$("toast"); if(!el||!text)return;
    el.textContent=text; el.classList.add("show");
    clearTimeout(window.__toast); window.__toast=setTimeout(()=>{el.classList.remove("show");el.textContent=""},1800);
  }

  function renderHome(){
    const now=new Date();
    $("monthLabel").textContent=`Budget familial · ${now.toLocaleDateString("fr-FR",{month:"long",year:"numeric"})}`;
    $("monthBadge").textContent=now.toLocaleDateString("fr-FR",{month:"long"});
    animateNumber("availableValue",available());
    $("forecastValue").textContent=`Fin de mois estimée : ${euro(forecast())}`;
    $("weekIncome").textContent=remainingIncome()?`${euro(remainingIncome())} attendus ce mois-ci`:"Aucun revenu attendu ce mois-ci";
    $("dailyBudgetValue").textContent=`${euro(dailyBudget())} aujourd’hui`;
    $("monthIncome").textContent=euro(monthIncome());
    $("monthExpense").textContent=euro(monthExpense());
    $("remainingCharges").textContent=euro(remainingCharges());
    $("savingsValue").textContent=euro(data.accounts.filter(a=>a.type==="savings").reduce((s,a)=>s+Number(a.balance),0));
    $("operationsCount").textContent=monthOps().length;
    $("monthProgress").textContent=`${Math.round((new Date().getDate()/daysInMonth())*100)} %`;
    const st=statusInfo(); $("statusTitle").textContent=st.title;$("statusText").textContent=st.text;$("statusDot").style.background=st.color;
    const alerts=futureRules().filter(r=>{
      const diff=Math.round((new Date(r.date+"T12:00:00")-new Date(today()+"T12:00:00"))/86400000);
      return diff>=0&&diff<=3;
    }).slice(0,4);
    $("alertsCount").textContent=alerts.length;
    $("alertsList").innerHTML=alerts.length?alerts.map(r=>`
      <div class="alert-row">
        <span class="alert-icon">${r.type==="income"?"💰":"🔔"}</span>
        <div class="alert-main">
          <b>${r.label}</b>
          <small>${new Date(r.date+"T12:00:00").toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"})}</small>
        </div>
        <b class="${r.type==="income"?"positive":"negative"}">${r.type==="income"?"+":"-"}${euro(r.amount)}</b>
      </div>
    `).join(""):"<p>Aucune alerte dans les 3 prochains jours.</p>";
    const upcoming=futureRules().slice(0,5);
    $("upcomingList").innerHTML=upcoming.length?upcoming.map(r=>`<div class="list-row"><div><b>${r.type==="income"?"💰":"🧾"} ${r.label}</b><small>${new Date(r.date+"T12:00:00").toLocaleDateString("fr-FR")}</small></div><b class="${r.type==="income"?"positive":"negative"}">${r.type==="income"?"+":"-"}${euro(r.amount)}</b></div>`).join(""):"<p>Aucune échéance à venir.</p>";
    $("saveState").textContent=data.lastSavedAt
      ? `🟢 Sauvegardé automatiquement à ${new Date(data.lastSavedAt).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}`
      : "🟢 Sauvegarde automatique active";
  }

  function populateAccounts(){
    const options=data.accounts.map(a=>`<option value="${a.id}">${a.icon||"💳"} ${a.name}</option>`).join("");
    ["accountInput","transferFrom","transferTo"].forEach(id=>{const el=$(id);const old=el.value;el.innerHTML=options;if(data.accounts.some(a=>a.id===old))el.value=old});
    $("accountFilter").innerHTML='<option value="all">Tous les comptes</option>'+options;
  }

  function renderOperations(){
    populateAccounts();
    const search=$("searchInput").value.trim().toLowerCase(),type=$("typeFilter").value,month=$("monthFilter").value,acct=$("accountFilter").value,sort=$("sortFilter").value;
    const months=[...new Set(data.operations.map(o=>monthKey(o.date)))].sort().reverse();
    const oldMonth=month;
    $("monthFilter").innerHTML='<option value="all">Tous les mois</option>'+months.map(m=>`<option value="${m}">${new Date(m+"-01T12:00:00").toLocaleDateString("fr-FR",{month:"long",year:"numeric"})}</option>`).join("");
    if(months.includes(oldMonth))$("monthFilter").value=oldMonth;
    const list=data.operations.filter(o=>type==="all"||o.type===type).filter(o=>month==="all"||monthKey(o.date)===month).filter(o=>acct==="all"||o.accountId===acct||o.toAccountId===acct).filter(o=>!search||`${o.label} ${o.category||""}`.toLowerCase().includes(search)).sort((a,b)=>{
      if(sort==="date-asc")return a.date.localeCompare(b.date);
      if(sort==="amount-desc")return Number(b.amount)-Number(a.amount);
      if(sort==="amount-asc")return Number(a.amount)-Number(b.amount);
      return b.date.localeCompare(a.date);
    });
    $("operationsList").innerHTML=list.length?list.map(o=>{
      const sign=o.type==="income"?"+":o.type==="expense"?"-":"";
      return `<div class="list-row" data-op-id="${o.id}"><div><b>${o.type==="income"?"💰":o.type==="transfer"?"🔁":"🧾"} ${o.label}</b><small>${new Date(o.date+"T12:00:00").toLocaleDateString("fr-FR")} · ${account(o.accountId)?.name||""}</small></div><b class="${o.type==="income"?"positive":o.type==="expense"?"negative":""}">${sign}${euro(o.amount)}</b></div>`;
    }).join(""):"<p>Aucune opération.</p>";
  }

  function renderAgenda(){
    const upcomingRules=futureRules();
    const upcomingOperations=data.operations
      .filter(op=>op.date>=today())
      .map(op=>({...op,active:true}));
    const recentOperations=data.operations
      .filter(op=>op.date<today())
      .sort((a,b)=>b.date.localeCompare(a.date))
      .slice(0,20)
      .map(op=>({...op,active:true}));

    const list=[
      ...upcomingRules,
      ...upcomingOperations
    ].sort((a,b)=>a.date.localeCompare(b.date))
      .concat(recentOperations);
    $("agendaList").innerHTML=list.length?list.map(i=>`<div class="list-row"><div><b>${i.type==="income"?"💰":i.type==="transfer"?"🔁":"🧾"} ${i.label}</b><small>${new Date(i.date+"T12:00:00").toLocaleDateString("fr-FR")}</small></div><b class="${i.type==="income"?"positive":i.type==="expense"?"negative":""}">${i.type==="income"?"+":i.type==="expense"?"-":""}${euro(i.amount)}</b></div>`).join(""):"<p>Aucune opération prévue.</p>";
    $("rulesList").innerHTML=data.rules.length?data.rules.map(r=>`<div class="rule-row"><div><b>${r.type==="income"?"💰":"🧾"} ${r.label}</b><small>${euro(r.amount)} · le ${r.day} · ${r.active===false?"Désactivée":"Active"}</small></div><button class="link-btn" data-rule-id="${r.id}">${r.active===false?"Activer":"Désactiver"}</button></div>`).join(""):"<p>Aucune échéance.</p>";
  }

  function renderAccounts(){
    populateAccounts();
    $("accountsList").innerHTML=data.accounts.map(a=>`<div class="account-row"><div class="account-chip"><span class="account-icon">${a.icon||"💳"}</span><div class="account-name"><b>${a.name}</b><small>${accountTypeLabel(a.type)}</small></div></div><b class="account-amount ${Number(a.balance)<0?"negative":""}">${euro(a.balance)}</b></div>`).join("");
    $("netWorthValue").textContent=euro(totalNetWorth());
  }

  function renderStats(){
    $("statsIncome").textContent=euro(monthIncome());
    $("statsExpense").textContent=euro(monthExpense());
    $("statsForecast").textContent=euro(forecast());
    $("statsPrevious").textContent=euro(monthExpense(-1));
    const totals={};monthOps().filter(o=>o.type==="expense").forEach(o=>{const c=o.category||"Autre";totals[c]=(totals[c]||0)+Number(o.amount)});
    const rows=Object.entries(totals).sort((a,b)=>b[1]-a[1]),max=rows.length?rows[0][1]:1;
    $("categoryStats").innerHTML=rows.length?rows.map(([c,a])=>`<div class="stat-row"><div><b>${c}</b><span>${euro(a)}</span></div><div class="bar"><i style="width:${Math.max(3,Math.round(a/max*100))}%"></i></div></div>`).join(""):"<p>Aucune dépense ce mois-ci.</p>";
    const diff=monthExpense()-monthExpense(-1);
    $("statsAdvice").textContent=diff>0?`Vous avez dépensé ${euro(diff)} de plus que le mois précédent.`:diff<0?`Vous avez dépensé ${euro(Math.abs(diff))} de moins que le mois précédent.`:"Vos dépenses sont stables par rapport au mois précédent.";
  }

  function renderSettings(){
    $("cardDayInput").value=data.cardDebitDay;
    const historyCount=readBackupHistory().length;
    if(data.dataHealth==="restored"){
      $("migrationStatus").textContent=`Une sauvegarde valide a été restaurée automatiquement. ${historyCount} sauvegarde(s) disponible(s).`;
    }else if(data.migratedFrom){
      $("migrationStatus").textContent=`Anciennes données récupérées depuis ${data.migratedFrom}. ${historyCount} sauvegarde(s) disponible(s).`;
    }else{
      $("migrationStatus").textContent=`Données vérifiées. ${historyCount} sauvegarde(s) automatique(s) disponible(s).`;
    }
    document.body.classList.toggle("dark",data.theme==="dark");
    $("themeBtn").textContent=data.theme==="dark"?"☀️":"🌙";
  }

  function debounce(callback,delay=120){
    let timer;
    return (...args)=>{
      clearTimeout(timer);
      timer=setTimeout(()=>callback(...args),delay);
    };
  }

  const renderOperationsDebounced=debounce(renderOperations,100);

  let renderScheduled=false;
  function renderAll(){
    if(renderScheduled)return;
    renderScheduled=true;
    requestAnimationFrame(()=>{
      renderScheduled=false;
      renderHome();
      renderOperations();
      renderAgenda();
      renderAccounts();
      renderStats();
      renderSettings();
    });
  }
  function setType(type){
    operationType=type;
    document.querySelectorAll("[data-op-type]").forEach(b=>b.classList.toggle("active",b.dataset.opType===type));
    $("standardOperationFields").hidden=type==="transfer";
    $("transferFields").hidden=type!=="transfer";
  }
  function manageOperation(id){
    const op=data.operations.find(item=>item.id===id);
    if(!op)return;

    const action=prompt(
      `Que voulez-vous faire avec « ${op.label} » ?\n\n1 = Modifier\n2 = Dupliquer\n3 = Supprimer`
    );

    if(action==="1"){
      const newLabel=prompt("Libellé",op.label);
      if(newLabel===null)return;
      const newAmountText=prompt("Montant",String(op.amount).replace(".",","));
      if(newAmountText===null)return;
      const newAmount=money(newAmountText);
      if(!newLabel.trim()||newAmount<=0){
        alert("Libellé ou montant invalide.");
        return;
      }

      applyOperation(op,-1);
      op.label=newLabel.trim();
      op.amount=newAmount;
      if(op.type!=="transfer")op.category=smartCategory(op.label);
      applyOperation(op,1);
      save();
      toast("Opération modifiée");
      return;
    }

    if(action==="2"){
      const copy={...op,id:uid(),date:today(),recurringKey:null};
      data.operations.push(copy);
      applyOperation(copy,1);
      save();
      toast("Opération dupliquée");
      return;
    }

    if(action==="3"&&confirm(`Supprimer « ${op.label} » ?`)){
      applyOperation(op,-1);
      data.operations=data.operations.filter(item=>item.id!==id);
      save();
      toast("Opération supprimée");
    }
  }

  function smartCategory(label){
    const t=label.toLowerCase();
    if(/carrefour|leclerc|lidl|aldi|courses/.test(t))return "Alimentation";
    if(/orange|edf|eau|assurance|loyer/.test(t))return "Maison";
    if(/essence|total|carburant|péage/.test(t))return "Transport";
    if(/pharmacie|médecin|dentiste/.test(t))return "Santé";
    return $("categoryInput").value;
  }

  document.addEventListener("click",e=>{
    const nav=e.target.closest("[data-screen]");if(nav){showScreen(nav.dataset.screen);return}
    const go=e.target.closest("[data-go]");if(go){showScreen(go.dataset.go);return}
    const typeBtn=e.target.closest("[data-op-type]");if(typeBtn){setType(typeBtn.dataset.opType);return}
    const opRow=e.target.closest("[data-op-id]");
    if(opRow){
      manageOperation(opRow.dataset.opId);
      return;
    }
    const ruleBtn=e.target.closest("[data-rule-id]");if(ruleBtn){const r=data.rules.find(x=>x.id===ruleBtn.dataset.ruleId);if(r){r.active=r.active===false;save()}return}
  });

  $("saveOperationBtn").addEventListener("click",()=>{
    const date=$("dateInput").value||today();
    if(operationType==="transfer"){
      const amount=money($("transferAmount").value),from=$("transferFrom").value,to=$("transferTo").value,label=$("transferLabel").value.trim()||"Virement";
      if(amount<=0||from===to){$("addMessage").textContent="Vérifiez le montant et les comptes.";return}
      const op={id:uid(),type:"transfer",label,amount,date,category:"Virement",accountId:from,toAccountId:to};
      data.operations.push(op);applyOperation(op,1);
    }else{
      const amount=money($("amountInput").value),label=$("labelInput").value.trim(),accountId=$("accountInput").value;
      if(amount<=0||!label){$("addMessage").textContent="Complétez le libellé et le montant.";return}
      const op={id:uid(),type:operationType,label,amount,date,category:smartCategory(label),accountId,toAccountId:null};
      data.operations.push(op);applyOperation(op,1);
    }
    save();$("addMessage").textContent="Opération enregistrée.";toast("Opération enregistrée");showScreen("home");
  });

  $("checkRecurringBtn").addEventListener("click",()=>{materializeRecurring();renderAll();toast("Échéances vérifiées")});
  $("addRuleBtn").addEventListener("click",()=>{
    const label=prompt("Nom de l’échéance");if(!label)return;
    const amount=money(prompt("Montant"));if(amount<=0)return;
    const day=Math.max(1,Math.min(28,Number(prompt("Jour du mois"))||1));
    const type=confirm("OK = revenu, Annuler = dépense")?"income":"expense";
    data.rules.push({id:uid(),type,label,amount,day,accountId:currentAccount().id,active:true});save();
  });
  $("addAccountBtn").addEventListener("click",()=>{
    const name=prompt("Nom du compte");if(!name)return;
    const balance=money(prompt("Solde actuel"));
    data.accounts.push({id:uid(),name,type:"other",balance,icon:"💳"});save();
  });
  $("saveSettingsBtn").addEventListener("click",()=>{data.cardDebitDay=Math.max(1,Math.min(28,Number($("cardDayInput").value)||4));save();toast("Réglages enregistrés")});
  $("themeBtn").addEventListener("click",()=>{data.theme=data.theme==="dark"?"light":"dark";save()});
  $("searchInput").addEventListener("input",renderOperationsDebounced);
  ["typeFilter","monthFilter","accountFilter","sortFilter"].forEach(
    id=>$(id).addEventListener("change",renderOperations)
  );
  $("backupBtn").addEventListener("click",()=>{backup("manual");toast("Sauvegarde locale créée")});
  $("restoreBtn").addEventListener("click",()=>{
    const history=readBackupHistory();
    const latest=history[0]||parseStore(BACKUP_KEY);
    const restored=latest&&latest.data?normalize(latest.data):null;
    if(!restored||!validateData(restored)){
      alert("Aucune sauvegarde valide disponible.");
      return;
    }
    if(confirm(`Restaurer la sauvegarde du ${new Date(latest.savedAt||Date.now()).toLocaleString("fr-FR")} ?`)){
      pushBackup(data,"before-restore");
      data=restored;
      data.lastSavedAt=new Date().toISOString();
      data.dataHealth="ok";
      localStorage.setItem(KEY,JSON.stringify(data));
      pushBackup(data,"restored");
      renderAll();
      toast("Sauvegarde restaurée");
    }
  });
  $("exportBtn").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="mon-budget-2-stable.json";a.click()});
  $("importInput").addEventListener("change",async e=>{
    const file=e.target.files[0];
    if(!file)return;
    try{
      const imported=normalize(JSON.parse(await file.text()));
      if(!validateData(imported))throw new Error("Invalid data");
      pushBackup(data,"before-import");
      data=imported;
      data.lastSavedAt=new Date().toISOString();
      data.dataHealth="ok";
      localStorage.setItem(KEY,JSON.stringify(data));
      pushBackup(data,"import");
      renderAll();
      toast("Sauvegarde importée");
    }catch{
      alert("Fichier invalide ou incomplet.");
    }finally{
      e.target.value="";
    }
  });


  $("dateInput").value=today();
  materializeRecurring();
  if(readBackupHistory().length===0 && validateData(data)){
    pushBackup(data,"startup");
  }
  setType("expense");
  renderAll();
})();