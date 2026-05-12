// culture-app.js — Orchestre la nouvelle app CULTURE!!!
// - Navigation entre pages (Trouver / Mes paquets / Cartes / Session / Result)
// - Rendu des decks à partir de FLASHCARD_PACKS
// - Session flashcard (utilise SRS existant + gamification)

(function () {
  const SRS_KEY = "qpuc-srs";

  // ─── COULEURS DECK ───
  // Palette du design : y, l, m, v, p, w, g, k
  const DECK_COLORS = ["y", "l", "m", "v", "p", "w", "g", "k"];
  function deckColor(packId) {
    let h = 0;
    for (let i = 0; i < packId.length; i++) h = (h * 31 + packId.charCodeAt(i)) | 0;
    return DECK_COLORS[Math.abs(h) % DECK_COLORS.length];
  }

  // ─── HELPERS DATA ───
  function getCardKey(pid, idx) { return pid + ":" + idx; }
  function getMastery(packId, total) {
    const data = SRS.getData(SRS_KEY) || {};
    let m = 0;
    for (let i = 0; i < total; i++) {
      const st = data[getCardKey(packId, i)];
      if (st && st.reps >= 3) m++;
    }
    return total > 0 ? Math.round(m / total * 100) : 0;
  }
  function getStarted(packId) {
    const data = SRS.getData(SRS_KEY) || {};
    for (const k in data) if (k.startsWith(packId + ":")) return true;
    return false;
  }
  function getPackLastPlayed(packId) {
    try {
      const tracking = JSON.parse(localStorage.getItem("qpuc-tracking")) || {};
      return tracking[packId] && tracking[packId].lastPlayed ? tracking[packId].lastPlayed : 0;
    } catch { return 0; }
  }
  function isToday(ts) {
    if (!ts) return false;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return ts >= start.getTime();
  }
  function isPackDoneToday(pack) {
    const total = pack.cards.length;
    const srs = SRS.getData(SRS_KEY) || {};
    let due = 0;
    for (let i = 0; i < total; i++) {
      const st = srs[getCardKey(pack.id, i)];
      if (st && (st.next || 0) <= Date.now()) due++;
    }
    if (due > 0) return false;
    return isToday(getPackLastPlayed(pack.id));
  }
  function getPackChapter(packId) {
    if (typeof PACK_TO_CHAPTER !== "undefined" && PACK_TO_CHAPTER[packId]) {
      const id = PACK_TO_CHAPTER[packId];
      const ch = CHAPTERS && CHAPTERS.find ? CHAPTERS.find((c) => c.id === id) : null;
      return ch ? ch.name : id;
    }
    return "Divers";
  }

  // ─── NAVIGATION ───
  window.goToTab = function (tab) {
    // tabs: trouver / mes-paquets / cartes / session / result
    document.querySelectorAll(".page-section").forEach((s) => s.classList.remove("active"));
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    const map = {
      "trouver": "page-trouver",
      "mes-paquets": "page-mes-paquets",
      "cartes": "page-cartes",
      "session": "page-session",
      "result": "page-result",
    };
    const el = document.getElementById(map[tab] || "page-trouver");
    if (el) el.classList.add("active");
    // Highlight nav
    document.querySelectorAll(".nav-links a").forEach((a) => {
      a.classList.toggle("active", a.dataset.tab === tab);
    });
    // Refresh content per tab
    if (tab === "trouver") renderTrouver();
    else if (tab === "mes-paquets") renderMesPaquets();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // legacy compat
  window.goHome = function () { goToTab("trouver"); };
  window.backToFlashcards = function () { goToTab("mes-paquets"); };

  // Override showScreen so legacy modules (carte.js, schemas.js) work
  const _origShowScreen = window.showScreen;
  window.showScreen = function (id) {
    // Hide every section + screen first
    document.querySelectorAll(".page-section").forEach((s) => s.classList.remove("active"));
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    const el = document.getElementById("screen-" + id);
    if (el) el.classList.add("active");
  };

  // ─── BUILD DECK CARD ───
  function buildDeck(pack) {
    const total = pack.cards.length;
    const mastery = getMastery(pack.id, total);
    const started = getStarted(pack.id);
    const doneToday = isPackDoneToday(pack);
    const cat = getPackChapter(pack.id).toUpperCase();
    const color = deckColor(pack.id);
    // Mastery in 10 segments
    const segs = Math.round(mastery / 10);
    let metaHtml = "";
    for (let i = 0; i < 10; i++) metaHtml += `<span class="seg${i < segs ? " on" : ""}"></span>`;
    // Foot text
    let footRight;
    if (mastery >= 100) footRight = "✓ MAÎTRISÉ";
    else if (!started) footRight = "NOUVEAU";
    else footRight = mastery + "%";

    const niv = Math.min(5, 1 + Math.floor(mastery / 25));

    // Make pack name in compact 2-line
    const name = pack.name.toUpperCase();
    const titleHtml = name.length > 18 ? name.split(/[ —–-]/).join("<br>") : name;

    const div = document.createElement("button");
    div.className = "deck " + color + (doneToday ? " deck-done-today" : "");
    div.onclick = () => startFlashcardSession(pack.id);
    div.innerHTML = `
      <div class="deck-img">
        <span class="fig">[${pack.id.substring(0, 6)}]</span>
        <span class="dot-circ"></span>
        <div class="deck-emoji">${pack.icon || "📚"}</div>
      </div>
      <div class="deck-body">
        <div class="deck-cat">${cat}</div>
        <div class="deck-title">${titleHtml}</div>
        <div class="deck-meta">${metaHtml}</div>
        <div class="deck-foot"><span>NIV.${niv}</span><span>${footRight}</span></div>
      </div>
    `;
    return div;
  }

  // ─── TROUVER PAGE ───
  let currentFilter = "all";
  let visibleCount = 24;

  function renderTrouver() {
    const grid = document.getElementById("deck-grid-all");
    if (!grid) return;
    grid.innerHTML = "";

    // Filter pills
    renderFilterBar();

    let packs = FLASHCARD_PACKS.slice();
    if (currentFilter !== "all" && typeof CHAPTERS !== "undefined") {
      const ch = CHAPTERS.find((c) => c.id === currentFilter);
      if (ch) packs = packs.filter((p) => ch.packIds.includes(p.id));
    }

    // Order : in-progress first, then mastered, then new
    packs.sort((a, b) => {
      const ma = getMastery(a.id, a.cards.length);
      const mb = getMastery(b.id, b.cards.length);
      const sa = getStarted(a.id), sb = getStarted(b.id);
      // priority: started+notMastered > new > mastered
      const score = (st, m) => (st && m < 100) ? 0 : (!st ? 1 : 2);
      const s = score(sa, ma) - score(sb, mb);
      if (s !== 0) return s;
      return a.name.localeCompare(b.name, "fr");
    });

    const total = packs.length;
    document.getElementById("banner-count-trouver").textContent = total + " PAQUETS";
    document.getElementById("nav-stats").textContent = FLASHCARD_PACKS.length + " PAQUETS";

    const slice = packs.slice(0, visibleCount);
    slice.forEach((p) => grid.appendChild(buildDeck(p)));

    const btnMore = document.getElementById("btn-show-more");
    if (slice.length < total) {
      btnMore.style.display = "";
      btnMore.textContent = `VOIR PLUS (${total - slice.length} RESTANTS)`;
      btnMore.onclick = () => { visibleCount += 24; renderTrouver(); };
    } else {
      btnMore.style.display = "none";
    }
  }

  function renderFilterBar() {
    const bar = document.getElementById("filter-bar");
    if (!bar) return;
    bar.innerHTML = "";
    const pills = [{ id: "all", label: "TOUS" }];
    if (typeof CHAPTERS !== "undefined") {
      CHAPTERS.forEach((c) => pills.push({ id: c.id, label: c.icon + " " + c.name.toUpperCase() }));
    }
    pills.forEach((p) => {
      const b = document.createElement("button");
      b.className = "filter-pill" + (currentFilter === p.id ? " on" : "");
      b.textContent = p.label;
      b.onclick = () => { currentFilter = p.id; visibleCount = 24; renderTrouver(); };
      bar.appendChild(b);
    });
  }

  // ─── MES PAQUETS PAGE ───
  function renderMesPaquets() {
    const container = document.getElementById("mes-paquets-container");
    if (!container) return;
    container.innerHTML = "";

    const mine = FLASHCARD_PACKS.filter((p) => getStarted(p.id));
    document.getElementById("banner-count-mine").textContent =
      mine.length + " PAQUET" + (mine.length > 1 ? "S" : "") + " EN COURS";

    if (mine.length === 0) {
      container.innerHTML = `
        <div class="frame" style="padding: 40px; text-align: center;">
          <div style="font-size: 56px; margin-bottom: 16px;">📭</div>
          <h3 class="pixel" style="font-size:16px; margin-bottom:14px;">PAS ENCORE DE PAQUET</h3>
          <p class="mono" style="font-size:14px; margin-bottom:20px; font-style:italic;">Lance ton premier paquet depuis l'onglet TROUVER.</p>
          <a href="#" class="btn btn-y" onclick="goToTab('trouver'); return false;">EXPLORER LES PAQUETS</a>
        </div>
      `;
      return;
    }

    // Group by chapter
    const byChapter = {};
    mine.forEach((p) => {
      const chId = (typeof PACK_TO_CHAPTER !== "undefined" && PACK_TO_CHAPTER[p.id]) || "autres";
      if (!byChapter[chId]) byChapter[chId] = [];
      byChapter[chId].push(p);
    });

    let idx = 0;
    if (typeof CHAPTERS !== "undefined") {
      CHAPTERS.forEach((ch) => {
        if (!byChapter[ch.id] || byChapter[ch.id].length === 0) return;
        idx++;
        const row = document.createElement("div");
        row.className = "theme-row";
        const num = String(idx).padStart(2, "0");
        const themeColor = ["var(--yellow)", "var(--mint)", "var(--lavender)", "var(--lime)", "var(--pink-d)"][(idx-1) % 5];
        row.innerHTML = `
          <div class="theme-label">
            <span class="theme-num" style="background:${themeColor};">${num}</span>
            <h3>${ch.icon} ${ch.name.toUpperCase()}</h3>
            <span class="fig">${byChapter[ch.id].length} paquet${byChapter[ch.id].length > 1 ? "s" : ""}</span>
          </div>
          <div class="deck-grid four"></div>
        `;
        const grid = row.querySelector(".deck-grid");
        byChapter[ch.id].forEach((p) => grid.appendChild(buildDeck(p)));
        container.appendChild(row);
      });
    } else {
      // Fallback: just all in grid
      const grid = document.createElement("div");
      grid.className = "deck-grid";
      mine.forEach((p) => grid.appendChild(buildDeck(p)));
      container.appendChild(grid);
    }
  }

  // ─── SESSION FLASHCARD ───
  let session = null;
  const NEW_PER_SESSION = 15;

  window.startFlashcardSession = function (packId) {
    const pack = FLASHCARD_PACKS.find((p) => p.id === packId);
    if (!pack) return;
    const srsData = SRS.getData(SRS_KEY) || {};
    const allCards = pack.cards.map((c, i) => ({
      front: c.front, back: c.back, memo: c.memo || null,
      srsKey: getCardKey(packId, i), cardIdx: i,
    }));

    const due = [], fresh = [];
    allCards.forEach((c, i) => {
      const st = srsData[c.srsKey];
      if (!st) fresh.push(i);
      else if ((st.next || 0) <= Date.now()) due.push(i);
    });
    shuffle(due); shuffle(fresh);
    let queue = [...due, ...fresh.slice(0, NEW_PER_SESSION)];
    if (queue.length === 0) {
      const all = allCards.map((_, i) => i);
      shuffle(all);
      queue = all.slice(0, 10);
    }

    session = {
      pack, packId, allCards, queue, index: 0, flipped: false,
      results: { again: 0, hard: 0, good: 0, easy: 0 },
      masteryStart: getMastery(packId, pack.cards.length),
    };
    if (typeof GAM !== "undefined" && GAM.resetCombo) GAM.resetCombo();

    document.getElementById("session-title").textContent = pack.name;
    goToTab("session");
    showCard();
  };

  function showCard() {
    const c = session.allCards[session.queue[session.index]];
    document.getElementById("session-progress").textContent = (session.index + 1) + " / " + session.queue.length;
    const textEl = document.getElementById("session-card-text");
    textEl.textContent = c.front;
    textEl.style.opacity = "1";
    textEl.style.fontSize = "";
    document.getElementById("session-card-answer").textContent = "";
    document.getElementById("session-card-answer").hidden = true;
    document.getElementById("session-card-memo").hidden = true;
    document.getElementById("session-card-memo").textContent = "";
    document.getElementById("session-card-label").textContent = "QUESTION";
    document.getElementById("session-card").classList.remove("flipped");
    session.flipped = false;
    document.getElementById("session-actions").hidden = false;
    document.getElementById("session-quality").hidden = true;
  }

  window.flipFlashcard = function () {
    if (!session || session.flipped) return;
    session.flipped = true;
    const c = session.allCards[session.queue[session.index]];
    document.getElementById("session-card-answer").textContent = c.back;
    document.getElementById("session-card-answer").hidden = false;
    document.getElementById("session-card-text").style.opacity = "0.45";
    document.getElementById("session-card-text").style.fontSize = "15px";
    if (c.memo) {
      const memo = document.getElementById("session-card-memo");
      memo.textContent = "🧠 " + c.memo;
      memo.hidden = false;
    }
    document.getElementById("session-card-label").textContent = "RÉPONSE";
    document.getElementById("session-card").classList.add("flipped");
    document.getElementById("session-actions").hidden = true;
    document.getElementById("session-quality").hidden = false;
  };

  window.rateFlashcard = function (quality) {
    if (!session || !session.flipped) return;
    const c = session.allCards[session.queue[session.index]];
    // Update SRS
    const state = SRS.getState(SRS_KEY, c.srsKey);
    const newState = SRS.update(state, quality);
    SRS.save(SRS_KEY, c.srsKey, newState);
    // Track
    try {
      const tracking = JSON.parse(localStorage.getItem("qpuc-tracking") || "{}");
      if (!tracking[session.packId]) tracking[session.packId] = { attempts: 0, correct: 0, wrong: 0, cards: {}, lastPlayed: 0 };
      const tp = tracking[session.packId];
      tp.attempts++;
      if (quality >= 3) tp.correct++; else tp.wrong++;
      tp.lastPlayed = Date.now();
      const ck = String(c.cardIdx);
      if (!tp.cards[ck]) tp.cards[ck] = { attempts: 0, correct: 0, wrong: 0 };
      tp.cards[ck].attempts++;
      if (quality >= 3) tp.cards[ck].correct++; else tp.cards[ck].wrong++;
      localStorage.setItem("qpuc-tracking", JSON.stringify(tracking));
    } catch {}

    // Gamification (keep working in background)
    if (typeof GAM !== "undefined") {
      GAM.recordCardActivity();
      let xp = 0;
      if (quality === 3) xp = 1;
      else if (quality === 4) xp = 2;
      else if (quality === 5) xp = 3;
      if (xp > 0) GAM.addXP(xp);
      if (quality >= 4) {
        const c2 = GAM.bumpCombo();
        if (c2 === 3 || c2 === 5 || c2 === 10) GAM.showComboToast(c2);
      } else GAM.resetCombo();
    }

    if (quality <= 1) { session.results.again++; session.queue.push(session.queue[session.index]); }
    else if (quality === 3) session.results.hard++;
    else if (quality === 4) session.results.good++;
    else session.results.easy++;

    // Check mastery jump
    const newMastery = getMastery(session.packId, session.pack.cards.length);
    if (session.masteryStart < 100 && newMastery >= 100 && typeof GAM !== "undefined") {
      if (GAM.recordMastery(session.packId) && GAM.celebratePackMastered) {
        GAM.celebratePackMastered(session.pack.name);
      }
      session.masteryStart = 100;
    }

    session.index++;
    if (session.index >= session.queue.length) showResult();
    else showCard();
  };

  function showResult() {
    const r = session.results;
    const total = r.again + r.hard + r.good + r.easy;
    const mastery = getMastery(session.packId, session.pack.cards.length);
    const xp = r.hard * 1 + r.good * 2 + r.easy * 3;
    document.getElementById("result-total").textContent = total;
    document.getElementById("result-good").textContent = r.good + r.easy;
    document.getElementById("result-mastery").textContent = mastery + "%";
    document.getElementById("result-xp").textContent = "+" + xp;
    document.getElementById("result-emoji").textContent = mastery >= 100 ? "⭐" : (r.again === 0 ? "🎉" : "👍");
    document.getElementById("result-title").textContent = mastery >= 100 ? "Pack maîtrisé !" : "Session terminée !";
    goToTab("result");
  }

  // Back button on session screen
  document.addEventListener("DOMContentLoaded", function () {
    const back = document.getElementById("btn-session-back");
    if (back) back.onclick = () => goToTab("mes-paquets");
    // Keyboard shortcuts
    document.addEventListener("keydown", function (e) {
      const sess = document.getElementById("page-session");
      if (!sess || !sess.classList.contains("active") || !session) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!session.flipped) flipFlashcard(); }
      else if (session.flipped) {
        if (e.key === "1") rateFlashcard(1);
        else if (e.key === "2") rateFlashcard(3);
        else if (e.key === "3") rateFlashcard(4);
        else if (e.key === "4") rateFlashcard(5);
      }
    });
  });

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // ─── INIT ON LOAD ───
  function init() {
    goToTab("trouver");
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
