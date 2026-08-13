// Quiz 12 Coups de Midi — Moteur QCM
(function () {
  let quiz = { questions: [], current: 0, score: 0, answers: [], mode: "rapide", timer: null, timeLeft: 0 };
  const QUIZ_RAPIDE_COUNT = 15;
  const QUIZ_THEME_COUNT = 15;
  const TIME_PER_QUESTION = 20; // seconds

  // --- Collect all cards as quiz source ---
  function getAllCards() {
    const cards = [];
    if (typeof FLASHCARD_PACKS !== "undefined") {
      FLASHCARD_PACKS.forEach(pack => {
        pack.cards.forEach(card => {
          cards.push({ q: card.front, r: card.back, memo: card.memo || null, packId: pack.id, packName: pack.name, difficulty: pack.difficulty || "intermediaire" });
        });
      });
    }
    return cards;
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function normalize(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  // --- Classify answer type for smart distractor matching ---
  function classifyAnswer(answer) {
    const a = answer.trim();
    // Numbers / quantities
    if (/^\d/.test(a) || /\d\s*(km|kg|m|cm|mm|ans|jours|heures|°)/.test(a)) return "number";
    // Single short proper noun (likely a name, place, animal)
    if (a.split(" ").length <= 3 && a.length < 30 && /^[A-ZÀ-Ü]/.test(a)) return "proper";
    // Short factual (Le/La/Les + noun)
    if (/^(Le |La |Les |L'|Un |Une )/.test(a) && a.length < 40) return "noun";
    // Long explanatory
    if (a.length > 50) return "long";
    return "short";
  }

  // --- Generate MCQ from flashcard data ---
  function generateMCQ(sourceCards, count) {
    const shuffled = shuffle(sourceCards);
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));

    return selected.map(card => {
      const correctType = classifyAnswer(card.r);
      const correctLen = card.r.length;
      const distractors = [];
      const usedNorm = new Set([normalize(card.r)]);

      function addDistractor(d) {
        const n = normalize(d);
        if (!usedNorm.has(n) && d.length < 80) {
          usedNorm.add(n);
          distractors.push(d);
          return true;
        }
        return false;
      }

      // Priority 1: Same pack (most plausible — same topic)
      const samePack = shuffle(
        sourceCards.filter(c => c.packId === card.packId && normalize(c.r) !== normalize(card.r)).map(c => c.r)
      );
      for (const d of samePack) { if (distractors.length >= 3) break; addDistractor(d); }

      // Priority 2: Same difficulty + similar answer type (keeps it believable)
      if (distractors.length < 3) {
        const similarType = shuffle(
          sourceCards.filter(c =>
            c.packId !== card.packId &&
            c.difficulty === card.difficulty &&
            classifyAnswer(c.r) === correctType &&
            Math.abs(c.r.length - correctLen) < 20 &&
            normalize(c.r) !== normalize(card.r)
          ).map(c => c.r)
        );
        for (const d of similarType) { if (distractors.length >= 3) break; addDistractor(d); }
      }

      // Priority 3: Same difficulty, any type but similar length
      if (distractors.length < 3) {
        const sameDiff = shuffle(
          sourceCards.filter(c =>
            c.packId !== card.packId &&
            c.difficulty === card.difficulty &&
            Math.abs(c.r.length - correctLen) < 30 &&
            normalize(c.r) !== normalize(card.r)
          ).map(c => c.r)
        );
        for (const d of sameDiff) { if (distractors.length >= 3) break; addDistractor(d); }
      }

      // Priority 4: Any card with similar answer type
      if (distractors.length < 3) {
        const anyType = shuffle(
          sourceCards.filter(c =>
            classifyAnswer(c.r) === correctType &&
            normalize(c.r) !== normalize(card.r)
          ).map(c => c.r)
        );
        for (const d of anyType) { if (distractors.length >= 3) break; addDistractor(d); }
      }

      // Last resort: any answer
      if (distractors.length < 3) {
        const any = shuffle(sourceCards.filter(c => normalize(c.r) !== normalize(card.r)).map(c => c.r));
        for (const d of any) { if (distractors.length >= 3) break; addDistractor(d); }
      }

      const choices = shuffle([card.r, ...distractors.slice(0, 3)]);
      const correctIndex = choices.findIndex(c => normalize(c) === normalize(card.r));

      return { question: card.q, choices, correctIndex, packName: card.packName, difficulty: card.difficulty, memo: card.memo || null };
    });
  }

  // --- Quiz Mode Selection ---
  window.initQuiz12Coups = function () {
    const container = document.getElementById("quiz-mode-list");
    container.innerHTML = "";

    const modes = [
      { id: "rapide", icon: "⚡", title: "Quiz Rapide", desc: `${QUIZ_RAPIDE_COUNT} questions mix, tous les thèmes` },
      { id: "progressif", icon: "📈", title: "Quiz Progressif", desc: "De débutant à expert, ça monte !" },
      { id: "theme", icon: "🎯", title: "Quiz par Thème", desc: "Choisis un thème précis" },
    ];

    modes.forEach(mode => {
      const btn = document.createElement("button");
      btn.className = "mode-card";
      btn.onclick = () => {
        if (mode.id === "theme") showThemeSelection();
        else startQuiz(mode.id);
      };
      btn.innerHTML = `<div class="mode-icon">${mode.icon}</div><div class="mode-title">${mode.title}</div><div class="mode-desc">${mode.desc}</div>`;
      container.appendChild(btn);
    });

    showScreen("quiz");
  };

  function showThemeSelection() {
    const container = document.getElementById("quiz-mode-list");
    container.innerHTML = '<button class="btn-back" onclick="initQuiz12Coups()">← Retour</button><h3 style="color:#f0c040;margin:1rem 0">Choisis un thème</h3>';

    // Group packs by name
    const packs = FLASHCARD_PACKS.filter(p => p.cards.length >= 4);
    const groups = { debutant: [], intermediaire: [], expert: [] };
    packs.forEach(p => {
      const diff = p.difficulty || "intermediaire";
      if (groups[diff]) groups[diff].push(p);
    });

    ["debutant", "intermediaire", "expert"].forEach(level => {
      if (groups[level].length === 0) return;
      const label = level === "debutant" ? "Débutant" : level === "intermediaire" ? "Intermédiaire" : "Expert";
      container.innerHTML += `<div class="quiz-theme-level"><span class="diff-badge diff-${level}">${label}</span></div>`;
      groups[level].forEach(pack => {
        const btn = document.createElement("button");
        btn.className = "quiz-theme-btn";
        btn.innerHTML = `<span>${pack.icon}</span> ${pack.name} <span class="quiz-theme-count">${pack.cards.length} q</span>`;
        btn.onclick = () => startQuiz("theme", pack.id);
        container.appendChild(btn);
      });
    });
  }

  // --- Start Quiz ---
  function startQuiz(mode, packId) {
    const allCards = getAllCards();
    let questions = [];

    if (mode === "rapide") {
      questions = generateMCQ(allCards, QUIZ_RAPIDE_COUNT);
    } else if (mode === "progressif") {
      const easy = allCards.filter(c => c.difficulty === "debutant");
      const mid = allCards.filter(c => c.difficulty === "intermediaire");
      const hard = allCards.filter(c => c.difficulty === "expert");
      questions = [
        ...generateMCQ(easy, 5),
        ...generateMCQ(mid, 5),
        ...generateMCQ(hard, 5),
      ];
    } else if (mode === "theme" && packId) {
      const packCards = allCards.filter(c => c.packId === packId);
      questions = generateMCQ(packCards, QUIZ_THEME_COUNT);
    }

    if (questions.length === 0) return;

    quiz = { questions, current: 0, score: 0, answers: [], mode, timer: null, timeLeft: TIME_PER_QUESTION };

    document.getElementById("quiz-session-title").textContent =
      mode === "rapide" ? "Quiz Rapide ⚡" :
      mode === "progressif" ? "Quiz Progressif 📈" :
      "Quiz par Thème 🎯";

    showQuizQuestion();
    showScreen("quiz-session");
  }

  // --- Show Question ---
  function showQuizQuestion() {
    const q = quiz.questions[quiz.current];
    document.getElementById("quiz-progress").textContent = `${quiz.current + 1} / ${quiz.questions.length}`;
    document.getElementById("quiz-score-display").textContent = `Score : ${quiz.score}`;
    document.getElementById("quiz-question-text").textContent = q.question;

    // Difficulty badge
    const badgeEl = document.getElementById("quiz-diff-badge");
    if (badgeEl) {
      const d = q.difficulty || "intermediaire";
      badgeEl.className = "diff-badge diff-" + d;
      badgeEl.textContent = d === "debutant" ? "Débutant" : d === "intermediaire" ? "Intermédiaire" : "Expert";
    }

    // Theme badge
    const themeEl = document.getElementById("quiz-theme-badge");
    if (themeEl) themeEl.textContent = q.packName || "";

    const choicesContainer = document.getElementById("quiz-choices");
    choicesContainer.innerHTML = "";
    const letters = ["A", "B", "C", "D"];

    q.choices.forEach((choice, i) => {
      const btn = document.createElement("button");
      btn.className = "quiz-choice-btn";
      btn.innerHTML = `<span class="quiz-choice-letter">${letters[i]}</span><span class="quiz-choice-text">${choice}</span>`;
      btn.onclick = () => selectAnswer(i);
      choicesContainer.appendChild(btn);
    });

    // Feedback area
    document.getElementById("quiz-feedback").innerHTML = "";
    document.getElementById("quiz-feedback").className = "quiz-feedback";
    document.getElementById("quiz-next-btn").style.display = "none";

    // Timer
    startTimer();
  }

  function startTimer() {
    clearInterval(quiz.timer);
    quiz.timeLeft = TIME_PER_QUESTION;
    updateTimerDisplay();
    quiz.timer = setInterval(() => {
      quiz.timeLeft--;
      updateTimerDisplay();
      if (quiz.timeLeft <= 0) {
        clearInterval(quiz.timer);
        selectAnswer(-1); // timeout
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const bar = document.getElementById("quiz-timer-fill");
    if (bar) {
      const pct = (quiz.timeLeft / TIME_PER_QUESTION) * 100;
      bar.style.width = pct + "%";
      bar.style.background = pct > 50 ? "#2ecc71" : pct > 25 ? "#f39c12" : "#e74c3c";
    }
    const text = document.getElementById("quiz-timer-text");
    if (text) text.textContent = quiz.timeLeft + "s";
  }

  // --- Answer Selection ---
  function selectAnswer(choiceIndex) {
    clearInterval(quiz.timer);
    const q = quiz.questions[quiz.current];
    const correct = choiceIndex === q.correctIndex;
    const timeout = choiceIndex === -1;
    if (window.CultureSound) window.CultureSound.play(correct ? "correct" : "wrong");

    if (correct) quiz.score++;

    quiz.answers.push({ question: q.question, correct, userChoice: choiceIndex, correctIndex: q.correctIndex, choices: q.choices });

    // Highlight buttons
    const btns = document.querySelectorAll(".quiz-choice-btn");
    btns.forEach((btn, i) => {
      btn.disabled = true;
      if (i === q.correctIndex) btn.classList.add("quiz-choice-correct");
      if (i === choiceIndex && !correct) btn.classList.add("quiz-choice-wrong");
    });

    // Feedback — show memo from card data first, fallback to MEMO lookup
    const fb = document.getElementById("quiz-feedback");
    function getMemoHtml() {
      // Priority 1: memo from the card itself
      if (q.memo) return '<div class="quiz-memo-tip">🧠 ' + q.memo + '</div>';
      // Priority 2: MEMO module lookup
      if (typeof MEMO !== "undefined") {
        const m = MEMO.generateMemo(q.question, q.choices[q.correctIndex]);
        if (m) return '<div class="quiz-memo-tip">' + m + '</div>';
      }
      return "";
    }
    if (timeout) {
      fb.innerHTML = "⏰ Temps écoulé ! La réponse était : <strong>" + q.choices[q.correctIndex] + "</strong>" + getMemoHtml();
      fb.className = "quiz-feedback quiz-feedback-wrong";
    } else if (correct) {
      const mh = getMemoHtml();
      fb.innerHTML = "✅ Bonne réponse !" + (mh ? mh : "");
      fb.className = "quiz-feedback quiz-feedback-correct";
    } else {
      fb.innerHTML = "❌ Raté ! La bonne réponse était : <strong>" + q.choices[q.correctIndex] + "</strong>" + getMemoHtml();
      fb.className = "quiz-feedback quiz-feedback-wrong";
    }

    document.getElementById("quiz-next-btn").style.display = "";
  }

  window.nextQuizQuestion = function () {
    quiz.current++;
    if (quiz.current >= quiz.questions.length) {
      showQuizResult();
    } else {
      showQuizQuestion();
    }
  };

  // --- Result ---
  function showQuizResult() {
    clearInterval(quiz.timer);
    const total = quiz.questions.length;
    const pct = Math.round((quiz.score / total) * 100);

    document.getElementById("quiz-result-score").textContent = `${quiz.score} / ${total}`;
    document.getElementById("quiz-result-pct").textContent = `${pct}%`;
    document.getElementById("quiz-result-msg").textContent =
      pct >= 80 ? "Excellent ! Tu es prêt(e) !" :
      pct >= 60 ? "Bien joué ! Continue !" :
      pct >= 40 ? "Pas mal, mais révise encore !" :
      "Continue à t'entraîner !";

    // Wrong answers review
    const reviewContainer = document.getElementById("quiz-result-review");
    reviewContainer.innerHTML = "";
    const wrong = quiz.answers.filter(a => !a.correct);
    if (wrong.length > 0) {
      reviewContainer.innerHTML = "<h3>À retenir :</h3>";
      wrong.forEach(a => {
        const div = document.createElement("div");
        div.className = "quiz-review-item";
        div.innerHTML = `<div class="quiz-review-q">${a.question}</div><div class="quiz-review-a">→ ${a.choices[a.correctIndex]}</div>`;
        reviewContainer.appendChild(div);
      });
    }

    // Update stats
    try {
      const stats = JSON.parse(localStorage.getItem("qpuc-stats") || "{}");
      stats.quizzes = (stats.quizzes || 0) + 1;
      stats.quizCorrect = (stats.quizCorrect || 0) + quiz.score;
      stats.quizTotal = (stats.quizTotal || 0) + total;
      localStorage.setItem("qpuc-stats", JSON.stringify(stats));
    } catch (e) {}

    showScreen("quiz-result");
  }

  window.backToQuizModes = function () { initQuiz12Coups(); };
  window.replayQuiz = function () { startQuiz(quiz.mode); };

  // Keyboard: A/B/C/D or 1/2/3/4
  document.addEventListener("keydown", function (e) {
    const qScreen = document.getElementById("screen-quiz-session");
    if (!qScreen || !qScreen.classList.contains("active")) return;

    const nextBtn = document.getElementById("quiz-next-btn");
    if (nextBtn && nextBtn.style.display !== "none") {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); nextQuizQuestion(); return; }
    }

    const map = { "1": 0, "2": 1, "3": 2, "4": 3, "a": 0, "b": 1, "c": 2, "d": 3 };
    if (map[e.key.toLowerCase()] !== undefined) {
      const btns = document.querySelectorAll(".quiz-choice-btn:not([disabled])");
      if (btns.length > 0) selectAnswer(map[e.key.toLowerCase()]);
    }
  });
})();
