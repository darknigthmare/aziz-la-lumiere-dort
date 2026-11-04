import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Méthodes de production et événements simulés. Ces preuves ne prétendent pas
// valider la mise en page, un vrai écran tactile ou une manette physique.
const root = new URL('../', import.meta.url);
const [dataSource, mechanicsSource, visualsSource, source] = await Promise.all(
  ['src/data.js', 'src/mechanics.js', 'src/visuals.js', 'src/game.js'].map(path => readFile(new URL(path, root), 'utf8'))
);
const declarations = source.slice(source.indexOf("  'use strict';"), source.indexOf('  class AudioEngine {'));
const classes = source.slice(source.indexOf('  class Input {'), source.indexOf('  const storage = new Storage();'));

function environment() {
  const nodes = new Map(), values = new Map(), listeners = new Map(), pads = [];
  let document;
  function makeNode(tag = 'div') {
    const events = new Map(), classes = new Set(), attrs = new Map();
    const element = {
      tagName: tag.toUpperCase(), textContent: '', children: [], style: { setProperty() {} }, dataset: {},
      classList: { add: key => classes.add(key), remove: key => classes.delete(key), contains: key => classes.has(key),
        toggle: (key, enabled) => enabled ? classes.add(key) : classes.delete(key) },
      setAttribute: (key, value) => attrs.set(key, value), getAttribute: key => attrs.get(key),
      addEventListener(name, listener) { if (!events.has(name)) events.set(name, []); events.get(name).push(listener); },
      dispatch(name, values = {}) { for (const listener of events.get(name) || []) listener({ preventDefault() {}, ...values }); },
      append(...children) { this.children.push(...children); }, replaceChildren(...children) { this.children = children; },
      querySelector(selector) {
        if (selector === 'i') return node('#touch-stick i');
        const all = this.children.flatMap(child => [child, ...descendants(child)]);
        return all.find(child => selector === 'input:checked' && child.tagName === 'INPUT' && child.checked) || null;
      },
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
      focus() { document.activeElement = this; }, setPointerCapture() {}, matches: () => false
    };
    return element;
  }
  const descendants = element => element.children.flatMap(child => [child, ...descendants(child)]);
  const node = selector => { if (!nodes.has(selector)) nodes.set(selector, makeNode()); return nodes.get(selector); };
  const buttons = ['interact', 'flash', 'call', 'signal', 'lamp', 'run', 'pause'].map(action => {
    const button = makeNode('button'); button.dataset.action = action;
    nodes.set(`#touch-controls [data-action="${action}"]`, button);
    return button;
  });
  document = { querySelector: node, querySelectorAll: selector => selector === '#touch-controls button' ? buttons : [],
    createElement: makeNode, documentElement: { dataset: {}, style: { setProperty() {} } }, body: makeNode('body'),
    exitPointerLock() {}, activeElement: null };
  const context = vm.createContext({
    document, structuredClone, queueMicrotask, setTimeout() {}, requestAnimationFrame() {},
    navigator: { getGamepads: () => pads, maxTouchPoints: 0 }, matchMedia: () => ({ matches: false }),
    innerWidth: 320, innerHeight: 640, devicePixelRatio: 1,
    addEventListener(name, listener) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(listener); },
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) },
    updateContinueButton() {}, syncModalState() {}, openPanel() {}
  });
  vm.runInContext('globalThis.window = globalThis;', context);
  vm.runInContext(dataSource, context);
  vm.runInContext(mechanicsSource, context);
  vm.runInContext(visualsSource, context);
  vm.runInContext(`${declarations}\n${classes}\nglobalThis.TEST = { Storage, Input, Game, Data, DEFAULT_STATS, DEFAULT_CHAPTER_STATS, DEFAULT_BINDINGS, normalizeBindings, remapBinding, actionKeys, actionCodes, actionLabel, collectionEntries, notebookEntries };`, context);
  const fire = (name, event = {}) => { for (const listener of listeners.get(name) || []) listener({ preventDefault() {}, ...event }); };
  return { ...context.TEST, context, nodes, node, buttons, pads, values, fire, document };
}

function activeGame(env, chapterIndex = 0) {
  const game = Object.create(env.Game.prototype), storage = new env.Storage(), profile = storage.getProfile();
  const input = new env.Input(env.node('#game-canvas'), () => game, () => profile);
  Object.assign(game, {
    storage, profile, input, level: structuredClone(env.Data.CHAPTERS[chapterIndex]), chapterIndex,
    player: { ...env.Data.CHAPTERS[chapterIndex].start, health: 100, battery: 100, flashes: 3, lampOn: true, calm: 100 },
    aziz: { wake: 100, trust: 80, corruption: 0, sync: 80, mode: 'focus' },
    stats: structuredClone(env.DEFAULT_STATS), chapterStats: structuredClone(env.DEFAULT_CHAPTER_STATS),
    completedIds: new Set(), objectiveCount: 0, objectiveComplete: false, mode: 'playing', elapsed: 0,
    flashTime: 0, callCooldown: 0, signalCooldown: 0, hitClock: 0, stepClock: 0, saveClock: 0, toastTimer: 0,
    director: { grace: 0, surge: 0, pressure: 0 },
    audio: { step() {}, tone() {}, update() {} }, updateRitual() {}, updateChallenge() {}, updateEnemies() {}, updateDirector() {}, updateHud() {}, checkExit() {},
    movePlayer(x, y) { this.player.x = x; this.player.y = y; }
  });
  return game;
}

test('WD-021 : rotation au clavier et action remappée commandent le vrai update', () => {
  const env = environment(), game = activeGame(env), input = game.input;
  const initial = { ...game.player };
  input.keys.add('ArrowLeft');
  game.update(.1);
  assert.ok(game.player.a < initial.a);
  assert.equal(game.player.x, initial.x);
  assert.equal(game.player.y, initial.y);
  input.keys.clear();
  assert.equal(env.remapBinding(game.profile, 'interact', 'KeyH'), '');
  let interactions = 0;
  game.interact = () => interactions++;
  input.pressed.add('KeyE'); game.update(.1);
  assert.equal(interactions, 0);
  input.pressed.add('KeyH'); game.update(.1); game.update(.1);
  assert.equal(interactions, 1);
});

test('WD-021 : conflits, touches réservées et répétition ne créent pas d’action inattendue', () => {
  const env = environment(), game = activeGame(env), before = JSON.stringify(game.profile.options.bindings);
  assert.match(env.remapBinding(game.profile, 'interact', 'KeyF'), /déjà utilisée/);
  assert.match(env.remapBinding(game.profile, 'interact', 'Escape'), /réservée/);
  assert.equal(JSON.stringify(game.profile.options.bindings), before);
  env.fire('keydown', { code: 'KeyE', target: env.node('#game-canvas') });
  assert.equal(game.input.take('KeyE'), true);
  env.fire('keydown', { code: 'KeyE', repeat: true, target: env.node('#game-canvas') });
  assert.equal(game.input.take('KeyE'), false);
  game.input.reset();
  env.fire('keydown', { code: 'KeyE', repeat: true, target: env.node('#game-canvas') });
  assert.equal(game.input.take('KeyE'), false, 'Un appui maintenu lors d’un menu attend un nouvel appui.');
  const broken = { ...game.profile.options.bindings, call: ['KeyE'] };
  assert.equal(JSON.stringify(env.normalizeBindings(broken)), JSON.stringify(env.DEFAULT_BINDINGS));
});

test('WD-021/024/039 : touches, réglages tactiles et carnet survivent au rechargement et à l’import', () => {
  const env = environment(), storage = new env.Storage(), profile = storage.getProfile();
  env.remapBinding(profile, 'signal', 'KeyV');
  profile.options.touchScale = 1.2; profile.options.touchSide = 'left'; profile.options.touchSprint = 'hold';
  const inscription = env.Data.CHAPTERS[0].objects.find(object => object.type === 'inscription');
  profile.notebook = [inscription.id, inscription.id, 'not-a-note'];
  profile.notebookRecent = { chapterId: 'noms', text: 'La note reste lisible.' };
  storage.saveProfile(profile);
  const loaded = new env.Storage().getProfile();
  assert.deepEqual(Array.from(loaded.options.bindings.signal), ['KeyV']);
  assert.equal(loaded.options.touchScale, 1.2); assert.equal(loaded.options.touchSide, 'left');
  const other = environment(), imported = new other.Storage().import(storage.export()).profile;
  assert.deepEqual(Array.from(imported.notebook), [inscription.id]);
  assert.equal(imported.notebookRecent.text, 'La note reste lisible.');
  assert.equal(imported.options.touchSprint, 'hold');
  assert.deepEqual(Array.from(imported.options.bindings.signal), ['KeyV']);
  const legacy = storage.normalizeProfile({ archives: [], achievements: [], endings: [] });
  assert.deepEqual(Array.from(legacy.notebook), []);
  assert.equal(legacy.options.touchScale, 1);
  assert.deepEqual(Array.from(legacy.options.bindings.turnRight), ['ArrowRight']);
});

test('WD-023 : une manette connectée ou maintenue ne vole pas les indications du périphérique actif', () => {
  const env = environment(), game = activeGame(env), input = game.input;
  const pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  env.pads.push(pad);
  input.setDevice('touch'); input.pollGamepad();
  assert.equal(input.lastDevice, 'touch');
  pad.buttons[0].pressed = true; input.pollGamepad();
  assert.equal(input.lastDevice, 'gamepad');
  input.setDevice('keyboard'); input.pollGamepad();
  assert.equal(input.lastDevice, 'keyboard');
  pad.buttons[0].pressed = false; input.pollGamepad();
  pad.axes[2] = .8; input.pollGamepad();
  assert.equal(input.lastDevice, 'gamepad');
  env.remapBinding(game.profile, 'interact', 'KeyH');
  assert.equal(env.actionLabel(game.profile, 'keyboard', 'interact'), 'H');
  assert.equal(env.actionLabel(game.profile, 'touch', 'interact'), 'EXAMINER');
  assert.equal(env.actionLabel(game.profile, 'gamepad', 'interact'), 'A / Croix');
});

test('WD-024 : déplacement, visée et course tactile restent indépendants avec trois contacts', () => {
  const env = environment(), game = activeGame(env), input = game.input;
  const stick = env.node('#touch-stick'), canvas = env.node('#game-canvas'), sprint = env.node('#touch-controls [data-action="run"]');
  const first = { identifier: 1, clientX: 50, clientY: 18 };
  stick.dispatch('touchstart', { changedTouches: [first] });
  assert.equal(input.touchY, -1);
  canvas.dispatch('touchstart', { changedTouches: [{ identifier: 2, clientX: 200, clientY: 100 }] });
  sprint.dispatch('pointerdown', { pointerId: 3, pointerType: 'touch' });
  assert.equal(input.touchSprintActive, true);
  stick.dispatch('touchstart', { changedTouches: [{ identifier: 4, clientX: 0, clientY: 0 }] });
  stick.dispatch('touchmove', { changedTouches: [{ identifier: 4, clientX: 12, clientY: 12 }] });
  stick.dispatch('touchend', { changedTouches: [{ identifier: 4 }] });
  assert.equal(input.touchY, -1, 'Un contact étranger ne remplace ni ne relâche le joystick.');
  canvas.dispatch('touchmove', { changedTouches: [{ identifier: 2, clientX: 220, clientY: 100 }] });
  assert.ok(input.turn > 0);
  const initial = { ...game.player };
  game.update(.1);
  assert.ok(Math.abs(Math.hypot(game.player.x - initial.x, game.player.y - initial.y) - 2.08 * 1.58 * .1) < 1e-9);
  input.reset();
  assert.equal(input.touchSprintActive, false); assert.equal(input.touchY, 0); assert.equal(input.turn, 0);
  game.profile.options.touchSprint = 'hold';
  sprint.dispatch('pointerdown', { pointerId: 5 });
  env.fire('pointerup', { pointerId: 6 });
  assert.equal(input.touchSprintActive, true);
  env.fire('pointercancel', { pointerId: 5 });
  assert.equal(input.touchSprintActive, false);
  canvas.dispatch('touchmove', { changedTouches: [{ identifier: 2, clientX: 280, clientY: 100 }] });
  assert.equal(input.turn, 0, 'Le regard antérieur à la pause a été libéré.');
});

test('WD-030 : filtres exacts, conditions publiques et fins non découvertes sans divulgation', () => {
  const env = environment(), profile = new env.Storage().getProfile();
  profile.archives = ['registre']; profile.achievements = ['premiere_lumiere']; profile.endings = ['guardian'];
  assert.equal(env.collectionEntries(profile).length, 18);
  assert.equal(env.collectionEntries(profile, { category: 'achievements' }).length, 16);
  assert.equal(env.collectionEntries(profile, { category: 'endings' }).length, 4);
  assert.equal(env.collectionEntries(profile, { chapter: '0', filter: 'found' }).length, 1);
  assert.equal(env.collectionEntries(profile, { chapter: '0', filter: 'missing' }).length, 2);
  const locked = env.collectionEntries(profile, { category: 'achievements', filter: 'missing' });
  assert.equal(locked.length, 15);
  assert.ok(locked.find(item => item.id === 'archiviste').text.includes('18 archives'));
  const endings = env.collectionEntries(profile, { category: 'endings', filter: 'missing' });
  for (const ending of endings) {
    assert.equal(ending.title, 'Fin non découverte');
    assert.equal(ending.text.includes(env.Data.ENDINGS[ending.id].text), false);
    assert.equal(ending.text.includes(env.Data.ENDINGS[ending.id].title), false);
  }
  assert.equal(env.collectionEntries(profile, { category: 'endings', filter: 'found' })[0].text, env.Data.ENDINGS.guardian.text);
});

test('WD-039 : une vraie inscription lue reste au carnet, sans ajouter les autres indices', () => {
  const env = environment(), game = activeGame(env);
  game.profile.difficulty = 'eclipse';
  const inscription = game.level.objects.find(object => object.type === 'inscription');
  game.nearestObject = () => inscription;
  env.Game.prototype.interact.call(game);
  assert.equal(inscription.done, true);
  const loaded = game.storage.getProfile();
  const notes = env.notebookEntries(loaded);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].entries.length, 1);
  assert.equal(notes[0].entries[0].text, inscription.text);
  assert.equal(JSON.stringify(notes).includes(env.Data.CHAPTERS[4].hint), false);
  const exported = JSON.parse(game.storage.export());
  assert.ok(exported.profile.notebook.includes(inscription.id));
  assert.equal(exported.save.objectStates[inscription.id].done, true);
});

test('WD-039 : seule une orientation révélée entre dans le carnet des mécanismes', () => {
  const env = environment(), game = activeGame(env, 1);
  const mirror = game.level.objects.find(object => object.type === 'mirror');
  game.recordDiscovery(mirror);
  assert.equal(env.notebookEntries(game.profile).length, 0);
  game.aziz.mode = 'sweep';
  env.Game.prototype.handleObjective.call(game, mirror);
  const notes = env.notebookEntries(game.storage.getProfile());
  assert.equal(notes.length, 1); assert.equal(notes[0].entries.length, 1);
  assert.equal(notes[0].entries[0].title, mirror.label);
  assert.match(notes[0].entries[0].text, /Orientation constatée/);
});

test('WD-039 : charger une ancienne campagne récupère les inscriptions déjà lues dans le chapitre', () => {
  const env = environment(), game = activeGame(env);
  const inscription = game.level.objects.find(object => object.type === 'inscription');
  const legacy = game.snapshot();
  legacy.objectStates[inscription.id].done = true;
  legacy.completedIds.push(inscription.id);
  delete game.profile.notebook;
  game.resize = () => {};
  game.updateTutorial = () => {};
  game.loadChapter(0, legacy, false);
  assert.deepEqual(Array.from(game.storage.getProfile().notebook), [inscription.id]);
  assert.equal(env.notebookEntries(game.profile)[0].entries[0].text, inscription.text);
});

test('WD-040 : les trois difficultés expliquées se sélectionnent et se sauvegardent avant le départ', () => {
  const env = environment();
  const prologue = source.slice(source.indexOf('  function showPrologue('), source.indexOf('  function refreshActionHints('));
  const summary = source.slice(source.indexOf('  function formatSaveSummary('), source.indexOf('  function applyOptions('));
  const launch = source.slice(source.indexOf("  $('#begin-expedition').onclick ="), source.indexOf("  $('#cancel-expedition').onclick ="));
  vm.runInContext(`const storage = new Storage(); const profile = storage.getProfile();
    const input = { reset() {} }; let lastFocused; let expeditionDifficulty = profile.difficulty;
    function refreshActionHints() {}
    const launches = []; function begin(index) { launches.push({ index, difficulty: profile.difficulty }); }
    ${summary}\n${prologue}\n${launch}\nglobalThis.UI = { showPrologue, launches, profile, storage, formatSaveSummary };`, env.context);
  for (const key of Object.keys(env.Data.DIFFICULTIES)) {
    env.context.UI.showPrologue();
    const choices = env.node('#expedition-difficulties').children;
    assert.equal(choices.length, 3);
    for (const choice of choices) assert.match(choice.children[1].children[1].textContent, /Dégâts reçus.*consommation de lampe/);
    const radio = choices.map(choice => choice.children[0]).find(radio => radio.value === key);
    for (const choice of choices) choice.children[0].checked = false;
    radio.checked = true; radio.onchange();
    env.node('#begin-expedition').onclick();
    assert.equal(env.context.UI.launches.at(-1).difficulty, key);
    assert.equal(env.context.UI.storage.getProfile().difficulty, key);
    env.context.UI.showPrologue();
    assert.equal(env.document.activeElement.value, key, 'Le choix enregistré est présélectionné à la réouverture.');
  }
  assert.match(env.context.UI.formatSaveSummary({ chapterIndex: 0, difficulty: 'exploration', elapsed: 1, completedIds: [], objectStates: {} }), /Exploration/,
    'La carte de reprise privilégie le mode de la campagne lorsque le dossier le fournit.');
  assert.match(env.context.UI.formatSaveSummary({ chapterIndex: 1, difficulty: 'eclipse', elapsed: 1, campaignElapsed: 125, completedIds: [], objectStates: {} }), /02:05 de campagne/,
    'Le résumé conserve le temps cumulé, distinct du temps local du chapitre.');
});

test('WD-008 : le passage montre sa destination et la collecte avant ouverture sans traverser un mur ni avancer la campagne', () => {
  const env = environment(), game = activeGame(env);
  game.level = { ...game.level, w: 7, h: 5, objects: [], enemies: [], exit: { x: 4.5, y: 2.5 },
    grid: Array.from({ length: 5 }, (_, y) => Array.from({ length: 7 }, (_, x) => x === 0 || y === 0 || x === 6 || y === 4 ? 1 : 0)) };
  Object.assign(game.player, { x: 2.5, y: 2.5, a: 0 });
  game.profile.archives = [env.Data.ARCHIVES.find(archive => archive.chapter === 0).id];
  const draw = () => env.Game.prototype.updateHud.call(game);
  draw();
  assert.match(env.node('#prompt').textContent, /PASSAGE SCELLÉ/);
  assert.ok(env.node('#prompt').textContent.includes(env.Data.CHAPTERS[1].title));
  assert.match(env.node('#prompt').textContent, /0\/2 mécanismes.*1\/3 archives/);
  env.Game.prototype.checkExit.call(game);
  assert.equal(game.chapterIndex, 0);
  game.objectiveComplete = true; game.objectiveCount = game.level.target;
  draw();
  assert.match(env.node('#prompt').textContent, /PASSAGE OUVERT/);
  env.Game.prototype.checkExit.call(game);
  assert.equal(game.chapterIndex, 0, 'Lire la porte ne déclenche pas le passage à distance.');
  game.level.grid[2][3] = 1;
  draw();
  assert.equal(env.node('#prompt').classList.contains('visible'), false);
  game.level.grid[2][3] = 0; game.player.a = Math.PI;
  draw();
  assert.equal(env.node('#prompt').classList.contains('visible'), false);
});
