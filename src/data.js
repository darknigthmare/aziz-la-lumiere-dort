(function(root,factory){const data=factory();if(typeof module==='object'&&module.exports)module.exports=data;if(root)root.AZIZ_DATA=data;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='1.2.0';
  const DIFFICULTIES={
    exploration:{name:'Exploration',description:'Indices précoces, ressources généreuses et pression progressive.',enemySpeed:.72,enemySense:.78,damage:.58,wake:.68,battery:.7,director:.72,resourceGain:1.28,checkpointRecovery:1,hints:true},
    expedition:{name:'Expédition',description:'Équilibre recommandé entre enquête, lumière et survie.',enemySpeed:1,enemySense:1,damage:1,wake:1,battery:1,director:1,resourceGain:1,checkpointRecovery:.72,hints:true},
    eclipse:{name:'Éclipse',description:'Présences attentives, faisceau instable et ressources comptées.',enemySpeed:1.2,enemySense:1.22,damage:1.32,wake:1.28,battery:1.22,director:1.25,resourceGain:.72,checkpointRecovery:.45,hints:false}
  };
  const THREATS={
    ushabti:{name:"Ouchebti",color:'#a88d64',speed:.62,sense:6.4,hearing:4,damage:8,health:45,light:25,behavior:'immobile sous le faisceau'},
    scarabs:{name:"Scarabées de l’éclipse",color:'#303333',speed:1.12,sense:7.2,hearing:5,damage:5,health:24,light:38,behavior:'draine la lampe et fuit la lampe portative'},
    jackal:{name:"Chacal du Seuil",color:'#73382c',speed:1.34,sense:4.4,hearing:12,damage:14,health:82,light:10,behavior:'remonte les bruits récents'},
    scribe:{name:"Scribe sans visage",color:'#d6cbb3',speed:.76,sense:8.2,hearing:3,damage:10,health:58,light:18,behavior:'avance seulement dans les angles morts'},
    veiled:{name:"Enfant sous le voile",color:'#d9d5cc',speed:.58,sense:7.4,hearing:7,damage:7,health:42,light:28,behavior:'imite Aziz et exige le contre-signal'},
    pharaoh:{name:"Pharaon sans Aube",color:'#bd7145',speed:.7,sense:12,hearing:12,damage:20,health:240,light:14,behavior:'invulnérable avant les miroirs'}
  };
  const ARCHIVES=[
    ['registre','Le registre de l’expédition','Dix-neuf porteurs sont entrés dans la vallée. Le registre n’en prévoit que dix-huit au retour.'],
    ['cuivre','Le disque de cuivre','Le soleil gravé possède un centre mobile. Une ombre y tourne à rebours.'],
    ['aziz-lettre','Lettre du contremaître','Aziz garde la lampe depuis trois nuits. Un enfant lui parle depuis la lentille.'],
    ['trois-signaux','La règle des trois signaux','Soleil. Silence. Soleil. La lumière véritable ne répond jamais deux fois pareil.'],
    ['lentille','La lentille fêlée','Le verre conserve une chaleur humaine malgré un siècle sous terre.'],
    ['reflet','Le reflet absent','Le relevé montre quatre explorateurs. Le miroir n’en rend que trois.'],
    ['nom-raye','Le nom rayé','Le souverain fut privé de nom afin qu’aucun dieu ne le reconnaisse au matin.'],
    ['conduit-sept','Conduit numéro sept','Toute phrase criée revient avec une syllabe supplémentaire. La gravure ordonne les pierres : Soleil, Souffle, Silence. Le code du projecteur est un autre rituel.'],
    ['scribe','L’encre du Scribe','Les signes disparaissent lorsque personne ne les regarde.'],
    ['cerf-volant','Le cerf-volant rouge','Aziz se rappelle une cour, du vent et une ficelle coupée.'],
    ['chambre-retournee','La chambre retournée','Le plafond reproduit le temple, sauf une porte qui n’existe pas.'],
    ['berceuse','La berceuse sans bouche','La mélodie s’interrompt chaque fois qu’Aziz ouvre les yeux.'],
    ['cinq-pas','Les cinq pas','I, III, V, II, IV. Le soleil ne se lève pas en ligne droite sous terre.'],
    ['masque','Le masque fendu','L’intérieur du masque porte les traits d’un enfant endormi.'],
    ['pylones','Les pylônes d’aube','Chaque erreur offre au palais une minute de nuit supplémentaire.'],
    ['decret','Le décret sans aube','Que sa tombe ne voie ni Rê, ni lune, ni feu.'],
    ['derniere-page','Dernière page','Quand Aziz répond trop vite, n’obéissez pas. Écoutez le rythme.'],
    ['contre-jour','Le contre-jour','Une lumière assez vive peut cacher mieux que l’obscurité.']
  ].map((a,i)=>({id:a[0],chapter:Math.floor(i/3),title:a[1],text:a[2]}));
  const ACHIEVEMENTS=[
    ['premiere_lumiere','Première lumière','Envoyer votre premier signal.'],['sans_cri','À voix basse','Finir un chapitre sans appeler Aziz.'],
    ['intouchable','Aucune main sur vous','Finir un chapitre sans dégâts.'],['angle_parfait','Angle parfait','Aligner tous les miroirs sans erreur.'],
    ['sans_flash','À l’ancienne','Finir un chapitre sans flash.'],['archiviste','Archiviste de l’aube','Trouver les 18 archives.'],
    ['confiance','Je te crois','Atteindre 80 de confiance.'],['aube','L’Aube véritable','Obtenir la meilleure fin.'],
    ['quatre_fins','Quatre visages','Découvrir les quatre fins.'],['eclipse','Sous l’éclipse','Terminer en difficulté Éclipse.'],
    ['survivant','Encore debout','Survivre avec moins de 10 santé.'],['veille','Reste avec moi','Réanimer Aziz à trois reprises.'],
    ['cartographe','Sous chaque pierre','Visiter les six chapitres.'],['miroir','Soleil — Silence — Soleil','Utiliser le signal dix fois.'],
    ['collection','Mémoire intacte','Importer une sauvegarde valide.'],['fin_campagne','La lumière dort','Terminer la campagne.']
  ].map(a=>({id:a[0],title:a[1],description:a[2]}));
  const ENDINGS={
    true_dawn:{title:"L’Aube véritable",text:"Le code silencieux traverse la poussière. Aziz répond avec le rythme convenu. Les miroirs rendent au pharaon son absence et vous remontez ensemble vers un matin pâle."},
    guardian:{title:'Le Gardien',text:"Vous maintenez le dernier miroir tandis qu’Aziz remonte. Bien plus tard, une lampe s’allume encore sous le sable lorsqu’on prononce votre nom."},
    false_light:{title:'La Fausse lumière',text:"Vous choisissez le faisceau le plus éclatant. Aziz vous attend dehors, souriant, mais son ombre reste dans le temple."},
    eternal_sleep:{title:'Le Sommeil éternel',text:"Aziz s’endort avant le dernier signal. Une lumière noire donne au pharaon une silhouette d’enfant. L’expédition ne ressort jamais."}
  };
  const CHAPTER_SPECS=[
    {id:'noms',title:'I. La Chambre des noms',objective:'Charger les deux sceaux solaires',target:2,kind:'seal',interactives:15,enemies:['ushabti','ushabti','scarabs'],mechanic:'channel',hint:'Placez le projecteur en mode Focalisé, puis restez près du sceau pendant sa charge.',intro:'Gizeh, novembre 1926. La porte s’est refermée. Au-dessus, Aziz tient encore la manivelle du projecteur.',objectiveLabels:['Sceau du levant','Sceau du couchant'],inscriptions:['Dix-neuf ombres ont franchi le seuil.','Le disque central tourne à rebours.']},
    {id:'miroirs',title:'II. La Galerie des miroirs',objective:'Aligner les quatre miroirs de l’aube',target:4,kind:'mirror',interactives:15,enemies:['ushabti','scarabs','jackal'],mechanic:'align',targets:[2,0,3,1],hint:'Le Balayage révèle l’orientation; le mode Focalisé fait pivoter le cuivre.',intro:'Le temple détourne la lumière dans une galerie de cuivre noirci.',objectiveLabels:['Miroir du chacal','Miroir du roseau','Miroir du scarabée','Miroir de l’ibis'],inscriptions:['Le roseau cherche le nord ; chaque reflet garde sa direction.','Quatre visages, une seule aube.']},
    {id:'voix',title:'III. Le Puits des voix',objective:'Sceller les trois pierres dans le bon rythme',target:3,kind:'echo',interactives:15,enemies:['scarabs','jackal','scribe'],mechanic:'sequence',sequence:[2,0,1],hint:'La gravure ordonne les pierres : Soleil, Souffle, Silence.',intro:'Chaque mot remonte des conduits avec une syllabe étrangère.',objectiveLabels:['Pierre du souffle','Pierre du silence','Pierre du soleil'],inscriptions:['Le soleil ouvre la voie. Le souffle le suit ; le silence la referme.','Écoutez le vide entre deux syllabes.']},
    {id:'dormeurs',title:'IV. La Chambre des dormeurs',objective:'Rendre quatre souvenirs à Aziz',target:4,kind:'memory',interactives:15,enemies:['ushabti','scribe','veiled'],mechanic:'response',hint:'Révélez un souvenir en Balayage, puis appelez Aziz avant que l’écho ne le déforme.',intro:'Aziz ne répond plus. Le temple a retourné ses souvenirs contre lui.',objectiveLabels:['La cour au jasmin','Le cerf-volant rouge','La voix de sa mère','La première lampe'],inscriptions:['Un souvenir reconnu ne peut plus mentir.','Ne répondez jamais à la voix sans souffle.']},
    {id:'palais',title:'V. Le Palais sous le soleil',objective:'Activer les cinq pylônes dans l’ordre',target:5,kind:'pylon',interactives:15,enemies:['jackal','scribe','veiled','scarabs'],mechanic:'sequence',sequence:[0,2,4,1,3],hint:'L’ordre du relevé est I, III, V, II, IV. Une erreur réveille tout le palais.',intro:'Cinq pylônes attendent les pas I, III, V, II, IV.',objectiveLabels:['Pylône I','Pylône II','Pylône III','Pylône IV','Pylône V'],inscriptions:['Le soleil souterrain ne se lève pas en ligne droite.','Chaque faute offre une minute à la nuit.']},
    {id:'trone',title:"VI. Le Trône de l’aube absente",objective:'Aligner les quatre miroirs et bannir le Pharaon',target:4,kind:'finalMirror',interactives:14,enemies:['ushabti','jackal','scribe','veiled','pharaoh'],mechanic:'align',targets:[1,3,0,2],hint:'Seul un lien stable en mode Focalisé peut ouvrir les quatre contre-jours.',intro:'Le souverain interdit attend dans une salle qui n’a jamais vu le soleil.',objectiveLabels:['Contre-jour d’est','Contre-jour d’ouest','Contre-jour du ciel','Contre-jour du nom'],inscriptions:['Le roi sans nom ne possède aucune ombre.','La lumière la plus vive sait aussi mentir.'],finale:true}
  ];

  function rng(seed){let s=seed>>>0;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
  function shuffle(values,random){for(let i=values.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[values[i],values[j]]=[values[j],values[i]];}return values;}
  function reachableCells(grid,start){
    const h=grid.length,w=grid[0].length,seen=new Set(),queue=[[Math.floor(start.x),Math.floor(start.y)]],cells=[];
    while(queue.length){const [x,y]=queue.shift(),key=`${x}:${y}`;if(seen.has(key)||x<1||y<1||x>=w-1||y>=h-1||grid[y][x]!==0)continue;seen.add(key);cells.push({x:x+.5,y:y+.5});queue.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);}
    return cells;
  }
  function buildChapter(spec,index){
    const random=rng(0xa211ce+index*739),w=23+(index%3)*2,h=23+(index%2)*2;
    const grid=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>(x===0||y===0||x===w-1||y===h-1)?1:0));
    for(let y=2;y<h-2;y+=2)for(let x=2;x<w-2;x++)if(random()>.32)grid[y][x]=1;
    for(let x=3;x<w-3;x+=4)for(let y=1;y<h-1;y++)if(random()>.72)grid[y][x]=1;
    for(let y=1;y<h-1;y++)grid[y][1]=0;for(let x=1;x<w-1;x++)grid[h-2][x]=0;
    for(let y=3;y<h-3;y+=4)for(let x=1;x<w-1;x++)grid[y][x]=0;
    for(let x=5;x<w-3;x+=6)for(let y=1;y<h-1;y++)grid[y][x]=0;
    const start={x:1.5,y:1.5,a:0},exit={x:w-2.5,y:h-1.5};
    const cells=shuffle(reachableCells(grid,start).filter(cell=>Math.hypot(cell.x-start.x,cell.y-start.y)>4&&Math.hypot(cell.x-exit.x,cell.y-exit.y)>1.4),random);
    let cursor=0;const take=()=>cells[cursor++%cells.length];
    const objects=[];
    for(let i=0;i<spec.target;i++){
      const targetOrientation=spec.targets?.[i]??0;
      const orientation=(targetOrientation+1+Math.floor(random()*3))%4;
      objects.push({...take(),type:spec.kind,id:`${spec.id}-objective-${i+1}`,label:spec.objectiveLabels?.[i]||'Mécanisme solaire',sequenceSlot:i,targetOrientation,orientation,progress:0,attempts:0});
    }
    ARCHIVES.filter(a=>a.chapter===index).forEach(a=>objects.push({...take(),type:'archive',id:a.id,label:a.title,archive:a}));
    const fixed=objects.length;const fillers=['oil','flash','bell','inscription','door'];
    for(let i=fixed;i<spec.interactives;i++){
      const type=fillers[(i-fixed)%fillers.length],flavorIndex=(i-fixed)%spec.inscriptions.length;
      objects.push({...take(),type,id:`${spec.id}-${type}-${i}`,label:{oil:'Bidon d’huile minérale',flash:'Plaque de magnésium',bell:'Cloche solaire',inscription:'Inscription relevée',door:'Seuil de repos'}[type],text:spec.inscriptions[flavorIndex],used:false});
    }
    const enemies=spec.enemies.map((type,i)=>({...take(),type,id:`${spec.id}-${type}-${i}`,health:THREATS[type].health,stun:0,alert:0,memory:0,state:'dormant',alive:true}));
    return {...spec,index,w,h,grid,objects,enemies,start,exit};
  }
  const CHAPTERS=CHAPTER_SPECS.map(buildChapter);
  const totalInteractives=CHAPTERS.reduce((n,c)=>n+c.objects.length,0);
  return Object.freeze({VERSION,DIFFICULTIES,THREATS,ARCHIVES,ACHIEVEMENTS,ENDINGS,CHAPTERS,totalInteractives});
});
