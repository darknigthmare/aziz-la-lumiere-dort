import test from 'node:test';
import assert from 'node:assert/strict';
import { environment, createGame } from './helpers/runtime.mjs';

function room(game, objects = [], enemies = []) {
  game.level = { ...game.level, w: 7, h: 7, objects, enemies,
    grid: Array.from({ length: 7 }, (_, y) => Array.from({ length: 7 }, (_, x) => x === 0 || y === 0 || x === 6 || y === 6 ? 1 : 0)) };
}

function memoryScene() {
  const env = environment(), game = createGame(env, 3);
  const object = game.level.objects.find(item => item.type === 'memory');
  Object.assign(object, { x: 3.2, y: 3.5 });
  room(game, [object]);
  Object.assign(game.player, { x: 1.9, y: 3.5, a: 0 });
  Object.assign(game.aziz, { mode: 'sweep', wake: 90, sync: 80, trust: 75, corruption: 0 });
  game.handleObjective(object);
  assert.equal(game.challenge?.type, 'memory');
  return { env, game, object };
}

for (const [name, breakAnchor] of [
  ['sortie de portée', game => { game.player.x = 5.5; }],
  ['visée détournée', game => { game.player.a = Math.PI; }],
  ['mur interposé', game => { game.level.grid[3][2] = 1; }],
  ['mode incompatible', game => { game.aziz.mode = 'focus'; }],
  ['projecteur éteint', game => { game.aziz.wake = 0; }]
]) {
  test(`GP-009 : ${name} empêche une réponse au souvenir dans la même frame`, () => {
    const { game, object } = memoryScene();
    breakAnchor(game);
    game.callAziz();
    assert.notEqual(object.done, true);
    assert.equal(game.stats.correctResponses, 0);
    assert.equal(game.challenge, null);
  });
}

test('GP-009 : rompre le faisceau annule la fenêtre avant tout appel, sans sanction d’expiration', () => {
  const { game, object } = memoryScene();
  game.player.a = Math.PI;
  const trust = game.aziz.trust;
  game.updateChallenge(.1);
  assert.equal(game.challenge, null);
  game.updateChallenge(10);
  assert.equal(game.aziz.trust, trust);
  assert.notEqual(object.done, true);
});

test('GP-009 : une réponse ancrée dans le Balayage accomplit réellement le souvenir', () => {
  const { game, object } = memoryScene();
  game.updateChallenge(.1);
  game.callAziz();
  assert.equal(object.done, true);
  assert.equal(game.stats.correctResponses, 1);
  assert.equal(game.challenge, null);
});

function veilScene() {
  const env = environment(), game = createGame(env, 3);
  const enemy = game.level.enemies.find(item => item.type === 'veiled');
  Object.assign(enemy, { x: 3.5, y: 3.5 });
  room(game, [], [enemy]);
  Object.assign(game.player, { x: 1.5, y: 3.5, a: Math.PI, lampOn: false });
  Object.assign(game.aziz, { trust: 60, corruption: 10, sync: 30, wake: 50 });
  game.challenge = { type: 'veil', enemyId: enemy.id, remaining: 4.2 };
  return { env, game, enemy };
}

test('GP-010 : répondre F à la Voilée termine le défi et inflige exactement une pénalité', () => {
  const { env, game } = veilScene();
  game.callAziz();
  assert.equal(game.challenge, null);
  assert.equal(game.aziz.trust, 54);
  assert.equal(game.aziz.corruption, 16);
  assert.equal(game.aziz.wake, 50, 'Le faux appel ne réveille pas Aziz.');
  assert.match(env.node('#toast').textContent, /répondu au faux Aziz/);
  game.updateChallenge(10);
  assert.equal(game.aziz.trust, 54);
  assert.equal(game.aziz.corruption, 16);
});

test('GP-010 : ne pas répondre à la Voilée garde le silence sans punition ni récompense', () => {
  const { env, game } = veilScene();
  game.updateChallenge(5);
  assert.equal(game.challenge, null);
  assert.equal(game.aziz.trust, 60);
  assert.equal(game.aziz.corruption, 10);
  assert.equal(game.stats.correctResponses, 0);
  assert.match(env.node('#toast').textContent, /silence/);
  assert.doesNotMatch(env.node('#toast').textContent, /avez répondu/);
});

test('GP-010/012 : le contre-signal repousse la Voilée mais une même présence ne rapporte qu’une réponse', () => {
  const { game, enemy } = veilScene();
  game.signalAziz();
  assert.equal(game.challenge, null);
  assert.equal(enemy.stun, 4);
  assert.equal(game.stats.correctResponses, 1);
  assert.equal(game.aziz.trust, 63);
  assert.equal(game.aziz.corruption, 10);
  const trust = game.aziz.trust, sync = game.aziz.sync;
  game.challenge = { type: 'veil', enemyId: enemy.id, remaining: 4.2 };
  game.signalCooldown = 0;
  game.signalAziz();
  assert.equal(game.stats.correctResponses, 1);
  assert.equal(game.aziz.trust, trust);
  assert.equal(game.aziz.sync, sync);
  assert.equal(enemy.stun, 4);
});

test('GP-015 : une cloison empêche le faux appel, son ouverture permet le déclenchement', () => {
  const { env, game } = veilScene();
  game.challenge = null;
  game.level.grid[3][2] = 1;
  game.updateEnemies(.01, env.Data.DIFFICULTIES.expedition);
  assert.equal(game.challenge, null);
  game.level.grid[3][2] = 0;
  game.updateEnemies(.01, env.Data.DIFFICULTIES.expedition);
  assert.equal(game.challenge?.type, 'veil');
});

for (const action of ['callAziz', 'signalAziz']) {
  test(`GP-010 : ${action} écarte un défi de Voilée morte avant la prochaine updateChallenge`, () => {
    const stale = veilScene(), normal = veilScene();
    stale.enemy.alive = false;
    stale.enemy.health = 0;
    normal.game.challenge = null;
    // L'action arrive avant updateChallenge dans une frame du moteur.
    stale.game[action]();
    normal.game[action]();
    assert.equal(stale.game.challenge, null);
    assert.equal(stale.game.stats.correctResponses, 0);
    for (const key of ['trust', 'corruption', 'wake', 'sync', 'mode']) {
      assert.equal(stale.game.aziz[key], normal.game.aziz[key], `L'action ordinaire doit être conservée pour ${key}.`);
    }
  });
}
