# Budget Familial Laetitia — V2.5

## Réalisé

- prévision chronologique du compte jour par jour ;
- affichage du solde après chaque prélèvement futur ;
- intégration du débit CB différé au 4 du mois ;
- couleur orange si le solde prévu devient faible ;
- couleur rouge si le solde prévu devient négatif ;
- ajout de revenus futurs avec une date prévue ;
- les revenus futurs apparaissent dans la prévision sans augmenter immédiatement le solde ;
- migration et conservation des données V2.4.

## Calcul

La prévision part du solde bancaire actuel, puis applique dans l’ordre :
- le débit CB différé ;
- les prélèvements non encore payés ;
- les revenus ponctuels marqués comme futurs.
