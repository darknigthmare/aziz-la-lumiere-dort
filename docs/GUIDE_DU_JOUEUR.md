# Guide du joueur

## Menu et reprise

**Continuer** charge l’expédition décrite sur l’écran titre. **Campagne** propose une nouvelle expédition ou les chapitres débloqués. Rejouer un chapitre remplace la campagne active après confirmation ; une nouvelle expédition indique aussi ce remplacement avant de descendre dans le temple. La collection d’archives, succès et fins reste conservée.

Le menu **Pause** donne accès au journal, aux options, à la collection et aux sauvegardes. Les options sont regroupées en Image, Son, Accessibilité et Jeu et commandes. Fermer un panneau ouvert depuis Pause revient à Pause. **Sauvegarder et quitter** revient à l’écran titre.

Avant une nouvelle expédition, les trois difficultés sont expliquées : présence des directives, consommation de la lampe et dégâts reçus. Les réglages de confort sont accessibles avant de descendre. La **Collection** sépare archives, succès et fins, avec filtres découvert/manquant et filtre de chapitre pour les archives. Les conditions des succès publics sont lisibles ; les textes des fins inconnues restent cachés.

Le **Carnet des découvertes** conserve les inscriptions examinées, orientations réellement révélées, mécanismes actionnés et archives. Il indique aussi les états connus du chapitre actif et le dernier message reçu. Ces notes restent dans le profil et suivent l’export JSON. Une ancienne campagne récupère les inscriptions déjà lues dans son chapitre lors de la reprise.

## Le principe vital

Aziz contrôle le projecteur principal depuis la surface. Sa lumière suit votre regard, mais sa vigilance baisse en continu. `C` ou le clic droit transmet le code « Soleil — Silence — Soleil » et alterne entre trois ordres :

- **Balayage** : cône large pour révéler glyphes, pierres d’écho et souvenirs.
- **Focalisé** : cône étroit qui charge les sceaux, oriente les miroirs et brûle les présences.
- **Rempart** : protection large à courte portée, très fatigante pour Aziz.

Un appel avec `F` le réveille, mais le bruit porte loin et l’appel demande ensuite quelques secondes de récupération. Les cloches solaires sont à usage unique.

La confiance monte quand les signaux restent cohérents. La corruption progresse si Aziz dort. Les quatre fins dépendent de ces valeurs au moment d’atteindre le trône.

## Survivre

La lampe portative éclaire sans remplacer le projecteur et consomme de l’huile. Le flash au magnésium frappe uniquement les présences proches et visibles. Les ouchebtis s’arrêtent sous la lumière ; les scarabées drainent la lampe et fuient son cône ; le Chacal contourne les murs vers le dernier bruit ou la dernière position connue, puis abandonne une piste expirée ; le Scribe avance lorsqu’on ne le regarde plus ; l’Enfant voilé imite Aziz ; le Pharaon reste invulnérable jusqu’à la convergence finale.

La fausse voix ne traverse pas une cloison : elle se déclenche à moins de 3,4 cases d’une présence active et avec une ligne de vue libre, même si vous regardez ailleurs. Pendant son défi, **Appeler Aziz** inflige une seule pénalité, **Signal** repousse la présence et **ne pas répondre** conserve le silence sans sanction ni récompense. Une présence morte ne peut plus produire d’issue de défi. Les touches affichées suivent votre remappage.

Chaque chapitre possède trois archives. Le passage de sortie est visible fermé avant la résolution. En le regardant de près, vous voyez sa destination, les mécanismes accomplis et les archives retrouvées du chapitre. Il ne vous fait avancer qu’une fois déverrouillé et atteint. Dans le dernier chapitre, le Pharaon doit également être banni.

## Progression et sauvegarde

Un point de contrôle est créé au début de chaque chapitre et auprès des seuils sécurisés. La campagne est sauvegardée automatiquement. Confiance, corruption, vigilance, ressources, ennemis, orientations et séquences sont restaurés. Le menu Sauvegardes permet de copier ou télécharger le dossier JSON, puis de l’importer sur un autre navigateur. Le remplacement d’une campagne existante demande confirmation. Une importation valide revient au menu pour reprendre la campagne choisie ; un profil sans partie active reste valide et n’efface pas la campagne locale.

Si le navigateur refuse le stockage persistant, le jeu bascule sans planter vers une sauvegarde mémoire pour la session et affiche un avertissement. Exportez alors immédiatement le dossier JSON.

Le temps affiché dans la reprise et le bilan est le temps cumulé de campagne, sans les pauses. Un décès ou un retour manuel au point de contrôle remet le monde à cet état, tout en conservant les événements, tentatives et statistiques cumulés. Un objectif ou une réponse déjà reconnus ne comptent pas deux fois après une reprise. La lampe éteinte manuellement reste éteinte au chapitre suivant ; une lampe vidée se rallume après le ravitaillement.

Le succès **Éclipse** demande une campagne commencée au premier chapitre et jouée entièrement dans ce mode. Baisser la difficulté, même en pause, ou lancer directement un chapitre avancé ne remplit pas cette condition. Une ancienne sauvegarde reste chargeable, mais le jeu n’invente ni son temps antérieur non enregistré ni la preuve d’une campagne complète en Éclipse.

## Règles des chapitres

1. Charger deux sceaux en restant dans le faisceau Focalisé.
2. Révéler d’abord l’orientation de chaque miroir en Balayage, puis la reproduire en mode Focalisé. Une rotation aveugle invalide « Angle parfait ».
3. Sceller les pierres dans l’ordre **Soleil — Souffle — Silence**. Le code « Soleil — Silence — Soleil » sert à communiquer avec Aziz ; ce n’est pas la séquence des pierres.
4. Révéler chaque souvenir en Balayage, rester à moins de 1,65 case avec le faisceau dirigé sur lui et appeler Aziz avant sa déformation. Quitter la portée, détourner le regard, masquer la lumière ou changer de mode annule la fenêtre ; rapprochez-vous pour recommencer.
5. Activer les pylônes dans l’ordre I, III, V, II, IV. Leur circuit suit désormais une boucle composée dans les couloirs du Palais.
6. Converger les contre-jours puis maintenir le Pharaon dans la lumière.

## Accessibilité et mobile

Les options couvrent sous-titres, repères directionnels textuels, texte agrandi, contraste renforcé jusque dans le rendu Canvas, réduction des mouvements, FOV, sensibilité, qualité et volume. Couper les sous-titres ne masque pas les indices, inscriptions ou résultats d’action. Le tactile dispose de déplacement, regard, interaction, appel, signal, flash, lampe et pause. Le jeu reste zoomable au niveau du navigateur et adapte sa résolution sans déformer le Canvas. La recette sur téléphone réel et à 320 px reste à compléter pour le lot d’audit du 4 novembre 2026.

**Image** propose une mire de luminosité : distinguer à peine le soleil central et garder visible celui de droite. Le réglage affecte l’affichage, pas la portée des lumières. **Réduire les flashs lumineux** limite les variations de plein écran tout en conservant l’effet mécanique du magnésium et les informations utiles.

Dans **Son**, les effets, l’ambiance et la voix ont chacun leur volume, sous le volume général. La préécoute conserve la simulation en pause. La réduction de dynamique adoucit les écarts des sons procéduraux. Les voix facultatives utilisent uniquement une voix française locale disponible sur l’appareil ; si elle manque ou échoue, le texte restitue la réplique. Les craquements d’ambiance sont identifiés comme tels. Les indications de menace proviennent d’un ennemi proche, avec direction et atténuation lorsqu’un obstacle le sépare du joueur.

Dans **Jeu et commandes**, chaque action clavier peut être remappée ; les conflits sont signalés et les valeurs d’origine peuvent être rétablies. Les flèches gauche/droite tournent le regard par défaut. Sur téléphone, **COURIR** fonctionne en bascule ou en maintien, avec taille et côté des commandes réglables. Le joystick, la visée et une action peuvent employer des contacts différents. Une pause remet les contacts et la course à zéro.

Dans les menus, haut / bas déplace le focus. À la manette, gauche / droite règle un curseur ou une liste sélectionnée ; A / Croix valide et B / Rond revient. Au clavier, Tab parcourt les contrôles et Échap revient en arrière. Les réglages d’accessibilité restent accessibles pendant la pause.

## Mise à jour du jeu

Le pied de l’écran titre et les panneaux indiquent une révision `r6-…` en plus de v1.2.0. Lorsqu’une mise à jour est prête, sauvegardez, fermez tous les onglets et fenêtres AZIZ, puis rouvrez le jeu. Cette fermeture laisse le nouveau cache complet prendre la relève ; les sauvegardes restent conservées. Pour garder une copie indépendante, utilisez **Sauvegardes → Télécharger** avant la fermeture.
