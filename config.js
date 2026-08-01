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

window.MonBudgetConfig = Object.freeze({
  KEY,
  BACKUP_KEY,
  HISTORY_KEY,
  MAX_BACKUPS,
  DATA_SCHEMA_VERSION,
  OLD_KEYS: Object.freeze([...OLD_KEYS]),
  defaults: Object.freeze(JSON.parse(JSON.stringify(defaults)))
});
