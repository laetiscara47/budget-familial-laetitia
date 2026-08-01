const KEY='mon_budget_essentiel_v5';
const LEGACY_KEYS=['mon_budget_essentiel_v4','budget_essentiel_v3','budget_essentiel_v2','budget_essentiel_v1'];
const defaults={balance:2697.32,cardDebitDay:4,operations:[],incomeRules:[{id:'i1',label:'CAF',amount:867.92,day:5},{id:'i2',label:'Assurance Maëva',amount:130,day:10}],chargeRules:[{id:'c1',label:'Orange',amount:28.99,day:6},{id:'c2',label:'Eau de Garonne',amount:64,day:3}],theme:'light'};
let data=load(),opType='expense',payment='deferred',category='Alimentation';

function load(){
  try{
    const current=localStorage.getItem(KEY);
    if(current)return {...structuredClone(defaults),...JSON.parse(current)};
    for(const k of LEGACY_KEYS){
      const old=localStorage.getItem(k);
      if(old){
        const migrated={...structuredClone(defaults),...JSON.parse(old)};
        localStorage.setItem(KEY,JSON.stringify(migrated));
        return migrated;
      }
    }
  }catch{}
  return structuredClone(defaults)
}

function normalizeRules(){
  data.incomeRules=(data.incomeRules||[]).map(r=>({...r,active:r.active!==false}));
  data.chargeRules=(data.chargeRules||[]).map(r=>({...r,active:r.active!==false}));
}

function save(){localStorage.setItem(KEY,JSON.stringify(data));renderAll()}
function euro(n){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(n||0))}
function money(v){return Number(String(v||'').replace(/\s/g,'').replace(',','.'))||0}
function today(){return new Date().toISOString().slice(0,10)}
function monthKey(v){return String(v).slice(0,7)}
function currentMonth(){return today().slice(0,7)}
function daysInMonth(){const d=new Date();return new Date(d.getFullYear(),d.getMonth()+1,0).getDate()}
function daysLeft(){return Math.max(1,daysInMonth()-new Date().getDate()+1)}
function safeDate(day,monthOffset=0){const n=new Date(),d=new Date(n.getFullYear(),n.getMonth()+monthOffset,1),last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(Number(day),last));d.setHours(12);return d.toISOString().slice(0,10)}
function cardPending(){return data.operations.filter(x=>x.type==='expense'&&x.payment==='deferred'&&!x.cardDebited).reduce((s,x)=>s+x.amount,0)}

function recurringKey(type,ruleId,year,month){
  return `${type}:${ruleId}:${year}-${String(month+1).padStart(2,'0')}`;
}
function materializeRecurring(){
  const now=new Date();
  const year=now.getFullYear(),month=now.getMonth(),todayDay=now.getDate();
  let changed=false;

  data.incomeRules.forEach(rule=>{
    if(rule.active===false)return;
    if(Number(rule.day)>todayDay)return;
    const key=recurringKey('income',rule.id,year,month);
    if(data.operations.some(op=>op.recurringKey===key))return;
    const op={
      id:crypto.randomUUID(),
      type:'income',
      label:rule.label,
      amount:Number(rule.amount),
      date:safeDate(rule.day),
      category:'Revenu récurrent',
      payment:'current',
      cardDebited:false,
      recurringKey:key,
      generated:true
    };
    data.operations.push(op);
    data.balance=Number((data.balance+op.amount).toFixed(2));
    changed=true;
  });

  data.chargeRules.forEach(rule=>{
    if(rule.active===false)return;
    if(Number(rule.day)>todayDay)return;
    const key=recurringKey('charge',rule.id,year,month);
    if(data.operations.some(op=>op.recurringKey===key))return;
    const op={
      id:crypto.randomUUID(),
      type:'expense',
      label:rule.label,
      amount:Number(rule.amount),
      date:safeDate(rule.day),
      category:'Prélèvement récurrent',
      payment:'current',
      cardDebited:false,
      recurringKey:key,
      generated:true
    };
    data.operations.push(op);
    data.balance=Number((data.balance-op.amount).toFixed(2));
    changed=true;
  });

  if(changed){
    localStorage.setItem(KEY,JSON.stringify(data));
  }
}

function expectedIncome(){const day=new Date().getDate();return data.incomeRules.filter(r=>r.active!==false&&r.day>=day).reduce((s,r)=>s+r.amount,0)}
function remainingCharges(){const day=new Date().getDate();return data.chargeRules.filter(r=>r.active!==false&&r.day>=day).reduce((s,r)=>s+r.amount,0)}
function available(){return data.balance-cardPending()}
function forecast(){return data.balance-cardPending()+expectedIncome()-remainingCharges()}
function dailyBudget(){return Math.max(0,forecast()/daysLeft())}
function monthOps(){return data.operations.filter(x=>monthKey(x.date)===currentMonth())}
function monthIncome(){return monthOps().filter(x=>x.type==='income').reduce((s,x)=>s+x.amount,0)}
function monthExpense(){return monthOps().filter(x=>x.type==='expense').reduce((s,x)=>s+x.amount,0)}
function nextRule(rules){const day=new Date().getDate();return [...rules].filter(r=>r.active!==false).sort((a,b)=>(a.day>=day?a.day:a.day+31)-(b.day>=day?b.day:b.day+31))[0]}
function icon(kind){return {income:'💰',charge:'🧾',expense:'🛒',card:'💳'}[kind]||'•'}
function typeLabel(kind){return {income:'Revenu',charge:'Prélèvement',expense:'Dépense',card:'CB différée'}[kind]||''}
function esc(v){return String(v).replace(/[&<>\"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[s]))}

function allEvents(){
  const list=[];
  data.operations.forEach(o=>list.push({...o,kind:o.type,signed:o.type==='income'?o.amount:-o.amount}));
  const now=new Date(),year=now.getFullYear(),month=now.getMonth();
  data.incomeRules.filter(r=>r.active!==false).forEach(r=>{
    const key=recurringKey('income',r.id,year,month);
    if(!data.operations.some(op=>op.recurringKey===key)){
      list.push({id:'ri'+r.id,kind:'income',label:r.label,date:safeDate(r.day),signed:r.amount,rule:true});
    }
  });
  data.chargeRules.filter(r=>r.active!==false).forEach(r=>{
    const key=recurringKey('charge',r.id,year,month);
    if(!data.operations.some(op=>op.recurringKey===key)){
      list.push({id:'rc'+r.id,kind:'charge',label:r.label,date:safeDate(r.day),signed:-r.amount,rule:true});
    }
  });
  if(cardPending()>0){
    const now=new Date(),offset=now.getDate()<=data.cardDebitDay?0:1;
    list.push({id:'card',kind:'card',label:'Débit CB différée',date:safeDate(data.cardDebitDay,offset),signed:-cardPending(),rule:true});
  }
  return list.sort((a,b)=>a.date.localeCompare(b.date))
}

function nextRecurring(){
  const now=new Date(),todayDay=now.getDate();
  const candidates=[];
  data.incomeRules.filter(r=>r.active!==false).forEach(r=>{
    candidates.push({label:r.label,day:Number(r.day),type:'income',amount:Number(r.amount)});
  });
  data.chargeRules.filter(r=>r.active!==false).forEach(r=>{
    candidates.push({label:r.label,day:Number(r.day),type:'charge',amount:Number(r.amount)});
  });
  if(!candidates.length)return null;
  return candidates.sort((a,b)=>{
    const da=a.day>=todayDay?a.day:a.day+31;
    const db=b.day>=todayDay?b.day:b.day+31;
    return da-db;
  })[0];
}

function statusInfo(){
  const f=forecast(),d=dailyBudget();
  if(f<0)return {level:'danger',title:'Risque',text:`Fin de mois estimée à ${euro(f)}. Limitez les dépenses non essentielles.`};
  if(f<300||d<20)return {level:'warning',title:'Attention',text:`Marge limitée. Budget conseillé aujourd’hui : ${euro(d)}.`};
  return {level:'ok',title:'Situation confortable',text:`Vous pouvez viser environ ${euro(d)} aujourd’hui.`};
}
function drawEvents(selector,items,limit){
  const target=document.querySelector(selector);
  const arr=typeof limit==='number'?items.slice(0,limit):items;
  target.innerHTML=arr.length?arr.map(x=>{
    const dt=new Date(x.date+'T12:00:00');
    return `<div class="timeline-row"><div class="date-box">${dt.getDate()}<small>${dt.toLocaleDateString('fr-FR',{month:'short'})}</small></div><div><b>${icon(x.kind)} ${esc(x.label)}</b><small>${typeLabel(x.kind)}</small></div><div class="amount ${x.signed>=0?'positive':'negative'}">${x.signed>=0?'+':''}${euro(x.signed)}</div></div>`
  }).join(''):'<p style="color:var(--muted)">Aucune opération.</p>'
}
function renderHome(){
  document.querySelector('#homeAvailable').textContent=euro(available());
  document.querySelector('#homeForecast').textContent=`Fin de mois estimée : ${euro(forecast())}`;
  document.querySelector('#homeCard').textContent=euro(cardPending());
  document.querySelector('#homeCardDay').textContent=data.cardDebitDay;
  const todayBudget=dailyBudget();
  document.querySelector('#homeDaily').textContent=euro(todayBudget);
  document.querySelector('#homeDailyTop').textContent=euro(todayBudget);
  document.querySelector('#homeDailyHint').textContent=`Fin de mois prévue : ${euro(forecast())}`;
  document.querySelector('#homeMonthName').textContent=new Date().toLocaleDateString('fr-FR',{month:'long'});
  document.querySelector('#homeMonthIncome').textContent=euro(monthIncome());
  document.querySelector('#homeMonthExpense').textContent=euro(monthExpense());
  document.querySelector('#homeMonthForecast').textContent=euro(forecast());
  const ni=nextRule(data.incomeRules),nc=nextRule(data.chargeRules);
  document.querySelector('#homeNextIncome').textContent=ni?euro(ni.amount):'—';
  document.querySelector('#homeNextIncomeLabel').textContent=ni?`${ni.label} · le ${ni.day}`:'Aucun';
  document.querySelector('#homeNextCharge').textContent=nc?euro(nc.amount):'—';
  document.querySelector('#homeNextChargeLabel').textContent=nc?`${nc.label} · le ${nc.day}`:'Aucun';
  const st=statusInfo();
  const statusColor=st.level==='danger'?'var(--red)':st.level==='warning'?'var(--orange)':'var(--green)';
  document.querySelector('#statusTitle').textContent=st.title;
  document.querySelector('#statusText').textContent=st.text;
  document.querySelector('#statusDot').style.background=statusColor;
  document.querySelector('#statusTitleTop').textContent=st.title;
  document.querySelector('#statusTextTop').textContent=st.text;
  document.querySelector('#statusDotTop').style.background=statusColor;
  drawEvents('#homeUpcoming',allEvents().filter(x=>x.date>=today()),5);
}
function renderAgenda(){
  const filter=document.querySelector('#agendaFilter').value;
  drawEvents('#agendaList',allEvents().filter(x=>filter==='all'||x.kind===filter));
}
function renderAccounts(){
  document.querySelector('#accountBalance').textContent=euro(data.balance);
  document.querySelector('#accountCard').textContent=euro(cardPending());
  document.querySelector('#accountAvailable').textContent=euro(available());
  document.querySelector('#monthIncome').textContent=euro(monthIncome());
  document.querySelector('#monthExpense').textContent=euro(monthExpense());
  document.querySelector('#monthForecast').textContent=euro(forecast());
  const recent=data.operations.slice(-8).reverse().map(o=>({...o,kind:o.type,signed:o.type==='income'?o.amount:-o.amount}));
  drawEvents('#recentList',recent);
}
function ruleRow(rule,type){
  const state=rule.active===false?'Désactivé':'Actif';
  return `<div class="rule-row">
    <div><b>${esc(rule.label)}</b><small>${euro(rule.amount)} · le ${rule.day} · ${state}</small></div>
    <div class="rule-actions">
      <button class="toggle-rule ${rule.active===false?'off':''}" data-toggle-rule="${type}:${rule.id}">${rule.active===false?'Activer':'Désactiver'}</button>
      <button data-delete-rule="${type}:${rule.id}">Supprimer</button>
    </div>
  </div>`
}
function renderSettings(){
  document.querySelector('#settingBalance').value=String(data.balance).replace('.',',');
  document.querySelector('#settingCardDay').value=data.cardDebitDay;
  document.querySelector('#incomeRules').innerHTML=data.incomeRules.map(r=>ruleRow(r,'income')).join('')||'<p>Aucun revenu.</p>';
  document.querySelector('#chargeRules').innerHTML=data.chargeRules.map(r=>ruleRow(r,'charge')).join('')||'<p>Aucun prélèvement.</p>';
  document.querySelector('#activeIncomeCount').textContent=data.incomeRules.filter(r=>r.active!==false).length;
  document.querySelector('#activeChargeCount').textContent=data.chargeRules.filter(r=>r.active!==false).length;
  const nr=nextRecurring();
  document.querySelector('#nextRecurringLabel').textContent=nr?`${nr.label} · le ${nr.day}`:'Aucune';
  document.body.classList.toggle('dark',data.theme==='dark');
  document.querySelector('#themeToggle').textContent=data.theme==='dark'?'☀️':'🌙';
}

function renderOperations(){
  const search=(document.querySelector('#operationsSearch')?.value||'').trim().toLowerCase();
  const filter=document.querySelector('#operationsFilter')?.value||'all';
  const list=data.operations
    .filter(op=>filter==='all'||op.type===filter)
    .filter(op=>{
      if(!search)return true;
      return `${op.label} ${op.category||''} ${op.date}`.toLowerCase().includes(search);
    })
    .sort((a,b)=>b.date.localeCompare(a.date))
    .map(op=>({...op,kind:op.type,signed:op.type==='income'?op.amount:-op.amount}));

  const target=document.querySelector('#operationsList');
  if(!target)return;
  target.innerHTML=list.length?list.map(op=>{
    const dt=new Date(op.date+'T12:00:00');
    return `<div class="timeline-row operation-editable" data-operation-id="${op.id}">
      <div class="date-box">${dt.getDate()}<small>${dt.toLocaleDateString('fr-FR',{month:'short'})}</small></div>
      <div><b>${icon(op.kind)} ${esc(op.label)}</b><small>${op.category||typeLabel(op.kind)}</small></div>
      <div class="amount ${op.signed>=0?'positive':'negative'}">${op.signed>=0?'+':''}${euro(op.signed)}</div>
    </div>`;
  }).join(''):'<p style="color:var(--muted)">Aucune opération trouvée.</p>';
}

function renderAll(){renderHome();renderAgenda();renderAccounts();renderOperations();renderSettings();updateImpact()}

function setTab(tab){
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===tab));
  document.querySelectorAll('.bottom-nav [data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));

function setType(value){
  opType=value;
  document.querySelector('#chooseExpense').classList.toggle('active',value==='expense');
  document.querySelector('#chooseIncome').classList.toggle('active',value==='income');
  document.querySelector('#paymentBox').style.display=value==='expense'?'block':'none';
  updateImpact()
}
function setPayment(value){
  payment=value;
  document.querySelector('#chooseDeferred').classList.toggle('active',value==='deferred');
  document.querySelector('#chooseCurrent').classList.toggle('active',value==='current');
  updateImpact()
}
const categories=[['Alimentation','🛒'],['Maison','🏠'],['Transport','🚗'],['Santé','❤️'],['Famille','👨‍👩‍👧'],['Loisirs','🎾'],['Autre','📦']];
document.querySelector('#categoryButtons').innerHTML=categories.map(([name,emoji],i)=>`<button class="category-btn ${i===0?'active':''}" data-category="${name}">${emoji}<br>${name}</button>`).join('');
document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.category;document.querySelectorAll('[data-category]').forEach(x=>x.classList.toggle('active',x===b))}));
document.querySelector('#chooseExpense').onclick=()=>setType('expense');
document.querySelector('#chooseIncome').onclick=()=>setType('income');
document.querySelector('#chooseDeferred').onclick=()=>setPayment('deferred');
document.querySelector('#chooseCurrent').onclick=()=>setPayment('current');


function normalizeText(value){
  return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
function smartSuggestion(label){
  const text=normalizeText(label);
  const incomeWords=['caf','salaire','paie','assurance maeva','remboursement','allocation','pension'];
  const rules=[
    {words:['carrefour','leclerc','intermarche','lidl','aldi','auchan','casino','courses','boulangerie'],category:'Alimentation',type:'expense'},
    {words:['orange','sfr','bouygues','free','telephone','internet'],category:'Maison',type:'expense'},
    {words:['essence','total','esso','station','carburant','garage','peage'],category:'Transport',type:'expense'},
    {words:['pharmacie','medecin','docteur','dentiste','sante'],category:'Santé',type:'expense'},
    {words:['tennis','cinema','restaurant','sortie','loisir'],category:'Loisirs',type:'expense'},
    {words:['edf','engie','eau de garonne','assurance','loyer','credit','maison'],category:'Maison',type:'expense'}
  ];
  if(incomeWords.some(w=>text.includes(w)))return {type:'income',category:'Autre',message:'Revenu reconnu automatiquement'};
  for(const rule of rules){
    if(rule.words.some(w=>text.includes(w)))return {type:rule.type,category:rule.category,message:`Catégorie proposée : ${rule.category}`};
  }
  return {type:'expense',category:data.lastCategory||'Autre',message:'Catégorie habituelle conservée'};
}
function applySmartSuggestion(){
  const label=document.querySelector('#opLabel').value.trim();
  if(!label)return;
  const suggestion=smartSuggestion(label);
  setType(suggestion.type);
  category=suggestion.category;
  data.lastCategory=category;
  document.querySelectorAll('[data-category]').forEach(btn=>btn.classList.toggle('active',btn.dataset.category===category));
  document.querySelector('#autoHint').textContent=suggestion.message;
  localStorage.setItem(KEY,JSON.stringify(data));
  updateImpact();
}

function updateImpact(){
  const amount=money(document.querySelector('#opAmount').value),box=document.querySelector('#impactPreview');
  if(amount<=0){box.classList.remove('show');box.innerHTML='';return}
  box.classList.add('show');
  if(opType==='income')box.innerHTML=`Après ce revenu, le compte afficherait <b>${euro(data.balance+amount)}</b>`;
  else box.innerHTML=`Après cette dépense, le budget conseillé serait d’environ <b>${euro(Math.max(0,(forecast()-amount)/daysLeft()))}</b><small>${payment==='deferred'?'Ajouté à la CB différée':'Débit immédiat du compte'}</small>`;
}
document.querySelector('#opAmount').addEventListener('input',updateImpact);
document.querySelector('#opLabel').addEventListener('input',()=>{
  clearTimeout(window.__smartTimer);
  window.__smartTimer=setTimeout(applySmartSuggestion,250);
});

document.querySelector('#saveOperation').onclick=()=>{
  applySmartSuggestion();
  const amount=money(document.querySelector('#opAmount').value),label=document.querySelector('#opLabel').value.trim(),date=document.querySelector('#opDate').value||today();
  if(amount<=0||!label){document.querySelector('#saveMessage').textContent='Complétez le montant et le libellé.';return}
  const op={id:crypto.randomUUID(),type:opType,label,amount,date,category,payment:opType==='expense'?payment:'current',cardDebited:false};
  data.operations.push(op);
  if(opType==='income')data.balance=Number((data.balance+amount).toFixed(2));
  if(opType==='expense'&&payment==='current')data.balance=Number((data.balance-amount).toFixed(2));
  document.querySelector('#opAmount').value='';
  document.querySelector('#opLabel').value='';
  document.querySelector('#autoHint').textContent='La catégorie sera proposée automatiquement.';
  document.querySelector('#saveMessage').textContent='Opération enregistrée.';
  save();
  setTimeout(()=>setTab('home'),350)
};

document.querySelector('#agendaFilter').addEventListener('change',renderAgenda);
document.querySelector('#saveSettings').onclick=()=>{
  data.balance=money(document.querySelector('#settingBalance').value);
  data.cardDebitDay=Math.max(1,Math.min(28,Number(document.querySelector('#settingCardDay').value||4)));
  save()
};
function addRule(type){
  const p=type==='income'?'income':'charge';
  const label=document.querySelector('#'+p+'Label').value.trim(),amount=money(document.querySelector('#'+p+'Amount').value),day=Number(document.querySelector('#'+p+'Day').value);
  if(!label||amount<=0||day<1||day>31)return alert('Complétez le nom, le montant et le jour.');
  (type==='income'?data.incomeRules:data.chargeRules).push({id:crypto.randomUUID(),label,amount,day,active:true});
  document.querySelector('#'+p+'Label').value='';document.querySelector('#'+p+'Amount').value='';document.querySelector('#'+p+'Day').value='';
  save()
}
document.querySelector('#addIncomeRule').onclick=()=>addRule('income');
document.querySelector('#addChargeRule').onclick=()=>addRule('charge');
document.addEventListener('click',e=>{
  const toggle=e.target.dataset.toggleRule;
  if(toggle){
    const [type,id]=toggle.split(':');
    const list=type==='income'?data.incomeRules:data.chargeRules;
    const rule=list.find(r=>r.id===id);
    if(rule){rule.active=rule.active===false;save();}
    return;
  }
  const val=e.target.dataset.deleteRule;
  if(!val)return;
  const [type,id]=val.split(':');
  if(type==='income')data.incomeRules=data.incomeRules.filter(r=>r.id!==id);
  else data.chargeRules=data.chargeRules.filter(r=>r.id!==id);
  save()
});
document.querySelector('#themeToggle').onclick=()=>{data.theme=data.theme==='dark'?'light':'dark';save()};
document.querySelector('#exportData').onclick=()=>{
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='mon_budget_essentiel_v4.json';a.click()
};
document.querySelector('#importData').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{data={...structuredClone(defaults),...JSON.parse(await file.text())};save();alert('Sauvegarde importée.')}catch{alert('Fichier invalide.')}
};
document.querySelector('#resetData').onclick=()=>{if(confirm('Tout effacer et repartir de zéro ?')){data=structuredClone(defaults);save()}};

document.querySelector('#quickAdd').onclick=()=>setTab('add');

function restoreOperationToBalance(op){
  if(op.type==='income')data.balance=Number((data.balance-op.amount).toFixed(2));
  if(op.type==='expense'&&op.payment==='current')data.balance=Number((data.balance+op.amount).toFixed(2));
}
function applyOperationToBalance(op){
  if(op.type==='income')data.balance=Number((data.balance+op.amount).toFixed(2));
  if(op.type==='expense'&&op.payment==='current')data.balance=Number((data.balance-op.amount).toFixed(2));
}
function editOperation(id){
  const op=data.operations.find(x=>x.id===id);
  if(!op)return;
  const action=prompt('Tapez 1 pour modifier ou 2 pour supprimer.');
  if(action==='2'){
    if(confirm(`Supprimer « ${op.label} » ?`)){
      restoreOperationToBalance(op);
      data.operations=data.operations.filter(x=>x.id!==id);
      save();
    }
    return;
  }
  if(action!=='1')return;

  const newLabel=prompt('Libellé',op.label);
  if(newLabel===null)return;
  const newAmountText=prompt('Montant',String(op.amount).replace('.',','));
  if(newAmountText===null)return;
  const newAmount=money(newAmountText);
  if(!newLabel.trim()||newAmount<=0){alert('Libellé ou montant invalide.');return}

  restoreOperationToBalance(op);
  op.label=newLabel.trim();
  op.amount=newAmount;
  const suggestion=smartSuggestion(op.label);
  op.category=suggestion.category;
  op.type=suggestion.type;
  if(op.type==='income')op.payment='current';
  applyOperationToBalance(op);
  save();
}
document.addEventListener('click',e=>{
  const row=e.target.closest('[data-operation-id]');
  if(row)editOperation(row.dataset.operationId);
});
document.querySelector('#operationsSearch').addEventListener('input',renderOperations);
document.querySelector('#operationsFilter').addEventListener('change',renderOperations);


document.querySelector('#checkRecurringNow').onclick=()=>{
  materializeRecurring();
  renderAll();
  alert('Vérification terminée. Aucune échéance ne sera créée deux fois.');
};


function refreshQuickSuggestion(){
  const label=document.querySelector('#quickLabel').value.trim();
  const target=document.querySelector('#quickSuggestion');
  if(!label){
    target.textContent='Dépense · catégorie habituelle · aujourd’hui';
    return;
  }
  const s=smartSuggestion(label);
  target.textContent=`${s.type==='income'?'Revenu':'Dépense'} · ${s.category} · aujourd’hui`;
}
document.querySelector('#quickLabel').addEventListener('input',refreshQuickSuggestion);

document.querySelector('#quickSave').onclick=()=>{
  const label=document.querySelector('#quickLabel').value.trim();
  const amount=money(document.querySelector('#quickAmount').value);
  const message=document.querySelector('#quickMessage');

  if(!label||amount<=0){
    message.textContent='Complétez le nom et le montant.';
    return;
  }

  const suggestion=smartSuggestion(label);
  const operation={
    id:crypto.randomUUID(),
    type:suggestion.type,
    label,
    amount,
    date:today(),
    category:suggestion.category,
    payment:suggestion.type==='income'?'current':'current',
    cardDebited:false
  };

  data.operations.push(operation);
  applyOperationToBalance(operation);
  data.lastCategory=suggestion.category;

  document.querySelector('#quickLabel').value='';
  document.querySelector('#quickAmount').value='';
  document.querySelector('#quickSuggestion').textContent='Dépense · catégorie habituelle · aujourd’hui';
  message.textContent='Opération enregistrée.';
  save();

  setTimeout(()=>{message.textContent=''},1200);
};

document.querySelector('#opDate').value=today();
normalizeRules();
materializeRecurring();
requestAnimationFrame(()=>renderAll());