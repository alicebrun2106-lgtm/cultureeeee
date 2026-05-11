// today.js — Session quotidienne : 5 flashcards + 10 questions QCM + résumé
(function () {
  const SRS_KEY = "qpuc-srs";
  const FLASHCARDS_PER_SESSION = 5;
  const QUIZ_QUESTIONS_PER_SESSION = 10;
  const TODAY_PROGRESS_KEY = "qpuc-today-progress";

  // ---------- DATE HELPERS ----------
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // ---------- TODAY PROGRESS (per-day) ----------
  function getTodayProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem(TODAY_PROGRESS_KEY)) || {};
      if (raw.date !== todayStr()) return { date: todayStr(), flashcardsDone: 0, quizDone: 0, sessionCompleted: false };
      return raw;
    } catch { return { date: todayStr(), flashcardsDone: 0, quizDone: 0, sessionCompleted: false }; }
  }
  function saveTodayProgress(p) { localStorage.setItem(TODAY_PROGRESS_KEY, JSON.stringify(p)); }

  function isTodayDone() {
    const p = getTodayProgress();
    return p.sessionCompleted;
  }

  // ---------- BUILD SESSION CONTENT ----------
  function getCardKey(packId, idx) { return packId + ":" + idx; }

  function pickFlashcards() {
    if (typeof FLASHCARD_PACKS === "undefined") return [];
    const srsData = SRS.getData(SRS_KEY) || {};
    const allCardsWithMeta = [];

    // Priority 1: due cards (already seen, time to review)
    const dueCards = [];
    // Priority 2: cards from packs in progress (started but not done)
    const inProgressNew = [];
    // Priority 3: random fresh cards
    const freshCards = [];

    FLASHCARD_PACKS.forEach((pack) => {
      let packTouched = false;
      pack.cards.forEach((card, idx) => {
        const key = getCardKey(pack.id, idx);
        const st = srsData[key];
        if (st) {
          packTouched = true;
          if ((st.next || 0) <= Date.now()) {
            dueCards.push({ pack, card, idx, key });
          }
        }
      });
      if (packTouched) {
        // Add new cards from this in-progress pack
        pack.cards.forEach((card, idx) => {
          const key = getCardKey(pack.id, idx);
          if (!srsData[key]) inProgressNew.push({ pack, card, idx, key });
        });
      } else {
        // Fresh pack — add a few cards
        pack.cards.forEach((card, idx) => {
          freshCards.push({ pack, card, idx, key: getCardKey(pack.id, idx) });
        });
      }
    });

    shuffle(dueCards);
    shuffle(inProgressNew);
    shuffle(freshCards);

    const result = [
      ...dueCards.slice(0, FLASHCARDS_PER_SESSION),
      ...inProgressNew.slice(0, FLASHCARDS_PER_SESSION),
      ...freshCards.slice(0, FLASHCARDS_PER_SESSION),
    ].slice(0, FLASHCARDS_PER_SESSION);
    return result;
  }

  function pickQuizQuestions() {
    if (typeof FLASHCARD_PACKS === "undefined") return [];
    // Pick 10 random cards, build QCM from them
    const allCards = [];
    FLASHCARD_PACKS.forEach((pack) => {
      pack.cards.forEach((card) => {
        if (card.front && card.back && card.back.length < 80) {
          allCards.push({ pack: pack.name, packId: pack.id, q: card.front, r: card.back });
        }
      });
    });
    shuffle(allCards);
    const selected = allCards.slice(0, QUIZ_QUESTIONS_PER_SESSION);

    return selected.map((c) => {
      // Pick 3 wrong answers from other cards (with similar length)
      const wrongs = [];
      const candidates = allCards.filter((a) => a.r !== c.r && Math.abs(a.r.length - c.r.length) < 20);
      shuffle(candidates);
      for (const cand of candidates) {
        if (wrongs.length >= 3) break;
        if (!wrongs.includes(cand.r) && cand.r !== c.r) wrongs.push(cand.r);
      }
      const choices = [c.r, ...wrongs];
      shuffle(choices);
      return { question: c.q, correct: c.r, choices, packName: c.pack, packId: c.packId };
    });
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- "AUJOURD'HUI" SCREEN ----------
  window.initToday = function () {
    const lesson = (typeof getTodayLesson === "function") ? getTodayLesson() : null;
    const streak = GAM.getStreakStatus();
    const progress = getTodayProgress();

    const container = document.getElementById("today-content");
    if (!container) return;
    container.innerHTML = "";

    // 1. Streak header (big, visible)
    const streakBlock = document.createElement("div");
    streakBlock.className = "today-streak-hero";
    streakBlock.innerHTML = `
      <div class="streak-flame ${streak.atRisk ? "streak-at-risk" : ""}">🔥</div>
      <div class="streak-number">${streak.current}</div>
      <div class="streak-label">${streak.current > 1 ? "jours d'affilée" : streak.current === 1 ? "jour d'affilée" : "Démarre ta série aujourd'hui"}</div>
    `;
    container.appendChild(streakBlock);

    // 2. Mini-leçon du jour
    if (lesson) {
      const lessonBlock = document.createElement("div");
      lessonBlock.className = "today-lesson";
      lessonBlock.innerHTML = `
        <div class="today-lesson-label">✨ MINI-LEÇON DU JOUR</div>
        <h2 class="today-lesson-title">${lesson.title}</h2>
        <p class="today-lesson-hook">${lesson.hook}</p>
        <p class="today-lesson-body">${lesson.body}</p>
        <div class="today-lesson-factoids">
          ${lesson.factoids.map((f) => `<div class="today-factoid">→ ${f}</div>`).join("")}
        </div>
      `;
      container.appendChild(lessonBlock);
    }

    // 3. Session card
    const sessionBlock = document.createElement("div");
    sessionBlock.className = "today-session-card";
    const totalSteps = FLASHCARDS_PER_SESSION + QUIZ_QUESTIONS_PER_SESSION;
    const doneSteps = progress.flashcardsDone + progress.quizDone;
    const pct = Math.round(doneSteps / totalSteps * 100);

    if (progress.sessionCompleted) {
      sessionBlock.innerHTML = `
        <div class="session-done-icon">✅</div>
        <h2 class="session-done-title">Session terminée !</h2>
        <p class="session-done-sub">Reviens demain pour continuer ta série 🔥</p>
        <button class="btn-session-secondary" id="btn-session-redo">Refaire une session</button>
      `;
      sessionBlock.querySelector("#btn-session-redo").onclick = startDailySession;
    } else {
      sessionBlock.innerHTML = `
        <div class="session-label">SESSION DU JOUR</div>
        <div class="session-stats">
          <div class="session-stat"><span class="session-stat-num">${FLASHCARDS_PER_SESSION}</span><span class="session-stat-lbl">flashcards</span></div>
          <div class="session-stat"><span class="session-stat-num">${QUIZ_QUESTIONS_PER_SESSION}</span><span class="session-stat-lbl">questions</span></div>
          <div class="session-stat"><span class="session-stat-num">~5min</span><span class="session-stat-lbl">durée</span></div>
        </div>
        <div class="session-progress-bar"><div class="session-progress-fill" style="width:${pct}%"></div></div>
        <button class="btn-session-primary" id="btn-session-start">${doneSteps > 0 ? "Continuer ma session" : "Commencer ma session"}</button>
      `;
      sessionBlock.querySelector("#btn-session-start").onclick = startDailySession;
    }
    container.appendChild(sessionBlock);

    // 4. "Tout réviser" — mix all touched cards
    const touched = getAllTouchedCards();
    if (touched.length > 0) {
      const reviewAll = document.createElement("div");
      reviewAll.className = "today-review-all-card";
      reviewAll.innerHTML = `
        <div class="review-all-header">
          <div class="review-all-icon">🔀</div>
          <div class="review-all-info">
            <div class="review-all-title">Tout réviser</div>
            <div class="review-all-sub">${touched.length} carte${touched.length > 1 ? "s" : ""} déjà vue${touched.length > 1 ? "s" : ""}, tous paquets mélangés</div>
          </div>
        </div>
        <button class="btn-review-all" id="btn-review-all">Mélanger et réviser</button>
      `;
      reviewAll.querySelector("#btn-review-all").onclick = startReviewAll;
      container.appendChild(reviewAll);
    }
  };

  // Get all cards across all packs that have been seen at least once
  function getAllTouchedCards() {
    if (typeof FLASHCARD_PACKS === "undefined") return [];
    const srsData = SRS.getData(SRS_KEY) || {};
    const out = [];
    FLASHCARD_PACKS.forEach((pack) => {
      pack.cards.forEach((card, idx) => {
        const key = pack.id + ":" + idx;
        const st = srsData[key];
        if (st && (st.reps || 0) >= 1) {
          out.push({ pack, card, idx, key });
        }
      });
    });
    return out;
  }

  // Launch a global review of all touched cards, shuffled, no quiz at the end
  function startReviewAll() {
    const touched = getAllTouchedCards();
    if (touched.length === 0) return;
    const shuffled = touched.slice();
    shuffle(shuffled);
    const queueSize = Math.min(25, shuffled.length);
    sess = {
      flashcards: shuffled.slice(0, queueSize),
      quiz: [],
      step: "flashcards",
      fcIndex: 0, fcResults: { again: 0, hard: 0, good: 0, easy: 0 }, fcFlipped: false,
      quizIndex: 0, quizCorrect: 0, quizAnswered: false,
      isReviewAll: true,
      totalTouched: touched.length,
    };
    showScreen("today-session");
    runFlashcardStep();
  }
  window.startReviewAll = startReviewAll;

  // ---------- SESSION FLOW ----------
  let sess = {};

  function startDailySession() {
    const flashcards = pickFlashcards();
    const quiz = pickQuizQuestions();
    sess = {
      flashcards, quiz,
      step: "flashcards", // "flashcards" → "quiz" → "done"
      fcIndex: 0, fcResults: { again: 0, hard: 0, good: 0, easy: 0 }, fcFlipped: false,
      quizIndex: 0, quizCorrect: 0, quizAnswered: false,
    };
    showScreen("today-session");
    runFlashcardStep();
  }

  function runFlashcardStep() {
    const root = document.getElementById("today-session-content");
    if (!root) return;

    if (sess.fcIndex >= sess.flashcards.length) {
      sess.step = "quiz";
      runQuizStep();
      return;
    }

    const item = sess.flashcards[sess.fcIndex];
    const total = sess.flashcards.length + sess.quiz.length;
    const done = sess.fcIndex;
    const pct = Math.round(done / total * 100);

    root.innerHTML = `
      <div class="ts-progress-bar"><div class="ts-progress-fill" style="width:${pct}%"></div></div>
      <div class="ts-step-label">📚 FLASHCARD ${sess.fcIndex + 1} / ${sess.flashcards.length}</div>
      <div class="ts-card" id="ts-card">
        <div class="ts-pack-name">${item.pack.name}</div>
        <div class="ts-card-front">${escapeHtml(item.card.front)}</div>
        <div class="ts-card-back" id="ts-card-back" style="display:none">
          <div class="ts-card-divider"></div>
          <div class="ts-card-answer">${escapeHtml(item.card.back)}</div>
          ${item.card.memo ? `<div class="ts-card-memo">🧠 ${escapeHtml(item.card.memo)}</div>` : ""}
        </div>
      </div>
      <div class="ts-actions" id="ts-actions">
        <button class="btn-ts-flip" id="btn-ts-flip">Voir la réponse</button>
      </div>
    `;
    document.getElementById("btn-ts-flip").onclick = () => {
      document.getElementById("ts-card-back").style.display = "";
      document.getElementById("ts-actions").innerHTML = `
        <button class="btn-quality btn-again" data-q="1"><span class="quality-key">1</span> À revoir</button>
        <button class="btn-quality btn-hard" data-q="3"><span class="quality-key">2</span> Difficile</button>
        <button class="btn-quality btn-good" data-q="4"><span class="quality-key">3</span> Bien</button>
        <button class="btn-quality btn-easy" data-q="5"><span class="quality-key">4</span> Facile</button>
      `;
      document.querySelectorAll(".btn-quality").forEach((b) => {
        b.onclick = () => rateFC(parseInt(b.dataset.q));
      });
    };
  }

  function rateFC(quality) {
    const item = sess.flashcards[sess.fcIndex];
    const state = SRS.getState(SRS_KEY, item.key);
    const newState = SRS.update(state, quality);
    SRS.save(SRS_KEY, item.key, newState);

    // Gamification
    GAM.recordCardActivity();
    if (quality === 3) GAM.addXP(1);
    else if (quality === 4) GAM.addXP(2);
    else if (quality === 5) GAM.addXP(3);
    if (quality >= 4) {
      const c = GAM.bumpCombo();
      if (c === 3 || c === 5 || c === 10) GAM.showComboToast(c);
    } else GAM.resetCombo();

    if (quality <= 1) sess.fcResults.again++;
    else if (quality === 3) sess.fcResults.hard++;
    else if (quality === 4) sess.fcResults.good++;
    else sess.fcResults.easy++;

    // Track today progress (only for the daily session, not "Tout réviser")
    if (!sess.isReviewAll) {
      const p = getTodayProgress();
      p.flashcardsDone = Math.max(p.flashcardsDone, sess.fcIndex + 1);
      saveTodayProgress(p);
    }

    // Bail-out if user requeued an "Again" — re-show same card
    if (quality <= 1) {
      // For review-all, requeue at end so it comes back
      if (sess.isReviewAll) sess.flashcards.push(item);
    }

    sess.fcIndex++;
    runFlashcardStep();
  }

  function runQuizStep() {
    const root = document.getElementById("today-session-content");
    if (!root) return;

    if (sess.quizIndex >= sess.quiz.length) {
      sess.step = "done";
      finishSession();
      return;
    }

    const item = sess.quiz[sess.quizIndex];
    const total = sess.flashcards.length + sess.quiz.length;
    const done = sess.flashcards.length + sess.quizIndex;
    const pct = Math.round(done / total * 100);

    sess.quizAnswered = false;
    root.innerHTML = `
      <div class="ts-progress-bar"><div class="ts-progress-fill" style="width:${pct}%"></div></div>
      <div class="ts-step-label">⚡ QUESTION ${sess.quizIndex + 1} / ${sess.quiz.length}</div>
      <div class="ts-quiz-card">
        <div class="ts-pack-name">${item.packName}</div>
        <div class="ts-quiz-question">${escapeHtml(item.question)}</div>
      </div>
      <div class="ts-quiz-choices" id="ts-quiz-choices">
        ${item.choices.map((c, i) => `
          <button class="btn-quiz-choice" data-choice="${escapeAttr(c)}">${escapeHtml(c)}</button>
        `).join("")}
      </div>
    `;
    document.querySelectorAll(".btn-quiz-choice").forEach((btn) => {
      btn.onclick = () => answerQuiz(btn.dataset.choice, item, btn);
    });
  }

  function answerQuiz(answer, item, btn) {
    if (sess.quizAnswered) return;
    sess.quizAnswered = true;
    const isCorrect = answer === item.correct;
    if (isCorrect) {
      sess.quizCorrect++;
      btn.classList.add("btn-quiz-correct");
      GAM.addXP(2);
      const c = GAM.bumpCombo();
      if (c === 3 || c === 5 || c === 10) GAM.showComboToast(c);
    } else {
      btn.classList.add("btn-quiz-wrong");
      // Show correct one
      document.querySelectorAll(".btn-quiz-choice").forEach((b) => {
        if (b.dataset.choice === item.correct) b.classList.add("btn-quiz-correct");
      });
      GAM.resetCombo();
      // Add this question to revisions pool (mistake → spaced review)
      addWrongToRevisions(item);
    }
    // Disable all buttons
    document.querySelectorAll(".btn-quiz-choice").forEach((b) => { b.disabled = true; });

    GAM.recordCardActivity();

    // Track progress
    const p = getTodayProgress();
    p.quizDone = Math.max(p.quizDone, sess.quizIndex + 1);
    saveTodayProgress(p);

    setTimeout(() => {
      sess.quizIndex++;
      runQuizStep();
    }, 1100);
  }

  function addWrongToRevisions(item) {
    if (typeof addFicheToRevisionPool === "function") {
      addFicheToRevisionPool(item.packId, item.packName, [{ q: item.question, r: item.correct }]);
    }
  }

  function finishSession() {
    // Mark daily session done only if it WAS the daily session (not Tout réviser)
    if (!sess.isReviewAll) {
      const p = getTodayProgress();
      p.sessionCompleted = true;
      saveTodayProgress(p);
    }

    // Celebrate!
    GAM.fireConfetti();

    const root = document.getElementById("today-session-content");
    if (!root) return;
    const xpEarned = (sess.fcResults.hard * 1 + sess.fcResults.good * 2 + sess.fcResults.easy * 3) + sess.quizCorrect * 2;
    const streak = GAM.getStreakStatus();
    const totalCardsReviewed = sess.fcResults.again + sess.fcResults.hard + sess.fcResults.good + sess.fcResults.easy;

    if (sess.isReviewAll) {
      root.innerHTML = `
        <div class="ts-done-block">
          <div class="ts-done-icon">🔀</div>
          <h2 class="ts-done-title">Révision mélangée terminée !</h2>
          <div class="ts-done-stats">
            <div class="ts-done-stat"><span class="ts-done-num">${totalCardsReviewed}</span><span class="ts-done-lbl">cartes révisées</span></div>
            <div class="ts-done-stat"><span class="ts-done-num">+${xpEarned}</span><span class="ts-done-lbl">XP gagnés</span></div>
            <div class="ts-done-stat"><span class="ts-done-num">🔥 ${streak.current}</span><span class="ts-done-lbl">jour${streak.current > 1 ? "s" : ""} d'affilée</span></div>
          </div>
          <p class="ts-done-message">Bien joué — tu peux relancer un mix dès maintenant.</p>
          <button class="btn-session-primary" onclick="goToTab('today')">Retour à l'accueil</button>
        </div>
      `;
      return;
    }
    root.innerHTML = `
      <div class="ts-done-block">
        <div class="ts-done-icon">🎉</div>
        <h2 class="ts-done-title">Session terminée !</h2>
        <div class="ts-done-stats">
          <div class="ts-done-stat"><span class="ts-done-num">${sess.quizCorrect}</span><span class="ts-done-lbl">/ ${sess.quiz.length} bonnes réponses</span></div>
          <div class="ts-done-stat"><span class="ts-done-num">+${xpEarned}</span><span class="ts-done-lbl">XP gagnés</span></div>
          <div class="ts-done-stat"><span class="ts-done-num">🔥 ${streak.current}</span><span class="ts-done-lbl">jour${streak.current > 1 ? "s" : ""} d'affilée</span></div>
        </div>
        <p class="ts-done-message">${streak.current > 1 ? "Reviens demain pour ne pas perdre ta série !" : "Première session validée 🎯"}</p>
        <button class="btn-session-primary" onclick="goToTab('today')">Retour à l'accueil</button>
      </div>
    `;
  }

  // ---------- HELPERS ----------
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function escapeAttr(s) {
    return String(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // Public
  window.startDailySession = startDailySession;
  window.isTodayDone = isTodayDone;
})();
