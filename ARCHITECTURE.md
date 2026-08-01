# Mon Budget 3.0 — Architecture

## Principe

La version 3.0 conserve exactement les fonctions et l’interface de la 2.0.
Le changement porte uniquement sur l’organisation technique.

## Fichiers

- `index.html` : structure des écrans.
- `styles.css` : point d’entrée CSS.
- `css/app.css` : interface complète.
- `js/config.js` : configuration et données initiales.
- `js/utils.js` : fonctions réutilisables.
- `app.js` : logique métier et navigation.
- `manifest.webmanifest` : installation sur l’écran d’accueil.
- `sw.js` : neutralisation des anciens caches.

## Données

La clé de stockage existante est conservée. Les données 2.0 restent donc
compatibles et aucune réinitialisation n’est nécessaire.
