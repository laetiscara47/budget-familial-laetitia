(()=>{
"use strict";
const STORAGE_KEY="budget-familial-laetitia-final-v1",BACKUP_KEY=STORAGE_KEY+"-backup",DATA_VERSION=8;
const $=id=>document.getElementById(id),clone=o=>JSON.parse(JSON.stringify(o));
const euro=n=>Number(n||0).toLocaleString("fr-FR",{style:"currency",currency:"EUR"});
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const today=()=>new Date().toISOString().slice(0,10);

const initial={
 month:"Août 2026",
 accounts:[
  {id:"current",name:"Compte courant",type:"current",balance:3346.91},
  {id:"savings",name:"Épargne",type:"savings",balance:0},
  {id:"cash",name:"Espèces",type:"cash",balance:0}
 ],
 incomes:[
  {id:"r1",label:"Salaire Jeff",amount:1450},
  {id:"r2",label:"MSA invalidité",amount:867.92},
  {id:"r3",label:"MSA prestations",amount:839.98},
  {id:"r4",label:"CCPMA prévoyance",amount:660.08},
  {id:"r5",label:"Participation Maëva assurance voiture",amount:130}
 ],
 fixedCharges:[
  {id:"f1",day:3,label:"Eau de Garonne",amount:64,paid:false,debited:false,accountId:"current"},
  {id:"f2",day:5,label:"Prêt principal",amount:554.54,paid:false,debited:false,accountId:"current"},
  {id:"f3",day:6,label:"Orange mobile 1",amount:28.99,paid:false,debited:false,accountId:"current"},
  {id:"f4",day:6,label:"CEAPC",amount:255.46,paid:false,debited:false,accountId:"current"},
  {id:"f5",day:9,label:"BPCE Vie",amount:10.73,paid:false,debited:false,accountId:"current"},
  {id:"f6",day:10,label:"MAAF",amount:321.13,paid:false,debited:false,accountId:"current"},
  {id:"f7",day:10,label:"Auto-Journal",amount:7.20,paid:false,debited:false,accountId:"current"},
  {id:"f8",day:10,label:"Orange mobile 2",amount:28.99,paid:false,debited:false,accountId:"current"},
  {id:"f9",day:13,label:"Biba",amount:1.52,paid:false,debited:false,accountId:"current"},
  {id:"f10",day:15,label:"VW Bank",amount:424.83,paid:false,debited:false,accountId:"current"},
  {id:"f11",day:16,label:"DGFIP",amount:257,paid:false,debited:false,accountId:"current"},
  {id:"f12",day:17,label:"Orange mobile 3",amount:13.99,paid:false,debited:false,accountId:"current"},
  {id:"f13",day:20,label:"Free Mobile",amount:9.99,paid:false,debited:false,accountId:"current"},
  {id:"f14",day:20,label:"EDF",amount:174.02,paid:false,debited:false,accountId:"current"},
  {id:"f15",day:21,label:"Engie",amount:109.87,paid:false,debited:false,accountId:"current"},
  {id:"f16",day:23,label:"Orange fibre",amount:72.98,paid:false,debited:false,accountId:"current"},
  {id:"f17",day:null,label:"Ergothérapie",amount:175,paid:false,debited:false,accountId:"current"},
  {id:"f18",day:null,label:"Frais bancaires",amount:21.50,paid:false,debited:false,accountId:"current"}
 ],
 budgets:{Courses:700,Carburant:250,Animaux:150,Santé:80,Ergothérapie:175,Amazon:100,Maison:150,Loisirs:100,Vêtements:100,Autre:100},
 rules:[
  {keyword:"leclerc",category:"Courses"},{keyword:"carrefour",category:"Courses"},{keyword:"intermarché",category:"Courses"},
  {keyword:"intermarche",category:"Courses"},{keyword:"lidl",category:"Courses"},{keyword:"aldi",category:"Courses"},
  {keyword:"total",category:"Carburant"},{keyword:"esso",category:"Carburant"},{keyword:"zooplus",category:"Animaux"},
  {keyword:"maxi zoo",category:"Animaux"},{keyword:"pharmacie",category:"Santé"},{keyword:"amazon",category:"Amazon"},
  {keyword:"ikea",category:"Maison"},{keyword:"leroy merlin",category:"Maison"},{keyword:"orange",category:"Autre"},
  {keyword:"edf",category:"Maison"},{keyword:"engie",category:"Maison"}
 ],
 expenses:[],incomeTransactions:[],transfers:[],deferredCardBatches:[],
 goals:[{id:"g1",name:"Imprévus",target:1000,current:0}],archives:[],settings:{pin:"",darkMode:false}
};

function migrate(saved){
 const d={...clone(initial),...(saved||{})};
 if(!Array.isArray(d.accounts)){
   const oldBalance=Number(d.bankBalance||3346.91);
   d.accounts=clone(initial.accounts);d.accounts[0].balance=oldBalance;
 }
 d.accounts=d.accounts.map((x,i)=>({id:x.id||`a${i}`,name:x.name||"Compte",type:x.type||"current",balance:Number(x.balance||0)}));
 d.fixedCharges=(Array.isArray(d.fixedCharges)?d.fixedCharges:clone(initial.fixedCharges)).map(x=>({...x,paid:Boolean(x.paid),debited:Boolean(x.debited),accountId:x.accountId||"current"}));
 d.expenses=(Array.isArray(d.expenses)?d.expenses:[]).map(x=>({...x,id:x.id||crypto.randomUUID(),amount:Number(x.amount||0),category:x.category||"Autre",date:x.date||today(),paymentMethod:x.paymentMethod||"immediate_card",debited:x.debited!==false,accountId:x.accountId||"current"}));
 d.incomeTransactions=(Array.isArray(d.incomeTransactions)?d.incomeTransactions:[]).map(x=>({...x,id:x.id||crypto.randomUUID(),future:Boolean(x.future),accountId:x.accountId||"current"}));
 d.transfers=Array.isArray(d.transfers)?d.transfers:[];
 d.goals=Array.isArray(d.goals)?d.goals:clone(initial.goals);d.archives=Array.isArray(d.archives)?d.archives:[];d.settings=d.settings&&typeof d.settings==="object"?d.settings:{pin:"",darkMode:false};
 d.budgets=d.budgets&&typeof d.budgets==="object"?d.budgets:clone(initial.budgets);
 d.rules=Array.isArray(d.rules)?d.rules:clone(initial.rules);
 d.dataVersion=DATA_VERSION;
 delete d.bankBalance;
 return d;
}
let data;try{data=migrate(JSON.parse(localStorage.getItem(STORAGE_KEY)))}catch{data=migrate(initial)}
const account=id=>data.accounts.find(x=>x.id===id);
const current=()=>account("current")||data.accounts[0];
function save(){data.dataVersion=DATA_VERSION;localStorage.setItem(STORAGE_KEY,JSON.stringify(data));localStorage.setItem(BACKUP_KEY,JSON.stringify({savedAt:new Date().toISOString(),data}));render()}
function totals(){const inc=data.incomes.reduce((s,x)=>s+Number(x.amount||0),0),fixed=data.fixedCharges.reduce((s,x)=>s+Number(x.amount||0),0),exp=data.expenses.reduce((s,x)=>s+Number(x.amount||0),0);return{inc,fixed,exp,theoretical:inc-fixed,available:inc-fixed-exp}}
function pendingDeferred(){return data.expenses.filter(x=>x.paymentMethod==="deferred_card"&&!x.debited).reduce((s,x)=>s+Number(x.amount||0),0)}
function remainingCharges(){return data.fixedCharges.filter(x=>!x.paid).reduce((s,x)=>s+Number(x.amount||0),0)}
function endMonth(){return Number(current().balance)-pendingDeferred()-remainingCharges()}
function guessCategory(label){const t=(label||"").toLowerCase();return data.rules.find(r=>t.includes(r.keyword.toLowerCase()))?.category||"Autre"}
function fmtDate(v){if(!v)return"";const p=v.split("-");return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:v}
function paymentLabel(x){return x.paymentMethod==="deferred_card"?(x.debited?"CB débitée":"CB en attente"):x.paymentMethod==="cash"?"Espèces":x.paymentMethod==="transfer"?"Virement":x.paymentMethod==="direct_debit"?"Prélèvement":"Carte immédiate"}

function forecastEvents(){
 const now=new Date(),y=now.getFullYear(),m=now.getMonth(),d=now.getDate(),events=[];
 const card=pendingDeferred();if(card>0){let dt=new Date(y,m,4);if(d>4)dt=new Date(y,m+1,4);events.push({date:dt,label:"Débit global CB",amount:-card,type:"Carte différée"})}
 data.fixedCharges.filter(x=>!x.paid&&x.accountId===current().id).forEach(x=>{let due=x.day||28,dt=new Date(y,m,due);if(due<d)dt=new Date(y,m+1,due);events.push({date:dt,label:x.label,amount:-Number(x.amount||0),type:"Prélèvement"})});
 data.incomeTransactions.filter(x=>x.future&&x.accountId===current().id).forEach(x=>{const dt=new Date(x.date+"T12:00:00");if(dt>=now)events.push({date:dt,label:x.label,amount:Number(x.amount||0),type:"Revenu prévu"})});
 return events.sort((a,b)=>a.date-b.date);
}

function render(){
 const t=totals(),def=pendingDeferred();
 $("headerSubtitle").textContent=`Laetitia · ${data.month}`;
 $("available").textContent=euro(t.available);$("available").className=t.available<0?"bad":t.available<300?"warn":"ok";
 $("budgetStatus").textContent=t.available<0?"Budget dépassé":t.available<300?"À surveiller":"Budget disponible";
 $("currentBalanceView").textContent=euro(current().balance);$("deferredView").textContent=euro(def);
 $("savingsBalanceView").textContent=euro(data.accounts.filter(x=>x.type==="savings").reduce((s,x)=>s+x.balance,0));
 $("endMonthView").textContent=euro(endMonth());$("deferredTotal").textContent=euro(def);
 renderSelects();renderAccounts();renderForecast();renderChart();renderGoals();renderCharges();renderHistory();renderSettings();renderAlerts();renderMonthlyStats();renderArchives();applyTheme();
}
function renderSelects(){
 const opts=data.accounts.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");
 ["expenseAccount","incomeAccount","transferFrom","transferTo","importAccount"].forEach(id=>{$(id).innerHTML=opts});
 $("historyAccount").innerHTML=`<option value="">Tous les comptes</option>${opts}`;
 $("historyCategory").innerHTML=`<option value="">Toutes les catégories</option>${Object.keys(data.budgets).map(x=>`<option>${esc(x)}</option>`).join("")}`;
 $("expenseCategory").innerHTML=Object.keys(data.budgets).map(x=>`<option>${esc(x)}</option>`).join("");
}
function renderAccounts(){
 $("accountsSummary").innerHTML=data.accounts.map(x=>`<div class="account-row"><div><b>${esc(x.name)}</b><small>${x.type==="savings"?"Épargne":x.type==="cash"?"Espèces":"Compte bancaire"}</small></div><strong>${euro(x.balance)}</strong></div>`).join("");
}
function renderForecast(){
 const ev=forecastEvents();let running=current().balance;const rows=[{date:new Date(),label:"Solde actuel",amount:0,type:"Départ",balance:running}];
 ev.forEach(e=>{running=Number((running+e.amount).toFixed(2));rows.push({...e,balance:running})});
 $("forecastStart").textContent=euro(current().balance);$("forecastEnd").textContent=euro(running);$("forecastEnd").className=running<0?"bad":running<300?"warn":"ok";
 $("forecastTimeline").innerHTML=rows.map((x,i)=>`<div class="timeline-item"><div class="timeline-date">${i===0?"Aujourd’hui":x.date.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})}</div><div class="timeline-main"><b>${esc(x.label)}</b><small>${esc(x.type)}${x.amount?` · ${x.amount>0?"+":""}${euro(x.amount)}`:""}</small></div><div class="timeline-balance ${x.balance<0?"bad":x.balance<300?"warn":""}">${euro(x.balance)}</div></div>`).join("");
}
function renderChart(){
 const sums={};data.expenses.forEach(x=>sums[x.category]=(sums[x.category]||0)+x.amount);const max=Math.max(1,...Object.values(sums));
 $("categoryChart").innerHTML=Object.entries(sums).sort((a,b)=>b[1]-a[1]).map(([cat,val])=>`<div class="chart-row"><div class="chart-head"><b>${esc(cat)}</b><span>${euro(val)}</span></div><div class="chart-track"><div class="chart-fill" style="width:${val/max*100}%"></div></div></div>`).join("")||'<p class="muted">Aucune dépense ce mois-ci.</p>';
}
function renderGoals(){
 $("goalsSummary").innerHTML=data.goals.map(g=>{const pct=g.target?Math.min(100,g.current/g.target*100):0;return`<div class="goal"><div class="goal-head"><div><b>${esc(g.name)}</b><small>${euro(g.current)} sur ${euro(g.target)}</small></div><span>${Math.round(pct)} %</span></div><div class="chart-track"><div class="chart-fill" style="width:${pct}%"></div></div></div>`}).join("");
}
function renderCharges(){
 $("chargesList").innerHTML=data.fixedCharges.map(x=>`<button class="charge-button ${x.paid?"paid":""}" data-charge="${x.id}"><div class="charge-row"><div><b>${esc(x.label)}</b><small>${x.day?`Le ${x.day}`:"Date variable"}</small></div><div><strong>${euro(x.amount)}</strong><small>${x.paid?"Payé":"À payer"}</small></div></div></button>`).join("");
}
function renderHistory(){
 const q=$("search").value.toLowerCase(),acc=$("historyAccount").value,cat=$("historyCategory").value;
 const ops=[...data.expenses.map(x=>({...x,type:"expense"})),...data.incomeTransactions.map(x=>({...x,type:"income",category:"Revenu"})),...data.transfers.map(x=>({...x,type:"transfer",category:"Virement"}))]
 .filter(x=>(!q||x.label.toLowerCase().includes(q))&&(!acc||x.accountId===acc||x.fromAccountId===acc||x.toAccountId===acc)&&(!cat||x.category===cat))
 .sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 $("historyList").innerHTML=ops.length?ops.map(x=>`<div class="history-row"><div><b>${x.type==="income"?"➕ ":x.type==="transfer"?"🔁 ":""}${esc(x.label)}</b><small>${esc(x.category)} · ${fmtDate(x.date)}${x.type==="expense"?" · "+paymentLabel(x):""}</small></div><div><strong class="${x.type==="income"?"ok":""}">${x.type==="income"?"+":""}${euro(x.amount)}</strong><br><button class="delete-btn" data-${x.type}="${x.id}">Suppr.</button></div></div>`).join(""):'<p class="muted">Aucune opération.</p>';
}
function renderSettings(){
 $("accountSettings").innerHTML=data.accounts.map((x,i)=>`<div class="edit-row"><input data-account-name="${i}" value="${esc(x.name)}"><input data-account-balance="${i}" type="number" step="0.01" value="${x.balance}"><button class="delete-btn" data-account-delete="${i}">✕</button></div>`).join("");
 $("incomeSettings").innerHTML=data.incomes.map((x,i)=>`<div class="edit-row"><input data-income-label="${i}" value="${esc(x.label)}"><input data-income-amount="${i}" type="number" step="0.01" value="${x.amount}"><button class="delete-btn" data-income-delete="${i}">✕</button></div>`).join("");
 $("chargeSettings").innerHTML=data.fixedCharges.map((x,i)=>`<div class="edit-row four"><input data-charge-day="${i}" type="number" value="${x.day??""}" placeholder="Jour"><input data-charge-label="${i}" value="${esc(x.label)}"><input data-charge-amount="${i}" type="number" step="0.01" value="${x.amount}"><button class="delete-btn" data-charge-delete="${i}">✕</button></div>`).join("");
 $("budgetSettings").innerHTML=Object.entries(data.budgets).map(([k,v])=>`<div class="edit-row"><input value="${esc(k)}" readonly><input data-budget="${esc(k)}" type="number" step="0.01" value="${v}"><span></span></div>`).join("");
 $("goalSettings").innerHTML=data.goals.map((g,i)=>`<div class="edit-row goal-edit"><input data-goal-name="${i}" value="${esc(g.name)}"><input data-goal-target="${i}" type="number" step="0.01" value="${g.target}"><input data-goal-current="${i}" type="number" step="0.01" value="${g.current}"><button class="delete-btn" data-goal-delete="${i}">✕</button></div>`).join("");
}


function monthKey(dateStr){return String(dateStr||today()).slice(0,7)}
function renderAlerts(){
 const alerts=[];
 Object.entries(data.budgets).forEach(([cat,limit])=>{
   const spent=data.expenses.filter(x=>x.category===cat).reduce((s,x)=>s+Number(x.amount||0),0);
   const pct=limit?spent/limit*100:0;
   if(pct>=100)alerts.push({cls:"danger",text:`${cat} dépassé : ${euro(spent)} sur ${euro(limit)}`});
   else if(pct>=80)alerts.push({cls:"warning",text:`${cat} atteint ${Math.round(pct)} %`});
 });
 if(endMonth()<0)alerts.unshift({cls:"danger",text:`Fin de mois prévue négative : ${euro(endMonth())}`});
 $("budgetAlerts").innerHTML=alerts.length?alerts.map(a=>`<div class="alert-item ${a.cls}">${esc(a.text)}</div>`).join(""):'<div class="alert-item">Aucune alerte pour le moment.</div>';
}
function statsByMonth(){
 const map={};
 data.expenses.forEach(x=>{const k=monthKey(x.date);map[k]=(map[k]||0)+Number(x.amount||0)});
 data.archives.forEach(a=>{if(a.month&&!map[a.month])map[a.month]=Number(a.expensesTotal||0)});
 const months=[];
 const now=new Date();
 for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;months.push({key:k,label:d.toLocaleDateString("fr-FR",{month:"short"}),value:map[k]||0})}
 return months;
}
function renderMonthlyStats(){
 const rows=statsByMonth(),max=Math.max(1,...rows.map(x=>x.value));
 $("monthlyStats").innerHTML=`<div class="month-chart">${rows.map(x=>`<div class="month-col"><b>${x.value?Math.round(x.value):""}</b><div class="month-bar" style="height:${Math.max(3,x.value/max*130)}px"></div><small>${esc(x.label)}</small></div>`).join("")}</div>`;
}
function renderArchives(){
 $("archivesList").innerHTML=data.archives.length?data.archives.slice().reverse().map(a=>`<div class="archive-row"><div><b>${esc(a.label||a.month)}</b><small>Dépenses ${euro(a.expensesTotal)} · Solde ${euro(a.closingBalance)}</small></div><button data-archive-delete="${a.id}">✕</button></div>`).join(""):'<p class="muted">Aucune archive.</p>';
}
function applyTheme(){
 document.body.classList.toggle("dark",Boolean(data.settings.darkMode));
 $("darkModeToggle").checked=Boolean(data.settings.darkMode);
}
function lockIfNeeded(){
 if(data.settings.pin){
   $("lockScreen").hidden=false;
   document.body.style.overflow="hidden";
 }else{
   $("lockScreen").hidden=true;
   document.body.style.overflow="";
 }
}
function csvEscape(v){const s=String(v??"");return /[;"\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
document.querySelectorAll(".bottom-nav button").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".bottom-nav button").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.tab).classList.add("active")}));
$("expenseLabel").addEventListener("input",()=>{const c=guessCategory($("expenseLabel").value);$("expenseCategory").value=c;$("categorySuggestion").innerHTML=`Catégorie proposée : <b>${esc(c)}</b>`});
$("saveExpense").addEventListener("click",()=>{const amount=Number($("expenseAmount").value),method=$("paymentMethod").value,accountId=$("expenseAccount").value;if(!amount||amount<=0)return alert("Montant invalide.");const deferred=method==="deferred_card";data.expenses.unshift({id:crypto.randomUUID(),amount,label:$("expenseLabel").value.trim()||"Dépense",category:$("expenseCategory").value,date:$("expenseDate").value,paymentMethod:method,debited:!deferred,accountId});if(!deferred){const a=account(accountId);a.balance=Number((a.balance-amount).toFixed(2))}$("expenseAmount").value="";$("expenseLabel").value="";save()});
$("futureIncome").addEventListener("change",()=>{$("futureDateBlock").hidden=!$("futureIncome").checked});
$("saveIncome").addEventListener("click",()=>{const amount=Number($("incomeAmount").value),future=$("futureIncome").checked,accountId=$("incomeAccount").value;if(!amount||amount<=0)return alert("Montant invalide.");const date=future?$("futureIncomeDate").value:today();data.incomeTransactions.unshift({id:crypto.randomUUID(),amount,label:$("incomeLabel").value.trim()||"Revenu",date,future,accountId});if(!future)account(accountId).balance=Number((account(accountId).balance+amount).toFixed(2));$("incomeAmount").value="";$("incomeLabel").value="";save()});
$("saveTransfer").addEventListener("click",()=>{const amount=Number($("transferAmount").value),from=$("transferFrom").value,to=$("transferTo").value;if(!amount||amount<=0||from===to)return alert("Virement invalide.");account(from).balance-=amount;account(to).balance+=amount;data.transfers.unshift({id:crypto.randomUUID(),amount,label:`${account(from).name} → ${account(to).name}`,date:today(),fromAccountId:from,toAccountId:to});save()});
$("applyDeferredDebit").addEventListener("click",()=>{const total=pendingDeferred();if(total<=0)return alert("Aucune CB en attente.");current().balance=Number((current().balance-total).toFixed(2));data.expenses=data.expenses.map(x=>x.paymentMethod==="deferred_card"&&!x.debited?{...x,debited:true}:x);save()});
["search","historyAccount","historyCategory"].forEach(id=>$(id).addEventListener("input",renderHistory));

let importRows=[];
$("parseCsv").addEventListener("click",()=>{const file=$("csvFile").files?.[0];if(!file)return alert("Choisis un fichier CSV.");const reader=new FileReader();reader.onload=()=>{importRows=parseCsvText(String(reader.result));renderImportPreview()};reader.readAsText(file,"utf-8")});
function parseCsvText(text){
 const lines=text.split(/\r?\n/).filter(Boolean),rows=[];for(const line of lines.slice(1)){const cells=line.split(/[;,]/).map(x=>x.replace(/^"|"$/g,"").trim());const date=cells.find(x=>/^\d{2}[\/-]\d{2}[\/-]\d{2,4}$/.test(x))||today();const nums=cells.map(x=>Number(x.replace(/\s/g,"").replace(",", "."))).filter(x=>!Number.isNaN(x));const amount=nums.length?nums[nums.length-1]:0;const label=cells.find(x=>x.length>3&&!/^\d/.test(x))||"Opération";if(amount)rows.push({id:crypto.randomUUID(),selected:true,date:date.includes("/")?date.split("/").reverse().join("-"):date,label,amount:Math.abs(amount),direction:amount<0?"expense":"income",category:guessCategory(label)})}return rows}
function renderImportPreview(){if(!importRows.length){$("importStatus").hidden=false;$("importStatus").textContent="Aucune opération reconnue.";return}$("importPreviewCard").hidden=false;$("importPreview").innerHTML=importRows.map((r,i)=>`<div class="import-row"><div class="import-row-top"><label class="checkline"><input data-import-select="${i}" type="checkbox" ${r.selected?"checked":""}> ${esc(r.label)}</label><b>${euro(r.amount)}</b></div><small>${fmtDate(r.date)} · ${r.direction==="expense"?"Dépense":"Revenu"}</small><select data-import-category="${i}">${Object.keys(data.budgets).map(c=>`<option ${c===r.category?"selected":""}>${esc(c)}</option>`).join("")}</select></div>`).join("")}
$("confirmImport").addEventListener("click",()=>{const accountId=$("importAccount").value;importRows.filter(x=>x.selected).forEach(r=>{if(r.direction==="expense"){data.expenses.unshift({id:r.id,amount:r.amount,label:r.label,category:r.category,date:r.date,paymentMethod:"immediate_card",debited:true,accountId});account(accountId).balance-=r.amount}else{data.incomeTransactions.unshift({id:r.id,amount:r.amount,label:r.label,date:r.date,future:false,accountId});account(accountId).balance+=r.amount}});importRows=[];$("importPreviewCard").hidden=true;save();alert("Import terminé.")});

document.addEventListener("click",e=>{const ad=e.target.closest("[data-archive-delete]")?.dataset.archiveDelete;if(ad){data.archives=data.archives.filter(x=>x.id!==ad);save();return}
 const ch=e.target.closest("[data-charge]")?.dataset.charge;if(ch){data.fixedCharges=data.fixedCharges.map(x=>{if(x.id!==ch)return x;const a=account(x.accountId||"current");if(!x.paid){a.balance-=x.amount;return{...x,paid:true,debited:true}}if(x.debited)a.balance+=x.amount;return{...x,paid:false,debited:false}});save()}
 for(const type of["expense","income","transfer"]){const id=e.target.closest(`[data-${type}]`)?.dataset[type];if(id){if(type==="expense"){const x=data.expenses.find(y=>y.id===id);if(x&&x.debited)account(x.accountId).balance+=x.amount;data.expenses=data.expenses.filter(y=>y.id!==id)}if(type==="income"){const x=data.incomeTransactions.find(y=>y.id===id);if(x&&!x.future)account(x.accountId).balance-=x.amount;data.incomeTransactions=data.incomeTransactions.filter(y=>y.id!==id)}if(type==="transfer"){const x=data.transfers.find(y=>y.id===id);if(x){account(x.fromAccountId).balance+=x.amount;account(x.toAccountId).balance-=x.amount}data.transfers=data.transfers.filter(y=>y.id!==id)}save()}}
 [["accountDelete","accounts"],["incomeDelete","incomes"],["chargeDelete","fixedCharges"],["goalDelete","goals"]].forEach(([k,arr])=>{const i=e.target.closest(`[data-${k.replace(/[A-Z]/g,m=>"-"+m.toLowerCase())}]`)?.dataset[k];if(i!==undefined){data[arr].splice(Number(i),1);save()}});
});
document.addEventListener("change",e=>{const d=e.target.dataset;if(d.accountName!==undefined)data.accounts[+d.accountName].name=e.target.value;if(d.accountBalance!==undefined)data.accounts[+d.accountBalance].balance=Number(e.target.value)||0;if(d.incomeLabel!==undefined)data.incomes[+d.incomeLabel].label=e.target.value;if(d.incomeAmount!==undefined)data.incomes[+d.incomeAmount].amount=Number(e.target.value)||0;if(d.chargeDay!==undefined)data.fixedCharges[+d.chargeDay].day=e.target.value===""?null:Number(e.target.value);if(d.chargeLabel!==undefined)data.fixedCharges[+d.chargeLabel].label=e.target.value;if(d.chargeAmount!==undefined)data.fixedCharges[+d.chargeAmount].amount=Number(e.target.value)||0;if(d.budget!==undefined)data.budgets[d.budget]=Number(e.target.value)||0;if(d.goalName!==undefined)data.goals[+d.goalName].name=e.target.value;if(d.goalTarget!==undefined)data.goals[+d.goalTarget].target=Number(e.target.value)||0;if(d.goalCurrent!==undefined)data.goals[+d.goalCurrent].current=Number(e.target.value)||0;if(d.importSelect!==undefined)importRows[+d.importSelect].selected=e.target.checked;if(d.importCategory!==undefined)importRows[+d.importCategory].category=e.target.value;if(Object.keys(d).length&&!d.importSelect&&!d.importCategory)save()});
$("addAccount").addEventListener("click",()=>{data.accounts.push({id:crypto.randomUUID(),name:"Nouveau compte",type:"savings",balance:0});save()});$("addMonthlyIncome").addEventListener("click",()=>{data.incomes.push({id:crypto.randomUUID(),label:"Nouveau revenu",amount:0});save()});$("addCharge").addEventListener("click",()=>{data.fixedCharges.push({id:crypto.randomUUID(),day:null,label:"Nouveau prélèvement",amount:0,paid:false,debited:false,accountId:"current"});save()});$("addGoal").addEventListener("click",()=>{data.goals.push({id:crypto.randomUUID(),name:"Nouvel objectif",target:500,current:0});save()});

$("savePin").addEventListener("click",()=>{
 const pin=$("pinSetting").value.trim();
 if(!/^\d{4,6}$/.test(pin))return alert("Choisis un code de 4 à 6 chiffres.");
 data.settings.pin=pin;$("pinSetting").value="";save();alert("Code PIN enregistré.");
});
$("removePin").addEventListener("click",()=>{data.settings.pin="";save();alert("Code PIN supprimé.")});
$("unlockApp").addEventListener("click",()=>{
 if($("pinInput").value===data.settings.pin){$("lockScreen").hidden=true;document.body.style.overflow="";$("pinInput").value="";$("pinMessage").textContent=""}
 else{$("pinMessage").textContent="Code incorrect."}
});
$("pinInput").addEventListener("keydown",e=>{if(e.key==="Enter")$("unlockApp").click()});
$("darkModeToggle").addEventListener("change",()=>{data.settings.darkMode=$("darkModeToggle").checked;save()});
$("archiveMonth").addEventListener("click",()=>{
 const key=new Date().toISOString().slice(0,7);
 const expensesTotal=data.expenses.filter(x=>monthKey(x.date)===key).reduce((s,x)=>s+Number(x.amount||0),0);
 const archive={id:crypto.randomUUID(),month:key,label:new Date().toLocaleDateString("fr-FR",{month:"long",year:"numeric"}),expensesTotal,closingBalance:current().balance,createdAt:new Date().toISOString()};
 data.archives=data.archives.filter(x=>x.month!==key);data.archives.push(archive);save();alert("Mois archivé.");
});
$("exportCsv").addEventListener("click",()=>{
 const rows=[["Date","Type","Libellé","Catégorie","Montant","Compte","Paiement"]];
 data.expenses.forEach(x=>rows.push([x.date,"Dépense",x.label,x.category,-Number(x.amount),account(x.accountId)?.name||"",paymentLabel(x)]));
 data.incomeTransactions.forEach(x=>rows.push([x.date,"Revenu",x.label,"Revenu",Number(x.amount),account(x.accountId)?.name||"",x.future?"Prévu":"Reçu"]));
 data.transfers.forEach(x=>rows.push([x.date,"Virement",x.label,"Virement",Number(x.amount),"",""]));
 const csv="\ufeff"+rows.map(r=>r.map(csvEscape).join(";")).join("\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="budget_laetitia_operations.csv";a.click();
});

$("exportData").addEventListener("click",()=>{const blob=new Blob([JSON.stringify({app:"Budget Familial Laetitia",version:"8.0.0",data},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="budget_laetitia_v8.json";a.click()});
$("importDataBtn").addEventListener("click",()=>$("importDataFile").click());$("importDataFile").addEventListener("change",e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const p=JSON.parse(String(r.result));data=migrate(p.data||p);save();alert("Sauvegarde restaurée.")}catch{alert("Fichier invalide.")}};r.readAsText(f)});
$("restoreAutoBackup").addEventListener("click",()=>{try{const raw=localStorage.getItem(BACKUP_KEY);data=migrate(JSON.parse(raw).data);save()}catch{alert("Aucune sauvegarde.")}});
$("resetApp").addEventListener("click",()=>{if(confirm("Réinitialiser ?")){data=migrate(initial);save()}});

$("expenseDate").value=today();$("futureIncomeDate").value=today();save();lockIfNeeded();
if("caches"in window)caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).catch(()=>{});
fetch("./version.json?t="+Date.now(),{cache:"no-store"}).then(r=>r.json()).then(v=>{if(location.search!==`?v=${v.version}`)location.replace(`${location.pathname}?v=${v.version}`)}).catch(()=>{});
})();
