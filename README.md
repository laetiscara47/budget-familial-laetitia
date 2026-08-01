# Mon Budget 2.2.1 Test — Récupération sûre

Correction du problème de base vide.

Cette version :
- utilise exactement la même clé que la 2.0 Final : `mon_budget_v10_stable` ;
- compare la base courante, la sauvegarde directe, les 10 sauvegardes historiques
  et toutes les anciennes bases connues ;
- choisit automatiquement la base valide la plus complète ;
- refuse de privilégier une base vide lorsqu’une base plus riche existe ;
- conserve l’assistant, les modèles, l’agenda regroupé et l’anti-doublon de la 2.2.

À l’ouverture, les 3 888,87 € doivent revenir automatiquement si les anciennes
données sont toujours présentes sur l’iPhone.
