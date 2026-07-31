# Budget Familial Laetitia — V2.0

## Fonctionnement de la carte à débit différé

- Une dépense saisie avec **Carte bancaire — débit différé le 4** ne diminue pas immédiatement le solde bancaire.
- Elle augmente le compteur **CB en attente**.
- Le bouton **Débit CB effectué** retire tout le total CB du solde bancaire en une seule fois.
- Après validation, les opérations restent dans l’historique avec la mention **CB débitée**.
- Supprimer une dépense CB encore en attente ne touche pas au solde.
- Supprimer une dépense déjà débitée recrédite son montant.

## Autres modes

- Carte immédiate, prélèvement et virement : débit immédiat du solde.
- Espèces : ne modifie pas le solde bancaire.

## Fichiers à remplacer sur GitHub

- `index.html`
- `manifest.webmanifest`
- `sw.js`
- `icon.svg`
- `version.json`
