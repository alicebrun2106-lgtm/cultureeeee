/* ===== RÉVISIONS QUOTIDIENNES — SM-2 Spaced Repetition ===== */
(function () {
  "use strict";
  const REV_KEY = "qpuc-revisions";
  const DAY_MS = 86400000;

  function getData() {
    try { return JSON.parse(localStorage.getItem(REV_KEY)) || { cards: [], v: 2 }; }
    catch (e) { return { cards: [], v: 2 }; }
  }
  function save(d) { localStorage.setItem(REV_KEY, JSON.stringify(d)); }

  // --- Migration from old format (streak → SM-2) ---
  function migrateIfNeeded() {
    const data = getData();
    if (data.v >= 2) return;
    data.cards.forEach(c => {
      if (c.streak !== undefined) {
        c.ef = 2.5;
        c.reps = c.streak || 0;
        c.interval = c.interval || 1;
        c.next = c.nextReview || Date.now();
        delete c.streak;
        delete c.nextReview;
      }
    });
    data.v = 2;
    save(data);
  }

  function todayStart() {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
  }
  function getDueCards() {
    const now = Date.now();
    return getData().cards.filter(c => (c.next || c.nextReview || 0) <= now);
  }

  // Pull individual flashcards from the flashcards SRS pool (qpuc-srs)
  // Returns cards that have been seen at least once and are due now.
  function getDueFlashcards() {
    if (typeof SRS === "undefined" || typeof FLASHCARD_PACKS === "undefined") return [];
    const srsData = SRS.getData("qpuc-srs") || {};
    const due = [];
    const now = Date.now();
    FLASHCARD_PACKS.forEach((pack) => {
      pack.cards.forEach((card, idx) => {
        const key = pack.id + ":" + idx;
        const st = srsData[key];
        if (st && (st.next || 0) <= now && (st.reps || 0) > 0) {
          due.push({
            q: card.front,
            r: card.back,
            memo: card.memo || null,
            source: pack.id,
            sourceTitle: pack.name,
            srsKey: key,
            ef: st.ef, interval: st.interval, reps: st.reps, next: st.next,
            fromFlashcards: true,
          });
        }
      });
    });
    return due;
  }

  function getAllDue() {
    return [...getDueCards(), ...getDueFlashcards()];
  }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function formatNextReview(ts) {
    const diff = Math.ceil((ts - Date.now()) / DAY_MS);
    if (diff <= 0) return "aujourd'hui";
    if (diff === 1) return "demain";
    return "dans " + diff + " jours";
  }

  // --- Add fiche cards to revision pool (SM-2 format) ---
  window.addFicheToRevisionPool = function (taskId, taskTitle, flashcards) {
    const data = getData();
    const existing = {};
    data.cards.forEach(c => { existing[c.source + "|" + c.q] = true; });
    const tomorrow = todayStart() + DAY_MS;
    flashcards.forEach(fc => {
      const key = taskId + "|" + fc.q;
      if (!existing[key]) {
        data.cards.push({
          q: fc.q, r: fc.r,
          source: taskId,
          sourceTitle: taskTitle,
          ef: 2.5, interval: 1, reps: 0,
          next: tomorrow
        });
      }
    });
    save(data);
  };

  window.getRevisionsDueCount = function () { return getAllDue().length; };

  // --- DASHBOARD ---
  window.initRevisions = function () {
    migrateIfNeeded();
    showScreen("revisions");
    renderDashboard();
  };

  function renderDashboard() {
    const data = getData();
    const now = Date.now();
    const dueList = document.getElementById("rev-due-list");
    const masteredList = document.getElementById("rev-mastered-list");
    const summary = document.getElementById("rev-summary");
    const btnStart = document.getElementById("btn-start-revisions");
    const badge = document.getElementById("rev-due-badge");

    const groups = {};
    // 1. Programme fiches
    data.cards.forEach(c => {
      const next = c.next || c.nextReview || 0;
      if (!groups[c.sourceTitle]) groups[c.sourceTitle] = { title: c.sourceTitle, due: 0, scheduled: 0, nextDate: Infinity };
      if (next <= now) groups[c.sourceTitle].due++;
      else { groups[c.sourceTitle].scheduled++; if (next < groups[c.sourceTitle].nextDate) groups[c.sourceTitle].nextDate = next; }
    });
    // 2. Flashcards SRS pool (cards seen at least once)
    if (typeof SRS !== "undefined" && typeof FLASHCARD_PACKS !== "undefined") {
      const srsData = SRS.getData("qpuc-srs") || {};
      FLASHCARD_PACKS.forEach((pack) => {
        const title = pack.name;
        pack.cards.forEach((card, idx) => {
          const key = pack.id + ":" + idx;
          const st = srsData[key];
          if (!st || (st.reps || 0) <= 0) return; // unseen → ignore
          const next = st.next || 0;
          if (!groups[title]) groups[title] = { title, due: 0, scheduled: 0, nextDate: Infinity };
          if (next <= now) groups[title].due++;
          else { groups[title].scheduled++; if (next < groups[title].nextDate) groups[title].nextDate = next; }
        });
      });
    }

    const packs = Object.values(groups);
    const totalDue = getAllDue().length;
    const totalCards = data.cards.length + (typeof SRS !== "undefined" && typeof FLASHCARD_PACKS !== "undefined" ? (function () {
      const srsData = SRS.getData("qpuc-srs") || {};
      let count = 0;
      FLASHCARD_PACKS.forEach((p) => p.cards.forEach((_, idx) => {
        const st = srsData[p.id + ":" + idx];
        if (st && (st.reps || 0) > 0) count++;
      }));
      return count;
    })() : 0);

    badge.textContent = totalDue;
    badge.style.background = totalDue > 0 ? "var(--orange, #f39c12)" : "var(--green, #2ecc71)";

    if (totalCards === 0) {
      summary.innerHTML = '<div class="rev-empty"><div class="rev-empty-icon">📭</div><div class="rev-empty-text">Pas encore de cartes.<br>Termine des fiches dans le Programme !</div></div>';
      btnStart.style.display = "none"; dueList.innerHTML = ""; masteredList.innerHTML = "";
      return;
    }
    if (totalDue === 0) {
      summary.innerHTML = '<div class="rev-empty"><div class="rev-empty-icon">🎉</div><div class="rev-empty-text">Tout révisé !' + totalCards + ' cartes dans le pool.</div></div>';
      btnStart.style.display = "none";
    } else {
      summary.innerHTML = '<div class="rev-count">' + totalDue + '</div>carte' + (totalDue > 1 ? "s" : "") + ' à revoir';
      btnStart.style.display = "";
    }

    let dueHtml = "";
    packs.forEach(p => { if (p.due > 0) dueHtml += '<div class="rev-pack-item"><span class="rev-pack-name">' + p.title + '</span><span class="rev-pack-count due">' + p.due + '</span></div>'; });
    dueList.innerHTML = dueHtml || '<div class="rev-pack-empty">Aucune carte due</div>';

    let mastHtml = "";
    packs.forEach(p => { if (p.scheduled > 0) mastHtml += '<div class="rev-pack-item"><span class="rev-pack-name">' + p.title + '</span><span class="rev-pack-count scheduled">✓ ' + p.scheduled + ' — ' + formatNextReview(p.nextDate) + '</span></div>'; });
    masteredList.innerHTML = mastHtml || '<div class="rev-pack-empty">—</div>';
  }

  // --- REVIEW SESSION (SM-2) ---
  let revCards = [], revIndex = 0, revAgainCount = 0;

  window.startRevisionSession = function () {
    const due = getAllDue();
    if (due.length === 0) return;
    revCards = shuffle(due.slice());
    revIndex = 0; revAgainCount = 0;
    document.getElementById("rev-fc-total").textContent = revCards.length;
    showScreen("revision-session");
    showRevCard();
  };

  function showRevCard() {
    if (revIndex >= revCards.length) { endRevSession(); return; }
    const c = revCards[revIndex];
    document.getElementById("rev-fc-num").textContent = revIndex + 1;
    document.getElementById("rev-fc-prompt").textContent = "Question";
    document.getElementById("rev-fc-fact").textContent = c.q;
    document.getElementById("rev-fc-reveal").textContent = "";
    document.getElementById("rev-fc-reveal").style.display = "none";
    document.getElementById("rev-fc-buttons").innerHTML = '<button class="btn-task-done" onclick="revealRevisionCard()">Voir la réponse</button>';
    document.getElementById("rev-fc-buttons").style.display = "";
    document.getElementById("rev-fc-rate").style.display = "none";
  }

  window.revealRevisionCard = function () {
    if (window.CultureSound) window.CultureSound.play("flip");
    const c = revCards[revIndex];
    document.getElementById("rev-fc-prompt").textContent = "Réponse";
    let answer = c.r;
    if (c.memo) answer += "\n\n🧠 " + c.memo;
    document.getElementById("rev-fc-reveal").textContent = answer;
    document.getElementById("rev-fc-reveal").style.display = "";
    document.getElementById("rev-fc-buttons").style.display = "none";
    document.getElementById("rev-fc-rate").style.display = "";
  };

  window.rateRevisionCard = function (quality) {
    if (window.CultureSound) window.CultureSound.rating(quality);
    // quality: 1=again, 3=hard, 4=good, 5=easy
    const card = revCards[revIndex];

    if (card.fromFlashcards && card.srsKey && typeof SRS !== "undefined") {
      // Update flashcards SRS pool (qpuc-srs)
      const state = SRS.getState("qpuc-srs", card.srsKey);
      const newState = SRS.update(state, quality);
      SRS.save("qpuc-srs", card.srsKey, newState);
    } else {
      // Update programme fiches pool (qpuc-revisions)
      const data = getData();
      for (let i = 0; i < data.cards.length; i++) {
        if (data.cards[i].source === card.source && data.cards[i].q === card.q) {
          const state = { ef: data.cards[i].ef || 2.5, interval: data.cards[i].interval || 0, reps: data.cards[i].reps || 0, next: 0 };
          const newState = SRS.update(state, quality);
          data.cards[i].ef = newState.ef;
          data.cards[i].interval = newState.interval;
          data.cards[i].reps = newState.reps;
          data.cards[i].next = newState.next;
          break;
        }
      }
      save(data);
    }

    // Bump streak + XP via gamification module if available
    if (typeof GAM !== "undefined") {
      GAM.recordCardActivity();
      if (quality === 3) GAM.addXP(1);
      else if (quality === 4) GAM.addXP(2);
      else if (quality === 5) GAM.addXP(3);
    }

    if (quality <= 1) { revAgainCount++; revCards.push(card); document.getElementById("rev-fc-total").textContent = revCards.length; }
    revIndex++;
    showRevCard();
  };

  function endRevSession() {
    const unique = revCards.length - revAgainCount;
    const icon = revAgainCount === 0 ? "🏆" : revAgainCount <= 3 ? "👍" : "📖";
    document.getElementById("rev-fc-prompt").textContent = "";
    document.getElementById("rev-fc-fact").innerHTML = '<div class="prog-fc-summary"><div class="prog-fc-summary-icon">' + icon + '</div><div class="prog-fc-summary-text">Révision terminée !</div><div class="prog-fc-summary-detail">' + unique + ' cartes révisées' + (revAgainCount > 0 ? ", " + revAgainCount + " à revoir" : "") + '</div></div>';
    document.getElementById("rev-fc-reveal").style.display = "none";
    document.getElementById("rev-fc-rate").style.display = "none";
    document.getElementById("rev-fc-buttons").innerHTML = '<button class="btn-task-done" onclick="backToRevisions()">Continuer ✓</button>';
    document.getElementById("rev-fc-buttons").style.display = "";
  }

  window.backToRevisions = function () {
    showScreen("revisions");
    renderDashboard();
  };

  window.updateRevisionBadge = function () {
    const due = getDueCards().length;
    const badge = document.getElementById("rev-home-badge");
    if (badge) { badge.textContent = due; badge.style.display = due > 0 ? "" : "none"; }
  };
})();
