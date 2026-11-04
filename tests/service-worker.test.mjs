import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';

const source = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
const origin = 'https://aziz.example';
const keyOf = key => new URL(typeof key === 'string' ? key : key.url, origin).pathname;

async function worker({ damaged, unavailable, quotaFailure = false } = {}) {
  const handlers = {}, stores = new Map(), deleted = [], fetched = [];
  const faults = { damaged, unavailable, quotaFailure, offline: false };
  let claimed = 0, skipped = 0;
  const caches = {
    async keys() { return [...stores.keys()]; },
    async delete(key) { deleted.push(key); return stores.delete(key); },
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const values = stores.get(name);
      return {
        async put(key, response) {
          if (faults.quotaFailure && name.startsWith('aziz-shell-') && values.size > 1) throw new Error('Quota exceeded');
          values.set(keyOf(key), response.clone());
        },
        async match(key) { return values.get(keyOf(key))?.clone(); }
      };
    }
  };
  const context = vm.createContext({
    URL, Request, Response, crypto: webcrypto, Uint8Array, caches, location: { origin },
    fetch: async request => {
      const path = keyOf(request);
      fetched.push({ path, cache: request.cache });
      if (faults.offline) throw new Error('Network unavailable');
      if (path === faults.unavailable) return new Response('Absent', { status: 404 });
      const bytes = path === faults.damaged ? 'une autre generation' : await readFile(new URL(`..${path}`, import.meta.url));
      return new Response(bytes, { status: 200 });
    },
    self: { addEventListener: (name, handler) => { handlers[name] = handler; },
      skipWaiting: () => { skipped++; }, clients: { claim: () => { claimed++; } } }
  });
  vm.runInContext(source, context);
  const release = vm.runInContext('RELEASE', context);
  const name = vm.runInContext('CACHE', context);
  stores.set('autre-application-v1', new Map([['/index.html', new Response('autre application')]]));
  stores.set('aziz-shell-ancienne', new Map([['/index.html', new Response('ancienne generation')]]));
  const dispatch = async type => {
    let completion;
    handlers[type]({ waitUntil: promise => { completion = promise; } });
    assert.ok(completion, `${type} doit attendre son travail asynchrone`);
    await completion;
  };
  const request = async (path, mode = 'same-origin', method = 'GET') => {
    let result;
    handlers.fetch({ request: { url: new URL(path, origin).href, method, mode }, respondWith: promise => { result = promise; } });
    return result;
  };
  return { release, name, stores, deleted, fetched, faults, dispatch, request, get claimed() { return claimed; }, get skipped() { return skipped; } };
}

test('WD-037 : une generation est integralement verifiee avant installation sans prise de controle forcee', async () => {
  const w = await worker();
  await w.dispatch('install');
  assert.equal(w.stores.get(w.name).size, w.release.files.length);
  assert.equal(w.fetched.every(item => item.cache === 'reload'), true);
  assert.equal(w.skipped, 0);
  assert.equal(w.claimed, 0);
  assert.equal(await w.stores.get('aziz-shell-ancienne').get('/index.html').text(), 'ancienne generation');
});

for (const failure of [{ damaged: '/src/game.js' }, { unavailable: '/src/data.js' }, { quotaFailure: true }]) {
  test(`WD-037 : installation interrompue preserve la generation precedente (${Object.keys(failure)[0]})`, async () => {
    const w = await worker(failure);
    await assert.rejects(w.dispatch('install'));
    assert.equal(w.stores.has(w.name), false);
    assert.equal(w.stores.has('aziz-shell-ancienne'), true);
    assert.equal(w.stores.has('autre-application-v1'), true);
    assert.equal(w.skipped, 0);
  });
}

test('RT-005 : activation retire seulement les anciennes generations AZIZ apres installation complete', async () => {
  const w = await worker();
  await w.dispatch('install');
  await w.dispatch('activate');
  assert.deepEqual(w.deleted, ['aziz-shell-ancienne']);
  assert.equal(w.stores.has(w.name), true);
  assert.equal(w.stores.has('autre-application-v1'), true);
  assert.equal(w.claimed, 0);
});

test('WD-037 : activation incomplete ne supprime pas la derniere generation valide', async () => {
  const w = await worker();
  await w.dispatch('install');
  w.stores.get(w.name).delete('/src/game.js');
  await assert.rejects(w.dispatch('activate'));
  assert.equal(w.stores.has('aziz-shell-ancienne'), true);
});

test('WD-037 : HTML et ressources utilisent uniquement la generation active meme si le reseau change', async () => {
  const w = await worker();
  await w.dispatch('install');
  const fetchedAtInstall = w.fetched.length;
  const html = await w.request('/?test=game', 'navigate');
  const game = await w.request('/src/game.js?cache-bust=next');
  assert.equal(await html.text(), await readFile(new URL('../index.html', import.meta.url), 'utf8'));
  assert.equal(await game.text(), await readFile(new URL('../src/game.js', import.meta.url), 'utf8'));
  assert.equal(w.fetched.length, fetchedAtInstall);
});

test('WD-037 : un fichier manquant ne se remplace pas par une autre generation', async () => {
  const w = await worker();
  await w.dispatch('install');
  w.stores.get(w.name).delete('/src/game.js');
  w.stores.get('aziz-shell-ancienne').set('/src/game.js', new Response('ancien moteur'));
  w.faults.damaged = '/src/game.js';
  const response = await w.request('/src/game.js');
  assert.equal(response.status, 503);
  assert.match(await response.text(), /incomplète/);
  assert.equal(w.stores.get(w.name).has('/src/game.js'), false);
  assert.equal(w.stores.has('aziz-shell-ancienne'), true);
});

test('WD-037 : reparer une ressource manquante verifie sa generation puis la rend de nouveau disponible hors ligne', async () => {
  const w = await worker();
  await w.dispatch('install');
  w.stores.get(w.name).delete('/src/game.js');
  const fetched = w.fetched.length;
  const responses = await Promise.all([w.request('/src/game.js'), w.request('/src/game.js?retry=1')]);
  const expected = await readFile(new URL('../src/game.js', import.meta.url), 'utf8');
  for (const response of responses) { assert.equal(response.status, 200); assert.equal(await response.text(), expected); }
  assert.equal(w.fetched.length, fetched + 1, 'Les demandes simultanées partagent une seule réparation.');
  assert.equal(w.fetched.at(-1).cache, 'reload');
  w.faults.offline = true;
  assert.equal(await (await w.request('/src/game.js')).text(), expected);
  assert.equal(w.fetched.length, fetched + 1);
  assert.equal(w.deleted.length, 0, 'La réparation ne supprime aucune génération.');
});

test('WD-037 : une reparation hors ligne reste explicite et peut etre retentee apres reconnexion', async () => {
  const w = await worker();
  await w.dispatch('install');
  w.stores.get(w.name).delete('/index.html');
  w.faults.offline = true;
  const unavailable = await w.request('/', 'navigate');
  assert.equal(unavailable.status, 503);
  assert.match(await unavailable.text(), /Reconnectez-vous.*rechargez/);
  assert.equal(w.stores.get(w.name).has('/src/game.js'), true);
  w.faults.offline = false;
  const restored = await w.request('/', 'navigate');
  assert.equal(restored.status, 200);
  assert.equal(await restored.text(), await readFile(new URL('../index.html', import.meta.url), 'utf8'));
});

test('WD-037 : un refus de quota pendant la reparation conserve les ressources et generations intactes', async () => {
  const w = await worker();
  await w.dispatch('install');
  w.stores.get(w.name).delete('/src/game.js');
  const size = w.stores.get(w.name).size;
  w.faults.quotaFailure = true;
  const unavailable = await w.request('/src/game.js');
  assert.equal(unavailable.status, 503);
  assert.equal(w.stores.get(w.name).size, size);
  assert.equal(w.stores.has('aziz-shell-ancienne'), true);
  assert.equal(w.stores.has('autre-application-v1'), true);
  assert.equal(w.deleted.length, 0);
});

test('le worker laisse passer ecritures, autres origines et fichiers hors manifeste', async () => {
  const w = await worker();
  assert.equal(await w.request('/', 'same-origin', 'POST'), undefined);
  assert.equal(await w.request('https://other.example/'), undefined);
  assert.equal(await w.request('/docs/private.txt'), undefined);
  assert.equal(await w.request('/sw.js'), undefined);
});
