(() => {
  'use strict';

  const Data = window.AZIZ_DATA;
  const Mechanics = window.AZIZ_MECHANICS;
  const Visuals = window.AZIZ_VISUALS;
  if (!Data || !Mechanics || !Visuals) throw new Error('Le moteur AZIZ est incomplet.');

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const clone = value => structuredClone(value);
  const { clamp, angleDelta, projectorState, nextProjectorMode, canOperateObjective, tensionTarget, endingKey, formatDuration } = Mechanics;
  const STORAGE_KEY = 'aziz-v1.2.0-save';
  const PROFILE_KEY = 'aziz-v1.2.0-profile';
  const ORIENTATIONS = ['nord', 'est', 'sud', 'ouest'];
  const ACTIONS = Object.freeze({
    forward: { title: 'Avancer', keys: ['KeyW', 'KeyZ', 'ArrowUp'] },
    backward: { title: 'Reculer', keys: ['KeyS', 'ArrowDown'] },
    strafeLeft: { title: 'Pas à gauche', keys: ['KeyA', 'KeyQ'] },
    strafeRight: { title: 'Pas à droite', keys: ['KeyD'] },
    turnLeft: { title: 'Tourner à gauche', keys: ['ArrowLeft'] },
    turnRight: { title: 'Tourner à droite', keys: ['ArrowRight'] },
    run: { title: 'Courir', keys: ['ShiftLeft', 'ShiftRight'], touch: 'COURIR', pad: 'Clic stick gauche' },
    interact: { title: 'Examiner / actionner', keys: ['KeyE', 'Enter'], codes: ['Mouse0', 'Pad:interact', 'Touch:interact'], touch: 'EXAMINER', pad: 'A / Croix', mouse: 'clic gauche' },
    call: { title: 'Appeler Aziz', keys: ['KeyF'], codes: ['Pad:call', 'Touch:call'], touch: 'AZIZ', pad: 'X / Carré' },
    signal: { title: 'Changer le projecteur', keys: ['KeyC'], codes: ['Mouse2', 'Pad:signal', 'Touch:signal'], touch: 'SIGNAL', pad: 'B / Rond', mouse: 'clic droit' },
    flash: { title: 'Flash au magnésium', keys: ['Space'], codes: ['Pad:flash', 'Touch:flash'], touch: 'FLASH', pad: 'Y / Triangle' },
    lamp: { title: 'Allumer / éteindre la lampe', keys: ['KeyL'], codes: ['Pad:lamp', 'Touch:lamp'], touch: 'LAMPE', pad: 'LB / L1' },
    journal: { title: 'Ouvrir le carnet', keys: ['Tab', 'KeyJ'], codes: ['Pad:journal'], touch: 'Pause → Journal', pad: 'View / Pavé tactile' },
    pause: { title: 'Pause', keys: ['Escape'], codes: ['Escape', 'Pad:pause', 'Touch:pause'], touch: 'Ⅱ', pad: 'Menu / Options' }
  });
  const DEFAULT_BINDINGS = Object.freeze(Object.fromEntries(Object.entries(ACTIONS).map(([key, action]) => [key, Object.freeze([...action.keys])])));
  const validBinding = (code, action) => typeof code === 'string' &&
    (/^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Arrow(Up|Down|Left|Right)|Space|Enter|Shift(Left|Right)|Backspace|Comma|Period|Slash|Semicolon|Quote|BracketLeft|BracketRight|Backslash|Minus|Equal)$/.test(code) || code === 'Escape' && action === 'pause' || code === 'Tab' && action === 'journal');
  function normalizeBindings(candidate) {
    const result = {};
    const used = new Set();
    for (const [action, defaults] of Object.entries(DEFAULT_BINDINGS)) {
      const raw = candidate?.[action];
      const keys = Array.isArray(raw) && raw.length > 0 && raw.length <= 3 && raw.every(code => validBinding(code, action)) ? [...new Set(raw)] : [...defaults];
      if (keys.some(code => used.has(code))) return clone(DEFAULT_BINDINGS);
      keys.forEach(code => used.add(code));
      result[action] = keys;
    }
    return result;
  }
  const actionKeys = (profile, action) => profile?.options?.bindings?.[action] || DEFAULT_BINDINGS[action];
  const actionCodes = (profile, action) => [...actionKeys(profile, action), ...(ACTIONS[action].codes || [])];
  function keyLabel(code) {
    const names = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Espace', Enter: 'Entrée', Escape: 'Échap', Tab: 'Tab', ShiftLeft: 'Maj gauche', ShiftRight: 'Maj droite', Backspace: 'Retour arrière', Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=' };
    return names[code] || code.replace(/^Key|^Digit/, '').replace(/^Numpad/, 'Pavé ');
  }
  function actionLabel(profile, device, action) {
    const definition = ACTIONS[action];
    if (device === 'touch' && definition.touch) return definition.touch;
    if (device === 'gamepad' && definition.pad) return definition.pad;
    const keys = actionKeys(profile, action).map(keyLabel).join(' / ');
    return device === 'mouse' && definition.mouse ? `${keys} / ${definition.mouse}` : keys;
  }
  function remapBinding(profile, action, code) {
    if (!Object.hasOwn(ACTIONS, action) || !validBinding(code, action)) return 'Cette touche est réservée ou indisponible. Choisissez une touche simple.';
    const bindings = normalizeBindings(profile.options.bindings);
    const conflict = Object.entries(bindings).find(([other, keys]) => other !== action && keys.includes(code));
    if (conflict) return `${keyLabel(code)} est déjà utilisée pour « ${ACTIONS[conflict[0]].title} ». Choisissez une autre touche.`;
    profile.options.bindings = { ...bindings, [action]: [code] };
    return '';
  }
  function controlsSummary(profile, device) {
    const label = action => actionLabel(profile, device, action);
    const move = device === 'touch' ? 'Joystick : marcher · glisser sur la vue : regarder' : device === 'gamepad' ? 'Stick gauche : marcher · stick droit : regarder' :
      `${label('forward')} / ${label('backward')} : avancer / reculer · ${label('strafeLeft')} / ${label('strafeRight')} : pas de côté · ${label('turnLeft')} / ${label('turnRight')} : tourner · souris : regarder`;
    return `${move} · ${label('run')} : courir · ${label('interact')} : examiner · ${label('call')} : appeler Aziz · ${label('signal')} : signal · ${label('flash')} : flash · ${label('lamp')} : lampe · ${label('journal')} : carnet · ${label('pause')} : pause.`;
  }
  function collectionEntries(profile, { category = 'archives', filter = 'all', chapter = 'all' } = {}) {
    let entries;
    if (category === 'achievements') entries = Data.ACHIEVEMENTS.map(item => {
      const found = profile.achievements.includes(item.id);
      const secret = item.id === 'aube' && !found;
      return { id: item.id, found, title: secret ? 'Succès secret' : item.title,
        text: `${found ? 'Obtenu' : 'À accomplir'} · ${secret ? 'Découvrez un dénouement rare.' : item.description}` };
    });
    else if (category === 'endings') entries = Object.entries(Data.ENDINGS).map(([id, ending]) => {
      const found = profile.endings.includes(id);
      return { id, found, title: found ? ending.title : 'Fin non découverte', text: found ? ending.text : 'Poursuivez votre relation avec Aziz pour découvrir un autre dénouement.' };
    });
    else entries = Data.ARCHIVES.filter(item => chapter === 'all' || item.chapter === Number(chapter)).map(item => {
      const found = profile.archives.includes(item.id);
      return { id: item.id, found, title: item.title, text: found ? item.text : 'Document non découvert.' };
    });
    return entries.filter(entry => filter === 'all' || (filter === 'found' ? entry.found : !entry.found));
  }
  function notebookEntries(profile) {
    const discovered = new Set(profile.notebook || []);
    return Data.CHAPTERS.map(chapter => ({
      id: chapter.id, title: chapter.title,
      entries: [
        ...chapter.objects.filter(object => discovered.has(object.id)).map(object => ({
          title: object.label,
          text: object.type === 'inscription' ? object.text : chapter.mechanic === 'align' ?
            `Orientation constatée : ${ORIENTATIONS[object.targetOrientation]}.` : 'Mécanisme actionné au cours d’une expédition.'
        })),
        ...Data.ARCHIVES.filter(archive => archive.chapter === chapter.index && profile.archives.includes(archive.id)).map(archive => ({ title: archive.title, text: archive.text }))
      ]
    })).filter(chapter => chapter.entries.length);
  }
  const DEFAULT_OPTIONS = Object.freeze({
    volume: .68,
    effectsVolume: 1,
    ambienceVolume: .8,
    voiceVolume: 1,
    reduceDynamicRange: false,
    brightness: 1,
    reduceFlashes: false,
    sensitivity: .9,
    fov: 66,
    quality: 'auto',
    subtitles: true,
    voices: false,
    reduceMotion: false,
    largeText: false,
    highContrast: false,
    directionCues: true,
    bindings: DEFAULT_BINDINGS,
    touchScale: 1,
    touchSide: 'right',
    touchSprint: 'toggle'
  });
  const DEFAULT_PROFILE = Object.freeze({
    difficulty: 'expedition',
    unlocked: 1,
    archives: [],
    achievements: [],
    endings: [],
    visited: [],
    notebook: [],
    notebookRecent: null,
    onboardingComplete: false,
    options: DEFAULT_OPTIONS
  });
  const DEFAULT_STATS = Object.freeze({
    calls: 0,
    flashes: 0,
    hits: 0,
    signals: 0,
    revives: 0,
    deaths: 0,
    puzzleErrors: 0,
    correctResponses: 0,
    objectives: 0,
    objectiveAttempts: 0,
    chaptersCompleted: 0,
    startedAt: 0
  });
  const DEFAULT_CHAPTER_STATS = Object.freeze({ calls: 0, flashes: 0, hits: 0, mirrorErrors: 0 });

  const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
  const bounded = (value, minimum, maximum, fallback = minimum) => clamp(finite(value, fallback), minimum, maximum);
  const uniqueAllowed = (values, allowed) => [...new Set((Array.isArray(values) ? values : []).filter(value => allowed.has(value)))];
  const DIFFICULTY_ORDER = ['exploration', 'expedition', 'eclipse'];
  const knownDifficulty = value => DIFFICULTY_ORDER.includes(value) ? value : null;
  const emptyCampaignEvents = () => ({ objectives: [], responses: [], chapters: [] });
  const connectedGamepad = () => Array.from(navigator.getGamepads?.() || []).find(pad => pad && pad.connected !== false);

  class Storage {
    constructor() {
      this.memory = new Map();
      this.degraded = false;
      this.onDegraded = null;
    }

    markDegraded() {
      if (this.degraded) return;
      this.degraded = true;
      queueMicrotask(() => this.onDegraded?.());
    }

    read(key) {
      if (this.degraded && this.memory.has(key)) return this.memory.get(key);
      try {
        const value = localStorage.getItem(key);
        this.memory.set(key, value);
        return value;
      } catch {
        this.markDegraded();
        return this.memory.get(key) ?? null;
      }
    }

    write(key, value) {
      this.memory.set(key, value);
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        this.markDegraded();
        return false;
      }
    }

    remove(key) {
      this.memory.set(key, null);
      try {
        localStorage.removeItem(key);
        return true;
      } catch {
        this.markDegraded();
        return false;
      }
    }

    normalizeProfile(candidate) {
      const raw = candidate && typeof candidate === 'object' ? candidate : {};
      const rawOptions = raw.options && typeof raw.options === 'object' ? raw.options : {};
      const difficulty = typeof raw.difficulty === 'string' && Object.hasOwn(Data.DIFFICULTIES, raw.difficulty) ? raw.difficulty : DEFAULT_PROFILE.difficulty;
      const archiveIds = new Set(Data.ARCHIVES.map(item => item.id));
      const achievementIds = new Set(Data.ACHIEVEMENTS.map(item => item.id));
      const endingIds = new Set(Object.keys(Data.ENDINGS));
      const chapterIds = new Set(Data.CHAPTERS.map(item => item.id));
      const noteIds = new Set(Data.CHAPTERS.flatMap(chapter => chapter.objects.filter(object => object.type === 'inscription' || object.type === chapter.kind).map(object => object.id)));
      const recent = raw.notebookRecent;
      const quality = ['auto', 'low', 'high'].includes(rawOptions.quality) ? rawOptions.quality : DEFAULT_OPTIONS.quality;
      return {
        difficulty,
        unlocked: Math.trunc(bounded(raw.unlocked, 1, 6, 1)),
        archives: uniqueAllowed(raw.archives, archiveIds),
        achievements: uniqueAllowed(raw.achievements, achievementIds),
        endings: uniqueAllowed(raw.endings, endingIds),
        visited: uniqueAllowed(raw.visited, chapterIds),
        notebook: uniqueAllowed(raw.notebook, noteIds),
        notebookRecent: recent && chapterIds.has(recent.chapterId) && typeof recent.text === 'string' ? { chapterId: recent.chapterId, text: recent.text.trim().slice(0, 1000) } : null,
        onboardingComplete: raw.onboardingComplete === true,
        options: {
          volume: bounded(rawOptions.volume, 0, 1, DEFAULT_OPTIONS.volume),
          effectsVolume: bounded(rawOptions.effectsVolume, 0, 1, DEFAULT_OPTIONS.effectsVolume),
          ambienceVolume: bounded(rawOptions.ambienceVolume, 0, 1, DEFAULT_OPTIONS.ambienceVolume),
          voiceVolume: bounded(rawOptions.voiceVolume, 0, 1, DEFAULT_OPTIONS.voiceVolume),
          reduceDynamicRange: rawOptions.reduceDynamicRange === true,
          brightness: bounded(rawOptions.brightness, .7, 1.6, DEFAULT_OPTIONS.brightness),
          reduceFlashes: rawOptions.reduceFlashes === true,
          sensitivity: bounded(rawOptions.sensitivity, .3, 2, DEFAULT_OPTIONS.sensitivity),
          fov: bounded(rawOptions.fov, 55, 85, DEFAULT_OPTIONS.fov),
          quality,
          subtitles: rawOptions.subtitles !== false,
          voices: rawOptions.voices === true,
          reduceMotion: rawOptions.reduceMotion === true,
          largeText: rawOptions.largeText === true,
          highContrast: rawOptions.highContrast === true,
          directionCues: rawOptions.directionCues !== false,
          bindings: normalizeBindings(rawOptions.bindings),
          touchScale: bounded(rawOptions.touchScale, .85, 1.25, 1),
          touchSide: rawOptions.touchSide === 'left' ? 'left' : 'right',
          touchSprint: rawOptions.touchSprint === 'hold' ? 'hold' : 'toggle'
        }
      };
    }

    validProfile(candidate) {
      return !!candidate && typeof candidate === 'object' &&
        Array.isArray(candidate.archives) && Array.isArray(candidate.achievements) && Array.isArray(candidate.endings);
    }

    normalizeSave(candidate) {
      if (!candidate || candidate.version !== Data.VERSION || !Number.isInteger(candidate.chapterIndex)) return null;
      const chapterIndex = candidate.chapterIndex;
      const level = Data.CHAPTERS[chapterIndex];
      if (!level || !candidate.player || typeof candidate.player !== 'object') return null;
      const walkable = (x, y) => Number.isFinite(x) && Number.isFinite(y) && x >= 1 && y >= 1 &&
        x < level.w - 1 && y < level.h - 1 && level.grid[Math.floor(y)]?.[Math.floor(x)] === 0;
      const playerX = walkable(candidate.player.x, candidate.player.y) ? candidate.player.x : level.start.x;
      const playerY = walkable(candidate.player.x, candidate.player.y) ? candidate.player.y : level.start.y;
      const objectIds = new Set(level.objects.map(item => item.id));
      const completedIds = uniqueAllowed(candidate.completedIds, objectIds);
      const rawObjectStates = candidate.objectStates && typeof candidate.objectStates === 'object' ? candidate.objectStates : {};
      const objectStates = {};
      for (const object of level.objects) {
        const state = rawObjectStates[object.id];
        if (!state || typeof state !== 'object') continue;
        objectStates[object.id] = {
          done: state.done === true,
          used: state.used === true,
          orientation: Math.trunc(bounded(state.orientation, 0, 3, object.orientation || 0)),
          progress: bounded(state.progress, 0, 1, 0),
          attempts: Math.trunc(bounded(state.attempts, 0, 99, 0)),
          revealed: state.revealed === true
        };
      }
      const rawEnemies = new Map((Array.isArray(candidate.enemyStates) ? candidate.enemyStates : []).map(item => [item?.id, item]));
      const deadEnemies = new Set(Array.isArray(candidate.deadEnemies) ? candidate.deadEnemies : []);
      const enemyStates = level.enemies.map(enemy => {
        const raw = rawEnemies.get(enemy.id) || {};
        const x = walkable(raw.x, raw.y) ? raw.x : enemy.x;
        const y = walkable(raw.x, raw.y) ? raw.y : enemy.y;
        return {
          id: enemy.id,
          x,
          y,
          health: bounded(raw.health, 0, Data.THREATS[enemy.type].health, enemy.health),
          alive: deadEnemies.has(enemy.id) ? false : raw.alive !== false,
          alert: bounded(raw.alert, 0, 1, 0),
          memory: bounded(raw.memory, 0, 20, 0),
          targetX: walkable(raw.targetX, raw.targetY) ? raw.targetX : null,
          targetY: walkable(raw.targetX, raw.targetY) ? raw.targetY : null,
          state: ['dormant', 'investigate', 'chase', 'search', 'stunned'].includes(raw.state) ? raw.state : 'dormant'
        };
      });
      const rawAziz = candidate.aziz && typeof candidate.aziz === 'object' ? candidate.aziz : {};
      const rawStats = candidate.stats && typeof candidate.stats === 'object' ? candidate.stats : {};
      const rawChapterStats = candidate.chapterStats && typeof candidate.chapterStats === 'object' ? candidate.chapterStats : {};
      const stats = {};
      for (const key of Object.keys(DEFAULT_STATS)) stats[key] = Math.max(0, finite(rawStats[key], DEFAULT_STATS[key]));
      // Les actions cumulées restent distinctes des événements validés une fois.
      // Une ancienne sauvegarde ne permet de reconstruire que les étapes prouvées.
      const reached = Data.CHAPTERS.slice(0, chapterIndex + 1);
      const objectiveIds = new Set(reached.flatMap(chapter => chapter.objects.filter(object => object.type === chapter.kind).map(object => object.id)));
      const responseIds = new Set(reached.flatMap(chapter => [
        ...chapter.objects.filter(object => object.type === 'memory').map(object => `memory:${object.id}`),
        ...chapter.enemies.filter(enemy => enemy.type === 'veiled').map(enemy => `veil:${enemy.id}`)
      ]));
      const rawEvents = candidate.campaignEvents;
      const legacyCompleted = !rawEvents && stats.chaptersCompleted >= chapterIndex ? reached.slice(0, chapterIndex) : [];
      const knownObjectives = [
        ...legacyCompleted.flatMap(chapter => chapter.objects.filter(object => object.type === chapter.kind)),
        ...level.objects.filter(object => object.type === level.kind && (completedIds.includes(object.id) || objectStates[object.id]?.done))
      ];
      const objectiveEvents = uniqueAllowed([...(Array.isArray(rawEvents?.objectives) ? rawEvents.objectives : []), ...knownObjectives.map(object => object.id)], objectiveIds);
      const provenResponses = objectiveEvents.map(id => `memory:${id}`).filter(id => responseIds.has(id));
      const campaignEvents = {
        objectives: objectiveEvents,
        responses: uniqueAllowed([...(Array.isArray(rawEvents?.responses) ? rawEvents.responses : []), ...provenResponses], responseIds),
        chapters: uniqueAllowed(rawEvents ? rawEvents.chapters : legacyCompleted.map(chapter => chapter.id), new Set(reached.map(chapter => chapter.id)))
      };
      stats.objectiveAttempts = Math.max(stats.objectiveAttempts, stats.objectives, campaignEvents.objectives.length);
      stats.objectives = campaignEvents.objectives.length;
      stats.correctResponses = campaignEvents.responses.length;
      stats.chaptersCompleted = campaignEvents.chapters.length;
      const difficulty = knownDifficulty(candidate.difficulty);
      const rawDifficulty = candidate.campaignDifficulty || {};
      const started = knownDifficulty(rawDifficulty.started);
      const played = [started, knownDifficulty(rawDifficulty.lowest), difficulty].filter(Boolean);
      const campaignDifficulty = {
        started,
        lowest: played.length ? DIFFICULTY_ORDER[Math.min(...played.map(value => DIFFICULTY_ORDER.indexOf(value)))] : null,
        fromStart: rawDifficulty.fromStart === true && !!started
      };
      const chapterStats = {};
      for (const key of Object.keys(DEFAULT_CHAPTER_STATS)) chapterStats[key] = Math.max(0, finite(rawChapterStats[key], DEFAULT_CHAPTER_STATS[key]));
      return {
        version: Data.VERSION,
        chapterIndex,
        player: {
          x: playerX,
          y: playerY,
          a: finite(candidate.player.a, level.start.a),
          health: bounded(candidate.player.health, 0.1, 100, 100),
          battery: bounded(candidate.player.battery, 0, 100, 100),
          flashes: Math.trunc(bounded(candidate.player.flashes, 0, 6, 3)),
          lampOn: candidate.player.lampOn !== false,
          calm: bounded(candidate.player.calm, 0, 100, 100)
        },
        aziz: {
          wake: bounded(rawAziz.wake, 0, 100, 100),
          trust: bounded(rawAziz.trust, 0, 100, 50),
          corruption: bounded(rawAziz.corruption, 0, 100, 0),
          sync: bounded(rawAziz.sync, 0, 100, 35),
          mode: Mechanics.normalizeMode(rawAziz.mode)
        },
        completedIds,
        objectStates,
        enemyStates,
        elapsed: Math.max(0, finite(candidate.elapsed, 0)),
        campaignElapsed: Math.max(0, finite(candidate.campaignElapsed, finite(candidate.elapsed, 0))),
        difficulty,
        campaignDifficulty,
        campaignEvents,
        stats,
        chapterStats,
        savedAt: typeof candidate.savedAt === 'string' ? candidate.savedAt : null
      };
    }

    getProfile() {
      try { return this.normalizeProfile(JSON.parse(this.read(PROFILE_KEY))); }
      catch { return this.normalizeProfile(null); }
    }

    saveProfile(profile) {
      this.write(PROFILE_KEY, JSON.stringify(this.normalizeProfile(profile)));
    }

    getSave() {
      try { return this.normalizeSave(JSON.parse(this.read(STORAGE_KEY))); }
      catch { return null; }
    }

    save(snapshot) {
      const normalized = this.normalizeSave({ ...snapshot, version: Data.VERSION });
      if (!normalized) throw new Error('État de campagne invalide.');
      normalized.savedAt = new Date().toISOString();
      this.write(STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }

    clear() {
      this.remove(STORAGE_KEY);
    }

    export() {
      return JSON.stringify({
        schema: 'aziz-save',
        version: Data.VERSION,
        exportedAt: new Date().toISOString(),
        buildRevision: window.AZIZ_RELEASE?.revision || 'local',
        save: this.getSave(),
        profile: this.getProfile()
      }, null, 2);
    }

    prepareImport(text) {
      const bundle = JSON.parse(text);
      if (!bundle || bundle.schema !== 'aziz-save' || bundle.version !== Data.VERSION || !this.validProfile(bundle.profile)) {
        throw new Error('Sauvegarde AZIZ v1.2.0 invalide.');
      }
      const profile = this.normalizeProfile(bundle.profile);
      const save = bundle.save === null ? null : this.normalizeSave(bundle.save);
      if (bundle.save !== null && !save) throw new Error('État de campagne corrompu ou incompatible.');
      return { profile, save };
    }

    import(text) {
      const { profile, save } = this.prepareImport(text);
      this.write(PROFILE_KEY, JSON.stringify(profile));
      if (save) this.write(STORAGE_KEY, JSON.stringify(save));
      return { profile, save };
    }
  }

  class AudioEngine {
    constructor(profile) {
      this.profile = profile;
      this.ctx = null;
      this.master = null;
      this.buses = null;
      this.compressor = null;
      this.suspended = true;
      this.voiceToken = 0;
      this.previewToken = 0;
      this.previewActive = false;
      this.voiceActive = false;
      this.drone = null;
      this.pulse = null;
      this.nextBeat = 0;
      this.nextCreak = 0;
    }

    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        this.applyMix();
        return true;
      }
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;
      try {
        this.ctx = new AudioContextClass();
        this.master = this.ctx.createGain();
        this.buses = { effects: this.ctx.createGain(), ambience: this.ctx.createGain() };
        this.buses.effects.connect(this.master);
        this.buses.ambience.connect(this.master);
        this.compressor = this.ctx.createDynamicsCompressor?.();
        if (this.compressor) this.master.connect(this.compressor).connect(this.ctx.destination);
        else this.master.connect(this.ctx.destination);
        this.applyMix();
        const oscillator = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 39;
        gain.gain.value = .026;
        oscillator.connect(gain).connect(this.buses.ambience);
        oscillator.start();
        this.drone = { oscillator, gain };
        return true;
      } catch {
        this.ctx = null;
        return false;
      }
    }

    applyMix() {
      const options = this.profile.options;
      if (this.master) this.master.gain.value = options.volume * .24;
      if (this.buses) {
        this.buses.effects.gain.value = finite(options.effectsVolume, 1);
        this.buses.ambience.gain.value = finite(options.ambienceVolume, .8);
      }
      if (this.compressor) {
        this.compressor.threshold.value = options.reduceDynamicRange ? -24 : 0;
        this.compressor.knee.value = options.reduceDynamicRange ? 18 : 0;
        this.compressor.ratio.value = options.reduceDynamicRange ? 4 : 1;
        this.compressor.attack.value = .01;
        this.compressor.release.value = .2;
      }
      if (this.voiceActive && (!options.voices || options.volume <= 0 || options.voiceVolume <= 0)) this.cancelSpeech();
    }

    cancelSpeech() {
      this.voiceToken++;
      this.voiceActive = false;
      window.speechSynthesis?.cancel();
    }

    localVoice() {
      try {
        return window.speechSynthesis?.getVoices?.().filter(voice => voice.localService === true && /^fr(?:-|_|$)/i.test(voice.lang))
          .sort((a, b) => Number(b.lang === 'fr-FR') - Number(a.lang === 'fr-FR') || String(a.name).localeCompare(String(b.name)))[0] || null;
      } catch { return null; }
    }

    preview(category) {
      const restorePause = this.previewActive ? this.previewRestorePause : this.suspended;
      this.previewRestorePause = restorePause;
      this.previewActive = true;
      const token = ++this.previewToken;
      this.suspended = false;
      if (!this.ensure()) { this.suspended = restorePause; this.previewActive = false; return false; }
      if (category === 'voice') this.voice('Je tiens la lumière.');
      else this.tone(category === 'ambience' ? 96 : 486, .4, 'sine', .12, 0, category);
      setTimeout(() => {
        if (this.previewToken !== token) return;
        this.previewActive = false;
        if (restorePause) this.suspend(true);
      }, category === 'voice' ? 2600 : 650);
      return true;
    }

    tone(frequency = 180, duration = .16, type = 'sine', volume = .12, pan = 0, category = 'effects') {
      if (!this.ensure()) return;
      const oscillator = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(Math.max(20, frequency), now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(24, frequency * .66), now + duration);
      gain.gain.setValueAtTime(Math.max(.001, volume), now);
      gain.gain.exponentialRampToValueAtTime(.001, now + duration);
      oscillator.connect(gain);
      if (this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = clamp(pan, -1, 1);
        gain.connect(panner).connect(this.buses[category] || this.buses.effects);
      } else gain.connect(this.buses[category] || this.buses.effects);
      oscillator.start(now);
      oscillator.stop(now + duration);
    }

    noise(duration = .2, volume = .1, pan = 0, category = 'effects') {
      if (!this.ensure()) return;
      const size = Math.ceil(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < size; index++) channel[index] = (Math.random() * 2 - 1) * (1 - index / size);
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      source.buffer = buffer;
      gain.gain.value = volume;
      source.connect(gain);
      if (this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = clamp(pan, -1, 1);
        gain.connect(panner).connect(this.buses[category] || this.buses.effects);
      } else gain.connect(this.buses[category] || this.buses.effects);
      source.start();
    }

    step(running) {
      this.tone(running ? 88 : 72, .055, 'triangle', running ? .045 : .026, Math.random() * .3 - .15);
      this.noise(.035, running ? .028 : .014);
    }

    voice(text, altered = false) {
      const options = this.profile.options;
      if (this.suspended || !options.voices || options.volume <= 0 || options.voiceVolume <= 0) {
        if (this.voiceActive) this.cancelSpeech();
        return false;
      }
      // A newer request supersedes an older utterance even if its local voice
      // disappeared between calls and it must immediately fall back to text.
      this.cancelSpeech();
      const localVoice = this.localVoice();
      if (!localVoice || typeof window.SpeechSynthesisUtterance !== 'function') {
        this.onVoiceFallback?.(text);
        return false;
      }
      const token = this.voiceToken;
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.voice = localVoice;
      utterance.lang = localVoice.lang;
      utterance.rate = altered ? .68 : .82;
      utterance.pitch = altered ? .42 : .75;
      utterance.volume = options.volume * finite(options.voiceVolume, 1) * .62;
      let failed = false;
      const fallback = () => {
        if (!failed && token === this.voiceToken && !this.suspended) {
          failed = true;
          this.voiceActive = false;
          this.onVoiceFallback?.(text);
        }
      };
      utterance.onerror = event => { if (!['canceled', 'interrupted'].includes(event.error)) fallback(); };
      utterance.onend = () => { if (token === this.voiceToken) this.voiceActive = false; };
      try {
        this.voiceActive = true;
        window.speechSynthesis.speak(utterance);
        return true;
      } catch { fallback(); return false; }
    }

    update(time, tension, wake, corruption) {
      if (!this.ctx || !this.master) return;
      this.applyMix();
      this.drone.gain.gain.value = .018 + tension * .058 + (100 - wake) / 4300 + corruption / 6000;
      if (time > this.nextBeat && tension > .26) {
        this.tone(48 + tension * 14, .095, 'sine', .045 + tension * .075, 0, 'ambience');
        this.nextBeat = time + .96 - tension * .5;
      }
      if (time > this.nextCreak && tension > .44) {
        this.tone(112 + Math.random() * 60, .42, 'sawtooth', .018, 0, 'ambience');
        this.nextCreak = time + 5 + Math.random() * 7;
      }
    }

    suspend(suspended) {
      this.suspended = suspended;
      this.previewToken++;
      this.previewActive = false;
      if (suspended) this.cancelSpeech();
      if (!this.ctx) return;
      const action = suspended ? this.ctx.suspend() : this.ctx.resume();
      action?.catch?.(() => {});
    }

    resetTimeline() {
      this.nextBeat = 0;
      this.nextCreak = 0;
      this.cancelSpeech();
    }
  }

  class Input {
    constructor(canvas, getGame, getProfile = () => getGame()?.profile) {
      this.canvas = canvas;
      this.getGame = getGame;
      this.getProfile = getProfile;
      this.keys = new Set();
      this.pressed = new Set();
      this.gamepadHeld = new Map();
      this.turn = 0;
      this.touchX = 0;
      this.touchY = 0;
      this.touchSprintActive = false;
      this.touchSprintPointers = new Set();
      this.lastDevice = 'keyboard';
      this.touchEnabled = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
      addEventListener('keydown', event => {
        if (event.repeat) return;
        this.setDevice('keyboard');
        if (this.getGame()?.mode !== 'playing' || event.target?.matches?.('input, select, textarea')) return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (!this.keys.has(event.code)) this.pressed.add(event.code);
        this.keys.add(event.code);
        if (Object.keys(ACTIONS).some(action => actionCodes(this.getProfile(), action).includes(event.code))) event.preventDefault();
      });
      addEventListener('keyup', event => this.keys.delete(event.code));
      addEventListener('blur', () => {
        this.reset();
        if (this.getGame()?.mode === 'playing') this.getGame().togglePause();
      });
      addEventListener('mousemove', event => {
        if (document.pointerLockElement === this.canvas && event.movementX) {
          this.turn += event.movementX * .0025;
          this.setDevice('mouse');
        }
      });
      addEventListener('pointerdown', event => this.setDevice(event.pointerType === 'touch' ? 'touch' : 'mouse'));
      this.canvas.addEventListener('pointerdown', event => {
        const game = this.getGame();
        if (game?.mode !== 'playing' || event.pointerType === 'touch') return;
        if (event.button === 0) {
          if (document.pointerLockElement === this.canvas) this.pressed.add('Mouse0');
          else {
            try { this.canvas.requestPointerLock?.()?.catch?.(() => {}); } catch { /* Le clavier reste disponible. */ }
          }
        }
        if (event.button === 2) this.pressed.add('Mouse2');
        this.setDevice('mouse');
      });
      this.bindTouch();
    }

    bindTouch() {
      const stick = $('#touch-stick');
      const knob = stick.querySelector('i');
      let active = null;
      let center = { x: 0, y: 0 };
      let radius = 45;
      const move = event => {
        if (active === null) return;
        const point = [...(event.changedTouches || [])].find(touch => touch.identifier === active);
        if (!point) return;
        let dx = point.clientX - center.x;
        let dy = point.clientY - center.y;
        const distance = Math.hypot(dx, dy) || 1;
        const magnitude = Math.min(radius, distance);
        dx = dx / distance * magnitude;
        dy = dy / distance * magnitude;
        knob.style.transform = `translate(${dx}px,${dy}px)`;
        this.touchX = dx / radius;
        this.touchY = dy / radius;
        this.setDevice('touch');
      };
      const start = event => {
        if (active !== null || this.getGame()?.mode !== 'playing') return;
        const point = event.changedTouches[0];
        if (!point) return;
        active = point.identifier;
        const rect = stick.getBoundingClientRect();
        radius = Math.max(20, rect.width * .32);
        center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        move(event);
        event.preventDefault();
      };
      const end = event => {
        if (event.changedTouches && ![...event.changedTouches].some(touch => touch.identifier === active)) return;
        active = null;
        this.touchX = 0;
        this.touchY = 0;
        knob.style.transform = '';
        event.preventDefault();
      };
      stick.addEventListener('touchstart', start, { passive: false });
      stick.addEventListener('touchmove', move, { passive: false });
      stick.addEventListener('touchend', end, { passive: false });
      stick.addEventListener('touchcancel', end, { passive: false });
      $$('#touch-controls button').forEach(button => button.addEventListener('pointerdown', event => {
        if (this.getGame()?.mode !== 'playing') return;
        if (button.dataset.action === 'run') {
          if (this.getProfile()?.options.touchSprint === 'hold') {
            this.touchSprintPointers.add(event.pointerId);
            this.touchSprintActive = true;
            button.setPointerCapture?.(event.pointerId);
          } else this.touchSprintActive = !this.touchSprintActive;
          this.updateSprintButton();
        } else this.pressed.add(`Touch:${button.dataset.action}`);
        this.setDevice('touch');
        event.preventDefault();
      }));
      const releaseSprint = event => {
        if (!this.touchSprintPointers.delete(event.pointerId)) return;
        this.touchSprintActive = this.touchSprintPointers.size > 0;
        this.updateSprintButton();
      };
      addEventListener('pointerup', releaseSprint);
      addEventListener('pointercancel', releaseSprint);
      let lookId = null;
      let lastX = 0;
      this.canvas.addEventListener('touchstart', event => {
        if (lookId !== null || this.getGame()?.mode !== 'playing') return;
        const touch = [...event.changedTouches][0];
        if (touch) {
          lookId = touch.identifier;
          lastX = touch.clientX;
        }
      }, { passive: true });
      this.canvas.addEventListener('touchmove', event => {
        const touch = [...event.changedTouches].find(item => item.identifier === lookId);
        if (touch) {
          this.turn += (touch.clientX - lastX) * .009;
          lastX = touch.clientX;
          this.setDevice('touch');
        }
      }, { passive: true });
      const clearLook = event => {
        if ([...event.changedTouches].some(item => item.identifier === lookId)) lookId = null;
      };
      this.canvas.addEventListener('touchend', clearLook, { passive: true });
      this.canvas.addEventListener('touchcancel', clearLook, { passive: true });
      this.resetTouch = () => { active = null; lookId = null; knob.style.transform = ''; };
    }

    setDevice(device) {
      if (this.lastDevice === device) return;
      this.lastDevice = device;
      this.onDeviceChange?.();
    }

    observeGamepad(pad) {
      if (!pad) { this.gamepadObservation = null; return; }
      const previous = this.gamepadObservation;
      const active = pad.buttons.some((button, index) => button.pressed && !previous?.buttons[index]) ||
        pad.axes.some((axis, index) => Math.abs(axis) > .18 && Math.abs(axis - (previous?.axes[index] || 0)) > .04);
      this.gamepadObservation = { buttons: pad.buttons.map(button => button.pressed), axes: [...pad.axes] };
      if (active) this.setDevice('gamepad');
    }

    updateSprintButton() {
      const button = $('#touch-controls [data-action="run"]');
      button?.setAttribute?.('aria-pressed', String(this.touchSprintActive));
      if (button) button.textContent = this.touchSprintActive ? 'COURSE ✓' : 'COURIR';
    }

    down(...codes) {
      return codes.some(code => this.keys.has(code));
    }

    reset() {
      this.keys.clear();
      this.pressed.clear();
      this.turn = 0;
      this.touchX = 0;
      this.touchY = 0;
      this.touchSprintActive = false;
      this.touchSprintPointers?.clear();
      this.resetTouch?.();
      this.updateSprintButton();
      const knob = $('#touch-stick i');
      if (knob) knob.style.transform = '';
      const pad = connectedGamepad();
      this.gamepadHeld.clear();
      for (const index of [0, 1, 2, 3, 4, 8, 9]) this.gamepadHeld.set(index, pad?.buttons[index]?.pressed === true);
    }

    take(...codes) {
      const hit = codes.some(code => this.pressed.has(code));
      codes.forEach(code => this.pressed.delete(code));
      return hit;
    }

    pollGamepad() {
      const gamepad = connectedGamepad();
      this.observeGamepad(gamepad);
      if (!gamepad) {
        this.gamepadHeld.clear();
        return { moveX: 0, moveY: 0, turn: 0, run: false };
      }
      const mapping = new Map([[0, 'Pad:interact'], [1, 'Pad:signal'], [2, 'Pad:call'], [3, 'Pad:flash'], [4, 'Pad:lamp'], [8, 'Pad:journal'], [9, 'Pad:pause']]);
      for (const [index, code] of mapping) {
        const held = gamepad.buttons[index]?.pressed === true;
        if (held && !this.gamepadHeld.get(index) && this.getGame()?.mode === 'playing') this.pressed.add(code);
        this.gamepadHeld.set(index, held);
      }
      return {
        moveX: Math.abs(gamepad.axes[0] || 0) > .18 ? gamepad.axes[0] : 0,
        moveY: Math.abs(gamepad.axes[1] || 0) > .18 ? gamepad.axes[1] : 0,
        turn: Math.abs(gamepad.axes[2] || 0) > .18 ? gamepad.axes[2] : 0,
        run: gamepad.buttons[10]?.pressed === true
      };
    }

    endFrame() {
      this.pressed.clear();
      this.turn = 0;
    }
  }

  class Game {
    constructor(canvas, storage, profile, input, audio) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      this.storage = storage;
      this.profile = profile;
      this.input = input;
      this.audio = audio;
      this.mode = 'title';
      this.last = performance.now();
      this.elapsed = 0;
      this.toastTimer = 0;
      this.voiceFallbackTimer = 0;
      this.saveClock = 0;
      this.stats = clone(DEFAULT_STATS);
      this.chapterStats = clone(DEFAULT_CHAPTER_STATS);
      this.director = { pressure: .08, grace: 10, surge: 0, nextEvent: 18 };
      this.callCooldown = 0;
      this.signalCooldown = 0;
      this.lastSignal = -99;
      this.stepClock = 0;
      this.hitClock = 0;
      this.flashTime = 0;
      this.ritual = null;
      this.challenge = null;
      this.noiseEvent = null;
      this.depth = new Float32Array(0);
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }

    start(index = 0, save = null) {
      this.loadChapter(index, save, true);
      $('#title-screen').classList.remove('active');
      $('#game-screen').classList.add('active');
      this.canvas.focus();
    }

    loadChapter(index, candidate = null, announce = true) {
      this.input.reset();
      const state = candidate ? this.storage.normalizeSave(candidate) : null;
      this.level = clone(Data.CHAPTERS[index]);
      this.chapterIndex = index;
      this.mode = 'playing';
      if (state?.difficulty) this.profile.difficulty = state.difficulty;
      this.campaignDifficulty = state?.campaignDifficulty || { started: this.profile.difficulty, lowest: this.profile.difficulty, fromStart: index === 0 && !candidate };
      this.campaignEvents = state?.campaignEvents || emptyCampaignEvents();
      this.trackDifficulty();
      const basePlayer = { x: this.level.start.x, y: this.level.start.y, a: this.level.start.a, health: 100, battery: 100, flashes: 3, lampOn: true, calm: 100 };
      this.player = { ...basePlayer, ...(state?.player || {}) };
      this.aziz = { wake: 100, trust: 50, corruption: 0, sync: 35, mode: 'sweep', ...(state?.aziz || {}) };
      this.stats = { ...clone(DEFAULT_STATS), ...(state?.stats || {}) };
      if (!this.stats.startedAt) this.stats.startedAt = Date.now();
      this.chapterStats = { ...clone(DEFAULT_CHAPTER_STATS), ...(state?.chapterStats || {}) };
      this.completedIds = new Set(state?.completedIds || []);
      const objectStates = state?.objectStates || {};
      for (const object of this.level.objects) {
        const saved = objectStates[object.id];
        if (saved) Object.assign(object, saved);
        object.done = object.done === true || this.completedIds.has(object.id);
        if (object.done || object.revealed) this.recordDiscovery(object, false);
      }
      const enemyStates = new Map((state?.enemyStates || []).map(enemy => [enemy.id, enemy]));
      for (const enemy of this.level.enemies) {
        const saved = enemyStates.get(enemy.id);
        if (saved) Object.assign(enemy, saved);
        enemy.alive = enemy.alive !== false && enemy.health > 0;
      }
      this.objectiveCount = this.level.objects.filter(object => object.type === this.level.kind && object.done).length;
      this.objectiveComplete = this.objectiveCount >= this.level.target;
      this.elapsed = state?.elapsed || 0;
      this.campaignElapsed = state?.campaignElapsed || 0;
      this.director = { pressure: .08 + index * .025, grace: 10, surge: 0, nextEvent: this.elapsed + 18 };
      this.ritual = null;
      this.challenge = null;
      this.noiseEvent = null;
      this.callCooldown = 0;
      this.nextThreatCue = 0;
      this.threatCueRemaining = 0;
      this.audio.resetTimeline?.();
      this.voiceFallbackTimer = 0;
      $('#voice-fallback').classList.remove('visible');
      $('#voice-fallback').textContent = '';
      this.signalCooldown = 0;
      this.lastSignal = -99;
      this.saveClock = 0;
      this.profile.visited = [...new Set([...this.profile.visited, this.level.id])];
      this.unlock('cartographe', this.profile.visited.length === 6);
      this.storage.saveProfile(this.profile);
      this.resize(true);
      this.updateHud();
      this.checkpoint = this.snapshot();
      this.save(true);
      if (announce) this.showChapterBanner();
      this.updateTutorial();
      document.documentElement.dataset.testReady = 'true';
    }

    snapshot() {
      this.trackDifficulty();
      const objectStates = {};
      for (const object of this.level.objects) {
        objectStates[object.id] = {
          done: object.done === true,
          used: object.used === true,
          orientation: Math.trunc(object.orientation || 0),
          progress: bounded(object.progress, 0, 1, 0),
          attempts: Math.max(0, Math.trunc(object.attempts || 0)),
          revealed: object.revealed === true
        };
      }
      return {
        version: Data.VERSION,
        chapterIndex: this.chapterIndex,
        player: { ...this.player },
        aziz: { ...this.aziz },
        completedIds: [...this.completedIds],
        objectStates,
        enemyStates: this.level.enemies.map(enemy => ({
          id: enemy.id,
          x: enemy.x,
          y: enemy.y,
          health: enemy.health,
          alive: enemy.alive,
          alert: enemy.alert || 0,
          memory: enemy.memory || 0,
          targetX: Number.isFinite(enemy.targetX) ? enemy.targetX : null,
          targetY: Number.isFinite(enemy.targetY) ? enemy.targetY : null,
          state: enemy.state || 'dormant'
        })),
        elapsed: this.elapsed,
        campaignElapsed: finite(this.campaignElapsed, this.elapsed),
        difficulty: this.profile.difficulty,
        campaignDifficulty: clone(this.campaignDifficulty),
        campaignEvents: clone(this.campaignEvents || emptyCampaignEvents()),
        stats: { ...this.stats },
        chapterStats: { ...this.chapterStats }
      };
    }

    transitionState(nextIndex) {
      this.trackDifficulty();
      const next = Data.CHAPTERS[nextIndex];
      return {
        version: Data.VERSION,
        chapterIndex: nextIndex,
        player: {
          x: next.start.x,
          y: next.start.y,
          a: next.start.a,
          health: clamp(this.player.health + 18, 1, 100),
          battery: clamp(this.player.battery + 24, 0, 100),
          flashes: Math.min(6, this.player.flashes + 1),
          lampOn: this.player.lampOn || this.player.battery <= 0,
          calm: clamp(this.player.calm + 25, 0, 100)
        },
        aziz: {
          ...this.aziz,
          wake: clamp(this.aziz.wake + 18, 0, 100),
          corruption: clamp(this.aziz.corruption - 1.5, 0, 100),
          sync: clamp(this.aziz.sync + 4, 0, 100)
        },
        completedIds: [],
        objectStates: {},
        enemyStates: [],
        elapsed: 0,
        campaignElapsed: finite(this.campaignElapsed, this.elapsed),
        difficulty: this.profile.difficulty,
        campaignDifficulty: clone(this.campaignDifficulty),
        campaignEvents: clone(this.campaignEvents || emptyCampaignEvents()),
        stats: { ...this.stats },
        chapterStats: clone(DEFAULT_CHAPTER_STATS)
      };
    }

    trackDifficulty() {
      const current = knownDifficulty(this.profile.difficulty) || DEFAULT_PROFILE.difficulty;
      this.campaignDifficulty ||= { started: null, lowest: current, fromStart: false };
      const previous = DIFFICULTY_ORDER.indexOf(this.campaignDifficulty.lowest);
      if (previous < 0 || DIFFICULTY_ORDER.indexOf(current) < previous) this.campaignDifficulty.lowest = current;
    }

    recordCampaignEvent(kind, id) {
      this.campaignEvents ||= emptyCampaignEvents();
      const events = this.campaignEvents[kind];
      const first = !events.includes(id);
      if (first) events.push(id);
      const counter = { objectives: 'objectives', responses: 'correctResponses', chapters: 'chaptersCompleted' }[kind];
      this.stats[counter] = events.length;
      return first;
    }

    checkpointState() {
      this.trackDifficulty();
      return {
        ...clone(this.checkpoint),
        stats: { ...this.stats },
        chapterStats: { ...this.chapterStats },
        campaignEvents: clone(this.campaignEvents || emptyCampaignEvents()),
        campaignDifficulty: clone(this.campaignDifficulty),
        difficulty: this.profile.difficulty,
        campaignElapsed: finite(this.campaignElapsed, this.elapsed)
      };
    }

    save(silent = false) {
      if (!this.level) return;
      this.storage.save(this.snapshot());
      updateContinueButton();
      if (!silent) this.say('Point de contrôle enregistré.', 2);
    }

    resize(force = false) {
      const quality = this.profile.options.quality;
      const scale = quality === 'low' ? .64 : quality === 'high' ? Math.min(1.25, devicePixelRatio || 1) :
        (innerWidth < 760 || this.input.touchEnabled ? .72 : Math.min(1, devicePixelRatio || 1));
      const width = Math.max(160, Math.floor(innerWidth * scale));
      const height = Math.max(120, Math.floor(innerHeight * scale));
      if (force || this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.depth = new Float32Array(0);
      }
    }

    wall(x, y) {
      return y < 0 || x < 0 || y >= this.level.h || x >= this.level.w || this.level.grid[Math.floor(y)]?.[Math.floor(x)] === 1;
    }

    movePlayer(nextX, nextY) {
      const radius = .22;
      if (!this.wall(nextX + radius, this.player.y) && !this.wall(nextX - radius, this.player.y)) this.player.x = nextX;
      if (!this.wall(this.player.x, nextY + radius) && !this.wall(this.player.x, nextY - radius)) this.player.y = nextY;
    }

    hasLineOfSight(fromX, fromY, toX, toY) {
      const distance = Math.hypot(toX - fromX, toY - fromY);
      const steps = Math.max(1, Math.ceil(distance / .12));
      for (let step = 1; step < steps; step++) {
        const ratio = step / steps;
        if (this.wall(fromX + (toX - fromX) * ratio, fromY + (toY - fromY) * ratio)) return false;
      }
      return true;
    }

    lightAt(x, y) {
      const dx = x - this.player.x;
      const dy = y - this.player.y;
      const distance = Math.hypot(dx, dy);
      const angle = Math.abs(angleDelta(this.player.a, Math.atan2(dy, dx)));
      const visible = this.hasLineOfSight(this.player.x, this.player.y, x, y);
      const portable = visible && this.player.lampOn && this.player.battery > 0 && distance < 5.8 && angle < .31 ?
        clamp(1 - distance / 6.2, 0, 1) : 0;
      const projector = projectorState(this.aziz);
      const unstable = projector.link < 28 && Math.floor(this.elapsed * 9) % 5 === 0;
      const projected = visible && projector.online && !unstable && distance < projector.range && angle < projector.cone ?
        clamp(1 - distance / (projector.range + .5), 0, 1) * projector.power * projector.link / 100 : 0;
      return { portable, projector: projected, total: clamp(portable + projected, 0, 1.5), visible };
    }

    update(dt) {
      const gamepad = this.input.pollGamepad();
      if (this.mode !== 'playing') return;
      if (this.input.take(...actionCodes(this.profile, 'pause'))) {
        this.togglePause();
        return;
      }
      if (this.input.take(...actionCodes(this.profile, 'journal'))) {
        this.openJournal();
        return;
      }

      this.trackDifficulty();
      this.elapsed += dt;
      this.campaignElapsed = finite(this.campaignElapsed, 0) + dt;
      this.flashTime = Math.max(0, this.flashTime - dt * 1.68);
      this.callCooldown = Math.max(0, this.callCooldown - dt);
      this.signalCooldown = Math.max(0, this.signalCooldown - dt);
      this.hitClock = Math.max(0, this.hitClock - dt);
      this.director.grace = Math.max(0, this.director.grace - dt);
      this.director.surge = Math.max(0, this.director.surge - dt * .12);
      if (this.noiseEvent) {
        this.noiseEvent.ttl -= dt;
        if (this.noiseEvent.ttl <= 0) this.noiseEvent = null;
      }

      let forward = (this.input.down(...actionKeys(this.profile, 'forward')) ? 1 : 0) - (this.input.down(...actionKeys(this.profile, 'backward')) ? 1 : 0) - this.input.touchY - gamepad.moveY;
      let strafe = (this.input.down(...actionKeys(this.profile, 'strafeRight')) ? 1 : 0) - (this.input.down(...actionKeys(this.profile, 'strafeLeft')) ? 1 : 0) + this.input.touchX + gamepad.moveX;
      const running = this.input.down(...actionKeys(this.profile, 'run')) || gamepad.run || this.input.touchSprintActive;
      const keyboardTurn = (this.input.down(...actionKeys(this.profile, 'turnRight')) ? 1 : 0) - (this.input.down(...actionKeys(this.profile, 'turnLeft')) ? 1 : 0);
      const magnitude = Math.hypot(forward, strafe);
      if (magnitude > 1) {
        forward /= magnitude;
        strafe /= magnitude;
      }
      this.player.a += this.input.turn * this.profile.options.sensitivity + (gamepad.turn + keyboardTurn) * dt * 2.2 * this.profile.options.sensitivity;
      const speed = 2.08 * (running ? 1.58 : 1) * dt;
      if (magnitude > .08) {
        this.movePlayer(
          this.player.x + (Math.cos(this.player.a) * forward + Math.cos(this.player.a + Math.PI / 2) * strafe) * speed,
          this.player.y + (Math.sin(this.player.a) * forward + Math.sin(this.player.a + Math.PI / 2) * strafe) * speed
        );
        this.stepClock -= dt;
        if (this.stepClock <= 0) {
          this.audio.step(running);
          this.emitNoise(running ? 6.2 : 2.5, running ? 1.1 : .45);
          this.stepClock = running ? .31 : .56;
        }
      }

      if (this.input.take(...actionCodes(this.profile, 'interact'))) this.interact();
      if (this.input.take(...actionCodes(this.profile, 'call'))) this.callAziz();
      if (this.input.take(...actionCodes(this.profile, 'signal'))) this.signalAziz();
      if (this.input.take(...actionCodes(this.profile, 'flash'))) this.flash();
      if (this.input.take(...actionCodes(this.profile, 'lamp'))) {
        if (this.player.battery <= 0) this.say('La lampe n’a plus d’huile.', 1.6);
        else {
          this.player.lampOn = !this.player.lampOn;
          this.audio.tone(118, .08, 'square', .045);
        }
      }

      this.updateRitual(dt);
      this.updateChallenge(dt);
      const difficulty = Data.DIFFICULTIES[this.profile.difficulty];
      const projector = projectorState(this.aziz);
      const wakeDrain = (.43 + this.chapterIndex * .075) * difficulty.wake * Mechanics.PROJECTOR_MODES[this.aziz.mode].wakeCost;
      this.aziz.wake = clamp(this.aziz.wake - dt * wakeDrain, 0, 100);
      if (this.player.lampOn) {
        this.player.battery = clamp(this.player.battery - dt * .44 * difficulty.battery, 0, 100);
        if (this.player.battery <= 0) this.player.lampOn = false;
      }
      if (this.aziz.wake <= 0) {
        this.aziz.corruption = clamp(this.aziz.corruption + dt * 1.12, 0, 100);
        this.aziz.sync = clamp(this.aziz.sync - dt * .7, 0, 100);
      } else if (projector.link < 22) this.aziz.corruption = clamp(this.aziz.corruption + dt * .08, 0, 100);

      this.updateEnemies(dt, difficulty);
      if (this.mode !== 'playing') return;
      this.updateDirector(dt, difficulty);
      this.checkExit();
      if (this.mode !== 'playing') return;
      this.updateHud();
      this.audio.update(this.elapsed, this.director.pressure, this.aziz.wake, this.aziz.corruption);
      this.saveClock += dt;
      if (this.saveClock >= 18) {
        this.save(true);
        this.saveClock = 0;
      }
      if (this.toastTimer > 0) {
        this.toastTimer -= dt;
        if (this.toastTimer <= 0) $('#toast').classList.remove('visible');
      }
      if (this.voiceFallbackTimer > 0) {
        this.voiceFallbackTimer -= dt;
        if (this.voiceFallbackTimer <= 0) $('#voice-fallback').classList.remove('visible');
      }
    }

    emitNoise(radius, duration = .8, x = this.player.x, y = this.player.y) {
      if (!this.noiseEvent || radius >= this.noiseEvent.radius || this.noiseEvent.ttl < .2) {
        this.noiseEvent = { x, y, radius, ttl: duration };
      }
    }

    nearestObject() {
      let best = null;
      let bestDistance = 1.35;
      for (const object of this.level.objects) {
        if (object.done && !['bell', 'door'].includes(object.type)) continue;
        const dx = object.x - this.player.x;
        const dy = object.y - this.player.y;
        const distance = Math.hypot(dx, dy);
        const angle = Math.abs(angleDelta(this.player.a, Math.atan2(dy, dx)));
        if (distance < bestDistance && angle < .9 && this.hasLineOfSight(this.player.x, this.player.y, object.x, object.y)) {
          best = object;
          bestDistance = distance;
        }
      }
      return best;
    }

    interact() {
      const object = this.nearestObject();
      if (!object) {
        this.say('Rien ne répond.', 1.2);
        return;
      }
      this.audio.tone(326, .12, 'triangle', .07);
      if (object.type === this.level.kind) {
        this.handleObjective(object);
        return;
      }
      if (object.type === 'archive') {
        object.done = true;
        this.completedIds.add(object.id);
        this.profile.archives = [...new Set([...this.profile.archives, object.archive.id])];
        this.storage.saveProfile(this.profile);
        this.say(`ARCHIVE — ${object.archive.title}: ${object.archive.text}`, 7, true);
        this.unlock('archiviste', this.profile.archives.length === 18);
        this.director.grace = Math.max(this.director.grace, 5);
      } else if (object.type === 'oil') {
        if (this.player.battery >= 100) { this.say('La réserve d’huile est pleine. Le bidon reste ici.', 2); return; }
        object.done = true;
        this.completedIds.add(object.id);
        const gain = 34 * Data.DIFFICULTIES[this.profile.difficulty].resourceGain;
        this.player.battery = clamp(this.player.battery + gain, 0, 100);
        this.say(`Huile récupérée · lampe ${Math.ceil(this.player.battery)}%`, 1.8);
      } else if (object.type === 'flash') {
        if (this.player.flashes >= 6) { this.say('Vous portez déjà six plaques. Celle-ci reste ici.', 2); return; }
        object.done = true;
        this.completedIds.add(object.id);
        const recovered = Math.random() <= Data.DIFFICULTIES[this.profile.difficulty].resourceGain;
        if (recovered) this.player.flashes = Math.min(6, this.player.flashes + 1);
        this.say(recovered ? 'Plaque de magnésium récupérée.' : 'Plaque humide · aucune charge exploitable.', 1.8);
      } else if (object.type === 'bell') {
        if (object.used) {
          this.say('La cloche est fendue. Elle ne sonnera plus.', 1.8);
          return;
        }
        object.used = true;
        object.done = true;
        this.completedIds.add(object.id);
        this.aziz.wake = clamp(this.aziz.wake + 24, 0, 100);
        this.aziz.sync = clamp(this.aziz.sync + 7, 0, 100);
        this.stats.revives++;
        this.unlock('veille', this.stats.revives >= 3);
        this.say('La cloche solaire ramène Aziz à la manivelle.', 2.8, true);
        this.audio.tone(654, .8, 'sine', .17);
        this.emitNoise(8.5, 1.5);
      } else if (object.type === 'inscription') {
        object.done = true;
        this.completedIds.add(object.id);
        this.recordDiscovery(object);
        this.say(`RELEVÉ DE TERRAIN — « ${object.text} »`, 5, true);
      } else if (object.type === 'door') {
        if (!this.objectiveComplete) {
          const hint = Data.DIFFICULTIES[this.profile.difficulty].hints ? ` ${this.level.hint}` : '';
          this.say(`Le seuil reste scellé.${hint}`, 3.2);
          return;
        }
        if (!object.used) {
          object.used = true;
          object.done = true;
          this.completedIds.add(object.id);
          this.player.health = clamp(this.player.health + 12, 0, 100);
          this.player.calm = clamp(this.player.calm + 35, 0, 100);
          this.checkpoint = this.snapshot();
          this.save(true);
          this.say('Seuil sécurisé · nouveau point de contrôle.', 2.6);
          this.director.grace = 12;
        } else this.say('Le seuil tient encore.', 1.5);
      }
      this.save(true);
    }

    handleObjective(object) {
      if (object.done) return;
      const access = canOperateObjective(this.level.kind, this.aziz);
      if (this.level.mechanic === 'align' && access.projector.id === 'sweep' && access.projector.online && access.projector.link >= access.rule.minLink) {
        object.revealed = true;
        this.recordDiscovery(object);
        this.say(`${object.label}: la poussière désigne ${ORIENTATIONS[object.targetOrientation]}. Passez en Focalisé.`, 3.2, true);
        this.save(true);
        return;
      }
      if (!access.ok) {
        const mode = access.rule.mode === 'focus' ? 'Focalisé' : 'Balayage';
        this.say(`Lien insuffisant: demandez à Aziz le mode ${mode} (${actionLabel(this.profile, this.input.lastDevice, 'signal')}).`, 3);
        return;
      }
      if (this.level.mechanic === 'channel') {
        object.progress = 0;
        this.ritual = { id: object.id, duration: access.rule.duration, remaining: access.rule.duration };
        this.say('Maintenez la position. Aziz concentre le projecteur…', 2.4);
        return;
      }
      if (this.level.mechanic === 'align') {
        if (!object.revealed && !object.attempts) {
          this.chapterStats.mirrorErrors++;
          this.stats.puzzleErrors++;
        }
        object.orientation = (object.orientation + 1) % 4;
        object.attempts = (object.attempts || 0) + 1;
        if (object.orientation === object.targetOrientation) this.completeObjective(object, `${object.label} aligné sur ${ORIENTATIONS[object.orientation]}`);
        else {
          this.say(`${object.label}: ${ORIENTATIONS[object.orientation]}. Le cuivre reste froid.`, 2);
          this.save(true);
        }
        return;
      }
      if (this.level.mechanic === 'sequence') {
        const expected = this.level.sequence[this.objectiveCount];
        if (object.sequenceSlot === expected) this.completeObjective(object, `${object.label} répond dans le bon rythme`);
        else this.resetSequence(object);
        return;
      }
      if (this.level.mechanic === 'response') {
        if (this.callCooldown > 0) {
          this.say(`Aziz reprend son souffle · ${this.callCooldown.toFixed(1)} s avant de révéler le souvenir.`, 2);
          return;
        }
        if (!this.isMemoryAnchored(object)) {
          this.say('Rapprochez-vous et gardez le souvenir dans le faisceau Balayage.', 2.8, true);
          return;
        }
        this.challenge = { type: 'memory', objectId: object.id, remaining: 5 };
        this.say(`${object.label} apparaît. Gardez le faisceau sur lui et appelez Aziz [${actionLabel(this.profile, this.input.lastDevice, 'call')}].`, 4, true);
      }
    }

    completeObjective(object, message = object.label) {
      if (object.done) return;
      object.done = true;
      object.progress = 1;
      this.recordDiscovery(object);
      this.completedIds.add(object.id);
      this.objectiveCount = this.level.objects.filter(item => item.type === this.level.kind && item.done).length;
      this.objectiveComplete = this.objectiveCount >= this.level.target;
      this.stats.objectiveAttempts = finite(this.stats.objectiveAttempts, 0) + 1;
      if (this.recordCampaignEvent('objectives', object.id)) this.aziz.sync = clamp(this.aziz.sync + 4, 0, 100);
      this.director.grace = Math.max(this.director.grace, 4.5);
      this.director.surge = Math.max(0, this.director.surge - .18);
      this.say(`${message} · ${this.objectiveCount}/${this.level.target}`, 2.4);
      if (this.objectiveComplete) {
        this.say(this.level.finale ? 'Les quatre contre-jours convergent. Le Pharaon peut être banni.' : 'Le passage final répond à la lumière.', 4, true);
        this.checkpoint = this.snapshot();
      }
      this.save(true);
    }

    resetSequence(object) {
      this.stats.puzzleErrors++;
      this.director.surge = 1;
      this.aziz.trust = clamp(this.aziz.trust - 2.5, 0, 100);
      this.aziz.corruption = clamp(this.aziz.corruption + 1.4, 0, 100);
      for (const item of this.level.objects.filter(item => item.type === this.level.kind)) {
        item.done = false;
        item.progress = 0;
        this.completedIds.delete(item.id);
      }
      this.objectiveCount = 0;
      this.objectiveComplete = false;
      this.emitNoise(11, 1.6, object.x, object.y);
      this.audio.noise(.42, .2);
      this.say('Mauvais ordre. Le temple efface la séquence.', 3, true);
      this.save(true);
    }

    updateRitual(dt) {
      const meter = $('#ritual');
      if (!this.ritual) {
        meter.classList.remove('visible');
        return;
      }
      const object = this.level.objects.find(item => item.id === this.ritual.id);
      const access = canOperateObjective(this.level.kind, this.aziz);
      const distance = object ? Math.hypot(object.x - this.player.x, object.y - this.player.y) : 99;
      if (!object || distance > 1.65 || !access.ok || this.lightAt(object.x, object.y).projector <= .02) {
        if (object) object.progress = 0;
        this.ritual = null;
        meter.classList.remove('visible');
        this.say('Le faisceau s’est rompu. Reprenez la position.', 2);
        return;
      }
      object.progress = clamp((object.progress || 0) + dt / this.ritual.duration, 0, 1);
      this.ritual.remaining = Math.max(0, this.ritual.remaining - dt);
      $('#ritual-meter').value = object.progress * 100;
      $('#ritual-label').textContent = `FOCALISATION ${Math.ceil(object.progress * 100)}%`;
      meter.classList.add('visible');
      if (object.progress >= 1) {
        this.ritual = null;
        meter.classList.remove('visible');
        this.completeObjective(object, `${object.label} chargé par Aziz`);
      }
    }

    isMemoryAnchored(object) {
      return !!object && object.type === 'memory' && !object.done &&
        Math.hypot(object.x - this.player.x, object.y - this.player.y) <= 1.65 &&
        canOperateObjective('memory', this.aziz).ok && this.lightAt(object.x, object.y).projector > .02;
    }

    clearInactiveVeilChallenge() {
      if (this.challenge?.type === 'veil' && !this.level.enemies.some(enemy => enemy.id === this.challenge.enemyId && enemy.alive)) this.challenge = null;
    }

    updateChallenge(dt) {
      this.clearInactiveVeilChallenge();
      if (!this.challenge) return;
      if (this.challenge.type === 'memory' && !this.isMemoryAnchored(this.level.objects.find(item => item.id === this.challenge.objectId))) {
        this.challenge = null;
        this.say('Le souvenir a quitté le faisceau. Rapprochez-vous pour le révéler à nouveau.', 3, true);
        return;
      }
      this.challenge.remaining -= dt;
      if (this.challenge.remaining > 0) return;
      if (this.challenge.type === 'memory') {
        this.aziz.trust = clamp(this.aziz.trust - 3, 0, 100);
        this.aziz.corruption = clamp(this.aziz.corruption + 4, 0, 100);
        this.say('Le souvenir se referme avec une voix qui n’est pas la sienne.', 3, true);
      } else {
        this.say('Vous gardez le silence. La fausse voix s’éteint sans réponse.', 3, true);
      }
      this.challenge = null;
    }

    callAziz() {
      this.clearInactiveVeilChallenge();
      if (this.callCooldown > 0) {
        this.say(`Aziz reprend son souffle · ${this.callCooldown.toFixed(1)} s`, 1.2);
        return;
      }
      this.callCooldown = 5.2;
      this.stats.calls++;
      this.chapterStats.calls++;
      this.emitNoise(10, 1.3);
      if (this.challenge?.type === 'memory') {
        const object = this.level.objects.find(item => item.id === this.challenge.objectId);
        const anchored = this.challenge.remaining > 0 && this.isMemoryAnchored(object);
        this.challenge = null;
        if (anchored) {
          if (this.recordCampaignEvent('responses', `memory:${object.id}`)) {
            this.aziz.trust = clamp(this.aziz.trust + 4.5, 0, 100);
            this.aziz.sync = clamp(this.aziz.sync + 8, 0, 100);
            this.aziz.wake = clamp(this.aziz.wake + 7, 0, 100);
          }
          this.completeObjective(object, `Aziz reconnaît ${object.label.toLowerCase()}`);
          this.audio.voice('Je me souviens. Ne laisse pas la lumière me prendre.');
        } else this.say('Le souvenir a quitté le faisceau. Révélez-le à nouveau avant d’appeler.', 3, true);
        return;
      }
      if (this.challenge?.type === 'veil') {
        this.challenge = null;
        this.aziz.trust = clamp(this.aziz.trust - 6, 0, 100);
        this.aziz.corruption = clamp(this.aziz.corruption + 6, 0, 100);
        this.director.surge = 1;
        this.say('Vous avez répondu au faux Aziz. Le lien vacille.', 3, true);
        return;
      }
      const wasFailing = this.aziz.wake < 28;
      this.aziz.wake = clamp(this.aziz.wake + 14, 0, 100);
      this.aziz.trust = clamp(this.aziz.trust + (wasFailing ? .9 : -.35), 0, 100);
      this.aziz.sync = clamp(this.aziz.sync - 1.5, 0, 100);
      const altered = this.aziz.corruption >= 60;
      const line = altered ? '« Je suis là… ouvre le contre-jour. »' :
        this.aziz.trust >= 68 ? '« Je te vois. Garde le rythme, je tiens la lumière. »' :
        '« Je suis là… la manivelle résiste. »';
      this.say(line, 2.8, 'speech');
      this.audio.voice(line.replace(/[«»]/g, ''), altered);
      this.audio.noise(.18, .11);
    }

    signalAziz() {
      this.clearInactiveVeilChallenge();
      if (this.signalCooldown > 0) {
        this.aziz.sync = clamp(this.aziz.sync - 3, 0, 100);
        this.aziz.trust = clamp(this.aziz.trust - .55, 0, 100);
        this.say('Signal brouillé — laissez le silence revenir.', 1.5);
        return;
      }
      this.signalCooldown = .72;
      this.stats.signals++;
      const interval = this.elapsed - this.lastSignal;
      const inRhythm = this.lastSignal < 0 || (interval >= 1.35 && interval <= 4.5);
      this.lastSignal = this.elapsed;
      if (this.challenge?.type === 'veil') {
        const enemy = this.level.enemies.find(item => item.id === this.challenge.enemyId);
        if (enemy) {
          enemy.stun = 4;
          enemy.state = 'stunned';
          enemy.memory = 0;
        }
        const responseId = `veil:${this.challenge.enemyId}`;
        this.challenge = null;
        if (this.recordCampaignEvent('responses', responseId)) {
          this.aziz.trust = clamp(this.aziz.trust + 3, 0, 100);
          this.aziz.sync = clamp(this.aziz.sync + 9, 0, 100);
        }
        this.say('Contre-signal reconnu. La fausse voix recule.', 2.8, true);
        this.audio.tone(512, .28, 'sine', .12);
        return;
      }
      if (inRhythm) {
        this.aziz.sync = clamp(this.aziz.sync + 6.5, 0, 100);
        this.aziz.trust = clamp(this.aziz.trust + .7, 0, 100);
      } else {
        this.aziz.sync = clamp(this.aziz.sync - 5, 0, 100);
        this.aziz.trust = clamp(this.aziz.trust - .8, 0, 100);
        this.aziz.corruption = clamp(this.aziz.corruption + .35, 0, 100);
      }
      const compromised = this.aziz.corruption > 66 && Math.random() < (this.aziz.corruption - 60) / 180;
      if (compromised) {
        this.aziz.sync = clamp(this.aziz.sync - 8, 0, 100);
        this.say('Le projecteur répond avant Aziz. Quelque chose connaît le code.', 3, true);
      } else {
        this.aziz.mode = nextProjectorMode(this.aziz.mode);
        const mode = Mechanics.PROJECTOR_MODES[this.aziz.mode];
        this.say(`Soleil — Silence — Soleil · projecteur: ${mode.label}`, 2.1);
      }
      this.unlock('premiere_lumiere', true);
      this.unlock('miroir', this.stats.signals >= 10);
      this.unlock('confiance', this.aziz.trust >= 80);
      this.audio.tone(inRhythm ? 486 : 228, .17, inRhythm ? 'sine' : 'square', .085);
    }

    flash() {
      if (this.player.flashes <= 0) {
        this.say('Plus de magnésium.', 1.5);
        return;
      }
      this.player.flashes--;
      this.stats.flashes++;
      this.chapterStats.flashes++;
      this.flashTime = .24;
      this.audio.noise(.28, .28);
      this.emitNoise(13, 1.5);
      for (const enemy of this.level.enemies) {
        if (!enemy.alive) continue;
        const distance = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
        if (distance > 5.4 || !this.hasLineOfSight(this.player.x, this.player.y, enemy.x, enemy.y)) continue;
        if (enemy.type === 'pharaoh' && !this.objectiveComplete) {
          enemy.stun = 1;
          continue;
        }
        enemy.health -= Data.THREATS[enemy.type].light * 1.65;
        enemy.stun = Math.max(enemy.stun || 0, 2.2);
        enemy.state = 'stunned';
        if (enemy.health <= 0) {
          enemy.health = 0;
          enemy.alive = false;
        }
      }
      this.say('FLASH AU MAGNÉSIUM', .8);
    }

    enemyPathClear(fromX, fromY, toX, toY) {
      const steps = Math.max(1, Math.ceil(Math.hypot(toX - fromX, toY - fromY) / .12));
      for (let step = 1; step <= steps; step++) {
        const x = fromX + (toX - fromX) * step / steps;
        const y = fromY + (toY - fromY) * step / steps;
        for (const dx of [-.18, .18]) for (const dy of [-.18, .18]) {
          if (this.wall(x + dx, y + dy)) return false;
        }
      }
      return true;
    }

    moveEnemy(enemy, targetX, targetY, distance, speed, useRoute = true) {
      if (!Number.isFinite(distance) || distance < .001 || !Number.isFinite(speed) || speed <= 0) return;
      if (!useRoute || this.enemyPathClear(enemy.x, enemy.y, targetX, targetY)) {
        enemy.route = null;
      } else {
        const targetCell = `${Math.floor(targetX)}:${Math.floor(targetY)}`;
        const needsRoute = !enemy.route || !enemy.route.length || enemy.routeTarget !== targetCell;
        // Au plus deux recherches par frame, espacées de 650 ms par menace.
        // Une route valide vers la même case est réutilisée jusqu’à son terme.
        if (needsRoute && this.elapsed >= (enemy.nextRouteAt || 0) && (this.navigationBudget === undefined || this.navigationBudget > 0)) {
          if (this.navigationBudget !== undefined) this.navigationBudget--;
          enemy.route = Mechanics.findGridRoute(this.level.grid, enemy, { x: targetX, y: targetY }).path;
          enemy.routeTarget = targetCell;
          enemy.nextRouteAt = this.elapsed + .65;
        }
        while (enemy.route?.length && Math.hypot(enemy.route[0].x - enemy.x, enemy.route[0].y - enemy.y) < .03) enemy.route.shift();
        if (!enemy.route?.length) {
          enemy.state = 'search';
          return;
        }
        targetX = enemy.route[0].x;
        targetY = enemy.route[0].y;
        distance = Math.hypot(targetX - enemy.x, targetY - enemy.y);
      }
      const step = Math.min(speed, distance);
      const x = enemy.x + (targetX - enemy.x) / distance * step;
      const y = enemy.y + (targetY - enemy.y) / distance * step;
      if (this.enemyPathClear(enemy.x, enemy.y, x, y)) {
        enemy.x = x;
        enemy.y = y;
      } else {
        if (this.enemyPathClear(enemy.x, enemy.y, x, enemy.y)) enemy.x = x;
        if (this.enemyPathClear(enemy.x, enemy.y, enemy.x, y)) enemy.y = y;
      }
    }

    updateEnemies(dt, difficulty) {
      this.danger = 0;
      this.navigationBudget = 2;
      for (const enemy of this.level.enemies) {
        if (!enemy.alive) continue;
        const definition = Data.THREATS[enemy.type];
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const distance = Math.hypot(dx, dy);
        const lineOfSight = this.hasLineOfSight(enemy.x, enemy.y, this.player.x, this.player.y);
        const angle = Math.abs(angleDelta(this.player.a, Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x)));
        const watched = lineOfSight && angle < .42;
        const light = this.lightAt(enemy.x, enemy.y);
        const noiseHeard = this.noiseEvent && Math.hypot(enemy.x - this.noiseEvent.x, enemy.y - this.noiseEvent.y) <=
          this.noiseEvent.radius * (definition.hearing / 7);
        enemy.stun = Math.max(0, (enemy.stun || 0) - dt);
        enemy.memory = Math.max(0, (enemy.memory || 0) - dt);

        const canBurn = enemy.type !== 'pharaoh' || this.objectiveComplete;
        if (canBurn && light.projector > .04) {
          enemy.health -= definition.light * light.projector * dt * .34;
          if (light.projector > .24) enemy.stun = Math.max(enemy.stun, .07);
          if (enemy.health <= 0) {
            enemy.health = 0;
            enemy.alive = false;
            if (enemy.type === 'pharaoh') this.say('Le Pharaon perd son ombre. Le passage est libre.', 4, true);
            continue;
          }
        }

        if (enemy.type === 'veiled') {
          enemy.mimicCooldown = Math.max(0, (enemy.mimicCooldown || 0) - dt);
          if (distance < 3.4 && lineOfSight && !this.challenge && enemy.mimicCooldown <= 0 && enemy.stun <= 0) {
            enemy.mimicCooldown = 18;
            this.challenge = { type: 'veil', enemyId: enemy.id, remaining: 4.2 };
            this.say(`« Je suis là. Éteins la lampe. » — Gardez le silence ou transmettez le contre-signal [${actionLabel(this.profile, this.input.lastDevice, 'signal')}].`, 4.2, true);
            this.audio.voice('Je suis là. Éteins la lampe.', true);
          }
        }

        let shouldMove = enemy.stun <= 0;
        let targetX = this.player.x;
        let targetY = this.player.y;
        let chase = false;
        let fleeing = false;
        if (enemy.type === 'ushabti') {
          chase = lineOfSight && distance < definition.sense * difficulty.enemySense;
          if (light.total > .08) shouldMove = false;
        } else if (enemy.type === 'scarabs') {
          chase = distance < definition.sense * difficulty.enemySense;
          if (distance < 2.1 && lineOfSight) {
            this.player.battery = clamp(this.player.battery - dt * 7.5 * difficulty.battery, 0, 100);
            if (this.player.battery <= 0) this.player.lampOn = false;
          }
          if (light.portable > .06) {
            fleeing = true;
            targetX = enemy.x - dx;
            targetY = enemy.y - dy;
          }
        } else if (enemy.type === 'jackal') {
          if (noiseHeard) {
            enemy.targetX = this.noiseEvent.x;
            enemy.targetY = this.noiseEvent.y;
            enemy.memory = 5.5;
            enemy.state = 'investigate';
          }
          chase = lineOfSight && distance < definition.sense * difficulty.enemySense;
          if (chase) {
            enemy.targetX = this.player.x;
            enemy.targetY = this.player.y;
            enemy.memory = 5.5;
          }
          if (!chase && enemy.memory > 0 && Number.isFinite(enemy.targetX) && Number.isFinite(enemy.targetY)) {
            targetX = enemy.targetX;
            targetY = enemy.targetY;
            chase = true;
          }
        } else if (enemy.type === 'scribe') {
          chase = lineOfSight && distance < definition.sense * difficulty.enemySense;
          if (watched) shouldMove = false;
        } else if (enemy.type === 'veiled') {
          chase = distance < definition.sense * difficulty.enemySense || this.aziz.corruption > 55;
          if (watched && light.projector > .08) shouldMove = false;
        } else if (enemy.type === 'pharaoh') {
          chase = distance < definition.sense;
          if (!this.objectiveComplete && light.projector > .05) shouldMove = true;
        }

        if (noiseHeard && enemy.type !== 'jackal') chase = true;
        if (chase && shouldMove) {
          enemy.state = lineOfSight ? 'chase' : 'investigate';
          const targetDistance = Math.hypot(targetX - enemy.x, targetY - enemy.y);
          const pressureBoost = .86 + this.director.pressure * .3;
          this.moveEnemy(enemy, targetX, targetY, targetDistance, definition.speed * difficulty.enemySpeed * pressureBoost * dt, !fleeing);
        } else if (enemy.stun > 0) enemy.state = 'stunned';
        else enemy.state = 'dormant';

        const perceived = lineOfSight ? clamp(1 - distance / 7, 0, 1) : clamp(1 - distance / 2.5, 0, .35);
        this.danger = Math.max(this.danger, perceived);
        if (distance < .52 && lineOfSight && enemy.stun <= 0 && this.hitClock <= 0) {
          this.player.health = clamp(this.player.health - definition.damage * difficulty.damage, 0, 100);
          this.player.calm = clamp(this.player.calm - 28, 0, 100);
          this.stats.hits++;
          this.chapterStats.hits++;
          this.hitClock = .82;
          this.director.grace = 4.5;
          this.director.surge = .4;
          this.audio.noise(.22, .2);
          this.say(`${definition.name} vous atteint.`, 1.4);
          this.unlock('survivant', this.player.health > 0 && this.player.health < 10);
          if (this.player.health <= 0) this.gameOver();
        }
      }
    }

    updateThreatAudio(dt) {
      this.threatCueRemaining = Math.max(0, finite(this.threatCueRemaining, 0) - dt);
      const status = $('#threat-status');
      if (!this.profile.options.directionCues || this.threatCueRemaining <= 0) status.classList.remove('visible');
      if (this.elapsed < finite(this.nextThreatCue, 0)) return;
      const source = this.level.enemies.filter(enemy => enemy.alive && finite(enemy.stun, 0) <= 0 && ['chase', 'investigate'].includes(enemy.state))
        .map(enemy => ({ enemy, distance: Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y) }))
        .filter(item => item.distance < 5.5)
        .sort((a, b) => a.distance - b.distance)[0];
      if (!source) return;
      const { enemy, distance } = source;
      const relative = angleDelta(this.player.a, Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x));
      const visible = this.hasLineOfSight(this.player.x, this.player.y, enemy.x, enemy.y);
      const frequency = { ushabti: 82, scarabs: 630, jackal: 145, scribe: 260, veiled: 390, pharaoh: 52 }[enemy.type] || 145;
      this.audio.tone(frequency, .18, enemy.type === 'scarabs' ? 'sawtooth' : 'triangle',
        (.025 + (1 - distance / 5.5) * .06) * (visible ? 1 : .25), Math.sin(relative), 'effects');
      this.nextThreatCue = this.elapsed + 1.7;
      if (this.profile.options.directionCues) {
        const direction = Math.abs(relative) > 2.45 ? 'DERRIÈRE' : relative < -.4 ? 'À GAUCHE' : relative > .4 ? 'À DROITE' : 'DEVANT';
        status.textContent = `${Data.THREATS[enemy.type].name} · ${direction}${visible ? '' : ' · ÉTOUFFÉ'}`;
        status.classList.add('visible');
        this.threatCueRemaining = 1.4;
      }
    }

    updateDirector(dt, difficulty) {
      const target = tensionTarget({
        chapterIndex: this.chapterIndex,
        objectiveRatio: this.objectiveCount / this.level.target,
        danger: this.danger,
        wake: this.aziz.wake,
        health: this.player.health,
        battery: this.player.battery,
        surge: this.director.surge,
        grace: this.director.grace
      }) * difficulty.director;
      this.director.pressure += (clamp(target, .03, 1) - this.director.pressure) * Math.min(1, dt * .8);
      this.player.calm = clamp(this.player.calm + dt * (this.danger < .15 ? 3 : -this.director.pressure * 5), 0, 100);
      this.updateThreatAudio(dt);
      if (this.elapsed >= this.director.nextEvent && this.director.pressure > .32) {
        this.audio.noise(.18 + this.director.pressure * .25, .035 + this.director.pressure * .04, 0, 'ambience');
        if (this.director.pressure > .72 && this.profile.options.directionCues && this.threatCueRemaining <= 0) {
          $('#threat-status').textContent = 'CRAQUEMENT DU TEMPLE · AMBIANCE';
          $('#threat-status').classList.add('visible');
          this.threatCueRemaining = 1.4;
        }
        this.director.nextEvent = this.elapsed + 7 + Math.random() * 8 - this.director.pressure * 3;
      }
    }

    checkExit() {
      if (!this.objectiveComplete || this.mode !== 'playing') return;
      const distance = Math.hypot(this.level.exit.x - this.player.x, this.level.exit.y - this.player.y);
      if (distance >= .72) return;
      if (this.level.finale) {
        const pharaoh = this.level.enemies.find(enemy => enemy.type === 'pharaoh');
        if (pharaoh?.alive) {
          if (!this.exitNoticeCooldown || this.elapsed > this.exitNoticeCooldown) {
            this.say('Le Pharaon tient encore le seuil. Maintenez-le dans le faisceau.', 2.8);
            this.exitNoticeCooldown = this.elapsed + 3;
          }
          return;
        }
        this.recordCampaignEvent('chapters', this.level.id);
        this.finish(endingKey(this.aziz, this.stats));
        return;
      }
      this.unlock('sans_cri', this.chapterStats.calls === 0);
      this.unlock('intouchable', this.chapterStats.hits === 0);
      this.unlock('sans_flash', this.chapterStats.flashes === 0);
      this.unlock('angle_parfait', this.level.kind === 'mirror' && this.chapterStats.mirrorErrors === 0);
      this.recordCampaignEvent('chapters', this.level.id);
      this.profile.unlocked = Math.max(this.profile.unlocked, this.chapterIndex + 2);
      this.storage.saveProfile(this.profile);
      this.loadChapter(this.chapterIndex + 1, this.transitionState(this.chapterIndex + 1), true);
    }

    gameOver() {
      if (this.mode === 'dying') return;
      this.mode = 'dying';
      this.stats.deaths++;
      this.say('La lumière s’éteint. Le dernier seuil vous rappelle…', 3, true);
      document.exitPointerLock?.();
      setTimeout(() => {
        const recovery = Data.DIFFICULTIES[this.profile.difficulty].checkpointRecovery;
        const checkpoint = this.checkpointState();
        checkpoint.player.health = Math.max(checkpoint.player.health, 28 + recovery * 22);
        checkpoint.player.battery = Math.max(checkpoint.player.battery, 16 + recovery * 20);
        this.loadChapter(checkpoint.chapterIndex, checkpoint, true);
      }, 1900);
    }

    finish(key) {
      this.trackDifficulty();
      this.mode = 'ending';
      this.input.reset();
      document.exitPointerLock?.();
      const ending = Data.ENDINGS[key];
      $('#ending-title').textContent = ending.title;
      $('#ending-text').textContent = ending.text;
      $('#ending-stats').textContent = `${formatDuration(finite(this.campaignElapsed, this.elapsed))} de campagne · confiance ${Math.round(this.aziz.trust)} · corruption ${Math.round(this.aziz.corruption)} · ${this.stats.deaths} mort(s)`;
      $('#ending-overlay').classList.add('open');
      $('#ending-return').focus();
      this.profile.endings = [...new Set([...this.profile.endings, key])];
      this.profile.unlocked = 6;
      this.unlock('aube', key === 'true_dawn');
      this.unlock('quatre_fins', this.profile.endings.length === 4);
      this.unlock('fin_campagne', true);
      this.unlock('eclipse', this.campaignDifficulty.fromStart && this.campaignDifficulty.started === 'eclipse' && this.campaignDifficulty.lowest === 'eclipse' && this.stats.chaptersCompleted === Data.CHAPTERS.length);
      this.storage.saveProfile(this.profile);
      this.storage.clear();
      this.audio.suspend(true);
      updateContinueButton();
      syncModalState();
    }

    unlock(id, condition) {
      if (!condition || this.profile.achievements.includes(id)) return;
      this.profile.achievements.push(id);
      this.storage.saveProfile(this.profile);
      const achievement = Data.ACHIEVEMENTS.find(item => item.id === id);
      if (achievement) this.say(`SUCCÈS — ${achievement.title}`, 2.8);
    }

    togglePause() {
      if ($('#panel').classList.contains('open')) {
        closePanel();
        return;
      }
      if (this.mode === 'playing') {
        this.input.reset();
        this.mode = 'paused';
        this.audio.suspend(true);
        $('#pause-overlay').classList.add('open');
        syncModalState();
        $('#pause-overlay [data-pause-action="resume"]').focus();
        document.exitPointerLock?.();
      } else if (this.mode === 'paused') {
        this.input.reset();
        this.mode = 'playing';
        this.audio.suspend(false);
        $('#pause-overlay').classList.remove('open');
        syncModalState();
        this.canvas.focus();
      }
      syncModalState();
    }

    openJournal() {
      this.input.reset();
      this.mode = 'paused';
      this.audio.suspend(true);
      $('#pause-overlay').classList.remove('open');
      document.exitPointerLock?.();
      openPanel('journal', 'game');
    }

    recordDiscovery(object, persist = true) {
      if (object.type !== 'inscription' && object.type !== this.level.kind) return;
      if (!object.done && !object.revealed) return;
      this.profile.notebook ||= [];
      if (this.profile.notebook.includes(object.id)) return;
      this.profile.notebook.push(object.id);
      if (persist) this.storage.saveProfile(this.profile);
    }

    showVoiceFallback(text) {
      if (this.mode !== 'playing') return;
      const fallback = $('#voice-fallback');
      fallback.textContent = `AZIZ · ${text}`;
      fallback.classList.add('visible');
      this.voiceFallbackTimer = clamp(String(text).length / 18, 4, 8);
      // Speech fallback has its own display and lifetime. It never replaces a
      // gameplay instruction or writes an older line into the discovery notebook.
    }

    say(text, seconds = 2, kind = 'gameplay') {
      if (kind === 'speech' && this.profile.options.subtitles === false) return;
      const toast = $('#toast');
      toast.textContent = text;
      toast.classList.add('visible');
      this.toastTimer = seconds;
      if (this.level?.id && kind !== 'speech') {
        this.profile.notebookRecent = { chapterId: this.level.id, text: String(text).slice(0, 1000) };
        this.storage?.saveProfile(this.profile);
      }
      // Les indices, archives et résultats d’action restent toujours lisibles.
      // Le réglage des sous-titres s’applique seulement aux répliques parlées.
    }

    updateHud() {
      if (!this.level) return;
      const projector = projectorState(this.aziz);
      $('#chapter-name').textContent = this.level.title;
      $('#objective').textContent = `${this.level.objective} · ${this.objectiveCount}/${this.level.target}`;
      for (const [id, value] of [['wake', this.aziz.wake], ['link', projector.link], ['health', this.player.health], ['battery', this.player.battery]]) {
        $(`#${id}-meter`).value = value;
        $(`#${id}-value`).textContent = Math.ceil(value);
      }
      $('#flash-count').textContent = this.player.flashes;
      $('#trust-value').textContent = Math.round(this.aziz.trust);
      $('#corruption-value').textContent = Math.round(this.aziz.corruption);
      $('#archive-count').textContent = `${this.profile.archives.length}/18`;
      $('#projector-mode').textContent = projector.label;
      document.body.classList.toggle('link-critical', projector.link < 24);
      const object = this.nearestObject();
      const exitDistance = Math.hypot(this.level.exit.x - this.player.x, this.level.exit.y - this.player.y);
      const exitAngle = angleDelta(this.player.a, Math.atan2(this.level.exit.y - this.player.y, this.level.exit.x - this.player.x));
      const exitVisible = exitDistance < 2.8 && Math.abs(exitAngle) <= this.profile.options.fov * Math.PI / 360 &&
        this.hasLineOfSight(this.player.x, this.player.y, this.level.exit.x, this.level.exit.y);
      const prompt = $('#prompt');
      if (object) {
        prompt.textContent = `[ ${actionLabel(this.profile, this.input.lastDevice, 'interact')} ] ${object.label}`;
        prompt.classList.add('visible');
      } else if (exitVisible) {
        const pharaoh = this.level.enemies.find(enemy => enemy.type === 'pharaoh' && enemy.alive);
        const state = !this.objectiveComplete ? 'PASSAGE SCELLÉ' : pharaoh ? 'SEUIL RETENU PAR LE PHARAON' : 'PASSAGE OUVERT';
        const destination = Data.CHAPTERS[this.chapterIndex + 1]?.title || 'Retour à la surface';
        const chapterArchives = Data.ARCHIVES.filter(archive => archive.chapter === this.chapterIndex);
        const found = chapterArchives.filter(archive => this.profile.archives.includes(archive.id)).length;
        prompt.textContent = `${state} · ${destination} · ${this.objectiveCount}/${this.level.target} mécanismes · ${found}/${chapterArchives.length} archives`;
        prompt.classList.add('visible');
      } else {
        prompt.textContent = '';
        prompt.classList.remove('visible');
      }
    }

    showChapterBanner() {
      $('#chapter-kicker').textContent = `DOSSIER 17 · GIZEH 1926 · CHAPITRE ${this.chapterIndex + 1}/6`;
      $('#chapter-banner-title').textContent = this.level.title;
      const directive = Data.DIFFICULTIES[this.profile.difficulty].hints ? ` Directive: ${this.level.hint}` : '';
      $('#chapter-banner-text').textContent = `${this.level.intro}${directive}`;
      const banner = $('#chapter-banner');
      banner.classList.add('visible');
      document.body.classList.add('chapter-intro');
      setTimeout(() => {
        banner.classList.remove('visible');
        setTimeout(() => document.body.classList.remove('chapter-intro'), this.profile.options.reduceMotion ? 0 : 450);
      }, this.profile.options.reduceMotion ? 1700 : 4200);
    }

    updateTutorial() {
      const tutorial = $('#tutorial-card');
      if (this.profile.onboardingComplete || this.chapterIndex !== 0) {
        tutorial.classList.remove('visible');
        return;
      }
      tutorial.classList.add('visible');
      if (this.stats.signals === 0) tutorial.innerHTML = `<b>1 · LIER LE PROJECTEUR</b><span>${actionLabel(this.profile, this.input.lastDevice, 'signal')} : transmettez le code à Aziz et choisissez Focalisé.</span>`;
      else if (this.objectiveCount === 0) tutorial.innerHTML = `<b>2 · CHARGER UN SCEAU</b><span>Approchez un sceau, visez-le puis ${actionLabel(this.profile, this.input.lastDevice, 'interact')}. Restez dans le faisceau.</span>`;
      else if (this.player.battery > 70) tutorial.innerHTML = `<b>3 · GÉRER LA NUIT</b><span>${actionLabel(this.profile, this.input.lastDevice, 'lamp')} coupe la lampe. ${actionLabel(this.profile, this.input.lastDevice, 'call')} appelle Aziz mais le bruit attire le Chacal.</span>`;
      else {
        this.profile.onboardingComplete = true;
        this.storage.saveProfile(this.profile);
        tutorial.classList.remove('visible');
      }
    }

    loop(now) {
      const dt = Math.min(.05, Math.max(0, (now - this.last) / 1000));
      this.last = now;
      this.resize();
      this.update(dt);
      if (this.mode === 'playing' && this.level && $('#game-screen').classList.contains('active')) this.render();
      if (this.mode === 'playing') this.updateTutorial();
      this.input.endFrame();
      requestAnimationFrame(this.loop);
    }

    drawObjectSprite(context, sprite, size) {
      Visuals.drawProp(context, sprite, size);
    }

    drawViewmodel(context, width, height, projector) {
      Visuals.drawViewmodel(context, width, height, {
        lampOn: this.player.lampOn, battery: this.player.battery, projector,
        signalActive: this.signalCooldown > 0, magnesium: this.flashTime > 0,
        veil: this.challenge?.type === 'veil', reduceFlashes: this.profile.options.reduceFlashes === true
      });
    }

    drawEnemySprite(context, sprite, pixelsPerUnit) {
      const dimensions = Visuals.enemyMetrics(sprite.type);
      const size = pixelsPerUnit * dimensions.unitScale;
      context.save();
      context.translate(0, -dimensions.bottom * size);
      const color = Data.THREATS[sprite.type].color;
      context.fillStyle = '#050403';
      context.strokeStyle = color;
      context.lineWidth = Math.max(1.5, size * .018);
      if (sprite.type === 'scarabs') {
        for (let index = 0; index < 7; index++) {
          const angle = index * 2.4;
          const radius = size * (.05 + (index % 3) * .045);
          context.beginPath();
          context.ellipse(Math.cos(angle) * size * .18, Math.sin(angle) * size * .16, radius, radius * .62, angle, 0, Math.PI * 2);
          context.fill();
          context.stroke();
        }
      } else if (sprite.type === 'jackal') {
        context.beginPath();
        context.ellipse(0, size * .05, size * .3, size * .16, 0, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.beginPath();
        context.moveTo(size * .12, -size * .08);
        context.lineTo(size * .26, -size * .31);
        context.lineTo(size * .31, -size * .04);
        context.closePath();
        context.fill();
        context.stroke();
        context.fillRect(-size * .2, size * .12, size * .06, size * .3);
        context.fillRect(size * .14, size * .12, size * .06, size * .3);
      } else if (sprite.type === 'scribe') {
        context.beginPath();
        context.moveTo(0, -size * .48);
        context.lineTo(size * .22, size * .42);
        context.lineTo(-size * .22, size * .42);
        context.closePath();
        context.fill();
        context.stroke();
        context.fillStyle = color;
        context.fillRect(-size * .05, -size * .32, size * .1, size * .38);
      } else if (sprite.type === 'veiled') {
        context.beginPath();
        context.moveTo(0, -size * .46);
        context.quadraticCurveTo(size * .3, -size * .04, size * .22, size * .43);
        context.lineTo(-size * .22, size * .43);
        context.quadraticCurveTo(-size * .3, -size * .04, 0, -size * .46);
        context.fill();
        context.stroke();
        context.fillStyle = color;
        context.globalAlpha *= .55;
        context.fillRect(-size * .13, -size * .15, size * .26, size * .03);
      } else {
        context.beginPath();
        context.ellipse(0, size * .03, size * (sprite.type === 'pharaoh' ? .31 : .23), size * .45, 0, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.beginPath();
        context.arc(0, -size * .3, size * .14, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        if (sprite.type === 'pharaoh') {
          context.fillStyle = color;
          context.beginPath();
          context.moveTo(-size * .2, -size * .42);
          context.lineTo(-size * .1, -size * .6);
          context.lineTo(0, -size * .44);
          context.lineTo(size * .1, -size * .6);
          context.lineTo(size * .2, -size * .42);
          context.closePath();
          context.fill();
        }
      }
      if (sprite.type !== 'scarabs') {
        context.fillStyle = sprite.state === 'stunned' ? '#fff6cf' : '#f3a654';
        context.shadowColor = context.fillStyle;
        context.shadowBlur = 8;
        context.fillRect(-size * .07, -size * .31, size * .035, size * .025);
        context.fillRect(size * .035, -size * .31, size * .035, size * .025);
      }
      context.restore();
    }

    render() {
      const context = this.ctx;
      const width = this.canvas.width;
      const height = this.canvas.height;
      const options = this.profile.options;
      const fov = options.fov * Math.PI / 180;
      const camera = Visuals.createCamera(width, height, fov);
      const projector = projectorState(this.aziz);
      const portableOn = this.player.lampOn && this.player.battery > 0;
      const shake = options.reduceMotion ? 0 : (100 - this.player.calm) / 100 * Math.sin(this.elapsed * 19) * 1.8;
      context.save();
      context.filter = Visuals.sceneFilter(options);
      context.translate(shake, 0);
      context.fillStyle = '#050405';
      context.fillRect(-3, 0, width + 6, height / 2);
      const floor = context.createLinearGradient(0, height / 2, 0, height);
      floor.addColorStop(0, '#24170f');
      floor.addColorStop(.32, '#100b08');
      floor.addColorStop(1, '#020202');
      context.fillStyle = floor;
      context.fillRect(-3, height / 2, width + 6, height / 2);
      context.strokeStyle = 'rgba(170,120,65,.06)';
      for (let row = 1; row < 9; row++) {
        const y = height / 2 + (height / 2) * (row / 9) ** 1.7;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      const rays = Math.max(220, Math.min(width, this.profile.options.quality === 'low' ? 300 : Math.floor(500 * Math.min(1, width / 1000))));
      if (this.depth.length !== rays) this.depth = new Float32Array(rays);
      for (let index = 0; index < rays; index++) {
        // Même plan de projection pour les colonnes des murs et les objets.
        const rayOffset = Math.atan(((index + .5) * width / rays - width / 2) / camera.focal);
        const rayAngle = this.player.a + rayOffset;
        const stepX = Math.cos(rayAngle), stepY = Math.sin(rayAngle);
        let distance = .04;
        for (; distance < 19; distance += .04) {
          const x = this.player.x + stepX * distance;
          const y = this.player.y + stepY * distance;
          if (this.wall(x, y)) break;
        }
        distance *= Math.cos(rayOffset);
        this.depth[index] = distance;
        const wallScale = camera.focal / Math.max(camera.nearPlane, distance);
        const sliceHeight = camera.wallHeight * wallScale;
        const wallTop = camera.horizon + (camera.eyeHeight - camera.wallHeight) * wallScale;
        const relative = Math.abs(rayOffset);
        const portable = portableOn ? clamp(1 - relative / .38, 0, 1) * clamp(1 - distance / 7, 0, 1) : 0;
        const projected = projector.online ? clamp(1 - relative / projector.cone, 0, 1) * clamp(1 - distance / projector.range, 0, 1) * projector.link / 100 * projector.power : 0;
        const light = clamp(.07 + portable * .8 + projected * .9, .05, 1.25);
        const base = Math.round(13 + light * 112);
        context.fillStyle = `rgb(${base},${Math.round(base * .68)},${Math.round(base * .37)})`;
        context.fillRect(index * width / rays, wallTop, width / rays + 1, sliceHeight);
        if (index % 9 === 0) {
          context.fillStyle = 'rgba(18,10,6,.18)';
          context.fillRect(index * width / rays, wallTop, 1, sliceHeight);
        }
      }

      const objects = this.level.objects.filter(object => !object.done || !['archive', 'oil', 'flash'].includes(object.type)).map(object => ({
        ...object,
        active: object.id === this.ritual?.id || object.id === this.challenge?.objectId,
        color: object.done ? '#91b9a1' : object.type === 'archive' ? '#91c4cf' :
          object.type === this.level.kind ? (canOperateObjective(this.level.kind, this.aziz).ok ? '#f4ce73' : '#86633d') : '#aa7d43',
        enemy: false
      }));
      const exitOpen = this.objectiveComplete && !(this.level.finale && this.level.enemies.some(enemy => enemy.type === 'pharaoh' && enemy.alive));
      objects.push({ ...this.level.exit, id: 'exit', type: 'exit', label: 'Passage',
        open: exitOpen, color: exitOpen ? '#fff0b0' : '#a78b58', enemy: false });
      const sprites = [
        ...objects,
        ...this.level.enemies.filter(enemy => enemy.alive).map(enemy => ({ ...enemy, enemy: true }))
      ].map(sprite => {
        const dimensions = sprite.enemy ? Visuals.enemyMetrics(sprite.type) : Visuals.propMetrics(sprite.type);
        const projection = Visuals.projectSprite(camera, this.player, sprite, dimensions);
        return projection ? { ...sprite, ...projection } : null;
      }).filter(Boolean)
        .sort((left, right) => right.cameraDepth - left.cameraDepth);

      for (const sprite of sprites) {
        const padding = Math.max(8, sprite.scale * .02);
        const firstRay = Math.max(0, Math.floor((sprite.left - padding) / width * rays));
        const lastRay = Math.min(rays - 1, Math.ceil((sprite.right + padding) / width * rays));
        context.save();
        context.beginPath();
        let visible = false;
        let runStart = -1;
        for (let ray = firstRay; ray <= lastRay + 1; ray++) {
          const clear = ray <= lastRay && this.depth[ray] + .04 >= sprite.cameraDepth;
          if (clear && runStart < 0) runStart = ray;
          if (!clear && runStart >= 0) {
            context.rect(runStart * width / rays, 0, (ray - runStart) * width / rays, height);
            visible = true;
            runStart = -1;
          }
        }
        if (!visible) { context.restore(); continue; }
        context.clip();
        context.globalAlpha = clamp(1 - sprite.distance / 19, .16, 1);
        context.translate(sprite.screenX, sprite.baseY);
        if (sprite.enemy) this.drawEnemySprite(context, sprite, sprite.scale);
        else this.drawObjectSprite(context, sprite, sprite.scale);
        context.restore();
      }

      const fog = context.createRadialGradient(width / 2, height / 2, Math.min(width, height) * .08, width / 2, height / 2, Math.max(width, height) * .7);
      fog.addColorStop(0, 'rgba(0,0,0,0)');
      fog.addColorStop(.56, `rgba(0,0,0,${portableOn ? .18 : .38})`);
      fog.addColorStop(1, `rgba(0,0,0,${portableOn ? .72 : .91})`);
      context.fillStyle = fog;
      context.fillRect(-3, 0, width + 6, height);
      if (!options.reduceFlashes && projector.link < 24 && Math.floor(this.elapsed * 12) % 7 === 0) {
        context.fillStyle = `rgba(0,0,0,${(24 - projector.link) / 42})`;
        context.fillRect(-3, 0, width + 6, height);
      }
      if (!options.reduceFlashes && this.flashTime > 0) {
        context.fillStyle = `rgba(255,239,197,${clamp(this.flashTime * 3.8, 0, 1)})`;
        context.fillRect(-3, 0, width + 6, height);
      }
      if (this.player.health < 38) {
        context.fillStyle = `rgba(105,0,0,${(38 - this.player.health) / 145})`;
        context.fillRect(-3, 0, width + 6, height);
      }
      if (!options.reduceFlashes && this.challenge?.type === 'veil') {
        context.fillStyle = `rgba(215,210,190,${.025 + (options.reduceMotion ? 0 : Math.sin(this.elapsed * 26) * .018)})`;
        context.fillRect(-3, 0, width + 6, height);
      }
      context.restore();
      // Le matériel tenu suit le viewport et reste indépendant du FOV et du tremblement.
      context.save();
      context.filter = Visuals.sceneFilter(options);
      this.drawViewmodel(context, width, height, projector);
      context.restore();
    }
  }

  const storage = new Storage();
  const profile = storage.getProfile();
  const canvas = $('#game-canvas');
  const audio = new AudioEngine(profile);
  let game = null;
  const input = new Input(canvas, () => game, () => profile);
  const runtime = { storage, profile, input, audio, get game() { return game; } };
  audio.onVoiceFallback = text => {
    if (game?.mode === 'playing') game.showVoiceFallback(text);
    const status = $('#audio-preview-status');
    if (status) status.textContent = `Réplique écrite : ${text}`;
  };
  window.AZIZ = { Data, Mechanics, runtime, Storage, Game };
  let lastFocused = null;
  let deferredInstall = null;
  let pendingConfirmation = null;
  let confirmationFocus = null;
  let optionsSection = 'display';
  let remappingAction = null;
  let expeditionDifficulty = profile.difficulty;
  const collectionView = { category: 'archives', filter: 'all', chapter: 'all', page: 0 };
  storage.onDegraded = () => {
    $('#storage-warning').hidden = false;
    if (game && ['playing', 'paused'].includes(game.mode)) {
      game.say('Stockage persistant indisponible · sauvegarde limitée à cette session.', 5, true);
    }
  };
  if (storage.degraded) queueMicrotask(storage.onDegraded);

  function syncModalState() {
    const overlays = $$('.overlay.open');
    const active = overlays.at(-1);
    $('#title-screen').inert = !!active;
    $('#game-screen').inert = !!active;
    $$('.overlay').forEach(overlay => { overlay.inert = !!active && overlay !== active; });
  }

  function requestConfirmation(title, text, action, callback) {
    pendingConfirmation = callback;
    confirmationFocus = document.activeElement;
    $('#confirm-title').textContent = title;
    $('#confirm-text').textContent = text;
    $('#confirm-accept').textContent = action;
    $('#confirm-overlay').classList.add('open');
    input.reset();
    syncModalState();
    $('#confirm-cancel').focus();
  }

  function closeConfirmation(accepted = false) {
    const callback = pendingConfirmation;
    pendingConfirmation = null;
    $('#confirm-overlay').classList.remove('open');
    syncModalState();
    input.reset();
    if (accepted) callback?.();
    else confirmationFocus?.focus?.();
  }

  function formatSaveSummary(save) {
    if (!save) return 'Votre prochaine expédition commence dans la Chambre des noms.';
    const chapter = Data.CHAPTERS[save.chapterIndex];
    const completed = chapter.objects.filter(object => object.type === chapter.kind &&
      (save.completedIds.includes(object.id) || save.objectStates[object.id]?.done)).length;
    const date = save.savedAt ? new Date(save.savedAt) : null;
    const time = date && Number.isFinite(date.getTime()) ? ` · ${new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)}` : '';
    const difficulty = Object.hasOwn(Data.DIFFICULTIES, save.difficulty) ? save.difficulty : profile.difficulty;
    return `${chapter.title} · ${Data.DIFFICULTIES[difficulty].name} · ${completed}/${chapter.target} objectifs · ${formatDuration(finite(save.campaignElapsed, save.elapsed))} de campagne${time}`;
  }

  function applyOptions() {
    document.documentElement.classList.toggle('large-text', profile.options.largeText);
    document.body.classList.toggle('reduce-motion', profile.options.reduceMotion);
    document.body.classList.toggle('reduce-flashes', profile.options.reduceFlashes);
    document.body.classList.toggle('large-text', profile.options.largeText);
    document.body.classList.toggle('high-contrast', profile.options.highContrast);
    document.body.classList.toggle('direction-cues', profile.options.directionCues);
    document.documentElement.style.setProperty('--calibration-brightness', String(profile.options.brightness));
    audio.applyMix();
    document.body.classList.toggle('touch-left', profile.options.touchSide === 'left');
    document.documentElement.style.setProperty('--touch-scale', profile.options.touchScale);
    refreshActionHints();
    if (game) {
      game.resize();
      if (game.level && game.mode === 'paused') game.render();
    }
  }

  function updateContinueButton() {
    const button = $('[data-menu="continue"]');
    const save = storage.getSave();
    button.disabled = !save;
    button.textContent = save ? `Continuer · chapitre ${save.chapterIndex + 1}` : 'Continuer';
    $('#campaign-summary').textContent = formatSaveSummary(save);
  }

  function showTitle() {
    if (game?.level && ['playing', 'paused'].includes(game.mode)) game.save(true);
    if (game) game.mode = 'title';
    audio.suspend(true);
    $('#game-screen').classList.remove('active');
    $('#title-screen').classList.add('active');
    $$('.overlay').forEach(overlay => overlay.classList.remove('open'));
    input.reset();
    syncModalState();
    document.exitPointerLock?.();
    updateContinueButton();
    $(`[data-menu="${storage.getSave() ? 'continue' : 'campaign'}"]`).focus();
  }

  function begin(index = 0, save = null) {
    audio.ensure();
    $$('.overlay').forEach(overlay => overlay.classList.remove('open'));
    input.reset();
    syncModalState();
    game ||= new Game(canvas, storage, profile, input, audio);
    game.start(index, save);
    audio.suspend(false);
  }

  function showPrologue(preserveChoice = false) {
    lastFocused = document.activeElement;
    $('#panel').classList.remove('open');
    const currentSave = storage.getSave();
    $('#new-campaign-warning').hidden = !currentSave;
    if (currentSave) $('#new-campaign-warning').textContent = `Expédition en cours : ${formatSaveSummary(currentSave)}. Descendre dans le temple remplacera cette progression. Vos archives, succès et fins seront conservés.`;
    if (!preserveChoice) expeditionDifficulty = profile.difficulty;
    const choices = $('#expedition-difficulties');
    choices.replaceChildren();
    for (const [key, difficulty] of Object.entries(Data.DIFFICULTIES)) {
      const label = document.createElement('label');
      label.className = 'difficulty-choice';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'expedition-difficulty';
      radio.value = key;
      radio.checked = key === expeditionDifficulty;
      radio.onchange = () => { if (radio.checked) expeditionDifficulty = key; };
      const text = document.createElement('span');
      const title = document.createElement('strong');
      title.textContent = difficulty.name;
      const description = document.createElement('span');
      const percent = value => `${Math.round(value * 100)} %`;
      description.textContent = `${difficulty.description} Dégâts reçus : ${percent(difficulty.damage)} · consommation de lampe : ${percent(difficulty.battery)} du mode Expédition. ${difficulty.hints ? 'Directives de chapitre affichées.' : 'Aucune directive : seuls vos relevés découverts restent consultables.'}`;
      text.append(title, description);
      label.append(radio, text);
      choices.append(label);
    }
    refreshActionHints();
    $('#prologue-overlay').classList.add('open');
    input.reset();
    syncModalState();
    choices.querySelector('input:checked').focus();
  }

  function refreshActionHints() {
    $$('[data-action-hint]').forEach(node => { node.textContent = actionLabel(profile, input.lastDevice, node.dataset.actionHint); });
    $$('[data-controls-help]').forEach(node => { node.textContent = controlsSummary(profile, input.lastDevice); });
  }
  input.onDeviceChange = refreshActionHints;

  function cancelRemapping(message = 'Modification annulée.') {
    if (!remappingAction) return;
    const button = $(`[data-remap="${remappingAction}"]`);
    if (button) button.textContent = actionKeys(profile, remappingAction).map(keyLabel).join(' / ');
    remappingAction = null;
    const status = $('#binding-status');
    if (status) status.textContent = message;
  }

  function bindRemapping(box) {
    box.querySelectorAll('[data-remap]').forEach(button => {
      button.onclick = () => {
        cancelRemapping();
        remappingAction = button.dataset.remap;
        button.textContent = 'Appuyez sur une touche…';
        $('#binding-status').textContent = `${ACTIONS[remappingAction].title} : appuyez sur une touche simple. Échap ou Tab pour annuler.`;
      };
    });
    $('#reset-bindings').onclick = () => {
      cancelRemapping();
      profile.options.bindings = clone(DEFAULT_BINDINGS);
      storage.saveProfile(profile);
      box.querySelectorAll('[data-remap]').forEach(button => { button.textContent = actionKeys(profile, button.dataset.remap).map(keyLabel).join(' / '); });
      $('#binding-status').textContent = 'Commandes d’origine rétablies.';
      input.reset();
      refreshActionHints();
    };
  }

  function cardMarkup(title, text, locked = false, action = '') {
    return `<article class="panel-item ${locked ? 'locked' : ''}" ${action}><h3></h3><p></p></article>`;
  }

  function appendCard(container, title, text, locked = false) {
    const article = document.createElement('article');
    article.className = `panel-item ${locked ? 'locked' : ''}`;
    const heading = document.createElement('h3');
    const paragraph = document.createElement('p');
    heading.textContent = title;
    paragraph.textContent = text;
    article.append(heading, paragraph);
    container.append(article);
    return article;
  }

  function renderCollection(box) {
    const totals = { archives: Data.ARCHIVES.length, achievements: Data.ACHIEVEMENTS.length, endings: Object.keys(Data.ENDINGS).length };
    const names = { archives: 'Archives', achievements: 'Succès', endings: 'Fins' };
    box.innerHTML = `<nav class="options-tabs collection-tabs" role="tablist" aria-label="Catégories de la collection">${Object.entries(names).map(([key, label]) => `<button type="button" role="tab" id="collection-tab-${key}" data-collection-tab="${key}" aria-controls="collection-results">${label} ${profile[key].length}/${totals[key]}</button>`).join('')}</nav>
      <div class="collection-filters"><label>Afficher<select id="collection-filter"><option value="all">Tout</option><option value="found">Découverts / obtenus</option><option value="missing">À découvrir / accomplir</option></select></label><label id="collection-chapter-label">Chapitre<select id="collection-chapter"><option value="all">Tous les chapitres</option>${Data.CHAPTERS.map((chapter, index) => `<option value="${index}">${chapter.title}</option>`).join('')}</select></label></div>
      <p id="collection-progress" class="option-help"></p><p id="collection-count" role="status"></p>
      <section id="collection-results" role="tabpanel" tabindex="0"><div id="collection-grid" class="panel-grid"></div></section>
      <div class="collection-pager"><button id="collection-previous" type="button">Précédent</button><span id="collection-page"></span><button id="collection-next" type="button">Suivant</button></div>`;
    $('#collection-filter').value = collectionView.filter;
    $('#collection-chapter').value = collectionView.chapter;
    const render = () => {
      box.querySelectorAll('[data-collection-tab]').forEach(button => {
        const selected = button.dataset.collectionTab === collectionView.category;
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
      });
      $('#collection-results').setAttribute('aria-labelledby', `collection-tab-${collectionView.category}`);
      $('#collection-chapter-label').hidden = collectionView.category !== 'archives';
      const progress = $('#collection-progress');
      progress.hidden = collectionView.category !== 'archives';
      progress.textContent = Data.CHAPTERS.map((chapter, index) => `Chapitre ${index + 1} : ${Data.ARCHIVES.filter(item => item.chapter === index && profile.archives.includes(item.id)).length}/3 archives · ${profile.visited.includes(chapter.id) ? 'visité' : 'non visité'}`).join(' | ');
      const entries = collectionEntries(profile, collectionView);
      const pages = Math.max(1, Math.ceil(entries.length / 6));
      collectionView.page = clamp(collectionView.page, 0, pages - 1);
      $('#collection-count').textContent = `${names[collectionView.category]} · ${entries.length} élément(s) pour ces filtres.`;
      const grid = $('#collection-grid');
      grid.replaceChildren();
      entries.slice(collectionView.page * 6, collectionView.page * 6 + 6).forEach(entry => appendCard(grid, entry.title, entry.text, !entry.found));
      if (!entries.length) appendCard(grid, 'Aucun résultat', 'Choisissez un autre filtre pour parcourir votre collection.');
      $('#collection-page').textContent = `${collectionView.page + 1} / ${pages}`;
      $('#collection-previous').disabled = collectionView.page === 0;
      $('#collection-next').disabled = collectionView.page >= pages - 1;
    };
    box.querySelectorAll('[data-collection-tab]').forEach(button => {
      button.onclick = () => { collectionView.category = button.dataset.collectionTab; collectionView.page = 0; render(); };
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        const tabs = [...box.querySelectorAll('[data-collection-tab]')];
        const index = tabs.indexOf(button);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
        tabs[next].click(); tabs[next].focus();
      });
    });
    $('#collection-filter').onchange = event => { collectionView.filter = event.target.value; collectionView.page = 0; render(); };
    $('#collection-chapter').onchange = event => { collectionView.chapter = event.target.value; collectionView.page = 0; render(); };
    $('#collection-previous').onclick = () => { collectionView.page--; render(); $('#collection-results').focus(); };
    $('#collection-next').onclick = () => { collectionView.page++; render(); $('#collection-results').focus(); };
    render();
  }

  function renderNotebook(box) {
    const heading = document.createElement('h3');
    heading.textContent = 'Carnet des découvertes';
    box.append(heading);
    const chapters = notebookEntries(profile);
    if (!chapters.length) appendCard(box, 'Aucun relevé pour le moment', 'Examinez une inscription, révélez un mécanisme ou retrouvez une archive pour l’ajouter à ce carnet.');
    for (const chapter of chapters) {
      const section = document.createElement('section');
      section.className = 'notebook-chapter';
      const title = document.createElement('h4');
      title.textContent = chapter.title;
      const grid = document.createElement('div');
      grid.className = 'panel-grid';
      chapter.entries.forEach(entry => appendCard(grid, entry.title, entry.text));
      section.append(title, grid);
      box.append(section);
    }
    if (game?.level) {
      const known = game.level.objects.filter(object => object.type === game.level.kind && (object.done || object.revealed));
      if (known.length) {
        const states = document.createElement('div');
        states.className = 'panel-grid';
        for (const object of known) appendCard(states, object.label, object.done ? 'État actuel : activé.' : `État actuel : orientation ${ORIENTATIONS[object.orientation]} · cible relevée ${ORIENTATIONS[object.targetOrientation]}.`);
        const title = document.createElement('h3');
        title.textContent = 'Mécanismes connus dans ce chapitre';
        box.append(title, states);
      }
    }
    if (profile.notebookRecent) {
      const chapter = Data.CHAPTERS.find(item => item.id === profile.notebookRecent.chapterId);
      appendCard(box, `Dernier message · ${chapter?.title || ''}`, profile.notebookRecent.text);
    }
  }

  function openPanel(kind, returnTo = 'title') {
    cancelRemapping();
    const panel = $('#panel');
    const title = $('#panel-title');
    const box = $('#panel-content');
    lastFocused = document.activeElement;
    panel.dataset.returnTo = returnTo;
    panel.dataset.kind = kind;
    panel.dataset.parent = kind === 'chapters' ? 'campaign' : '';
    panel.classList.add('open');
    box.replaceChildren();
    input.reset();
    if (returnTo === 'pause' || returnTo === 'game') {
      if (game) game.mode = 'paused';
      audio.suspend(true);
      $('#pause-overlay').classList.remove('open');
    }

    if (kind === 'campaign') {
      title.textContent = 'Campagne';
      const summary = document.createElement('p');
      summary.className = 'journal-lead';
      summary.textContent = formatSaveSummary(storage.getSave());
      const actions = document.createElement('div');
      actions.className = 'campaign-actions';
      actions.innerHTML = '<button data-campaign="new" class="primary">Nouvelle expédition</button><button data-campaign="chapters">Rejouer un chapitre</button>';
      box.append(summary, actions);
      $('[data-campaign="new"]').onclick = () => showPrologue();
      $('[data-campaign="chapters"]').onclick = () => openPanel('chapters');
    } else if (kind === 'chapters') {
      title.textContent = 'Chapitres';
      const grid = document.createElement('div');
      grid.className = 'panel-grid';
      Data.CHAPTERS.forEach((chapter, index) => {
        const button = document.createElement('button');
        button.className = 'panel-item chapter-card';
        button.disabled = index >= profile.unlocked;
        const heading = document.createElement('strong');
        const paragraph = document.createElement('span');
        heading.textContent = chapter.title;
        paragraph.textContent = button.disabled ? 'Verrouillé' : chapter.intro;
        button.append(heading, paragraph);
        button.addEventListener('click', () => {
          const launch = () => { closePanel(false); begin(index); };
          if (storage.getSave()) requestConfirmation('Rejouer ce chapitre ?',
            `Expédition en cours : ${formatSaveSummary(storage.getSave())}. Rejouer ${chapter.title} remplacera cette progression. Votre collection reste conservée. Vous pouvez exporter la campagne depuis Sauvegardes.`,
            'Rejouer le chapitre', launch);
          else launch();
        });
        grid.append(button);
      });
      box.append(grid);
    } else if (kind === 'archives') {
      title.textContent = 'Collection';
      renderCollection(box);
    } else if (kind === 'options') {
      title.textContent = 'Options';
      box.innerHTML = `
        <nav class="options-tabs" role="tablist" aria-label="Catégories des options">${[['display', 'Image'], ['audio', 'Son'], ['access', 'Accessibilité'], ['controls', 'Jeu et commandes']].map(([key, label]) => `<button type="button" id="tab-${key}" role="tab" data-options-tab="${key}" aria-controls="options-${key}">${label}</button>`).join('')}</nav>
        <section id="options-display" role="tabpanel" aria-labelledby="tab-display" data-options-section="display">
          <label class="option-row"><span>Luminosité<output id="value-brightness" for="opt-brightness"></output></span><input id="opt-brightness" type="range" min=".7" max="1.6" step=".05" value="${profile.options.brightness}"></label>
          <div class="calibration-preview" role="img" aria-label="Mire de luminosité : trois soleils de plus en plus clairs"><span>☼</span><span>☼</span><span>☼</span></div>
          <p class="option-help">Réglez votre écran et la luminosité pour distinguer à peine le soleil central. Celui de droite doit rester visible. En pause, le temple reflète votre réglage ; la portée des lampes reste identique.</p>
          <label class="option-row"><span>Champ de vision<output id="value-fov" for="opt-fov"></output></span><input id="opt-fov" type="range" min="55" max="85" value="${profile.options.fov}"></label>
          <label class="option-row">Qualité du rendu<select id="opt-quality"><option value="auto">Automatique</option><option value="low">Économie mobile</option><option value="high">Haute</option></select></label>
        </section>
        <section id="options-audio" role="tabpanel" aria-labelledby="tab-audio" data-options-section="audio">
          <label class="option-row"><span>Volume<output id="value-volume" for="opt-volume"></output></span><input id="opt-volume" type="range" min="0" max="1" step=".05" value="${profile.options.volume}"></label>
          ${[['effectsVolume', 'Effets et signaux'], ['ambienceVolume', 'Ambiance'], ['voiceVolume', 'Voix d’Aziz']].map(([key, label]) => `<label class="option-row"><span>${label}<output id="value-${key}" for="opt-${key}"></output></span><input id="opt-${key}" type="range" min="0" max="1" step=".05" value="${profile.options[key]}"></label>`).join('')}
          ${[['subtitles', 'Sous-titres des voix'], ['voices', 'Voix françaises locales'], ['reduceDynamicRange', 'Réduire la dynamique des sons']].map(([key, label]) => `<label class="option-row">${label}<input id="opt-${key}" type="checkbox" ${profile.options[key] ? 'checked' : ''}></label>`).join('')}
          <p id="voice-availability" class="option-help"></p>
          <div class="save-actions"><button type="button" data-audio-preview="effects">Écouter les effets</button><button type="button" data-audio-preview="ambience">Écouter l’ambiance</button><button type="button" data-audio-preview="voice">Écouter Aziz</button></div>
          <p id="audio-preview-status" class="option-help" role="status"></p>
          <p class="option-help">Les indices restent lisibles sans son. Si aucune voix française locale n’est disponible, les répliques sont affichées. La préécoute conserve la partie en pause.</p>
        </section>
        <section id="options-access" role="tabpanel" aria-labelledby="tab-access" data-options-section="access">
          ${[['directionCues', 'Repères directionnels textuels'], ['reduceMotion', 'Réduction des mouvements'], ['reduceFlashes', 'Réduire les flashs lumineux'], ['largeText', 'Texte agrandi'], ['highContrast', 'Contraste renforcé']].map(([key, label]) => `<label class="option-row">${label}<input id="opt-${key}" type="checkbox" ${profile.options[key] ? 'checked' : ''}></label>`).join('')}
        </section>
        <section id="options-controls" role="tabpanel" aria-labelledby="tab-controls" data-options-section="controls">
          <label class="option-row"><span>Difficulté<small id="difficulty-description"></small></span><select id="opt-difficulty">${Object.entries(Data.DIFFICULTIES).map(([key, value]) => `<option value="${key}" ${profile.difficulty === key ? 'selected' : ''}>${value.name}</option>`).join('')}</select></label>
          <label class="option-row"><span>Sensibilité<output id="value-sensitivity" for="opt-sensitivity"></output></span><input id="opt-sensitivity" type="range" min=".3" max="2" step=".1" value="${profile.options.sensitivity}"></label>
          <p class="option-help" data-controls-help></p>
          <p class="option-help">Manette : haut / bas pour parcourir, gauche / droite pour régler une valeur, A / Croix pour valider, B / Rond pour revenir.</p>
          <h3>Commandes tactiles</h3>
          <label class="option-row"><span>Taille des commandes<output id="value-touch-scale" for="opt-touch-scale"></output></span><input id="opt-touch-scale" type="range" min=".85" max="1.25" step=".05" value="${profile.options.touchScale}"></label>
          <label class="option-row">Côté des actions<select id="opt-touch-side"><option value="right">Droite · déplacement à gauche</option><option value="left">Gauche · déplacement à droite</option></select></label>
          <label class="option-row">Course tactile<select id="opt-touch-sprint"><option value="toggle">Appuyer pour activer / arrêter</option><option value="hold">Maintenir pour courir</option></select></label>
          <p class="option-help">En mode bascule, un second appui sur COURIR arrête la course. La pause la désactive. Le déplacement, la visée et une action restent indépendants.</p>
          <h3>Touches du clavier</h3>
          <p class="option-help">Choisissez une action puis une touche simple. Les lettres correspondent aux positions physiques WASD / ZQSD. Échap reste disponible pour la pause et le retour des menus.</p>
          <div class="binding-grid">${Object.entries(ACTIONS).map(([key, action]) => `<div class="binding-row"><span id="binding-label-${key}">${action.title}</span><button type="button" data-remap="${key}" aria-labelledby="binding-label-${key} binding-key-${key}" id="binding-key-${key}">${actionKeys(profile, key).map(keyLabel).join(' / ')}</button></div>`).join('')}</div>
          <p id="binding-status" class="option-help" role="status"></p><button type="button" id="reset-bindings">Rétablir les touches d’origine</button>
        </section>`;
      $('#opt-quality').value = profile.options.quality;
      $('#opt-touch-side').value = profile.options.touchSide;
      $('#opt-touch-sprint').value = profile.options.touchSprint;
      bindRemapping(box);
      const updateDescription = () => {
        $('#difficulty-description').textContent = Data.DIFFICULTIES[$('#opt-difficulty').value].description;
        $('#value-volume').textContent = `${Math.round(profile.options.volume * 100)} %`;
        for (const key of ['effectsVolume', 'ambienceVolume', 'voiceVolume', 'brightness']) $(`#value-${key}`).textContent = `${Math.round(profile.options[key] * 100)} %`;
        const localVoice = audio.localVoice();
        $('#voice-availability').textContent = localVoice ? `Voix locale : ${localVoice.name}` : 'Voix française locale indisponible · les répliques restent écrites.';
        $('#value-fov').textContent = `${profile.options.fov}°`;
        $('#value-sensitivity').textContent = `${profile.options.sensitivity.toFixed(1)}×`;
        $('#value-touch-scale').textContent = `${Math.round(profile.options.touchScale * 100)} %`;
      };
      updateDescription();
      box.querySelectorAll('[data-audio-preview]').forEach(button => {
        button.onclick = () => {
          if (button.dataset.audioPreview === 'voice' && !profile.options.voices) {
            $('#audio-preview-status').textContent = 'Activez les voix françaises locales pour cette préécoute.';
            return;
          }
          $('#audio-preview-status').textContent = 'Préécoute · votre progression reste en pause.';
          if (!audio.preview(button.dataset.audioPreview)) $('#audio-preview-status').textContent = 'Audio indisponible sur cet appareil.';
        };
      });
      const selectSection = key => {
        cancelRemapping();
        optionsSection = key;
        box.querySelectorAll('[data-options-section]').forEach(section => { section.hidden = section.dataset.optionsSection !== key; });
        box.querySelectorAll('[data-options-tab]').forEach(button => {
          const selected = button.dataset.optionsTab === key;
          button.setAttribute('aria-selected', String(selected));
          button.tabIndex = selected ? 0 : -1;
        });
      };
      box.querySelectorAll('[data-options-tab]').forEach(button => {
        button.onclick = () => selectSection(button.dataset.optionsTab);
        button.addEventListener('keydown', event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          event.stopPropagation();
          const tabs = [...box.querySelectorAll('[data-options-tab]')];
          const index = tabs.indexOf(button);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
          selectSection(tabs[next].dataset.optionsTab);
          tabs[next].focus();
        });
      });
      selectSection(optionsSection);
      const updateOptions = () => {
        const previousDifficulty = profile.difficulty;
        profile.difficulty = $('#opt-difficulty').value;
        if (game?.level && ['playing', 'paused'].includes(game.mode) && previousDifficulty !== profile.difficulty) {
          game.trackDifficulty();
          game.save(true);
        }
        profile.options.volume = +$('#opt-volume').value;
        for (const key of ['effectsVolume', 'ambienceVolume', 'voiceVolume', 'brightness']) profile.options[key] = +$(`#opt-${key}`).value;
        profile.options.sensitivity = +$('#opt-sensitivity').value;
        profile.options.fov = +$('#opt-fov').value;
        profile.options.quality = $('#opt-quality').value;
        profile.options.touchScale = +$('#opt-touch-scale').value;
        profile.options.touchSide = $('#opt-touch-side').value;
        profile.options.touchSprint = $('#opt-touch-sprint').value;
        for (const key of ['subtitles', 'voices', 'directionCues', 'reduceMotion', 'reduceFlashes', 'reduceDynamicRange', 'largeText', 'highContrast']) profile.options[key] = $(`#opt-${key}`).checked;
        storage.saveProfile(profile);
        applyOptions();
        updateDescription();
      };
      box.querySelectorAll('input, select').forEach(element => {
        element.addEventListener('change', updateOptions);
        if (element.type === 'range') element.addEventListener('input', updateOptions);
      });
    } else if (kind === 'save') {
      title.textContent = 'Sauvegardes';
      if (game?.level && returnTo === 'pause') game.save(true);
      const explanation = document.createElement('p');
      explanation.textContent = 'Le dossier JSON conserve campagne, options, touches personnalisées, carnet, archives, succès et fins. Une collection sans campagne active peut aussi être transférée.';
      const area = document.createElement('textarea');
      area.id = 'save-json';
      area.setAttribute('aria-label', 'Dossier de sauvegarde JSON');
      area.className = 'save-area';
      area.spellcheck = false;
      area.value = storage.export();
      const actions = document.createElement('div');
      actions.className = 'save-actions';
      actions.innerHTML = '<button id="copy-save">Copier</button><button id="download-save">Télécharger</button><label class="file-button">Choisir un fichier<input id="save-file" type="file" accept="application/json,.json"></label><button id="import-save" class="primary">Importer le JSON</button>';
      const status = document.createElement('p');
      status.id = 'save-status';
      status.setAttribute('role', 'status');
      box.append(explanation, area, actions, status);
      if (storage.degraded) status.textContent = 'Stockage persistant indisponible: les données restent exportables pendant cette session.';
      $('#copy-save').onclick = async () => {
        try {
          await navigator.clipboard.writeText(area.value);
          status.textContent = 'Export copié.';
        } catch {
          area.select();
          status.textContent = 'Texte sélectionné: copiez-le manuellement.';
        }
      };
      $('#download-save').onclick = () => {
        const url = URL.createObjectURL(new Blob([area.value], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `aziz-v1.2.0-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        status.textContent = 'Dossier de sauvegarde téléchargé.';
      };
      $('#save-file').onchange = async event => {
        const file = event.target.files?.[0];
        if (file) area.value = await file.text();
      };
      $('#import-save').onclick = () => {
        try {
          const importText = area.value;
          const preview = storage.prepareImport(importText);
          const commitImport = () => {
            const imported = storage.import(importText);
            Object.assign(profile, imported.profile);
            if (!profile.achievements.includes('collection')) profile.achievements.push('collection');
            storage.saveProfile(profile);
            // Un ancien objet Game ne doit plus pouvoir réécrire la campagne importée.
            if (game) { game.mode = 'title'; game.level = null; game.ritual = null; game.challenge = null; }
            applyOptions();
            showTitle();
            openPanel('save');
            $('#save-status').textContent = imported.save ? 'Campagne importée. Le bouton Continuer est prêt.' :
              storage.getSave() ? 'Collection et options importées · campagne locale conservée.' : 'Collection et options importées.';
          };
          if (preview.save && storage.getSave()) requestConfirmation('Remplacer la campagne ?',
            `Expédition locale : ${formatSaveSummary(storage.getSave())}. Le dossier importé reprend ${Data.CHAPTERS[preview.save.chapterIndex].title} et remplacera votre progression et votre collection locales. Annulez pour exporter d’abord votre sauvegarde actuelle.`,
            'Importer ce dossier', commitImport);
          else commitImport();
        } catch (error) {
          status.textContent = error.message;
        }
      };
    } else if (kind === 'journal') {
      title.textContent = 'Journal de l’expédition';
      const chapter = game?.level;
      const projector = game ? projectorState(game.aziz) : null;
      const journalHint = Data.DIFFICULTIES[profile.difficulty].hints ? chapter?.hint : 'Le temple ne livre aucune directive dans cette difficulté.';
      box.innerHTML = `
        <div class="journal-lead"><p class="eyebrow">PLATEAU DE GIZEH · NOVEMBRE 1926 · EXPÉDITION FICTIONNELLE</p><h3>${chapter?.objective || 'Campagne'}</h3><p>${journalHint || 'Retrouvez les dix-huit relevés et gardez Aziz éveillé.'}</p></div>
        <div class="journal-stats"><span>Progression <b>${game?.objectiveCount || 0}/${chapter?.target || 0}</b></span><span>Lien <b>${Math.ceil(projector?.link || 0)}%</b></span><span>Confiance <b>${Math.round(game?.aziz?.trust || 0)}</b></span><span>Corruption <b>${Math.round(game?.aziz?.corruption || 0)}</b></span></div>
        <div id="notebook"></div>
        <h3>Doctrine de lumière</h3><p><b data-action-hint="signal"></b> : transmettre Soleil — Silence — Soleil et changer le projecteur. <b>Focalisé</b> charge et brûle; <b>Balayage</b> révèle; <b>Rempart</b> protège à courte portée. <b data-action-hint="call"></b> réveille Aziz mais produit un bruit puissant.</p>
        <h3>Menaces relevées</h3><div id="threat-notes" class="panel-grid"></div>
        <h3>Commandes</h3><p data-controls-help></p>`;
      renderNotebook($('#notebook'));
      const notes = $('#threat-notes');
      for (const threat of Object.values(Data.THREATS)) appendCard(notes, threat.name, threat.behavior);
    }

    refreshActionHints();
    syncModalState();
    requestAnimationFrame(() => { if ($$('.overlay.open').at(-1) === panel) $('[data-close]').focus(); });
  }

  function closePanel(restoreFocus = true) {
    cancelRemapping();
    const panel = $('#panel');
    const returnTo = panel.dataset.returnTo;
    if (restoreFocus && panel.dataset.parent) {
      openPanel(panel.dataset.parent, returnTo);
      return;
    }
    panel.classList.remove('open');
    input.reset();
    if (returnTo === 'prologue') {
      showPrologue(true);
    } else if (returnTo === 'pause' && game) {
      game.mode = 'paused';
      $('#pause-overlay').classList.add('open');
      syncModalState();
      $('[data-pause-action="resume"]').focus();
    } else if (returnTo === 'game' && game) {
      game.mode = 'playing';
      audio.suspend(false);
      syncModalState();
      canvas.focus();
    } else if (restoreFocus) {
      syncModalState();
      if (lastFocused?.isConnected && lastFocused.getClientRects().length) lastFocused.focus();
      else $('[data-menu="campaign"]').focus();
    }
    syncModalState();
  }

  function trapFocus(event) {
    if (event.key !== 'Tab') return;
    const overlay = $$('.overlay.open').at(-1);
    if (!overlay) return;
    const focusable = [...overlay.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [href], [tabindex]:not([tabindex="-1"])')]
      .filter(element => element.tabIndex !== -1 && element.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const uiGamepadHeld = new Map();
  const uiGamepadEdge = (key, held) => {
    const edge = held && !uiGamepadHeld.get(key);
    uiGamepadHeld.set(key, held);
    return edge;
  };

  function pollUiGamepad() {
    const pad = connectedGamepad();
    input.observeGamepad(pad);
    const overlay = $$('.overlay.open').at(-1);
    const root = overlay || ($('#title-screen').classList.contains('active') ? $('#title-screen') : null);
    if (pad) {
      const up = pad.buttons[12]?.pressed || (pad.axes[1] || 0) < -.6;
      const down = pad.buttons[13]?.pressed || (pad.axes[1] || 0) > .6;
      const left = pad.buttons[14]?.pressed || (pad.axes[0] || 0) < -.6;
      const right = pad.buttons[15]?.pressed || (pad.axes[0] || 0) > .6;
      const upEdge = uiGamepadEdge('up', up);
      const downEdge = uiGamepadEdge('down', down);
      const leftEdge = uiGamepadEdge('left', left);
      const rightEdge = uiGamepadEdge('right', right);
      let moveBack = upEdge || leftEdge;
      let moveForward = downEdge || rightEdge;
      const confirm = uiGamepadEdge('confirm', pad.buttons[0]?.pressed === true);
      const cancel = uiGamepadEdge('cancel', pad.buttons[1]?.pressed === true);
      const pause = uiGamepadEdge('pause', pad.buttons[9]?.pressed === true);
      if (root) {
        const focused = document.activeElement;
        if ((leftEdge || rightEdge) && root.contains(focused)) {
          const direction = rightEdge ? 1 : -1;
          if (focused.matches('input[type="range"]')) {
            if (direction > 0) focused.stepUp();
            else focused.stepDown();
            focused.dispatchEvent(new Event('change', { bubbles: true }));
            moveBack = upEdge;
            moveForward = downEdge;
          } else if (focused.matches('select')) {
            focused.selectedIndex = clamp(focused.selectedIndex + direction, 0, focused.options.length - 1);
            focused.dispatchEvent(new Event('change', { bubbles: true }));
            moveBack = upEdge;
            moveForward = downEdge;
          } else if (focused.matches('[role="tab"]')) {
            const tabs = [...focused.parentElement.querySelectorAll('[role="tab"]')];
            const next = tabs[(tabs.indexOf(focused) + direction + tabs.length) % tabs.length];
            next.click();
            next.focus();
            moveBack = upEdge;
            moveForward = downEdge;
          }
        }
        const focusable = [...root.querySelectorAll('button:not([disabled]):not([hidden]),input:not([disabled]),select:not([disabled]),textarea,[tabindex]:not([tabindex="-1"])')]
          .filter(element => element.tabIndex !== -1 && element.getClientRects().length);
        if ((moveBack || moveForward) && focusable.length) {
          const current = focusable.indexOf(document.activeElement);
          const delta = moveBack ? -1 : 1;
          focusable[(current < 0 ? 0 : current + delta + focusable.length) % focusable.length].focus();
        }
        if (confirm && root.contains(document.activeElement)) document.activeElement.click?.();
        if (cancel || pause) {
          if ($('#confirm-overlay').classList.contains('open')) closeConfirmation();
          else if ($('#prologue-overlay').classList.contains('open')) $('#cancel-expedition').click();
          else if ($('#panel').classList.contains('open')) closePanel();
          else if ($('#pause-overlay').classList.contains('open')) game?.togglePause();
          else if ($('#ending-overlay').classList.contains('open')) showTitle();
        }
      }
    } else uiGamepadHeld.clear();
    requestAnimationFrame(pollUiGamepad);
  }

  $$('.main-menu button[data-menu]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.menu;
    if (action === 'new') showPrologue();
    else if (action === 'continue') {
      const save = storage.getSave();
      if (save) begin(save.chapterIndex, save);
    } else openPanel(action);
  }));

  $('#begin-expedition').onclick = () => {
    profile.difficulty = expeditionDifficulty;
    storage.saveProfile(profile);
    storage.clear();
    $('#prologue-overlay').classList.remove('open');
    begin(0);
  };
  $('#cancel-expedition').onclick = () => {
    $('#prologue-overlay').classList.remove('open');
    openPanel('campaign');
  };
  $('#expedition-comfort').onclick = () => {
    $('#prologue-overlay').classList.remove('open');
    optionsSection = 'access';
    openPanel('options', 'prologue');
  };
  $('#confirm-cancel').onclick = () => closeConfirmation();
  $('#confirm-accept').onclick = () => closeConfirmation(true);
  $('[data-close]').onclick = () => closePanel();
  $('#panel').addEventListener('click', event => {
    if (event.target === $('#panel')) closePanel();
  });
  $$('[data-pause-action]').forEach(button => button.onclick = () => {
    const action = button.dataset.pauseAction;
    if (action === 'resume') game.togglePause();
    if (action === 'journal') openPanel('journal', 'pause');
    if (['options', 'archives', 'save'].includes(action)) openPanel(action, 'pause');
    if (action === 'checkpoint') {
      requestConfirmation('Revenir au point de contrôle ?',
        'La progression depuis ce point de contrôle sera perdue. Votre collection reste conservée.',
        'Revenir au point de contrôle', () => {
          $('#pause-overlay').classList.remove('open');
          game.loadChapter(game.checkpoint.chapterIndex, game.checkpointState(), true);
          game.mode = 'playing';
          audio.suspend(false);
          input.reset();
          syncModalState();
          canvas.focus();
        });
    }
    if (action === 'title') showTitle();
  });
  $('#ending-return').onclick = showTitle;
  addEventListener('resize', () => {
    game?.resize(true);
    if (game?.level && game.mode === 'paused') game.render();
  });
  addEventListener('beforeunload', () => {
    if (game && ['playing', 'paused'].includes(game.mode)) game.save(true);
  });
  addEventListener('contextmenu', event => {
    if ($('#game-screen').classList.contains('active')) event.preventDefault();
  });
  addEventListener('keydown', event => {
    if (remappingAction) {
      if (event.code === 'Tab') { cancelRemapping(); return; }
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.repeat) return;
      if (event.code === 'Escape') { cancelRemapping(); return; }
      const error = event.ctrlKey || event.metaKey || event.altKey ? 'Utilisez une touche simple, sans Ctrl, Alt ni commande système.' : remapBinding(profile, remappingAction, event.code);
      if (error) { $('#binding-status').textContent = error; return; }
      const title = ACTIONS[remappingAction].title;
      storage.saveProfile(profile);
      cancelRemapping(`${title} : ${keyLabel(event.code)}. Enregistré.`);
      input.reset();
      input.setDevice('keyboard');
      refreshActionHints();
      return;
    }
    if (event.repeat && (event.key === 'Escape' || actionKeys(profile, 'pause').includes(event.code))) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    trapFocus(event);
    if (event.key === 'Escape' && $('#confirm-overlay').classList.contains('open')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeConfirmation();
    } else if (event.key === 'Escape' && $('#prologue-overlay').classList.contains('open')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      $('#cancel-expedition').click();
    } else if (event.key === 'Escape' && $('#panel').classList.contains('open')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closePanel();
    } else if ((event.key === 'Escape' || actionKeys(profile, 'pause').includes(event.code)) && game?.mode === 'paused' && $('#pause-overlay').classList.contains('open')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      game.togglePause();
    } else if (['ArrowUp', 'ArrowDown'].includes(event.key) && event.target?.matches?.('button')) {
      const root = $$('.overlay.open').at(-1) || ($('#title-screen').classList.contains('active') ? $('#title-screen') : null);
      if (root?.contains(event.target)) {
        const focusable = [...root.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea')]
          .filter(element => element.tabIndex !== -1 && element.getClientRects().length);
        const index = focusable.indexOf(event.target);
        const next = (index + (event.key === 'ArrowDown' ? 1 : -1) + focusable.length) % focusable.length;
        if (focusable[next]) { event.preventDefault(); focusable[next].focus(); }
      }
    }
  }, true);
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== canvas && game?.mode === 'playing' && input.lastDevice === 'mouse') game.togglePause();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game?.mode === 'playing') game.togglePause();
    audio.suspend(document.hidden || (game && game.mode !== 'playing'));
  });
  addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstall = event;
    $('#install-game').hidden = false;
  });
  $('#install-game').onclick = async () => {
    if (!deferredInstall) return;
    await deferredInstall.prompt();
    deferredInstall = null;
    $('#install-game').hidden = true;
  };

  applyOptions();
  $$('[data-build-revision]').forEach(node => { node.textContent = window.AZIZ_RELEASE?.revision || 'révision locale'; });
  updateContinueButton();
  requestAnimationFrame(pollUiGamepad);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    addEventListener('load', () => navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(registration => {
      const notifyUpdate = () => { if (registration.waiting && navigator.serviceWorker.controller) $('#update-ready').hidden = false; };
      notifyUpdate();
      registration.addEventListener('updatefound', () => {
        registration.installing?.addEventListener('statechange', notifyUpdate);
      });
    }).catch(() => {}));
  }
  const testMode = new URLSearchParams(location.search).get('test');
  if (testMode === 'game') begin(0);
  else {
    document.documentElement.dataset.testReady = 'true';
    $(`[data-menu="${storage.getSave() ? 'continue' : 'campaign'}"]`).focus();
  }
})();
