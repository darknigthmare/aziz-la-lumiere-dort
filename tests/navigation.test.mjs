import test from 'node:test';
import assert from 'node:assert/strict';
import { environment, createGame } from './helpers/runtime.mjs';

function openGrid(size = 15) {
  return Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) =>
    x === 0 || y === 0 || x === size - 1 || y === size - 1 ? 1 : 0));
}

function navigationScene() {
  const env = environment(), game = createGame(env, 1);
  const enemy = game.level.enemies.find(item => item.type === 'jackal');
  game.level = { ...game.level, w: 15, h: 15, grid: openGrid(), objects: [], enemies: [enemy] };
  Object.assign(game.player, { x: 13.5, y: 13.5, a: 0, lampOn: false });
  game.aziz.wake = 0;
  Object.assign(enemy, { memory: 20, state: 'investigate', targetX: 5.5, targetY: 3.5 });
  return { env, game, enemy };
}

function assertBodyClear(game, enemy) {
  for (const dx of [-.18, .18]) for (const dy of [-.18, .18]) {
    assert.equal(game.wall(enemy.x + dx, enemy.y + dy), false, `Le corps doit rester hors des murs à ${enemy.x},${enemy.y}.`);
  }
}

for (const shape of ['L', 'U']) {
  test(`GP-014 : une menace alertée contourne l’obstacle en ${shape} vers le dernier bruit connu`, () => {
    const { env, game, enemy } = navigationScene();
    if (shape === 'L') {
      Object.assign(enemy, { x: 3.5, y: 3.5, targetX: 5.5, targetY: 3.5 });
      for (let y = 1; y <= 6; y++) game.level.grid[y][4] = 1;
      for (let x = 4; x <= 6; x++) game.level.grid[6][x] = 1;
    } else {
      Object.assign(enemy, { x: 5.5, y: 4.5, targetX: 5.5, targetY: 8.5 });
      for (let y = 2; y <= 6; y++) game.level.grid[y][4] = game.level.grid[y][7] = 1;
      for (let x = 4; x <= 7; x++) game.level.grid[6][x] = 1;
    }
    const target = { x: enemy.targetX, y: enemy.targetY };
    let arrived = false;
    for (let frame = 0; frame < 400; frame++) {
      game.elapsed += .05;
      game.updateEnemies(.05, env.Data.DIFFICULTIES.expedition);
      assertBodyClear(game, enemy);
      if (Math.hypot(enemy.x - target.x, enemy.y - target.y) < .2) { arrived = true; break; }
    }
    assert.equal(arrived, true, 'La cible mémorisée doit être atteinte avant la fin de la recherche.');
    assert.ok(Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y) > 4.4, 'La menace cherche le bruit, pas la position cachée du joueur.');
  });
}

test('GP-014 : la recherche de route reste bornée et refuse une destination enclavée', () => {
  const { Mechanics } = environment();
  const grid = openGrid(27);
  grid[12][13] = grid[14][13] = grid[13][12] = grid[13][14] = 1;
  const limited = Mechanics.findGridRoute(grid, { x: 1.5, y: 1.5 }, { x: 13.5, y: 13.5 }, 32);
  assert.ok(limited.visited <= 32);
  assert.equal(limited.path.length, 0);
  const unreachable = Mechanics.findGridRoute(grid, { x: 1.5, y: 1.5 }, { x: 13.5, y: 13.5 });
  assert.ok(unreachable.visited <= 768);
  assert.equal(unreachable.path.length, 0);
});

test('GP-014 : une route ne traverse pas un coin de mur et s’arrête à sa destination', () => {
  const { game, enemy } = navigationScene();
  Object.assign(enemy, { x: 3.5, y: 3.5 });
  game.level.grid[3][4] = 1;
  const target = { x: 4.5, y: 4.5 };
  for (let frame = 0; frame < 100; frame++) {
    game.elapsed += .05;
    game.moveEnemy(enemy, target.x, target.y, Math.hypot(target.x - enemy.x, target.y - enemy.y), .08);
    assertBodyClear(game, enemy);
  }
  assert.ok(Math.hypot(target.x - enemy.x, target.y - enemy.y) < .01);
  game.moveEnemy(enemy, target.x, target.y, 0, 10);
  assert.ok(Math.hypot(target.x - enemy.x, target.y - enemy.y) < .01);
});

for (const type of ['ushabti', 'scribe']) {
  test(`GP-014 : la navigation respecte l’arrêt du ${type} sous lumière ou observation`, () => {
    const { env, game, enemy } = navigationScene();
    Object.assign(enemy, { type, x: 3.5, y: 3.5, health: 100, memory: 0 });
    Object.assign(game.player, { x: 1.5, y: 3.5, a: 0, lampOn: type === 'ushabti' });
    game.updateEnemies(.1, env.Data.DIFFICULTIES.expedition);
    assert.equal(enemy.x, 3.5);
    assert.equal(enemy.y, 3.5);
    game.player.a = Math.PI;
    game.player.lampOn = false;
    game.updateEnemies(.1, env.Data.DIFFICULTIES.expedition);
    assert.ok(enemy.x < 3.5, 'La menace reprend la poursuite quand sa contrainte est levée.');
  });
}

test('GP-014 : sauvegarde et reprise conservent la destination connue du chacal', () => {
  const env = environment(), game = createGame(env, 1);
  let enemy = game.level.enemies.find(item => item.type === 'jackal');
  Object.assign(enemy, { targetX: game.level.start.x, targetY: game.level.start.y, memory: 5, state: 'investigate' });
  const saved = game.snapshot();
  game.loadChapter(1, saved, false);
  enemy = game.level.enemies.find(item => item.type === 'jackal');
  assert.equal(enemy.targetX, game.level.start.x);
  assert.equal(enemy.targetY, game.level.start.y);
  assert.equal(enemy.memory, 5);
});


test('GP-014 : quatre menaces sans route partagent un budget borné et ne relancent pas la recherche chaque frame', () => {
  const searches = [];
  let frame = 0;
  const env = environment({ onRouteSearch: visited => searches.push({ frame, visited }) });
  const game = createGame(env, 1), prototype = game.level.enemies.find(item => item.type === 'scarabs');
  const enemies = Array.from({ length: 4 }, (_, index) => ({ ...prototype, id: `blocked-${index}`, x: 3.5, y: 4.5 + index }));
  game.level = { ...game.level, w: 15, h: 15, grid: openGrid(), objects: [], enemies };
  game.level.grid[6][7] = game.level.grid[8][7] = game.level.grid[7][6] = game.level.grid[7][8] = 1;
  Object.assign(game.player, { x: 7.5, y: 7.5, lampOn: false });
  game.aziz.wake = 0;
  for (frame = 0; frame < 12; frame++) {
    game.elapsed = frame * .05;
    game.updateEnemies(.05, env.Data.DIFFICULTIES.expedition);
  }
  assert.equal(searches.length, 4, 'Chaque menace tente une recherche pendant la première demi-seconde.');
  for (let i = 0; i < 12; i++) assert.ok(searches.filter(search => search.frame === i).length <= 2);
  assert.ok(searches.every(search => search.visited <= 768));
  game.elapsed = .7;
  game.updateEnemies(.05, env.Data.DIFFICULTIES.expedition);
  assert.equal(searches.length, 6, 'Un nouvel essai borné est permis après le délai de recherche.');
});

for (const shape of ['L', 'U']) {
  test(`GP-014 : un vrai bruit suffit à contourner un petit ${shape} pendant la mémoire nominale`, () => {
    const { env, game, enemy } = navigationScene();
    const target = shape === 'L' ? { x: 4.5, y: 2.5 } : { x: 5.5, y: 3.5 };
    Object.assign(enemy, { x: shape === 'L' ? 2.5 : 3.5, y: shape === 'L' ? 2.5 : 3.5, memory: 0, targetX: null, targetY: null });
    if (shape === 'L') {
      game.level.grid[2][3] = game.level.grid[3][3] = game.level.grid[3][4] = 1;
    } else {
      game.level.grid[3][2] = game.level.grid[3][4] = 1;
      for (let x = 2; x <= 4; x++) game.level.grid[4][x] = 1;
    }
    game.emitNoise(10, .1, target.x, target.y);
    let arrived = false;
    for (let frame = 0; frame < 110; frame++) {
      game.elapsed += .05;
      game.updateEnemies(.05, env.Data.DIFFICULTIES.expedition);
      game.noiseEvent = null;
      assertBodyClear(game, enemy);
      if (Math.hypot(enemy.x - target.x, enemy.y - target.y) < .2) { arrived = true; break; }
    }
    assert.equal(arrived, true);
    assert.ok(enemy.memory > 0, 'Le bruit unique est encore en mémoire à l’arrivée.');
  });
}

test('GP-014 : les scarabées fuient la lampe même lorsque leur point de fuite projeté sort de la carte', () => {
  const { env, game, enemy } = navigationScene();
  game.level.w = game.level.h = 9;
  game.level.grid = openGrid(9);
  Object.assign(enemy, { type: 'scarabs', x: 6.5, y: 4.5, memory: 0 });
  Object.assign(game.player, { x: 3.5, y: 4.5, a: 0, lampOn: true });
  assert.ok(game.lightAt(enemy.x, enemy.y).portable > .06);
  game.updateEnemies(.1, env.Data.DIFFICULTIES.expedition);
  assert.ok(enemy.x > 6.5, 'La fuite doit utiliser le pas libre disponible devant les scarabées.');
  assertBodyClear(game, enemy);
});
