import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const [data, mechanics, visuals, source] = await Promise.all(['src/data.js', 'src/mechanics.js', 'src/visuals.js', 'src/game.js'].map(path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
function world(enemy = null, visible = true) {
  const tones = [], noises = [], nodes = new Map();
  const node = key => {
    if (!nodes.has(key)) nodes.set(key, { textContent: '', classList: { add() {}, remove() {} } });
    return nodes.get(key);
  };
  const context = vm.createContext({ structuredClone, setTimeout() {}, document: { querySelector: node } });
  vm.runInContext('globalThis.window = globalThis;', context);
  vm.runInContext(data, context); vm.runInContext(mechanics, context);
  vm.runInContext(visuals, context);
  vm.runInContext(`${source.slice(source.indexOf("  'use strict';"), source.indexOf('  class AudioEngine {'))}\n${source.slice(source.indexOf('  class Game {'), source.indexOf('  const storage = new Storage();'))}\nglobalThis.TEST = { Game, Data };`, context);
  const game = Object.create(context.TEST.Game.prototype);
  Object.assign(game, {
    mode: 'playing', elapsed: 10, chapterIndex: 3, objectiveCount: 0, danger: 1,
    player: { x: 1.5, y: 1.5, a: 0, calm: 100, health: 100, battery: 100 },
    aziz: { wake: 80 }, director: { pressure: .9, grace: 0, surge: 0, nextEvent: 0 },
    level: { target: 4, enemies: enemy ? [{ alive: true, state: 'chase', type: 'jackal', ...enemy }] : [] },
    profile: { options: { directionCues: true } }, hasLineOfSight: () => visible,
    audio: { tone: (...args) => tones.push(args), noise: (...args) => noises.push(args) }
  });
  return { game, tones, noises, node };
}

test('WD-032 : une ambiance sans menace ne pretend pas localiser un ennemi', () => {
  const w = world();
  w.game.updateDirector(.016, { director: 1 });
  assert.doesNotMatch(w.node('#threat-status').textContent, /GAUCHE|DROITE/);
  assert.match(w.node('#threat-status').textContent, /AMBIANCE/);
  assert.equal(w.noises[0][2], 0);
  assert.equal(w.noises[0][3], 'ambience');
});

test('WD-032 : direction de menace suit la source et son attenuation suit les obstacles', () => {
  const right = world({ x: 1.5, y: 4.5 });
  right.game.updateThreatAudio(.016);
  assert.equal(right.tones.length, 1);
  assert.equal(right.tones[0][4], 1);
  assert.match(right.node('#threat-status').textContent, /DROITE/);
  const left = world({ x: 1.5, y: -1.5 });
  left.game.updateThreatAudio(.016);
  assert.equal(left.tones[0][4], -1);
  assert.match(left.node('#threat-status').textContent, /GAUCHE/);
  const muffled = world({ x: 1.5, y: 4.5 }, false);
  muffled.game.updateThreatAudio(.016);
  assert.ok(muffled.tones[0][3] < right.tones[0][3]);
  assert.match(muffled.node('#threat-status').textContent, /ÉTOUFFÉ/);
  right.game.updateThreatAudio(.016);
  assert.equal(right.tones.length, 1, 'le son ne doit pas se répéter à chaque frame');
});
