# AZIZ — La Lumière Dort v1.2.0

Survival horror archéologique original en 2,5D, jouable et terminable dans un navigateur moderne. À Gizeh en 1926, vous explorez six zones d’un temple enfoui pendant qu’Aziz maintient depuis la surface le projecteur qui repousse les présences. Vigilance, synchronisation, confiance et corruption persistent pendant toute la campagne et déterminent réellement la fin.

## Jouer

```bash
npm start
```

Puis ouvrir `http://localhost:4173`. Le jeu fonctionne sans bibliothèque externe et devient disponible hors connexion après la première visite grâce à la PWA.

Production : [aziz-la-lumiere-dort.vercel.app](https://aziz-la-lumiere-dort.vercel.app)

## Contenu v1.2.0

- 6 chapitres, de la Chambre des noms au Trône de l’aube absente.
- 89 objets et mécanismes interactifs.
- 6 familles de menaces avec vitesse, résistance et comportement propres.
- 18 archives, 16 succès locaux, 4 fins et 3 difficultés.
- Raycasting Canvas 2,5D adaptatif, cartes entièrement connectées, collisions, occlusion lumineuse et silhouettes propres aux menaces.
- Trois modes de projecteur — Balayage, Focalisé et Rempart — avec lien, stabilité, synchronisation et corruption d’Aziz.
- Six IA distinctes : immobilité sous faisceau, drain de lampe, chasse au bruit, angles morts, faux appels et boss conditionnel.
- Énigmes dédiées par chapitre : canalisation, alignement, séquences, reconnaissance de souvenirs et ordre rituel.
- Directeur de tension avec pics, respiration, bruits spatialisés et audio procédural dynamique.
- Sauvegarde automatique, points de contrôle, sélection des chapitres et import/export JSON validé.
- AZERTY, QWERTY, souris, manette et tactile.
- Sous-titres, texte agrandi, contraste renforcé, réduction des mouvements, FOV, sensibilité et volume.
- Audio et voix facultatives produits à l’exécution par les API du navigateur.
- PWA installable et cache hors ligne sans ressource tierce.

## Commandes

| Action | Clavier / souris | Manette | Tactile |
|---|---|---|---|
| Déplacement | ZQSD, WASD ou flèches | Stick gauche | Joystick |
| Regarder | Souris | Stick droit | Glisser côté droit |
| Interagir | E, Entrée | A / Croix | E |
| Signal / mode du projecteur | C ou clic droit | B / Rond | SIGNAL |
| Appeler Aziz | F | X / Carré | AZIZ |
| Flash | Espace | Y / Triangle | FLASH |
| Lampe | L | LB / L1 | LAMPE |
| Pause / journal | Échap, Tab ou J | Menu | II |

Dans les menus et panneaux, la croix directionnelle ou le stick déplace le focus, A/Croix valide et B/Rond revient en arrière.

## Vérifier

```bash
npm test
npm run build
```

La suite `npm test` contrôle syntaxe, contrat de contenu, accessibilité de chaque entité par parcours de carte, lumière, tension, fins, succès, manifeste PWA et chemins HTTP privés. `npm run build` produit et vérifie séparément l’artefact `dist/`. La recette navigateur de publication couvre le parcours desktop, le tactile dès 320 px, pause/journal/checkpoint, stockage refusé, import non destructif et rechargement hors ligne.

## Note de provenance

Cette édition est une reconstruction fidèle à partir de la conversation ChatGPT indiquée dans [SOURCE_PROVENANCE.md](SOURCE_PROVENANCE.md). Elle n’est pas présentée comme le contenu binaire de l’archive historique, indisponible dans les sources locales consultées.

Tous les graphismes, cartes, textes, sons procéduraux et éléments d’interface de ce dépôt sont originaux et ne chargent aucun contenu externe pendant la partie. Le key art de Gizeh a été généré spécifiquement pour ce projet avec l’outil d’image OpenAI ; son prompt exact figure dans [docs/KEY_ART_PROMPT.md](docs/KEY_ART_PROMPT.md).
