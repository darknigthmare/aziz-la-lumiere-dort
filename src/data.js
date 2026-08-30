(function(root,factory){const data=factory();if(typeof module==='object'&&module.exports)module.exports=data;if(root)root.AZIZ_DATA=data;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='1.2.0';
  const DIFFICULTIES={
    exploration:{name:'Exploration',enemySpeed:.7,damage:.6,wake:.65,battery:.65},
    expedition:{name:'Expédition',enemySpeed:1,damage:1,wake:1,battery:1},
    eclipse:{name:'Éclipse',enemySpeed:1.24,damage:1.35,wake:1.35,battery:1.28}
  };
  const THREATS={
    ushabti:{name:"Ouchebti",color:'#a88d64',speed:.62,damage:8,health:45,light:25,behavior:'immobile sous le faisceau'},
    scarabs:{name:"Scarabées de l’éclipse",color:'#303333',speed:1.12,damage:5,health:24,light:38,behavior:'draine la lampe'},
    jackal:{name:"Chacal du Seuil",color:'#73382c',speed:1.34,damage:14,health:82,light:10,behavior:'chasse le bruit'},
    scribe:{name:"Scribe sans visage",color:'#d6cbb3',speed:.76,damage:10,health:58,light:18,behavior:'avance dans les angles morts'},
    veiled:{name:"Enfant sous le voile",color:'#d9d5cc',speed:.58,damage:7,health:42,light:28,behavior:'imite les appels'},
    pharaoh:{name:"Pharaon sans Aube",color:'#bd7145',speed:.7,damage:20,health:240,light:14,behavior:'invulnérable avant les miroirs'}
  };
  const ARCHIVES=[
    ['registre','Le registre de l’expédition','Dix-neuf porteurs sont entrés dans la vallée. Le registre n’en prévoit que dix-huit au retour.'],
    ['cuivre','Le disque de cuivre','Le soleil gravé possède un centre mobile. Une ombre y tourne à rebours.'],
    ['aziz-lettre','Lettre du contremaître','Aziz garde la lampe depuis trois nuits. Un enfant lui parle depuis la lentille.'],
    ['trois-signaux','La règle des trois signaux','Soleil. Silence. Soleil. La lumière véritable ne répond jamais deux fois pareil.'],
    ['lentille','La lentille fêlée','Le verre conserve une chaleur humaine malgré un siècle sous terre.'],
    ['reflet','Le reflet absent','Le relevé montre quatre explorateurs. Le miroir n’en rend que trois.'],
    ['nom-raye','Le nom rayé','Le souverain fut privé de nom afin qu’aucun dieu ne le reconnaisse au matin.'],
    ['conduit-sept','Conduit numéro sept','Toute phrase criée revient avec une syllabe supplémentaire.'],
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
    {id:'noms',title:'I. La Chambre des noms',objective:'Récupérer les deux sceaux solaires',target:2,kind:'seal',interactives:15,enemies:['ushabti','ushabti','scarabs'],intro:'La porte s’est refermée. Au-dessus, Aziz tient encore la manivelle du projecteur.'},
    {id:'miroirs',title:'II. La Galerie des miroirs',objective:'Aligner les quatre miroirs de l’aube',target:4,kind:'mirror',interactives:15,enemies:['ushabti','scarabs','jackal'],intro:'Le temple détourne la lumière dans une galerie de cuivre noirci.'},
    {id:'voix',title:'III. Le Puits des voix',objective:'Sceller les trois pierres d’écho',target:3,kind:'echo',interactives:15,enemies:['scarabs','jackal','scribe'],intro:'Chaque mot remonte des conduits avec une syllabe étrangère.'},
    {id:'dormeurs',title:'IV. La Chambre des dormeurs',objective:'Rassembler les quatre souvenirs d’Aziz',target:4,kind:'memory',interactives:15,enemies:['ushabti','scribe','veiled'],intro:'Aziz ne répond plus. Le temple a retourné ses souvenirs contre lui.'},
    {id:'palais',title:'V. Le Palais sous le soleil',objective:'Activer les cinq pylônes dans l’ordre',target:5,kind:'pylon',interactives:15,enemies:['jackal','scribe','veiled','scarabs'],intro:'Cinq pylônes attendent les pas I, III, V, II, IV.'},
    {id:'trone',title:"VI. Le Trône de l’aube absente",objective:'Aligner les quatre miroirs et bannir le Pharaon',target:4,kind:'finalMirror',interactives:14,enemies:['ushabti','jackal','scribe','veiled','pharaoh'],intro:'Le souverain interdit attend dans une salle qui n’a jamais vu le soleil.',finale:true}
  ];

  function rng(seed){let s=seed>>>0;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
  function buildChapter(spec,index){
    const random=rng(0xa211ce+index*739),w=23+(index%3)*2,h=23+(index%2)*2;
    const grid=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>(x===0||y===0||x===w-1||y===h-1)?1:0));
    for(let y=2;y<h-2;y+=2)for(let x=2;x<w-2;x++)if(random()>.32)grid[y][x]=1;
    for(let x=3;x<w-3;x+=4)for(let y=1;y<h-1;y++)if(random()>.72)grid[y][x]=1;
    for(let y=1;y<h-1;y++)grid[y][1]=0;for(let x=1;x<w-1;x++)grid[h-2][x]=0;
    const cells=[];for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)if(grid[y][x]===0&&!(x<4&&y<4))cells.push({x:x+.5,y:y+.5});
    cells.sort(()=>random()-.5);let cursor=0;const take=()=>cells[cursor++%cells.length];
    const objects=[];
    for(let i=0;i<spec.target;i++)objects.push({...take(),type:spec.kind,id:`${spec.id}-objective-${i+1}`,label:spec.kind==='mirror'||spec.kind==='finalMirror'?'Miroir solaire':spec.kind==='pylon'?`Pylône ${['I','III','V','II','IV'][i]}`:spec.kind==='memory'?"Souvenir d’Aziz":spec.kind==='echo'?"Pierre d’écho":'Sceau solaire'});
    ARCHIVES.filter(a=>a.chapter===index).forEach(a=>objects.push({...take(),type:'archive',id:a.id,label:a.title,archive:a}));
    const fixed=objects.length;const fillers=['oil','flash','bell','inscription','door'];
    for(let i=fixed;i<spec.interactives;i++){const type=fillers[(i-fixed)%fillers.length];objects.push({...take(),type,id:`${spec.id}-${type}-${i}`,label:{oil:'Huile de lampe',flash:'Magnésium',bell:'Cloche solaire',inscription:'Inscription',door:'Porte rituelle'}[type]});}
    const enemies=spec.enemies.map((type,i)=>({...take(),type,id:`${spec.id}-${type}-${i}`,health:THREATS[type].health,stun:0,alive:true}));
    return {...spec,index,w,h,grid,objects,enemies,start:{x:1.5,y:1.5,a:0},exit:{x:w-2.5,y:h-1.5}};
  }
  const CHAPTERS=CHAPTER_SPECS.map(buildChapter);
  const totalInteractives=CHAPTERS.reduce((n,c)=>n+c.objects.length,0);
  return Object.freeze({VERSION,DIFFICULTIES,THREATS,ARCHIVES,ACHIEVEMENTS,ENDINGS,CHAPTERS,totalInteractives});
});
