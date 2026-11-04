import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Méthodes réelles exécutées dans Node avec stockage/éléments DOM minimaux.
// Aucune navigation de menus, mise en page ou compatibilité navigateur n'est
// revendiquée par ce harness : ces parcours restent une recette séparée.
const root = new URL('../', import.meta.url);
const [dataSource, mechanicsSource, gameSource] = await Promise.all(
  ['src/data.js', 'src/mechanics.js', 'src/game.js'].map(path => readFile(new URL(path, root), 'utf8'))
);
const declarationsStart = gameSource.indexOf("  'use strict';");
const storageEnd = gameSource.indexOf('  class AudioEngine {');
const inputStart = gameSource.indexOf('  class Input {');
const gameEnd = gameSource.indexOf('  const storage = new Storage();', inputStart);
assert.ok(declarationsStart >= 0 && storageEnd > declarationsStart && inputStart > storageEnd && gameEnd > inputStart);

function environment({ rejectStorage = false } = {}) {
  const values = new Map(), nodes = new Map();
  let writes = 0;
  const pads = [];
  const node = selector => {
    if (!nodes.has(selector)) {
      const classes = new Set();
      nodes.set(selector, { textContent: '', style: {}, focus() {},
        classList: { add: key => classes.add(key), remove: key => classes.delete(key),
          contains: key => classes.has(key), toggle: (key, enabled) => enabled ? classes.add(key) : classes.delete(key) } });
    }
    return nodes.get(selector);
  };
  const storageAccess = () => { if (rejectStorage) throw new Error('Storage refused in this test.'); };
  const context = vm.createContext({
    structuredClone, queueMicrotask,
    document: { querySelector: node, querySelectorAll: () => [], exitPointerLock() {} },
    navigator: { getGamepads: () => pads },
    localStorage: {
      getItem(key) { storageAccess(); return values.get(key) ?? null; },
      setItem(key, value) { storageAccess(); writes++; values.set(key, value); },
      removeItem(key) { storageAccess(); writes++; values.delete(key); }
    },
    updateContinueButton() {}, syncModalState() {}
  });
  vm.runInContext('globalThis.window = globalThis;', context);
  vm.runInContext(dataSource, context);
  vm.runInContext(mechanicsSource, context);
  vm.runInContext(`${gameSource.slice(declarationsStart, storageEnd)}
    ${gameSource.slice(inputStart, gameEnd)}
    globalThis.TEST = { Storage, Game, Input, Data, DEFAULT_STATS, DEFAULT_CHAPTER_STATS, STORAGE_KEY, PROFILE_KEY };
  `, context);
  return { ...context.TEST, values, nodes, node, pads, get writes() { return writes; } };
}

function campaign(env, chapterIndex = 0, health = 61) {
  return { version: '1.2.0', chapterIndex,
    player: { ...env.Data.CHAPTERS[chapterIndex].start, health, battery: 70, flashes: 3, lampOn: true, calm: 100 },
    aziz: { wake: 90, trust: 75, corruption: 0, sync: 80, mode: 'focus' },
    completedIds: [], objectStates: {}, enemyStates: [], elapsed: 23,
    stats: structuredClone(env.DEFAULT_STATS), chapterStats: structuredClone(env.DEFAULT_CHAPTER_STATS) };
}

function bundle(storage, save, profile = storage.getProfile()) {
  return JSON.stringify({ schema: 'aziz-save', version: '1.2.0', save, profile });
}

test('WD-019 : les indices écrits restent affichés sans sous-titres', () => {
  const env = environment(), game = Object.create(env.Game.prototype);
  game.profile = { options: { subtitles: false } };
  game.say('Le miroir doit regarder l’est.', 3.2, true);
  assert.equal(env.node('#toast').textContent, 'Le miroir doit regarder l’est.');
  assert.equal(env.node('#toast').classList.contains('visible'), true);
  assert.equal(game.toastTimer, 3.2);
  game.say('Le souvenir attend votre réponse.', 4);
  assert.equal(env.node('#toast').textContent, 'Le souvenir attend votre réponse.');
});

test('WD-019 : une parole filtrée ne remplace pas un indice en cours', () => {
  const env = environment(), game = Object.create(env.Game.prototype);
  game.profile = { options: { subtitles: false } };
  game.say('Indice de puzzle', 5, true);
  game.say('Réplique parlée', 2.8, 'speech');
  assert.equal(env.node('#toast').textContent, 'Indice de puzzle');
  assert.equal(game.toastTimer, 5);
  game.profile.options.subtitles = true;
  game.say('Réplique parlée', 2.8, 'speech');
  assert.equal(env.node('#toast').textContent, 'Réplique parlée');
});

test('préparer un import valide ne modifie ni le profil ni la campagne', () => {
  const env = environment(), storage = new env.Storage();
  storage.save(campaign(env));
  storage.saveProfile(storage.getProfile());
  const before = new Map(env.values), writes = env.writes;
  const preview = storage.prepareImport(bundle(storage, campaign(env, 1, 89)));
  assert.equal(preview.save.chapterIndex, 1);
  assert.equal(preview.save.player.health, 89);
  assert.equal(env.writes, writes);
  assert.deepEqual(env.values, before);
});

test('les imports invalides ne modifient aucune donnée locale', () => {
  const env = environment(), storage = new env.Storage();
  storage.save(campaign(env));
  storage.saveProfile(storage.getProfile());
  const before = new Map(env.values), profile = storage.getProfile();
  const valid = { schema: 'aziz-save', version: '1.2.0', save: campaign(env), profile };
  const candidates = [
    '{ invalid json',
    JSON.stringify({ ...valid, version: '9.9.9' }),
    JSON.stringify({ ...valid, schema: 'unknown' }),
    JSON.stringify({ ...valid, profile: { ...profile, archives: null } }),
    JSON.stringify({ ...valid, save: { ...valid.save, chapterIndex: 99 } }),
    JSON.stringify({ ...valid, save: { ...valid.save, player: null } })
  ];
  for (const candidate of candidates) {
    assert.throws(() => storage.import(candidate));
    assert.deepEqual(env.values, before);
  }
});

test('importer un profil seul préserve exactement la campagne locale', () => {
  const env = environment(), storage = new env.Storage();
  storage.save(campaign(env));
  const savedBytes = env.values.get(env.STORAGE_KEY);
  const profile = storage.getProfile();
  profile.archives = ['cuivre'];
  const imported = storage.import(bundle(storage, null, profile));
  assert.equal(imported.save, null);
  assert.equal(env.values.get(env.STORAGE_KEY), savedBytes);
  assert.equal(storage.getSave().player.health, 61);
  assert.deepEqual(Array.from(storage.getProfile().archives), ['cuivre']);
});

test('un import accepté charge le chapitre normalisé prévu', () => {
  const env = environment(), storage = new env.Storage();
  storage.save(campaign(env));
  const imported = storage.import(bundle(storage, campaign(env, 1, 89)));
  assert.equal(imported.save.chapterIndex, 1);
  assert.equal(storage.getSave().chapterIndex, 1);
  assert.equal(storage.getSave().player.health, 89);
});

test('le stockage refusé conserve une campagne exportable pendant la session', () => {
  const env = environment({ rejectStorage: true }), storage = new env.Storage();
  storage.save(campaign(env));
  assert.equal(storage.degraded, true);
  assert.equal(storage.getSave().player.health, 61);
  const exported = JSON.parse(storage.export());
  assert.equal(exported.save.player.health, 61);
  assert.equal(exported.schema, 'aziz-save');
});

function activeGame(env) {
  const storage = new env.Storage(), game = Object.create(env.Game.prototype);
  const initial = campaign(env);
  storage.save(initial);
  Object.assign(game, {
    storage, profile: storage.getProfile(), level: structuredClone(env.Data.CHAPTERS[0]),
    player: structuredClone(initial.player), aziz: structuredClone(initial.aziz),
    stats: structuredClone(env.DEFAULT_STATS), chapterStats: structuredClone(env.DEFAULT_CHAPTER_STATS),
    completedIds: new Set(), objectiveComplete: false, mode: 'playing', chapterIndex: 0,
    elapsed: 23, flashTime: 0, callCooldown: 0, signalCooldown: 0, hitClock: 0,
    saveClock: 17.99, toastTimer: 0, noiseEvent: null, director: { grace: 0, surge: 0, pressure: 0 },
    input: { pollGamepad: () => ({ moveX: 0, moveY: 0, turn: 0, run: false }),
      take: () => false, down: () => false, touchX: 0, touchY: 0, turn: 0, reset() {} },
    audio: { update() {}, suspend() {} },
    updateRitual() {}, updateChallenge() {}, updateEnemies() {}, updateDirector() {}, updateHud() {}
  });
  return game;
}

test('un décès dans update arrête la frame avant une autosauvegarde de l’état mort', () => {
  const env = environment(), game = activeGame(env);
  const savedBytes = env.values.get(env.STORAGE_KEY);
  game.updateEnemies = () => { game.mode = 'dying'; game.player.health = 0; };
  game.updateDirector = () => { throw new Error('Le directeur ne doit plus avancer après la mort.'); };
  game.update(0.05);
  assert.equal(game.mode, 'dying');
  assert.equal(env.values.get(env.STORAGE_KEY), savedBytes);
});

test('la vraie fin de campagne ne recrée pas la sauvegarde effacée durant la même frame', () => {
  const env = environment(), game = activeGame(env);
  game.chapterIndex = 5;
  game.level = structuredClone(env.Data.CHAPTERS[5]);
  for (const enemy of game.level.enemies) { enemy.alive = false; enemy.health = 0; }
  game.objectiveComplete = true;
  game.player.x = game.level.exit.x;
  game.player.y = game.level.exit.y;
  game.update(0.05);
  assert.equal(game.mode, 'ending');
  assert.equal(game.storage.getSave(), null);
  assert.equal(env.values.has(env.STORAGE_KEY), false);
  assert.ok(game.profile.achievements.includes('fin_campagne'));
  assert.equal(game.profile.endings.length, 1);
});

test('une update déjà en pause ne consomme aucune action ni temps de jeu', () => {
  const env = environment(), game = activeGame(env);
  game.mode = 'paused';
  game.input.take = () => { throw new Error('Les actions de jeu ne doivent pas être consommées en pause.'); };
  game.update(1);
  assert.equal(game.elapsed, 23);
  assert.equal(game.mode, 'paused');
});

test('le bouton manette maintenu après un menu ne déclenche pas une action de jeu', () => {
  const env = environment(), input = Object.create(env.Input.prototype);
  const pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  pad.buttons[0].pressed = true;
  env.pads.push(null, pad); // Le premier emplacement n'est pas forcément occupé.
  Object.assign(input, { keys: new Set(['Enter']), pressed: new Set(['Pad:interact']), turn: 4,
    touchX: 1, touchY: 1, gamepadHeld: new Map(), getGame: () => ({ mode: 'playing' }) });
  input.reset();
  input.pollGamepad();
  assert.equal(input.take('Pad:interact'), false);
  assert.equal(input.keys.size, 0);
  assert.equal(input.touchX, 0);
  pad.buttons[0].pressed = false;
  input.pollGamepad();
  pad.buttons[0].pressed = true;
  input.pollGamepad();
  assert.equal(input.take('Pad:interact'), true, 'Un nouvel appui après relâchement reste utilisable.');
});

function testRoom(objects = [], enemies = []) {
  const w = 7, h = 7;
  const grid = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) =>
    x === 0 || y === 0 || x === w - 1 || y === h - 1 ? 1 : 0));
  return { w, h, grid, objects, enemies, kind: 'seal', mechanic: 'channel', target: 2,
    exit: { x: 5.5, y: 5.5 } };
}

test('GP-005 : la canalisation charge sous le vrai faisceau puis se rompt si le joueur détourne la visée', () => {
  const env = environment(), game = activeGame(env);
  const seal = { id: 'test-seal', type: 'seal', x: 2.5, y: 3.5, progress: 0, done: false };
  game.level = testRoom([seal]);
  Object.assign(game.player, { x: 1.5, y: 3.5, a: 0 });
  game.handleObjective(seal);
  assert.ok(game.ritual);
  assert.ok(game.lightAt(seal.x, seal.y).projector > 0.02);
  env.Game.prototype.updateRitual.call(game, 0.1);
  assert.ok(seal.progress > 0 && seal.progress < 1);
  game.player.a = Math.PI;
  assert.equal(game.lightAt(seal.x, seal.y).projector, 0);
  env.Game.prototype.updateRitual.call(game, 0.1);
  assert.equal(game.ritual, null);
  assert.equal(seal.progress, 0);
});

test('GP-005 : recommencer un sceau n’hérite pas d’une charge partielle précédente', () => {
  const env = environment(), game = activeGame(env);
  const seal = { id: 'test-seal', type: 'seal', x: 2.5, y: 3.5, progress: 0.85, done: false };
  game.level = testRoom([seal]);
  game.handleObjective(seal);
  assert.ok(game.ritual);
  assert.equal(seal.progress, 0);
  assert.equal(game.ritual.remaining, game.ritual.duration);
});

test('GP-007 : un souvenir attend la disponibilité de l’appel avant de lancer son délai', () => {
  const env = environment(), game = activeGame(env);
  const memory = { id: 'test-memory', type: 'memory', label: 'La cour', x: 2.5, y: 3.5, done: false };
  game.level = { ...testRoom([memory]), kind: 'memory', mechanic: 'response' };
  game.aziz.mode = 'sweep';
  game.challenge = null;
  game.callCooldown = 2;
  game.handleObjective(memory);
  assert.equal(game.challenge, null);
  assert.equal(memory.done, false);
  game.callCooldown = 0;
  game.handleObjective(memory);
  assert.equal(game.challenge?.type, 'memory');
  assert.equal(game.challenge?.remaining, 5);
});

test('GP-006 : des scarabées derrière un mur ne drainent pas la lampe', () => {
  const env = environment(), game = activeGame(env);
  const enemy = { id: 'blocked-scarabs', type: 'scarabs', x: 3.5, y: 3.5, health: 24, alive: true, stun: 0, memory: 0 };
  game.level = testRoom([], [enemy]);
  game.level.grid[3][2] = 1;
  Object.assign(game.player, { x: 1.5, y: 3.5, a: 0, battery: 80, health: 100 });
  assert.equal(game.hasLineOfSight(game.player.x, game.player.y, enemy.x, enemy.y), false);
  env.Game.prototype.updateEnemies.call(game, 0.1, env.Data.DIFFICULTIES.expedition);
  assert.equal(game.player.battery, 80);
  assert.equal(game.player.health, 100);
});

test('les dégâts de contact sont bloqués par un angle de mur même à courte distance', () => {
  const env = environment(), game = activeGame(env);
  const enemy = { id: 'corner-ushabti', type: 'ushabti', x: 2.3, y: 1.96, health: 45, alive: true, stun: 0, memory: 0 };
  game.level = testRoom([], [enemy]);
  game.level.grid[2][2] = 1;
  Object.assign(game.player, { x: 1.96, y: 2.3, a: 0, health: 100 });
  game.audio.noise = () => {};
  assert.ok(Math.hypot(game.player.x - enemy.x, game.player.y - enemy.y) < 0.52);
  assert.equal(game.wall(game.player.x, game.player.y), false);
  assert.equal(game.wall(enemy.x, enemy.y), false);
  assert.equal(game.hasLineOfSight(game.player.x, game.player.y, enemy.x, enemy.y), false);
  env.Game.prototype.updateEnemies.call(game, 0.1, env.Data.DIFFICULTIES.expedition);
  assert.equal(game.player.health, 100);
});

for (const [type, resource, full, reduced, expected] of [['oil', 'battery', 100, 60, 94], ['flash', 'flashes', 6, 5, 6]]) {
  test(`GP-008 : ${type} reste disponible lorsque la réserve est pleine`, () => {
    const env = environment(), game = activeGame(env);
    const object = game.level.objects.find(item => item.type === type);
    assert.ok(object);
    game.level.objects = [object];
    const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const [dx, dy] = offsets.find(([dx, dy]) => !game.wall(object.x + dx, object.y + dy));
    Object.assign(game.player, { x: object.x + dx, y: object.y + dy, a: Math.atan2(-dy, -dx) });
    game.audio.tone = () => {};
    game.player[resource] = full;
    game.interact();
    assert.notEqual(object.done, true);
    assert.equal(game.completedIds.has(object.id), false);
    assert.equal(game.player[resource], full);
    game.player[resource] = reduced;
    game.interact();
    assert.equal(object.done, true);
    assert.equal(game.completedIds.has(object.id), true);
    assert.equal(game.player[resource], expected);
  });
}

test('la difficulté importée doit être une clé propre du catalogue', () => {
  const env = environment(), storage = new env.Storage();
  for (const difficulty of ['constructor', '__proto__', 'toString', 'unknown']) {
    assert.equal(storage.normalizeProfile({ difficulty }).difficulty, 'expedition');
  }
  for (const difficulty of ['exploration', 'expedition', 'eclipse']) {
    assert.equal(storage.normalizeProfile({ difficulty }).difficulty, difficulty);
  }
});
