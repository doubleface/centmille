export const RARITY_WEIGHTS = Object.freeze({
  common: 0.6,
  rare: 0.3,
  legendary: 0.1,
})

export const CARDS = Object.freeze([
  {
    id: 'bouclier',
    name: '🛡️ Le Bouclier',
    emoji: '🛡️',
    rarity: 'rare',
    category: 'defensive',
    activation: 'passive-prompt',
    isOffensive: false,
    soundId: 'rarity-rare',
    image: './cards/bouclier.jpg',
    shortDescription: 'Automatique en défense : annule une chute de palier.',
    fullDescription:
      '🛡️ Automatique (proposée en cas de chute). Annule une chute de palier quelle qu’en soit l’origine (collision, 3 échecs consécutifs, Le Diable ou explosion de Bombe). La carte est défaussée après utilisation.',
    inDeck: true,
  },
  {
    id: 'miroir',
    name: '🪞 Le Miroir',
    emoji: '🪞',
    rarity: 'legendary',
    category: 'defensive',
    activation: 'passive-prompt',
    isOffensive: false,
    soundId: 'mirror',
    image: './cards/miroir.jpg',
    shortDescription: 'Automatique en défense : renvoie la chute sur l’attaquant.',
    fullDescription:
      '🛡️ Automatique (proposée sur collision subie). Vous subissez la chute (sauf si vous possédez aussi un Bouclier), et l’attaquant chute immédiatement d’un palier à son tour (pouvant déclencher des cascades).',
    inDeck: true,
  },
  {
    id: 'doubleur',
    name: '✖️2 Le Doubleur',
    emoji: '✖️2',
    rarity: 'rare',
    category: 'risk',
    activation: 'pre-turn',
    isOffensive: false,
    soundId: 'rarity-rare',
    image: './cards/doubleur.jpg',
    shortDescription: 'Avant le 1er lancer : double vos points du tour en cas de succès.',
    fullDescription:
      '⏱️ À annoncer AVANT votre 1er lancer. Si vous marquez des points, votre score du tour est multiplié par 2. En cas de broucouille ou d’échec, la carte est perdue.',
    inDeck: true,
  },
  {
    id: 'arrondi',
    name: "🔼 L'Arrondi",
    emoji: '🔼',
    rarity: 'common',
    category: 'declarative',
    activation: 'pre-turn',
    isOffensive: false,
    soundId: 'rarity-common',
    image: './cards/arrondi.jpg',
    shortDescription: 'En voyant vos dés : arrondit votre score à la centaine supérieure.',
    fullDescription:
      '🎲 En voyant vos dés (avant de valider). Autorise exceptionnellement un score non-multiple de 100 sur ce tour (ex. 150 ou 250) et l’arrondit automatiquement à la centaine supérieure lors de la validation.',
    inDeck: true,
  },
  {
    id: 'aspirateur',
    name: "🌀 L'Aspirateur",
    emoji: '🌀',
    rarity: 'rare',
    category: 'declarative',
    activation: 'pre-turn',
    isOffensive: false,
    soundId: 'rarity-rare',
    image: './cards/aspirateur.jpg',
    shortDescription: 'Avant le 1er lancer : reprend les points et dés du joueur qui a échoué.',
    fullDescription:
      '⏱️ À annoncer AVANT votre 1er lancer (uniquement si le joueur précédent vient de faire chou blanc) : vous récupérez son cumul avant broucouille et les dés du lancer échoué. Adaptez les réserves à votre propre main de 5 dés (6 avec Sixième Sens) ; une main remplie est relancée entièrement. Vous devez lancer au moins une fois avant de pouvoir vous arrêter.',
    inDeck: true,
  },
  {
    id: 'sixieme-sens',
    name: '🎲 Le Sixième Sens',
    emoji: '🎲',
    rarity: 'rare',
    category: 'declarative',
    activation: 'pre-turn',
    isOffensive: false,
    soundId: 'rarity-rare',
    image: './cards/sixieme-sens.jpg',
    shortDescription: 'Avant le 1er lancer : jouez tout votre tour avec 6 dés au lieu de 5.',
    fullDescription:
      '⏱️ À annoncer AVANT votre 1er lancer : vous jouez tout votre tour avec un 6e dé supplémentaire. Une main pleine nécessite alors 6 dés marquants ; 6 dés identiques doublent la valeur d’une quinte.',
    inDeck: true,
  },
  {
    id: 'seconde-chance',
    name: '🔄 La Seconde Chance',
    emoji: '🔄',
    rarity: 'rare',
    category: 'declarative',
    activation: 'pre-turn',
    isOffensive: false,
    soundId: 'rarity-rare',
    image: './cards/seconde-chance.jpg',
    shortDescription: 'En voyant vos dés : relancez une fois après une broucouille.',
    fullDescription:
      '🎲 En voyant vos dés après une broucouille : si votre lancer ne donne aucun point, relancez immédiatement les mêmes dés une seule fois pour sauver votre tour.',
    inDeck: true,
  },
  {
    id: 'reset',
    name: '♻️ Le Reset',
    emoji: '♻️',
    rarity: 'common',
    category: 'declarative',
    activation: 'pre-turn',
    isOffensive: false,
    soundId: 'rarity-common',
    image: './cards/reset.jpg',
    shortDescription: 'Pendant le tour : reprenez tous vos dés en gardant vos points du tour.',
    fullDescription:
      '🎲 Pendant votre tour, entre deux lancers : accorde une main pleine gratuite. Vous reprenez les 5 dés (6 avec Sixième Sens) tout en conservant les points accumulés plus tôt dans le tour, puis choisissez de relancer.',
    inDeck: true,
  },
  {
    id: 'convertisseur',
    name: '🔁 Le Convertisseur',
    emoji: '🔁',
    rarity: 'common',
    category: 'declarative',
    activation: 'pre-turn',
    isOffensive: false,
    soundId: 'rarity-common',
    image: './cards/convertisseur.jpg',
    shortDescription: 'En voyant vos dés : transforme un dé non-marquant (2, 3, 4, 6) en 5.',
    fullDescription:
      '🎲 En voyant vos dés après un lancer : retournez un dé non-marquant (valeur 2, 3, 4 ou 6) pour en faire un 5. Recalculez le dernier lancer entier pour continuer ou sauver votre tour, sans toucher aux réserves des lancers précédents.',
    inDeck: true,
  },
  {
    id: 'cameleon',
    name: '🦎 Le Caméléon',
    emoji: '🦎',
    rarity: 'legendary',
    category: 'declarative',
    activation: 'pre-turn',
    isOffensive: false,
    soundId: 'rarity-legendary',
    image: './cards/cameleon.jpg',
    shortDescription: 'En voyant vos dés : changez la face d’un dé en n’importe quelle valeur.',
    fullDescription:
      '🎲 En voyant vos dés après un lancer : changez un dé du dernier lancer en la valeur de votre choix (1 à 6), même s’il vient d’être gardé automatiquement. Recalculez ce lancer entier, sans toucher aux réserves des lancers précédents.',
    inDeck: true,
  },
  {
    id: 'petite-suite',
    name: '📏 La Petite Suite',
    emoji: '📏',
    rarity: 'common',
    category: 'declarative',
    activation: 'pre-turn',
    isOffensive: false,
    soundId: 'rarity-common',
    image: './cards/petite-suite.jpg',
    shortDescription: 'En voyant vos dés : une suite de 4 dés sur la table vaut 1 000 pts.',
    fullDescription:
      '🎲 En voyant vos dés après un lancer : si 4 dés du dernier lancer forment une suite consécutive (1-2-3-4, 2-3-4-5 ou 3-4-5-6), elle rapporte 1 000 points ! Recalculez ce lancer entier, y compris les dés juste gardés, sans toucher aux anciennes réserves. Les autres dés peuvent marquer ou être relancés.',
    inDeck: true,
  },
  {
    id: 'aimant',
    name: "🧲 L'Aimant",
    emoji: '🧲',
    rarity: 'rare',
    category: 'declarative',
    activation: 'pre-turn',
    isOffensive: false,
    soundId: 'rarity-rare',
    image: './cards/aimant.jpg',
    shortDescription: 'Avant le 1er lancer : cumulez vos 1 ou vos 5 sur plusieurs lancers.',
    fullDescription:
      '⏱️ À annoncer AVANT votre 1er lancer : choisissez les 1 ou les 5. Regroupez cette valeur entre les lancers d’une même main pour former brelan, carré, quinte ou six identiques, sans compter deux fois les points déjà acquis. À main pleine ou après Reset, le regroupement repart à zéro ; le cumul reste conservé.',
    inDeck: true,
  },
  {
    id: 'sniper',
    name: '🎯 Le Sniper',
    emoji: '🎯',
    rarity: 'legendary',
    category: 'interactive',
    activation: 'pre-turn',
    isOffensive: true,
    soundId: 'sniper',
    image: './cards/sniper.jpg',
    shortDescription: 'Avant de valider : toute collision directe ce tour inflige -2 paliers.',
    fullDescription:
      '🎲 À activer avant de valider votre score : toute collision directe provoquée par votre score lors de ce tour fait chuter la victime de deux paliers complets au lieu d’un seul.',
    inDeck: true,
  },
  {
    id: 'gel',
    name: '🧊 Le Gel',
    emoji: '🧊',
    rarity: 'rare',
    category: 'interactive',
    activation: 'instant-target',
    isOffensive: true,
    soundId: 'freeze',
    image: './cards/gel.jpg',
    shortDescription: 'Pendant votre tour : la cible passe son prochain tour sans pénalité.',
    fullDescription:
      '⚡ À jouer pendant votre tour : applique le statut Gelé à un adversaire. La cible passera automatiquement son prochain tour de jeu sans recevoir de bâton d’échec.',
    inDeck: true,
  },
  {
    id: 'pickpocket',
    name: '🕵️ Le Pickpocket',
    emoji: '🕵️',
    rarity: 'rare',
    category: 'interactive',
    activation: 'instant-self',
    isOffensive: true,
    soundId: 'rarity-rare',
    image: './cards/pickpocket.jpg',
    shortDescription: 'Pendant votre tour : vole 1 000 pts au leader actuel.',
    fullDescription:
      '⚡ À jouer pendant votre tour : vole 1 000 points au joueur actuellement en tête (si ce leader a au moins 1 000 points et que ce n’est pas vous). Les points sont transférés à votre score.',
    inDeck: true,
  },
  {
    id: 'teleporteur',
    name: '🔀 Le Téléporteur',
    emoji: '🔀',
    rarity: 'legendary',
    category: 'interactive',
    activation: 'instant-self',
    isOffensive: false,
    soundId: 'rarity-legendary',
    image: './cards/teleporteur.jpg',
    shortDescription:
      'Pendant votre tour : échange votre score avec le joueur devant vous (écart ≤ 3 000).',
    fullDescription:
      '⚡ À jouer pendant votre tour : échange instantanément votre score avec celui du joueur qui vous précède immédiatement au classement, à condition que l’écart soit compris entre 100 et 3 000 points inclus.',
    inDeck: true,
  },
  {
    id: 'malediction',
    name: '🧿 La Malédiction',
    emoji: '🧿',
    rarity: 'rare',
    category: 'interactive',
    activation: 'instant-target',
    isOffensive: true,
    soundId: 'curse',
    image: './cards/malediction.jpg',
    shortDescription: 'Pendant votre tour : la cible devra marquer ≥ 500 pts à son tour.',
    fullDescription:
      '⚡ À jouer pendant votre tour : cible un joueur. À son prochain tour, il devra valider un score d’au moins 500 points. S’il valide moins ou fait chou blanc, le tour compte comme un échec (bâton).',
    inDeck: true,
  },
  {
    id: 'parieur',
    name: '🎰 Le Parieur',
    emoji: '🎰',
    rarity: 'common',
    category: 'interactive',
    activation: 'instant-target',
    isOffensive: false,
    soundId: 'rarity-common',
    image: './cards/parieur.jpg',
    shortDescription: 'Pendant votre tour : pariez qu’un joueur fera chou blanc (+1 000 pts).',
    fullDescription:
      '⚡ À jouer pendant votre tour : pariez sur l’échec d’une cible à son prochain tour. Si cette cible fait broucouille, vous empochez immédiatement 1 000 points.',
    inDeck: true,
  },
  {
    id: 'bombe',
    name: '💣 La Bombe',
    emoji: '💣',
    rarity: 'rare',
    category: 'interactive',
    activation: 'instant-target',
    isOffensive: true,
    soundId: 'bomb',
    image: './cards/bombe.jpg',
    shortDescription: 'Pendant votre tour : place une bombe qui explose après 3 tours de table.',
    fullDescription:
      '⚡ À jouer pendant votre tour : place la bombe sur un adversaire. Le porteur peut s’en débarrasser en marquant au moins 1 000 points lors de son tour. Après 3 tours de table complets, la bombe explose et fait chuter son porteur d’un palier.',
    inDeck: true,
  },
  {
    id: 'duel',
    name: '⚔️ Le Duel',
    emoji: '⚔️',
    rarity: 'rare',
    category: 'interactive',
    activation: 'instant-target',
    isOffensive: true,
    soundId: 'duel',
    image: './cards/duel.jpg',
    shortDescription: 'Pendant votre tour : défie un joueur (le meilleur tour vole 1 000 pts).',
    fullDescription:
      '⚡ À jouer pendant votre tour : défie un adversaire. On compare le score de votre tour avec celui du prochain tour de la cible : le meilleur score vole 1 000 points à l’autre (en cas d’égalité, rien ne se passe).',
    inDeck: true,
  },
  {
    id: 'percepteur',
    name: '💰 Le Percepteur',
    emoji: '💰',
    rarity: 'rare',
    category: 'interactive',
    activation: 'instant-self',
    isOffensive: false,
    soundId: 'shop',
    image: './cards/percepteur.jpg',
    shortDescription: 'Pendant votre tour : prélève 200 pts sur chaque tour adverse ≥ 1 000 pts.',
    fullDescription:
      '⚡ À jouer pendant votre tour : pendant 1 tour de table complet, chaque adversaire qui valide 1 000 points ou plus sur son tour vous verse automatiquement une taxe de 200 points.',
    inDeck: true,
  },
  {
    id: 'echo',
    name: "🔁 L'Écho",
    emoji: '🔁',
    rarity: 'rare',
    category: 'interactive',
    activation: 'instant-self',
    isOffensive: false,
    soundId: 'rarity-rare',
    image: './cards/echo.jpg',
    shortDescription: 'Pendant votre tour : copie l’effet de la dernière carte jouée.',
    fullDescription:
      '⚡ À jouer pendant votre tour : déclenche immédiatement l’effet de la dernière carte posée au cours de la partie.',
    inDeck: true,
  },
  {
    id: 'troc',
    name: '🤝 Le Troc',
    emoji: '🤝',
    rarity: 'common',
    category: 'interactive',
    activation: 'instant-target',
    isOffensive: false,
    soundId: 'rarity-common',
    image: './cards/troc.jpg',
    shortDescription: 'Pendant votre tour : échange une carte au hasard avec la cible.',
    fullDescription:
      '⚡ À jouer pendant votre tour : échange au hasard 1 carte de votre main (autre que Le Troc) contre 1 carte tirée au hasard dans la main de l’adversaire ciblé.',
    inDeck: true,
  },
  {
    id: 'vampire',
    name: '🧛 Le Vampire',
    emoji: '🧛',
    rarity: 'legendary',
    category: 'interactive',
    activation: 'instant-self',
    isOffensive: false,
    soundId: 'rarity-legendary',
    image: './cards/vampire.jpg',
    shortDescription: 'Pendant votre tour : +500 pts par collision provoquée sur ce palier.',
    fullDescription:
      '⚡ À jouer pendant votre tour : jusqu’à ce que vous franchissiez votre prochain palier (20k, 40k, 60k, 80k), chaque collision que vous provoquez vous rapporte un bonus de 500 points.',
    inDeck: true,
  },
  {
    id: 'parachute',
    name: '🪂 Le Parachute',
    emoji: '🪂',
    rarity: 'rare',
    category: 'defensive',
    activation: 'passive-prompt',
    isOffensive: false,
    soundId: 'rarity-rare',
    image: './cards/parachute.jpg',
    shortDescription: 'Automatique en défense : divise par deux la perte de points d’une chute.',
    fullDescription:
      '🛡️ Automatique (proposée en cas de chute) : lors d’une chute de score vers un palier inférieur, ne perdez que la moitié de l’écart (arrondie à la centaine inférieure).',
    inDeck: true,
  },
  {
    id: 'effaceur',
    name: "🧽 L'Effaceur",
    emoji: '🧽',
    rarity: 'common',
    category: 'defensive',
    activation: 'instant-self',
    isOffensive: false,
    soundId: 'rarity-common',
    image: './cards/effaceur.jpg',
    shortDescription: 'Pendant votre tour : efface immédiatement tous vos bâtons d’échec.',
    fullDescription:
      '⚡ À jouer pendant votre tour : remet instantanément votre compteur d’échecs consécutifs à 0, écartant la menace imminente d’une chute à 3 bâtons.',
    inDeck: true,
  },
  {
    id: 'fantome',
    name: '👻 Le Fantôme',
    emoji: '👻',
    rarity: 'legendary',
    category: 'defensive',
    activation: 'instant-self',
    isOffensive: false,
    soundId: 'rarity-legendary',
    image: './cards/fantome.jpg',
    shortDescription:
      'Pendant votre tour : immunise contre les collisions jusqu’au prochain palier.',
    fullDescription:
      '⚡ À jouer pendant votre tour : vous devenez intangible et insensible à toute collision provoquée par les adversaires jusqu’à ce que vous atteigniez votre prochain palier de score.',
    inDeck: true,
  },
  {
    id: 'assurance',
    name: "☂️ L'Assurance",
    emoji: '☂️',
    rarity: 'common',
    category: 'defensive',
    activation: 'pre-turn',
    isOffensive: false,
    soundId: 'rarity-common',
    image: './cards/assurance.jpg',
    shortDescription: 'Avant le 1er lancer : sauve la moitié de vos points en cas de broucouille.',
    fullDescription:
      '⏱️ À annoncer AVANT votre 1er lancer : si vous faites chou blanc au cours du tour, saisissez les points que vous aviez accumulés avant la faute pour en valider la moitié (arrondie à la centaine inférieure).',
    inDeck: true,
  },
  {
    id: 'bis',
    name: '🔂 Le Bis',
    emoji: '🔂',
    rarity: 'legendary',
    category: 'defensive',
    activation: 'instant-self',
    isOffensive: false,
    soundId: 'rarity-legendary',
    image: './cards/bis.jpg',
    shortDescription: 'Pendant votre tour : rejouez immédiatement un tour complet après celui-ci.',
    fullDescription:
      '⚡ À jouer pendant votre tour : accorde un tour de jeu supplémentaire immédiat. À l’issue de votre tour en cours, la main ne passe pas et vous rejouez aussitôt.',
    inDeck: true,
  },
  {
    id: 'boomerang',
    name: '🪃 Le Boomerang',
    emoji: '🪃',
    rarity: 'legendary',
    category: 'defensive',
    activation: 'passive-prompt',
    isOffensive: false,
    soundId: 'rarity-legendary',
    image: './cards/boomerang.jpg',
    shortDescription: 'Automatique en défense : renvoie une carte offensive sur son lanceur.',
    fullDescription:
      '🛡️ Automatique (gardée secrètement en main) : dès qu’un adversaire vous cible avec une carte offensive (Gel, Malédiction, Bombe, Duel, Gage), renvoie automatiquement l’effet sur le joueur qui l’a lancée.',
    inDeck: true,
  },
  {
    id: 'tout-ou-rien',
    name: '💥 Tout ou Rien',
    emoji: '💥',
    rarity: 'rare',
    category: 'risk',
    activation: 'pre-turn',
    isOffensive: false,
    soundId: 'rarity-rare',
    image: './cards/tout-ou-rien.jpg',
    shortDescription: 'Avant le 1er lancer : score ×3 si ≥ 1 000 pts, sinon 2 bâtons d’échec.',
    fullDescription:
      '⏱️ À annoncer AVANT votre 1er lancer : si vous marquez au moins 1 000 points, le score est triplé (×3). Si vous faites moins de 1 000 ou chou blanc, vous prenez 2 bâtons d’échec d’un coup.',
    inDeck: true,
  },
  {
    id: 'contrat',
    name: '📜 Le Contrat',
    emoji: '📜',
    rarity: 'rare',
    category: 'risk',
    activation: 'pre-turn',
    isOffensive: false,
    soundId: 'rarity-rare',
    image: './cards/contrat.jpg',
    shortDescription: 'Avant le 1er lancer : annoncez un score exact pour doubler vos points.',
    fullDescription:
      '⏱️ À annoncer AVANT votre 1er lancer : choisissez un score cible multiple de 100 (au moins 300 pts). Si vous validez exactement ce montant, vos points sont doublés. Tout autre résultat compte comme un échec.',
    inDeck: true,
  },
  {
    id: 'pandore',
    name: '📦 La Boîte de Pandore',
    emoji: '📦',
    rarity: 'legendary',
    category: 'risk',
    activation: 'instant-self',
    isOffensive: false,
    soundId: 'pandora',
    image: './cards/pandore.jpg',
    shortDescription: 'Pendant votre tour : 50 % Légendaire, 50 % Malédiction.',
    fullDescription:
      '⚡ À jouer pendant votre tour : tentez le destin ! Vous avez 50 % de chances de piocher immédiatement une carte Légendaire, et 50 % de chances de subir la Malédiction au prochain tour.',
    inDeck: true,
  },
  {
    id: 'main-faible',
    name: '🫲 Main faible',
    emoji: '🫲',
    rarity: 'common',
    category: 'gage',
    activation: 'instant-target',
    isOffensive: true,
    soundId: 'rarity-common',
    image: './cards/main-faible.jpg',
    shortDescription:
      'Pendant votre tour (Gage) : la cible lance de sa mauvaise main ou perd 500 pts.',
    fullDescription:
      '⚡ À jouer pendant votre tour (Gage d’ambiance) : la cible doit obligatoirement lancer les dés de sa mauvaise main à son prochain tour, ou refuser et perdre 500 points.',
    inDeck: true,
  },
  {
    id: 'aveugle',
    name: "🙈 À l'aveugle",
    emoji: '🙈',
    rarity: 'common',
    category: 'gage',
    activation: 'instant-target',
    isOffensive: true,
    soundId: 'rarity-common',
    image: './cards/aveugle.jpg',
    shortDescription: 'Pendant votre tour (Gage) : la cible lance les yeux bandés.',
    fullDescription:
      '⚡ À jouer pendant votre tour (Gage d’ambiance) : la cible doit lancer les dés les yeux fermés ou bandés à son prochain tour tandis qu’un autre joueur lui dicte ses résultats.',
    inDeck: true,
  },
  {
    id: 'annonceur',
    name: "🎤 L'Annonceur",
    emoji: '🎤',
    rarity: 'common',
    category: 'gage',
    activation: 'instant-target',
    isOffensive: true,
    soundId: 'rarity-common',
    image: './cards/annonceur.jpg',
    shortDescription: 'Pendant votre tour (Gage) : la cible commente son tour comme un speaker.',
    fullDescription:
      '⚡ À jouer pendant votre tour (Gage d’ambiance) : la cible doit commenter l’intégralité de son prochain tour de dés avec la voix et l’énergie d’un commentateur de finale sportive.',
    inDeck: true,
  },
  {
    id: 'architecte',
    name: "🏗️ L'Architecte",
    emoji: '🏗️',
    rarity: 'special',
    category: 'privilege',
    activation: 'automatic',
    isOffensive: false,
    soundId: 'tier-crossed',
    image: './cards/architecte.jpg',
    shortDescription: 'Privilège du premier au palier : choisit une carte à donner au dernier.',
    fullDescription:
      'Privilège accordé au premier joueur franchissant un palier (20k, 40k, 60k, 80k) : l’app tire 3 cartes au sort, le leader en choisit une et l’offre au dernier joueur.',
    inDeck: false,
  },
])

export const findCard = (id) => CARDS.find((card) => card.id === id) ?? null

export const getCardDescriptions = (card, modeConfig) => {
  if (!card) {
    return { shortDescription: '', fullDescription: '' }
  }

  if (
    card.id === 'pickpocket' &&
    typeof modeConfig?.pickpocketAmount === 'number' &&
    modeConfig.pickpocketAmount !== 1000
  ) {
    const formattedAmount = modeConfig.pickpocketAmount.toLocaleString('fr-FR')
    return {
      shortDescription: card.shortDescription.replace(/1[\s\u00a0\u202f]000/g, formattedAmount),
      fullDescription: card.fullDescription.replace(/1[\s\u00a0\u202f]000/g, formattedAmount),
    }
  }

  return {
    shortDescription: card.shortDescription,
    fullDescription: card.fullDescription,
  }
}

export const pickRarity = (rng = Math.random, weights = RARITY_WEIGHTS) => {
  const r = rng()
  if (r < weights.common) return 'common'
  if (r < weights.common + weights.rare) return 'rare'
  return 'legendary'
}

export const drawCardByRarity = (rarity, rng = Math.random, excludeIds = [], allowedIds = null) => {
  const allowedSet = allowedIds ? new Set(allowedIds) : null
  const excludeSet = new Set(excludeIds)
  const isAllowed = (c) => (allowedSet ? allowedSet.has(c.id) : true)
  const matchesRarity = (c) => (rarity ? c.rarity === rarity : true)

  let pool = CARDS.filter(
    (c) => c.inDeck && matchesRarity(c) && isAllowed(c) && !excludeSet.has(c.id)
  )
  if (pool.length === 0) {
    pool = CARDS.filter((c) => c.inDeck && matchesRarity(c) && isAllowed(c))
  }
  if (pool.length === 0) return null
  const idx = Math.floor(rng() * pool.length)
  return pool[Math.min(idx, pool.length - 1)]
}

export const drawRandomCard = (
  rng = Math.random,
  excludeIds = [],
  { weights = RARITY_WEIGHTS, allowedIds = null } = {}
) => {
  const rarity = pickRarity(rng, weights)
  return (
    drawCardByRarity(rarity, rng, excludeIds, allowedIds) ??
    drawCardByRarity(null, rng, excludeIds, allowedIds)
  )
}

export const drawDistinctCards = (
  count,
  rng = Math.random,
  { weights = RARITY_WEIGHTS, allowedIds = null } = {}
) => {
  const allowedSet = allowedIds ? new Set(allowedIds) : null
  const deck = CARDS.filter((card) => card.inDeck && (allowedSet ? allowedSet.has(card.id) : true))
  const maxCount = Math.min(count, deck.length)
  const chosen = []

  while (chosen.length < maxCount) {
    const excluded = chosen.map((c) => c.id)
    const card = drawRandomCard(rng, excluded, { weights, allowedIds })
    if (card && !chosen.some((c) => c.id === card.id)) {
      chosen.push(card)
    } else {
      const remaining = deck.filter((c) => !chosen.some((x) => x.id === c.id))
      const idx = Math.floor(rng() * remaining.length)
      chosen.push(remaining[Math.min(idx, remaining.length - 1)])
    }
  }

  return chosen
}
