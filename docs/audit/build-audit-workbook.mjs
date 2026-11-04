import fs from 'node:fs/promises';
import path from 'node:path';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

// Requires the managed @oai/artifact-tool runtime. Run a copy of this script from
// an OS temporary directory whose node_modules points to the primary runtime.
// Arguments: audit JSON path, then optional absolute export directory.
// The exported workbook is standard .xlsx and does not require this runtime.
// Source JSON contains evidence collected by the audit agents. This builder never
// creates findings, estimates, test outcomes or completion claims on its own.
const inputPath = process.argv[2];
if (!inputPath) throw new Error('Usage: build_audit.mjs /absolute/path/audit-data.json');
const data = JSON.parse(await fs.readFile(inputPath, 'utf8'));
if (!Array.isArray(data.findings) || data.findings.length === 0) throw new Error('No audit findings supplied');
if (!data.repoUrl || !data.baseCommit) throw new Error('Repository URL and audited commit are required');
const outputDir = path.resolve(process.argv[3] ?? path.join(process.cwd(), 'outputs', 'aziz_audit_20261104'));
await fs.mkdir(outputDir, { recursive: true });
const records = [...data.findings].sort((a,b)=>String(a.priority).localeCompare(String(b.priority)) || String(a.category ?? a.domain).localeCompare(String(b.category ?? b.domain),'fr') || String(a.id).localeCompare(String(b.id)));
const tests = data.tests ?? [];
const unique = (array) => [...new Set(array.filter(Boolean))];
const textLines = (text, maxLength=100) => {
  const lines=[];
  let line='';
  for(const word of String(text).split(/\s+/)) {
    if(line && line.length+word.length+1>maxLength){lines.push(line);line=word;}
    else line+=(line?' ':'')+word;
  }
  if(line) lines.push(line);
  return lines;
};
const domains = unique(records.map((x) => x.category ?? x.domain)).sort((a,b)=>a.localeCompare(b,'fr'));
const statuses = unique(['Corrigé et vérifié','Implémenté — recette visuelle restante','Partiellement implémenté','Partiellement corrigé','En cours','À faire','Proposé','À planifier','À valider',...records.map((x) => x.status)]);
const types = unique(['Corriger','Améliorer','Ajouter',...records.map((x) => x.type)]);
const priorities = ['P0', 'P1', 'P2', 'P3'];
const verifiedStatuses = data.verifiedStatuses ?? ['Corrigé et vérifié'];
const implementationPendingStatuses = data.implementationPendingStatuses ?? ['Implémenté — recette visuelle restante'];
const ids = records.map((x) => x.id);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate audit IDs');
for (const record of records) {
  for (const field of ['id','domain','type','priority','status','evidenceKind','title','observation','evidence','action','acceptance']) {
    if (!record[field]) throw new Error(`Finding ${record.id ?? '?'} lacks ${field}`);
  }
  if (!priorities.includes(record.priority)) throw new Error(`Invalid priority: ${record.priority}`);
}

const workbook = Workbook.create();
const summary = workbook.worksheets.add('Synthèse');
const register = workbook.worksheets.add('Registre');
const qa = workbook.worksheets.add('Parcours QA');
const palette = { ink:'#17243B', muted:'#596576', navy:'#253C5B', blue:'#EAF0F8', amber:'#FFF1CE', rule:'#CCD6E3', light:'#F5F7FA' };
const font = 'Arial';

function styleSheet(sheet, range) {
  sheet.showGridLines = false;
  sheet.getRange(range).format.font = { name:font, size:10, color:palette.ink };
  sheet.getRange(range).format.verticalAlignment = 'center';
}
function title(sheet, label, endColumn) {
  sheet.getRange('A2').values = [[label]];
  sheet.getRange('A2').format.font = { name:font, size:16, color:palette.ink, bold:true };
  sheet.getRange(`A3:${endColumn}3`).format.borders = { bottom:{ style:'thin', color:palette.rule } };
  sheet.getRange('A2').format.rowHeight = 25;
}
function section(sheet, range, label) {
  sheet.getRange(range).format.fill = palette.blue;
  sheet.getRange(range).format.font = { name:font, size:10, color:palette.ink, bold:true };
  sheet.getRange(range.split(':')[0]).values = [[label]];
  sheet.getRange(range).format.rowHeight = 23;
}
function header(sheet, range) {
  sheet.getRange(range).format = { fill:palette.navy, font:{name:font,size:10,bold:true,color:'#FFFFFF'}, wrapText:true, verticalAlignment:'center', horizontalAlignment:'center' };
  sheet.getRange(range).format.borders = { insideVertical:{ style:'thin', color:'#FFFFFF' } };
  sheet.getRange(range).format.rowHeight = 32;
}
function tallRows(sheet, start, rows, widths, maxWidthChars=undefined) {
  for (let index=0; index<rows.length; index++) {
    const row=rows[index];
    let lines=1;
    for (let col=0; col<row.length; col++) {
      const text=String(row[col] ?? '');
      const capacity=Math.max(6,Math.floor((widths[col] ?? maxWidthChars ?? 30)*0.82));
      const wrapped=text.split('\n').reduce((sum,line)=>sum+Math.max(1,Math.ceil(line.length/capacity)),0);
      lines=Math.max(lines,wrapped);
    }
    sheet.getRange(`A${start+index}`).format.rowHeight=Math.max(30,Math.min(409,lines*13.5+14));
  }
}

const columns = [
  ['id','ID',17], ['category','Domaine',24], ['domain','Domaine détaillé',28], ['type','Action',15], ['priority','Priorité',10],
  ['status','Statut',24], ['evidenceKind','Origine du constat',23], ['scope','Zone ou système',30],
  ['title','Sujet',48], ['observation','Constat au commit audité',62], ['evidence','Preuve du constat',60],
  ['impact','Effet sur le jeu',48], ['action','Travail à réaliser',65], ['acceptance','Critères d’acceptation',65],
  ['effort','Effort estimé',18], ['dependencies','Dépendances',28], ['implementation','Modifications dans cette PR',58],
  ['verification','Vérification effectuée',56], ['remainingValidation','Validation restante',56], ['sourceUrl','Source GitHub',66]
];
const regStart=7;
const regEnd=regStart+records.length-1;
const colLetter=(index)=>{let s=''; for(let n=index+1;n>0;n=Math.floor((n-1)/26)) s=String.fromCharCode(65+(n-1)%26)+s; return s;};
styleSheet(register, `A1:T${regEnd}`);
title(register, 'Registre des corrections, ajouts et améliorations', 'T');
register.getRange('A4').values = [['Tri initial : priorité, domaine et ID. Le statut décrit la livraison de cette PR. Les propositions restent identifiées dans « Origine du constat ».']];
register.getRange('A4').format.font = {name:font,size:10,color:palette.muted,italic:true};
register.getRange('A6:T6').values=[columns.map((x)=>x[1])];
const rowValues=records.map((record)=>columns.map(([key])=>key==='category'?(record.category ?? record.domain):(record[key] ?? '')));
register.getRange(`A${regStart}:T${regEnd}`).values=rowValues;
const taskTable=register.tables.add(`A6:T${regEnd}`,true,'ActionsAziz');
taskTable.style='TableStyleLight9';
taskTable.showFilterButton=true;
header(register,'A6:T6');
for(let c=0;c<columns.length;c++) register.getRange(`${colLetter(c)}1:${colLetter(c)}${regEnd}`).format.columnWidth=columns[c][2];
register.getRange(`A${regStart}:T${regEnd}`).format.wrapText=true;
register.getRange(`A${regStart}:T${regEnd}`).format.verticalAlignment='top';
register.getRange(`D${regStart}:G${regEnd}`).format.horizontalAlignment='left';
tallRows(register,regStart,rowValues,columns.map((x)=>x[2]));
register.freezePanes.freezeRows(6);
register.freezePanes.freezeColumns(2);
register.getRange(`D${regStart}:D${regEnd}`).dataValidation={rule:{type:'list',values:unique([...types,'Corriger','Ajouter','Améliorer'])}};
register.getRange(`E${regStart}:E${regEnd}`).dataValidation={rule:{type:'list',values:priorities}};
register.getRange(`F${regStart}:F${regEnd}`).dataValidation={rule:{type:'list',values:unique([...statuses,...implementationPendingStatuses])}};
for(const [priority,fill,color] of [['P0','#FCE4E3','#9A2626'],['P1','#FFF0D7','#80521A'],['P2','#EAF0F8','#253C5B']]) {
  register.getRange(`E${regStart}:E${regEnd}`).conditionalFormats.add('cellIs',{operator:'equal',formula:`"${priority}"`,format:{fill,font:{bold:true,color}}});
}
for(const status of verifiedStatuses) register.getRange(`F${regStart}:F${regEnd}`).conditionalFormats.add('cellIs',{operator:'equal',formula:`"${status}"`,format:{fill:'#E4F0E7',font:{color:'#2E6140'}}});
register.getRange(`F${regStart}:F${regEnd}`).conditionalFormats.add('cellIs',{operator:'equal',formula:'"Partiellement corrigé"',format:{fill:palette.amber,font:{color:'#80521A'}}});
register.getRange(`F${regStart}:F${regEnd}`).conditionalFormats.add('cellIs',{operator:'equal',formula:'"Partiellement implémenté"',format:{fill:palette.amber,font:{color:'#80521A'}}});
for(const status of implementationPendingStatuses) register.getRange(`F${regStart}:F${regEnd}`).conditionalFormats.add('cellIs',{operator:'equal',formula:`"${status}"`,format:{fill:palette.amber,font:{color:'#80521A'}}});

const qColumns=[['id','ID',16],['area','Domaine',24],['scenario','Parcours ou contrôle',58],['method','Méthode',26],['expected','Résultat attendu',64],['result','Résultat constaté',64],['status','État du test',24],['evidence','Preuve ou commande',65],['relatedFindings','Actions concernées',30]];
const qEnd=Math.max(7,6+tests.length);
styleSheet(qa,`A1:I${qEnd}`);
title(qa,'Parcours de validation','I');
qa.getRange('A4').values=[['Les scénarios non exécutés décrivent le travail restant et ne constituent pas une validation du jeu.']];
qa.getRange('A4').format.font={name:font,size:10,color:palette.muted,italic:true};
qa.getRange('A6:I6').values=[qColumns.map((x)=>x[1])];
if(tests.length){
  const qaValues=tests.map((test)=>qColumns.map(([key])=>test[key] ?? ''));
  qa.getRange(`A7:I${qEnd}`).values=qaValues;
  const table=qa.tables.add(`A6:I${qEnd}`,true,'ValidationAziz');
  table.style='TableStyleLight9';
  table.showFilterButton=true;
  qa.getRange(`A7:I${qEnd}`).format.wrapText=true;
  qa.getRange(`A7:I${qEnd}`).format.verticalAlignment='top';
  tallRows(qa,7,qaValues,qColumns.map((x)=>x[2]));
  qa.getRange(`G7:G${qEnd}`).dataValidation={rule:{type:'list',values:unique([...tests.map((x)=>x.status),'Réussi','Échec','Non exécuté','Partiel'])}};
  for(const [label,fill,color] of [['Réussi','#E4F0E7','#2E6140'],['Échec','#FCE4E3','#9A2626'],['Non exécuté','#F1F3F6','#596576'],['Partiel',palette.amber,'#80521A']]) {
    qa.getRange(`G7:G${qEnd}`).conditionalFormats.add('cellIs',{operator:'equal',formula:`"${label}"`,format:{fill,font:{color}}});
  }
} else qa.getRange('A7').values=[['Aucun résultat de validation fourni.']];
header(qa,'A6:I6');
qColumns.forEach((x,c)=>{qa.getRange(`${colLetter(c)}1:${colLetter(c)}${qEnd}`).format.columnWidth=x[2];});
qa.freezePanes.freezeRows(6);
qa.freezePanes.freezeColumns(1);

const limitationLines=(data.limitations??[]).reduce((sum,item)=>sum+textLines(item).length+1,0);
const domainStart=Math.max(22,17+statuses.length,17+types.length);
const summaryEnd=Math.max(46,domainStart+domains.length+4,domainStart+15+limitationLines);
styleSheet(summary,`A1:L${summaryEnd}`);
summary.tabColor=palette.navy;
title(summary,data.title ?? 'AZIZ — La Lumière Dort','L');
summary.getRange('A4').values=[['Audit des sources et suivi de la première PR']];
summary.getRange('A4').format.font={name:font,size:10,color:palette.muted,italic:true};
const swidth=[32,15,15,15,3,33,15,15,3,31,16,16];
swidth.forEach((w,c)=>summary.getRange(`${colLetter(c)}1:${colLetter(c)}${summaryEnd}`).format.columnWidth=w);
summary.getRange('A6').values=[['Date de l’audit']];
summary.getRange('B6').values=[[new Date((data.auditDate??'2026-11-04')+'T12:00:00Z')]];
summary.getRange('B6').setNumberFormat('dd/mm/yyyy');
summary.getRange('F6').values=[['Version auditée']];
summary.getRange('G6').values=[[data.baseCommit.slice(0,12)]];
summary.getRange('A7').values=[['Dépôt']];
summary.getRange('B7').values=[[data.repoUrl]];
summary.getRange('A8').values=[['Périmètre']];
summary.getRange('B8').values=[[data.scopeSummary ?? 'Sources et contrôles automatisés. Voir les résultats des parcours QA pour la validation du jeu.']];
summary.getRange('B7:L8').format.font={name:font,size:10,color:palette.muted};
summary.getRange('B8').format.wrapText=false;
summary.getRange('A10:B10').values=[['Actions recensées',null]];
summary.getRange('B10').formulas=[[`=COUNTA('Registre'!$A$${regStart}:$A$${regEnd})`]];
summary.getRange('F10:G10').values=[['Corrigées et vérifiées',null]];
const statusRange=`'Registre'!$F$${regStart}:$F$${regEnd}`;
summary.getRange('G10').formulas=[['='+verifiedStatuses.map((s)=>`COUNTIFS(${statusRange},"${s}")`).join('+')]];
summary.getRange('J10:K10').values=[['À traiter ou poursuivre',null]];
summary.getRange('A11:B11').values=[['Implémentées à recetter',null]];
summary.getRange('B11').formulas=[['='+implementationPendingStatuses.map((s)=>`COUNTIFS(${statusRange},"${s}")`).join('+')]];
summary.getRange('K10').formulas=[['=B10-G10-B11']];
summary.getRange('A10:L10').format.font={name:font,size:10,bold:true,color:palette.ink};
summary.getRange('A10:D10').format.fill=palette.blue;
summary.getRange('F10:H10').format.fill=palette.blue;
summary.getRange('J10:L10').format.fill=palette.blue;
summary.getRange('A10').format.rowHeight=30;
summary.getRange('A11:D11').format.fill=palette.amber;
summary.getRange('A11:B11').format.font={name:font,size:10,bold:true,color:palette.ink};
summary.getRange('A11').format.rowHeight=27;

section(summary,'A13:D13','Priorités');
summary.getRange('A14:C14').values=[['Priorité','Total','Non clôturées']];
header(summary,'A14:C14');
for(let i=0;i<priorities.length;i++) {
  const row=15+i;
  summary.getRange(`A${row}`).values=[[priorities[i]]];
  summary.getRange(`B${row}`).formulas=[[`=COUNTIFS('Registre'!$E$${regStart}:$E$${regEnd},$A${row})`]];
  summary.getRange(`C${row}`).formulas=[[`=B${row}-`+verifiedStatuses.map((s)=>`COUNTIFS('Registre'!$E$${regStart}:$E$${regEnd},$A${row},${statusRange},"${s}")`).join('-')]];
}
section(summary,'F13:H13','Statuts de livraison');
summary.getRange('F14:G14').values=[['Statut','Nombre']];
header(summary,'F14:G14');
statuses.forEach((s,i)=>{const r=15+i;summary.getRange(`F${r}`).values=[[s]];summary.getRange(`G${r}`).formulas=[[`=COUNTIFS(${statusRange},F${r})`]];});
section(summary,'J13:L13','Nature du travail');
summary.getRange('J14:K14').values=[['Action','Nombre']];
header(summary,'J14:K14');
types.forEach((type,i)=>{const r=15+i;summary.getRange(`J${r}`).values=[[type]];summary.getRange(`K${r}`).formulas=[[`=COUNTIFS('Registre'!$D$${regStart}:$D$${regEnd},J${r})`]];});

section(summary,`A${domainStart}:D${domainStart}`,'Couverture par domaine');
summary.getRange(`A${domainStart+1}:D${domainStart+1}`).values=[['Domaine','Actions','Vérifiées','Non clôturées']];
header(summary,`A${domainStart+1}:D${domainStart+1}`);
domains.forEach((domain,i)=>{
  const row=domainStart+2+i;
  summary.getRange(`A${row}`).values=[[domain]];
  summary.getRange(`B${row}`).formulas=[[`=COUNTIFS('Registre'!$B$${regStart}:$B$${regEnd},$A${row})`]];
  summary.getRange(`C${row}`).formulas=[['='+verifiedStatuses.map((s)=>`COUNTIFS('Registre'!$B$${regStart}:$B$${regEnd},$A${row},${statusRange},"${s}")`).join('+')]];
  summary.getRange(`D${row}`).formulas=[[`=B${row}-C${row}`]];
});
section(summary,`F${domainStart}:L${domainStart}`,'Lecture des priorités');
const definitions=data.priorityDefinitions ?? [
  ['P0','Blocage empêchant de lancer, progresser ou conserver la partie.'],
  ['P1','Défaut majeur de jouabilité, de progression ou de fiabilité.'],
  ['P2','Amélioration substantielle de qualité, de lisibilité ou de contenu.'],
  ['P3','Polissage ou extension à planifier après les défauts prioritaires.']
];
definitions.forEach(([priority,meaning],i)=>{const r=domainStart+2+i*2;summary.getRange(`F${r}`).values=[[priority+' : '+meaning]];});
let notesRow=domainStart+11;
section(summary,`F${notesRow}:L${notesRow}`,'Périmètre de validation');
for(const item of (data.limitations ?? [])) {
  notesRow++;
  for(const line of textLines(item)) {
    notesRow++;
    summary.getRange(`F${notesRow}`).values=[[line]];
  }
}
notesRow+=3;
summary.getRange(`F${notesRow}`).values=[['Les preuves détaillées et les sources figurent dans le Registre.']];
summary.getRange(`F${notesRow}`).format.font={name:font,size:10,color:palette.muted,italic:true};
summary.getRange(`B10:L${summaryEnd}`).setNumberFormat('#,##0');
summary.getRange('B6').setNumberFormat('dd/mm/yyyy');
summary.getRange(`B15:D${summaryEnd}`).format.horizontalAlignment='right';
summary.getRange(`G15:G${summaryEnd}`).format.horizontalAlignment='right';
summary.getRange(`K15:K${summaryEnd}`).format.horizontalAlignment='right';
summary.getRange(`A15:L${summaryEnd}`).format.rowHeight=22;
summary.getRange(`A${domainStart+1}:D${domainStart+1}`).format.horizontalAlignment='center';
statuses.forEach((status,index)=>{
  if(status.length>30){summary.getRange(`F${15+index}`).format.wrapText=true;summary.getRange(`A${15+index}`).format.rowHeight=36;}
});

// Recalculation and independent count checks cover the workbook's actual logic.
workbook.recalculate();
const expectedVerified=records.filter((r)=>verifiedStatuses.includes(r.status)).length;
const expectedPending=records.filter((r)=>implementationPendingStatuses.includes(r.status)).length;
const expectedOpen=records.length-expectedVerified-expectedPending;
const totals=[summary.getRange('B10').values[0][0],summary.getRange('G10').values[0][0],summary.getRange('B11').values[0][0],summary.getRange('K10').values[0][0]];
if(JSON.stringify(totals)!==JSON.stringify([records.length,expectedVerified,expectedPending,expectedOpen])) throw new Error('Summary totals do not match input records: '+JSON.stringify(totals));
domains.forEach((domain,index)=>{
  const row=domainStart+2+index;
  const own=records.filter((r)=>(r.category??r.domain)===domain);
  const verified=own.filter((r)=>verifiedStatuses.includes(r.status)).length;
  const actual=summary.getRange(`B${row}:D${row}`).values[0];
  if(JSON.stringify(actual)!==JSON.stringify([own.length,verified,own.length-verified])) throw new Error('Domain summary mismatch: '+domain);
});
priorities.forEach((priority,index)=>{
  const own=records.filter((r)=>r.priority===priority);
  const actual=summary.getRange(`B${15+index}:C${15+index}`).values[0];
  if(JSON.stringify(actual)!==JSON.stringify([own.length,own.filter((r)=>!verifiedStatuses.includes(r.status)).length])) throw new Error('Priority summary mismatch: '+priority);
});
statuses.forEach((status,index)=>{
  if(summary.getRange(`G${15+index}`).values[0][0]!==records.filter((r)=>r.status===status).length) throw new Error('Status summary mismatch: '+status);
});
types.forEach((type,index)=>{
  if(summary.getRange(`K${15+index}`).values[0][0]!==records.filter((r)=>r.type===type).length) throw new Error('Action summary mismatch: '+type);
});
const mutationRows=[...new Set([
  records.findIndex((r)=>implementationPendingStatuses.includes(r.status)),
  records.findIndex((r)=>!verifiedStatuses.includes(r.status)&&!implementationPendingStatuses.includes(r.status))
])].filter((index)=>index>=0);
for(const index of mutationRows){
  const original=records[index].status;
  const address=`F${regStart+index}`;
  register.getRange(address).values=[[verifiedStatuses[0]]];
  workbook.recalculate();
  const wasPending=implementationPendingStatuses.includes(original);
  if(summary.getRange('G10').values[0][0]!==expectedVerified+1 || summary.getRange('B11').values[0][0]!==expectedPending-(wasPending?1:0) || summary.getRange('K10').values[0][0]!==expectedOpen-(wasPending?0:1)) throw new Error('Status edit did not update summary');
  register.getRange(address).values=[[original]];
  workbook.recalculate();
}
const inspect=await workbook.inspect({kind:'table',range:'Synthèse!A10:L18',include:'values,formulas',tableMaxRows:9,tableMaxCols:12,maxChars:6000});
const errors=await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:100},summary:'Formula error scan',maxChars:4000});
await fs.writeFile(path.join(outputDir,'verification.json'),JSON.stringify({records:records.length,tests:tests.length,verified:expectedVerified,implementationPending:expectedPending,open:expectedOpen,totals,domains,statuses,inspect:inspect.ndjson,errors:errors.ndjson},null,2));
console.log(JSON.stringify({records:records.length,tests:tests.length,verified:expectedVerified,implementationPending:expectedPending,open:expectedOpen,totals,errors:errors.ndjson}));
for(const [sheetName,range,file] of [
  ['Synthèse',`A1:L${Math.max(domainStart+domains.length+3,notesRow+1)}`,'synthese.png'],
  ['Registre',`A5:I${Math.min(regEnd,9)}`,'registre.png'],
  ['Registre',`J5:N${Math.min(regEnd,8)}`,'registre_details.png'],
  ['Parcours QA',`A5:G${Math.min(qEnd,9)}`,'validation.png']
]){
  const image=await workbook.render({sheetName,range,scale:1,format:'png'});
  await fs.writeFile(path.join(outputDir,file),new Uint8Array(await image.arrayBuffer()));
}
const xlsx=await SpreadsheetFile.exportXlsx(workbook);
const destination=path.join(outputDir,'AZIZ_Audit_Complet_2026-11-04.xlsx');
await xlsx.save(destination);
console.log(JSON.stringify({output:destination}));
