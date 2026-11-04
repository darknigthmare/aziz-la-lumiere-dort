import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Tests Node du code de production avec un contexte Canvas espion.
// Ils vérifient la sélection des sprites, les masques géométriques et le temps
// de simulation. Ils ne remplacent ni un navigateur ni une validation visuelle.
const root = new URL('../', import.meta.url);
const [dataSource, mechanicsSource, visualsSource, gameSource] = await Promise.all(
  ['src/data.js', 'src/mechanics.js', 'src/visuals.js', 'src/game.js'].map(path => readFile(new URL(path, root), 'utf8'))
);
const declarationsStart = gameSource.indexOf("  'use strict';");
const declarationsEnd = gameSource.indexOf('  class Storage {');
const classStart = gameSource.indexOf('  class Game {');
const classEnd = gameSource.indexOf('  const storage = new Storage();', classStart);
assert.ok(classStart >= 0 && classEnd > classStart, 'La classe Game doit être extraite du code de production.');
const context = vm.createContext({ structuredClone });
vm.runInContext('globalThis.window = globalThis;', context);
vm.runInContext(dataSource, context);
vm.runInContext(mechanicsSource, context);
vm.runInContext(visualsSource, context);
vm.runInContext(`
  ${gameSource.slice(declarationsStart, declarationsEnd)}
  ${gameSource.slice(classStart, classEnd)}
  globalThis.TestGame = Game;
`, context);
const Game = context.TestGame;
const Data = context.AZIZ_DATA;
const Visuals = context.AZIZ_VISUALS;

class CanvasRecorder {
  constructor() {
    this.path = [];
    this.clipRects = null;
    this.stack = [];
    this.draws = [];
    this.fills = [];
    this.filters = [];
    this.commands = [];
    this.globalAlpha = 1;
    this.fillStyle = '#000';
    this.strokeStyle = '#000';
    this.lineWidth = 1;
  }
  save() { this.stack.push({ clipRects: this.clipRects, globalAlpha: this.globalAlpha,
    fillStyle: this.fillStyle, strokeStyle: this.strokeStyle, lineWidth: this.lineWidth }); }
  restore() { Object.assign(this, this.stack.pop()); }
  record(name, args) { this.commands.push({ name, args: [...args], fill: this.fillStyle, stroke: this.strokeStyle }); }
  beginPath() { this.path = []; this.record('beginPath', []); }
  rect(x, y, width, height) { this.path.push({ x, y, width, height }); }
  clip() { this.clipRects = this.path.map(rect => ({ ...rect })); }
  createLinearGradient() { return { addColorStop() {} }; }
  createRadialGradient() { return { addColorStop() {} }; }
  translate(...args) { this.record('translate', args); }
  rotate(...args) { this.record('rotate', args); }
  scale(...args) { this.record('scale', args); }
  fillRect(x, y, width, height) { this.fills.push({ x, y, width, height, color: this.fillStyle }); this.record('fillRect', [x, y, width, height]); }
  set filter(value) { this.filters.push(value); }
  moveTo(...args) { this.record('moveTo', args); }
  lineTo(...args) { this.record('lineTo', args); }
  quadraticCurveTo(...args) { this.record('quadraticCurveTo', args); }
  closePath() { this.record('closePath', []); }
  fill() { this.record('fill', []); }
  stroke() { this.record('stroke', []); }
  ellipse(...args) { this.record('ellipse', args); }
  arc(...args) { this.record('arc', args); }
}

function openLevel(objects = []) {
  const w = 7, h = 7;
  const grid = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) =>
    x === 0 || y === 0 || x === w - 1 || y === h - 1 ? 1 : 0));
  return { w, h, grid, objects, enemies: [], kind: 'mirror', target: 4, exit: { x: 5.5, y: 5.5 } };
}

function scene(level, player = { x: 1.5, y: 3.5, a: 0 }) {
  const game = Object.create(Game.prototype);
  Object.assign(game, {
    canvas: { width: 1280, height: 720 },
    ctx: new CanvasRecorder(),
    level: structuredClone(level),
    profile: { difficulty: 'expedition', options: { fov: 66, quality: 'high', reduceMotion: true, highContrast: false } },
    player: { ...player, calm: 100, health: 100, lampOn: false, battery: 100 },
    aziz: { wake: 100, trust: 75, corruption: 0, sync: 80, mode: 'focus' },
    depth: new Float32Array(0),
    objectiveComplete: false,
    elapsed: 0,
    flashTime: 0,
    challenge: null
  });
  game.drawObjectSprite = function (ctx, sprite, size) {
    ctx.draws.push({ ...sprite, size,
      clipRects: ctx.clipRects?.map(rect => ({ ...rect })) || null });
    return Game.prototype.drawObjectSprite.call(this, ctx, sprite, size);
  };
  game.drawViewmodel = function (...args) {
    const start = this.ctx.commands.length;
    Game.prototype.drawViewmodel.call(this, ...args);
    this.ctx.viewmodelCommands = this.ctx.commands.slice(start);
  };
  return game;
}

test('WD-045 : le miroir excentré reste dessiné devant un mur plus éloigné', () => {
  const level = structuredClone(Data.CHAPTERS[1]);
  level.objects = level.objects.filter(object => object.id === 'miroirs-objective-4');
  level.enemies = [];
  const game = scene(level, { x: 7.5, y: 3.5, a: 2.0535900500422257 });
  assert.equal(game.hasLineOfSight(7.5, 3.5, 1.5, 7.5), true);
  game.render();
  const mirror = game.ctx.draws.find(draw => draw.id === 'miroirs-objective-4');
  assert.ok(mirror, 'Le miroir du cas réel ne doit plus disparaître en bord de vue.');
  assert.ok(mirror.clipRects?.length, 'Le dessin utilise un masque de visibilité.');
  assert.equal(game.ctx.stack.length, 0, 'Le contexte Canvas est restauré.');
});

test('WD-045 : un angle de mur masque seulement la moitié occultée du sprite', () => {
  const level = openLevel([{ id: 'corner-mirror', type: 'mirror', x: 4.5, y: 2.9, orientation: 0 }]);
  level.grid[2][3] = 1;
  const game = scene(level);
  game.render();
  const sprite = game.ctx.draws.find(draw => draw.id === 'corner-mirror');
  assert.ok(sprite, 'La partie dégagée du miroir doit rester dessinée.');
  const centerX = 640 - .6 / 3 * (1280 / (2 * Math.tan(66 * Math.PI / 360)));
  const covers = x => sprite.clipRects?.some(rect => x >= rect.x && x < rect.x + rect.width);
  assert.equal(covers(centerX - 20), false, 'Le côté gauche situé derrière le mur est exclu.');
  assert.equal(covers(centerX + 20), true, 'Le côté droit dégagé est conservé.');
  assert.equal(game.ctx.stack.length, 0);
});

test('WD-009 : les objets architecturaux utilisés restent visibles, les collectables ramassés disparaissent', () => {
  const retained = ['seal', 'mirror', 'echo', 'memory', 'pylon', 'finalMirror', 'bell', 'door', 'inscription'];
  const collected = ['archive', 'oil', 'flash'];
  const objects = [...retained, ...collected].map(type => ({
    id: `used-${type}`, type, x: 4.5, y: 3.5, orientation: 0, done: true, used: true
  }));
  const game = scene(openLevel(objects));
  game.render();
  const drawn = new Set(game.ctx.draws.map(draw => draw.type));
  for (const type of retained) assert.ok(drawn.has(type), `${type} doit conserver son support visuel après usage.`);
  for (const type of collected) assert.equal(drawn.has(type), false, `${type} ramassé ne doit pas réapparaître.`);
  assert.ok(game.level.objects.every(object => object.done && object.used), 'Le rendu ne réinitialise aucune récompense.');
});

test('WD-009 : une cloche épuisée encore ciblable possède toujours un sprite', () => {
  const game = scene(openLevel([{ id: 'spent-bell', type: 'bell', x: 2.5, y: 3.5, done: true, used: true }]));
  assert.equal(game.nearestObject()?.id, 'spent-bell');
  game.render();
  assert.ok(game.ctx.draws.some(draw => draw.id === 'spent-bell'));
});

test('WD-008 : le passage existe aussi avant le déverrouillage', () => {
  const game = scene(openLevel());
  game.level.exit = { x: 4.5, y: 3.5 };
  game.render();
  assert.ok(game.ctx.draws.some(draw => draw.type === 'exit'), 'Le passage fermé doit avoir une représentation physique.');
  assert.equal(game.ctx.draws.find(draw => draw.type === 'exit').open, false);
  game.objectiveComplete = true;
  game.ctx.draws = [];
  game.render();
  assert.equal(game.ctx.draws.find(draw => draw.type === 'exit').open, true);
  assert.deepEqual(game.level.exit, { x: 4.5, y: 3.5 }, 'La représentation du passage ne modifie pas les données du chapitre.');
});

test('WD-008 : le passage final reste physiquement fermé tant que le Pharaon vit', () => {
  const level = openLevel();
  level.finale = true;
  level.exit = { x: 4.5, y: 3.5 };
  level.enemies = [{ id: 'final-pharaoh', type: 'pharaoh', x: 4.5, y: 5.5, alive: true }];
  const game = scene(level);
  game.objectiveComplete = true;
  game.render();
  const heldExit = game.ctx.draws.find(draw => draw.type === 'exit');
  assert.ok(heldExit, 'Le passage reste présent pendant le combat final.');
  assert.equal(heldExit.open, false, 'Les miroirs alignés ne suffisent pas à ouvrir le passage final.');
  game.level.enemies[0].alive = false;
  game.ctx.draws = [];
  game.render();
  const openExit = game.ctx.draws.find(draw => draw.type === 'exit');
  assert.equal(openExit.open, true, 'Le passage s’ouvre après le bannissement.');
  assert.notEqual(openExit.color, heldExit.color);
  assert.equal(game.objectiveComplete, true, 'Le rendu ne modifie pas la progression.');
});

test('WD-010/011 : chaque famille utilise une géométrie propre et le magnésium reste une plaque', () => {
  const families = ['archive', 'oil', 'flash', 'seal', 'mirror', 'echo', 'memory', 'pylon', 'finalMirror', 'bell', 'door', 'inscription', 'exit'];
  const silhouettes = new Set();
  for (const type of families) {
    const ctx = new CanvasRecorder();
    Visuals.drawProp(ctx, { type, orientation: 0, color: '#888' }, 100);
    const geometry = ctx.commands.filter(command => ['fillRect', 'moveTo', 'lineTo', 'quadraticCurveTo', 'ellipse'].includes(command.name))
      .map(({ name, args }) => [name, ...args]);
    silhouettes.add(JSON.stringify(geometry));
    assert.equal(ctx.stack.length, 0);
  }
  assert.equal(silhouettes.size, families.length, 'Les silhouettes doivent différer même sans leurs couleurs.');
  assert.ok(Visuals.PROPS.flash.width > Visuals.PROPS.oil.width);
  assert.ok(Visuals.PROPS.flash.height < Visuals.PROPS.oil.height / 2);
  const actualFamilies = new Set(Data.CHAPTERS.flatMap(level => level.objects.map(object => object.type)));
  for (const type of actualFamilies) assert.ok(Object.hasOwn(Visuals.PROPS, type), `Dimensions explicites requises : ${type}`);
});

test('WD-011 : seule l’aiguille du miroir tourne et l’état utilisé ajoute une coche', () => {
  const draw = (orientation, done = false) => {
    const ctx = new CanvasRecorder();
    Visuals.drawProp(ctx, { type: 'mirror', orientation, done, color: '#aaa' }, 100);
    return ctx.commands;
  };
  const north = draw(0), east = draw(1), used = draw(1, true);
  const rotation = east.findIndex(command => command.name === 'rotate');
  assert.ok(rotation > 0);
  assert.deepEqual(east.slice(0, rotation), north.slice(0, rotation), 'Le socle et les repères cardinaux restent immobiles.');
  assert.equal(east[rotation].args[0], Math.PI / 2);
  assert.ok(used.length > east.length, 'L’état validé possède un signe géométrique supplémentaire.');
});

test('WD-011 : révélation, désalignement et charge dérivent seulement des états du jeu', () => {
  const ctx = new CanvasRecorder();
  const sprite = { type: 'mirror', orientation: 1, targetOrientation: 2, attempts: 1, color: '#aaa' };
  Visuals.drawProp(ctx, sprite, 100);
  assert.equal(ctx.commands.some(command => command.name === 'fill' && command.fill === '#ecdfb1'), false, 'La cible cachée ne doit pas être divulguée.');
  assert.ok(ctx.commands.some(command => command.name === 'stroke' && command.stroke === '#c3966c'), 'Un miroir essayé mais désaligné porte une croix.');
  ctx.commands = [];
  Visuals.drawProp(ctx, { ...sprite, revealed: true }, 100);
  assert.ok(ctx.commands.some(command => command.name === 'fill' && command.fill === '#ecdfb1'));
  assert.equal(sprite.revealed, undefined, 'Le dessin ne révèle pas le mécanisme.');

  const game = scene(openLevel([{ id: 'charging', type: 'seal', x: 4.5, y: 3.5, progress: .5 }]));
  game.ritual = { id: 'charging', duration: 2.4, remaining: 1.2 };
  game.render();
  assert.equal(game.ctx.draws.find(draw => draw.id === 'charging').active, true);
  assert.ok(game.ctx.fills.some(fill => fill.color === '#e6d390' && fill.width === .15));
  assert.equal(game.level.objects[0].progress, .5);
  assert.equal(game.ritual.remaining, 1.2);
});

test('WD-013 : la projection et les appuis au sol suivent les résolutions et le FOV', () => {
  for (const [width, height] of [[320, 568], [640, 360], [1280, 720], [2560, 1080]]) {
    for (const fov of [50, 66, 90]) {
      const game = scene(openLevel(['oil', 'flash', 'mirror', 'pylon'].map(type => ({ id: type, type, x: 5.5, y: 3.5 }))));
      game.canvas = { width, height };
      game.profile.options.fov = fov;
      game.render();
      const focal = width / (2 * Math.tan(fov * Math.PI / 360));
      for (const type of ['oil', 'flash', 'mirror', 'pylon']) {
        const draw = game.ctx.draws.find(item => item.id === type);
        assert.ok(draw, `${type} doit être projeté à ${width}×${height}, FOV ${fov}.`);
        assert.ok(Math.abs(draw.size - focal / 4) < 1e-8);
        assert.ok(Math.abs(draw.baseY - (height / 2 + Visuals.WORLD.eyeHeight * focal / 4)) < 1e-8);
        assert.ok(Math.abs((draw.baseY - draw.top) / draw.size - Visuals.PROPS[type].height) < 1e-8);
        assert.ok(game.ctx.commands.some(command => command.name === 'translate' && command.args[0] === draw.screenX && command.args[1] === draw.baseY));
      }
      assert.ok([...game.depth].every(value => Number.isFinite(value) && value > 0));
      assert.equal(game.ctx.stack.length, 0);
    }
  }
});

test('WD-013/045 : perspective latérale, changement de distance et plan proche cohérents', () => {
  const camera = Visuals.createCamera(1280, 720, Math.PI / 2);
  const player = { x: 0, y: 0, a: 0 };
  const dimensions = Visuals.PROPS.mirror;
  const near = Visuals.projectSprite(camera, player, { x: 2, y: 0 }, dimensions);
  const far = Visuals.projectSprite(camera, player, { x: 4, y: 0 }, dimensions);
  const side = Visuals.projectSprite(camera, player, { x: 4, y: 2 }, dimensions);
  assert.ok(Math.abs(near.scale / far.scale - 2) < 1e-10, 'Doubler la profondeur divise la taille par deux.');
  assert.equal(far.scale, side.scale, 'Une même profondeur conserve la taille sur le plan image.');
  assert.ok(Math.abs(side.screenX - 960) < 1e-8, 'Le décalage latéral suit la projection perspective.');
  assert.equal(Visuals.projectSprite(camera, player, { x: 0, y: 0 }, dimensions), null);
  assert.equal(Visuals.projectSprite(camera, player, { x: -2, y: 0 }, dimensions), null);
});

test('WD-045 : un mur plein masque aussi le passage fermé et les nouvelles silhouettes', () => {
  const level = openLevel([{ id: 'behind-wall', type: 'pylon', x: 4.5, y: 3.5 }]);
  level.exit = { x: 4.5, y: 3.5 };
  for (let y = 1; y < 6; y++) level.grid[y][3] = 1;
  const game = scene(level);
  game.render();
  assert.equal(game.ctx.draws.length, 0);
});

test('WD-016 : les accessoires FPS restent fixes malgré FOV, angle, temps et tremblement', () => {
  const game = scene(openLevel());
  game.render();
  const initial = game.ctx.viewmodelCommands;
  game.player.a = 1.2;
  game.player.calm = 12;
  game.elapsed = 19.8;
  game.profile.options.fov = 90;
  game.profile.options.reduceMotion = false;
  game.render();
  assert.deepEqual(game.ctx.viewmodelCommands, initial);
  game.profile.options.reduceMotion = true;
  game.render();
  assert.deepEqual(game.ctx.viewmodelCommands, initial);
  for (const [width, height] of [[320, 568], [640, 360], [1280, 720], [2560, 1080]]) {
    const layout = Visuals.viewmodelLayout(width, height);
    assert.ok(layout.x - .40 * layout.scale > width / 2, 'Les accessoires laissent libre le réticule.');
    assert.ok(layout.x + .49 * layout.scale < width, 'La lampe reste à l’intérieur du viewport.');
    assert.ok(layout.y - .96 * layout.scale > height / 2);
  }
});

test('WD-016 : la lampe tenue et son éclairage respectent l’épuisement de batterie', () => {
  const game = scene(openLevel());
  game.player.lampOn = true;
  game.player.battery = 0;
  game.render();
  assert.equal(game.ctx.viewmodelCommands.some(command => command.name === 'fill' && command.fill === '#e8cf8c'), false);
  const walls = game.ctx.fills.filter(fill => typeof fill.color === 'string' && fill.color.startsWith('rgb('));
  game.player.lampOn = false;
  game.ctx.fills = [];
  game.render();
  assert.deepEqual(game.ctx.fills.filter(fill => typeof fill.color === 'string' && fill.color.startsWith('rgb(')), walls);
  game.player.lampOn = true;
  game.player.battery = 100;
  game.render();
  assert.ok(game.ctx.viewmodelCommands.some(command => command.name === 'fill' && command.fill === '#e8cf8c'));
});

test('WD-025 : la réduction des éclats supprime le flash et le voile plein écran', () => {
  const game = scene(openLevel());
  game.profile.options.reduceFlashes = true;
  game.flashTime = .24;
  game.challenge = { type: 'veil' };
  game.render();
  const screens = game.ctx.fills.filter(fill => fill.width >= game.canvas.width && fill.height === game.canvas.height);
  assert.equal(screens.some(fill => typeof fill.color === 'string' && /^rgba\((255,239,197|215,210,190),/.test(fill.color)), false);
  assert.equal(game.flashTime, .24, 'Le réglage visuel ne consomme pas le magnésium.');
  assert.ok(game.ctx.viewmodelCommands.some(command => command.name === 'fill' && command.fill === '#d9e0d8'), 'Le magnésium garde un témoin local.');
  assert.ok(game.ctx.viewmodelCommands.some(command => command.name === 'stroke' && command.stroke === '#c9c1ac'), 'Le voile garde un témoin local.');
});

test('WD-025 : le lien faible est indiqué sans clignotement plein écran', () => {
  const game = scene(openLevel());
  game.profile.options.reduceFlashes = true;
  game.aziz = { wake: 0, trust: 0, corruption: 0, sync: 0, mode: 'sweep' };
  for (const elapsed of [0, .25, 7 / 12]) {
    game.elapsed = elapsed;
    game.ctx.fills = [];
    game.render();
    const darkenings = game.ctx.fills.filter(fill => fill.width >= game.canvas.width && fill.height === game.canvas.height && typeof fill.color === 'string' && fill.color.startsWith('rgba(0,0,0,'));
    assert.equal(darkenings.length, 0);
    assert.ok(game.ctx.viewmodelCommands.some(command => command.name === 'fillRect' && command.fill === '#b7814c'));
  }
});

test('WD-025 : le réglage par défaut conserve le flash et réduit le mouvement du voile si demandé', () => {
  const game = scene(openLevel());
  game.flashTime = .24;
  game.challenge = { type: 'veil' };
  game.elapsed = 5;
  game.render();
  assert.ok(game.ctx.fills.some(fill => typeof fill.color === 'string' && fill.color.startsWith('rgba(255,239,197,')));
  assert.ok(game.ctx.fills.some(fill => fill.color === 'rgba(215,210,190,0.025)'));
});

test('WD-018 : la luminosité bornée est appliquée au contexte de rendu', () => {
  const game = scene(openLevel());
  game.profile.options.brightness = 5;
  game.render();
  assert.ok(game.ctx.filters.some(filter => filter.includes('brightness(1.6)')));
  assert.equal(game.ctx.filters.at(-1), game.ctx.filters[0], 'Le matériel et le monde partagent le réglage de luminosité.');
  assert.equal(Visuals.sceneFilter({ brightness: -3 }), 'brightness(0.7)');
  assert.equal(Visuals.sceneFilter({ brightness: NaN }), 'none');
  assert.equal(Visuals.sceneFilter({}), 'none');
  assert.equal(Visuals.sceneFilter({ brightness: 1, highContrast: true }), 'contrast(1.28) brightness(1.12)');
  assert.equal(game.profile.options.brightness, 5, 'Le rendu borne localement, sans réécrire les options.');
});

function isolatedUpdate(game) {
  Object.assign(game, {
    mode: 'playing', chapterIndex: 0, callCooldown: 0, signalCooldown: 0, hitClock: 0,
    saveClock: 0, toastTimer: 0, noiseEvent: null,
    director: { grace: 0, surge: 0, pressure: 0 },
    input: { pollGamepad: () => ({ moveX: 0, moveY: 0, turn: 0, run: false }),
      take: () => false, down: () => false, touchX: 0, touchY: 0, turn: 0 },
    audio: { update() {} },
    updateRitual() {}, updateChallenge() {}, updateEnemies() {}, updateDirector() {}, checkExit() {}, updateHud() {}
  });
  game.profile.options.sensitivity = 1;
  return game;
}

test('WD-034 : les redraws ne font pas avancer le flash ni l’état du monde', () => {
  const game = scene(openLevel());
  game.flashTime = 0.24;
  game.render();
  game.render();
  game.render();
  assert.equal(game.flashTime, 0.24);
  assert.equal(game.elapsed, 0);
});

test('WD-034 : le flash décroît avec le temps simulé à 30, 60 et 120 Hz', () => {
  const remaining = [30, 60, 120].map(hz => {
    const game = isolatedUpdate(scene(openLevel()));
    game.flashTime = 0.24;
    for (let frame = 0; frame < hz / 10; frame++) game.update(1 / hz);
    return game.flashTime;
  });
  for (const value of remaining) assert.ok(Math.abs(value - 0.072) < 1e-10, `Durée stable attendue : ${value}`);
});

test('WD-034 : pause et preview des options ne consomment pas le flash', () => {
  const game = isolatedUpdate(scene(openLevel()));
  game.flashTime = 0.24;
  game.mode = 'paused';
  game.update(1);
  game.render();
  assert.equal(game.flashTime, 0.24);
  assert.equal(game.elapsed, 0);
});
