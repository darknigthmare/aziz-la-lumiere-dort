import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Tests Node du code de production avec un contexte Canvas espion.
// Ils vérifient la sélection des sprites, les masques géométriques et le temps
// de simulation. Ils ne remplacent ni un navigateur ni une validation visuelle.
const root = new URL('../', import.meta.url);
const [dataSource, mechanicsSource, gameSource] = await Promise.all(
  ['src/data.js', 'src/mechanics.js', 'src/game.js'].map(path => readFile(new URL(path, root), 'utf8'))
);
const classStart = gameSource.indexOf('  class Game {');
const classEnd = gameSource.indexOf('  const storage = new Storage();', classStart);
assert.ok(classStart >= 0 && classEnd > classStart, 'La classe Game doit être extraite du code de production.');
const context = vm.createContext({ structuredClone });
vm.runInContext(dataSource, context);
vm.runInContext(mechanicsSource, context);
vm.runInContext(`
  const Data = AZIZ_DATA;
  const Mechanics = AZIZ_MECHANICS;
  const { clamp, angleDelta, projectorState, nextProjectorMode, canOperateObjective, tensionTarget, endingKey, formatDuration } = Mechanics;
  const clone = structuredClone;
  ${gameSource.slice(classStart, classEnd)}
  globalThis.TestGame = Game;
`, context);
const Game = context.TestGame;
const Data = context.AZIZ_DATA;

class CanvasRecorder {
  constructor() {
    this.path = [];
    this.clipRects = null;
    this.stack = [];
    this.draws = [];
  }
  save() { this.stack.push({ clipRects: this.clipRects }); }
  restore() { this.clipRects = this.stack.pop().clipRects; }
  beginPath() { this.path = []; }
  rect(x, y, width, height) { this.path.push({ x, y, width, height }); }
  clip() { this.clipRects = this.path.map(rect => ({ ...rect })); }
  createLinearGradient() { return { addColorStop() {} }; }
  createRadialGradient() { return { addColorStop() {} }; }
  translate() {}
  rotate() {}
  fillRect() {}
  moveTo() {}
  lineTo() {}
  quadraticCurveTo() {}
  closePath() {}
  fill() {}
  stroke() {}
  ellipse() {}
  arc() {}
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
    ctx.draws.push({ id: sprite.id, type: sprite.type, size, color: sprite.color,
      clipRects: ctx.clipRects?.map(rect => ({ ...rect })) || null });
    return Game.prototype.drawObjectSprite.call(this, ctx, sprite, size);
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
  const centerX = (0.5 + Math.atan2(-0.6, 3) / (66 * Math.PI / 180)) * 1280;
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
