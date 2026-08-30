# AZIZ — La Lumière Dort v1.2.0

Jeu d’horreur original en 2,5D, jouable et terminable dans un navigateur moderne. Vous explorez six zones d’un temple enfoui pendant qu’Aziz maintient le projecteur qui repousse les présences. Sa vigilance, sa confiance et sa corruption changent la difficulté et la fin.

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
- Raycasting Canvas 2,5D, collisions, poursuites, lumière, flash, projecteur et bruit.
- Vigilance, confiance et corruption d’Aziz.
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
| Signal miroir | Q ou clic droit | B / Rond | — |
| Appeler Aziz | F | X / Carré | AZIZ |
| Flash | Espace | Y / Triangle | FLASH |
| Lampe | L | — | LAMPE |
| Pause / journal | Échap, Tab ou J | Menu | II |

## Vérifier

```bash
npm test
npm run build
```

Les tests contrôlent syntaxe, contrat de contenu, cartes, positionnement, sauvegarde, PWA, chemins HTTP et artefact statique.

## Note de provenance

Cette édition est une reconstruction fidèle à partir de la conversation ChatGPT indiquée dans [SOURCE_PROVENANCE.md](SOURCE_PROVENANCE.md). Elle n’est pas présentée comme le contenu binaire de l’archive historique, indisponible dans les sources locales consultées.

Tous les graphismes, cartes, textes, sons procéduraux et éléments d’interface de ce dépôt sont originaux et ne chargent aucun contenu externe pendant la partie.
