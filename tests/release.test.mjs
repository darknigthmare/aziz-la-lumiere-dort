import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareRelease } from '../scripts-release.mjs';

test('WD-044 : une modification publique ou du worker change la revision et bloque un manifeste perime', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aziz-release-'));
  try {
    await mkdir(join(root, 'src'));
    await mkdir(join(root, 'assets'));
    await writeFile(join(root, 'package.json'), JSON.stringify({ version: '1.2.0' }));
    await writeFile(join(root, 'index.html'), '<title>AZIZ</title>');
    await writeFile(join(root, 'manifest.webmanifest'), '{}');
    await writeFile(join(root, 'src/game.js'), 'const generation = 1;');
    await writeFile(join(root, 'assets/icon.svg'), '<svg/>');
    await writeFile(join(root, 'sw.js'), await readFile(new URL('../sw.js', import.meta.url)));
    const first = await prepareRelease({ root });
    const repeated = await prepareRelease({ root, check: true });
    assert.equal(repeated.revision, first.revision);
    await writeFile(join(root, 'src/game.js'), 'const generation = 2;');
    await assert.rejects(prepareRelease({ root, check: true }), /perime/);
    const second = await prepareRelease({ root });
    assert.notEqual(first.revision, second.revision);
    const worker = await readFile(join(root, 'sw.js'), 'utf8');
    await writeFile(join(root, 'sw.js'), `${worker}\n// nouvelle politique de cache\n`);
    await assert.rejects(prepareRelease({ root, check: true }), /perime/);
    const third = await prepareRelease({ root });
    assert.notEqual(second.revision, third.revision);
    await writeFile(join(root, 'src/props.js'), 'const props = {};');
    const fourth = await prepareRelease({ root });
    assert.ok(fourth.files.some(file => file.url === '/src/props.js'));
    assert.notEqual(fourth.revision, third.revision);
    assert.equal(fourth.version, '1.2.0');
    await prepareRelease({ root, check: true });
  } finally { await rm(root, { recursive: true, force: true }); }
});
