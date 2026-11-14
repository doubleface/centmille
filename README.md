# centmille

Feuille de marque mobile pour les jeux des **10 000** et **100 000**, avec dés physiques ou dés virtuels optionnels.

L'application reproduit fidèlement la feuille de score papier (colonnes des joueurs, scores successifs, barrement des scores rétrogradés, bâtons d'échecs `|`, `||`, `|||`) tout en automatisant les règles :
- Rétrogradation au palier précédent après 3 échecs consécutifs
- Rétrogradation lors d'une collision (un joueur qui atteint exactement le score d'un autre) avec support des réactions en chaîne
- Vérification des scores d'ouverture (500 pts minimum), des paliers valides (multiples de 100) et de la victoire exacte (10 000 pts sans dépassement)
- Historique complet et annulation pas-à-pas (Undo)
- Persistance locale continue (`localStorage`)

## Modes de jeu

- **⚡ Partie rapide (10 000)** : Règles traditionnelles du 10 000, sans bonus ni cartes.
- **🎁 Dix Mille Bonus (10 000)** : Format court avec un concentré de bonus (deck de 17 cartes, main limitée à 2 cartes, palier unique à 5 000, nombres magiques, événements de table et succès, sans boutique ni prime). Voir les [règles complètes du mode Dix Mille Bonus](docs/dix-mille-bonus.md).
- **👑 Cent Mille (100 000)** : Soirée complète avec 37 cartes jokers, boutique aux 4 paliers (20k, 40k, 60k, 80k), prime de la couronne, zone rouge avec cartes sabotage, événements périodiques et Grimoire de collection.

## Dés physiques ou virtuels

Les dés physiques et la saisie du score restent le mode par défaut. Le choix **Virtuels** ouvre un plateau compact dans les trois variantes : tous les dés marquants sont gardés automatiquement, les autres peuvent être relancés. Une main pleine permet de relancer tous les dés en conservant le cumul.

- Pour arrêter : ouverture à 500 points minimum et cumul multiple de 100 (exception Arrondi). Un dépassement bloque toute relance ; sa sanction attend la confirmation explicite de l’échec.
- Une reprise conserve le montant effectivement validé, exige un nouveau lancer et adapte la réserve à la capacité du nouveau joueur. Ses modificateurs s’appliquent ensuite à tout le cumul.
- Sixième Sens donne 6 dés pendant le tour ; Reset conserve le cumul et remet 5 ou 6 dés en jeu. Caméléon/Petite Suite recalculent le dernier lancer entier ; Convertisseur ne vise qu’un dé non marquant. La Seconde Chance rejoue les dés du lancer échoué.
- En Cent Mille, Aimant choisit les 1 ou les 5 avant le premier lancer et les regroupe **par main**, sans double comptage. Main pleine ou Reset remet le regroupement à zéro, sans perdre le cumul. Aspirateur reprend le cumul avant broucouille et sa réserve, avec un lancer obligatoire.
- Happy Hour et Tour éclair changent seulement les 5/1 isolés ; groupes et suites gardent leur barème. Fête des 2 donne 2 000/4 000/8 000/16 000 points pour 3/4/5/6 dés identiques.

Les choix, cartes, lancers et gains se restaurent après recharge. L’annulation d’une validation restitue le tour de dés ; une carte est annulable avant tout nouveau lancer. Les autres mécanismes (boutique, collisions, réactions, événements, sanctions) restent ceux de la variante choisie. Le retour aux dés physiques est possible avant le premier lancer d’un tour ; un ancien Aimant physique sans valeur enregistrée doit d’abord terminer son tour.

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

