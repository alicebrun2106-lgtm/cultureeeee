// srs2.js — Anki-like spaced repetition (vraie logique)
// 4 états : new / learning / review / relearning
// Migration automatique depuis l'ancien format qpuc-srs.

(function () {
  const SRS_KEY = "qpuc-srs-v2";
  const OLD_SRS_KEY = "qpuc-srs";

  const SRS_CONFIG = {
    // Learning steps (minutes) : ex. [1, 10] = 1 min, puis 10 min
    learningStepsMinutes: [1, 10],
    relearningStepsMinutes: [10],

    // Intervalles initiaux (jours)
    graduatingIntervalDays: 1, // good sur last learning step
    easyIntervalDays: 4,        // easy = skip directement

    // Ease factor
    startingEaseFactor: 2.5,
    minEaseFactor: 1.3,

    // Modificateurs review
    hardIntervalMultiplier: 1.2,
    goodIntervalMultiplier: 1.0,
    easyBonus: 1.3,

    // Penalties / bonus ease
    againEasePenalty: 0.2,
    hardEasePenalty: 0.15,
    easyEaseBonus: 0.15,

    maximumIntervalDays: 36500, // ~100 ans, en pratique infini
  };

  // ─── HELPERS ───
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function nowIso() { return new Date().toISOString(); }
  function addMinutes(date, mins) { return new Date(date.getTime() + mins * 60000); }
  function addDays(date, days) { return new Date(date.getTime() + days * 86400000); }
  function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function endOfToday() { const d = new Date(); d.setHours(23, 59, 59, 999); return d; }

  function defaultProgress() {
    return {
      state: "new",
      seenCount: 0,
      reviewCount: 0,
      lapseCount: 0,
      dueAt: null,
      lastReviewedAt: null,
      intervalDays: 0,
      easeFactor: SRS_CONFIG.startingEaseFactor,
      learningStepIndex: 0,
      lastGrade: null,
      correctStreak: 0,
      reviewHistory: [],
    };
  }

  // ─── STORAGE ───
  let dataCache = null;
  function readData() {
    if (dataCache !== null) return dataCache;
    try { dataCache = JSON.parse(localStorage.getItem(SRS_KEY)) || {}; }
    catch { dataCache = {}; }
    return dataCache;
  }
  function writeData(data) {
    dataCache = data;
    try { localStorage.setItem(SRS_KEY, JSON.stringify(data)); } catch {}
  }
  function invalidateCache() { dataCache = null; }

  // ─── MIGRATION ───
  let migrationDone = false;
  function migrate() {
    if (migrationDone) return;
    migrationDone = true;
    // Si v2 existe déjà, ne pas migrer (premier chargement seulement)
    if (localStorage.getItem(SRS_KEY) !== null) return;

    const old = (function () {
      try { return JSON.parse(localStorage.getItem(OLD_SRS_KEY)) || {}; }
      catch { return {}; }
    })();
    const migrated = {};
    const now = new Date();
    let migratedCount = 0;
    for (const key in old) {
      const s = old[key];
      if (!s) continue;
      const reps = s.reps || 0;
      const interval = s.interval || 0;
      const ef = (typeof s.ef === "number" && s.ef > 0) ? s.ef : SRS_CONFIG.startingEaseFactor;
      const next = s.next || 0;
      // Déterminer le state
      let state;
      let intervalDays = interval;
      if (reps === 0 && interval === 0) {
        // Carte ratée puis "reset" dans l'ancien système → relearning
        state = "relearning";
      } else if (reps < 2) {
        state = "learning";
      } else {
        state = "review";
      }
      migrated[key] = {
        state,
        seenCount: Math.max(1, reps),
        reviewCount: Math.max(1, reps),
        lapseCount: 0,
        dueAt: next > 0 ? new Date(next).toISOString() : nowIso(),
        lastReviewedAt: null,
        intervalDays,
        easeFactor: ef,
        learningStepIndex: 0,
        lastGrade: null,
        correctStreak: reps,
        reviewHistory: [],
      };
      migratedCount++;
    }
    writeData(migrated);
    if (migratedCount > 0) {
      console.log("[SRS2] Migrated " + migratedCount + " cards from old SRS format.");
    }
  }

  // ─── ACCESS API ───
  function getCardProgress(cardId) {
    migrate();
    const data = readData();
    return data[cardId] || null;
  }
  function getCardProgressOrInit(cardId) {
    return getCardProgress(cardId) || defaultProgress();
  }
  function saveCardProgress(cardId, progress) {
    migrate();
    const data = readData();
    data[cardId] = progress;
    writeData(data);
  }
  function deleteCardProgress(cardId) {
    migrate();
    const data = readData();
    delete data[cardId];
    writeData(data);
  }
  function getAllProgress() { migrate(); return readData(); }

  // ─── CORE : scheduleCard ───
  // Reçoit progress (objet ou null) + grade ("again"/"hard"/"good"/"easy").
  // Retourne le NOUVEAU progress (immutable-friendly : on retourne un objet modifié).
  function scheduleCard(progress, grade) {
    progress = progress ? JSON.parse(JSON.stringify(progress)) : defaultProgress();
    const cfg = SRS_CONFIG;
    const now = new Date();
    const prevIntervalDays = progress.intervalDays;
    const prevState = progress.state;

    progress.seenCount += 1;
    progress.reviewCount += 1;
    progress.lastReviewedAt = nowIso();
    progress.lastGrade = grade;

    if (progress.state === "new") {
      switch (grade) {
        case "again":
          progress.state = "learning";
          progress.learningStepIndex = 0;
          progress.dueAt = addMinutes(now, cfg.learningStepsMinutes[0]).toISOString();
          progress.correctStreak = 0;
          break;
        case "hard":
          progress.state = "learning";
          progress.learningStepIndex = 0;
          progress.dueAt = addMinutes(now, cfg.learningStepsMinutes[0]).toISOString();
          progress.easeFactor = Math.max(cfg.minEaseFactor, progress.easeFactor - cfg.hardEasePenalty);
          progress.correctStreak = 0;
          break;
        case "good":
          progress.state = "learning";
          progress.learningStepIndex = Math.min(1, cfg.learningStepsMinutes.length - 1);
          progress.dueAt = addMinutes(now, cfg.learningStepsMinutes[progress.learningStepIndex]).toISOString();
          progress.correctStreak += 1;
          break;
        case "easy":
          progress.state = "review";
          progress.intervalDays = cfg.easyIntervalDays;
          progress.dueAt = addDays(now, cfg.easyIntervalDays).toISOString();
          progress.correctStreak += 1;
          break;
      }
    } else if (progress.state === "learning") {
      switch (grade) {
        case "again":
          progress.learningStepIndex = 0;
          progress.dueAt = addMinutes(now, cfg.learningStepsMinutes[0]).toISOString();
          progress.correctStreak = 0;
          break;
        case "hard":
          progress.dueAt = addMinutes(now, cfg.learningStepsMinutes[progress.learningStepIndex]).toISOString();
          progress.easeFactor = Math.max(cfg.minEaseFactor, progress.easeFactor - cfg.hardEasePenalty);
          break;
        case "good":
          if (progress.learningStepIndex < cfg.learningStepsMinutes.length - 1) {
            progress.learningStepIndex += 1;
            progress.dueAt = addMinutes(now, cfg.learningStepsMinutes[progress.learningStepIndex]).toISOString();
          } else {
            // Graduate
            progress.state = "review";
            progress.intervalDays = cfg.graduatingIntervalDays;
            progress.dueAt = addDays(now, cfg.graduatingIntervalDays).toISOString();
          }
          progress.correctStreak += 1;
          break;
        case "easy":
          progress.state = "review";
          progress.intervalDays = cfg.easyIntervalDays;
          progress.dueAt = addDays(now, cfg.easyIntervalDays).toISOString();
          progress.easeFactor += cfg.easyEaseBonus;
          progress.correctStreak += 1;
          break;
      }
    } else if (progress.state === "review") {
      switch (grade) {
        case "again":
          progress.state = "relearning";
          progress.lapseCount += 1;
          progress.learningStepIndex = 0;
          progress.intervalDays = 0;
          progress.dueAt = addMinutes(now, cfg.relearningStepsMinutes[0]).toISOString();
          progress.easeFactor = Math.max(cfg.minEaseFactor, progress.easeFactor - cfg.againEasePenalty);
          progress.correctStreak = 0;
          break;
        case "hard":
          progress.intervalDays = clamp(Math.max(1, Math.round(progress.intervalDays * cfg.hardIntervalMultiplier)), 1, cfg.maximumIntervalDays);
          progress.dueAt = addDays(now, progress.intervalDays).toISOString();
          progress.easeFactor = Math.max(cfg.minEaseFactor, progress.easeFactor - cfg.hardEasePenalty);
          break;
        case "good":
          progress.intervalDays = clamp(Math.round(Math.max(1, progress.intervalDays) * progress.easeFactor * cfg.goodIntervalMultiplier), 1, cfg.maximumIntervalDays);
          progress.dueAt = addDays(now, progress.intervalDays).toISOString();
          progress.correctStreak += 1;
          break;
        case "easy":
          progress.intervalDays = clamp(Math.round(Math.max(1, progress.intervalDays) * progress.easeFactor * cfg.easyBonus), 1, cfg.maximumIntervalDays);
          progress.dueAt = addDays(now, progress.intervalDays).toISOString();
          progress.easeFactor += cfg.easyEaseBonus;
          progress.correctStreak += 1;
          break;
      }
    } else if (progress.state === "relearning") {
      switch (grade) {
        case "again":
          progress.learningStepIndex = 0;
          progress.dueAt = addMinutes(now, cfg.relearningStepsMinutes[0]).toISOString();
          progress.correctStreak = 0;
          break;
        case "hard":
          progress.dueAt = addMinutes(now, cfg.relearningStepsMinutes[0]).toISOString();
          progress.easeFactor = Math.max(cfg.minEaseFactor, progress.easeFactor - cfg.hardEasePenalty);
          break;
        case "good":
          progress.state = "review";
          progress.intervalDays = Math.max(1, Math.round((prevIntervalDays || cfg.graduatingIntervalDays) * 0.5));
          progress.dueAt = addDays(now, progress.intervalDays).toISOString();
          break;
        case "easy":
          progress.state = "review";
          progress.intervalDays = Math.max(1, Math.round(prevIntervalDays || cfg.easyIntervalDays));
          progress.dueAt = addDays(now, progress.intervalDays).toISOString();
          progress.easeFactor += cfg.easyEaseBonus;
          break;
      }
    }

    // Historique : on garde max 50 entrées
    if (!Array.isArray(progress.reviewHistory)) progress.reviewHistory = [];
    progress.reviewHistory.push({
      reviewedAt: nowIso(),
      grade,
      previousState: prevState,
      nextState: progress.state,
      previousIntervalDays: prevIntervalDays,
      nextIntervalDays: progress.intervalDays,
    });
    if (progress.reviewHistory.length > 50) progress.reviewHistory.shift();

    return progress;
  }

  // ─── QUERIES ───
  function isDueNow(progress) {
    if (!progress || !progress.dueAt) return false;
    return new Date(progress.dueAt).getTime() <= Date.now();
  }
  function isDueToday(progress) {
    if (!progress || !progress.dueAt) return false;
    return new Date(progress.dueAt).getTime() <= endOfToday().getTime();
  }
  function wasReviewedToday(progress) {
    if (!progress || !progress.lastReviewedAt) return false;
    return new Date(progress.lastReviewedAt).getTime() >= startOfToday().getTime();
  }

  // Mastery score 0-100 par carte
  function getCardMastery(p) {
    if (!p || p.state === "new") return 0;
    let score = 0;
    if (p.state === "learning") score = 25;
    else if (p.state === "relearning") score = 20;
    else if (p.state === "review") {
      // mature = intervalDays >= 21 → 80-100, jeune → 50-79
      if (p.intervalDays >= 21) {
        score = Math.min(100, 80 + p.intervalDays * 0.2);
      } else {
        score = Math.min(80, 50 + p.intervalDays * 1.5);
      }
    }
    score += Math.min(15, p.correctStreak * 3);
    score -= p.lapseCount * 8;
    if (p.easeFactor < 2) score -= 10;
    if (p.easeFactor > 2.7) score += 5;
    return clamp(Math.round(score), 0, 100);
  }

  // ─── PUBLIC API ───
  window.SRS2 = {
    CONFIG: SRS_CONFIG,
    defaultProgress,
    getCardProgress,
    getCardProgressOrInit,
    saveCardProgress,
    deleteCardProgress,
    getAllProgress,
    scheduleCard,
    isDueNow,
    isDueToday,
    wasReviewedToday,
    getCardMastery,
    invalidateCache,
    _migrate: migrate,
  };

  // Trigger migration on load
  migrate();
})();
