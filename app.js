(()=>{
"use strict";

const STORAGE_KEY="budget-familial-laetitia-final-v1";
const BACKUP_KEY=STORAGE_KEY+"-backup";
const DATA_VERSION=4;

const initial={
  month:"Août 2026",
  bankBalance:3346.91,
  incomes:[
    {id:"r1",label:"Salaire Jeff",amount:1450},
    {id:"r2",label:"MSA invalidité",amount:867.92},
    {id:"r3",label:"MSA prestations",amount:839.98},
    {id:"r4",label:"CCPMA prévoyance",amount:660.08},
    {id:"r5",label:"Participation Maëva assurance voiture",amount:130}
  ],
  fixedCharges:[
    {id:"f1",day:3,label:"Eau de Garonne",amount:64,paid:false,debited:false},
    {id:"f2",day:5,label:"Prêt principal",amount:554.54,paid:false,debited:false},
    {id:"f3",day:6,label:"Orange mobile 1",amount:28.99,paid:false,debited:false},
    {id:"f4",day:6,label:"CEAPC",amount:255.46,paid:false,debited:false},
    {id:"f5",day:9,label:"BPCE Vie",amount:10.73,paid:false,debited:false},
    {id:"f6",day:10,label:"MAAF",amount:321.13,paid:false,debited:false},
    {id:"f7",day:10,label:"Auto-Journal",amount:7.20,paid:false,debited:false},
    {id:"f8",day:10,label:"Orange mobile 2",amount:28.99,paid:false,debited:false},
    {id:"f9",day:13,label:"Biba",amount:1.52,paid:false,debited:false},
    {id:"f10",day:15,label:"VW Bank",amount:424.83,paid:false,debited:false},
    {id:"f11",day:16,label:"DGFIP",amount:257,paid:false,debited:false},
    {id:"f12",day:17,label:"Orange mobile 3",amount:13.99,paid:false,debited:false},
    {id:"f13",day:20,label:"Free Mobile",amount:9.99,paid:false,debited:false},
    {id:"f14",day:20,label:"EDF",amount:174.02,paid:false,debited:false},
    {id:"f15",day:21,label:"Engie",amount:109.87,paid:false,debited:false},
    {id:"f16",day:23,label:"Orange fibre",amount:72.98,paid:false,debited:false},
    {id:"f17",day:null,label:"Ergothérapie",amount:175,paid:false,debited:false},
    {id:"f18",day:null,label:"Frais bancaires",amount:21.50,paid:false,debited:false}
  ],
  budgets:{Courses:700,Carburant:250,Animaux:150,Santé:80,Ergothérapie:175,Amazon:100,Maison:150,Loisirs:100,Vêtements:100,Autre:100},
  rules:[
    {keyword:"leclerc",category:"Courses"},{keyword:"carrefour",category:"Courses"},
    {keyword:"intermarché",category:"Courses"},{keyword:"intermarche",category:"Courses"},
    {keyword:"lidl",category:"Courses"},{keyword:"aldi",category:"Courses"},
    {keyword:"total",category:"Carburant"},{keyword:"esso",category:"Carburant"},
    {keyword:"zooplus",category:"Animaux"},{keyword:"maxi zoo",category:"Animaux"},
    {keyword:"pharmacie",category:"Santé"},{keyword:"amazon",category:"Amazon"},
    {keyword:"ikea",category:"Maison"},{keyword:"leroy merlin",category:"Maison"}
  ],
  expenses:[],
  incomeTransactions:[],
  deferredCardBatches:[]
};

const $=id=>document.getElementById(id);
const clone=o=>JSON.parse(JSON.stringify(o));
const euro=n=>Number(n||0).toLocaleString("fr-FR",{style:"currency",currency:"EUR"});
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const fmtDate=v=>{if(!v)return"";const p=v.split("-");return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:v};

function migrate(saved){
  const d={...clone(initial),...(saved||{})};
  d.incomes=Array.isArray(d.incomes)?d.incomes:clone(initial.incomes);
  d.fixedCharges=(Array.isArray(d.fixedCharges)?d.fixedCharges:clone(initial.fixedCharges)).map(x=>({...x,paid:Boolean(x.paid),debited:Boolean(x.debited)}));
  d.expenses=(Array.isArray(d.expenses)?d.expenses:[]).map(x=>({
    id:x.id||crypto.randomUUID(),amount:Number(x.amount||0),label:x.label||"Dépense",
    category:x.category||"Autre",date:x.date||new Date().toISOString().slice(0,10),
    paymentMethod:x.paymentMethod||"immediate_card",debited:x.debited!==false
  }));
  d.incomeTransactions=(Array.isArray(d.incomeTransactions)?d.incomeTransactions:[]).map(x=>({...x,future:Boolean(x.future)}));
  d.deferredCardBatches=Array.isArray(d.deferredCardBatches)?d.deferredCardBatches:[];
  d.budgets=d.budgets&&typeof d.budgets==="object"?d.budgets:clone(initial.budgets);
  d.rules=Array.isArray(d.rules)?d.rules:clone(initial.rules);
  d.dataVersion=DATA_VERSION;
  return d;
}

let data;
try{data=migrate(JSON.parse(localStorage.getItem(STORAGE_KEY)))}catch{data=migrate(initial)}

function save(){
  data.dataVersion=DATA_VERSION;
  localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
  localStorage.setItem(BACKUP_KEY,JSON.stringify({savedAt:new Date().toISOString(),data}));
  render();
}

function totals(){
  const income=data.incomes.reduce((s,x)=>s+Number(x.amount||0),0);
  const fixed=data.fixedCharges.reduce((s,x)=>s+Number(x.amount||0),0);
  const expenses=data.expenses.reduce((s,x)=>s+Number(x.amount||0),0);
  return {income,fixed,expenses,theoretical:income-fixed,available:income-fixed-expenses};
}
function pendingDeferred(){return data.expenses.filter(x=>x.paymentMethod==="deferred_card"&&!x.debited).reduce((s,x)=>s+Number(x.amount||0),0)}
function remainingCharges(){return data.fixedCharges.filter(x=>!x.paid).reduce((s,x)=>s+Number(x.amount||0),0)}
function endMonth(){return Number(data.bankBalance)-pendingDeferred()-remainingCharges()}
function guessCategory(label){
  const text=(label||"").toLowerCase();
  return data.rules.find(r=>text.includes(r.keyword.toLowerCase()))?.category||$("expenseCategory").value||"Autre";
}
function paymentLabel(x){
  if(x.paymentMethod==="deferred_card")return x.debited?"CB débitée":"CB en attente";
  if(x.paymentMethod==="immediate_card")return"Carte immédiate";
  if(x.paymentMethod==="direct_debit")return"Prélèvement";
  if(x.paymentMethod==="transfer")return"Virement";
  if(x.paymentMethod==="cash")return"Espèces";
  return"Paiement";
}

function forecastEvents(){
  const now=new Date(),year=now.getFullYear(),month=now.getMonth(),day=now.getDate(),events=[];
  const card=pendingDeferred();
  if(card>0){
    let date=new Date(year,month,4);
    if(day>4)date=new Date(year,month+1,4);
    events.push({date,label:"Débit global CB",amount:-card,type:"Carte différée"});
  }
  data.fixedCharges.filter(x=>!x.paid).forEach(x=>{
    let due=x.day||28,date=new Date(year,month,due);
    if(due<day)date=new Date(year,month+1,due);
    events.push({date,label:x.label,amount:-Number(x.amount||0),type:"Prélèvement"});
  });
  data.incomeTransactions.filter(x=>x.future).forEach(x=>{
    const date=new Date(x.date+"T12:00:00");
    if(date>=now)events.push({date,label:x.label,amount:Number(x.amount||0),type:"Revenu prévu"});
  });
  return events.sort((a,b)=>a.date-b.date);
}

function render(){
  const t=totals(),deferred=pendingDeferred(),end=endMonth();
  $("headerSubtitle").textContent=`Laetitia · ${data.month}`;
  $("available").textContent=euro(t.available);
  $("available").className=t.available<0?"bad":t.available<300?"warn":"ok";
  $("budgetStatus").textContent=t.available<0?"Budget dépassé":t.available<300?"À surveiller":"Budget disponible";
  $("bankBalanceView").textContent=euro(data.bankBalance);
  $("deferredView").textContent=euro(deferred);
  $("theoreticalView").textContent=euro(t.theoretical);
  $("endMonthView").textContent=euro(end);
  $("deferredTotal").textContent=euro(deferred);
  $("bankBalance").value=data.bankBalance;
  $("monthLabel").value=data.month;
  renderCategories();renderBudgets();renderForecast();renderCharges();renderHistory();renderIncomeSettings();renderChargeSettings();renderBudgetSettings();
}

function renderCategories(){
  const current=$("expenseCategory").value;
  $("expenseCategory").innerHTML=Object.keys(data.budgets).map(x=>`<option>${esc(x)}</option>`).join("");
  if(current&&data.budgets[current]!==undefined)$("expenseCategory").value=current;
}
function renderBudgets(){
  $("budgets").innerHTML=Object.entries(data.budgets).map(([cat,limit])=>{
    const spent=data.expenses.filter(x=>x.category===cat).reduce((s,x)=>s+Number(x.amount||0),0);
    const pct=limit?Math.min(100,spent/limit*100):0,cls=pct>=100?"danger":pct>=80?"warning":"";
    return `<div class="budget-item"><div class="budget-head"><div><b>${esc(cat)}</b><small>${euro(Math.max(0,limit-spent))} restants</small></div><span>${euro(spent)} / ${euro(limit)}</span></div><div class="track"><div class="fill ${cls}" style="width:${pct}%"></div></div></div>`;
  }).join("");
}
function renderForecast(){
  const events=forecastEvents();let running=Number(data.bankBalance||0);
  const rows=[{date:new Date(),label:"Solde actuel",amount:0,type:"Départ",balance:running}];
  events.forEach(e=>{running=Number((running+e.amount).toFixed(2));rows.push({...e,balance:running})});
  $("forecastStart").textContent=euro(data.bankBalance);
  $("forecastEnd").textContent=euro(running);
  $("forecastEnd").className=running<0?"bad":running<300?"warn":"ok";
  $("forecastTimeline").innerHTML=rows.map((x,i)=>{
    const date=i===0?"Aujourd’hui":x.date.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"});
    const amount=x.amount?` · ${x.amount>0?"+":""}${euro(x.amount)}`:"";
    return `<div class="timeline-item"><div class="timeline-date">${date}</div><div class="timeline-main"><b>${esc(x.label)}</b><small>${esc(x.type)}${amount}</small></div><div class="timeline-balance ${x.balance<0?"bad":x.balance<300?"warn":""}">${euro(x.balance)}</div></div>`;
  }).join("");
}
function renderCharges(){
  $("chargesList").innerHTML=data.fixedCharges.map(x=>`<button class="charge-button ${x.paid?"paid":""}" data-charge="${x.id}"><div class="charge-row"><div><b>${esc(x.label)}</b><small>${x.day?`Le ${x.day}`:"Date variable"}</small></div><div><strong>${euro(x.amount)}</strong><small>${x.paid?"Payé":"À payer"}</small></div></div></button>`).join("");
}
function renderHistory(){
  const q=$("search").value.trim().toLowerCase();
  const ops=[
    ...data.expenses.map(x=>({...x,type:"expense"})),
    ...data.incomeTransactions.map(x=>({...x,type:"income",category:"Revenu"}))
  ].filter(x=>!q||x.label.toLowerCase().includes(q)||String(x.category).toLowerCase().includes(q))
   .sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  $("historyList").innerHTML=ops.length?ops.map(x=>`<div class="history-row"><div><b>${x.type==="income"?"➕ ":""}${esc(x.label)}</b><small>${esc(x.category)} · ${fmtDate(x.date)}${x.type==="expense"?" · "+paymentLabel(x):x.future?" · À venir":""}</small></div><div><strong class="${x.type==="income"?"ok":""}">${x.type==="income"?(x.future?"Prévu ":"+"):""}${euro(x.amount)}</strong><br><button class="delete-btn" data-${x.type}="${x.id}">Suppr.</button></div></div>`).join(""):'<p class="muted">Aucune opération.</p>';
}
function renderIncomeSettings(){
  $("incomeSettings").innerHTML=data.incomes.map((x,i)=>`<div class="edit-row"><input data-income-label="${i}" value="${esc(x.label)}"><input data-income-amount="${i}" type="number" step="0.01" value="${x.amount}"><button class="delete-btn" data-income-monthly-delete="${i}">✕</button></div>`).join("");
}
function renderChargeSettings(){
  $("chargeSettings").innerHTML=data.fixedCharges.map((x,i)=>`<div class="edit-row four"><input data-charge-day="${i}" type="number" min="1" max="31" value="${x.day??""}" placeholder="Jour"><input data-charge-label="${i}" value="${esc(x.label)}"><input data-charge-amount="${i}" type="number" step="0.01" value="${x.amount}"><button class="delete-btn" data-charge-delete="${i}">✕</button></div>`).join("");
}
function renderBudgetSettings(){
  $("budgetSettings").innerHTML=Object.entries(data.budgets).map(([cat,amount])=>`<div class="edit-row"><input value="${esc(cat)}" readonly><input data-budget="${esc(cat)}" type="number" step="0.01" value="${amount}"><span></span></div>`).join("");
}

document.querySelectorAll(".bottom-nav button").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".bottom-nav button").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");$(btn.dataset.tab).classList.add("active");
}));

$("expenseLabel").addEventListener("input",()=>{
  const cat=guessCategory($("expenseLabel").value);
  $("expenseCategory").value=cat;
  $("categorySuggestion").innerHTML=`Catégorie proposée : <b>${esc(cat)}</b>`;
});
$("saveExpense").addEventListener("click",()=>{
  const amount=Number($("expenseAmount").value),method=$("paymentMethod").value;
  if(!amount||amount<=0){alert("Saisis un montant valide.");return}
  const category=guessCategory($("expenseLabel").value);
  const deferred=method==="deferred_card";
  data.expenses.unshift({id:crypto.randomUUID(),amount,label:$("expenseLabel").value.trim()||category,category,date:$("expenseDate").value,paymentMethod:method,debited:!deferred});
  if(!deferred&&method!=="cash")data.bankBalance=Number((data.bankBalance-amount).toFixed(2));
  $("expenseAmount").value="";$("expenseLabel").value="";save();
  document.querySelector('[data-tab="home"]').click();
});
$("futureIncome").addEventListener("change",()=>{$("futureDateBlock").hidden=!$("futureIncome").checked});
$("saveIncome").addEventListener("click",()=>{
  const amount=Number($("incomeAmount").value),future=$("futureIncome").checked;
  if(!amount||amount<=0){alert("Saisis un montant valide.");return}
  const date=future?$("futureIncomeDate").value:new Date().toISOString().slice(0,10);
  if(future&&!date){alert("Choisis une date.");return}
  data.incomeTransactions.unshift({id:crypto.randomUUID(),amount,label:$("incomeLabel").value.trim()||"Revenu",date,future});
  if(!future)data.bankBalance=Number((data.bankBalance+amount).toFixed(2));
  $("incomeAmount").value="";$("incomeLabel").value="";$("futureIncome").checked=false;$("futureDateBlock").hidden=true;save();
});
$("applyDeferredDebit").addEventListener("click",()=>{
  const total=pendingDeferred();
  if(total<=0){alert("Aucune CB en attente.");return}
  if(!confirm(`Débiter ${euro(total)} du compte ?`))return;
  data.bankBalance=Number((data.bankBalance-total).toFixed(2));
  data.expenses=data.expenses.map(x=>x.paymentMethod==="deferred_card"&&!x.debited?{...x,debited:true}:x);
  data.deferredCardBatches.push({id:crypto.randomUUID(),date:new Date().toISOString().slice(0,10),amount:total});
  save();
});
$("search").addEventListener("input",renderHistory);
$("bankBalance").addEventListener("change",()=>{data.bankBalance=Number($("bankBalance").value)||0;save()});
$("monthLabel").addEventListener("change",()=>{data.month=$("monthLabel").value;save()});
$("addMonthlyIncome").addEventListener("click",()=>{data.incomes.push({id:crypto.randomUUID(),label:"Nouveau revenu",amount:0});save()});
$("addCharge").addEventListener("click",()=>{data.fixedCharges.push({id:crypto.randomUUID(),day:null,label:"Nouveau prélèvement",amount:0,paid:false,debited:false});save()});

document.addEventListener("click",e=>{
  const charge=e.target.closest("[data-charge]")?.dataset.charge;
  if(charge){
    data.fixedCharges=data.fixedCharges.map(x=>{
      if(x.id!==charge)return x;
      if(!x.paid){data.bankBalance=Number((data.bankBalance-Number(x.amount)).toFixed(2));return{...x,paid:true,debited:true}}
      if(x.debited)data.bankBalance=Number((data.bankBalance+Number(x.amount)).toFixed(2));
      return{...x,paid:false,debited:false};
    });save();
  }
  const expense=e.target.closest("[data-expense]")?.dataset.expense;
  if(expense){
    const x=data.expenses.find(y=>y.id===expense);
    if(x&&x.debited&&x.paymentMethod!=="cash")data.bankBalance=Number((data.bankBalance+Number(x.amount)).toFixed(2));
    data.expenses=data.expenses.filter(y=>y.id!==expense);save();
  }
  const income=e.target.closest("[data-income]")?.dataset.income;
  if(income){
    const x=data.incomeTransactions.find(y=>y.id===income);
    if(x&&!x.future)data.bankBalance=Number((data.bankBalance-Number(x.amount)).toFixed(2));
    data.incomeTransactions=data.incomeTransactions.filter(y=>y.id!==income);save();
  }
  const mdi=e.target.closest("[data-income-monthly-delete]")?.dataset.incomeMonthlyDelete;
  if(mdi!==undefined){data.incomes.splice(Number(mdi),1);save()}
  const cdi=e.target.closest("[data-charge-delete]")?.dataset.chargeDelete;
  if(cdi!==undefined){data.fixedCharges.splice(Number(cdi),1);save()}
});

document.addEventListener("change",e=>{
  const d=e.target.dataset;
  if(d.incomeLabel!==undefined)data.incomes[Number(d.incomeLabel)].label=e.target.value;
  if(d.incomeAmount!==undefined)data.incomes[Number(d.incomeAmount)].amount=Number(e.target.value)||0;
  if(d.chargeDay!==undefined)data.fixedCharges[Number(d.chargeDay)].day=e.target.value===""?null:Number(e.target.value);
  if(d.chargeLabel!==undefined)data.fixedCharges[Number(d.chargeLabel)].label=e.target.value;
  if(d.chargeAmount!==undefined)data.fixedCharges[Number(d.chargeAmount)].amount=Number(e.target.value)||0;
  if(d.budget!==undefined)data.budgets[d.budget]=Number(e.target.value)||0;
  if(Object.keys(d).length)save();
});

$("exportData").addEventListener("click",()=>{
  const payload={app:"Budget Familial Laetitia",version:"3.0.0",exportedAt:new Date().toISOString(),data};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="budget_laetitia_sauvegarde.json";a.click();
});
$("importDataBtn").addEventListener("click",()=>$("importDataFile").click());
$("importDataFile").addEventListener("change",e=>{
  const file=e.target.files?.[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{try{const parsed=JSON.parse(String(reader.result));data=migrate(parsed.data||parsed);save();alert("Sauvegarde restaurée.")}catch{alert("Fichier invalide.")}};
  reader.readAsText(file);e.target.value="";
});
$("restoreAutoBackup").addEventListener("click",()=>{
  try{const raw=localStorage.getItem(BACKUP_KEY);if(!raw){alert("Aucune sauvegarde.");return}data=migrate(JSON.parse(raw).data);save();alert("Sauvegarde récupérée.")}catch{alert("Récupération impossible.")}
});
$("resetApp").addEventListener("click",()=>{if(confirm("Réinitialiser toute l’application ?")){data=migrate(initial);save()}});

$("expenseDate").value=new Date().toISOString().slice(0,10);
$("futureIncomeDate").value=new Date().toISOString().slice(0,10);
save();

if("serviceWorker" in navigator){
  navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});
}
if("caches" in window)caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).catch(()=>{});
fetch("./version.json?t="+Date.now(),{cache:"no-store"}).then(r=>r.json()).then(v=>{
  if(location.search!==`?v=${v.version}`)location.replace(`${location.pathname}?v=${v.version}`);
}).catch(()=>{});
})();
