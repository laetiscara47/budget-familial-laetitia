const KEY='mon_budget_essentiel_v5';
const LEGACY_KEYS=[
  'mon_budget_familial_v8',
  'mon_budget_familial_1_0',
  'mon_budget_essentiel_v7',
  'mon_budget_essentiel_v6_5',
  'mon_budget_essentiel_v6',
  'mon_budget_essentiel_v5_2_5',
  'mon_budget_essentiel_v5_2_4',
  'mon_budget_essentiel_v5_2_3',
  'mon_budget_essentiel_v5_2_2',
  'mon_budget_essentiel_v5_2_1',
  'mon_budget_essentiel_v5_2',
  'mon_budget_essentiel_v5_1',
  'mon_budget_essentiel_v4',
  'budget_essentiel_v3',
  'budget_essentiel_v2',
  'budget_essentiel_v1'
];
const defaults={balance:2697.32,cardDebitDay:4,operations:[],incomeRules:[{id:'i1',label:'CAF',amount:867.92,day:5},{id:'i2',label:'Assurance Maëva',amount:130,day:10}],chargeRules:[{id:'c1',label:'Orange',amount:28.99,day:6},{id:'c2',label:'Eau de Garonne',amount:64,day:3}],theme:'light'};
let data=load(),opType='expense',payment='deferred',category='Alimentation';

function load(){
  function parse(key){
    try{
      const raw=localStorage.getItem(key);
      return raw?JSON.parse(raw):null;
    }catch{return null}
  }
  function score(value){
    if(!value||typeof value!=='object')return -1;
    let total=0;
    if(Number(value.balance)!==0)total+=1000;
    total+=(Array.isArray(value.operations)?value.operations.length:0)*20;
    total+=(Array.isArray(value.incomeRules)?value.incomeRules.length:0)*5;
    total+=(Array.isArray(value.chargeRules)?value.chargeRules.length:0)*5;
    return total;
  }

  const keys=[KEY,KEY+'_backup',...LEGACY_KEYS];
  let best=null,bestScore=-1;
  for(const key of keys){
    const candidate=parse(key);
    const candidateScore=score(candidate);
    if(candidateScore>bestScore){
      best=candidate;
      bestScore=candidateScore;
    }
  }

  if(best){
    const migrated={...structuredClone(defaults),...best};
    localStorage.setItem(KEY,JSON.stringify(migrated));
    return migrated;
  }
  return structuredClone(defaults)
}

function normalizeRules(){
  data.incomeRules=(data.incomeRules||[]).map(r=>({...r,active:r.active!==false}));
  data.chargeRules=(data.chargeRules||[]).map(r=>({...r,active:r.active!==false}));
}

function save(){
  try{
    const previous=localStorage.getItem(KEY);
    if(previous)localStorage.setItem(KEY+'_backup',previous);
    localStorage.setItem(KEY,JSON.stringify(data));
  }catch(error){
    alert("La sauvegarde locale a échoué.");
  }
  renderAll()
}
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

function savingsPossible(){return Math.max(0,forecast()-300)}
function categoryTotals(){
  const totals={};
  monthOps().filter(x=>x.type==='expense').forEach(op=>{
    const cat=op.category||'Autre';
    totals[cat]=(totals[cat]||0)+Number(op.amount);
  });
  return Object.entries(totals).sort((a,b)=>b[1]-a[1]);
}
function buildSmartAdvice(){
  const totals=categoryTotals(),f=forecast(),d=dailyBudget();
  if(f<0)return `Attention : la fin de mois est estimée à ${euro(f)}. Réduisez les dépenses non essentielles.`;
  if(!totals.length)return `Aucune dépense enregistrée ce mois-ci. Votre budget conseillé est de ${euro(d)} par jour.`;
  const [topCat,topAmount]=totals[0];
  const share=monthExpense()>0?Math.round((topAmount/monthExpense())*100):0;
  if(share>=50)return `${topCat} représente ${share} % de vos dépenses ce mois-ci. C’est la catégorie principale à surveiller.`;
  return `Votre situation reste confortable. Vous pouvez viser environ ${euro(d)} aujourd’hui et mettre de côté jusqu’à ${euro(savingsPossible())}.`;
}

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



function weekExpectedIncome(){
  const limit=new Date(today()+'T12:00:00');
  limit.setDate(limit.getDate()+7);
  return allEvents()
    .filter(x=>x.kind==='income'&&x.date>=today()&&new Date(x.date+'T12:00:00')<=limit)
    .reduce((sum,x)=>sum+Number(x.signed||0),0);
}
function showToast(title,text=''){
  const toast=document.querySelector('#toast');
  document.querySelector('#toastTitle').textContent=title;
  document.querySelector('#toastText').textContent=text;
  toast.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer=setTimeout(()=>toast.classList.remove('show'),2200);
}
function openModal(type){
  const modal=document.querySelector('#appModal');
  const title=document.querySelector('#modalTitle');
  const content=document.querySelector('#modalContent');

  if(type==='card'){
    title.textContent='Détail CB différée';
    const items=data.operations.filter(x=>x.type==='expense'&&x.payment==='deferred'&&!x.cardDebited);
    content.innerHTML=`<div class="modal-summary"><span>Débit prévu</span><b>Le ${data.cardDebitDay}</b></div>
      <div class="modal-summary"><span>Montant total</span><b class="negative">${euro(cardPending())}</b></div>
      <h3>Paiements inclus</h3>
      ${items.length?items.map(op=>`<div class="modal-row"><span>${esc(op.label)}</span><b>${euro(op.amount)}</b></div>`).join(''):'<p class="muted-note">Aucun paiement en attente.</p>'}`;
  }else if(type==='income'){
    title.textContent='Prochains revenus';
    const items=allEvents().filter(x=>x.kind==='income'&&x.date>=today()).slice(0,6);
    content.innerHTML=items.length?items.map(x=>`<div class="modal-row"><div><b>${esc(x.label)}</b><small>${new Date(x.date+'T12:00:00').toLocaleDateString('fr-FR')}</small></div><b class="positive">+${euro(x.signed)}</b></div>`).join(''):'<p>Aucun revenu prévu.</p>';
  }else{
    title.textContent='Prochains prélèvements';
    const items=allEvents().filter(x=>['charge','card'].includes(x.kind)&&x.date>=today()).slice(0,6);
    content.innerHTML=items.length?items.map(x=>`<div class="modal-row"><div><b>${esc(x.label)}</b><small>${new Date(x.date+'T12:00:00').toLocaleDateString('fr-FR')}</small></div><b class="negative">${euro(x.signed)}</b></div>`).join(''):'<p>Aucun prélèvement prévu.</p>';
  }
  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');
}
function closeModal(){
  const modal=document.querySelector('#appModal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');
}

function daysUntilDate(dateString){
  const start=new Date(today()+'T12:00:00');
  const end=new Date(dateString+'T12:00:00');
  return Math.round((end-start)/86400000);
}
function renderDashboardAlerts(){
  const box=document.querySelector('#dashboardAlerts');
  if(!box)return;
  document.querySelector('#daysLeftBadge').textContent=`${daysLeft()} jours restants`;

  const future=allEvents().filter(x=>x.date>=today());
  const close=future.filter(x=>daysUntilDate(x.date)<=3).slice(0,3);
  const alerts=[];

  close.forEach(x=>{
    const days=daysUntilDate(x.date);
    const when=days===0?"aujourd’hui":days===1?"demain":`dans ${days} jours`;
    alerts.push({
      level:x.signed<0?'warning':'good',
      icon:x.signed<0?'🔔':'💰',
      title:`${x.label} ${when}`,
      text:`${x.signed>=0?'+':''}${euro(x.signed)}`
    });
  });

  const totals=categoryTotals();
  if(totals.length&&monthExpense()>0){
    const [cat,amount]=totals[0];
    const share=Math.round(amount/monthExpense()*100);
    if(share>=45)alerts.push({level:'warning',icon:'🛒',title:`${cat} représente ${share} % des dépenses`,text:euro(amount)});
  }

  if(!alerts.length){
    alerts.push({level:'good',icon:'✅',title:'Rien d’urgent dans les 3 prochains jours',text:`Budget du jour : ${euro(dailyBudget())}`});
  }

  box.innerHTML=alerts.slice(0,4).map(a=>`<div class="alert-line ${a.level}">
    <span class="alert-icon">${a.icon}</span>
    <div><b>${esc(a.title)}</b><small>${esc(a.text)}</small></div>
  </div>`).join('');
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
  const hour=new Date().getHours();
  document.querySelector('#greetingTitle').textContent=`${hour<12?'Bonjour':hour<18?'Bon après-midi':'Bonsoir'} Laetitia 👋`;
  document.querySelector('#greetingSubtitle').textContent='Voici votre situation financière';
  document.querySelector('#weekExpected').textContent=weekExpectedIncome()>0?`↗ ${euro(weekExpectedIncome())} attendus cette semaine`:'Aucun revenu attendu cette semaine';
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
  renderDashboardAlerts();
  document.querySelector('#homeAssistantText').textContent=buildSmartAdvice();
}
function renderAgenda(){
  const filter=document.querySelector('#agendaFilter').value;
  drawEvents('#agendaList',allEvents().filter(x=>filter==='all'||x.kind===filter));
}
function renderAccounts(){
  document.querySelector('#accountBalance').textContent=euro(data.balance);
  document.querySelector('#accountCard').textContent=euro(cardPending());
  document.querySelector('#accountSavings').textContent=euro(data.savings||0);
  document.querySelector('#accountAvailable').textContent=euro(available());
  document.querySelector('#accountDebitDay').textContent=data.cardDebitDay;
  document.querySelector('#accountPatrimony').textContent=euro(available()+(data.savings||0));
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

function renderStats(){
  const statsMonth=document.querySelector('#statsMonth');
  if(!statsMonth)return;
  statsMonth.textContent=new Date().toLocaleDateString('fr-FR',{month:'long'});
  document.querySelector('#statsIncome').textContent=euro(monthIncome());
  document.querySelector('#statsExpense').textContent=euro(monthExpense());
  document.querySelector('#statsSavings').textContent=euro(savingsPossible());
  document.querySelector('#smartAdvice').textContent=buildSmartAdvice();

  const totals=categoryTotals();
  const max=totals.length?totals[0][1]:1;
  document.querySelector('#categoryStats').innerHTML=totals.length?totals.map(([cat,amount])=>{
    const width=Math.max(3,Math.round((amount/max)*100));
    return `<div class="category-stat">
      <div><b>${esc(cat)}</b><span>${euro(amount)}</span></div>
      <div class="category-bar"><i style="width:${width}%"></i></div>
    </div>`;
  }).join(''):'<p style="color:var(--muted)">Aucune dépense ce mois-ci.</p>';
}

function renderSettings(){
  document.querySelector('#settingBalance').value=String(data.balance).replace('.',',');
  document.querySelector('#settingCardDay').value=data.cardDebitDay;
  document.querySelector('#settingSavings').value=String(data.savings||0).replace('.',',');
  document.querySelector('#incomeRules').innerHTML=data.incomeRules.map(r=>ruleRow(r,'income')).join('')||'<p>Aucun revenu.</p>';
  document.querySelector('#chargeRules').innerHTML=data.chargeRules.map(r=>ruleRow(r,'charge')).join('')||'<p>Aucun prélèvement.</p>';
  document.querySelector('#activeIncomeCount').textContent=data.incomeRules.filter(r=>r.active!==false).length;
  document.querySelector('#activeChargeCount').textContent=data.chargeRules.filter(r=>r.active!==false).length;
  const nr=nextRecurring();
  document.querySelector('#nextRecurringLabel').textContent=nr?`${nr.label} · le ${nr.day}`:'Aucune';
  document.body.classList.toggle('dark',data.theme==='dark');
  document.querySelector('#themeToggle').textContent=data.theme==='dark'?'☀️':'🌙';
}

function populateOperationFilters(){
  const monthSelect=document.querySelector('#operationsMonth');
  const categorySelect=document.querySelector('#operationsCategory');
  if(!monthSelect||!categorySelect)return;

  const selectedMonth=monthSelect.value;
  const selectedCategory=categorySelect.value;
  const months=[...new Set(data.operations.map(op=>monthKey(op.date)))].sort().reverse();
  monthSelect.innerHTML='<option value="all">Tous les mois</option>'+months.map(m=>{
    const d=new Date(m+'-01T12:00:00');
    return `<option value="${m}">${d.toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}</option>`;
  }).join('');
  if(months.includes(selectedMonth))monthSelect.value=selectedMonth;

  const cats=[...new Set(data.operations.map(op=>op.category||'Autre'))].sort((a,b)=>a.localeCompare(b,'fr'));
  categorySelect.innerHTML='<option value="all">Toutes les catégories</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
  if(cats.includes(selectedCategory))categorySelect.value=selectedCategory;
}
function renderOperations(){
  populateOperationFilters();
  const search=(document.querySelector('#operationsSearch')?.value||'').trim().toLowerCase();
  const filter=document.querySelector('#operationsFilter')?.value||'all';
  const month=document.querySelector('#operationsMonth')?.value||'all';
  const categoryFilter=document.querySelector('#operationsCategory')?.value||'all';
  const paymentFilter=document.querySelector('#operationsPayment')?.value||'all';
  const sort=document.querySelector('#operationsSort')?.value||'date-desc';

  const list=data.operations
    .filter(op=>filter==='all'||op.type===filter)
    .filter(op=>month==='all'||monthKey(op.date)===month)
    .filter(op=>categoryFilter==='all'||(op.category||'Autre')===categoryFilter)
    .filter(op=>paymentFilter==='all'||(op.payment||'current')===paymentFilter)
    .filter(op=>{
      if(!search)return true;
      return `${op.label} ${op.category||''} ${op.date} ${op.note||''}`.toLowerCase().includes(search);
    })
    .sort((a,b)=>{
      if(sort==='date-asc')return a.date.localeCompare(b.date);
      if(sort==='amount-desc')return Number(b.amount)-Number(a.amount);
      if(sort==='amount-asc')return Number(a.amount)-Number(b.amount);
      return b.date.localeCompare(a.date);
    })
    .map(op=>({...op,kind:op.type,signed:op.type==='income'?op.amount:-op.amount}));

  const target=document.querySelector('#operationsList');
  if(!target)return;
  target.innerHTML=list.length?list.map(op=>{
    const dt=new Date(op.date+'T12:00:00');
    const paymentText=op.payment==='deferred'?'CB différée':'Compte courant';
    return `<div class="timeline-row operation-editable" data-operation-id="${op.id}">
      <div class="date-box">${dt.getDate()}<small>${dt.toLocaleDateString('fr-FR',{month:'short'})}</small></div>
      <div><b>${icon(op.kind)} ${esc(op.label)}</b><small>${esc(op.category||typeLabel(op.kind))} · ${paymentText}</small></div>
      <div class="amount ${op.signed>=0?'positive':'negative'}">${op.signed>=0?'+':''}${euro(op.signed)}</div>
    </div>`;
  }).join(''):'<p style="color:var(--muted)">Aucune opération trouvée.</p>';
}

function renderAll(){renderHome();renderAgenda();renderAccounts();renderOperations();renderStats();renderSettings();updateImpact()}

function setTab(tab){
  const target=document.getElementById(tab);
  if(!target)return;
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s===target));
  document.querySelectorAll('.bottom-nav [data-tab]').forEach(
    b=>b.classList.toggle('active',b.dataset.tab===tab)
  );
  window.scrollTo({top:0,behavior:'smooth'});
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

let ticketData='';
document.querySelector('#opTicket').addEventListener('change',e=>{
  const file=e.target.files[0];
  const preview=document.querySelector('#ticketPreview');
  if(!file){ticketData='';preview.innerHTML='';return}
  if(file.size>1500000){
    alert('Photo trop lourde. Choisissez une image plus légère.');
    e.target.value='';
    return;
  }
  const reader=new FileReader();
  reader.onload=()=>{
    ticketData=reader.result;
    preview.innerHTML=`<img src="${ticketData}" alt="Ticket">`;
  };
  reader.readAsDataURL(file);
});

document.querySelector('#opAmount').addEventListener('input',updateImpact);
document.querySelector('#opLabel').addEventListener('input',()=>{
  clearTimeout(window.__smartTimer);
  window.__smartTimer=setTimeout(applySmartSuggestion,250);
});

document.querySelector('#saveOperation').onclick=()=>{
  applySmartSuggestion();
  const amount=money(document.querySelector('#opAmount').value),label=document.querySelector('#opLabel').value.trim(),date=document.querySelector('#opDate').value||today();
  if(amount<=0||!label){document.querySelector('#saveMessage').textContent='Complétez le montant et le libellé.';return}
  const op={id:crypto.randomUUID(),type:opType,label,amount,date,category,payment:opType==='expense'?payment:'current',cardDebited:false,note:document.querySelector('#opNote').value.trim(),ticket:ticketData};
  data.operations.push(op);
  if(opType==='income')data.balance=Number((data.balance+amount).toFixed(2));
  if(opType==='expense'&&payment==='current')data.balance=Number((data.balance-amount).toFixed(2));
  document.querySelector('#opAmount').value='';
  document.querySelector('#opLabel').value='';
  document.querySelector('#opNote').value='';
  document.querySelector('#opTicket').value='';
  document.querySelector('#ticketPreview').innerHTML='';
  ticketData='';
  document.querySelector('#autoHint').textContent='La catégorie sera proposée automatiquement.';
  document.querySelector('#saveMessage').textContent='Opération enregistrée.';
  save();
  showToast('Opération enregistrée',`${label} · ${euro(amount)}`);
  setTimeout(()=>setTab('home'),350)
};

document.querySelector('#agendaFilter').addEventListener('change',renderAgenda);
document.querySelector('#saveSettings').onclick=()=>{
  data.balance=money(document.querySelector('#settingBalance').value);
  data.cardDebitDay=Math.max(1,Math.min(28,Number(document.querySelector('#settingCardDay').value||4)));
  data.savings=money(document.querySelector('#settingSavings').value);
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

document.querySelector('#exportCsv').onclick=()=>{
  const rows=[['Date','Type','Libellé','Catégorie','Montant','Paiement','Note']];
  data.operations.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(op=>{
    rows.push([op.date,op.type,op.label,op.category||'',String(op.amount).replace('.',','),op.payment||'',op.note||'']);
  });
  const csv=rows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='mon_budget_operations.csv';
  a.click();
};
document.querySelector('#printReport').onclick=()=>window.print();

document.querySelector('#exportData').onclick=()=>{
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='mon_budget_essentiel_v4.json';a.click()
};
document.querySelector('#importData').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{data={...structuredClone(defaults),...JSON.parse(await file.text())};save();alert('Sauvegarde importée.')}catch{alert('Fichier invalide.')}
};
document.querySelector('#resetData').onclick=()=>{if(confirm('Tout effacer et repartir de zéro ?')){data=structuredClone(defaults);save()}};

const quickAdd=document.querySelector('#quickAdd');
if(quickAdd)quickAdd.onclick=()=>setTab('add');

const quickIncomeAction=document.querySelector('#quickIncomeAction');
if(quickIncomeAction){
  quickIncomeAction.onclick=()=>{
    setType('income');
    setTab('add');
  };
}

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
document.querySelector('#operationsMonth').addEventListener('change',renderOperations);
document.querySelector('#operationsCategory').addEventListener('change',renderOperations);
document.querySelector('#operationsPayment').addEventListener('change',renderOperations);
document.querySelector('#operationsSort').addEventListener('change',renderOperations);
document.addEventListener('click',e=>{
  const opener=e.target.closest('[data-open-modal]');
  if(opener){openModal(opener.dataset.openModal);return}
  if(e.target.closest('[data-close-modal]'))closeModal();
});


document.querySelector('#checkRecurringNow').onclick=()=>{
  materializeRecurring();
  renderAll();
  alert('Vérification terminée. Aucune échéance ne sera créée deux fois.');
};


function parseQuickLine(value){
  const raw=String(value||'').trim();
  const match=raw.match(/^(.*?)[\s]+(-?\d+(?:[.,]\d{1,2})?)\s*€?\s*$/);
  if(!match)return null;
  const label=match[1].trim();
  const amount=money(match[2]);
  if(!label||amount<=0)return null;
  return {label,amount};
}
function refreshQuickSuggestion(){
  const parsed=parseQuickLine(document.querySelector('#quickLine').value);
  const target=document.querySelector('#quickSuggestion');
  if(!parsed){
    target.textContent='Exemple : Carrefour 42,35';
    return;
  }
  const s=smartSuggestion(parsed.label);
  target.textContent=`${s.type==='income'?'Revenu':'Dépense'} · ${s.category} · ${euro(parsed.amount)} · aujourd’hui`;
}
document.querySelector('#quickLine').addEventListener('input',refreshQuickSuggestion);

document.querySelector('#quickSave').onclick=()=>{
  const parsed=parseQuickLine(document.querySelector('#quickLine').value);
  const message=document.querySelector('#quickMessage');

  if(!parsed){
    message.textContent='Écrivez par exemple : Carrefour 42,35';
    return;
  }

  const suggestion=smartSuggestion(parsed.label);
  const operation={
    id:crypto.randomUUID(),
    type:suggestion.type,
    label:parsed.label,
    amount:parsed.amount,
    date:today(),
    category:suggestion.category,
    payment:'current',
    cardDebited:false
  };

  data.operations.push(operation);
  applyOperationToBalance(operation);
  data.lastCategory=suggestion.category;

  document.querySelector('#quickLine').value='';
  document.querySelector('#quickSuggestion').textContent='Écrivez le nom puis le montant.';
  message.textContent='Opération enregistrée.';
  save();
  showToast('Opération enregistrée',`${parsed.label} · ${euro(parsed.amount)}`);
  setTimeout(()=>{message.textContent=''},1200);
};

document.querySelector('#opDate').value=today();
normalizeRules();
materializeRecurring();
requestAnimationFrame(()=>renderAll());