import {writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

// Audit topologique reproductible, sans prétendre simuler le comportement humain.
const reference=process.argv[2]||'66c8efe0f309c1aeaf64673141467aea2e1d774c';
const root=fileURLToPath(new URL('../../',import.meta.url));
const source=execFileSync('git',['show',`${reference}:src/data.js`],{cwd:root,encoding:'utf8'});
const scope={};vm.createContext(scope);vm.runInContext(source,scope);
const key=point=>`${Math.floor(point.x)}:${Math.floor(point.y)}`;
function distances(level,start){
  const queue=[[Math.floor(start.x),Math.floor(start.y),0]],result=new Map();
  for(let i=0;i<queue.length;i++){
    const [x,y,distance]=queue[i],id=`${x}:${y}`;
    if(result.has(id)||level.grid[y]?.[x]!==0)continue;
    result.set(id,distance);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])queue.push([x+dx,y+dy,distance+1]);
  }
  return result;
}
const chapters=scope.AZIZ_DATA.CHAPTERS.map(level=>{
  const reachable=distances(level,level.start);
  const objectives=level.objects.filter(object=>object.type===level.kind);
  const ordered=level.sequence?level.sequence.map(index=>objectives.find(object=>object.sequenceSlot===index)):null;
  const route=ordered?[level.start,...ordered,level.exit]:null;
  const segments=route?route.slice(1).map((target,index)=>distances(level,route[index]).get(key(target))):null;
  return {id:level.id,title:level.title,open:level.grid.flat().filter(cell=>cell===0).length,reachable:reachable.size,
    objects:level.objects.length,objectsReachable:level.objects.filter(object=>reachable.has(key(object))).length,
    exitDistance:reachable.get(key(level.exit)),sequence:ordered?.map(object=>object.label)||null,
    routeSegments:segments,routeLength:segments?.reduce((a,b)=>a+b,0)||null};
});
const result={reference,method:'Parcours en largeur, déplacements orthogonaux, sans IA, ressources, exploration ni temps humain.',chapters};
await writeFile(new URL('./world-summary.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
