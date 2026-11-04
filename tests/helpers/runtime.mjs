import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Exécute les méthodes de jeu réelles avec des périphériques inertes. Ce harness
// ne remplace pas une recette visuelle ou matérielle dans un navigateur.
const root = new URL('../../', import.meta.url);
const [data, mechanics, visuals, source] = await Promise.all(
  ['src/data.js', 'src/mechanics.js', 'src/visuals.js', 'src/game.js'].map(path => readFile(new URL(path, root), 'utf8'))
);
const start = source.indexOf("  'use strict';");
const storageEnd = source.indexOf('  class AudioEngine {');
const inputStart = source.indexOf('  class Input {');
const gameEnd = source.indexOf('  const storage = new Storage();', inputStart);
assert.ok(start >= 0 && storageEnd > start && inputStart > storageEnd && gameEnd > inputStart);

export function environment({ onRouteSearch = null } = {}) {
  const values = new Map(), nodes = new Map(), timers = [];
  const node = selector => {
    if (!nodes.has(selector)) {
      const classes = new Set();
      nodes.set(selector, { textContent: '', style: {}, dataset: {}, focus() {},
        classList: { add: key => classes.add(key), remove: key => classes.delete(key),
          contains: key => classes.has(key), toggle: (key, on) => on ? classes.add(key) : classes.delete(key) } });
    }
    return nodes.get(selector);
  };
  const context = vm.createContext({ structuredClone, queueMicrotask,
    setTimeout(callback) { timers.push(callback); return timers.length; },
    document: { querySelector: node, querySelectorAll: () => [], exitPointerLock() {}, documentElement: { dataset: {} } },
    navigator: { getGamepads: () => [] },
    localStorage: { getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) },
    updateContinueButton() {}, syncModalState() {}
  });
  vm.runInContext('globalThis.window = globalThis;', context);
  vm.runInContext(data, context);
  vm.runInContext(mechanics, context);
  vm.runInContext(visuals, context);
  if (onRouteSearch) {
    context.observeRouteSearch = onRouteSearch;
    vm.runInContext(`const realMechanics = AZIZ_MECHANICS;
      globalThis.AZIZ_MECHANICS = Object.freeze({ ...realMechanics, findGridRoute(...args) {
        const result = realMechanics.findGridRoute(...args);
        observeRouteSearch(result.visited);
        return result;
      } });`, context);
  }
  vm.runInContext(`${source.slice(start, storageEnd)}
${source.slice(inputStart, gameEnd)}
globalThis.TEST = { Storage, Game, Data, Mechanics };`, context);
  return { ...context.TEST, node, timers, values };
}

export function createGame(env, chapterIndex = 0, difficulty = 'expedition') {
  const storage = new env.Storage(), game = Object.create(env.Game.prototype);
  Object.assign(game, {
    storage, profile: { ...storage.getProfile(), difficulty },
    input: { reset() {}, pollGamepad: () => ({ moveX: 0, moveY: 0, turn: 0, run: false }),
      take: () => false, down: () => false, touchX: 0, touchY: 0, turn: 0 },
    audio: { update() {}, suspend() {}, noise() {}, tone() {}, voice() {}, step() {}, resetTimeline() {} },
    flashTime: 0, hitClock: 0, stepClock: 0, toastTimer: 0,
    resize() {}, updateHud() {}, showChapterBanner() {}, updateTutorial() {}
  });
  game.loadChapter(chapterIndex, null, false);
  return game;
}

export function faceObject(game, object) {
  const offset = [[-1, 0], [1, 0], [0, -1], [0, 1]].find(([dx, dy]) => !game.wall(object.x + dx, object.y + dy));
  assert.ok(offset, 'Un côté praticable doit permettre l’interaction.');
  const [dx, dy] = offset;
  Object.assign(game.player, { x: object.x + dx, y: object.y + dy, a: Math.atan2(-dy, -dx) });
  Object.assign(game.aziz, { wake: 90, trust: 75, corruption: 0, sync: 80, mode: 'sweep' });
}
