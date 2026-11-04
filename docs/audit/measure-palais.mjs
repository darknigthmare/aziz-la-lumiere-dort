import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../../', import.meta.url));
const baseline = '66c8efe0f309c1aeaf64673141467aea2e1d774c';
const beforeSource = execFileSync('git', ['show', `${baseline}:src/data.js`], { cwd: root, encoding: 'utf8' });
const afterSource = await readFile(new URL('../../src/data.js', import.meta.url), 'utf8');
const load = source => { const scope = vm.createContext({}); vm.runInContext(source, scope); return scope.AZIZ_DATA.CHAPTERS[4]; };
const cell = point => `${Math.floor(point.x)}:${Math.floor(point.y)}`;

function pathBetween(level, start, end) {
  const queue = [{ x: Math.floor(start.x), y: Math.floor(start.y) }], previous = new Map([[cell(start), null]]);
  for (let index = 0; index < queue.length; index++) {
    const point = queue[index];
    if (cell(point) === cell(end)) {
      const path = [];
      for (let key = cell(point); key !== null; key = previous.get(key)) path.push(key.split(':').map(Number));
      return path.reverse();
    }
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const next = { x: point.x + dx, y: point.y + dy }, key = cell(next);
      if (previous.has(key) || level.grid[next.y]?.[next.x] !== 0) continue;
      previous.set(key, cell(point)); queue.push(next);
    }
  }
  throw new Error('Destination inaccessible.');
}

function measure(level) {
  const ordered = level.sequence.map(slot => level.objects.find(object => object.type === 'pylon' && object.sequenceSlot === slot));
  const route = [level.start, ...ordered, level.exit];
  const paths = route.slice(1).map((point, index) => pathBetween(level, route[index], point));
  return { ordered: ordered.map(({ id, label, x, y }) => ({ id, label, x, y })),
    segments: paths.map(path => path.length - 1), total: paths.reduce((sum, path) => sum + path.length - 1, 0),
    returnAfterError: pathBetween(level, ordered.at(-1), ordered[0]).length - 1, paths };
}
const before = load(beforeSource), after = load(afterSource);
const measures = { before: measure(before), after: measure(after) };
const data = { baseline, currentDataSha256: createHash('sha256').update(afterSource).digest('hex'),
  method: 'Chemins minimaux orthogonaux sur la grille. Aucune durée humaine ni simulation de combat.', ...measures };
await writeFile(new URL('./palais-route.json', import.meta.url), JSON.stringify(data, null, 2) + '\n');

function panel(level, metrics, x, title) {
  const unit = 15, top = 85;
  let svg = `<g transform="translate(${x},0)"><text x="0" y="30" font-size="18" font-weight="bold">${title}</text><text x="0" y="55" font-size="13">${metrics.total} cases · segments ${metrics.segments.join(' / ')}</text>`;
  level.grid.forEach((row, y) => row.forEach((value, column) => { svg += `<rect x="${column * unit}" y="${top + y * unit}" width="${unit}" height="${unit}" fill="${value ? '#51463a' : '#ece1cc'}"/>`; }));
  const colors = ['#2879ab', '#9d4ea0', '#b8612c', '#357f56', '#ba3651', '#22578c'];
  metrics.paths.forEach((path, i) => { svg += `<polyline points="${path.map(([a, b]) => `${(a + .5) * unit},${top + (b + .5) * unit}`).join(' ')}" stroke="${colors[i]}" stroke-width="3" fill="none" stroke-linejoin="round"/>`; });
  for (const object of level.objects.filter(item => item.type === 'pylon')) {
    const roman = ['I', 'II', 'III', 'IV', 'V'][object.sequenceSlot];
    svg += `<circle cx="${object.x * unit}" cy="${top + object.y * unit}" r="9" fill="#fffaf0" stroke="#211b14"/><text x="${object.x * unit}" y="${top + object.y * unit + 4}" text-anchor="middle" font-size="10" font-weight="bold">${roman}</text>`;
  }
  for (const [point, label] of [[level.start, 'D'], [level.exit, 'S']]) svg += `<rect x="${point.x * unit - 8}" y="${top + point.y * unit - 8}" width="16" height="16" fill="#172c3e"/><text x="${point.x * unit}" y="${top + point.y * unit + 4}" text-anchor="middle" font-size="10" fill="#fff">${label}</text>`;
  return svg + `<text x="0" y="460" font-size="12">Retour au pylône I après erreur : ${metrics.returnAfterError} cases</text></g>`;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="870" height="525" viewBox="0 0 870 525"><rect width="870" height="525" fill="#fbf6ec"/><g font-family="Arial,sans-serif" fill="#28251f">${panel(before, measures.before, 28, 'Palais — implantation initiale')}${panel(after, measures.after, 460, 'Palais — boucle recomposée')}<text x="28" y="499" font-size="12">D : départ · S : sortie · ordre I, III, V, II, IV conservé · grille et identifiants inchangés</text><text x="28" y="517" font-size="11">Mesure de déplacement sur grille ; rythme, difficulté et confort restent à tester en jeu.</text></g></svg>`;
await writeFile(new URL('./palais-route.svg', import.meta.url), svg + '\n');
console.log(JSON.stringify({ before: measures.before.total, after: measures.after.total, segments: measures.after.segments, returnAfterError: measures.after.returnAfterError }));
