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
- [ ] Ajouter une couche d’orchestration GameEngine pour enchaîner les actions de jeu <!-- pi-todo-md:id=15 -->
- [ ] Renforcer la validation des entrées (dés invalides, paramètres incohérents) <!-- pi-todo-md:id=16 -->
- [ ] Documenter l’architecture et les règles implémentées dans un README technique <!-- pi-todo-md:id=17 -->
- [ ] Mettre en place la couverture de tests et un seuil minimum <!-- pi-todo-md:id=18 -->
- [ ] Gérer un historique complet des paliers (checkpointHistory) pour supporter plusieurs chutes successives <!-- pi-todo-md:id=19 -->
