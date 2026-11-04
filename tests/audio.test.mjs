import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const [data, mechanics, visuals, source] = await Promise.all(['src/data.js', 'src/mechanics.js', 'src/visuals.js', 'src/game.js'].map(path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));

function environment(voices = [{ name: 'Locale française', lang: 'fr-FR', localService: true }]) {
  const spoken = [], timers = [], gains = [], fallbacks = [];
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) {
      const classes = new Set();
      elements.set(selector, { textContent: '', classList: { add: key => classes.add(key), remove: key => classes.delete(key), contains: key => classes.has(key) } });
    }
    return elements.get(selector);
  };
  let cancellations = 0, suspended = 0;
  const parameter = () => ({ value: 0, setValueAtTime(value) { this.value = value; }, exponentialRampToValueAtTime(value) { this.value = value; } });
  const node = () => ({ connect(target) { this.target = target; return target; }, start() {}, stop() {} });
  class AudioContext {
    constructor() { this.destination = node(); this.currentTime = 0; this.sampleRate = 1000; this.state = 'running'; }
    createGain() { const gain = { ...node(), gain: parameter() }; gains.push(gain); return gain; }
    createOscillator() { return { ...node(), frequency: parameter() }; }
    createStereoPanner() { return { ...node(), pan: parameter() }; }
    createDynamicsCompressor() { return { ...node(), threshold: parameter(), knee: parameter(), ratio: parameter(), attack: parameter(), release: parameter() }; }
    createBuffer(_channels, size) { return { getChannelData: () => new Float32Array(size) }; }
    createBufferSource() { return node(); }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { suspended++; this.state = 'suspended'; return Promise.resolve(); }
  }
  const context = vm.createContext({ structuredClone, queueMicrotask, AudioContext,
    document: { querySelector: element },
    setTimeout: callback => { timers.push(callback); return timers.length; }, clearTimeout() {},
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    speechSynthesis: { getVoices: () => voices, cancel() { cancellations++; }, speak(item) { spoken.push(item); }, addEventListener() {} }
  });
  vm.runInContext('globalThis.window = globalThis;', context);
  vm.runInContext(data, context); vm.runInContext(mechanics, context);
  vm.runInContext(visuals, context);
  vm.runInContext(`${source.slice(source.indexOf("  'use strict';"), source.indexOf('  class Input {'))}\n${source.slice(source.indexOf('  class Game {'), source.indexOf('  const storage = new Storage();'))}\nglobalThis.TEST = { Storage, AudioEngine, Game };`, context);
  const profile = new context.TEST.Storage().normalizeProfile({ options: { voices: true } });
  const audio = new context.TEST.AudioEngine(profile);
  audio.onVoiceFallback = text => fallbacks.push(text);
  audio.suspend(false);
  return { audio, profile, spoken, fallbacks, timers, gains, element, context, Storage: context.TEST.Storage, Game: context.TEST.Game,
    get cancellations() { return cancellations; }, get suspended() { return suspended; } };
}

test('WD-031 : volumes par categorie bornes, persistants et independants du general', () => {
  const env = environment();
  const normalized = new env.Storage().normalizeProfile({ options: { effectsVolume: 3, ambienceVolume: -1, voiceVolume: .4, brightness: 20, reduceFlashes: true } });
  assert.equal(normalized.options.effectsVolume, 1);
  assert.equal(normalized.options.ambienceVolume, 0);
  assert.equal(normalized.options.voiceVolume, .4);
  assert.equal(normalized.options.brightness, 1.6);
  assert.equal(normalized.options.reduceFlashes, true);
  env.audio.ensure();
  env.profile.options.ambienceVolume = 0;
  env.profile.options.effectsVolume = .7;
  env.audio.applyMix();
  assert.equal(env.audio.buses.ambience.gain.value, 0);
  assert.equal(env.audio.buses.effects.gain.value, .7);
  assert.equal(env.audio.master.gain.value, .68 * .24);
});

test('WD-041 : aucune voix distante ne remplace une voix locale absente', () => {
  const env = environment([{ name: 'Distante', lang: 'fr-FR', localService: false }]);
  env.audio.voice('Le souvenir attend.');
  assert.equal(env.spoken.length, 0);
  assert.deepEqual(env.fallbacks, ['Le souvenir attend.']);
});

test('WD-041 : voix francaise locale explicite, erreur restitue le texte et pause annule la reponse tardive', () => {
  const env = environment();
  assert.equal(env.audio.voice('Aziz répond.'), true);
  assert.equal(env.spoken[0].voice.localService, true);
  assert.equal(env.spoken[0].lang, 'fr-FR');
  env.spoken[0].onerror({ error: 'synthesis-failed' });
  assert.deepEqual(env.fallbacks, ['Aziz répond.']);
  env.audio.voice('Autre réplique.');
  env.audio.suspend(true);
  env.spoken[1].onerror({ error: 'interrupted' });
  assert.equal(env.fallbacks.length, 1);
});

test('WD-031 : couper le volume general coupe aussi les voix deja en cours', () => {
  const env = environment();
  env.audio.ensure(); env.audio.voice('Réplique.');
  const before = env.cancellations;
  env.profile.options.volume = 0; env.audio.applyMix();
  assert.equal(env.audio.master.gain.value, 0);
  assert.ok(env.cancellations > before);
  env.audio.voice('Ne doit pas être prononcé.');
  assert.equal(env.spoken.length, 1);
});

test('WD-031 : preecoute audio revient en pause et ne suspend pas une partie reprise entretemps', () => {
  const env = environment();
  env.audio.suspend(true);
  env.audio.preview('effects');
  env.timers.shift()();
  assert.equal(env.audio.suspended, true);
  env.audio.preview('ambience');
  env.audio.suspend(false);
  env.timers.shift()();
  assert.equal(env.audio.suspended, false);
});

test('WD-031 : plusieurs preecoutes successives conservent la pause initiale', () => {
  const env = environment();
  env.audio.suspend(true);
  env.audio.preview('effects');
  env.audio.preview('ambience');
  for (const callback of env.timers) callback();
  assert.equal(env.audio.suspended, true);
});

function installGameFallback(env) {
  const game = Object.create(env.Game.prototype);
  Object.assign(game, { profile: env.profile, mode: 'playing', level: { id: 'noms' }, storage: { saveProfile() {} } });
  env.context.reviewGame = game;
  env.context.reviewAudio = env.audio;
  const start = source.indexOf('  audio.onVoiceFallback = text => {');
  const end = source.indexOf('\n  };', start) + '\n  };'.length;
  vm.runInContext(`const game = reviewGame; const audio = reviewAudio; ${source.slice(start, end)}`, env.context);
  return game;
}

test('WD-019/041 : une erreur vocale tardive preserve le nouvel indice et le dernier message du carnet', () => {
  const env = environment(), game = installGameFallback(env);
  env.profile.options.subtitles = false;
  env.audio.voice('Ancienne réplique en synthèse.');
  game.say('Indice nouveau : le miroir doit regarder le nord.', 5, true);
  const recent = JSON.stringify(env.profile.notebookRecent);
  env.spoken[0].onerror({ error: 'synthesis-failed' });
  assert.equal(env.element('#toast').textContent, 'Indice nouveau : le miroir doit regarder le nord.');
  assert.equal(game.toastTimer, 5);
  assert.equal(env.element('#toast').classList.contains('visible'), true);
  assert.equal(JSON.stringify(env.profile.notebookRecent), recent);
  assert.match(env.element('#voice-fallback').textContent, /Ancienne réplique en synthèse/);
  assert.equal(env.element('#voice-fallback').classList.contains('visible'), true);
});

test('WD-041 : une replique sans voix locale reste lisible sans devenir une decouverte', () => {
  const env = environment([]), game = installGameFallback(env);
  game.say('Un relevé de terrain.', 5, true);
  env.audio.voice('Je garde la lumière.');
  assert.equal(env.element('#toast').textContent, 'Un relevé de terrain.');
  assert.equal(env.profile.notebookRecent.text, 'Un relevé de terrain.');
  assert.match(env.element('#voice-fallback').textContent, /Je garde la lumière/);
});

test('WD-041 : les erreurs des voix remplacees ou du chapitre precedent restent ignorees', () => {
  const env = environment();
  env.audio.voice('Première réplique.');
  env.audio.voice('Deuxième réplique.');
  env.spoken[0].onerror({ error: 'synthesis-failed' });
  assert.deepEqual(env.fallbacks, []);
  env.audio.resetTimeline();
  env.spoken[1].onerror({ error: 'synthesis-failed' });
  assert.deepEqual(env.fallbacks, []);
});

test('WD-041 : une nouvelle replique sans voix locale invalide aussi une ancienne erreur asynchrone', () => {
  const voices = [{ name: 'Locale française', lang: 'fr-FR', localService: true }];
  const env = environment(voices);
  env.audio.voice('Première réplique.');
  voices.length = 0;
  env.audio.voice('Réplique actuelle écrite.');
  env.spoken[0].onerror({ error: 'synthesis-failed' });
  assert.deepEqual(env.fallbacks, ['Réplique actuelle écrite.']);
});
