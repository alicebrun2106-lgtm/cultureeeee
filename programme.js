// Programme — Task-based learning with QCM quizzes + SM-2 fiche flashcards
(function () {
  const PROG_KEY = "qpuc-prog";
  const PROG_SRS_KEY = "qpuc-prog-srs";
  let currentWeek = null, currentDay = null, currentTaskIndex = -1;
  let progQuizIndex = 0, progQuizScore = 0, progQuizQuestions = [];
  let ficheCards = [], ficheCardIndex = 0, ficheAgainCount = 0, ficheCurrentTask = null;

  // --- Progress Storage ---
  function getProgress() { try { return JSON.parse(localStorage.getItem(PROG_KEY)) || {}; } catch { return {}; } }
  function saveProgress(data) { localStorage.setItem(PROG_KEY, JSON.stringify(data)); }
  function isTaskDone(taskId) { return !!getProgress()[taskId]; }
  function markDone(taskId, extra) { const p = getProgress(); p[taskId] = { done: true, ts: Date.now(), ...(extra || {}) }; saveProgress(p); }
  function getDayProgress(day) { const p = getProgress(); let done = 0; day.tasks.forEach(t => { if (p[t.id]) done++; }); return { done, total: day.tasks.length }; }
  function getWeekProgress(week) { let done = 0, total = 0; week.days.forEach(d => { const dp = getDayProgress(d); done += dp.done; total += dp.total; }); return { done, total }; }

  const TASK_META = {
    lecture: { icon: "🎬", color: "#3a7bd5", label: "Vidéo" },
    video: { icon: "🎬", color: "#3a7bd5", label: "Vidéo" },
    fiche: { icon: "🧠", color: "#f0c040", label: "Fiche" },
    quiz: { icon: "❓", color: "#2ecc71", label: "Quiz" },
  };

  const DAY_COLORS = ["#e74c3c", "#3a7bd5", "#2ecc71", "#9b59b6", "#f39c12", "#e91e63", "#00bcd4"];

  // --- Week Selection ---
  window.initProgramme = function () {
    const container = document.getElementById("programme-weeks");
    container.innerHTML = "";
    PROGRAMME_WEEKS.forEach(week => {
      const wp = getWeekProgress(week);
      const pct = Math.round((wp.done / wp.total) * 100) || 0;
      const card = document.createElement("button");
      card.className = "programme-week-card";
      card.onclick = () => showWeekDetail(week.week);
      card.innerHTML = `
        <div class="pw-header"><span class="pw-number">Semaine ${week.week}</span><span class="pw-title">${week.title}</span></div>
        <p class="pw-desc">${week.description}</p>
        <div class="pw-days-preview">${week.days.map(d => `<span class="pw-day-icon">${d.icon}</span>`).join("")}</div>
        <div class="pw-progress"><div class="pw-progress-bar"><div class="pw-progress-fill" style="width:${pct}%"></div></div><span class="pw-progress-text">${wp.done}/${wp.total}</span></div>
      `;
      container.appendChild(card);
    });
    showScreen("programme");
  };

  function showWeekDetail(weekNum) {
    const week = PROGRAMME_WEEKS.find(w => w.week === weekNum);
    if (!week) return;
    currentWeek = week;
    document.getElementById("prog-week-title").textContent = `Semaine ${week.week} — ${week.title}`;
    const wp = getWeekProgress(week);
    const wpPct = Math.round((wp.done / wp.total) * 100) || 0;
    document.getElementById("prog-week-progress").innerHTML = `<div class="prog-wp-bar"><div class="prog-wp-fill" style="width:${wpPct}%"></div></div><span class="prog-wp-text">${wp.done}/${wp.total} (${wpPct}%)</span>`;
    const grid = document.getElementById("prog-days-grid");
    grid.innerHTML = "";
    week.days.forEach((day, i) => {
      const dp = getDayProgress(day);
      const dpPct = Math.round((dp.done / dp.total) * 100) || 0;
      const isDone = dp.done === dp.total && dp.total > 0;
      const card = document.createElement("button");
      card.className = "prog-day-card" + (isDone ? " completed" : "");
      card.style.setProperty("--day-color", DAY_COLORS[i % 7]);
      card.onclick = () => showDayTasks(day);
      card.innerHTML = `
        <div class="prog-day-top"><span class="prog-day-icon">${day.icon}</span><div class="prog-day-info"><span class="prog-day-label">${day.label}</span><span class="prog-day-theme">${day.theme}</span></div>${isDone ? '<span class="prog-day-check">✓</span>' : ''}</div>
        <div class="prog-day-bar"><div class="prog-day-bar-fill" style="width:${dpPct}%"></div></div>
        <span class="prog-day-bar-text">${dp.done}/${dp.total}</span>
      `;
      grid.appendChild(card);
    });
    showScreen("programme-week");
  }

  function showDayTasks(day) {
    currentDay = day;
    document.getElementById("prog-day-title").textContent = `${day.icon} ${day.label}`;
    const dp = getDayProgress(day);
    document.getElementById("prog-day-progress-small").textContent = `${dp.done}/${dp.total}`;
    document.getElementById("prog-day-objectif").textContent = day.objectif;
    const list = document.getElementById("prog-task-list");
    list.innerHTML = "";
    day.tasks.forEach((task, i) => {
      const done = isTaskDone(task.id);
      const meta = TASK_META[task.type] || TASK_META.quiz;
      const progress = getProgress();
      const taskData = progress[task.id];
      const el = document.createElement("button");
      el.className = "prog-task-item" + (done ? " done" : "");
      el.dataset.type = task.type;
      el.onclick = () => openTask(day, i);
      let scoreHtml = "";
      if (done && task.type === "quiz" && taskData && taskData.score !== undefined) scoreHtml = `<span class="prog-task-score">${taskData.score}/${taskData.total}</span>`;
      el.innerHTML = `
        <div class="prog-task-check ${done ? 'checked' : ''}" style="border-color:${meta.color}">${done ? '✓' : (i + 1)}</div>
        <div class="prog-task-body"><span class="prog-task-type" style="color:${meta.color}">${meta.icon} ${meta.label}</span><span class="prog-task-title">${task.title}</span></div>
        ${scoreHtml}<span class="prog-task-arrow">${done ? '' : '→'}</span>
      `;
      list.appendChild(el);
    });
    showScreen("programme-day");
  }

  function openTask(day, taskIndex) {
    currentDay = day;
    currentTaskIndex = taskIndex;
    const task = day.tasks[taskIndex];
    if (task.type === "lecture" || task.type === "video") {
      document.getElementById("prog-lecture-title").textContent = task.title;
      document.getElementById("prog-lecture-subtitle").textContent = task.subtitle || "";
      document.getElementById("prog-lecture-url").href = task.url;
      document.getElementById("prog-lecture-dur").textContent = task.duration || "";
      showScreen("programme-lecture");
    } else if (task.type === "fiche") {
      document.getElementById("prog-fiche-title").textContent = task.title;
      const container = document.getElementById("prog-fiche-items");
      container.innerHTML = "";
      (task.items || []).forEach((item, i) => {
        const card = document.createElement("div");
        card.className = "prog-fiche-card";
        card.style.animationDelay = (i * 0.06) + "s";
        card.innerHTML = `<div class="prog-fiche-fact">${item.fact}</div><div class="prog-fiche-detail">${item.detail}</div>`;
        container.appendChild(card);
      });
      showScreen("programme-fiche");
    } else if (task.type === "quiz") {
      startProgQuiz(task);
    }
  }

  window.markTaskDone = function () {
    if (currentTaskIndex < 0 || !currentDay) return;
    markDone(currentDay.tasks[currentTaskIndex].id);
    showDayTasks(currentDay);
  };

  // --- Programme Quiz (QCM) ---
  function startProgQuiz(task) {
    // Collect all answers from the day's fiches for distractor generation
    const dayAnswers = [];
    if (currentDay) {
      currentDay.tasks.forEach(t => {
        if (t.flashcards) t.flashcards.forEach(fc => dayAnswers.push(fc.r));
        if (t.items) t.items.forEach(item => dayAnswers.push(item.fact));
      });
    }

    // Build QCM for each question
    const rawQuestions = shuffleArray(task.questions || []);
    progQuizQuestions = rawQuestions.map(q => {
      if (q.choices && q.choices.length >= 2) return q; // already QCM
      // Auto-generate plausible choices from other answers in the day
      const correct = q.r;
      const normCorrect = (correct || "").toLowerCase().trim();
      const correctLen = correct.length;
      // Filter candidates: similar length, not the answer, not too long
      const candidates = dayAnswers.filter(a =>
        a && a.toLowerCase().trim() !== normCorrect && a.length < 60 && Math.abs(a.length - correctLen) < 25
      );
      // Sort by length similarity to correct answer (most plausible)
      candidates.sort((a, b) => Math.abs(a.length - correctLen) - Math.abs(b.length - correctLen));
      const distractors = shuffleArray(candidates).slice(0, 3);
      // If not enough, use generic plausible fillers
      const fillers = ["Aucune de ces réponses", "Je ne sais pas", "Autre chose"];
      let fi = 0;
      while (distractors.length < 3) distractors.push(fillers[fi++] || "?");
      const choices = shuffleArray([correct, ...distractors]);
      return { ...q, choices, r: correct };
    });

    progQuizIndex = 0;
    progQuizScore = 0;
    document.getElementById("prog-quiz-title").textContent = task.title;
    document.getElementById("prog-quiz-total").textContent = progQuizQuestions.length;
    showScreen("programme-quiz");
    showProgQuizQuestion();
  }

  function showProgQuizQuestion() {
    if (progQuizIndex >= progQuizQuestions.length) { endProgQuiz(); return; }
    const q = progQuizQuestions[progQuizIndex];
    document.getElementById("prog-quiz-num").textContent = progQuizIndex + 1;
    document.getElementById("prog-quiz-question").textContent = q.q;

    const choicesContainer = document.getElementById("prog-quiz-choices");
    choicesContainer.innerHTML = "";

    const letters = ["A", "B", "C", "D"];
    const normR = (q.r || "").toLowerCase().trim();
    const correctIdx = q.choices.findIndex(c => c.toLowerCase().trim() === normR);
    q.choices.forEach((choice, i) => {
      const btn = document.createElement("button");
      btn.className = "quiz-choice-btn";
      btn.innerHTML = `<span class="quiz-choice-letter">${letters[i]}</span><span class="quiz-choice-text">${choice}</span>`;
      btn.onclick = () => selectProgAnswer(i, correctIdx >= 0 ? correctIdx : 0, q);
      choicesContainer.appendChild(btn);
    });

    document.getElementById("prog-quiz-feedback").innerHTML = "";
    document.getElementById("prog-quiz-feedback").className = "quiz-feedback";
    document.getElementById("prog-quiz-next-btn").style.display = "none";
  }

  function selectProgAnswer(choiceIndex, correctIndex, q) {
    const correct = choiceIndex === correctIndex;
    if (correct) progQuizScore++;

    const btns = document.querySelectorAll("#prog-quiz-choices .quiz-choice-btn");
    btns.forEach((btn, i) => {
      btn.disabled = true;
      if (i === correctIndex) btn.classList.add("quiz-choice-correct");
      if (i === choiceIndex && !correct) btn.classList.add("quiz-choice-wrong");
    });

    const fb = document.getElementById("prog-quiz-feedback");
    if (correct) {
      fb.innerHTML = "✅ Bonne réponse !";
      fb.className = "quiz-feedback quiz-feedback-correct";
      playSound("correct");
    } else {
      fb.innerHTML = "❌ Raté ! → <strong>" + q.r + "</strong>";
      fb.className = "quiz-feedback quiz-feedback-wrong";
      playSound("wrong");
    }
    document.getElementById("prog-quiz-next-btn").style.display = "";
  }

  window.nextProgQuizQuestion = function () {
    progQuizIndex++;
    showProgQuizQuestion();
  };

  function endProgQuiz() {
    const total = progQuizQuestions.length;
    const pct = Math.round((progQuizScore / total) * 100);
    if (currentTaskIndex >= 0 && currentDay) {
      markDone(currentDay.tasks[currentTaskIndex].id, { score: progQuizScore, total });
    }
    const icon = pct >= 80 ? "🏆" : pct >= 50 ? "👍" : "📖";
    const title = pct >= 80 ? "Excellent !" : pct >= 50 ? "Pas mal !" : "Continue !";
    document.getElementById("prog-result-icon").textContent = icon;
    document.getElementById("prog-result-title").textContent = title;
    document.getElementById("prog-result-stats").innerHTML = `<div class="result-stat-line"><span>Score</span><span class="result-stat-value">${progQuizScore} / ${total}</span></div><div class="result-stat-line"><span>Taux</span><span class="result-stat-value">${pct}%</span></div>`;
    if (pct >= 80) playSound("win");
    showScreen("programme-quiz-result");
  }

  // --- Fiche Flashcards (SM-2) ---
  window.startFicheFlashcards = function () {
    if (currentTaskIndex < 0 || !currentDay) return;
    const task = currentDay.tasks[currentTaskIndex];
    ficheCurrentTask = task;
    if (task.flashcards && task.flashcards.length > 0) {
      ficheCards = shuffleArray(task.flashcards.map(fc => ({ q: fc.q, r: fc.r, mode: "qa" })));
    } else if (task.items) {
      ficheCards = shuffleArray(task.items.map(item => ({ q: item.fact, r: item.detail, mode: "fact" })));
    } else {
      ficheCards = [];
    }
    ficheCardIndex = 0;
    ficheAgainCount = 0;
    document.getElementById("prog-fiche-fc-title").textContent = task.title;
    document.getElementById("prog-fc-total").textContent = ficheCards.length;

    // Reset container HTML
    document.querySelector("#screen-programme-fiche-fc .prog-fc-card-container").innerHTML =
      '<div class="prog-fc-prompt" id="prog-fc-prompt"></div><div class="prog-fc-fact" id="prog-fc-fact"></div><div class="prog-fc-reveal" id="prog-fc-reveal"></div>';
    document.getElementById("prog-fc-buttons").innerHTML =
      '<button class="btn-task-done" onclick="revealFicheCard()" id="btn-fc-reveal">Voir la réponse</button>';

    showScreen("programme-fiche-fc");
    showFicheCard();
  };

  function showFicheCard() {
    if (ficheCardIndex >= ficheCards.length) { endFicheFlashcards(); return; }
    const card = ficheCards[ficheCardIndex];
    document.getElementById("prog-fc-num").textContent = ficheCardIndex + 1;
    document.getElementById("prog-fc-fact").textContent = card.q;
    document.getElementById("prog-fc-reveal").textContent = "";
    document.getElementById("prog-fc-prompt").textContent = card.mode === "qa" ? "Question" : "Que retiens-tu ?";
    document.getElementById("prog-fc-buttons").style.display = "";
    document.getElementById("btn-fc-reveal").style.display = "";
    document.getElementById("prog-fc-rate").style.display = "none";
    if (typeof MEMO !== "undefined") MEMO.hideTip("prog-fc-memo-tip");
  }

  window.revealFicheCard = function () {
    if (window.CultureSound) window.CultureSound.play("flip");
    const card = ficheCards[ficheCardIndex];
    document.getElementById("prog-fc-reveal").textContent = card.r;
    document.getElementById("prog-fc-prompt").textContent = card.mode === "qa" ? "Réponse" : "";
    document.getElementById("btn-fc-reveal").style.display = "none";
    document.getElementById("prog-fc-buttons").style.display = "none";
    document.getElementById("prog-fc-rate").style.display = "";
    // Show memo tip: prefer card.memo field, then fallback to MEMO lookup
    var memoEl = document.getElementById("prog-fc-memo-tip");
    if (memoEl) {
      if (card.memo) { memoEl.textContent = "🧠 " + card.memo; memoEl.style.display = ""; }
      else if (typeof MEMO !== "undefined") { MEMO.showTip("prog-fc-memo-tip", card.q, card.r); }
      else { memoEl.textContent = ""; memoEl.style.display = "none"; }
    }
  };

  window.rateFicheCard = function (quality) {
    // SM-2 quality: 1=again, 3=hard, 4=good, 5=easy
    const card = ficheCards[ficheCardIndex];
    const cardKey = (ficheCurrentTask ? ficheCurrentTask.id : "unknown") + ":" + ficheCardIndex;

    // Save SM-2 state
    const state = SRS.getState(PROG_SRS_KEY, cardKey);
    const newState = SRS.update(state, quality);
    SRS.save(PROG_SRS_KEY, cardKey, newState);

    if (quality <= 1) {
      ficheAgainCount++;
      ficheCards.push(card);
      document.getElementById("prog-fc-total").textContent = ficheCards.length;
    }
    ficheCardIndex++;
    showFicheCard();
  };

  function endFicheFlashcards() {
    if (ficheCurrentTask) {
      markDone(ficheCurrentTask.id, { reviewed: ficheCards.length, retries: ficheAgainCount });
      if (ficheCurrentTask.flashcards && typeof addFicheToRevisionPool === "function") {
        addFicheToRevisionPool(ficheCurrentTask.id, ficheCurrentTask.title, ficheCurrentTask.flashcards);
      }
    }
    const total = ficheCurrentTask ? (ficheCurrentTask.items || ficheCurrentTask.flashcards || []).length : ficheCards.length;
    const icon = ficheAgainCount === 0 ? "🏆" : ficheAgainCount <= 2 ? "👍" : "📖";
    const title = ficheAgainCount === 0 ? "Parfait !" : ficheAgainCount <= 2 ? "Bien joué !" : "Continue !";
    document.querySelector("#screen-programme-fiche-fc .prog-fc-card-container").innerHTML = `
      <div class="prog-fc-summary"><div class="prog-fc-summary-icon">${icon}</div><div class="prog-fc-summary-text">${title}</div><div class="prog-fc-summary-detail">${total} faits révisés${ficheAgainCount > 0 ? `, ${ficheAgainCount} à revoir` : ''}</div></div>
    `;
    document.getElementById("prog-fc-buttons").innerHTML = '<button class="btn-task-done" onclick="backToDay()">Continuer ✓</button>';
    document.getElementById("prog-fc-buttons").style.display = "";
    document.getElementById("prog-fc-rate").style.display = "none";
  }

  window.backToFicheRead = function () { if (currentDay && currentTaskIndex >= 0) openTask(currentDay, currentTaskIndex); };

  // --- Navigation ---
  window.backToProgramme = function () { initProgramme(); };
  window.backToWeek = function () { if (currentWeek) showWeekDetail(currentWeek.week); else initProgramme(); };
  window.backToDay = function () { if (currentDay) showDayTasks(currentDay); else backToWeek(); };

  // Keyboard: Enter/Space for quiz next button
  document.addEventListener("keydown", function (e) {
    const quizScreen = document.getElementById("screen-programme-quiz");
    if (quizScreen && quizScreen.classList.contains("active")) {
      const nextBtn = document.getElementById("prog-quiz-next-btn");
      if (nextBtn && nextBtn.style.display !== "none" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        nextProgQuizQuestion();
        return;
      }
      const map = { "1": 0, "2": 1, "3": 2, "4": 3, "a": 0, "b": 1, "c": 2, "d": 3 };
      if (map[e.key.toLowerCase()] !== undefined) {
        const btns = document.querySelectorAll("#prog-quiz-choices .quiz-choice-btn:not([disabled])");
        if (btns.length > 0 && btns[map[e.key.toLowerCase()]]) btns[map[e.key.toLowerCase()]].click();
      }
    }
  });

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
})();
