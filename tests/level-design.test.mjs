import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(await readFile(new URL('../src/data.js', import.meta.url), 'utf8'), context);
const level = context.AZIZ_DATA.CHAPTERS[4];
const cell = point => `${Math.floor(point.x)}:${Math.floor(point.y)}`;
function distance(start, end) {
  const queue = [{ ...start, steps: 0 }], seen = new Set();
  for (let index = 0; index < queue.length; index++) {
    const point = queue[index], x = Math.floor(point.x), y = Math.floor(point.y), key = cell(point);
    if (seen.has(key) || level.grid[y]?.[x] !== 0) continue;
    if (key === cell(end)) return point.steps;
    seen.add(key);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) queue.push({ x: x + dx, y: y + dy, steps: point.steps + 1 });
  }
  return Infinity;
}

test('WD-006 : la sequence du palais suit une boucle courte sans traverser plusieurs fois toute la carte', () => {
  const pylons = level.sequence.map(slot => level.objects.find(object => object.type === 'pylon' && object.sequenceSlot === slot));
  const route = [level.start, ...pylons, level.exit];
  const segments = route.slice(1).map((point, index) => distance(route[index], point));
  assert.ok(segments.reduce((sum, value) => sum + value, 0) <= 65, `Trajet encore trop long : ${segments}`);
  assert.ok(segments.slice(0, -1).every(value => value <= 12), `Longue traversee entre deux pylones : ${segments}`);
  assert.ok(distance(pylons.at(-1), pylons[0]) <= 12, 'retour au premier pylone apres erreur');
  assert.deepEqual(Array.from(level.sequence), [0, 2, 4, 1, 3]);
});

test('WD-006 : recomposer les objectifs ne superpose pas objets, ennemis, entree ou sortie', () => {
  const entities = [...level.objects, ...level.enemies, level.start, level.exit];
  assert.equal(new Set(entities.map(cell)).size, entities.length);
  for (const entity of entities) assert.equal(level.grid[Math.floor(entity.y)][Math.floor(entity.x)], 0);
  assert.equal(level.objects.length, 15);
  assert.deepEqual(Array.from(level.objects.filter(object => object.type === 'pylon'), object => object.id).sort(),
    ['palais-objective-1', 'palais-objective-2', 'palais-objective-3', 'palais-objective-4', 'palais-objective-5']);
});
