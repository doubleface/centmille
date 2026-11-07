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
├── public/
│   ├── icon.svg                # Icône de l'application (PWA)
│   ├── manifest.webmanifest    # Manifeste Web App (mode plein écran standalone)
│   └── sw.js                   # Service Worker (cache hors-ligne autonome)
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

# Compiler et partager temporairement en HTTPS pour installer la PWA sur mobile
npm run share

# Lancer les tests unitaires
npm run test

# Lancer les tests avec rapport de couverture
npm run test:coverage

# Vérifier le code (linting & formatting Biome)
npm run check
npm run lint
npm run format
```

## Installation sur mobile (PWA autonome sans serveur permanent)

L'application peut être installée sur l'écran d'accueil d'un téléphone (Android / iOS) et fonctionner ensuite **100 % hors-ligne**, sans aucun serveur allumé.

Les navigateurs mobiles exigeant une connexion `HTTPS` pour activer le Service Worker et la mise en cache hors-ligne, la commande `npm run share` ouvre un tunnel HTTPS éphémère (`localhost.run`) le temps de l'installation :

1. Sur l'ordinateur, lancer :
   ```bash
   npm run share
   ```
2. Dans le terminal, scanner le **QR code** affiché (ou ouvrir l'URL `https://xxxx.lhr.life` sur le téléphone dans Chrome ou Safari).
3. Attendre 1 à 2 secondes que la page soit affichée (le bundle complet HTML/CSS/JS est automatiquement mis en cache par le Service Worker).
4. Dans le menu du navigateur mobile, choisir **« Ajouter à l'écran d'accueil »** (ou **« Installer l'application »**).
5. Couper la commande sur l'ordinateur avec `Ctrl+C`.

L'application se lance désormais depuis son icône sur le téléphone en plein écran et fonctionne de manière totalement autonome (même en mode avion).

> **Note pour les mises à jour :** Chaque exécution de `npm run share` générant une nouvelle URL temporaire `*.lhr.life`, installer une nouvelle version nécessitera de supprimer l'ancienne icône et de répéter l'opération.

