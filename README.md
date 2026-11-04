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
- Menu Campagne, difficulté expliquée avant le départ, résumé de reprise et options accessibles depuis la pause.
- Collection par catégorie et chapitre, filtres découvert/manquant, conditions des succès publics et relecture des fins découvertes.
- Carnet persistant des inscriptions lues, orientations révélées, mécanismes activés et archives retrouvées.
- Confirmation avant remplacement d’une campagne par un chapitre ou un dossier importé.
- AZERTY, QWERTY, rotation au clavier, touches personnalisables, souris, manette et tactile avec course et disposition réglables.
- Sous-titres, texte agrandi, contraste renforcé, réduction des mouvements et des flashs, calibration de luminosité, FOV et sensibilité.
- Volumes général, effets, ambiance et voix indépendants, préécoute en pause et réduction de dynamique.
- Audio procédural ; synthèse française facultative limitée aux voix locales disponibles, avec retour écrit si elle manque ou échoue.
- PWA installable, fichiers vérifiés par génération et révision visible, sans ressource tierce requise pour jouer.

## Commandes

| Action | Clavier / souris | Manette | Tactile |
|---|---|---|---|
| Déplacement | ZQSD, WASD ; ↑ / ↓ pour avancer / reculer | Stick gauche | Joystick |
| Regarder | Souris ou ← / → | Stick droit | Glisser sur la vue |
| Courir | Maj gauche / droite | Clic stick gauche | COURIR (bascule ou maintien) |
| Interagir | E, Entrée ou clic gauche | A / Croix | EXAMINER |
| Signal / mode du projecteur | C ou clic droit | B / Rond | SIGNAL |
| Appeler Aziz | F | X / Carré | AZIZ |
| Flash | Espace | Y / Triangle | FLASH |
| Lampe | L | LB / L1 | LAMPE |
| Pause | Échap | Menu / Options | II |
| Carnet | Tab ou J | View / Pavé tactile | II puis Journal |

Dans les menus et panneaux, la croix directionnelle ou le stick déplace le focus, A/Croix valide et B/Rond revient en arrière.
Sur un curseur ou une liste d’options, gauche/droite ajuste la valeur. Les réglages sont regroupés en Image, Son, Accessibilité et Jeu et commandes.

Les touches du tableau sont les valeurs d’origine. **Jeu et commandes** permet de remplacer chaque action par une touche, refuse les conflits et rétablit les valeurs d’origine. Les affectations suivent les positions physiques du clavier et restent dans les exports JSON. Échap garde toujours son rôle de pause et de retour des menus. Les indications du prologue, du jeu et du carnet suivent le dernier périphérique réellement utilisé.

Sur écran tactile, la course se règle en bascule ou maintien. La taille des commandes et le côté des actions se choisissent dans les mêmes options. Ouvrir un menu libère le joystick, la visée et la course. Le carnet conserve uniquement les découvertes effectuées ; une ancienne sauvegarde récupère les inscriptions déjà lues dans son chapitre lors de la reprise.

## Vérifier

```bash
npm run release:prepare
npm test
npm run build
```

Après une modification de `index.html`, du manifeste, de `src/`, d’un asset ou du service worker, `release:prepare` régénère `src/release.js` et le manifeste SHA-256 intégré à `sw.js`. Versionner ces deux fichiers avec les changements. Le build refuse un manifeste périmé. La révision affichée dérive du contenu public et de la logique du worker ; le numéro fonctionnel et les clés de sauvegarde restent v1.2.0.

La suite `npm test` contrôle syntaxe, contrat de contenu, accessibilité de chaque entité par parcours de carte, lumière, tension, fins, succès, manifeste PWA et chemins HTTP privés. Elle exécute aussi des méthodes réelles du moteur dans des environnements Node/VM avec Canvas ou DOM simulés pour les régressions ciblées. Ces simulations ne remplacent pas un navigateur.

`npm run build` produit `dist/`, vérifie les références locales, les icônes du manifeste, le titre/version et l’absence de fichiers privés au premier niveau. Le test de build compare aussi les principaux fichiers de l’artefact avec les sources. Le workflow **Vérifier AZIZ** relance tests et build sur les PR.

La recette navigateur de publication reste à exécuter : parcours desktop, tactile dès 320 px, manette physique, pause/journal/checkpoint, stockage refusé, import non destructif, campagne complète et rechargement hors ligne. Son statut exact figure dans l’audit ; aucune recette visuelle n’est déduite des tests Node.

## Recevoir une mise à jour

Le worker vérifie tous les fichiers d’une nouvelle génération avant son installation. Il attend la fermeture des anciens onglets AZIZ avant de l’activer ; les fichiers du jeu contrôlé restent issus d’une même génération. Lorsqu’une mise à jour est prête, sauvegarder, fermer tous les onglets ou fenêtres de l’application AZIZ, puis rouvrir le jeu. Le pied de l’écran titre et les panneaux affichent sa révision. La première migration depuis l’ancien cache r5 demande également cette fermeture complète ; recharger un onglet encore contrôlé par l’ancien worker ne suffit pas nécessairement.

La campagne et le profil restent dans le stockage local du navigateur : la mise à jour du cache ne les efface pas. Le menu Sauvegardes permet aussi d’en conserver un export JSON.

## Audit du 4 novembre 2026

L’audit part du commit `66c8efe0f309c1aeaf64673141467aea2e1d774c` et conserve le contrat v1.2.0. Le [rapport et les preuves](docs/audit/README.md) accompagnent le [classeur Excel](docs/audit/AZIZ_Audit_Complet_2026-11-04.xlsx) et son registre JSON. Les constats de code, simulations, propositions de conception et vérifications restantes y sont distingués.

## Note de provenance

Cette édition est une reconstruction fidèle à partir de la conversation ChatGPT indiquée dans [SOURCE_PROVENANCE.md](SOURCE_PROVENANCE.md). Elle n’est pas présentée comme le contenu binaire de l’archive historique, indisponible dans les sources locales consultées.

Tous les graphismes, cartes, textes, sons procéduraux et éléments d’interface de ce dépôt sont originaux et ne chargent aucun contenu externe pendant la partie. Le key art de Gizeh a été généré spécifiquement pour ce projet avec l’outil d’image OpenAI ; son prompt exact figure dans [docs/KEY_ART_PROMPT.md](docs/KEY_ART_PROMPT.md).

Le [registre des ressources](docs/ASSETS.md) contient les fichiers distribués, leurs sources connues et leurs empreintes. Les informations de provenance manquantes et le choix de licence restent explicitement ouverts.
