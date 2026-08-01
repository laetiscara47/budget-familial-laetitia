(() => {
  "use strict";

  const DATA_KEY = "mon_budget_v8_foundation";
  const BACKUP_KEY = "mon_budget_v8_foundation_backup";
  const OLD_KEYS = [
    "mon_budget_familial_v8","mon_budget_familial_1_0","mon_budget_essentiel_v7",
    "mon_budget_essentiel_v6_5","mon_budget_essentiel_v6","mon_budget_essentiel_v5_2_5",
    "mon_budget_essentiel_v5_2_4","mon_budget_essentiel_v5_2_3","mon_budget_essentiel_v5_2_2",
    "mon_budget_essentiel_v5_2_1","mon_budget_essentiel_v5_2","mon_budget_essentiel_v5_1",
    "mon_budget_essentiel_v5","mon_budget_essentiel_v4","budget_essentiel_v3","budget_essentiel_v2","budget_essentiel_v1"
  ];

  const defaults = {
    version: 8,
    balance: 2697.32,
    savings: 0,
    cardDebitDay: 4,
    theme: "light",
    operations: [],
    incomeRules: [{id:"caf",label:"CAF",amount:867.92,day:5,active:true}],
    chargeRules: [
      {id:"eau",label:"Eau de Garonne",amount:64,day:3,active:true},
      {id:"orange",label:"Orange",amount:28.99,day:6,active:true}
    ],
    lastSavedAt: null
  };

  const $ = (id) => document.getElementById(id);
  const euro = (value) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(Number(value||0));
  const today = () => new Date().toISOString().slice(0,10);
  const monthKey = (date) => String(date).slice(0,7);
  const money = (value) => Number(String(value||"").replace(/\s/g,"").replace(",", ".")) || 0;
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function parseStore(key){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }catch{
      return null;
    }
  }

  function normalize(value){
    const data = {...clone(defaults), ...(value || {})};
    data.balance = Number(data.balance) || 0;
    data.savings = Number(data.savings) || 0;
    data.cardDebitDay = Math.max(1, Math.min(28, Number(data.cardDebitDay) || 4));
    data.operations = Array.isArray(data.operations) ? data.operations : [];
    data.incomeRules = Array.isArray(data.incomeRules) ? data.incomeRules : [];
    data.chargeRules = Array.isArray(data.chargeRules) ? data.chargeRules : [];
    return data;
  }

  function score(value){
    if(!value || typeof value !== "object") return -1;
    let total = 0;
    if(Number(value.balance)) total += 1000;
    total += (Array.isArray(value.operations) ? value.operations.length : 0) * 20;
    total += (Array.isArray(value.incomeRules) ? value.incomeRules.length : 0) * 5;
    total += (Array.isArray(value.chargeRules) ? value.chargeRules.length : 0) * 5;
    return total;
  }

  function loadData(){
    const candidates = [DATA_KEY, BACKUP_KEY, ...OLD_KEYS];
    let best = null, bestKey = "", bestScore = -1;
    for(const key of candidates){
      const candidate = parseStore(key);
      const candidateScore = score(candidate && candidate.data ? candidate.data : candidate);
      if(candidateScore > bestScore){
        best = candidate && candidate.data ? candidate.data : candidate;
        bestKey = key;
        bestScore = candidateScore;
      }
    }
    const result = normalize(best || defaults);
    result.migratedFrom = bestKey && bestKey !== DATA_KEY ? bestKey : "";
    localStorage.setItem(DATA_KEY, JSON.stringify(result));
    return result;
  }

  let data = loadData();
  let operationType = "expense";

  function backupCurrent(){
    try{
      localStorage.setItem(BACKUP_KEY, JSON.stringify({savedAt:new Date().toISOString(),data}));
    }catch{}
  }

  function saveData(){
    backupCurrent();
    data.lastSavedAt = new Date().toISOString();
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    renderAll();
  }

  function currentMonthOperations(){
    const key = monthKey(today());
    return data.operations.filter(op => monthKey(op.date) === key);
  }

  function monthIncome(){
    return currentMonthOperations().filter(op => op.type === "income").reduce((s,op)=>s+Number(op.amount),0);
  }

  function monthExpense(){
    return currentMonthOperations().filter(op => op.type === "expense").reduce((s,op)=>s+Number(op.amount),0);
  }

  function cardPending(){
    return data.operations.filter(op => op.type === "expense" && op.payment === "deferred" && !op.cardDebited).reduce((s,op)=>s+Number(op.amount),0);
  }

  function available(){
    return Number(data.balance) - cardPending();
  }

  function daysInMonth(){
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  }

  function daysLeft(){
    return Math.max(1, daysInMonth() - new Date().getDate() + 1);
  }

  function ruleDate(day){
    const now = new Date();
    const safeDay = Math.min(Number(day), new Date(now.getFullYear(), now.getMonth()+1, 0).getDate());
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(safeDay).padStart(2,"0")}`;
  }

  function futureRules(){
    const list = [];
    data.incomeRules.filter(r=>r.active!==false).forEach(r=>list.push({type:"income",label:r.label,amount:Number(r.amount),date:ruleDate(r.day)}));
    data.chargeRules.filter(r=>r.active!==false).forEach(r=>list.push({type:"expense",label:r.label,amount:Number(r.amount),date:ruleDate(r.day)}));
    return list.filter(x=>x.date>=today()).sort((a,b)=>a.date.localeCompare(b.date));
  }

  function remainingIncome(){
    return futureRules().filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0);
  }

  function remainingCharges(){
    return futureRules().filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
  }

  function forecast(){
    return available() + remainingIncome() - remainingCharges();
  }

  function dailyBudget(){
    return Math.max(0, forecast()/daysLeft());
  }

  function statusInfo(){
    const daily = dailyBudget();
    if(forecast() < 0) return {title:"Situation tendue",text:"La fin de mois est négative.",color:"var(--red)"};
    if(daily < 20) return {title:"Situation prudente",text:"Gardez les dépenses sous contrôle.",color:"var(--orange)"};
    return {title:"Situation confortable",text:`Vous pouvez viser environ ${euro(daily)} aujourd’hui.`,color:"var(--green)"};
  }

  function showScreen(id){
    const target = $(id);
    if(!target) return;
    document.querySelectorAll(".screen").forEach(screen => screen.classList.toggle("active", screen === target));
    document.querySelectorAll(".bottom-nav [data-screen]").forEach(btn => btn.classList.toggle("active", btn.dataset.screen === id));
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function showToast(text){
    const toast = $("toast");
    if(!toast || !text) return;
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(()=>{
      toast.classList.remove("show");
      toast.textContent = "";
    },1800);
  }


  function monthProgress(){
    const now = new Date();
    return Math.min(100, Math.round((now.getDate()/daysInMonth())*100));
  }

  function buildAlerts(){
    const list = [];
    const now = today();

    futureRules().forEach(item=>{
      const diff = Math.round((new Date(item.date+"T12:00:00") - new Date(now+"T12:00:00"))/86400000);
      if(diff >= 0 && diff <= 3){
        list.push({
          icon:item.type==="income"?"💰":"🔔",
          title:item.label,
          subtitle:diff===0?"Aujourd’hui":diff===1?"Demain":`Dans ${diff} jours`,
          amount:item.amount,
          type:item.type
        });
      }
    });

    const progress = monthProgress();
    const expense = monthExpense();
    const income = monthIncome() + remainingIncome();
    const spendRatio = income > 0 ? Math.round((expense/income)*100) : 0;

    if(spendRatio > progress + 15){
      list.push({
        icon:"⚠️",
        title:"Dépenses élevées",
        subtitle:`${spendRatio} % du budget consommé`,
        amount:0,
        type:"warning"
      });
    }

    return list.slice(0,4);
  }

  function renderHome(){
    const now = new Date();
    $("monthLabel").textContent = `Budget familial · ${now.toLocaleDateString("fr-FR",{month:"long",year:"numeric"})}`;
    $("monthBadge").textContent = now.toLocaleDateString("fr-FR",{month:"long"});
    $("availableValue").textContent = euro(available());
    $("forecastValue").textContent = `Fin de mois estimée : ${euro(forecast())}`;
    $("weekIncome").textContent = remainingIncome() ? `${euro(remainingIncome())} attendus ce mois-ci` : "Aucun revenu attendu ce mois-ci";
    $("dailyBudgetValue").textContent = euro(dailyBudget());
    $("monthIncome").textContent = euro(monthIncome());
    $("monthExpense").textContent = euro(monthExpense());
    $("remainingCharges").textContent = euro(remainingCharges());
    $("savingsValue").textContent = euro(data.savings);

    const st = statusInfo();
    $("statusTitle").textContent = st.title;
    $("statusText").textContent = st.text;
    $("statusDot").style.background = st.color;

    const upcoming = futureRules().slice(0,5);
    $("upcomingList").innerHTML = upcoming.length ? upcoming.map(item =>
      `<div class="list-row"><div><b>${item.type==="income"?"💰":"🧾"} ${item.label}</b><small>${new Date(item.date+"T12:00:00").toLocaleDateString("fr-FR")}</small></div><b class="${item.type==="income"?"positive":"negative"}">${item.type==="income"?"+":"-"}${euro(item.amount)}</b></div>`
    ).join("") : "<p>Aucune échéance à venir.</p>";

    $("saveState").textContent = data.lastSavedAt
      ? `Dernière sauvegarde : ${new Date(data.lastSavedAt).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}`
      : "Données enregistrées localement";

    const progress = monthProgress();
    $("monthProgressText").textContent = progress + " %";
    $("monthProgressBar").style.width = progress + "%";

    const expense = monthExpense();
    const income = monthIncome() + remainingIncome();
    const spendRatio = income > 0 ? Math.round((expense/income)*100) : 0;

    $("monthProgressAdvice").textContent =
      spendRatio > progress + 15
        ? "Vos dépenses avancent plus vite que le mois. Ralentissez les achats non essentiels."
        : spendRatio < progress - 15
          ? "Vous êtes en avance sur votre budget. Bonne marge pour la fin du mois."
          : "Votre rythme de dépenses suit correctement l’avancement du mois.";

    const alerts = buildAlerts();
    $("alertsCount").textContent = alerts.length;
    $("alertsList").innerHTML = alerts.length
      ? alerts.map(alert => `
        <div class="alert-row">
          <span class="alert-icon">${alert.icon}</span>
          <div>
            <b>${alert.title}</b>
            <small>${alert.subtitle}</small>
          </div>
          <b class="${alert.type==="income"?"amount-green":alert.type==="expense"?"amount-red":""}">
            ${alert.amount ? (alert.type==="income"?"+":"-") + euro(alert.amount) : ""}
          </b>
        </div>
      `).join("")
      : "<p>Aucune alerte importante pour les 3 prochains jours.</p>";
  }

  function renderOperations(){
    const search = $("searchInput").value.trim().toLowerCase();
    const filter = $("typeFilter").value;
    const list = data.operations
      .filter(op => filter==="all" || op.type===filter)
      .filter(op => !search || `${op.label} ${op.category||""}`.toLowerCase().includes(search))
      .sort((a,b)=>b.date.localeCompare(a.date));

    $("operationsList").innerHTML = list.length ? list.map(op =>
      `<div class="list-row" data-op-id="${op.id}"><div><b>${op.type==="income"?"💰":"🧾"} ${op.label}</b><small>${new Date(op.date+"T12:00:00").toLocaleDateString("fr-FR")} · ${op.category||"Autre"}</small></div><b class="${op.type==="income"?"positive":"negative"}">${op.type==="income"?"+":"-"}${euro(op.amount)}</b></div>`
    ).join("") : "<p>Aucune opération.</p>";
  }

  function renderAgenda(){
    const list = [...futureRules(), ...data.operations.map(op=>({...op}))].sort((a,b)=>a.date.localeCompare(b.date));
    $("agendaList").innerHTML = list.length ? list.map(item =>
      `<div class="list-row"><div><b>${item.type==="income"?"💰":"🧾"} ${item.label}</b><small>${new Date(item.date+"T12:00:00").toLocaleDateString("fr-FR")}</small></div><b class="${item.type==="income"?"positive":"negative"}">${item.type==="income"?"+":"-"}${euro(item.amount)}</b></div>`
    ).join("") : "<p>Aucune opération prévue.</p>";
  }

  function renderAccounts(){
    $("accountBalance").textContent = euro(data.balance);
    $("cardPending").textContent = euro(cardPending());
    $("accountSavings").textContent = euro(data.savings);
    $("accountAvailable").textContent = euro(available());
  }

  function renderStats(){
    $("statsIncome").textContent = euro(monthIncome());
    $("statsExpense").textContent = euro(monthExpense());
    const totals = {};
    currentMonthOperations().filter(op=>op.type==="expense").forEach(op=>{
      const cat = op.category || "Autre";
      totals[cat] = (totals[cat]||0) + Number(op.amount);
    });
    const rows = Object.entries(totals).sort((a,b)=>b[1]-a[1]);
    const max = rows.length ? rows[0][1] : 1;
    $("categoryStats").innerHTML = rows.length ? rows.map(([cat,amount]) =>
      `<div class="stat-row"><div><b>${cat}</b><span>${euro(amount)}</span></div><div class="bar"><i style="width:${Math.max(3,Math.round(amount/max*100))}%"></i></div></div>`
    ).join("") : "<p>Aucune dépense ce mois-ci.</p>";
  }

  function renderSettings(){
    $("balanceInput").value = String(data.balance).replace(".",",");
    $("savingsInput").value = String(data.savings).replace(".",",");
    $("cardDayInput").value = data.cardDebitDay;
    $("migrationStatus").textContent = data.migratedFrom
      ? `Anciennes données récupérées depuis ${data.migratedFrom}.`
      : "Vos données sont protégées par une sauvegarde locale.";
    document.body.classList.toggle("dark", data.theme==="dark");
    $("themeBtn").textContent = data.theme==="dark" ? "☀️" : "🌙";
  }

  function renderAll(){
    renderHome();
    renderOperations();
    renderAgenda();
    renderAccounts();
    renderStats();
    renderSettings();
  }

  function setOperationType(type){
    operationType = type;
    $("expenseBtn").classList.toggle("active", type==="expense");
    $("incomeBtn").classList.toggle("active", type==="income");
    $("paymentInput").disabled = type==="income";
  }

  function smartCategory(label){
    const text = label.toLowerCase();
    if(/carrefour|leclerc|lidl|aldi|courses/.test(text)) return "Alimentation";
    if(/orange|edf|eau|assurance|loyer/.test(text)) return "Maison";
    if(/essence|total|carburant|péage/.test(text)) return "Transport";
    if(/pharmacie|médecin|dentiste/.test(text)) return "Santé";
    return $("categoryInput").value;
  }

  document.addEventListener("click", (event) => {
    const nav = event.target.closest("[data-screen]");
    if(nav){ showScreen(nav.dataset.screen); return; }
    const go = event.target.closest("[data-go]");
    if(go){ showScreen(go.dataset.go); return; }
    const opRow = event.target.closest("[data-op-id]");
    if(opRow && confirm("Supprimer cette opération ?")){
      const op = data.operations.find(x=>x.id===opRow.dataset.opId);
      if(op){
        if(op.type==="income") data.balance -= Number(op.amount);
        else if(op.payment==="current") data.balance += Number(op.amount);
        data.operations = data.operations.filter(x=>x.id!==op.id);
        saveData();
      }
    }
  });

  $("expenseBtn").addEventListener("click",()=>setOperationType("expense"));
  $("incomeBtn").addEventListener("click",()=>setOperationType("income"));

  $("saveOperationBtn").addEventListener("click",()=>{
    const amount = money($("amountInput").value);
    const label = $("labelInput").value.trim();
    const date = $("dateInput").value || today();
    if(!label || amount<=0){
      $("addMessage").textContent = "Complétez le libellé et le montant.";
      return;
    }
    const payment = operationType==="income" ? "current" : $("paymentInput").value;
    const op = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      type: operationType, label, amount, date,
      category: smartCategory(label), payment, cardDebited:false
    };
    data.operations.push(op);
    if(op.type==="income") data.balance += amount;
    else if(payment==="current") data.balance -= amount;
    saveData();
    $("amountInput").value = "";
    $("labelInput").value = "";
    $("addMessage").textContent = "Opération enregistrée.";
    showToast(`${label} enregistré`);
    showScreen("home");
  });

  $("saveSettingsBtn").addEventListener("click",()=>{
    data.balance = money($("balanceInput").value);
    data.savings = money($("savingsInput").value);
    data.cardDebitDay = Math.max(1,Math.min(28,Number($("cardDayInput").value)||4));
    saveData();
    showToast("Réglages enregistrés");
  });

  $("themeBtn").addEventListener("click",()=>{
    data.theme = data.theme==="dark" ? "light" : "dark";
    saveData();
  });

  $("searchInput").addEventListener("input",renderOperations);
  $("typeFilter").addEventListener("change",renderOperations);

  $("backupBtn").addEventListener("click",()=>{
    backupCurrent();
    showToast("Sauvegarde locale créée");
  });

  $("restoreBtn").addEventListener("click",()=>{
    const wrapper = parseStore(BACKUP_KEY);
    if(!wrapper || !wrapper.data){ alert("Aucune sauvegarde disponible."); return; }
    if(confirm("Restaurer la dernière sauvegarde ?")){
      data = normalize(wrapper.data);
      saveData();
    }
  });

  $("exportBtn").addEventListener("click",()=>{
    const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mon-budget-v8.json";
    a.click();
  });

  $("importInput").addEventListener("change",async(event)=>{
    const file = event.target.files[0];
    if(!file) return;
    try{
      backupCurrent();
      data = normalize(JSON.parse(await file.text()));
      saveData();
      showToast("Sauvegarde importée");
    }catch{
      alert("Fichier invalide.");
    }
  });

  $("dateInput").value = today();
  setOperationType("expense");
  renderAll();
})();