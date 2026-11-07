# centmille

Feuille de marque mobile pour le jeu des **10 000** (dés réels, score numérique).

L'application reproduit fidèlement la feuille de score papier (colonnes des joueurs, scores successifs, barrement des scores rétrogradés, bâtons d'échecs `|`, `||`, `|||`) tout en automatisant les règles :
- Rétrogradation au palier précédent après 3 échecs consécutifs
- Rétrogradation lors d'une collision (un joueur qui atteint exactement le score d'un autre) avec support des réactions en chaîne
- Vérification des scores d'ouverture (500 pts minimum), des paliers valides (multiples de 100) et de la victoire exacte (10 000 pts sans dépassement)
- Historique complet et annulation pas-à-pas (Undo)
- Persistance locale continue (`localStorage`)

## Stack

- **React 19**
- **Vite 7**
- **Vitest** pour les tests unitaires et d'intégration (jsdom + v8 coverage)
- **Biome** pour le linting et le formatage

## Structure du projet

```text
├── index.html                  # Point d'entrée HTML
├── src/
│   ├── main.jsx                # Point d'entrée React
│   ├── App.jsx                 # Composant racine et orchestration de l'interface
│   ├── game/                   # Moteur de règles métier pur (indépendant de React)
│   │   ├── Game.js             # Gestion d'une partie (tours, échecs, historique, undo)
│   │   ├── PlayerState.js      # État d'un joueur (paliers, score, échecs consécutifs)
│   │   ├── collisionChain.js   # Résolution des collisions et réactions en chaîne
│   │   └── TurnRules.js        # Règles de validation des scores de tour
│   ├── components/             # Composants d'interface (écran de saisie, feuille manuscrite...)
│   ├── hooks/                  # Hooks React (useGame pour lier l'état à la vue)
│   ├── storage/                # Persistance localStorage
│   └── styles/
│       └── sheet.css           # Styles feuille de score manuscrite mobile
```

## Commandes

```bash
# Démarrer le serveur de développement
npm run dev

# Compiler pour la production
npm run build

# Prévisualiser le build de production
npm run preview

# Lancer les tests unitaires
npm run test

# Lancer les tests avec rapport de couverture
npm run test:coverage

# Vérifier le code (linting & formatting Biome)
npm run check
npm run lint
npm run format
```
