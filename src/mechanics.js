(function(root, factory) {
  const mechanics = factory();
  if (typeof module === 'object' && module.exports) module.exports = mechanics;
  if (root) root.AZIZ_MECHANICS = mechanics;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

  const PROJECTOR_MODES = Object.freeze({
    sweep: Object.freeze({
      id: 'sweep',
      label: 'Balayage',
      description: 'Repère les glyphes et couvre les couloirs.',
      cone: 0.72,
      range: 10.5,
      power: 0.72,
      wakeCost: 0.84,
      tint: '#d8aa62'
    }),
    focus: Object.freeze({
      id: 'focus',
      label: 'Focalisé',
      description: 'Charge les sceaux et brûle les présences.',
      cone: 0.30,
      range: 12.5,
      power: 1.42,
      wakeCost: 1.16,
      tint: '#ffe0a0'
    }),
    shelter: Object.freeze({
      id: 'shelter',
      label: 'Rempart',
      description: 'Protège à courte portée, au prix de la vigilance.',
      cone: 1.08,
      range: 5.4,
      power: 0.48,
      wakeCost: 1.34,
      tint: '#c88d52'
    })
  });
  const PROJECTOR_ORDER = Object.freeze(['sweep', 'focus', 'shelter']);

  function normalizeMode(mode) {
    return PROJECTOR_MODES[mode] ? mode : 'sweep';
  }

  function nextProjectorMode(mode) {
    const index = PROJECTOR_ORDER.indexOf(normalizeMode(mode));
    return PROJECTOR_ORDER[(index + 1) % PROJECTOR_ORDER.length];
  }

  function projectorLink(aziz = {}) {
    const wake = clamp(finite(aziz.wake, 0), 0, 100);
    const trust = clamp(finite(aziz.trust, 50), 0, 100);
    const corruption = clamp(finite(aziz.corruption, 0), 0, 100);
    const sync = clamp(finite(aziz.sync, 30), 0, 100);
    return clamp(wake * 0.54 + trust * 0.24 + sync * 0.28 - corruption * 0.34, 0, 100);
  }

  function projectorState(aziz = {}) {
    const mode = PROJECTOR_MODES[normalizeMode(aziz.mode)];
    const link = projectorLink(aziz);
    return Object.freeze({
      ...mode,
      link,
      online: finite(aziz.wake, 0) > 0 && link >= 8,
      stable: link >= 34,
      compromised: finite(aziz.corruption, 0) >= 62
    });
  }

  function objectiveRule(kind) {
    return ({
      seal: { mode: 'focus', minLink: 30, duration: 2.4, type: 'channel' },
      mirror: { mode: 'focus', minLink: 24, duration: 0, type: 'align' },
      echo: { mode: 'sweep', minLink: 18, duration: 0, type: 'sequence' },
      memory: { mode: 'sweep', minLink: 28, duration: 0, type: 'response' },
      pylon: { mode: 'focus', minLink: 34, duration: 0, type: 'sequence' },
      finalMirror: { mode: 'focus', minLink: 42, duration: 0, type: 'align' }
    })[kind] || { mode: 'sweep', minLink: 0, duration: 0, type: 'instant' };
  }

  function canOperateObjective(kind, aziz = {}) {
    const rule = objectiveRule(kind);
    const projector = projectorState(aziz);
    return {
      ok: projector.online && projector.link >= rule.minLink && projector.id === rule.mode,
      rule,
      projector
    };
  }

  function tensionTarget(state = {}) {
    const chapter = clamp(finite(state.chapterIndex, 0) / 5, 0, 1);
    const progress = clamp(finite(state.objectiveRatio, 0), 0, 1);
    const danger = clamp(finite(state.danger, 0), 0, 1);
    const wakeLoss = 1 - clamp(finite(state.wake, 100) / 100, 0, 1);
    const healthLoss = 1 - clamp(finite(state.health, 100) / 100, 0, 1);
    const resourceLoss = 1 - clamp(finite(state.battery, 100) / 100, 0, 1);
    const surge = clamp(finite(state.surge, 0), 0, 1);
    const grace = clamp(finite(state.grace, 0) / 12, 0, 1);
    const raw = 0.08 + chapter * 0.14 + progress * 0.18 + danger * 0.36 + wakeLoss * 0.17 + healthLoss * 0.14 + resourceLoss * 0.08 + surge * 0.2;
    return clamp(raw * (1 - grace * 0.62), 0.03, 1);
  }

  function endingKey(aziz = {}, campaign = {}) {
    const trust = clamp(finite(aziz.trust, 0), 0, 100);
    const corruption = clamp(finite(aziz.corruption, 100), 0, 100);
    const responses = Math.max(0, finite(campaign.correctResponses, 0));
    const errors = Math.max(0, finite(campaign.puzzleErrors, 0));
    if (trust >= 72 && corruption < 34 && responses >= 2 && errors <= 7) return 'true_dawn';
    if (trust >= 52 && corruption < 68) return 'guardian';
    if (corruption < 78 || trust >= 38) return 'false_light';
    return 'eternal_sleep';
  }

  function angleDelta(from, to) {
    return Math.atan2(Math.sin(to - from), Math.cos(to - from));
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.floor(finite(seconds, 0)));
    const minutes = Math.floor(total / 60);
    return `${String(minutes).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  return Object.freeze({
    PROJECTOR_MODES,
    PROJECTOR_ORDER,
    clamp,
    normalizeMode,
    nextProjectorMode,
    projectorLink,
    projectorState,
    objectiveRule,
    canOperateObjective,
    tensionTarget,
    endingKey,
    angleDelta,
    formatDuration
  });
});
