# TODO
<!-- pi-todo-md:schema=1 -->

## Tasks

## Setup
- [x] Initialiser le projet Node.js (package.json, scripts) <!-- pi-todo-md:id=1 -->
- [x] Configurer Biome selon /home/doubleface/Workspace/tomodata/biome.json <!-- pi-todo-md:id=2 -->
- [x] Installer et configurer Vitest <!-- pi-todo-md:id=3 -->
- [x] Créer la structure src/ et tests/ pour le moteur de règles <!-- pi-todo-md:id=4 -->
- [x] Implémenter les classes de base du jeu (scoring + état joueur) <!-- pi-todo-md:id=5 -->
- [x] Écrire des tests unitaires des règles principales <!-- pi-todo-md:id=6 -->
- [x] Exécuter lint + tests et ajuster <!-- pi-todo-md:id=7 -->

## Next steps
- [x] Connecter GameState à DiceScorer pour calculer automatiquement le score d’un lancer <!-- pi-todo-md:id=8 -->
- [x] Modéliser un tour complet (sélection des dés à garder, relance, arrêt) <!-- pi-todo-md:id=9 -->
- [x] Valider les combinaisons complexes de scoring via tests (mélanges brelan + 1/5, etc.) <!-- pi-todo-md:id=10 -->
- [x] Ajouter la gestion explicite de la règle des 3 tours échoués après dépassement de 10 000 <!-- pi-todo-md:id=11 -->
- [x] Ajouter des tests de collisions en chaîne multi-joueurs <!-- pi-todo-md:id=12 -->
- [x] Ajouter des tests de reprise avec score transporté et dés restants <!-- pi-todo-md:id=13 -->
- [x] Ajouter une API claire pour récupérer l’état de partie sérialisable (snapshot JSON) <!-- pi-todo-md:id=14 -->
- [x] Ajouter une couche d’orchestration GameEngine pour enchaîner les actions de jeu <!-- pi-todo-md:id=15 -->
- [x] Renforcer la validation des entrées (dés invalides, paramètres incohérents) <!-- pi-todo-md:id=16 -->
- [x] Documenter l’architecture et les règles implémentées dans un README technique <!-- pi-todo-md:id=17 -->
- [x] Mettre en place la couverture de tests et un seuil minimum <!-- pi-todo-md:id=18 -->
- [x] Gérer un historique complet des paliers (checkpointHistory) pour supporter plusieurs chutes successives <!-- pi-todo-md:id=19 -->

## CLI
- [x] Créer un binaire CLI (bin/centmille.js) et parser les arguments <!-- pi-todo-md:id=20 -->
- [x] Définir les commandes de base (new, load, status, roll, keep, stop, fail, save, quit) <!-- pi-todo-md:id=21 -->
- [x] Ajouter un mode interactif (boucle de prompt) <!-- pi-todo-md:id=22 -->
- [x] Brancher la CLI sur GameEngine.dispatch <!-- pi-todo-md:id=23 -->
- [x] Définir le format de sauvegarde JSON (snapshot + metadata) <!-- pi-todo-md:id=24 -->
- [x] Implémenter save vers un fichier JSON <!-- pi-todo-md:id=25 -->
- [x] Implémenter load depuis un fichier JSON avec validation <!-- pi-todo-md:id=26 -->
- [x] Afficher un état de partie lisible en CLI (scores, joueur courant, tour actif) <!-- pi-todo-md:id=27 -->
- [ ] Gérer proprement les erreurs utilisateur CLI <!-- pi-todo-md:id=28 -->
- [ ] Ajouter un historique d’actions de session <!-- pi-todo-md:id=29 -->
- [ ] Écrire des tests d’intégration CLI (new→play→save→load→continue) <!-- pi-todo-md:id=30 -->
- [ ] Documenter l’usage CLI dans README (quickstart + exemples) <!-- pi-todo-md:id=31 -->
