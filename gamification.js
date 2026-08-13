// Gamification — Streak, Daily Goal, Combo, Celebrations, XP
// Inspired by Duolingo's progression mechanics

(function () {
  const STREAK_KEY = "qpuc-streak";
  const XP_KEY = "qpuc-xp";
  const MASTERY_HISTORY_KEY = "qpuc-mastery-history";
  const DAILY_GOAL = 10; // cards/day

  // ---------- DATE HELPERS ----------
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function dayDiff(d1, d2) {
    // d1, d2 = "YYYY-MM-DD"
    const a = new Date(d1 + "T00:00:00").getTime();
    const b = new Date(d2 + "T00:00:00").getTime();
    return Math.round((b - a) / 86400000);
  }

  // ---------- STREAK ----------
  function getStreak() {
    try { return JSON.parse(localStorage.getItem(STREAK_KEY)) || { current: 0, best: 0, lastDate: null, todayCount: 0 }; }
    catch { return { current: 0, best: 0, lastDate: null, todayCount: 0 }; }
  }
  function saveStreak(s) { localStorage.setItem(STREAK_KEY, JSON.stringify(s)); }

  // Called when user completes a card. Returns { isNewDay, isStreakBroken, isStreakExtended }
  function recordCardActivity() {
    const s = getStreak();
    const today = todayStr();

    if (s.lastDate === today) {
      // Same day — just bump count
      s.todayCount = (s.todayCount || 0) + 1;
      saveStreak(s);
      return { isNewDay: false, justExtended: false, justBroken: false };
    }

    // Different day
    let justExtended = false;
    let justBroken = false;
    if (!s.lastDate) {
      // First ever activity
      s.current = 1;
      justExtended = true;
    } else {
      const diff = dayDiff(s.lastDate, today);
      if (diff === 1) {
        s.current += 1;
        justExtended = true;
      } else if (diff > 1) {
        s.current = 1;
        justBroken = true;
      }
    }
    if (s.current > s.best) s.best = s.current;
    s.lastDate = today;
    s.todayCount = 1;
    saveStreak(s);
    return { isNewDay: true, justExtended, justBroken };
  }

  // Returns current streak status WITHOUT incrementing (for display)
  function getStreakStatus() {
    const s = getStreak();
    const today = todayStr();
    if (!s.lastDate) return { current: 0, best: 0, todayCount: 0, atRisk: false, lostToday: false };
    const diff = dayDiff(s.lastDate, today);
    if (diff === 0) return { current: s.current, best: s.best, todayCount: s.todayCount || 0, atRisk: false, lostToday: false };
    if (diff === 1) return { current: s.current, best: s.best, todayCount: 0, atRisk: true, lostToday: false };
    // Streak is broken (didn't act yesterday)
    return { current: 0, best: s.best, todayCount: 0, atRisk: false, lostToday: s.current > 0 };
  }

  // ---------- XP / NIVEAU ----------
  function getXP() {
    try { return JSON.parse(localStorage.getItem(XP_KEY)) || { total: 0 }; }
    catch { return { total: 0 }; }
  }
  function saveXP(x) { localStorage.setItem(XP_KEY, JSON.stringify(x)); }
  function addXP(amount) {
    const x = getXP();
    x.total = (x.total || 0) + amount;
    saveXP(x);
    return x.total;
  }
  function getLevel(xp) {
    // Smooth curve: level 1 = 0-99 XP, level 2 = 100-249, level 3 = 250-449, etc.
    // Threshold for level n = n*(n-1)/2 * 100  → level 1: 0, 2: 100, 3: 300, 4: 600, 5: 1000...
    let level = 1;
    while ((level * (level - 1) / 2) * 100 <= xp) level++;
    level--;
    const xpForCurrent = (level * (level - 1) / 2) * 100;
    const xpForNext = (level * (level + 1) / 2) * 100;
    return { level, xpForCurrent, xpForNext, progress: (xp - xpForCurrent) / (xpForNext - xpForCurrent) };
  }

  // ---------- MASTERY HISTORY (for celebrations + decay) ----------
  function getMasteryHistory() {
    try { return JSON.parse(localStorage.getItem(MASTERY_HISTORY_KEY)) || {}; }
    catch { return {}; }
  }
  function saveMasteryHistory(h) { localStorage.setItem(MASTERY_HISTORY_KEY, JSON.stringify(h)); }

  // Mark pack as freshly mastered. Returns true if first time.
  function recordMastery(packId) {
    const h = getMasteryHistory();
    if (!h[packId]) {
      h[packId] = { firstMasteredAt: Date.now(), lastReviewedAt: Date.now(), totalRefreshCount: 0 };
      saveMasteryHistory(h);
      return true;
    }
    h[packId].lastReviewedAt = Date.now();
    saveMasteryHistory(h);
    return false;
  }

  function recordPackReview(packId) {
    const h = getMasteryHistory();
    if (h[packId]) {
      h[packId].lastReviewedAt = Date.now();
      h[packId].totalRefreshCount = (h[packId].totalRefreshCount || 0) + 1;
      saveMasteryHistory(h);
    }
  }

  // Days since last review for a mastered pack
  function getPackDaysSinceReview(packId) {
    const h = getMasteryHistory();
    if (!h[packId]) return null;
    const ms = Date.now() - h[packId].lastReviewedAt;
    return Math.floor(ms / 86400000);
  }

  // ---------- COMBO (session-state, not persisted) ----------
  let combo = 0;
  function bumpCombo() { combo++; return combo; }
  function resetCombo() { const c = combo; combo = 0; return c; }
  function getCombo() { return combo; }

  // ---------- TOAST / CELEBRATIONS ----------
  function showToast(text, opts = {}) {
    const el = document.createElement("div");
    el.className = "gam-toast " + (opts.className || "");
    el.textContent = text;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("gam-toast-show"));
    setTimeout(() => {
      el.classList.remove("gam-toast-show");
      setTimeout(() => el.remove(), 400);
    }, opts.duration || 1800);
  }

  function fireConfetti() {
    const colors = ["#f0c040", "#2ecc71", "#3498db", "#e74c3c", "#9b59b6", "#1abc9c"];
    const container = document.createElement("div");
    container.className = "gam-confetti-container";
    document.body.appendChild(container);
    for (let i = 0; i < 50; i++) {
      const piece = document.createElement("div");
      piece.className = "gam-confetti";
      piece.style.left = Math.random() * 100 + "%";
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = (Math.random() * 0.3) + "s";
      piece.style.animationDuration = (1.5 + Math.random() * 1.5) + "s";
      container.appendChild(piece);
    }
    setTimeout(() => container.remove(), 3500);
  }

  function celebratePackMastered(packName) {
    fireConfetti();
    showToast("🎉 Pack maîtrisé ! · " + String(packName || ""), { className: "gam-toast-celebrate", duration: 3000 });
  }

  function showComboToast(combo) {
    showToast(`🔥 ${combo} d'affilée !`, { className: "gam-toast-combo", duration: 1100 });
  }

  function showStreakToast(streak) {
    showToast(`🔥 Série de ${streak} jour${streak > 1 ? "s" : ""} !`, { className: "gam-toast-streak", duration: 2200 });
  }

  function showDailyGoalToast() {
    fireConfetti();
    showToast("🎯 Objectif du jour atteint !", { className: "gam-toast-celebrate", duration: 2500 });
  }

  // ---------- PUBLIC API ----------
  window.GAM = {
    DAILY_GOAL,
    todayStr,
    getStreakStatus,
    recordCardActivity,
    getXP, addXP, getLevel,
    getMasteryHistory, recordMastery, recordPackReview, getPackDaysSinceReview,
    bumpCombo, resetCombo, getCombo,
    showToast, fireConfetti,
    celebratePackMastered, showComboToast, showStreakToast, showDailyGoalToast,
  };
})();
