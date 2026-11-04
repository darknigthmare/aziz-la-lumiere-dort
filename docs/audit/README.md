# AZIZ — Audit et intégration du 4 novembre 2026

## Résultat et périmètre

Le registre unique suit **72 actions** du dépôt **darknigthmare/aziz-la-lumiere-dort**, à partir du commit audité **66c8efe0f309c1aeaf64673141467aea2e1d774c**. Cette livraison poursuit ce registre : elle ne recommence pas l’audit.

La [PR #1](https://github.com/darknigthmare/aziz-la-lumiere-dort/pull/1) a été fusionnée dans `main` au commit **4b2c555a2a7704a37d5defffb2f20982bff516fe**. Son déploiement de production a été observé **READY** par l’API Vercel, sur l’alias du jeu. Le présent lot ajoute les corrections décrites ci-dessous, avec **131 tests réussis** et la révision publique **`r6-89a7e3853e1b`**. Les SHA, checks distants et état de production après fusion de ce lot sont consignés dans sa PR de livraison.

Le contrat de l’**édition reconstruite v1.2.0** reste conservé : **6 chapitres, 89 interactifs, 6 familles de menaces, 18 archives, 16 succès, 4 fins et 3 difficultés**. Les archives historiques 4.x n’ont pas été récupérées.

Le livrable central est [AZIZ_Audit_Complet_2026-11-04.xlsx](AZIZ_Audit_Complet_2026-11-04.xlsx), généré depuis [audit-register.json](audit-register.json). Les trois onglets conservent la synthèse calculée, le registre filtrable et les parcours QA. Les constats et sources de la base restent séparés des modifications et vérifications de la livraison.

| État du suivi | Lignes | Portée |
|---|---:|---|
| Corrigé et vérifié | 23 | Règles ciblées exécutées avec succès dans Node/VM ; aucune validation matérielle implicite |
| Implémenté — recette visuelle restante | 29 | Code intégré et contrôles automatisés ; lecture, confort ou parcours réel encore à valider |
| Partiellement implémenté | 3 | Une partie livrée, suite explicitement décrite |
| À planifier | 17 | Chantier ouvert |
| **Total** | **72** | Aucun pourcentage de complétude globale du jeu n’est calculé |

La nature des actions reste **24 corrections, 33 améliorations et 15 ajouts** ; les priorités restent **25 P1, 44 P2 et 3 P3**. Les efforts du registre sont des estimations, pas des délais garantis.

## Changements du lot d’intégration

### Progression, sauvegardes et fins

**GP-011/012/013/016/017/018.** Les objectifs, réponses reconnues et chapitres terminés sont suivis par identifiants uniques. Les tentatives restent séparées. Un décès ou un retour manuel au checkpoint restaure le monde, tout en conservant les événements, actions cumulées, statistiques du chapitre, difficulté et temps total. Rejouer le même souvenir ne crée pas une deuxième réponse pour la fin.

Le succès Éclipse exige une campagne depuis le premier chapitre, jouée sans baisse de difficulté, avec les six sorties validées. Le dernier chapitre est compté avant le bilan. Le résumé de reprise et la fin utilisent la durée cumulée, distincte de l’horloge locale. Une lampe éteinte volontairement reste éteinte après transition ; une lampe vidée se rallume avec le ravitaillement.

Les anciennes sauvegardes restent chargeables. La migration reconstitue uniquement les événements prouvés ; elle n’invente ni temps historique manquant ni certification Éclipse. Un historique partiel de réponses conserve désormais les souvenirs déjà prouvés par les objectifs validés.

### Souvenirs, faux Aziz et poursuites

**GP-009/010/014/015.** Le souvenir reste ancré à moins de 1,65 unité, avec ligne de vue et faisceau Balayage valides jusqu’à la réponse. Une rupture annule la fenêtre sans validation ni sanction d’expiration.

La Voilée possède trois issues distinctes : appel avec une seule pénalité, contre-signal avec recul et récompense unique, silence sans sanction ni récompense. Le faux appel demande une source active, une distance inférieure à 3,4 et une ligne de vue libre. Une source morte ne peut plus être consommée au début de la frame suivante.

Les poursuites utilisent des routes cardinales autour des obstacles, avec corps de rayon 0,18, dernière destination connue sauvegardée et réutilisation des routes. La recherche est bornée à 768 cases, deux recherches par frame et un intervalle de 650 ms par menace. Les règles du regard et de la lumière restent prioritaires ; les scarabées conservent leur fuite locale lorsque leur cible projetée sort de la carte. Ce budget algorithmique ne constitue pas une mesure de performance mobile.

### Interface, commandes et carnet

**WD-021/023/024/030/039/040.** Les 14 actions clavier sont centralisées et remappables, avec refus des conflits et touches réservées. Les flèches gauche/droite tournent le regard. Les indications suivent le périphérique réellement utilisé, sans être capturées par une manette simplement branchée.

La course tactile dispose de modes bascule/maintien, taille et côté réglables. Joystick, regard et action ont des contacts indépendants ; la pause les libère. La collection sépare Archives/Succès/Fins, avec filtres, pagination et conditions publiques. Les fins inconnues restent masquées. Le carnet conserve les inscriptions lues, orientations révélées, mécanismes et archives, ainsi que le dernier message. Le prologue explique les trois difficultés avant lancement.

### Palais, props et équipement tenu

**WD-006.** Les pylônes suivent désormais une boucle dans les couloirs existants, avec grille, identifiants et ordre rituel inchangés. Le trajet minimal mesuré passe de **133 à 57 cases** ; le retour au premier pylône après erreur passe de **27 à 12**. Le [plan comparatif](palais-route.svg) et les [parcours calculés](palais-route.json) rendent cette décision vérifiable. Ce ne sont pas des durées de partie ni une preuve d’équilibrage humain.

**WD-008/010/011/013/016.** Le module Canvas natif `visuals.js` donne des silhouettes distinctes aux familles de props, des dimensions et des appuis au sol. Huile et magnésium se distinguent par géométrie ; les miroirs ont support fixe, aiguille mobile et cible visible après révélation. Les mécanismes validés portent aussi une coche ; certains états actifs et désalignés disposent de formes spécifiques. Le choix de fonctions Canvas regroupées remplace la proposition de fichiers bitmap individuels, comme expliqué dans [RENDERING.md](../RENDERING.md).

Le passage existe fermé avant déverrouillage. Le HUD proche indique sa destination, les mécanismes et archives ; la porte finale reste fermée tant que le Pharaon vit. Une lampe, une main et un boîtier de signal sont dessinés au premier plan, ancrés au viewport indépendamment de la caméra et du temps. Le rendu conserve les masques d’occlusion de WD-045.

### Audio, accessibilité et hors ligne

**WD-018/025/031/032/041.** Luminosité bornée et mire locale, flashs réduits avec témoins localisés, clignotement HUD supprimé dans ce mode, volumes séparés et préécoute en pause sont reliés au profil. La synthèse sélectionne seulement une voix française locale disponible. Son repli écrit possède sa propre zone : une erreur tardive ne remplace pas un nouvel indice ni une note du carnet.

Les signaux de menace dérivent d’un ennemi proche, de sa position et d’un obstacle éventuel. L’ambiance est identifiée sans fausse direction d’ennemi. **WD-032 reste partiel** : signatures de matériaux et acoustique de zones restent à produire.

**WD-037/044.** Le worker vérifie une génération complète par SHA-256 et attend la fermeture des anciens onglets. HTML et scripts contrôlés restent issus de la même génération. Une ressource manquante peut être réparée uniquement avec les octets attendus ; réseau, quota ou mauvaise empreinte donnent une erreur explicite sans détruire les autres ressources. La révision est affichée dans le jeu et l’export JSON, sans changer v1.2.0.

**RT-008 reste partiel.** Le [registre des assets](../ASSETS.md) et son manifeste listent les six fichiers, tailles, empreintes et provenances connues. Attribution manquante, chaîne des icônes PNG et décision de licence restent ouvertes ; aucune licence n’est choisie implicitement.

## Vérification et revues

| Vérification | Résultat | Preuve |
|---|---|---|
| Suite complète du lot intégré | **131/131**, zéro échec et zéro ignoré | [validation-node.txt](validation-node.txt) |
| Build public | **13 références**, 14 fichiers au précache, dont `visuals.js` | [validation-build.txt](validation-build.txt) |
| Révision testée | **r6-89a7e3853e1b** | [integration-validation.json](integration-validation.json), empreintes des sources |
| Progression et défis | 23 tests | `tests/progression.test.mjs`, `tests/challenges.test.mjs` |
| Navigation | 11 tests, dont L/U avec vrai bruit et mémoire nominale | `tests/navigation.test.mjs` |
| Interface et commandes | 11 tests | `tests/interface.test.mjs` |
| Rendu | 21 tests de calculs et commandes Canvas | `tests/rendering.test.mjs` |
| Audio et direction | 12 tests | `tests/audio.test.mjs`, `tests/spatial-audio.test.mjs` |
| Cache et serveur | 12 tests worker, 1 test serveur | Suites correspondantes |
| Classeur | 72 lignes, 22 scénarios QA, formules recalculées et totaux indépendamment contrôlés | Générateur et registre JSON |

Les revues croisées ont reproduit puis corrigé l’écrasement tardif d’un indice par la voix, l’absence de réparation d’un cache incomplet, le défi d’une Voilée morte, la perte de réponse lors d’un import partiel, l’ouverture visuelle prématurée du passage final et le clignotement HUD résiduel. La fuite des scarabées a également reçu un scénario de non-régression dédié.

Les preuves du premier lot restent historiques : 47 tests passaient avant sa fusion ; 26 tests ciblés runtime/rendu avaient produit 4 réussites et 22 échecs sur la base, puis 26 réussites sur le correctif. [validation-baseline-runtime.txt](validation-baseline-runtime.txt) et la PR #1 conservent ce contexte. Les quatre invariants déjà verts ne sont pas présentés comme de nouveaux défauts.

## Guides IA effectivement employés

Le [plan d’intégration](integration-plan.md) applique les guides référencés dans `.ai-tools/README.md` : modèles Spec Kit de spécification/plan/tâches, et pratiques Superpowers de délégation parallèle, diagnostic à partir de reproductions et vérification avant conclusion. Trois domaines ont été confiés à des agents dans des worktrees isolés, puis rapprochés et relus.

Le diagnostic a confirmé git, uvx et Codex disponibles ; Claude Code et les intégrations locales correspondantes ne l’étaient pas. Les références épinglées ont été consultées ; aucun plugin absent ni exécution de Claude Code Game Studios n’est revendiqué.

## Recette restante et suite

**Neuf scénarios navigateur/matériel restent Non exécuté.** Le lancement local de Chromium avait échoué avec `EPERM`, le navigateur distant avait refusé `file://`, puis la revue automatique avait refusé l’ouverture du déploiement Vercel comme contournement. Aucun contournement n’a été effectué. L’utilisateur a ensuite demandé explicitement l’intégration des corrections ; ce suivi conserve les limites au lieu de transformer les tests de code en recette humaine.

Les tests VM emploient des méthodes réelles et des dépendances simulées. Ils ne valident pas les pixels, une campagne jouée, l’écoute, la manette physique, le confort tactile, la migration PWA réelle ou les performances du matériel. L’état **READY** d’un déploiement prouve la livraison de l’artefact, pas ces parcours.

Les 17 chantiers encore à planifier couvrent notamment l’architecture propre à chaque chapitre, la lumière réfléchie visible, la mise en scène du puits et des souvenirs, l’arène finale, les décors modulaires, l’animation des intentions, l’explication diégétique du faisceau, les budgets de performance, l’économie de lumière et les recettes humaines. Le registre conserve pour chacun critères, dépendances et effort estimé.

```bash
npm run release:prepare
npm test
npm run build
node docs/audit/measure-palais.mjs
```

Après une modification publique, versionner les fichiers générés `src/release.js` et `sw.js`. Pour recevoir le nouveau lot, sauvegarder, fermer tous les onglets/fenêtres AZIZ puis rouvrir le jeu. Cette fermeture est aussi nécessaire lors de la première migration depuis l’ancien cache r5. Le workflow GitHub **Vérifier AZIZ** relance les gates sur la PR.
