# Budget Familial Laetitia — V1.4

Cette version règle le problème des anciennes versions conservées sur l’iPhone.

## Réalisé

- suppression automatique de tous les anciens caches ;
- désactivation et suppression du service worker ;
- vérification de la version à chaque ouverture ;
- rechargement forcé lorsqu’une nouvelle version est publiée ;
- ajout d’un numéro de version visible ;
- conservation des données du budget dans le stockage local ;
- le solde bancaire continue de diminuer après chaque dépense ;
- supprimer une dépense recrédite son montant.

## Fichiers à remplacer sur GitHub

- `index.html`
- `manifest.webmanifest`
- `sw.js`
- `icon.svg`
- `version.json`

Après cette mise à jour, l’application installée doit charger automatiquement la dernière version.
