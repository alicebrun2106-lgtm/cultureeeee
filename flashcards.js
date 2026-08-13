// Flashcards — SM-2 SRS + Chapters + Streak + Combo + Celebrations
(function () {
  const SRS_KEY = "qpuc-srs";
  const TRACK_KEY = "qpuc-tracking";
  const NEW_CARDS_PER_SESSION = 15;
  const MASTERY_THRESHOLD_PCT = 100; // a pack is "maîtrisé" at 100%
  const REFRESH_DAYS = 30; // mastered pack older than 30d → "à rafraîchir"

  let currentChapter = null; // null = home view, "chapId" = chapter detail

  function getCardKey(packId, idx) { return packId + ":" + idx; }

  // --- TRACKING ---
  function getTracking() { try { return JSON.parse(localStorage.getItem(TRACK_KEY)) || {}; } catch { return {}; } }
  function saveTracking(d) { localStorage.setItem(TRACK_KEY, JSON.stringify(d)); }
  function trackAnswer(packId, cardIdx, quality) {
    const data = getTracking();
    if (!data[packId]) data[packId] = { attempts: 0, correct: 0, wrong: 0, cards: {}, lastPlayed: 0 };
    const pack = data[packId];
    const isCorrect = quality >= 3;
    pack.attempts++;
    if (isCorrect) pack.correct++; else pack.wrong++;
    pack.lastPlayed = Date.now();
    const ck = String(cardIdx);
    if (!pack.cards[ck]) pack.cards[ck] = { attempts: 0, correct: 0, wrong: 0 };
    pack.cards[ck].attempts++;
    if (isCorrect) pack.cards[ck].correct++; else pack.cards[ck].wrong++;
    saveTracking(data);
  }

  function getPackMastery(packId, totalCards) {
    const srsData = SRS.getData(SRS_KEY);
    let mastered = 0;
    for (let i = 0; i < totalCards; i++) {
      const st = srsData[getCardKey(packId, i)];
      if (st && st.reps >= 3) mastered++;
    }
    return totalCards > 0 ? Math.round((mastered / totalCards) * 100) : 0;
  }

  function getPackStats(packId) {
    const data = getTracking();
    const ps = data[packId];
    if (!ps) return { attempts: 0, correct: 0, wrong: 0, started: false, lastPlayed: 0 };
    return { attempts: ps.attempts, correct: ps.correct, wrong: ps.wrong, started: ps.attempts > 0, lastPlayed: ps.lastPlayed || 0 };
  }

  function getPackDue(packId, totalCards) {
    const srsData = SRS.getData(SRS_KEY);
    let due = 0, newCards = 0;
    for (let i = 0; i < totalCards; i++) {
      const st = srsData[getCardKey(packId, i)];
      if (!st) newCards++;
      else if (st.next <= Date.now()) due++;
    }
    return { due, newCards };
  }

  function isPackMastered(pack) { return getPackMastery(pack.id, pack.cards.length) >= MASTERY_THRESHOLD_PCT; }

  function isPackStaleAfterMastery(pack) {
    if (!isPackMastered(pack)) return false;
    const days = GAM.getPackDaysSinceReview(pack.id);
    return days !== null && days >= REFRESH_DAYS;
  }

  // --- BUILD COMPACT PACK CARD ---
  function buildPackCard(pack, opts = {}) {
    const total = pack.cards.length;
    const mastery = getPackMastery(pack.id, total);
    const stats = getPackStats(pack.id);
    const { due, newCards } = getPackDue(pack.id, total);
    const srsData = SRS.getData(SRS_KEY);
    let mastered = 0;
    for (let i = 0; i < total; i++) {
      const st = srsData[getCardKey(pack.id, i)];
      if (st && st.reps >= 3) mastered++;
    }

    const card = document.createElement("button");
    card.className = "pack-card";
    card.onclick = () => startFlashcardSession(pack.id);

    let barColor = "var(--accent)";
    if (mastery >= 100) barColor = "#2ecc71";
    else if (mastery >= 50) barColor = "#f0c040";
    else if (stats.started) barColor = "#3498db";

    let statusText = "";
    if (opts.showRefreshFlag && isPackStaleAfterMastery(pack)) {
      statusText = '<span class="pack-status-refresh">🔄 À rafraîchir</span>';
      card.classList.add("pack-needs-refresh");
    } else if (mastery >= 100) {
      statusText = '<span class="pack-status-done">⭐ Maîtrisé</span>';
    } else if (stats.started) {
      const todoCount = due + Math.min(newCards, NEW_CARDS_PER_SESSION);
      statusText = `<span class="pack-status-todo">${todoCount > 0 ? todoCount + " à revoir" : "À jour"}</span>`;
    } else {
      statusText = `<span class="pack-status-new">${total} cartes</span>`;
    }

    card.innerHTML = `
      <div class="pack-icon">${escapeHtml(pack.icon || "📚")}</div>
      <div class="pack-info">
        <div class="pack-name">${escapeHtml(pack.name)}</div>
        <div class="pack-progress-bar"><div class="pack-progress-fill" style="width:${mastery}%;background:${barColor}"></div></div>
        <div class="pack-bottom-row">
          ${statusText}
          <span class="pack-mastery-num">${mastered}/${total}</span>
        </div>
      </div>
    `;
    return card;
  }

  // --- TOP "AUJOURD'HUI" BAR ---
  function buildTodayBar() {
    const streak = GAM.getStreakStatus();
    const xp = GAM.getXP().total;
    const lvl = GAM.getLevel(xp);

    // Count total mastered packs across the whole library
    const allPacks = (typeof FLASHCARD_PACKS !== "undefined" ? FLASHCARD_PACKS : []);
    let masteredTotal = 0;
    allPacks.forEach((p) => { if (isPackMastered(p)) masteredTotal++; });

    const todayCount = streak.todayCount;
    const goalPct = Math.min(100, Math.round(todayCount / GAM.DAILY_GOAL * 100));
    const goalDone = todayCount >= GAM.DAILY_GOAL;

    const bar = document.createElement("div");
    bar.className = "today-bar";
    bar.innerHTML = `
      <div class="today-item today-streak ${streak.atRisk ? "today-at-risk" : ""}">
        <div class="today-icon">🔥</div>
        <div class="today-stack">
          <div class="today-value">${streak.current}</div>
          <div class="today-label">${streak.current > 1 ? "jours" : "jour"}</div>
        </div>
      </div>
      <div class="today-item today-goal">
        <div class="today-ring" style="--goal-pct:${goalPct}%">
          <div class="today-ring-inner">${todayCount}/${GAM.DAILY_GOAL}</div>
        </div>
        <div class="today-stack">
          <div class="today-label">Objectif jour</div>
          <div class="today-sub">${goalDone ? "✅ Atteint !" : (GAM.DAILY_GOAL - todayCount) + " à faire"}</div>
        </div>
      </div>
      <div class="today-item today-mastered">
        <div class="today-icon">⭐</div>
        <div class="today-stack">
          <div class="today-value">${masteredTotal}</div>
          <div class="today-label">maîtrisés</div>
        </div>
      </div>
      <div class="today-item today-level">
        <div class="today-icon">🎖️</div>
        <div class="today-stack">
          <div class="today-value">Nv ${lvl.level}</div>
          <div class="today-label">${xp} XP</div>
        </div>
      </div>
    `;
    return bar;
  }

  // --- "À FAIRE MAINTENANT" — smart suggestions ---
  function buildPriorityList() {
    const allPacks = (typeof FLASHCARD_PACKS !== "undefined" ? FLASHCARD_PACKS : []);
    const priority = [];

    // 1. Packs in progress with due cards (urgent SRS)
    const dueInProgress = allPacks.filter((p) => {
      const m = getPackMastery(p.id, p.cards.length);
      const stats = getPackStats(p.id);
      const { due } = getPackDue(p.id, p.cards.length);
      return stats.started && m < 100 && due > 0;
    });
    dueInProgress.sort((a, b) => getPackDue(b.id, b.cards.length).due - getPackDue(a.id, a.cards.length).due);
    dueInProgress.slice(0, 3).forEach((p) => priority.push({ pack: p, reason: "due" }));

    // 2. Mastered packs needing refresh (decay)
    const stale = allPacks.filter((p) => isPackStaleAfterMastery(p));
    stale.sort((a, b) => GAM.getPackDaysSinceReview(b.id) - GAM.getPackDaysSinceReview(a.id));
    stale.slice(0, 2).forEach((p) => priority.push({ pack: p, reason: "refresh" }));

    return priority;
  }

  // --- BUILD CHAPTER CARD ---
  function buildChapterCard(chapter) {
    const allPacks = (typeof FLASHCARD_PACKS !== "undefined" ? FLASHCARD_PACKS : []);
    const packs = allPacks.filter((p) => chapter.packIds.includes(p.id));
    const total = packs.length;
    let mastered = 0;
    let started = 0;
    packs.forEach((p) => {
      if (isPackMastered(p)) mastered++;
      else if (getPackStats(p.id).started) started++;
    });
    const pct = total > 0 ? Math.round(mastered / total * 100) : 0;

    const card = document.createElement("button");
    card.className = "chapter-card";
    card.onclick = () => { currentChapter = chapter.id; window.initFlashcards(); };

    card.innerHTML = `
      <div class="chapter-icon">${chapter.icon}</div>
      <div class="chapter-info">
        <div class="chapter-name">${chapter.name}</div>
        <div class="chapter-progress-bar"><div class="chapter-progress-fill" style="width:${pct}%"></div></div>
        <div class="chapter-bottom">
          <span class="chapter-mastered">${mastered}/${total} maîtrisés</span>
          ${started > 0 ? `<span class="chapter-in-progress">${started} en cours</span>` : ""}
        </div>
      </div>
      <div class="chapter-arrow">›</div>
    `;
    return card;
  }

  // --- MAIN INIT ---
  window.initFlashcards = function () {
    const container = document.getElementById("flashcard-packs");
    container.innerHTML = "";
    container.appendChild(buildTodayBar());

    if (currentChapter) {
      // Detail view of one chapter
      const chapter = CHAPTERS.find((c) => c.id === currentChapter);
      if (!chapter) { currentChapter = null; window.initFlashcards(); return; }

      // Header with back button
      const head = document.createElement("div");
      head.className = "chapter-detail-header";
      head.innerHTML = `
        <button class="btn-chapter-back">← Tous les thèmes</button>
        <div class="chapter-detail-title"><span class="chapter-detail-icon">${chapter.icon}</span> ${chapter.name}</div>
        <div class="chapter-detail-desc">${chapter.description}</div>
      `;
      head.querySelector(".btn-chapter-back").onclick = () => { currentChapter = null; window.initFlashcards(); };
      container.appendChild(head);

      const allPacks = (typeof FLASHCARD_PACKS !== "undefined" ? FLASHCARD_PACKS : []);
      const packs = allPacks.filter((p) => chapter.packIds.includes(p.id));

      const inProgress = [];
      const done = [];
      const notStarted = [];
      packs.forEach((p) => {
        const m = getPackMastery(p.id, p.cards.length);
        const s = getPackStats(p.id);
        if (m >= 100) done.push(p);
        else if (s.started) inProgress.push(p);
        else notStarted.push(p);
      });
      inProgress.sort((a, b) => getPackMastery(a.id, a.cards.length) - getPackMastery(b.id, b.cards.length));
      done.sort((a, b) => (getPackStats(b.id).lastPlayed || 0) - (getPackStats(a.id).lastPlayed || 0));
      notStarted.sort((a, b) => a.name.localeCompare(b.name, "fr"));

      addSection(container, "À continuer", "🔄", inProgress, false);
      addSection(container, "À découvrir", "✨", notStarted, false);
      addSection(container, "Maîtrisés", "⭐", done, false, { showRefreshFlag: true });

      showScreen("flashcards");
      return;
    }

    // HOME VIEW: priority + chapters
    const priority = buildPriorityList();
    if (priority.length > 0) {
      const section = document.createElement("div");
      section.className = "fc-section fc-section-priority";
      section.innerHTML = `<div class="fc-section-header"><span>🎯 À faire maintenant</span><span class="fc-section-count">${priority.length}</span></div>`;
      const list = document.createElement("div");
      list.className = "fc-section-list";
      priority.forEach(({ pack, reason }) => {
        const card = buildPackCard(pack, { showRefreshFlag: reason === "refresh" });
        list.appendChild(card);
      });
      section.appendChild(list);
      container.appendChild(section);
    }

    // Chapters
    const chapSection = document.createElement("div");
    chapSection.className = "fc-section";
    chapSection.innerHTML = `<div class="fc-section-header"><span>🗺️ Parcours par thème</span><span class="fc-section-count">${CHAPTERS.length}</span></div>`;
    const chapList = document.createElement("div");
    chapList.className = "chapter-list";
    CHAPTERS.forEach((ch) => chapList.appendChild(buildChapterCard(ch)));
    chapSection.appendChild(chapList);
    container.appendChild(chapSection);

    showScreen("flashcards");
  };

  function addSection(container, title, icon, packList, collapsed, opts = {}) {
    if (packList.length === 0) return;
    const section = document.createElement("div");
    section.className = "fc-section";
    const header = document.createElement("div");
    header.className = "fc-section-header";
    header.innerHTML = `<span>${icon} ${title}</span><span class="fc-section-count">${packList.length}</span>`;
    if (collapsed) {
      header.classList.add("fc-section-collapsible");
      header.onclick = () => { section.classList.toggle("fc-section-collapsed"); header.classList.toggle("fc-section-open"); };
      section.classList.add("fc-section-collapsed");
    }
    section.appendChild(header);
    const list = document.createElement("div");
    list.className = "fc-section-list";
    packList.forEach((p) => list.appendChild(buildPackCard(p, opts)));
    section.appendChild(list);
    container.appendChild(section);
  }

  // ---------- SESSION ----------
  let session = {};
  let masteryAtSessionStart = 0;

  window.startFlashcardSession = function (packId) { return startFlashcardSession(packId); };
  function startFlashcardSession(packId) {
    const pack = FLASHCARD_PACKS.find((p) => p.id === packId);
    if (!pack) return;
    masteryAtSessionStart = getPackMastery(packId, pack.cards.length);
    GAM.resetCombo();
    const srsData = SRS.getData(SRS_KEY);

    const allCards = pack.cards.map((card, i) => ({ front: card.front, back: card.back, memo: card.memo || null, srsKey: getCardKey(packId, i), cardIdx: i }));
    if (pack.reversible) {
      pack.cards.forEach((card, i) => {
        if (card.back.length < 60) {
          allCards.push({ front: card.back, back: card.front, memo: card.memo || null, srsKey: getCardKey(packId, i) + "_r", cardIdx: i });
        }
      });
    }

    const dueCards = [];
    const newCards = [];
    allCards.forEach((card, i) => {
      const st = srsData[card.srsKey];
      if (!st) newCards.push(i);
      else if (st.next <= Date.now()) dueCards.push(i);
    });
    shuffle(dueCards); shuffle(newCards);
    const queue = [...dueCards, ...newCards.slice(0, NEW_CARDS_PER_SESSION)];

    if (queue.length === 0) {
      // For mastered packs, allow a quick refresh session
      if (isPackMastered(pack)) {
        const allIndices = allCards.map((_, i) => i);
        shuffle(allIndices);
        const quickQueue = allIndices.slice(0, Math.min(5, allIndices.length));
        session = { packId, pack, allCards, queue: quickQueue, index: 0, flipped: false, results: { again: 0, hard: 0, good: 0, easy: 0 }, isRefresh: true };
        document.getElementById("fc-session-title").textContent = pack.name + " — Refresh";
        document.getElementById("fc-quality-buttons").style.display = "none";
        document.getElementById("fc-flip-btn").style.display = "";
        document.getElementById("fc-flip-btn").textContent = "Voir la réponse";
        document.getElementById("fc-flip-btn").onclick = flipFlashcard;
        showFlashcard();
        showScreen("flashcard-session");
        return;
      }
      document.getElementById("fc-session-title").textContent = pack.name;
      document.getElementById("fc-card-front").innerHTML = "✅ Toutes les cartes sont à jour !";
      document.getElementById("fc-card-back").textContent = "";
      document.getElementById("fc-quality-buttons").style.display = "none";
      document.getElementById("fc-flip-btn").textContent = "Revoir quand même";
      document.getElementById("fc-flip-btn").style.display = "";
      document.getElementById("fc-flip-btn").onclick = function () {
        const allIndices = allCards.map((_, i) => i);
        shuffle(allIndices);
        session = { packId, pack, allCards, queue: allIndices, index: 0, flipped: false, results: { again: 0, hard: 0, good: 0, easy: 0 } };
        document.getElementById("fc-flip-btn").textContent = "Voir la réponse";
        document.getElementById("fc-flip-btn").onclick = flipFlashcard;
        showFlashcard();
      };
      document.getElementById("fc-progress-text").textContent = `${allCards.length} cartes`;
      showScreen("flashcard-session");
      return;
    }

    session = { packId, pack, allCards, queue, index: 0, flipped: false, results: { again: 0, hard: 0, good: 0, easy: 0 } };
    document.getElementById("fc-session-title").textContent = pack.name;
    document.getElementById("fc-quality-buttons").style.display = "none";
    document.getElementById("fc-flip-btn").style.display = "";
    showFlashcard();
    showScreen("flashcard-session");
  }

  function showFlashcard() {
    const { allCards, queue, index } = session;
    const card = allCards[queue[index]];
    document.getElementById("fc-progress-text").textContent = `${index + 1} / ${queue.length}`;
    updateComboBadge();
    document.getElementById("fc-card-front").textContent = card.front;
    document.getElementById("fc-card-back").textContent = "";
    document.getElementById("fc-card").classList.remove("flipped");
    session.flipped = false;
    document.getElementById("fc-quality-buttons").style.display = "none";
    document.getElementById("fc-flip-btn").style.display = "";
    if (typeof MEMO !== "undefined") MEMO.hideTip("fc-memo-tip");
  }

  function updateComboBadge() {
    let badge = document.getElementById("fc-combo-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "fc-combo-badge";
      badge.className = "fc-combo-badge";
      const sessionScreen = document.getElementById("screen-flashcard-session");
      if (sessionScreen) sessionScreen.appendChild(badge);
    }
    const c = GAM.getCombo();
    if (c >= 3) {
      badge.textContent = `🔥 ${c}`;
      badge.classList.add("fc-combo-badge-show");
    } else {
      badge.classList.remove("fc-combo-badge-show");
    }
  }

  window.flipFlashcard = function () {
    if (session.flipped) return;
    if (window.CultureSound) window.CultureSound.play("flip");
    session.flipped = true;
    const card = session.allCards[session.queue[session.index]];
    document.getElementById("fc-card-back").textContent = card.back;
    document.getElementById("fc-card").classList.add("flipped");
    document.getElementById("fc-quality-buttons").style.display = "";
    document.getElementById("fc-flip-btn").style.display = "none";
    const memoEl = document.getElementById("fc-memo-tip");
    if (memoEl) {
      if (card.memo) { memoEl.textContent = "🧠 " + card.memo; memoEl.style.display = ""; }
      else if (typeof MEMO !== "undefined") { MEMO.showTip("fc-memo-tip", card.front, card.back); }
      else { memoEl.textContent = ""; memoEl.style.display = "none"; }
    }
  };

  window.rateFlashcard = function (quality) {
    if (window.CultureSound) window.CultureSound.rating(quality);
    const { allCards, queue, index, packId, pack } = session;
    const card = allCards[queue[index]];
    const state = SRS.getState(SRS_KEY, card.srsKey);
    const newState = SRS.update(state, quality);
    SRS.save(SRS_KEY, card.srsKey, newState);
    trackAnswer(packId, card.cardIdx, quality);

    // Streak + XP
    const streakBefore = GAM.getStreakStatus();
    const goalBefore = streakBefore.todayCount;
    const wasGoalDone = goalBefore >= GAM.DAILY_GOAL;
    GAM.recordCardActivity();
    const streakAfter = GAM.getStreakStatus();
    if (streakBefore.current === 0 && streakAfter.current === 1) {
      // First card of a new streak day
      GAM.showStreakToast(streakAfter.current);
    } else if (streakBefore.atRisk && !streakAfter.atRisk && streakAfter.current > streakBefore.current) {
      GAM.showStreakToast(streakAfter.current);
    }
    if (!wasGoalDone && streakAfter.todayCount >= GAM.DAILY_GOAL) {
      GAM.showDailyGoalToast();
    }

    // XP rewards
    let xpGain = 0;
    if (quality === 3) xpGain = 1;
    else if (quality === 4) xpGain = 2;
    else if (quality === 5) xpGain = 3;
    if (xpGain > 0) GAM.addXP(xpGain);

    // Combo
    if (quality >= 4) {
      const c = GAM.bumpCombo();
      if (c === 3 || c === 5 || c === 10 || c === 15 || c === 20) GAM.showComboToast(c);
    } else {
      GAM.resetCombo();
    }
    updateComboBadge();

    if (quality <= 1) { session.results.again++; session.queue.push(queue[index]); }
    else if (quality === 3) session.results.hard++;
    else if (quality === 4) session.results.good++;
    else session.results.easy++;

    // Mastery celebration on 100% reached
    const newMastery = getPackMastery(packId, pack.cards.length);
    if (masteryAtSessionStart < 100 && newMastery >= 100) {
      const isFirst = GAM.recordMastery(packId);
      if (isFirst) GAM.celebratePackMastered(pack.name);
      masteryAtSessionStart = 100;
    }

    session.index++;
    if (session.index >= session.queue.length) showFlashcardResult();
    else showFlashcard();
  };

  function showFlashcardResult() {
    const { pack, packId, results, isRefresh } = session;
    const total = results.again + results.hard + results.good + results.easy;
    const mastery = getPackMastery(packId, pack.cards.length);

    if (isRefresh) GAM.recordPackReview(packId);

    document.getElementById("fc-result-title").textContent = pack.name;
    document.getElementById("fc-result-total").textContent = total;
    document.getElementById("fc-result-again").textContent = results.again;
    document.getElementById("fc-result-hard").textContent = results.hard;
    document.getElementById("fc-result-good").textContent = results.good;
    document.getElementById("fc-result-easy").textContent = results.easy;

    let masteryEl = document.getElementById("fc-result-mastery");
    if (!masteryEl) {
      masteryEl = document.createElement("div");
      masteryEl.id = "fc-result-mastery";
      masteryEl.className = "fc-result-mastery";
      const resultContainer = document.querySelector("#screen-flashcard-result .fc-result-stats");
      if (resultContainer) resultContainer.parentNode.insertBefore(masteryEl, resultContainer.nextSibling);
    }
    masteryEl.innerHTML = `
      <div class="fc-result-mastery-bar">
        <span class="fc-result-mastery-label">Maîtrise</span>
        <div class="pack-progress-bar" style="flex:1"><div class="pack-progress-fill" style="width:${mastery}%"></div></div>
        <span class="fc-result-mastery-pct">${mastery}%</span>
      </div>
    `;
    showScreen("flashcard-result");
  }

  window.backToFlashcards = function () {
    if (typeof goToTab === "function") goToTab("explorer");
    else window.initFlashcards();
  };

  document.addEventListener("keydown", function (e) {
    const fcScreen = document.getElementById("screen-flashcard-session");
    if (!fcScreen || !fcScreen.classList.contains("active")) return;
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!session.flipped) flipFlashcard(); }
    else if (session.flipped) {
      if (e.key === "1") rateFlashcard(1);
      else if (e.key === "2") rateFlashcard(3);
      else if (e.key === "3") rateFlashcard(4);
      else if (e.key === "4") rateFlashcard(5);
    }
  });

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[char]));
  }
})();
