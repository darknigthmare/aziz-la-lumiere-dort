import test from 'node:test';
import assert from 'node:assert/strict';
import { environment, createGame, faceObject } from './helpers/runtime.mjs';

function freezeThreats(game) {
  game.updateEnemies = () => {};
  game.updateDirector = () => {};
}

test('GP-011 : recommencer une séquence compte les objectifs uniques et les tentatives séparément', () => {
  const env = environment(), game = createGame(env, 2);
  const object = game.level.objects.find(item => item.type === 'echo');
  game.completeObjective(object);
  game.resetSequence(object);
  game.completeObjective(object);
  assert.equal(game.stats.objectives, 1);
  assert.equal(game.stats.objectiveAttempts, 2);
  const restored = game.storage.getSave();
  assert.equal(restored.stats.objectives, 1);
  assert.equal(restored.stats.objectiveAttempts, 2);
});

test('GP-012 : rejouer le même souvenir après un décès ne fabrique pas une deuxième réponse pour la fin', () => {
  const env = environment(), game = createGame(env, 3);
  let object = game.level.objects.find(item => item.type === 'memory');
  faceObject(game, object);
  game.checkpoint = game.snapshot();
  game.handleObjective(object);
  game.callAziz();
  assert.equal(game.stats.correctResponses, 1);
  game.gameOver();
  env.timers.shift()();
  object = game.level.objects.find(item => item.id === object.id);
  assert.notEqual(object.done, true, 'Le monde revient bien au point de contrôle.');
  faceObject(game, object);
  game.handleObjective(object);
  game.callAziz();
  assert.equal(game.stats.deaths, 1);
  assert.equal(game.stats.calls, 2, 'Les appels restent une statistique cumulée.');
  assert.equal(game.stats.correctResponses, 1);
  assert.equal(game.stats.objectives, 1);
  assert.equal(env.Mechanics.endingKey(game.aziz, game.stats), 'guardian');
});

test('GP-013 : passer en Éclipse juste avant la fin ne débloque pas le succès', () => {
  const env = environment(), game = createGame(env, 0, 'exploration');
  game.profile.difficulty = 'eclipse';
  game.finish('guardian');
  assert.equal(game.profile.achievements.includes('eclipse'), false);
});

test('GP-013 : commencer par la sélection du dernier chapitre ne certifie pas une campagne Éclipse', () => {
  const env = environment(), game = createGame(env, 5, 'eclipse');
  game.finish('guardian');
  assert.equal(game.profile.achievements.includes('eclipse'), false);
});

test('GP-013 : une baisse de difficulté en pause reste mémorisée après restauration', () => {
  const env = environment(), game = createGame(env, 0, 'eclipse');
  game.mode = 'paused';
  game.profile.difficulty = 'exploration';
  game.trackDifficulty();
  game.profile.difficulty = 'eclipse';
  game.trackDifficulty();
  const saved = game.snapshot();
  game.loadChapter(0, saved, false);
  assert.equal(game.campaignDifficulty.lowest, 'exploration');
  assert.equal(game.campaignDifficulty.started, 'eclipse');
  assert.equal(game.snapshot().difficulty, 'eclipse');
  game.finish('guardian');
  assert.equal(game.profile.achievements.includes('eclipse'), false);
});

test('GP-013/017 : six sorties successives en Éclipse comptent exactement six chapitres et le succès', () => {
  const env = environment(), game = createGame(env, 0, 'eclipse');
  for (let chapter = 0; chapter < 6; chapter++) {
    assert.equal(game.chapterIndex, chapter);
    game.objectiveComplete = true;
    for (const enemy of game.level.enemies) { enemy.alive = false; enemy.health = 0; }
    Object.assign(game.player, game.level.exit);
    game.checkExit();
  }
  assert.equal(game.stats.chaptersCompleted, 6);
  assert.equal(game.mode, 'ending');
  assert.equal(game.profile.achievements.includes('eclipse'), true);
  game.checkExit();
  assert.equal(game.stats.chaptersCompleted, 6);
});

test('GP-016 : le ravitaillement préserve la lampe éteinte manuellement et rallume une lampe vidée', () => {
  const env = environment(), game = createGame(env);
  Object.assign(game.player, { battery: 42, lampOn: false });
  assert.equal(game.transitionState(1).player.lampOn, false);
  Object.assign(game.player, { battery: 0, lampOn: false });
  const empty = game.transitionState(1);
  assert.equal(empty.player.battery, 24);
  assert.equal(empty.player.lampOn, true);
  Object.assign(game.player, { battery: 42, lampOn: true });
  assert.equal(game.transitionState(1).player.lampOn, true);
});

test('GP-018 : la durée cumulée traverse pause, changement de chapitre, sauvegarde et décès', () => {
  const env = environment(), game = createGame(env);
  freezeThreats(game);
  game.update(2);
  game.mode = 'paused';
  game.update(30);
  game.mode = 'playing';
  game.loadChapter(1, game.transitionState(1), false);
  game.update(3);
  const snapshot = game.snapshot();
  game.loadChapter(1, snapshot, false);
  game.update(4);
  game.gameOver();
  env.timers.shift()();
  assert.equal(game.campaignElapsed, 9);
  assert.equal(game.elapsed, 3, 'L’horloge locale du checkpoint reste distincte du total joué.');
  const saved = game.storage.getSave();
  assert.equal(saved.campaignElapsed, 9);
  game.finish('guardian');
  assert.match(env.node('#ending-stats').textContent, /00:09.*campagne/);
});

test('GP-011/012/013/018 : une ancienne sauvegarde reste chargeable sans historique inventé', () => {
  const env = environment(), game = createGame(env, 3);
  const object = game.level.objects.find(item => item.type === 'memory');
  const legacy = game.snapshot();
  delete legacy.campaignEvents;
  delete legacy.campaignDifficulty;
  delete legacy.campaignElapsed;
  delete legacy.difficulty;
  legacy.elapsed = 125;
  legacy.stats.objectives = 99;
  legacy.stats.correctResponses = 99;
  legacy.completedIds = [object.id];
  legacy.objectStates[object.id].done = true;
  const state = game.storage.normalizeSave(legacy);
  assert.equal(state.campaignElapsed, 125);
  assert.equal(state.campaignDifficulty.fromStart, false);
  assert.equal(state.stats.correctResponses, 1);
  assert.equal(state.stats.objectives, 1);
});

test('GP-012 : un import partiel conserve la réponse prouvée par un souvenir accompli', () => {
  const env = environment(), game = createGame(env, 3);
  const memory = game.level.objects.find(item => item.type === 'memory');
  faceObject(game, memory);
  game.handleObjective(memory);
  game.callAziz();
  const saved = game.snapshot();
  assert.equal(saved.objectStates[memory.id].done, true);
  assert.equal(saved.stats.correctResponses, 1);
  for (const omitted of [true, false]) {
    const partial = structuredClone(saved);
    if (omitted) delete partial.campaignEvents.responses;
    else partial.campaignEvents.responses = [];
    const normalized = game.storage.normalizeSave(partial);
    assert.equal(normalized.stats.correctResponses, 1);
    assert.deepEqual(Array.from(normalized.campaignEvents.responses), [`memory:${memory.id}`]);
    assert.equal(normalized.objectStates[memory.id].done, true);
    assert.equal(normalized.stats.objectives, 1, 'Aucun autre objectif ou souvenir n’est inventé.');
  }
});
