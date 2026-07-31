(()=>{
"use strict";
const STORAGE_KEY="budget-familial-laetitia-final-v1",BACKUP_KEY=STORAGE_KEY+"-backup",DATA_VERSION=300;
const $=id=>document.getElementById(id),clone=o=>JSON.parse(JSON.stringify(o));
const euro=n=>Number(n||0).toLocaleString("fr-FR",{style:"currency",currency:"EUR"});
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const today=()=>new Date().toISOString().slice(0,10);
const fmtDate=v=>{if(!v)return"";const p=v.split("-");return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:v};

const initial={
 month:"Août 2026",
 accounts:[{id:"current",name:"Compte courant",type:"current",balance:3346.91},{id:"savings",name:"Épargne",type:"savings",balance:0},{id:"cash",name:"Espèces",type:"cash",balance:0}],
 incomes:[{id:"r1",label:"Salaire Jeff",amount:1450},{id:"r2",label:"MSA invalidité",amount:867.92},{id:"r3",label:"MSA prestations",amount:839.98},{id:"r4",label:"CCPMA prévoyance",amount:660.08},{id:"r5",label:"Participation Maëva assurance voiture",amount:130}],
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
 budgets:{Courses:700,Carburant:250,Animaux:150,Santé:80,Ergothérapie:175,Amazon:100,Maison:150,Loisirs:100,Vêtements:100,Famille:150,Voiture:150,Vinted:100,Autre:100},
 rules:[
  {keyword:"leclerc",category:"Courses"},{keyword:"carrefour",category:"Courses"},{keyword:"intermarché",category:"Courses"},{keyword:"lidl",category:"Courses"},{keyword:"aldi",category:"Courses"},
  {keyword:"total",category:"Carburant"},{keyword:"esso",category:"Carburant"},{keyword:"zooplus",category:"Animaux"},{keyword:"maxi zoo",category:"Animaux"},
  {keyword:"pharmacie",category:"Santé"},{keyword:"amazon",category:"Amazon"},{keyword:"ikea",category:"Maison"},{keyword:"leroy merlin",category:"Maison"},
  {keyword:"orange",category:"Autre"},{keyword:"edf",category:"Maison"},{keyword:"engie",category:"Maison"},{keyword:"vinted",category:"Vinted"}
 ],
 expenses:[],incomeTransactions:[],transfers:[],deferredCardBatches:[],goals:[{id:"g1",name:"Imprévus",target:1000,current:0}],archives:[],settings:{darkMode:false,activeProfileId:"p1"},profiles:[{id:"p1",name:"Laetitia"}],vaultDocuments:[],loans:[]
};
function migrate(saved){
 const d={...clone(initial),...(saved||{})};
 if(!Array.isArray(d.accounts)){const old=Number(d.bankBalance||3346.91);d.accounts=clone(initial.accounts);d.accounts[0].balance=old}
 d.accounts=d.accounts.map((x,i)=>({id:x.id||`a${i}`,name:x.name||"Compte",type:x.type||"current",balance:Number(x.balance||0)}));
 d.fixedCharges=(Array.isArray(d.fixedCharges)?d.fixedCharges:clone(initial.fixedCharges)).map(x=>({...x,paid:Boolean(x.paid),debited:Boolean(x.debited),accountId:x.accountId||"current",profileId:x.profileId||"p1"}));
 d.expenses=(Array.isArray(d.expenses)?d.expenses:[]).map(x=>({...x,id:x.id||crypto.randomUUID(),amount:Number(x.amount||0),category:x.category||"Autre",date:x.date||today(),paymentMethod:x.paymentMethod||"immediate_card",debited:x.debited!==false,accountId:x.accountId||"current",profileId:x.profileId||"p1"}));
 d.incomeTransactions=(Array.isArray(d.incomeTransactions)?d.incomeTransactions:[]).map(x=>({...x,id:x.id||crypto.randomUUID(),future:Boolean(x.future),accountId:x.accountId||"current",profileId:x.profileId||"p1"}));
 d.transfers=Array.isArray(d.transfers)?d.transfers:[];d.goals=Array.isArray(d.goals)?d.goals:clone(initial.goals);d.archives=Array.isArray(d.archives)?d.archives:[];
 d.budgets=d.budgets&&typeof d.budgets==="object"?d.budgets:clone(initial.budgets);d.rules=Array.isArray(d.rules)?d.rules:clone(initial.rules);d.profiles=Array.isArray(d.profiles)&&d.profiles.length?d.profiles:[{id:"p1",name:"Laetitia"}];d.vaultDocuments=Array.isArray(d.vaultDocuments)?d.vaultDocuments:[];d.loans=Array.isArray(d.loans)?d.loans:[];d.settings={darkMode:Boolean(d.settings?.darkMode),activeProfileId:d.settings?.activeProfileId||d.profiles[0].id};d.dataVersion=DATA_VERSION;delete d.bankBalance;return d;
}
let data;try{data=migrate(JSON.parse(localStorage.getItem(STORAGE_KEY)))}catch{data=migrate(initial)}
const account=id=>data.accounts.find(x=>x.id===id),current=()=>account("current")||data.accounts[0];
function save(){data.dataVersion=DATA_VERSION;localStorage.setItem(STORAGE_KEY,JSON.stringify(data));localStorage.setItem(BACKUP_KEY,JSON.stringify({savedAt:new Date().toISOString(),data}));render()}
function totals(){const inc=data.incomes.reduce((s,x)=>s+Number(x.amount||0),0),fixed=data.fixedCharges.reduce((s,x)=>s+Number(x.amount||0),0),exp=data.expenses.reduce((s,x)=>s+Number(x.amount||0),0);return{inc,fixed,exp,theoretical:inc-fixed,available:inc-fixed-exp}}
function pendingDeferred(){return data.expenses.filter(x=>x.paymentMethod==="deferred_card"&&!x.debited).reduce((s,x)=>s+Number(x.amount||0),0)}
function remainingCharges(){return data.fixedCharges.filter(x=>!x.paid).reduce((s,x)=>s+Number(x.amount||0),0)}
function endMonth(){return Number(current().balance)-pendingDeferred()-remainingCharges()}
function guessCategory(label){const t=(label||"").toLowerCase();return data.rules.find(r=>t.includes(r.keyword.toLowerCase()))?.category||"Autre"}
function paymentLabel(x){return x.paymentMethod==="deferred_card"?(x.debited?"CB débitée":"CB en attente"):x.paymentMethod==="cash"?"Espèces":x.paymentMethod==="transfer"?"Virement":x.paymentMethod==="direct_debit"?"Prélèvement":"Carte immédiate"}
function monthKey(v){return String(v||today()).slice(0,7)}
function nextIncomeAmount(){const futures=data.incomeTransactions.filter(x=>x.future&&new Date(x.date+"T12:00:00")>=new Date()).sort((a,b)=>a.date.localeCompare(b.date));if(!futures.length)return totals().available;const until=futures[0].date;const expenses=data.expenses.filter(x=>x.date<=until).reduce((s,x)=>s+x.amount,0);return totals().theoretical-expenses}

function forecastEvents(){
 const now=new Date(),y=now.getFullYear(),m=now.getMonth(),d=now.getDate(),events=[],card=pendingDeferred();
 if(card>0){let dt=new Date(y,m,4);if(d>4)dt=new Date(y,m+1,4);events.push({date:dt,label:"Débit global CB",amount:-card,type:"Carte différée"})}
 data.fixedCharges.filter(x=>!x.paid&&x.accountId===current().id).forEach(x=>{let due=x.day||28,dt=new Date(y,m,due);if(due<d)dt=new Date(y,m+1,due);events.push({date:dt,label:x.label,amount:-Number(x.amount||0),type:"Prélèvement"})});
 data.incomeTransactions.filter(x=>x.future&&x.accountId===current().id).forEach(x=>{const dt=new Date(x.date+"T12:00:00");if(dt>=now)events.push({date:dt,label:x.label,amount:Number(x.amount||0),type:"Revenu prévu"})});
 return events.sort((a,b)=>a.date-b.date);
}
let calendarDate=new Date(),selectedCalendarDate=today(),importRows=[];

function render(){
 const t=totals(),def=pendingDeferred();
 $("headerSubtitle").textContent=`Laetitia · ${data.month}`;$("available").textContent=euro(t.available);$("available").className=t.available<0?"bad":t.available<300?"warn":"ok";$("budgetStatus").textContent=t.available<0?"Budget dépassé":t.available<300?"À surveiller":"Budget disponible";
 $("currentBalanceView").textContent=euro(current().balance);$("deferredView").textContent=euro(def);$("untilIncomeView").textContent=euro(nextIncomeAmount());$("endMonthView").textContent=euro(endMonth());$("deferredTotal").textContent=euro(def);
 renderSelects();renderProfiles();renderAccounts();renderV300Dashboard();renderV100Dashboard();renderAlerts();renderSmartSummary();renderV30Insights();renderSubscriptions();renderForecast();renderChart();renderMonthlyStats();renderGoals();renderCalendar();renderHistory();renderLoans();renderVault();renderSettings();renderProfileSettings();renderCategorySettings();renderRuleSettings();renderDataQuality();applyTheme();
}
function renderSelects(){
 const opts=data.accounts.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");["expenseAccount","incomeAccount","transferFrom","transferTo","importAccount"].forEach(id=>$(id).innerHTML=opts);
 $("historyAccount").innerHTML=`<option value="">Tous les comptes</option>${opts}`;$("historyCategory").innerHTML=`<option value="">Toutes les catégories</option>${Object.keys(data.budgets).map(x=>`<option>${esc(x)}</option>`).join("")}`;$("expenseCategory").innerHTML=Object.keys(data.budgets).map(x=>`<option>${esc(x)}</option>`).join("");
}

function daysLeftInMonth(){
 const now=new Date();
 const end=new Date(now.getFullYear(),now.getMonth()+1,0);
 return Math.max(1,end.getDate()-now.getDate()+1);
}
function weeksLeftInMonth(){return Math.max(1,daysLeftInMonth()/7)}
function nextUnpaidCharge(){
 const day=new Date().getDate();
 const upcoming=data.fixedCharges.filter(x=>!x.paid).map(x=>({...x,sortDay:(x.day||28)<day?(x.day||28)+31:(x.day||28)})).sort((a,b)=>a.sortDay-b.sortDay);
 return upcoming[0]||null;
}
function nextFutureIncome(){
 return data.incomeTransactions.filter(x=>x.future&&new Date(x.date+"T23:59:59")>=new Date()).sort((a,b)=>a.date.localeCompare(b.date))[0]||null;
}
function renderSmartSummary(){
 const t=totals();
 const projected=endMonth();
 const charge=nextUnpaidCharge();
 const income=nextFutureIncome();
 const weekly=t.available/weeksLeftInMonth();

 $("weeklyBudgetView").textContent=euro(weekly);

 if(charge){
   $("nextChargeName").textContent=charge.label;
   $("nextChargeInfo").textContent=`Le ${charge.day||28} · ${euro(charge.amount)}`;
 }else{
   $("nextChargeName").textContent="Aucun";
   $("nextChargeInfo").textContent="Tout est marqué payé";
 }

 if(income){
   $("nextIncomeName").textContent=income.label;
   $("nextIncomeInfo").textContent=`${fmtDate(income.date)} · ${euro(income.amount)}`;
 }else{
   $("nextIncomeName").textContent="Non renseigné";
   $("nextIncomeInfo").textContent="Ajoute un revenu futur";
 }

 const card=$("smartInsightCard");
 card.classList.remove("positive","warning","danger");
 let icon="✅",title="Budget sous contrôle",text="La situation du mois est correcte.";

 if(projected<0){
   card.classList.add("danger");
   icon="🚨";title="Risque de découvert";
   text=`La fin de mois est estimée à ${euro(projected)}. Vérifie les prélèvements et les dépenses à venir.`;
 }else if(projected<300){
   card.classList.add("warning");
   icon="⚠️";title="Marge assez faible";
   text=`Il resterait environ ${euro(projected)} à la fin du mois. Le budget hebdomadaire conseillé est de ${euro(weekly)}.`;
 }else{
   card.classList.add("positive");
   const difference=projected-300;
   icon="🟢";title="Vous gardez une marge";
   text=`La fin de mois est estimée à ${euro(projected)}, soit ${euro(difference)} au-dessus de la marge de sécurité de 300 €.`;
 }
 $("smartInsightIcon").textContent=icon;
 $("smartInsightTitle").textContent=title;
 $("smartInsightText").textContent=text;
}


function currentMonthExpenseTotal(){
 const key=new Date().toISOString().slice(0,7);
 return data.expenses.filter(x=>operationBelongsToActive(x)&&monthKey(x.date)===key).reduce((s,x)=>s+Number(x.amount||0),0);
}
function previousMonthExpenseTotal(){
 const now=new Date();
 const d=new Date(now.getFullYear(),now.getMonth()-1,1);
 const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
 const direct=data.expenses.filter(x=>operationBelongsToActive(x)&&monthKey(x.date)===key).reduce((s,x)=>s+Number(x.amount||0),0);
 const archived=data.archives.find(a=>a.month===key)?.expensesTotal||0;
 return direct||archived;
}
function categoryMonthlyAverages(){
 const byMonth={};
 data.expenses.filter(operationBelongsToActive).forEach(x=>{
   const key=monthKey(x.date);
   byMonth[key]=byMonth[key]||{};
   byMonth[key][x.category]=(byMonth[key][x.category]||0)+Number(x.amount||0);
 });
 const months=Object.keys(byMonth);
 const result={};
 Object.keys(data.budgets).forEach(cat=>{
   const values=months.map(m=>byMonth[m][cat]||0);
   result[cat]=values.length?values.reduce((s,v)=>s+v,0)/values.length:0;
 });
 return result;
}
function duplicateGroups(){
 const map={};
 data.expenses.filter(operationBelongsToActive).forEach(x=>{
   const key=`${String(x.date)}|${String(x.label).trim().toLowerCase()}|${Number(x.amount).toFixed(2)}|${x.accountId||""}`;
   map[key]=map[key]||[];
   map[key].push(x);
 });
 return Object.values(map).filter(group=>group.length>1);
}
function financialHealthScore(){
 const t=totals();
 const projected=endMonth();
 const fixedRatio=t.inc?Math.min(1,t.fixed/t.inc):1;
 const variableRatio=t.theoretical>0?Math.min(1,t.exp/t.theoretical):1;
 const safetyRatio=Math.max(0,Math.min(1,projected/1000));
 const overdueRisk=data.fixedCharges.some(x=>!x.paid&&(x.day||28)<new Date().getDate())?1:0;
 const duplicates=Math.min(1,duplicateGroups().length/3);

 let score=100;
 score-=fixedRatio*28;
 score-=variableRatio*25;
 score-=(1-safetyRatio)*27;
 score-=overdueRisk*12;
 score-=duplicates*8;
 if(projected<0)score-=18;
 return Math.max(0,Math.min(100,Math.round(score)));
}
function possibleSavingsEstimate(){
 const projected=Math.max(0,endMonth());
 return Math.max(0,Math.floor((projected-300)/10)*10);
}
function renderV30Insights(){
 const score=financialHealthScore();
 const ring=$("healthScoreRing");
 let color="#278b57",text="Situation saine";
 if(score<70){color="#bf7700";text="Quelques points à surveiller";}
 if(score<45){color="#ce3f3f";text="Budget à sécuriser rapidement";}
 ring.style.setProperty("--score-angle",`${score*3.6}deg`);
 ring.style.setProperty("--score-color",color);
 $("healthScore").textContent=score;
 $("healthScoreText").textContent=text;

 const daily=Math.max(0,totals().available/daysLeftInMonth());
 $("dailyBudgetView").textContent=euro(daily);
 $("dailyBudgetInfo").textContent=`sur ${daysLeftInMonth()} jour${daysLeftInMonth()>1?"s":""}`;

 const t=totals();
 const fixedPct=t.inc?t.fixed/t.inc*100:0;
 const variablePct=t.theoretical>0?t.exp/t.theoretical*100:0;
 $("fixedAnalysis").textContent=euro(t.fixed);
 $("fixedShare").textContent=`${Math.round(fixedPct)} % des revenus`;
 $("variableAnalysis").textContent=euro(t.exp);
 $("variableShare").textContent=`${Math.round(variablePct)} % du disponible`;
 $("possibleSavings").textContent=euro(possibleSavingsEstimate());

 const advice=[];
 const currentTotal=currentMonthExpenseTotal();
 const previousTotal=previousMonthExpenseTotal();
 if(previousTotal>0){
   const diff=(currentTotal-previousTotal)/previousTotal*100;
   if(diff>15)advice.push({icon:"📈",level:"warning",title:"Dépenses en hausse",text:`Les dépenses du mois sont supérieures de ${Math.round(diff)} % au mois précédent.`});
   else if(diff<-10)advice.push({icon:"👏",level:"",title:"Bonne amélioration",text:`Les dépenses sont inférieures de ${Math.abs(Math.round(diff))} % au mois précédent.`});
 }
 const averages=categoryMonthlyAverages();
 Object.entries(data.budgets).forEach(([cat,limit])=>{
   const spent=data.expenses.filter(x=>x.category===cat&&monthKey(x.date)===new Date().toISOString().slice(0,7)).reduce((s,x)=>s+x.amount,0);
   const avg=averages[cat]||0;
   if(avg>0&&spent>avg*1.2)advice.push({icon:"🔎",level:"warning",title:`${cat} au-dessus de l’habitude`,text:`${euro(spent)} ce mois-ci contre une moyenne de ${euro(avg)}.`});
   if(limit>0&&spent>limit)advice.push({icon:"🚨",level:"danger",title:`Budget ${cat} dépassé`,text:`Dépassement de ${euro(spent-limit)}.`});
 });
 const dupCount=duplicateGroups().reduce((s,g)=>s+g.length-1,0);
 if(dupCount)advice.push({icon:"🧹",level:"warning",title:"Doublons possibles",text:`${dupCount} opération${dupCount>1?"s":""} semble${dupCount>1?"nt":""} enregistrée${dupCount>1?"s":""} plusieurs fois.`});
 const savings=possibleSavingsEstimate();
 if(savings>0)advice.push({icon:"🎯",level:"",title:"Épargne possible",text:`Une mise de côté prudente d’environ ${euro(savings)} semble possible ce mois-ci.`});
 if(!advice.length)advice.push({icon:"✅",level:"",title:"Aucune anomalie détectée",text:"Les dépenses et prévisions restent cohérentes avec les données enregistrées."});
 $("assistantAdvice").innerHTML=advice.slice(0,6).map(a=>`<div class="advice-row ${a.level}"><div class="advice-icon">${a.icon}</div><div><b>${esc(a.title)}</b><p>${esc(a.text)}</p></div></div>`).join("");
}
function renderDataQuality(){
 const groups=duplicateGroups();
 const duplicateCount=groups.reduce((s,g)=>s+g.length-1,0);
 const missingCategory=data.expenses.filter(x=>!x.category||x.category==="Autre").length;
 const invalidAmounts=data.expenses.filter(x=>!Number.isFinite(Number(x.amount))||Number(x.amount)<=0).length;
 const futureOld=data.incomeTransactions.filter(x=>x.future&&new Date(x.date+"T23:59:59")<new Date()).length;
 const row=(label,value,status)=>`<div class="quality-row"><span>${label}</span><span class="quality-pill ${status}">${value}</span></div>`;
 $("dataQuality").innerHTML=
   row("Doublons possibles",duplicateCount,duplicateCount?"warn":"ok")+
   row("Catégorie « Autre »",missingCategory,missingCategory>5?"warn":"ok")+
   row("Montants invalides",invalidAmounts,invalidAmounts?"bad":"ok")+
   row("Revenus prévus dépassés",futureOld,futureOld?"warn":"ok");
}


function activeProfileId(){return data.settings.activeProfileId||data.profiles[0]?.id||"p1"}
function activeProfile(){return data.profiles.find(p=>p.id===activeProfileId())||data.profiles[0]}
function operationBelongsToActive(x){return !x.profileId||x.profileId===activeProfileId()}
function renderProfiles(){
 const options=data.profiles.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("");
 $("profileQuick").innerHTML=options;
 $("profileQuick").value=activeProfileId();
}
function renderProfileSettings(){
 $("profileSettings").innerHTML=data.profiles.map(p=>`<div class="profile-card"><input data-profile-name="${p.id}" value="${esc(p.name)}"><button class="select-profile" data-profile-select="${p.id}">${p.id===activeProfileId()?"Actif":"Choisir"}</button><button class="delete-btn" data-profile-delete="${p.id}">✕</button></div>`).join("");
}
function renderCategorySettings(){
 $("categorySettings").innerHTML=`<div class="category-chip-row">${Object.keys(data.budgets).map(cat=>`<span class="category-chip">${esc(cat)}<button data-category-delete="${esc(cat)}">✕</button></span>`).join("")}</div>`;
 $("newRuleCategory").innerHTML=Object.keys(data.budgets).map(cat=>`<option>${esc(cat)}</option>`).join("");
}
function renderRuleSettings(){
 $("ruleSettings").innerHTML=data.rules.map((r,i)=>`<div class="rule-row"><input data-rule-keyword="${i}" value="${esc(r.keyword)}"><select data-rule-category="${i}">${Object.keys(data.budgets).map(cat=>`<option ${cat===r.category?"selected":""}>${esc(cat)}</option>`).join("")}</select><button class="delete-btn" data-rule-delete="${i}">✕</button></div>`).join("");
}
function normalizedRecurringLabel(label){
 return String(label||"").toLowerCase()
  .replace(/\d+/g," ")
  .replace(/cb|carte|paiement|prlv|prelevement|sepa|facture/g," ")
  .replace(/[^a-zà-ÿ]+/g," ")
  .replace(/\s+/g," ")
  .trim();
}
function detectedSubscriptions(){
 const groups={};
 data.expenses.filter(operationBelongsToActive).forEach(x=>{
   const key=normalizedRecurringLabel(x.label);
   if(!key)return;
   groups[key]=groups[key]||[];
   groups[key].push(x);
 });
 return Object.entries(groups).map(([key,items])=>{
   const months=[...new Set(items.map(x=>monthKey(x.date)))];
   const avg=items.reduce((s,x)=>s+Number(x.amount||0),0)/items.length;
   const variance=items.reduce((s,x)=>s+Math.abs(x.amount-avg),0)/items.length;
   return {key,label:items[0].label,items,months,avg,variance};
 }).filter(g=>g.months.length>=2&&g.variance<=Math.max(2,g.avg*.15))
 .sort((a,b)=>b.months.length-a.months.length||b.avg-a.avg);
}
function renderSubscriptions(){
 const list=detectedSubscriptions();
 $("subscriptionsList").innerHTML=list.length?list.slice(0,8).map(s=>`<div class="subscription-row"><div><b>${esc(s.label)}</b><small>${s.months.length} mois détectés · moyenne ${euro(s.avg)}</small><span class="subscription-pill">Récurrent</span></div><strong>${euro(s.avg)}</strong></div>`).join(""):'<p class="muted">Pas assez d’historique pour détecter des abonnements.</p>';
}
function simulatePurchaseImpact(amount){
 const projected=endMonth()-amount;
 const availableAfter=totals().available-amount;
 return {projected,availableAfter};
}


const FILE_DB_NAME="budget-laetitia-files-v1",FILE_STORE="files";
function openFileDb(){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(FILE_DB_NAME,1);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(FILE_STORE))db.createObjectStore(FILE_STORE)};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
async function saveLocalFile(id,file){
 const db=await openFileDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(FILE_STORE,"readwrite");
  tx.objectStore(FILE_STORE).put(file,id);
  tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
 });
}
async function getLocalFile(id){
 const db=await openFileDb();
 return new Promise((resolve,reject)=>{
  const req=db.transaction(FILE_STORE).objectStore(FILE_STORE).get(id);
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
async function deleteLocalFile(id){
 const db=await openFileDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(FILE_STORE,"readwrite");
  tx.objectStore(FILE_STORE).delete(id);
  tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
 });
}
function formatBytes(bytes){
 if(bytes<1024)return `${bytes} o`;
 if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} Ko`;
 return `${(bytes/1024/1024).toFixed(1)} Mo`;
}
function netWorth(){return netWorthAfterDebt()}
function subscriptionAnnualCost(){return detectedSubscriptions().reduce((s,x)=>s+x.avg*12,0)}
function forecast12Months(){
 const t=totals();
 const monthlyNet=t.inc-t.fixed-Math.max(0,t.exp);
 const rows=[];let balance=netWorth();
 const now=new Date();
 for(let i=0;i<12;i++){
  const d=new Date(now.getFullYear(),now.getMonth()+i,1);
  if(i===0)balance=netWorth()+endMonth()-current().balance;
  else balance+=monthlyNet;
  rows.push({label:d.toLocaleDateString("fr-FR",{month:"short"}),balance});
 }
 return rows;
}
function renderV100Dashboard(){
 $("netWorthView").textContent=euro(netWorth());
 $("monthlySavingPotential").textContent=euro(possibleSavingsEstimate());
 $("annualSubscriptionsView").textContent=euro(subscriptionAnnualCost());
 const rows=forecast12Months(),values=rows.map(x=>x.balance),min=Math.min(...values,0),max=Math.max(...values,1),spread=Math.max(1,max-min);
 $("yearForecast").innerHTML=rows.map(x=>{
  const h=Math.max(4,(x.balance-min)/spread*120);
  return `<div class="year-month"><div class="year-bar-wrap"><div class="year-bar ${x.balance<0?"negative":""}" style="height:${h}px"></div></div><b>${Math.round(x.balance)}</b><small>${esc(x.label)}</small></div>`;
 }).join("");
}
function renderVault(){
 const q=($("vaultSearch")?.value||"").trim().toLowerCase();
 const docs=data.vaultDocuments.filter(d=>!q||d.name.toLowerCase().includes(q)||d.category.toLowerCase().includes(q));
 $("vaultList").innerHTML=docs.length?docs.map(d=>`<div class="vault-doc"><div class="vault-icon">${d.mime?.includes("pdf")?"📄":"🖼️"}</div><div><b>${esc(d.name)}</b><small>${esc(d.category)} · ${formatBytes(d.size||0)} · ${fmtDate(d.date)}</small></div><div class="vault-actions"><button data-vault-open="${d.id}">Ouvrir</button><button class="delete-btn" data-vault-delete="${d.id}">✕</button></div></div>`).join(""):'<p class="muted">Aucun document enregistré.</p>';
 const total=data.vaultDocuments.reduce((s,d)=>s+Number(d.size||0),0);
 $("vaultUsage").textContent=`${data.vaultDocuments.length} document${data.vaultDocuments.length>1?"s":""} · ${formatBytes(total)} utilisés`;
}


function totalDebt(){return data.loans.reduce((s,l)=>s+Number(l.balance||0),0)}
function grossWorth(){return data.accounts.reduce((s,a)=>s+Number(a.balance||0),0)}
function netWorthAfterDebt(){return grossWorth()-totalDebt()}
function monthlyDebtPayments(){return data.loans.reduce((s,l)=>s+Number(l.payment||0),0)}
function debtRatio(){
 const income=totals().inc;
 return income?monthlyDebtPayments()/income*100:0;
}
function renderV300Dashboard(){
 $("grossWorthView").textContent=euro(grossWorth());
 $("totalDebtView").textContent=euro(totalDebt());
 $("netWorthView").textContent=euro(netWorthAfterDebt());
 $("debtRatioView").textContent=`${Math.round(debtRatio())} %`;

 const profileStats=data.profiles.map(p=>{
  const expenses=data.expenses.filter(x=>(x.profileId||"p1")===p.id).reduce((s,x)=>s+Number(x.amount||0),0);
  const incomes=data.incomeTransactions.filter(x=>(x.profileId||"p1")===p.id&&!x.future).reduce((s,x)=>s+Number(x.amount||0),0);
  return {name:p.name,expenses,incomes,balance:incomes-expenses};
 });
 $("familyDashboard").innerHTML=profileStats.map(p=>`<div class="family-member"><span>${esc(p.name)}</span><b class="${p.balance<0?"bad":"ok"}">${euro(p.balance)}</b><small>Revenus ${euro(p.incomes)} · Dépenses ${euro(p.expenses)}</small></div>`).join("");

 const forecast=forecast12Months();
 const start=forecast[0]?.balance||0,end=forecast[forecast.length-1]?.balance||0;
 const min=Math.min(...forecast.map(x=>x.balance)),max=Math.max(...forecast.map(x=>x.balance));
 $("yearForecastSummary").innerHTML=`<div><span>Départ</span><b>${euro(start)}</b></div><div><span>Fin estimée</span><b class="${end<0?"bad":"ok"}">${euro(end)}</b></div><div><span>Amplitude</span><b>${euro(max-min)}</b></div>`;
}
function monthsRemaining(endDate){
 if(!endDate)return null;
 const now=new Date(),end=new Date(endDate+"T12:00:00");
 return Math.max(0,(end.getFullYear()-now.getFullYear())*12+(end.getMonth()-now.getMonth()));
}
function renderLoans(){
 $("loansList").innerHTML=data.loans.length?data.loans.map(l=>{
  const remaining=monthsRemaining(l.endDate);
  const theoreticalTotal=remaining!==null?Number(l.payment||0)*remaining:Number(l.balance||0);
  const progress=theoreticalTotal>0?Math.max(0,Math.min(100,(1-Number(l.balance||0)/theoreticalTotal)*100)):0;
  return `<div class="loan-row"><div><b>${esc(l.name)}</b><small>Reste ${euro(l.balance)} · Mensualité ${euro(l.payment)} · Taux ${Number(l.rate||0).toFixed(2)} %${l.endDate?` · Fin ${fmtDate(l.endDate)}`:""}</small><div class="loan-progress"><div style="width:${progress}%"></div></div><div class="loan-actions"><button data-loan-pay="${l.id}">Mensualité payée</button><button class="delete-btn" data-loan-delete="${l.id}">✕</button></div></div><strong>${euro(l.balance)}</strong></div>`;
 }).join(""):'<p class="muted">Aucun crédit enregistré.</p>';
}
async function deriveKey(password,salt){
 const material=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]);
 return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:150000,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
function bytesToBase64(bytes){let s="";bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s)}
function base64ToBytes(value){const s=atob(value),arr=new Uint8Array(s.length);for(let i=0;i<s.length;i++)arr[i]=s.charCodeAt(i);return arr}
async function encryptPayload(payload,password){
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await deriveKey(password,salt);
 const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(JSON.stringify(payload)));
 return {format:"budget-laetitia-encrypted-v1",salt:bytesToBase64(salt),iv:bytesToBase64(iv),data:bytesToBase64(new Uint8Array(encrypted))};
}
async function decryptPayload(container,password){
 const salt=base64ToBytes(container.salt),iv=base64ToBytes(container.iv),dataBytes=base64ToBytes(container.data),key=await deriveKey(password,salt);
 const decrypted=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,dataBytes);
 return JSON.parse(new TextDecoder().decode(decrypted));
}

function renderAccounts(){$("accountsSummary").innerHTML=data.accounts.map(x=>`<div class="account-row"><div><b>${esc(x.name)}</b><small>${x.type==="savings"?"Épargne":x.type==="cash"?"Espèces":"Compte bancaire"}</small></div><strong>${euro(x.balance)}</strong></div>`).join("")}
function renderAlerts(){const alerts=[];Object.entries(data.budgets).forEach(([cat,limit])=>{const spent=data.expenses.filter(x=>x.category===cat).reduce((s,x)=>s+x.amount,0),pct=limit?spent/limit*100:0;if(pct>=100)alerts.push({c:"danger",t:`${cat} dépassé : ${euro(spent)} sur ${euro(limit)}`});else if(pct>=80)alerts.push({c:"warning",t:`${cat} atteint ${Math.round(pct)} %`})});if(endMonth()<0)alerts.unshift({c:"danger",t:`Fin de mois prévue négative : ${euro(endMonth())}`});$("alerts").innerHTML=alerts.length?alerts.map(a=>`<div class="alert-item ${a.c}">${esc(a.t)}</div>`).join(""):'<div class="alert-item">Aucune alerte.</div>'}
function renderForecast(){
 const ev=forecastEvents();
 let running=current().balance;
 const rows=[{date:new Date(),label:"Solde actuel",amount:0,type:"Départ",balance:running}];
 ev.forEach(e=>{running=Number((running+e.amount).toFixed(2));rows.push({...e,balance:running})});

 $("forecastStart").textContent=euro(current().balance);
 $("forecastEnd").textContent=euro(running);
 $("forecastEnd").className=running<0?"bad":running<300?"warn":"ok";

 $("forecastTimeline").innerHTML=rows.map((x,i)=>`<div class="timeline-item"><div class="timeline-date">${i===0?"Aujourd’hui":x.date.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})}</div><div class="timeline-main"><b>${esc(x.label)}</b><small>${esc(x.type)}${x.amount?` · ${x.amount>0?"+":""}${euro(x.amount)}`:""}</small></div><div class="timeline-balance ${x.balance<0?"bad":x.balance<300?"warn":""}">${euro(x.balance)}</div></div>`).join("");

 const svg=$("forecastChart");
 const width=640,height=220,padX=38,padTop=25,padBottom=35;
 const values=rows.map(r=>r.balance);
 const min=Math.min(...values,0),max=Math.max(...values,1);
 const spread=Math.max(1,max-min);
 const x=i=>rows.length===1?width/2:padX+i*(width-padX*2)/(rows.length-1);
 const y=v=>padTop+(max-v)*(height-padTop-padBottom)/spread;
 const points=rows.map((r,i)=>`${x(i).toFixed(1)},${y(r.balance).toFixed(1)}`).join(" ");
 const area=`${x(0)},${height-padBottom} ${points} ${x(rows.length-1)},${height-padBottom}`;
 const grid=[0,.25,.5,.75,1].map(f=>{
   const gy=padTop+f*(height-padTop-padBottom);
   const val=max-f*spread;
   return `<line class="chart-grid-line" x1="${padX}" y1="${gy}" x2="${width-padX}" y2="${gy}"></line><text class="chart-label" x="4" y="${gy+6}">${Math.round(val)}</text>`;
 }).join("");
 const dots=rows.map((r,i)=>{
   const cls=r.balance<0?"danger":r.balance<300?"warning":"";
   return `<circle class="chart-dot ${cls}" cx="${x(i)}" cy="${y(r.balance)}" r="7"></circle>`;
 }).join("");
 svg.innerHTML=`<defs><linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2f6fed" stop-opacity=".28"/><stop offset="100%" stop-color="#2f6fed" stop-opacity=".02"/></linearGradient></defs>${grid}<polygon class="chart-area" points="${area}"></polygon><polyline class="chart-path" points="${points}"></polyline>${dots}`;
}
function renderChart(){
 const sums={};
 data.expenses.filter(operationBelongsToActive).forEach(x=>sums[x.category]=(sums[x.category]||0)+x.amount);
 const entries=Object.entries(sums).sort((a,b)=>b[1]-a[1]);
 const total=entries.reduce((s,x)=>s+x[1],0);
 $("categoryTotal").textContent=euro(total);

 const palette=["#2f6fed","#36a66f","#f0a536","#d65d5d","#8c6dd7","#33a6b8","#e17fb2","#6f829f","#9aaf42","#df7b3f","#4f9bdf","#a56a43"];
 let cursor=0;
 const segments=entries.map(([cat,val],i)=>{
   const pct=total?val/total*100:0;
   const start=cursor,end=cursor+pct;
   cursor=end;
   return {cat,val,pct,color:palette[i%palette.length],css:`${palette[i%palette.length]} ${start}% ${end}%`};
 });
 $("categoryDonut").style.background=segments.length?`conic-gradient(${segments.map(s=>s.css).join(",")})`:"#e8edf6";
 $("categoryLegend").innerHTML=segments.slice(0,7).map(s=>`<div class="legend-row"><div class="legend-name"><span class="legend-dot" style="background:${s.color}"></span><span>${esc(s.cat)}</span></div><b>${Math.round(s.pct)} %</b></div>`).join("")||'<p class="muted">Aucune dépense.</p>';

 const max=Math.max(1,...entries.map(x=>x[1]));
 $("categoryChart").innerHTML=entries.map(([cat,val],i)=>`<div class="chart-row"><div class="chart-head"><b>${esc(cat)}</b><span>${euro(val)}</span></div><div class="chart-track"><div class="chart-fill" style="width:${val/max*100}%;background:${palette[i%palette.length]}"></div></div></div>`).join("");
}
function renderMonthlyStats(){
 const map={};
 data.expenses.forEach(x=>map[monthKey(x.date)]=(map[monthKey(x.date)]||0)+x.amount);
 data.archives.forEach(a=>{if(a.month&&!map[a.month])map[a.month]=a.expensesTotal||0});
 const now=new Date(),rows=[];
 for(let i=11;i>=0;i--){
   const d=new Date(now.getFullYear(),now.getMonth()-i,1);
   const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
   rows.push({key:k,label:d.toLocaleDateString("fr-FR",{month:"short"}),value:map[k]||0});
 }
 const max=Math.max(1,...rows.map(x=>x.value));
 $("monthlyStats").innerHTML=`<div class="month-chart">${rows.map(x=>`<div class="month-col"><b>${x.value?Math.round(x.value):""}</b><div class="month-bar" style="height:${Math.max(3,x.value/max*130)}px"></div><small>${esc(x.label)}</small></div>`).join("")}</div>`;

 const currentRow=rows[rows.length-1],previousRow=rows[rows.length-2];
 const completed=rows.filter(x=>x.value>0);
 const average=completed.length?completed.reduce((s,x)=>s+x.value,0)/completed.length:0;
 const diff=currentRow.value-previousRow.value;
 const diffPct=previousRow.value?diff/previousRow.value*100:0;
 $("monthComparison").innerHTML=`
   <div class="compare-box"><span>Ce mois-ci</span><b>${euro(currentRow.value)}</b><small>Dépenses saisies</small></div>
   <div class="compare-box"><span>Mois précédent</span><b>${euro(previousRow.value)}</b><small>${diff===0?"Stable":diff>0?`+${Math.round(diffPct)} %`:`${Math.round(diffPct)} %`}</small></div>
   <div class="compare-box"><span>Moyenne</span><b>${euro(average)}</b><small>mois renseignés</small></div>`;
}
function renderGoals(){
 $("goalsSummary").innerHTML=data.goals.map(g=>{
   const pct=g.target?Math.min(100,g.current/g.target*100):0;
   return `<div class="goal"><div class="goal-head"><div><b>${esc(g.name)}</b><small>${euro(g.current)} sur ${euro(g.target)}</small></div><span>${Math.round(pct)} %</span></div><div class="chart-track"><div class="chart-fill" style="width:${pct}%"></div></div><div class="goal-actions"><button data-goal-add="${g.id}" data-amount="10">+10 €</button><button data-goal-add="${g.id}" data-amount="50">+50 €</button><button data-goal-add="${g.id}" data-amount="100">+100 €</button></div></div>`;
 }).join("");
}
function calendarEventsFor(dateStr){const day=Number(dateStr.slice(8,10));return[...data.expenses.filter(x=>x.date===dateStr).map(x=>({type:"expense",label:x.label,amount:-x.amount})),...data.incomeTransactions.filter(x=>x.date===dateStr).map(x=>({type:"income",label:x.label,amount:x.amount})),...data.fixedCharges.filter(x=>!x.paid&&x.day===day).map(x=>({type:"charge",label:x.label,amount:-x.amount}))]}
function renderCalendar(){const y=calendarDate.getFullYear(),m=calendarDate.getMonth();$("calendarTitle").textContent=new Date(y,m,1).toLocaleDateString("fr-FR",{month:"long",year:"numeric"});let first=new Date(y,m,1).getDay();first=first===0?6:first-1;const days=new Date(y,m+1,0).getDate(),cells=[];for(let i=0;i<first;i++)cells.push('<div class="calendar-day empty"></div>');for(let d=1;d<=days;d++){const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`,events=calendarEventsFor(ds);cells.push(`<button class="calendar-day ${ds===selectedCalendarDate?"selected":""}" data-calendar-date="${ds}"><span class="num">${d}</span>${events.slice(0,2).map(e=>`<span class="calendar-dot ${e.type}">${esc(e.label)}</span>`).join("")}${events.length>2?`<span class="calendar-dot">+${events.length-2}</span>`:""}</button>`)}$("calendarGrid").innerHTML=cells.join("");renderCalendarDetails()}
function renderCalendarDetails(){const events=calendarEventsFor(selectedCalendarDate);$("calendarDetails").innerHTML=events.length?`<b>${fmtDate(selectedCalendarDate)}</b>`+events.map(e=>`<div class="history-row"><span>${esc(e.label)}</span><strong class="${e.amount>0?"ok":""}">${e.amount>0?"+":""}${euro(e.amount)}</strong></div>`).join(""):`Aucune opération le ${fmtDate(selectedCalendarDate)}.`}
function renderHistory(){const q=$("search").value.toLowerCase(),acc=$("historyAccount").value,cat=$("historyCategory").value,typeFilter=$("historyType").value,min=Number($("historyMin").value||0),max=Number($("historyMax").value||0);const ops=[...data.expenses.map(x=>({...x,type:"expense"})),...data.incomeTransactions.map(x=>({...x,type:"income",category:"Revenu"})),...data.transfers.map(x=>({...x,type:"transfer",category:"Virement"}))].filter(x=>operationBelongsToActive(x)&&(!q||x.label.toLowerCase().includes(q))&&(!acc||x.accountId===acc||x.fromAccountId===acc||x.toAccountId===acc)&&(!cat||x.category===cat)&&(!typeFilter||x.type===typeFilter)&&(!min||Number(x.amount)>=min)&&(!max||Number(x.amount)<=max)).sort((a,b)=>String(b.date).localeCompare(String(a.date)));$("historyList").innerHTML=ops.length?ops.map(x=>`<div class="history-row"><div><b>${x.type==="income"?"➕ ":x.type==="transfer"?"🔁 ":""}${esc(x.label)}</b><small>${esc(x.category)} · ${fmtDate(x.date)}${x.type==="expense"?" · "+paymentLabel(x):""}</small>${x.attachmentId?`<span class="attachment-badge">📎 ${esc(x.attachmentName||"Pièce jointe")}</span>`:""}</div><div><strong class="${x.type==="income"?"ok":""}">${x.type==="income"?"+":""}${euro(x.amount)}</strong><br><button class="delete-btn" data-${x.type}="${x.id}">Suppr.</button></div></div>`).join(""):'<p class="muted">Aucune opération.</p>'}
function renderSettings(){
 $("accountSettings").innerHTML=data.accounts.map((x,i)=>`<div class="edit-row"><input data-account-name="${i}" value="${esc(x.name)}"><input data-account-balance="${i}" type="number" step="0.01" value="${x.balance}"><button class="delete-btn" data-account-delete="${i}">✕</button></div>`).join("");
 $("incomeSettings").innerHTML=data.incomes.map((x,i)=>`<div class="edit-row"><input data-income-label="${i}" value="${esc(x.label)}"><input data-income-amount="${i}" type="number" step="0.01" value="${x.amount}"><button class="delete-btn" data-income-delete="${i}">✕</button></div>`).join("");
 $("chargeSettings").innerHTML=data.fixedCharges.map((x,i)=>`<div class="edit-row four"><input data-charge-day="${i}" type="number" value="${x.day??""}" placeholder="Jour"><input data-charge-label="${i}" value="${esc(x.label)}"><input data-charge-amount="${i}" type="number" step="0.01" value="${x.amount}"><button class="delete-btn" data-charge-delete="${i}">✕</button></div>`).join("");
 $("budgetSettings").innerHTML=Object.entries(data.budgets).map(([k,v])=>`<div class="edit-row"><input value="${esc(k)}" readonly><input data-budget="${esc(k)}" type="number" step="0.01" value="${v}"><span></span></div>`).join("");
 $("goalSettings").innerHTML=data.goals.map((g,i)=>`<div class="edit-row goal-edit"><input data-goal-name="${i}" value="${esc(g.name)}"><input data-goal-target="${i}" type="number" step="0.01" value="${g.target}"><input data-goal-current="${i}" type="number" step="0.01" value="${g.current}"><button class="delete-btn" data-goal-delete="${i}">✕</button></div>`).join("");
 $("darkModeToggle").checked=data.settings.darkMode;$("archivesList").innerHTML=data.archives.length?data.archives.slice().reverse().map(a=>`<div class="archive-row"><div><b>${esc(a.label)}</b><small>Dépenses ${euro(a.expensesTotal)} · Solde ${euro(a.closingBalance)}</small></div><button data-archive-delete="${a.id}">✕</button></div>`).join(""):'<p class="muted">Aucune archive.</p>';
}
function applyTheme(){document.body.classList.toggle("dark",data.settings.darkMode);$("themeQuick").textContent=data.settings.darkMode?"☀️":"🌙"}

document.querySelectorAll(".bottom-nav button").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".bottom-nav button").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.tab).classList.add("active")}));
$("themeQuick").addEventListener("click",()=>{data.settings.darkMode=!data.settings.darkMode;save()});$("darkModeToggle").addEventListener("change",()=>{data.settings.darkMode=$("darkModeToggle").checked;save()});
$("expenseLabel").addEventListener("input",()=>{const c=guessCategory($("expenseLabel").value);$("expenseCategory").value=c;$("categorySuggestion").innerHTML=`Catégorie proposée : <b>${esc(c)}</b>`});
$("saveExpense").addEventListener("click",async()=>{
 const amount=Number($("expenseAmount").value),method=$("paymentMethod").value,accountId=$("expenseAccount").value;
 if(!amount||amount<=0)return alert("Montant invalide.");
 const deferred=method==="deferred_card";
 const expenseId=crypto.randomUUID();
 const file=$("expenseAttachment").files?.[0];
 let attachmentId="",attachmentName="";
 if(file){
  attachmentId=`expense-${expenseId}`;
  try{await saveLocalFile(attachmentId,file);attachmentName=file.name}catch{alert("La pièce jointe n’a pas pu être enregistrée.")}
 }
 data.expenses.unshift({id:expenseId,amount,label:$("expenseLabel").value.trim()||"Dépense",category:$("expenseCategory").value,date:$("expenseDate").value,paymentMethod:method,debited:!deferred,accountId,profileId:activeProfileId(),attachmentId,attachmentName});
 if(!deferred)account(accountId).balance=Number((account(accountId).balance-amount).toFixed(2));
 $("expenseAmount").value="";$("expenseLabel").value="";$("expenseAttachment").value="";
 navigator.vibrate?.(25);save();
});

$("receiptPhoto").addEventListener("change",()=>{
 const file=$("receiptPhoto").files?.[0];if(!file)return;
 const url=URL.createObjectURL(file);
 $("receiptImage").src=url;$("receiptPreview").hidden=false;
 $("receiptDate").value=today();
});
$("useReceipt").addEventListener("click",()=>{
 const amount=Number($("receiptAmount").value);
 const merchant=$("receiptMerchant").value.trim();
 if(!amount||amount<=0)return alert("Saisis le montant du ticket.");
 $("expenseAmount").value=amount;$("expenseLabel").value=merchant||"Ticket";
 const cat=guessCategory(merchant);$("expenseCategory").value=cat;
 $("expenseDate").value=$("receiptDate").value||today();
 const source=$("receiptPhoto").files?.[0];
 if(source){
  const dt=new DataTransfer();dt.items.add(source);$("expenseAttachment").files=dt.files;
 }
 document.querySelector('[data-tab="add"]').click();
 window.scrollTo({top:0,behavior:"smooth"});
});
$("futureIncome").addEventListener("change",()=>{$("futureDateBlock").hidden=!$("futureIncome").checked});$("saveIncome").addEventListener("click",()=>{const amount=Number($("incomeAmount").value),future=$("futureIncome").checked,accountId=$("incomeAccount").value;if(!amount||amount<=0)return alert("Montant invalide.");const date=future?$("futureIncomeDate").value:today();data.incomeTransactions.unshift({id:crypto.randomUUID(),amount,label:$("incomeLabel").value.trim()||"Revenu",date,future,accountId,profileId:activeProfileId()});if(!future)account(accountId).balance=Number((account(accountId).balance+amount).toFixed(2));$("incomeAmount").value="";$("incomeLabel").value="";navigator.vibrate?.(25);save()});
$("saveTransfer").addEventListener("click",()=>{const amount=Number($("transferAmount").value),from=$("transferFrom").value,to=$("transferTo").value;if(!amount||amount<=0||from===to)return alert("Virement invalide.");account(from).balance-=amount;account(to).balance+=amount;data.transfers.unshift({id:crypto.randomUUID(),amount,label:`${account(from).name} → ${account(to).name}`,date:today(),fromAccountId:from,toAccountId:to,profileId:activeProfileId()});save()});
$("applyDeferredDebit").addEventListener("click",()=>{const total=pendingDeferred();if(total<=0)return alert("Aucune CB en attente.");current().balance=Number((current().balance-total).toFixed(2));data.expenses=data.expenses.map(x=>x.paymentMethod==="deferred_card"&&!x.debited?{...x,debited:true}:x);save()});
$("prevMonth").addEventListener("click",()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()-1,1);renderCalendar()});$("nextMonth").addEventListener("click",()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+1,1);renderCalendar()});
["search","historyAccount","historyCategory","historyType","historyMin","historyMax"].forEach(id=>$(id).addEventListener("input",renderHistory));

$("parseCsv").addEventListener("click",()=>{const file=$("csvFile").files?.[0];if(!file)return alert("Choisis un fichier CSV.");const reader=new FileReader();reader.onload=()=>{importRows=parseCsvText(String(reader.result));renderImportPreview()};reader.readAsText(file,"utf-8")});
function parseCsvText(text){const lines=text.split(/\r?\n/).filter(Boolean),rows=[];for(const line of lines.slice(1)){const cells=line.split(/[;,]/).map(x=>x.replace(/^"|"$/g,"").trim()),date=cells.find(x=>/^\d{2}[\/-]\d{2}[\/-]\d{2,4}$/.test(x))||today(),nums=cells.map(x=>Number(x.replace(/\s/g,"").replace(",", "."))).filter(x=>!Number.isNaN(x)),amount=nums.length?nums[nums.length-1]:0,label=cells.find(x=>x.length>3&&!/^\d/.test(x))||"Opération";if(amount){
 const normalizedDate=date.includes("/")?date.split("/").reverse().join("-"):date;
 const absAmount=Math.abs(amount);
 const direction=amount<0?"expense":"income";
 const isDuplicate=direction==="expense"
   ?data.expenses.some(x=>x.date===normalizedDate&&x.label.trim().toLowerCase()===label.trim().toLowerCase()&&Math.abs(Number(x.amount)-absAmount)<0.01)
   :data.incomeTransactions.some(x=>x.date===normalizedDate&&x.label.trim().toLowerCase()===label.trim().toLowerCase()&&Math.abs(Number(x.amount)-absAmount)<0.01);
 rows.push({id:crypto.randomUUID(),selected:!isDuplicate,date:normalizedDate,label,amount:absAmount,direction,category:guessCategory(label),isDuplicate});
}}return rows}
function renderImportPreview(){
 if(!importRows.length){$("importStatus").hidden=false;$("importStatus").textContent="Aucune opération reconnue.";return}
 const duplicateCount=importRows.filter(x=>x.isDuplicate).length;
 $("duplicateImportWarning").hidden=duplicateCount===0;
 $("duplicateImportWarning").textContent=duplicateCount?`${duplicateCount} doublon${duplicateCount>1?"s":""} potentiel${duplicateCount>1?"s":""} décoché${duplicateCount>1?"s":""} automatiquement.`:"";
$("importPreviewCard").hidden=false;$("importPreview").innerHTML=importRows.map((r,i)=>`<div class="import-row"><div class="import-row-top"><label class="checkline"><input data-import-select="${i}" type="checkbox" ${r.selected?"checked":""}> ${esc(r.label)}</label><b>${euro(r.amount)}</b></div><small>${fmtDate(r.date)} · ${r.direction==="expense"?"Dépense":"Revenu"}${r.isDuplicate?" · Doublon possible":""}</small><select data-import-category="${i}">${Object.keys(data.budgets).map(c=>`<option ${c===r.category?"selected":""}>${esc(c)}</option>`).join("")}</select></div>`).join("")}
$("confirmImport").addEventListener("click",()=>{const accountId=$("importAccount").value;importRows.filter(x=>x.selected).forEach(r=>{if(r.direction==="expense"){data.expenses.unshift({id:r.id,amount:r.amount,label:r.label,category:r.category,date:r.date,paymentMethod:"immediate_card",debited:true,accountId,profileId:activeProfileId()});account(accountId).balance-=r.amount}else{data.incomeTransactions.unshift({id:r.id,amount:r.amount,label:r.label,date:r.date,future:false,accountId,profileId:activeProfileId()});account(accountId).balance+=r.amount}});importRows=[];$("importPreviewCard").hidden=true;save();alert("Import terminé.")});

document.addEventListener("click",async e=>{
 const loanPay=e.target.closest("[data-loan-pay]")?.dataset.loanPay;
 if(loanPay){
  const loan=data.loans.find(l=>l.id===loanPay);
  if(loan){
   const paid=Math.min(Number(loan.payment||0),Number(loan.balance||0));
   loan.balance=Number((loan.balance-paid).toFixed(2));
   save();
  }
  return;
 }
 const loanDelete=e.target.closest("[data-loan-delete]")?.dataset.loanDelete;
 if(loanDelete){
  if(!confirm("Supprimer ce crédit ?"))return;
  data.loans=data.loans.filter(l=>l.id!==loanDelete);save();return;
 }

 const attachment=e.target.closest("[data-expense]")?.dataset.expense;
 if(e.target.closest(".attachment-badge")){
  const row=e.target.closest("[data-expense]");
 }
 const vaultOpen=e.target.closest("[data-vault-open]")?.dataset.vaultOpen;
 if(vaultOpen){
  const file=await getLocalFile(vaultOpen);
  if(!file)return alert("Fichier introuvable sur cet appareil.");
  const url=URL.createObjectURL(file);window.open(url,"_blank");return;
 }
 const vaultDelete=e.target.closest("[data-vault-delete]")?.dataset.vaultDelete;
 if(vaultDelete){
  if(!confirm("Supprimer ce document du coffre ?"))return;
  await deleteLocalFile(vaultDelete);
  data.vaultDocuments=data.vaultDocuments.filter(d=>d.id!==vaultDelete);save();return;
 }

 const profileSelect=e.target.closest("[data-profile-select]")?.dataset.profileSelect;
 if(profileSelect){data.settings.activeProfileId=profileSelect;save();return}
 const profileDelete=e.target.closest("[data-profile-delete]")?.dataset.profileDelete;
 if(profileDelete){
   if(data.profiles.length<=1)return alert("Il faut conserver au moins un profil.");
   if(!confirm("Supprimer ce profil ? Les opérations restent dans l’historique."))return;
   data.profiles=data.profiles.filter(p=>p.id!==profileDelete);
   if(data.settings.activeProfileId===profileDelete)data.settings.activeProfileId=data.profiles[0].id;
   save();return;
 }
 const categoryDelete=e.target.closest("[data-category-delete]")?.dataset.categoryDelete;
 if(categoryDelete){
   if(categoryDelete==="Autre")return alert("La catégorie Autre doit rester disponible.");
   if(!confirm(`Supprimer la catégorie ${categoryDelete} ?`))return;
   delete data.budgets[categoryDelete];
   data.rules=data.rules.filter(r=>r.category!==categoryDelete);
   data.expenses=data.expenses.map(x=>x.category===categoryDelete?{...x,category:"Autre"}:x);
   save();return;
 }
 const ruleDelete=e.target.closest("[data-rule-delete]")?.dataset.ruleDelete;
 if(ruleDelete!==undefined){data.rules.splice(Number(ruleDelete),1);save();return}
 const goalButton=e.target.closest("[data-goal-add]");
 if(goalButton){
   const goal=data.goals.find(g=>g.id===goalButton.dataset.goalAdd);
   const amount=Number(goalButton.dataset.amount||0);
   if(goal&&amount>0){goal.current=Number((goal.current+amount).toFixed(2));navigator.vibrate?.(25);save();}
   return;
 }

 const cd=e.target.closest("[data-calendar-date]")?.dataset.calendarDate;if(cd){selectedCalendarDate=cd;renderCalendar();return}
 const ad=e.target.closest("[data-archive-delete]")?.dataset.archiveDelete;if(ad){data.archives=data.archives.filter(x=>x.id!==ad);save();return}

 const attachmentBadge=e.target.closest(".attachment-badge");
 if(attachmentBadge){
  const expenseRow=e.target.closest(".history-row");
  const button=expenseRow?.querySelector("[data-expense]");
  const expenseId=button?.dataset.expense;
  const exp=data.expenses.find(x=>x.id===expenseId);
  if(exp?.attachmentId){
   const file=await getLocalFile(exp.attachmentId);
   if(file){window.open(URL.createObjectURL(file),"_blank");return}
  }
 }
 for(const type of["expense","income","transfer"]){const id=e.target.closest(`[data-${type}]`)?.dataset[type];if(id){if(type==="expense"){const x=data.expenses.find(y=>y.id===id);if(x?.attachmentId)await deleteLocalFile(x.attachmentId);if(x&&x.debited)account(x.accountId).balance+=x.amount;data.expenses=data.expenses.filter(y=>y.id!==id)}if(type==="income"){const x=data.incomeTransactions.find(y=>y.id===id);if(x&&!x.future)account(x.accountId).balance-=x.amount;data.incomeTransactions=data.incomeTransactions.filter(y=>y.id!==id)}if(type==="transfer"){const x=data.transfers.find(y=>y.id===id);if(x){account(x.fromAccountId).balance+=x.amount;account(x.toAccountId).balance-=x.amount}data.transfers=data.transfers.filter(y=>y.id!==id)}save();return}}
 [["accountDelete","accounts"],["incomeDelete","incomes"],["chargeDelete","fixedCharges"],["goalDelete","goals"]].forEach(([k,arr])=>{const attr=k.replace(/[A-Z]/g,m=>"-"+m.toLowerCase()),i=e.target.closest(`[data-${attr}]`)?.dataset[k];if(i!==undefined){data[arr].splice(Number(i),1);save()}});
});
document.addEventListener("change",e=>{const d=e.target.dataset;if(d.profileName!==undefined){
   const p=data.profiles.find(x=>x.id===d.profileName);if(p)p.name=e.target.value;
 }
 if(d.ruleKeyword!==undefined)data.rules[+d.ruleKeyword].keyword=e.target.value.trim().toLowerCase();
 if(d.ruleCategory!==undefined)data.rules[+d.ruleCategory].category=e.target.value;
 if(d.accountName!==undefined)data.accounts[+d.accountName].name=e.target.value;if(d.accountBalance!==undefined)data.accounts[+d.accountBalance].balance=Number(e.target.value)||0;if(d.incomeLabel!==undefined)data.incomes[+d.incomeLabel].label=e.target.value;if(d.incomeAmount!==undefined)data.incomes[+d.incomeAmount].amount=Number(e.target.value)||0;if(d.chargeDay!==undefined)data.fixedCharges[+d.chargeDay].day=e.target.value===""?null:Number(e.target.value);if(d.chargeLabel!==undefined)data.fixedCharges[+d.chargeLabel].label=e.target.value;if(d.chargeAmount!==undefined)data.fixedCharges[+d.chargeAmount].amount=Number(e.target.value)||0;if(d.budget!==undefined)data.budgets[d.budget]=Number(e.target.value)||0;if(d.goalName!==undefined)data.goals[+d.goalName].name=e.target.value;if(d.goalTarget!==undefined)data.goals[+d.goalTarget].target=Number(e.target.value)||0;if(d.goalCurrent!==undefined)data.goals[+d.goalCurrent].current=Number(e.target.value)||0;if(d.importSelect!==undefined)importRows[+d.importSelect].selected=e.target.checked;if(d.importCategory!==undefined)importRows[+d.importCategory].category=e.target.value;if(Object.keys(d).length&&!d.importSelect&&!d.importCategory)save()});
$("addAccount").addEventListener("click",()=>{data.accounts.push({id:crypto.randomUUID(),name:"Nouveau compte",type:"savings",balance:0});save()});$("addMonthlyIncome").addEventListener("click",()=>{data.incomes.push({id:crypto.randomUUID(),label:"Nouveau revenu",amount:0});save()});$("addCharge").addEventListener("click",()=>{data.fixedCharges.push({id:crypto.randomUUID(),day:null,label:"Nouveau prélèvement",amount:0,paid:false,debited:false,accountId:"current"});save()});$("addGoal").addEventListener("click",()=>{data.goals.push({id:crypto.randomUUID(),name:"Nouvel objectif",target:500,current:0});save()});
$("archiveMonth").addEventListener("click",()=>{const key=new Date().toISOString().slice(0,7),expensesTotal=data.expenses.filter(x=>monthKey(x.date)===key).reduce((s,x)=>s+x.amount,0),archive={id:crypto.randomUUID(),month:key,label:new Date().toLocaleDateString("fr-FR",{month:"long",year:"numeric"}),expensesTotal,closingBalance:current().balance};data.archives=data.archives.filter(x=>x.month!==key);data.archives.push(archive);save();alert("Mois archivé.")});
function csvEscape(v){const s=String(v??"");return /[;"\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}

$("profileQuick").addEventListener("change",()=>{data.settings.activeProfileId=$("profileQuick").value;save()});
$("addProfile").addEventListener("click",()=>{
 const id=crypto.randomUUID();
 data.profiles.push({id,name:`Profil ${data.profiles.length+1}`});
 data.settings.activeProfileId=id;
 save();
});
$("addCategory").addEventListener("click",()=>{
 const name=$("newCategoryName").value.trim();
 if(!name)return alert("Saisis un nom de catégorie.");
 if(data.budgets[name]!==undefined)return alert("Cette catégorie existe déjà.");
 data.budgets[name]=100;
 $("newCategoryName").value="";
 save();
});
$("addRule").addEventListener("click",()=>{
 const keyword=$("newRuleKeyword").value.trim().toLowerCase();
 const category=$("newRuleCategory").value;
 if(!keyword)return alert("Saisis un mot-clé.");
 data.rules.push({keyword,category});
 $("newRuleKeyword").value="";
 save();
});
$("simulatePurchase").addEventListener("click",()=>{
 const amount=Number($("purchaseSimulationAmount").value);
 if(!amount||amount<=0)return alert("Saisis un montant valide.");
 const result=simulatePurchaseImpact(amount);
 const box=$("purchaseSimulationResult");
 box.className="simulation-result";
 if(result.projected<0)box.classList.add("bad");
 else if(result.projected<300)box.classList.add("warn");
 else box.classList.add("ok");
 box.innerHTML=`Après cet achat de <b>${euro(amount)}</b>, le disponible mensuel serait de <b>${euro(result.availableAfter)}</b> et la fin de mois serait estimée à <b>${euro(result.projected)}</b>.`;
});

$("vaultSearch").addEventListener("input",renderVault);
$("addVaultDocument").addEventListener("click",async()=>{
 const file=$("vaultFile").files?.[0],name=$("vaultName").value.trim();
 if(!file)return alert("Choisis un fichier.");
 if(!name)return alert("Saisis un nom pour le document.");
 const id=`vault-${crypto.randomUUID()}`;
 try{
  await saveLocalFile(id,file);
  data.vaultDocuments.push({id,name,category:$("vaultCategory").value,size:file.size,mime:file.type,date:today(),profileId:activeProfileId()});
  $("vaultName").value="";$("vaultFile").value="";save();alert("Document ajouté au coffre.");
 }catch{alert("Le document n’a pas pu être enregistré.")}
});

$("addLoan").addEventListener("click",()=>{
 const name=$("loanName").value.trim(),balance=Number($("loanBalance").value),payment=Number($("loanPayment").value),rate=Number($("loanRate").value||0),endDate=$("loanEndDate").value;
 if(!name)return alert("Saisis un nom.");
 if(!balance||balance<=0)return alert("Saisis le capital restant dû.");
 data.loans.push({id:crypto.randomUUID(),name,balance,payment,rate,endDate,initialBalance:balance});
 $("loanName").value="";$("loanBalance").value="";$("loanPayment").value="";$("loanRate").value="";$("loanEndDate").value="";
 save();
});
$("exportEncrypted").addEventListener("click",async()=>{
 const password=$("backupPassword").value;
 if(password.length<6)return alert("Choisis un mot de passe d’au moins 6 caractères.");
 try{
  const container=await encryptPayload({app:"Budget Familial Laetitia",version:"300.0.0",data},password);
  const blob=new Blob([JSON.stringify(container,null,2)],{type:"application/json"}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download="budget_laetitia_v300_chiffre.json";a.click();
 }catch{alert("La sauvegarde chiffrée n’a pas pu être créée.")}
});
$("importEncryptedBtn").addEventListener("click",()=>$("importEncryptedFile").click());
$("importEncryptedFile").addEventListener("change",async e=>{
 const file=e.target.files?.[0];if(!file)return;
 const password=$("backupPassword").value;
 if(password.length<6)return alert("Saisis le mot de passe utilisé lors de l’export.");
 try{
  const container=JSON.parse(await file.text());
  const payload=await decryptPayload(container,password);
  data=migrate(payload.data||payload);save();alert("Sauvegarde chiffrée restaurée.");
 }catch{alert("Mot de passe incorrect ou fichier invalide.")}
 e.target.value="";
});
$("exportCsv").addEventListener("click",()=>{const rows=[["Date","Type","Libellé","Catégorie","Montant","Compte","Paiement"]];data.expenses.forEach(x=>rows.push([x.date,"Dépense",x.label,x.category,-x.amount,account(x.accountId)?.name||"",paymentLabel(x)]));data.incomeTransactions.forEach(x=>rows.push([x.date,"Revenu",x.label,"Revenu",x.amount,account(x.accountId)?.name||"",x.future?"Prévu":"Reçu"]));const csv="\ufeff"+rows.map(r=>r.map(csvEscape).join(";")).join("\n"),blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="budget_laetitia_operations.csv";a.click()});
$("exportData").addEventListener("click",()=>{const blob=new Blob([JSON.stringify({app:"Budget Familial Laetitia",version:"300.0.0",data},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="budget_laetitia_v300.json";a.click()});
$("importDataBtn").addEventListener("click",()=>$("importDataFile").click());$("importDataFile").addEventListener("change",e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const p=JSON.parse(String(r.result));data=migrate(p.data||p);save();alert("Sauvegarde restaurée.")}catch{alert("Fichier invalide.")}};r.readAsText(f)});
$("restoreAutoBackup").addEventListener("click",()=>{try{const raw=localStorage.getItem(BACKUP_KEY);data=migrate(JSON.parse(raw).data);save();alert("Sauvegarde récupérée.")}catch{alert("Aucune sauvegarde.")}});
$("removeDuplicates").addEventListener("click",()=>{
 const groups=duplicateGroups();
 const idsToRemove=new Set();
 groups.forEach(group=>group.slice(1).forEach(x=>idsToRemove.add(x.id)));
 if(!idsToRemove.size)return alert("Aucun doublon détecté.");
 if(!confirm(`Supprimer ${idsToRemove.size} doublon${idsToRemove.size>1?"s":""} ?`))return;
 data.expenses=data.expenses.filter(x=>!idsToRemove.has(x.id));
 save();
 alert("Doublons supprimés.");
});
$("resetApp").addEventListener("click",()=>{if(confirm("Réinitialiser ?")){data=migrate(initial);save()}});

$("expenseDate").value=today();$("futureIncomeDate").value=today();save();
if("serviceWorker"in navigator)navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});
if("caches"in window)caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).catch(()=>{});
fetch("./version.json?t="+Date.now(),{cache:"no-store"}).then(r=>r.json()).then(v=>{if(location.search!==`?v=${v.version}`)location.replace(`${location.pathname}?v=${v.version}`)}).catch(()=>{});
})();
