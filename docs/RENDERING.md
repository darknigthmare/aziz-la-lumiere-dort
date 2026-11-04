# Rendu Canvas — accessoires et ancrages

Ce lot conserve le moteur Canvas2D, les cartes, les identifiants de contenu, la
version 1.2.0 et les données de sauvegarde. `src/visuals.js` est chargé avant
`src/game.js`. Il contient la géométrie native, son manifeste de dimensions et les
fonctions `drawProp` / `drawViewmodel`. Aucun bitmap, modèle externe, bibliothèque
ou téléchargement n'est nécessaire.

## Choix de représentation

Les accessoires sont des silhouettes procédurales regroupées dans un module,
avec une branche explicite par famille dans `drawProp`. Ce choix remplace la
proposition d'un fichier image par accessoire de WD-010 : les formes, dimensions,
matériaux et états restent modifiables et testables dans le moteur existant. Les
palettes et primitives communes sont partagées ; il n'y a pas d'images artificielles
produites seulement pour satisfaire une convention de nommage.

| Famille | Représentation | Largeur × hauteur, en cases |
| --- | --- | --- |
| Huile | Bidon ambré, bouchon, anse et goutte | 0,20 × 0,29 |
| Magnésium | Plaque de métal froid, angles coupés et nervures | 0,28 × 0,11 |
| Archive | Folio ouvert avec reliure | 0,28 × 0,28 |
| Sceau | Disque octogonal sur stèle | 0,42 × 0,64 |
| Miroir | Disque elliptique sur pied | 0,48 × 0,84 |
| Écho | Trois résonateurs tubulaires | 0,58 × 0,58 |
| Souvenir | Portrait encastré dans une stèle | 0,46 × 0,68 |
| Pylône | Obélisque à trois chevrons | 0,42 × 1,02 |
| Miroir final | Disque à montants et couronne | 0,70 × 1,04 |
| Cloche | Corps évasé, anneau et battant | 0,38 × 0,48 |
| Seuil | Encadrement en pierre | 0,76 × 1,10 |
| Inscription | Tablette dressée sur socle | 0,60 × 0,50 |
| Sortie | Passage à linteau et seuil | 0,88 × 1,16 |

Ces valeurs définissent les enveloppes nominales des silhouettes, pas des
mesures archéologiques. Le pivot est en bas, le support est le sol et le décalage
vertical vaut zéro. Les objets déjà utilisés gardent leur support ; les archives,
huiles et plaques ramassées disparaissent comme auparavant.

## Perspective et visibilité

La focale est `largeur / (2 × tan(FOV / 2))`. Murs et accessoires utilisent ce
même plan image et la profondeur perpendiculaire à la caméra. Les rayons passent
par le centre des colonnes. La hauteur des murs vaut 1,20 case et la hauteur
d'œil 0,65 case. Le pied d'un objet est projeté à
`horizon + hauteur_œil × focale / profondeur`.

Les dimensions ne sont plus uniformes ni plafonnées selon la hauteur d'écran.
Un plan proche de 0,06 case élimine les projections derrière la caméra et les
singularités. Le tri et les masques par colonnes de WD-045 sont conservés : la
partie d'un objet cachée par un mur reste exclue. Les anciennes silhouettes des
menaces reçoivent également une échelle et un pivot au sol ; leur comportement
et leurs collisions ne changent pas.

## États réellement représentés

- La sortie existe avant le déverrouillage : panneau et barres fermés, puis
  ouverture sombre, liseré clair et flèche. Son repère textuel de destination et
  son déclenchement appartiennent au moteur/HUD et ne sont pas ajoutés par ce module.
- Les objectifs accessibles ou insuffisamment liés gardent leurs deux teintes
  d'accent. Un objectif validé reçoit aussi une coche, indépendante de la couleur.
- Le support et les quatre repères d'un miroir restent fixes. Seule son aiguille
  tourne. La direction cible reçoit un point après `revealed`, jamais avant.
  Un miroir essayé mais encore désaligné porte une croix discrète.
- Une canalisation en cours reçoit des crochets fixes et une jauge sur son socle.
  Un souvenir pendant le défi de réponse reçoit ces crochets et un portrait éclairci.
- Aucune erreur de séquence n'est inventée dans le rendu : le jeu ne conserve
  pas d'état individuel d'erreur pour ces objets. Le retour d'erreur existant
  reste assuré par le message de jeu et la remise à zéro de la séquence.

## Matériel tenu et accessibilité

Le modèle FPS associe manche, main, lampe et boîtier de signal au poignet. Sa
pose dépend seulement des dimensions du viewport ; elle ne dépend ni du FOV,
ni de l'angle du joueur, ni du temps, ni du tremblement du monde. Le réticule
reste libre. La lampe distingue allumage et batterie épuisée. Le boîtier montre
le mode du projecteur, l'état du lien et le signal en cours, sans ajouter une
commande ou modifier son délai.

`brightness` vaut 1 en l'absence de réglage et est borné localement entre 0,7 et
1,6. Le filtre s'applique au monde et au matériel, en conservant le contraste
renforcé. Le rendu n'écrit pas dans les options.

`reduceFlashes` supprime le flash de magnésium, le clignotement de lien faible et
le voile oscillant plein écran. Il conserve des témoins locaux fixes sur le
boîtier. La classe CSS `reduce-flashes` fige aussi le repère de lien du HUD.
Le magnésium n'a pas de modèle d'arme dédié : sa plaque est représentée
dans le monde et son utilisation par ce témoin. `flashTime`, l'étourdissement,
les dégâts, les délais et les défis ne sont pas modifiés. `reduceMotion` coupe
le tremblement et fige aussi le voile si les éclats restent autorisés.

## Vérification et limites

Les tests Node exécutent les méthodes de production avec un contexte Canvas
espion. Ils couvrent les régressions de sortie et d'occlusion, les géométries
distinctes, les états, les rapports de perspective, les appuis sur 320×568,
640×360, 1280×720 et 2560×1080 aux FOV 50°, 66° et 90°, la stabilité du matériel,
la luminosité et les effets réduits sans avance du temps de simulation.

Ces tests vérifient calculs et commandes de dessin ; ils ne mesurent pas les
pixels ni la lisibilité humaine. La recette visuelle reste ouverte pour WD-008,
WD-010, WD-011, WD-013, WD-016, WD-018 et WD-025 : reconnaissance en basse lumière,
contraste renforcé, états côte à côte, proportions ressenties en mouvement,
proximité des murs, recouvrement du HUD/tactile en portrait et confort des effets.
Aucun navigateur ni recette humaine n'a été exécuté pour ce lot.

Le build copie `src/`. Le manifeste généré du lot d'intégration inclut
`src/visuals.js` et son empreinte SHA-256 parmi les 14 fichiers du précache.
Le test de build vérifie l'égalité entre sources et artefact ; la stratégie
atomique du cache est décrite dans le rapport d'audit.
