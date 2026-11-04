/* Géométrie et accessoires Canvas natifs. Les dimensions sont en cases du monde.
 * Le rendu ne modifie jamais la simulation ni les données de sauvegarde. */
(function (root, factory) {
  const visuals = factory();
  if (typeof module === 'object' && module.exports) module.exports = visuals;
  root.AZIZ_VISUALS = visuals;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const WORLD = Object.freeze({ wallHeight: 1.2, eyeHeight: .65, nearPlane: .06, viewDistance: 17 });
  const metric = (width, height, extra = {}) => Object.freeze({ width, height, pivot: 'bottom', zOffset: 0, support: 'ground', ...extra });
  const PROPS = Object.freeze({
    archive: metric(.28, .28), oil: metric(.20, .29), flash: metric(.28, .11),
    seal: metric(.42, .64), mirror: metric(.48, .84), echo: metric(.58, .58),
    memory: metric(.46, .68), pylon: metric(.42, 1.02), finalMirror: metric(.70, 1.04),
    bell: metric(.38, .48), door: metric(.76, 1.10), inscription: metric(.60, .50),
    exit: metric(.88, 1.16), fallback: metric(.40, .48)
  });
  // Les anciennes silhouettes des menaces sont conservées avec un pivot au sol.
  const ENEMIES = Object.freeze({
    scarabs: metric(.32, .25, { unitScale: .5, bottom: .24 }),
    jackal: metric(.42, .48, { unitScale: .65, bottom: .42 }),
    scribe: metric(.40, .82, { unitScale: .9, bottom: .42 }),
    veiled: metric(.54, .81, { unitScale: .9, bottom: .43 }),
    pharaoh: metric(.60, 1.03, { unitScale: .95, bottom: .48 }),
    fallback: metric(.44, .84, { unitScale: .9, bottom: .48 })
  });
  const propMetrics = type => Object.hasOwn(PROPS, type) ? PROPS[type] : PROPS.fallback;
  const enemyMetrics = type => Object.hasOwn(ENEMIES, type) ? ENEMIES[type] : ENEMIES.fallback;

  function createCamera(width, height, fov) {
    return { width, height, horizon: height / 2, focal: width / (2 * Math.tan(fov / 2)), ...WORLD };
  }

  function projectSprite(camera, player, sprite, dimensions) {
    const dx = sprite.x - player.x, dy = sprite.y - player.y;
    const cosine = Math.cos(player.a), sine = Math.sin(player.a);
    const cameraDepth = dx * cosine + dy * sine;
    const distance = Math.hypot(dx, dy);
    if (cameraDepth <= camera.nearPlane || distance >= camera.viewDistance) return null;
    const scale = camera.focal / cameraDepth;
    const screenX = camera.width / 2 + (dy * cosine - dx * sine) * scale;
    const floorY = camera.horizon + camera.eyeHeight * scale;
    const baseY = floorY - dimensions.zOffset * scale;
    const halfWidth = dimensions.width * scale / 2;
    const left = screenX - halfWidth, right = screenX + halfWidth;
    const top = baseY - dimensions.height * scale;
    if (right < 0 || left > camera.width || top > camera.height || baseY < 0) return null;
    return { cameraDepth, distance, scale, screenX, floorY, baseY, top, left, right };
  }

  function sceneFilter(options = {}) {
    const value = Number.isFinite(options.brightness) ? options.brightness : 1;
    const brightness = clamp(value, .7, 1.6);
    return options.highContrast ? `contrast(1.28) brightness(${Number((brightness * 1.12).toFixed(4))})`
      : brightness === 1 ? 'none' : `brightness(${brightness})`;
  }

  function path(context, points, fill, stroke) {
    context.beginPath();
    points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
    context.closePath();
    if (fill) { context.fillStyle = fill; context.fill(); }
    if (stroke) { context.strokeStyle = stroke; context.stroke(); }
  }
  function ellipse(context, x, y, rx, ry, fill, stroke) {
    context.beginPath();
    context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (fill) { context.fillStyle = fill; context.fill(); }
    if (stroke) { context.strokeStyle = stroke; context.stroke(); }
  }
  function line(context, points, color) {
    context.beginPath();
    points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
    context.strokeStyle = color;
    context.stroke();
  }
  function pedestal(context, width, height = .08) {
    context.fillStyle = '#554532';
    context.fillRect(-width / 2, -height, width, height);
    context.fillStyle = '#9f865b';
    context.fillRect(-width / 2, -height, width, .018);
  }

  function drawProp(context, sprite, pixelsPerUnit) {
    const kind = sprite.type, dimensions = propMetrics(kind);
    const accent = sprite.color || '#c7a264';
    const brass = '#a27e42', stone = '#68543d', dark = '#1b1712', ivory = '#e2cf9f';
    context.save();
    context.scale(pixelsPerUnit, pixelsPerUnit);
    context.lineWidth = .012;
    context.lineJoin = 'round';
    // Contact au sol : une ombre courte, indépendante du halo de l'objet.
    ellipse(context, 0, -.009, dimensions.width * .48, .013, 'rgba(0,0,0,.65)');

    if (kind === 'oil') {
      // Bidon d'huile ambrée, bouchon et anse latérale.
      path(context, [[-.075, -.015], [-.08, -.20], [-.05, -.235], [.045, -.235], [.075, -.20], [.075, -.015]], '#8e5828', brass);
      context.fillStyle = '#d2a15b';
      context.fillRect(-.03, -.29, .06, .055);
      line(context, [[.05, -.22], [.095, -.22], [.095, -.12], [.073, -.12]], brass);
      context.fillStyle = '#392b1d';
      context.fillRect(-.056, -.15, .112, .06);
      path(context, [[0, -.144], [.017, -.113], [0, -.098], [-.017, -.113]], '#e4b360');
    } else if (kind === 'flash') {
      // Plaque de magnésium plate : métal froid, angles coupés, trois nervures.
      path(context, [[-.14, -.025], [-.11, -.10], [.11, -.11], [.14, -.035], [.11, -.009], [-.11, -.009]], '#aebdc3', '#e9f0e6');
      for (let x = -.07; x <= .071; x += .07) line(context, [[x - .015, -.078], [x + .01, -.033]], '#50636b');
      path(context, [[.09, -.10], [.12, -.10], [.13, -.065], [.10, -.06]], '#e7e0c3');
    } else if (kind === 'archive') {
      path(context, [[-.14, -.015], [-.12, -.26], [0, -.28], [.12, -.26], [.14, -.015], [0, -.04]], '#cbbf94', '#88aeb7');
      line(context, [[0, -.04], [0, -.26]], '#786848');
      for (let row = 0; row < 4; row++) {
        const y = -.20 + row * .038;
        line(context, [[-.10, y], [-.025, y - .012]], '#675a45');
        line(context, [[.025, y - .012], [.10, y]], '#675a45');
      }
    } else if (kind === 'exit' || kind === 'door') {
      const w = dimensions.width, h = dimensions.height;
      const open = kind === 'exit' ? sprite.open : (sprite.done || sprite.used);
      context.fillStyle = stone;
      context.fillRect(-w / 2, -h, w, h);
      context.fillStyle = dark;
      context.fillRect(-w * .34, -h * .86, w * .68, h * .80);
      if (open) {
        context.fillStyle = '#090b0a';
        context.fillRect(-w * .30, -h * .82, w * .60, h * .76);
        context.fillStyle = '#b9a476';
        context.fillRect(w * .29, -h * .81, w * .025, h * .74);
        path(context, [[-.12, -.12], [0, -.21], [.12, -.12], [.05, -.12], [.05, -.065], [-.05, -.065], [-.05, -.12]], accent);
      } else {
        context.fillStyle = '#40372b';
        context.fillRect(-w * .30, -h * .82, w * .60, h * .76);
        for (let bar = 1; bar < 4; bar++) {
          context.fillStyle = '#7b6845';
          context.fillRect(-w * .32, -h * (.19 + bar * .17), w * .64, .035);
        }
        path(context, [[0, -h * .58], [.075, -h * .49], [0, -h * .40], [-.075, -h * .49]], accent, brass);
      }
      for (let row = 1; row < 6; row++) {
        const y = -h * row / 6;
        line(context, [[-w / 2, y], [-w * .35, y]], '#b29463');
        line(context, [[w * .35, y], [w / 2, y]], '#b29463');
      }
      context.fillStyle = '#b29463';
      context.fillRect(-w / 2, -h, w, .055);
      pedestal(context, w, .055);
    } else if (kind === 'seal') {
      pedestal(context, .42);
      path(context, [[-.14, -.08], [-.12, -.43], [.12, -.43], [.14, -.08]], stone, brass);
      path(context, [[-.16, -.54], [-.07, -.64], [.07, -.64], [.16, -.54], [.16, -.39], [.07, -.31], [-.07, -.31], [-.16, -.39]], '#3e3426', accent);
      ellipse(context, 0, -.475, .09, .10, null, accent);
      line(context, [[0, -.55], [0, -.40]], accent);
    } else if (kind === 'mirror' || kind === 'finalMirror') {
      const final = kind === 'finalMirror';
      const cy = final ? -.66 : -.55, rx = final ? .26 : .19, ry = final ? .30 : .25;
      pedestal(context, final ? .70 : .48);
      context.fillStyle = brass;
      context.fillRect(-.035, -.40, .07, .32);
      if (final) {
        path(context, [[-.32, -.08], [-.32, -.89], [-.23, -.99], [-.21, -.89], [-.24, -.08]], stone, brass);
        path(context, [[.32, -.08], [.32, -.89], [.23, -.99], [.21, -.89], [.24, -.08]], stone, brass);
        path(context, [[-.09, -.96], [0, -1.04], [.09, -.96]], accent);
      }
      ellipse(context, 0, cy, rx + .025, ry + .025, brass);
      ellipse(context, 0, cy, rx, ry, '#456069', accent);
      line(context, [[-rx * .6, cy + ry * .45], [rx * .5, cy - ry * .56]], '#9ebfc2');
      // Repère fixe en haut, aiguille seule orientée (le support reste vertical).
      for (let index = 0; index < 4; index++) {
        const a = index * Math.PI / 2;
        line(context, [[Math.sin(a) * rx * .76, cy - Math.cos(a) * ry * .76], [Math.sin(a) * rx * .94, cy - Math.cos(a) * ry * .94]], ivory);
      }
      if (sprite.revealed) {
        const target = (sprite.targetOrientation || 0) * Math.PI / 2;
        const x = Math.sin(target) * rx * .87, y = cy - Math.cos(target) * ry * .87;
        ellipse(context, x, y, .025, .025, '#ecdfb1', dark);
      }
      context.save();
      context.translate(0, cy);
      context.rotate((sprite.orientation || 0) * Math.PI / 2);
      path(context, [[0, -ry * .70], [.038, .035], [0, .012], [-.038, .035]], accent, dark);
      context.restore();
    } else if (kind === 'echo') {
      pedestal(context, .58);
      for (let pipe = -1; pipe <= 1; pipe++) {
        const x = pipe * .18, h = pipe === 0 ? .58 : .43;
        context.fillStyle = '#8f7044';
        context.fillRect(x - .055, -h + .05, .11, h - .13);
        ellipse(context, x, -h + .055, .07, .055, dark, brass);
        line(context, [[x - .045, -.18], [x + .045, -.18]], accent);
      }
    } else if (kind === 'memory') {
      pedestal(context, .46);
      path(context, [[-.16, -.08], [-.16, -.54], [-.10, -.68], [.10, -.68], [.16, -.54], [.16, -.08]], '#4b514b', brass);
      ellipse(context, 0, -.49, .095, .12, sprite.active || sprite.done ? '#c7b68d' : '#585e54', accent);
      path(context, [[-.11, -.18], [-.085, -.34], [0, -.38], [.085, -.34], [.11, -.18]], '#a99776', accent);
      line(context, [[-.04, -.50], [-.015, -.50]], dark);
      line(context, [[.015, -.50], [.04, -.50]], dark);
    } else if (kind === 'pylon') {
      pedestal(context, .42);
      path(context, [[-.14, -.08], [-.09, -.88], [0, -1.02], [.09, -.88], [.14, -.08]], stone, brass);
      path(context, [[0, -.98], [.09, -.87], [.135, -.08], [0, -.08]], '#40372b');
      for (let tier = 0; tier < 3; tier++) {
        const y = -.32 - tier * .19;
        line(context, [[-.065, y], [0, y - .035], [.065, y]], accent);
      }
    } else if (kind === 'bell') {
      ellipse(context, 0, -.44, .035, .034, null, brass);
      context.beginPath();
      context.moveTo(-.17, -.07);
      context.quadraticCurveTo(-.10, -.15, -.105, -.29);
      context.quadraticCurveTo(-.085, -.405, 0, -.41);
      context.quadraticCurveTo(.085, -.405, .105, -.29);
      context.quadraticCurveTo(.10, -.15, .17, -.07);
      context.closePath();
      context.fillStyle = '#9b7640';
      context.fill();
      context.strokeStyle = accent;
      context.stroke();
      ellipse(context, 0, -.07, .18, .035, dark, brass);
      ellipse(context, 0, -.045, .027, .035, brass);
    } else {
      // Stèle à inscriptions ; repli explicite pour les futurs objets de données.
      const w = dimensions.width, h = dimensions.height;
      pedestal(context, w);
      path(context, [[-w * .44, -.08], [-w * .42, -h * .90], [-w * .31, -h], [w * .37, -h], [w * .44, -.08]], stone, brass);
      for (let row = 0; row < 3; row++) {
        const y = -h * .73 + row * .085;
        line(context, [[-w * .26, y], [w * .23, y]], accent);
        line(context, [[-w * .10, y - .025], [-w * .10, y + .022]], accent);
      }
    }
    if (sprite.active && !sprite.done) {
      const half = dimensions.width * .45;
      line(context, [[-half, -.12], [-half, -.04], [-half + .04, -.04]], '#ecdfb1');
      line(context, [[half, -.12], [half, -.04], [half - .04, -.04]], '#ecdfb1');
      if (kind === 'seal') {
        context.fillStyle = '#e6d390';
        context.fillRect(-.15, -.065, .30 * clamp(sprite.progress || 0, 0, 1), .024);
      }
    }
    if (['mirror', 'finalMirror'].includes(kind) && !sprite.done && sprite.attempts > 0 && sprite.orientation !== sprite.targetOrientation) {
      line(context, [[-.032, -.073], [.032, -.018]], '#c3966c');
      line(context, [[.032, -.073], [-.032, -.018]], '#c3966c');
    }
    // État validé aussi exprimé par une coche, sans dépendre de la couleur.
    if (sprite.done && !['archive', 'oil', 'flash'].includes(kind)) {
      context.lineWidth = .019;
      line(context, [[-.052, -.052], [-.013, -.022], [.057, -.075]], '#bde4ca');
    }
    context.restore();
  }

  function viewmodelLayout(width, height) {
    return { x: width * .72, y: height * .975, scale: Math.min(width * .28, height * .33) };
  }

  function drawViewmodel(context, width, height, state) {
    const layout = viewmodelLayout(width, height);
    const lit = state.lampOn && state.battery > 0;
    const status = state.projector;
    const signal = state.signalActive ? '#f0d498' : status.online ? '#95b9b4' : '#5e5545';
    context.save();
    context.translate(layout.x, layout.y);
    context.scale(layout.scale, layout.scale);
    context.lineWidth = .018;
    context.lineJoin = 'round';
    // Manche et main tiennent la lampe ; aucune oscillation liée au monde.
    path(context, [[.12, .08], [-.04, -.28], [.10, -.47], [.28, -.41], [.49, .08]], '#514532', '#847253');
    path(context, [[-.05, -.31], [-.10, -.49], [.02, -.62], [.19, -.55], [.20, -.31]], '#9d7851', '#c29c69');
    path(context, [[-.045, -.40], [-.12, -.74], [.03, -.92], [.25, -.83], [.22, -.46]], '#514631', '#ae9158');
    for (let band = 0; band < 3; band++) line(context, [[-.03 + band * .015, -.48 - band * .08], [.19 + band * .005, -.52 - band * .08]], '#211e18');
    ellipse(context, .06, -.83, .185, .13, '#ae9158', '#d1b475');
    ellipse(context, .06, -.83, .145, .095, lit ? '#e8cf8c' : '#3b4546', lit ? '#fff0bc' : '#758182');
    line(context, [[-.045, -.83], [.15, -.83]], lit ? '#fff1c4' : '#586463');
    // Boîtier de signal fixé au poignet : cadran du mode et lien permanent.
    path(context, [[-.35, -.23], [-.40, -.53], [-.15, -.59], [-.095, -.28]], '#242c2b', '#8b7954');
    ellipse(context, -.255, -.43, .077, .071, '#141b1c', '#a6a084');
    const modeAngle = status.id === 'focus' ? 0 : status.id === 'shelter' ? Math.PI / 3 : -Math.PI / 3;
    line(context, [[-.255, -.43], [-.255 + Math.sin(modeAngle) * .055, -.43 - Math.cos(modeAngle) * .055]], signal);
    context.fillStyle = status.link < 24 ? '#b7814c' : signal;
    context.fillRect(-.32, -.32, .12, .026);
    if (state.reduceFlashes) {
      // Témoins locaux fixes : aucune alternance, aucun voile lumineux plein écran.
      if (state.magnesium) path(context, [[-.38, -.535], [-.30, -.55], [-.29, -.515], [-.37, -.50]], '#d9e0d8');
      if (state.veil) {
        line(context, [[-.20, -.55], [-.16, -.50], [-.12, -.55]], '#c9c1ac');
        line(context, [[-.20, -.52], [-.16, -.47], [-.12, -.52]], '#c9c1ac');
      }
    }
    context.restore();
  }

  return Object.freeze({ WORLD, PROPS, ENEMIES, propMetrics, enemyMetrics, createCamera, projectSprite,
    sceneFilter, drawProp, viewmodelLayout, drawViewmodel });
});
