# Règles critiques du projet

Cette application est actuellement utilisée par un client réel.

## Interdictions absolues

- Ne jamais créer de pull request distante.
- Ne jamais déployer sur Firebase, Vercel ou Netlify.
- Ne jamais utiliser les identifiants de production.
- Ne jamais écrire dans Firestore production.
- Ne jamais supprimer un fichier uniquement parce qu’un outil le signale inutilisé.
- Ne jamais modifier une règle métier sans test de caractérisation.
- Ne jamais lancer un script de suppression avec --execute.
- Ne jamais mettre à jour toutes les dépendances en une seule opération.
- Ne jamais refactoriser et changer le comportement métier dans le même lot.

## Processus obligatoire

1. Explorer.
2. Citer les fichiers et lignes.
3. Décrire le comportement actuel.
4. Évaluer le risque.
5. Proposer un test reproductible.
6. Écrire le test.
7. Appliquer une correction minimale.
8. Exécuter lint, tests et build.
9. Examiner le diff.
10. Faire valider par un agent indépendant.

## Suppression de code

Toute suppression doit fournir :

- preuve qu’aucun import statique ne l’utilise ;
- recherche des imports dynamiques ;
- vérification des scripts et configurations ;
- vérification de l’usage métier ;
- test avant et après ;
- possibilité de restauration par commit local.

## Firebase

- Utiliser exclusivement les émulateurs pendant l’audit.
- Tester les règles avec au moins deux boutiques différentes.
- Appliquer le principe du moindre privilège.
- Ne jamais autoriser une opération uniquement sur la base de données envoyées par le client.
- Toute opération financière doit préserver une piste d’audit.