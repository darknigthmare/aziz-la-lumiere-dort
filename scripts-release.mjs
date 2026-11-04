import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const manifestBlock = /\/\/ BEGIN GENERATED RELEASE\n[\s\S]*?\n\/\/ END GENERATED RELEASE/;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function inventory(root, directory) {
  const paths = [];
  for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) paths.push(...await inventory(root, path));
    else if (entry.isFile()) paths.push(path);
    else throw new Error(`Ressource publique non reguliere : ${path}`);
  }
  return paths;
}

// Derive a stable release from every public payload and the worker logic itself.
// Generated metadata is excluded from its own digest to avoid a circular hash.
export async function prepareRelease({ root = process.cwd(), check = false } = {}) {
  const packageInfo = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const worker = await readFile(join(root, 'sw.js'), 'utf8');
  if (!manifestBlock.test(worker)) throw new Error('Bloc de manifeste absent du service worker.');
  const publicPaths = ['index.html', 'manifest.webmanifest', ...await inventory(root, 'src'), ...await inventory(root, 'assets')]
    .filter(path => path !== 'src/release.js').sort();
  const files = await Promise.all(publicPaths.map(async path => ({ url: `/${path}`, sha256: hash(await readFile(join(root, path))) })));
  const digest = hash(JSON.stringify({ version: packageInfo.version, files, worker: worker.replace(manifestBlock, '// RELEASE PLACEHOLDER') }));
  const revision = `r6-${digest.slice(0, 12)}`;
  const metadata = { version: packageInfo.version, revision, fingerprint: digest };
  const browserSource = `// Genere par npm run release:prepare.\nwindow.AZIZ_RELEASE = Object.freeze(${JSON.stringify(metadata)});\n`;
  const release = { ...metadata, files: [...files, { url: '/src/release.js', sha256: hash(browserSource) }].sort((a, b) => a.url.localeCompare(b.url)) };
  const workerSource = worker.replace(manifestBlock, `// BEGIN GENERATED RELEASE\nconst RELEASE = ${JSON.stringify(release, null, 2)};\n// END GENERATED RELEASE`);
  if (check) {
    const existing = await readFile(join(root, 'src/release.js'), 'utf8').catch(() => '');
    if (existing !== browserSource || workerSource !== worker) throw new Error('Manifeste de livraison perime : executer npm run release:prepare puis versionner src/release.js et sw.js.');
  } else {
    await writeFile(join(root, 'src/release.js'), browserSource);
    await writeFile(join(root, 'sw.js'), workerSource);
  }
  return release;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const release = await prepareRelease({ check: process.argv.includes('--check') });
  console.log(`AZIZ v${release.version} · ${release.revision} · ${release.files.length} fichiers verifies.`);
}
