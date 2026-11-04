'use strict';

// BEGIN GENERATED RELEASE
const RELEASE = {
  "version": "1.2.0",
  "revision": "r6-89a7e3853e1b",
  "fingerprint": "89a7e3853e1b359839c3c8dcb3418b88399718e1da792b51a8de69366ba051b9",
  "files": [
    {
      "url": "/assets/aziz-giza-1926-keyart.webp",
      "sha256": "b04f831d4c7a13ddad2324996cf1c8b8228ade9d47ff452fa38576e897446cfc"
    },
    {
      "url": "/assets/aziz-giza-1926-social.jpg",
      "sha256": "9f76ce777557a30e8aa620021efcda9dccc297286fa28e247c5f1b449dfdbec5"
    },
    {
      "url": "/assets/icon-180.png",
      "sha256": "58f738da9930ea68ca2aa8c1716c7080004f8f3c4ce6c62cb8cc1edb21a28a84"
    },
    {
      "url": "/assets/icon-192.png",
      "sha256": "5247e2141c7ebd1c822a7625104d484ef47dad169c33126c9ea244bde8f55085"
    },
    {
      "url": "/assets/icon-512.png",
      "sha256": "57af54d90f284f1a38f4526f70873a90b820b3e0a1635236c531f52d1d72d036"
    },
    {
      "url": "/assets/icon.svg",
      "sha256": "1eb6476825274db8b216a51352c5506e84d49fa9018407134f6c4b619f4842ab"
    },
    {
      "url": "/index.html",
      "sha256": "79284811a8379e1914246d477b36c81214638bd0263dd9c96419ec8b773f3606"
    },
    {
      "url": "/manifest.webmanifest",
      "sha256": "53bcf9c6e821a8c6016aa6aa9142b15561b2f07abbc8d123b5f4ee21b42d170b"
    },
    {
      "url": "/src/data.js",
      "sha256": "6d8911550e7b442df59b6ce5cbebb2003cbe2f31f36f325bf92472a441fde9eb"
    },
    {
      "url": "/src/game.js",
      "sha256": "cab148a3d676de31133fc9a4ae31035b5c715dba96e9d4a3d45739a5d14c16dd"
    },
    {
      "url": "/src/mechanics.js",
      "sha256": "7e7301f5d99ce9be51a94660b97063c0681cc347d5feb34d7a5bc2955c88b024"
    },
    {
      "url": "/src/release.js",
      "sha256": "09b42c444474f4ff5fbc5fb345507d231250db534d9ec60b2f127bede311e1d6"
    },
    {
      "url": "/src/styles.css",
      "sha256": "60a447e20fa8fb5677334da0698efa22fe2ed5e333d9348128001bf6105f99d3"
    },
    {
      "url": "/src/visuals.js",
      "sha256": "ec623e8f3deec02523e26f956e514f0d3bb080fccdc64af4451ada8e6fa19688"
    }
  ]
};
// END GENERATED RELEASE

const CACHE = `aziz-shell-v${RELEASE.version}-${RELEASE.revision}`;
const RELEASE_FILES = new Map(RELEASE.files.map(file => [file.url, file]));
const KNOWN_PATHS = new Set(RELEASE_FILES.keys());
const repairs = new Map();

async function verifiedResponse(file) {
  const request = new Request(new URL(file.url, location.origin), { cache: 'reload', credentials: 'same-origin' });
  const response = await fetch(request);
  if (!response.ok) throw new Error(`Ressource indisponible : ${file.url}`);
  const digest = await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer());
  const actual = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  if (actual !== file.sha256) throw new Error(`Generation incoherente : ${file.url}`);
  return response;
}

async function installRelease() {
  try {
    // Verify the complete response set before making this generation available.
    // An origin updated during download must not produce a mixed application.
    const responses = [];
    for (const file of RELEASE.files) {
      responses.push([file.url, await verifiedResponse(file)]);
    }
    const cache = await caches.open(CACHE);
    for (const [path, response] of responses) await cache.put(path, response);
  } catch (error) {
    await caches.delete(CACHE);
    throw error;
  }
}

self.addEventListener('install', event => {
  event.waitUntil(installRelease());
  // Default lifecycle: the complete new worker waits for older game tabs to close.
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const file of RELEASE.files) {
      if (!await cache.match(file.url)) throw new Error('Generation incomplete : activation annulee.');
    }
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('aziz-shell-') && key !== CACHE).map(key => caches.delete(key)));
  })());
});

async function repairMissing(path, cache) {
  if (!repairs.has(path)) {
    const repair = (async () => {
      try {
        // Only the bytes recorded by this active worker may repair its cache.
        // Failure leaves every other entry and every older generation untouched.
        const response = await verifiedResponse(RELEASE_FILES.get(path));
        await cache.put(path, response.clone());
        return response;
      } catch { return null; }
    })().finally(() => repairs.delete(path));
    repairs.set(path, repair);
  }
  const response = await repairs.get(path);
  return response?.clone() || null;
}

async function releaseResponse(path) {
  try {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(path);
    if (cached) return cached;
    const repaired = await repairMissing(path, cache);
    if (repaired) return repaired;
  } catch { /* Keep an explicit failure if cache access itself is refused. */ }
  return new Response('Version hors ligne incomplète. Reconnectez-vous puis rechargez pour retenter la récupération de cette version. Si une nouvelle version est disponible, fermez tous les onglets AZIZ pour laisser sa mise à jour s’installer.', {
    status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  const path = url.pathname === '/' ? '/index.html' : url.pathname;
  if (!KNOWN_PATHS.has(path)) return;
  event.respondWith(releaseResponse(path));
});
