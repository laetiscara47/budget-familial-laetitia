const KEY='budget_essentiel_v2';
const defaults={balance:2697.32,cardDebitDay:4,operations:[],incomeRules:[{id:'i1',label:'CAF',amount:867.92,day:5},{id:'i2',label:'Assurance Maëva',amount:130,day:10}],chargeRules:[{id:'c1',label:'Orange',amount:28.99,day:6},{id:'c2',label:'Eau de Garonne',amount:64,day:3}],theme:'light'};
let data=load(),type='expense',editingId=null;
function load(){try{return {...structuredClone(defaults),...JSON.parse(localStorage.getItem(KEY))}}catch{return structuredClone(defaults)}}
function save(){localStorage.setItem(KEY,JSON.stringify(data));render()}
function euro(n){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(n||0))}
function money(v){return Number(String(v||'').replace(/\s/g,'').replace(',','.'))||0}
function today(){return new Date().toISOString().slice(0,10)}
function mkey(d){return String(d).slice(0,7)}
function thisMonth(){return today().slice(0,7)}
function dim(){let d=new Date();return new Date(d.getFullYear(),d.getMonth()+1,0).getDate()}
function left(){let d=new Date();return Math.max(1,dim()-d.getDate()+1)}
function dateFor(day){let d=new Date(),last=dim(),dd=String(Math.min(Number(day),last)).padStart(2,'0'),mm=String(d.getMonth()+1).padStart(2,'0');return `${d.getFullYear()}-${mm}-${dd}`}
function cardPending(){return data.operations.filter(x=>x.type==='expense'&&x.payment==='deferred'&&!x.cardDebited).reduce((s,x)=>s+x.amount,0)}
function futureRules(rules){let day=new Date().getDate();return rules.filter(r=>r.day>=day)}
function expectedIncome(){return futureRules(data.incomeRules).reduce((s,r)=>s+r.amount,0)}
function remainingCharges(){return futureRules(data.chargeRules).reduce((s,r)=>s+r.amount,0)}
function available(){return data.balance-cardPending()}
function projected(){return data.balance-cardPending()-remainingCharges()+expectedIncome()}
function daily(){return Math.max(0,projected()/left())}
function nextRule(rules){let day=new Date().getDate();return [...rules].sort((a,b)=>(a.day>=day?a.day:a.day+31)-(b.day>=day?b.day:b.day+31))[0]}
function events(){let e=[];data.operations.forEach(o=>e.push({...o,kind:o.type,amountSigned:o.type==='income'?o.amount:-o.amount}));data.incomeRules.forEach(r=>e.push({id:'ir'+r.id,kind:'income',label:r.label,date:dateFor(r.day),amountSigned:r.amount}));data.chargeRules.forEach(r=>e.push({id:'cr'+r.id,kind:'charge',label:r.label,date:dateFor(r.day),amountSigned:-r.amount}));if(cardPending()>0){let d=new Date(),m=d.getDate()<=data.cardDebitDay?d.getMonth():d.getMonth()+1,dt=new Date(d.getFullYear(),m,data.cardDebitDay,12);e.push({id:'card',kind:'card',label:'Débit CB différée',date:dt.toISOString().slice(0,10),amountSigned:-cardPending()})}return e.sort((a,b)=>a.date.localeCompare(b.date))}
function icon(k){return {income:'💰',expense:'🛒',charge:'🧾',card:'💳'}[k]||'•'}
function kind(k){return {income:'Revenu',expense:'Dépense',charge:'Prélèvement',card:'Carte différée'}[k]||''}
function esc(v){return String(v).replace(/[&<>\"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[s]))}
function drawEvents(sel,list){document.querySelector(sel).innerHTML=list.length?list.map(x=>`<div class="item ${x.rule||x.id==='card'?'':'clickable'}" ${x.rule||x.id==='card'?'':`data-edit-op="${x.id}"`}><div class="icon">${icon(x.kind)}</div><div><b>${esc(x.label)}</b><small>${new Date(x.date+'T12:00:00').toLocaleDateString('fr-FR')} · ${kind(x.kind)}</small></div><div class="amount ${x.amountSigned>=0?'income':'expense'}">${x.amountSigned>=0?'+':''}${euro(x.amountSigned)}</div></div>`).join(''):'<p style="color:var(--muted)">Aucune opération.</p>'}
function ruleRow(r,t){return `<div class="rule"><div><b>${esc(r.label)}</b><small>${euro(r.amount)} · le ${r.day}</small></div><button data-del="${t}:${r.id}">Supprimer</button></div>`}
function render(){document.querySelector('#available').textContent=euro(available());document.querySelector('#forecast').textContent=`Fin de mois estimée : ${euro(projected())}`;document.querySelector('#balance').textContent=euro(data.balance);document.querySelector('#card').textContent=euro(cardPending());document.querySelector('#daily').textContent=euro(daily());let ni=nextRule(data.incomeRules),nc=nextRule(data.chargeRules);document.querySelector('#nextIncome').textContent=ni?euro(ni.amount):'—';document.querySelector('#nextIncomeLabel').textContent=ni?`${ni.label} · le ${ni.day}`:'Aucun';document.querySelector('#nextCharge').textContent=nc?euro(nc.amount):'—';document.querySelector('#nextChargeLabel').textContent=nc?`${nc.label} · le ${nc.day}`:'Aucun';drawEvents('#upcoming',events().filter(x=>x.date>=today()).slice(0,5));drawEvents('#events',events().filter(x=>document.querySelector('#filter').value==='all'||x.kind===document.querySelector('#filter').value));document.querySelector('#settingBalance').value=String(data.balance).replace('.',',');document.querySelector('#cardDay').value=data.cardDebitDay;document.querySelector('#incomeRules').innerHTML=data.incomeRules.map(r=>ruleRow(r,'i')).join('');document.querySelector('#chargeRules').innerHTML=data.chargeRules.map(r=>ruleRow(r,'c')).join('');
document.querySelector('#accountCurrent').textContent=euro(data.balance);
document.querySelector('#accountDeferred').textContent=euro(cardPending());
document.querySelector('#accountAvailable').textContent=euro(available());
document.querySelector('#accountCardDay').textContent=data.cardDebitDay;
drawEvents('#recentOperations',events().filter(x=>!x.id.startsWith('ir')&&!x.id.startsWith('cr')&&x.id!=='card').slice(-8).reverse());
renderAlert();
document.body.classList.toggle('dark',data.theme==='dark');document.querySelector('#theme').textContent=data.theme==='dark'?'☀️':'🌙'}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{let t=b.dataset.tab;document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===t));document.querySelectorAll('nav [data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===t));if(t==='calendar')render()}));
document.querySelector('#expenseType').onclick=()=>{type='expense';expenseType.classList.add('active');incomeType.classList.remove('active');paymentBox.style.display='block'};
document.querySelector('#incomeType').onclick=()=>{type='income';incomeType.classList.add('active');expenseType.classList.remove('active');paymentBox.style.display='none'};
document.querySelector('#saveOp').onclick=()=>{
let label=document.querySelector('#label').value.trim(),amount=money(document.querySelector('#amount').value),date=document.querySelector('#date').value||today();
if(!label||amount<=0){feedback.textContent='Complète le libellé et le montant.';return}
if(editingId){
 const old=data.operations.find(x=>x.id===editingId);
 if(old){
  if(old.type==='income')data.balance-=old.amount;
  if(old.type==='expense'&&old.payment==='current')data.balance+=old.amount;
  old.type=type;old.label=label;old.amount=amount;old.date=date;old.category=document.querySelector('#category').value;old.payment=type==='expense'?document.querySelector('#payment').value:'current';
  if(old.type==='income')data.balance+=amount;
  if(old.type==='expense'&&old.payment==='current')data.balance-=amount;
 }
 feedback.textContent='Opération modifiée.';
 editingId=null;document.querySelector('#saveOp').textContent='Enregistrer';
}else{
 let op={id:crypto.randomUUID(),type,label,amount,date,category:document.querySelector('#category').value,payment:type==='expense'?document.querySelector('#payment').value:'current',cardDebited:false};
 data.operations.push(op);
 if(type==='income')data.balance=Number((data.balance+amount).toFixed(2));
 if(type==='expense'&&op.payment==='current')data.balance=Number((data.balance-amount).toFixed(2));
 feedback.textContent='Opération enregistrée.';
}
data.balance=Number(data.balance.toFixed(2));
document.querySelector('#label').value='';document.querySelector('#amount').value='';
save()
};
document.querySelector('#saveSettings').onclick=()=>{data.balance=money(settingBalance.value);data.cardDebitDay=Math.max(1,Math.min(28,Number(cardDay.value||4)));save()};
function addRule(t){let p=t==='i'?'ir':'cr',label=document.querySelector('#'+p+'Label').value.trim(),amount=money(document.querySelector('#'+p+'Amount').value),day=Number(document.querySelector('#'+p+'Day').value);if(!label||amount<=0||day<1||day>31)return alert('Complète les trois champs.');(t==='i'?data.incomeRules:data.chargeRules).push({id:crypto.randomUUID(),label,amount,day});document.querySelector('#'+p+'Label').value='';document.querySelector('#'+p+'Amount').value='';document.querySelector('#'+p+'Day').value='';save()}
document.querySelector('#addIncomeRule').onclick=()=>addRule('i');document.querySelector('#addChargeRule').onclick=()=>addRule('c');
document.addEventListener('click',e=>{let v=e.target.dataset.del;if(!v)return;let[t,id]=v.split(':');if(t==='i')data.incomeRules=data.incomeRules.filter(r=>r.id!==id);else data.chargeRules=data.chargeRules.filter(r=>r.id!==id);save()});
document.querySelector('#filter').onchange=render;document.querySelector('#theme').onclick=()=>{data.theme=data.theme==='dark'?'light':'dark';save()};
document.querySelector('#export').onclick=()=>{let blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mon_budget_essentiel.json';a.click()};
document.querySelector('#import').onchange=async e=>{let f=e.target.files[0];if(!f)return;try{data={...structuredClone(defaults),...JSON.parse(await f.text())};save();alert('Sauvegarde importée.')}catch{alert('Fichier invalide.')}};
document.querySelector('#reset').onclick=()=>{if(confirm('Tout effacer ?')){data=structuredClone(defaults);save()}};

function renderAlert(){
 const p=projected(),card=cardPending(),el=document.querySelector('#alertCard'),badge=document.querySelector('#alertBadge'),text=document.querySelector('#alertText');
 el.classList.remove('warning','danger');
 if(p<0){el.classList.add('danger');badge.textContent='Risque';text.textContent=`Fin de mois estimée à ${euro(p)}. Réduis les dépenses non essentielles.`}
 else if(p<300){el.classList.add('warning');badge.textContent='Attention';text.textContent=`Marge faible : ${euro(p)} prévue en fin de mois.`}
 else if(card>data.balance*.5){el.classList.add('warning');badge.textContent='CB élevée';text.textContent=`La CB différée représente ${euro(card)}.`}
 else{badge.textContent='OK';text.textContent=`Situation correcte. Fin de mois estimée à ${euro(p)}.`}
}
document.querySelector('#simulate').onclick=()=>{
 const amount=money(document.querySelector('#simAmount').value),box=document.querySelector('#simResult');
 if(amount<=0){box.className='simulation-result show';box.innerHTML='Saisis un montant valide.';return}
 const after=projected()-amount,newDaily=Math.max(0,after/left());
 const verdict=after<0?'Achat risqué':after<300?'Achat à surveiller':'Achat possible';
 box.className='simulation-result show';
 box.innerHTML=`<span>${verdict}</span><b>${euro(after)} en fin de mois</b><small>Nouveau budget du jour : ${euro(newDaily)}</small>`;
};
document.addEventListener('click',e=>{
 const id=e.target.closest('[data-edit-op]')?.dataset.editOp;
 if(!id)return;
 const op=data.operations.find(x=>x.id===id);if(!op)return;
 const choice=prompt('Tape 1 pour modifier ou 2 pour supprimer.');
 if(choice==='2'){
   if(confirm('Supprimer cette opération ?')){
     if(op.type==='income')data.balance-=op.amount;
     if(op.type==='expense'&&op.payment==='current')data.balance+=op.amount;
     data.operations=data.operations.filter(x=>x.id!==id);
     data.balance=Number(data.balance.toFixed(2));save();
   }
   return;
 }
 if(choice==='1'){
   editingId=id;type=op.type;
   document.querySelector('#label').value=op.label;
   document.querySelector('#amount').value=String(op.amount).replace('.',',');
   document.querySelector('#date').value=op.date;
   document.querySelector('#category').value=op.category||'Autre';
   document.querySelector('#payment').value=op.payment||'current';
   document.querySelector('#expenseType').classList.toggle('active',type==='expense');
   document.querySelector('#incomeType').classList.toggle('active',type==='income');
   document.querySelector('#paymentBox').style.display=type==='expense'?'block':'none';
   document.querySelector('#saveOp').textContent='Enregistrer la modification';
   document.querySelector('[data-tab="add"]').click();
 }
});

document.querySelector('#date').value=today();render();