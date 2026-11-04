# AZIZ — Audit transversal du 4 novembre 2026

## Résultat et périmètre

L’audit porte sur **darknigthmare/aziz-la-lumiere-dort**, à partir du commit **66c8efe0f309c1aeaf64673141467aea2e1d774c** de `main`. Aucune PR ouverte n’était présente lors de l’inventaire. La branche principale a été vérifiée à nouveau avant livraison et correspond toujours à cette base.

Le dépôt contient l’**édition reconstruite v1.2.0**. Son contrat reste conservé : **6 chapitres, 89 interactifs, 6 familles de menaces, 18 archives, 16 succès, 4 fins et 3 difficultés**. Les archives historiques 4.x évoquées dans d’autres échanges n’ont pas été récupérées et ne sont pas incluses dans cet audit.

Le livrable central est [AZIZ_Audit_Complet_2026-11-04.xlsx](AZIZ_Audit_Complet_2026-11-04.xlsx). Son registre source [audit-register.json](audit-register.json) rend chaque ligne relisible dans une revue Git. Les trois onglets donnent la synthèse, le registre détaillé et les scénarios QA.

| Nature de l’action | Lignes |
|---|---:|
| Corriger | 24 |
| Améliorer | 33 |
| Ajouter | 15 |
| **Total** | **72** |

| État à la livraison | Lignes | Signification |
|---|---:|---|
| Corrigé et vérifié | 13 | Comportement ciblé vérifié par tests Node ou VM ; aucune recette matérielle implicite |
| Implémenté — recette visuelle restante | 11 | Code intégré, contrôles visuels ou parcours UI encore nécessaires |
| Partiellement implémenté | 3 | Une partie de l’action est livrée ; le reste est explicitement détaillé |
| À planifier | 45 | Travail ouvert, non présenté comme livré |

Les priorités se répartissent en **25 P1, 44 P2 et 3 P3**. P1 signale un défaut important ou un chantier structurant, P2 une amélioration utile, P3 une extension moins urgente. Les efforts sont des ordres de grandeur, pas des délais de livraison garantis. Aucun pourcentage de complétude du jeu n’est calculé.

## Défauts corrigés dans ce premier lot

### Puzzles et interactions

- **GP-003, GP-004** : le Puits des voix annonce désormais **Soleil — Souffle — Silence**, conformément à sa séquence réelle `[2,0,1]`. L’archive, l’indice et le guide concordent. L’inscription des miroirs ne contredit plus l’orientation nord du roseau. Les positions, objectifs et identifiants restent compatibles avec les sauvegardes.
- **GP-005** : un sceau exige réellement le projecteur dirigé vers lui pendant la canalisation. Détourner le regard ou rompre le faisceau annule la charge ; un nouveau départ n’hérite pas d’une charge presque complète.
- **GP-007** : un souvenir attend que l’appel d’Aziz soit disponible avant d’ouvrir sa fenêtre de réponse. Le délai de 5 secondes ne démarre plus pendant une recharge de 5,2 secondes.
- **GP-008** : huile et magnésium restent sur place lorsque la réserve correspondante est pleine, puis peuvent être récupérés après consommation.
- **WD-019** : désactiver les sous-titres filtre les paroles, tout en conservant les indices, archives, inscriptions et messages d’action.

### IA, sauvegardes et temps de simulation

- **GP-006** : les scarabées ne drainent plus la lampe à travers un mur. Les dégâts de contact exigent également une ligne de vue.
- **GP-001, GP-002** : les modes du projecteur et types d’objectifs refusent les noms hérités tels que `constructor`, `toString` ou `__proto__`. La difficulté importée est aussi limitée aux clés textuelles du catalogue.
- **GP-020** : une frame s’arrête immédiatement après une mort ou une fin. L’autosauvegarde ne peut plus recréer la campagne que la vraie fin vient d’effacer.
- **WD-034** : la durée du flash dépend du temps de simulation. Redessiner l’écran ou rester en pause ne consomme plus cet effet.
- **RT-005** : le worker r5 supprime seulement les anciens caches appartenant à AZIZ. La migration atomique entre générations de fichiers reste ouverte en WD-037.

## Interface et rendu intégrés, à recetter en navigateur

Le titre privilégie **Continuer** et affiche chapitre, difficulté active, objectifs, durée du chapitre et date de sauvegarde. **Campagne** regroupe nouvelle expédition et chapitres ; **Collection** permet également de relire les fins déjà découvertes, sans révéler celles encore verrouillées.

La pause donne maintenant accès aux **Options, à la Collection et aux Sauvegardes**. Les options sont regroupées en Image, Son, Accessibilité et Jeu et commandes. Le retour au point de contrôle et les remplacements de campagne ont une confirmation ; une nouvelle expédition avertit explicitement de la progression remplacée. Un import accepté désactive l’ancien état de jeu avant de revenir au menu.

Les tailles en `rem` suivent désormais le réglage de texte agrandi. Les valeurs de curseurs/listes peuvent être ajustées à la manette. Les entrées sont réinitialisées aux transitions, les répétitions d’Échap sont filtrées et la perte de focus met la partie en pause. Le redessin des options en pause conserve le temps de simulation ; la reprise audio est explicite après checkpoint.

Pour le rendu, **WD-045** corrige la comparaison entre profondeur des murs et des sprites : ils utilisent maintenant le même espace caméra. Un masque par colonnes conserve uniquement les portions dégagées du sprite. Le cas du miroir de l’ibis au chapitre II est couvert par un test géométrique. **WD-009** conserve les mécanismes architecturaux après utilisation ; seuls les collectables disparaissent. Les états activés utilisent une teinte distincte ; des variantes graphiques plus élaborées restent à produire.

Ces changements existent dans les sources. **Ils ne sont pas présentés comme validés par captures ou manipulations dans un navigateur.**

## Ce que l’audit révèle sur les niveaux

Le [relevé topologique](world-summary.json) a été calculé par parcours en largeur des cartes de la base. Tous les interactifs sont accessibles depuis le départ : **89 sur 89**. Les six cartes comptent respectivement **323, 374, 384, 351, 344 et 422 cases ouvertes accessibles**.

La connexité confirme la circulation technique. Elle ne prouve pas la qualité du rythme, de l’orientation ou de l’exploration. Les six chapitres partagent une génération de couloirs et une disposition par cases mélangées. Le registre propose donc une composition propre à chaque lieu : chambre d’introduction, galerie optique, puits, scènes des souvenirs, circuit des pylônes et arène du Pharaon.

Le circuit imposé du Palais demande **133 déplacements orthogonaux minimaux**, dont des segments de 24, 27, 25 et 28 cases. Le Puits en demande 73. Ces mesures ne sont pas des durées de partie et n’intègrent ni ennemis, ni recherche, ni erreurs. Elles justifient une revue des trajets et du retour visuel sur les puzzles.

Les autres chantiers structurants sont le kit de props avec échelles/ancrages, le chemin physique de la lumière et des réflexions, la représentation de l’équipement en vue subjective, la navigation des menaces, les indices conservés dans le journal, le mixage audio, l’accessibilité des effets, la mesure de performance et la cohérence des mises à jour PWA. Chaque proposition possède une action et un critère d’acceptation dans l’Excel.

## Vérifications réellement exécutées

| Vérification | Résultat | Preuve |
|---|---|---|
| Suite de la base avant modification | 14/14 tests réussis | Suite initiale au commit de base |
| Suite finale locale | **47/47 tests réussis**, aucun ignoré | [validation-node.txt](validation-node.txt) |
| 26 tests ciblés runtime/rendu exécutés sur la base | 4 réussites, 22 échecs | [validation-baseline-runtime.txt](validation-baseline-runtime.txt) et tests de rendu |
| Les mêmes 26 tests sur le correctif | 26/26 réussis | Suites `runtime` et `rendering` |
| Build statique | 11 références contrôlées, inventaire public vérifié | [validation-build.txt](validation-build.txt) |
| Données et topologie | Contrat conservé, 6 cartes connexes, 89 interactifs accessibles | [world-summary.json](world-summary.json) |

Les quatre tests runtime déjà réussis sur la base prouvent une **préservation** : import invalide non destructif, import de profil seul conservant la campagne, import valide accepté et fallback mémoire lorsque le stockage est refusé. Ils ne sont pas comptés comme de nouveaux défauts corrigés.

Les tests VM exécutent des méthodes réelles extraites du fichier de production, avec stockage, éléments DOM minimaux et Canvas espion. Ils ne simulent pas un navigateur complet, ne comparent pas des pixels et ne constituent pas une campagne jouée humainement.

```bash
npm test
npm run build
node docs/audit/measure-world.mjs
```

Le workflow GitHub **Vérifier AZIZ** relance tests et build sur les PR. Son état distant est à lire dans les checks de la PR ; les résultats consignés ci-dessus sont les résultats locaux avant push.

## Limite de recette et suite prioritaire

Le lancement local de Chromium a échoué sur une restriction de socket (`EPERM`). Le navigateur distant a refusé le protocole `file://`, puis la revue automatique a refusé l’ouverture du déploiement Vercel en la considérant comme un contournement de ce blocage. Aucun contournement n’a été effectué. Aucune capture de jeu ni interaction navigateur réussie n’est revendiquée.

Neuf scénarios restent donc **Non exécuté** dans le classeur : clavier, tactile, manette physique, parcours sauvegardes, campagne complète/fins, PWA hors ligne, visuel, audio/accessibilité et performance matérielle. La PR est livrée en **brouillon** pour rendre le travail révisable sans confondre les tests de code avec la recette exigée avant publication du jeu.

La suite recommandée est : terminer cette recette et corriger ses résultats ; stabiliser la mise à jour PWA ; retravailler un chapitre représentatif avec architecture, repères et props à la bonne échelle ; appliquer le langage visuel validé aux autres chapitres ; équilibrer ensuite la campagne avec des parcours humains contrastés. Les extensions d’assets et de contenu restent ouvertes dans le registre.
