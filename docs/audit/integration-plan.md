# Intégration et suite de l’audit — 4 novembre 2026

## Demande et suivi unique

Intégrer les correctifs de la PR #1 dans le jeu, poursuivre les lignes ouvertes de `audit-register.json` et employer les guides IA référencés par `.ai-tools/README.md`. Le registre de 72 actions reste la source du suivi ; ce document est le plan d’exécution du lot, pas un second audit.

## Spécification du lot

- US1 / P1 : le joueur reçoit les corrections déjà testées depuis la branche principale ; le commit, les checks et le déploiement sont identifiés.
- US2 / P1 : une sauvegarde et un bilan reflètent la durée cumulée, les objectifs uniques, les chapitres achevés et la difficulté réellement jouée. Un décès ne fait pas disparaître silencieusement les événements de campagne.
- US3 / P2 : les ennemis poursuivent autour des murs ; les souvenirs et le contre-signal ont des règles spatiales cohérentes.
- US4 / P2 : le joueur consulte ses indices et sa collection, choisit la difficulté avant de partir et dispose de commandes clavier/tactiles plus complètes.
- US5 / P2 : les props possèdent des silhouettes et ancrages cohérents, la sortie se voit avant de s’ouvrir et l’équipement tenu reste stable en vue subjective.
- US6 / P1 : une génération complète du jeu est installée hors ligne sans mélanger les fichiers d’anciennes et nouvelles versions ; un identifiant de révision visible permet de reconnaître le lot.

### Invariants et cas limites

Préserver v1.2.0, les six chapitres, les 89 interactifs, les 18 archives, les 16 succès, les quatre fins, les trois difficultés, les identifiants et la compatibilité des sauvegardes. Aucun fichier distant requis pour jouer. Vérifier imports anciens/incomplets, décès et reprise, répétition d’une séquence, changement de difficulté, obstacle sans chemin, menu pendant une entrée maintenue et interruption d’une installation PWA.

## Plan technique

JavaScript sans framework, Canvas 2D, localStorage, service worker ; vérification Node native et VM existante. Trois travaux indépendants dans des worktrees isolés : progression/IA, interface/commandes et représentation du monde. Le coordinateur prend le cache, la traçabilité, l’intégration, le registre Excel et la diffusion. Les modifications de `game.js` seront relues et rapprochées avant la validation finale.

Les améliorations artistiques ou géométriques non validées visuellement gardent un statut de recette restante. Aucun test VM ne sera présenté comme une campagne jouée dans un navigateur. Les refus de navigateur déjà rencontrés ne seront pas contournés.

## Tâches

- [x] T01 Relire les instructions, les références IA et vérifier l’état distant de la PR #1.
- [x] T02 Refaire tests/build du lot précédent puis intégrer la PR #1 avec son SHA attendu.
- [x] T03 [P] Progression, statistiques, difficulté et navigation IA : GP-009 à GP-018 selon preuves et critères du registre.
- [x] T04 [P] Collection, carnet, difficulté initiale et commandes : WD-021, WD-023, WD-024, WD-030, WD-039, WD-040.
- [x] T05 [P] Props, sortie et équipement tenu : WD-008, WD-010, WD-011, WD-013, WD-016.
- [x] T06 Cache atomique, révision de build et traçabilité : WD-037, WD-044, RT-008.
- [x] T07 Relire les modifications des agents, vérifier les régressions, tests et build complets.
- [x] T08 Actualiser le registre, l’Excel et les preuves sans fermer les recettes non exécutées.
- [ ] T09 Livrer et intégrer le nouveau lot avec checks distants et état de déploiement observé.

## État de livraison du plan

T01–T08 sont clos pour ce lot : 131 tests réussis, build public de 13 références, manifeste de 14 fichiers et révision `r6-89a7e3853e1b`. Les recettes navigateur/matériel restent ouvertes dans le registre. T09 est une opération postérieure au commit de ces preuves : sa confirmation et le déploiement de production sont consignés dans la PR de livraison et le compte rendu final.

La réalisation a aussi couvert WD-006 (circuit Palais), WD-018/025 (luminosité et flashs), WD-031/032/041 (audio), puis les défauts reproduits pendant les revues croisées. RT-008 conserve la décision de licence et les provenances manquantes comme travail ouvert.

## Guides effectivement consultés

Les plugins ne sont pas annoncés comme installés. Diagnostic local : git, uvx et codex présents ; Claude Code absent ; intégrations Spec Kit et Game Studios absentes.

- Spec Kit, commit `34a0d388eac671d656eb05b125ad3ed6056168ed` : modèles `templates/spec-template.md`, `templates/plan-template.md`, `templates/tasks-template.md` ; adaptation du cadrage, des scénarios et des tâches à ce suivi existant.
- Superpowers, commit `22f0b463e7a5e579904dd6211a520321035526f7` : `dispatching-parallel-agents`, `systematic-debugging`, `verification-before-completion` ; recherche de cause avant correction, domaines isolés, preuve fraîche avant déclaration de réussite.
- Claude Code Game Studios reste une intégration destinée aux sessions Claude Code ; les agents de cette session exécutent les tâches spécialisées avec les contrats du dépôt.

## Critères de livraison

Suite complète verte, build public cohérent, diff sans erreur, relecture indépendante, arbre Git distant identique au lot vérifié, statuts Excel justifiés et limites de recette explicites. L’intégration dans main est demandée par l’utilisateur ; les validations matérielles non disponibles restent visibles et ne sont pas transformées en réussites.
