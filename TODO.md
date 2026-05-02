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
- [x] Gérer proprement les erreurs utilisateur CLI <!-- pi-todo-md:id=28 -->
- [x] Ajouter un historique d’actions de session <!-- pi-todo-md:id=29 -->
- [x] Écrire des tests d’intégration CLI (new→play→save→load→continue) <!-- pi-todo-md:id=30 -->
- [x] Documenter l’usage CLI dans README (quickstart + exemples) <!-- pi-todo-md:id=31 -->

## TUI (ink)
- [x] Installer ink (+ react) et configurer les dépendances runtime <!-- pi-todo-md:id=32 -->
- [x] Extraire la logique de session CLI dans un module partagé (new/load/save/roll/keep/stop/fail/history) <!-- pi-todo-md:id=33 -->
- [x] Ajouter la commande `tui` dans `bin/centmille.js` et l’aide CLI <!-- pi-todo-md:id=34 -->
- [x] Créer le shell TUI ink (layout: scores, tour actif, dés en attente, historique, aide) <!-- pi-todo-md:id=35 -->
- [x] Implémenter les actions TUI: new, load, roll, keep, stop, fail, save, quit <!-- pi-todo-md:id=36 -->
- [x] Afficher les erreurs utilisateur dans la TUI (message bar non bloquante) <!-- pi-todo-md:id=37 -->
- [x] Ajouter des helpers purs pour le rendu/parse input TUI et leurs tests unitaires <!-- pi-todo-md:id=38 -->
- [x] Refondre le flux de tour TUI en mode auto-lancer (RNG interne) <!-- pi-todo-md:id=42 -->
- [x] Implémenter la présélection automatique des dés scorants (auto-keep) <!-- pi-todo-md:id=43 -->
- [x] Ajouter un affichage des dés en grand avec couleur pour la sélection <!-- pi-todo-md:id=44 -->
- [x] Implémenter le choix unique Continuer/Arrêter avec navigation flèches + j/k + Entrée <!-- pi-todo-md:id=45 -->
- [x] Faire remonter les dés du bust dans GameState (endTurnWithFailure + recordRoll) [focus] <!-- pi-todo-md:id=47 -->
- [x] Mettre en pause la boucle advance() sur bust via un état bustInfo dans startTui.jsx <!-- pi-todo-md:id=48 -->
- [x] Ajouter la garde useInput pour confirmer le bust avec Entrée puis reprendre advance() <!-- pi-todo-md:id=49 -->
- [x] Afficher l’écran de bust (message, checkpoint drop, DiceView, invite Entrée) dans la TUI <!-- pi-todo-md:id=50 -->
- [x] Mettre à jour GameState.spec.js pour vérifier result.rolledDice sur bust <!-- pi-todo-md:id=51 -->
- [x] Mettre à jour scenarios.spec.js pour la non-régression des résultats bust avec rolledDice <!-- pi-todo-md:id=52 -->
- [x] Valider avec npx vitest run, npm run check et smoke test npm run tui <!-- pi-todo-md:id=53 -->
  - note: Validation OK: npx vitest run ✅ (11 files, 90 tests), npm run check ✅, smoke TUI validé dans tmux (lancement `npm run tui` en session tmux puis sortie via touche q).

## Web mobile (plan)
- [x] Extraire applyCollisionChain de GameState vers src/game/collisionChain.js (fonction pure + wrapper GameState) <!-- pi-todo-md:id=54 -->
- [x] Créer src/game/ManualGame.js (recordTurn, recordBust, undoLastEvent, snapshot/fromSnapshot) <!-- pi-todo-md:id=55 -->
- [ ] Ajouter les tests src/game/ManualGame.spec.js (ouverture, victoire exacte, overshoot, collisions simples/chaîne, 3 busts, undo) <!-- pi-todo-md:id=56 -->
- [ ] Étendre src/cli/saveFile.js pour distinguer les modes manual/dice (format version/mode) <!-- pi-todo-md:id=57 -->
- [ ] Créer src/web/storage.js avec persistance localStorage (centmille:current-game) <!-- pi-todo-md:id=58 -->
- [ ] Mettre en place le squelette web src/web/ (index.html, main.jsx, App.jsx, composants de base) <!-- pi-todo-md:id=59 -->
- [ ] Implémenter useManualGame.js (état + actions + persistance) <!-- pi-todo-md:id=60 -->
- [ ] Implémenter le rendu feuille manuscrite (PlayerColumn/ScoreRow + styles sheet.css: bust, downgrade, grille mobile-first) <!-- pi-todo-md:id=61 -->
- [ ] Implémenter la saisie de score tour + actions Bust/Annuler (ScoreInput + validations) <!-- pi-todo-md:id=62 -->
- [ ] Ajouter les scripts et config Vite (dev:web, build:web, preview:web, vite.config.js alias @game, sortie dist/web) <!-- pi-todo-md:id=63 -->
- [ ] Mettre à jour vitest.config.js pour tests web jsdom <!-- pi-todo-md:id=64 -->
- [ ] Ajouter les tests web minimum (useManualGame.spec.js + PlayerColumn.spec.jsx) <!-- pi-todo-md:id=65 -->
- [ ] Exporter ManualGame depuis src/index.js <!-- pi-todo-md:id=66 -->
- [ ] Vérifier en E2E local: dev:web (scénarios collision, 3 busts, victoire), reload localStorage, build/preview <!-- pi-todo-md:id=67 -->
- [ ] Exécuter npm run test:coverage et corriger toute couverture manquante sur les fichiers modifiés <!-- pi-todo-md:id=68 -->
