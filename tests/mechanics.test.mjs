import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../src/mechanics.js',import.meta.url),'utf8');
const context={};vm.createContext(context);vm.runInContext(source,context);
const mechanics=context.AZIZ_MECHANICS;

test('le lien du projecteur dépend de la vigilance, de la confiance et de la corruption',()=>{
  const stable=mechanics.projectorLink({wake:90,trust:75,sync:80,corruption:10});
  const failing=mechanics.projectorLink({wake:20,trust:30,sync:15,corruption:80});
  assert.ok(stable>70);
  assert.ok(failing<20);
  assert.equal(mechanics.projectorState({wake:0,trust:100,sync:100,corruption:0}).online,false);
});

test('les modes du projecteur forment un cycle sans ambiguïté',()=>{
  assert.equal(mechanics.nextProjectorMode('sweep'),'focus');
  assert.equal(mechanics.nextProjectorMode('focus'),'shelter');
  assert.equal(mechanics.nextProjectorMode('shelter'),'sweep');
  assert.equal(mechanics.objectiveRule('seal').mode,'focus');
  assert.equal(mechanics.objectiveRule('memory').mode,'sweep');
});

test('un mode de sauvegarde invalide revient au balayage avec un projecteur complet',()=>{
  for (const mode of ['constructor','__proto__','toString','hasOwnProperty','inconnu','',null,undefined,0,{},['focus'],{toString:()=> 'focus'}]) {
    assert.equal(mechanics.normalizeMode(mode),'sweep');
    assert.equal(mechanics.nextProjectorMode(mode),'focus');
    const state=mechanics.projectorState({mode,wake:80,trust:80,sync:80,corruption:0});
    assert.equal(state.id,'sweep');
    assert.equal(state.online,true);
    for (const field of ['cone','range','power','wakeCost','link']) assert.ok(Number.isFinite(state[field]),field);
  }
  for (const mode of ['sweep','focus','shelter']) assert.equal(mechanics.normalizeMode(mode),mode);
});

test('les types objectifs inconnus ne lisent pas les propriétés héritées',()=>{
  for (const kind of ['constructor','__proto__','toString',null,{},['seal']]) {
    const rule=mechanics.objectiveRule(kind);
    assert.equal(rule.mode,'sweep');
    assert.equal(rule.type,'instant');
    assert.equal(rule.minLink,0);
    assert.equal(rule.duration,0);
  }
  assert.equal(mechanics.objectiveRule('seal').type,'channel');
  assert.equal(mechanics.objectiveRule('seal').duration,2.4);
});

test('les quatre fins ont des scénarios de campagne reproductibles',()=>{
  assert.equal(mechanics.endingKey({trust:86,corruption:12},{correctResponses:4,puzzleErrors:2}),'true_dawn');
  assert.equal(mechanics.endingKey({trust:62,corruption:42},{correctResponses:1,puzzleErrors:9}),'guardian');
  assert.equal(mechanics.endingKey({trust:34,corruption:70},{correctResponses:0,puzzleErrors:12}),'false_light');
  assert.equal(mechanics.endingKey({trust:20,corruption:92},{correctResponses:0,puzzleErrors:15}),'eternal_sleep');
});

test('le directeur accorde une respiration après un pic',()=>{
  const base={chapterIndex:4,objectiveRatio:.8,danger:.7,wake:25,health:35,battery:20,surge:.8};
  const peak=mechanics.tensionTarget({...base,grace:0});
  const release=mechanics.tensionTarget({...base,grace:12});
  assert.ok(peak>.7);
  assert.ok(release<peak*.55);
});
