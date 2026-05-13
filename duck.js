// duck.js — Le canard CULTURE!!! (version web)
// Utilise les MÊMES sprites que l'app Electron (canard de bureau) :
// assets/duck-1.png|webp à duck-4.png|webp + chaîne de fallback.
// Animations identiques : breathe, happy, sad, petted, heart.
//
// Différences avec la version desktop :
// - Position en CSS (pas de fenêtre Electron à déplacer)
// - Questions piochées dans FLASHCARD_PACKS au lieu de questions.json
// - Settings dans localStorage (clé "qpuc-duck")

(function () {
  const KEY = "qpuc-duck";

  // ─── ÉTAT PERSISTÉ ───
  const DEFAULTS = {
    enabled: false, // PAS de canard sur le site. Source de vérité : app desktop uniquement.
    forcedLevel: null,   // null = auto (selon score), sinon 1-4
    size: "md",          // sm / md / lg
    intervalMin: 30,     // 0 = off, 5/15/30/60
    score: 0,
    position: null,      // { left, top } en px, ou null = défaut bottom-center
  };

  function getState() {
    try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY)) || {}); }
    catch { return Object.assign({}, DEFAULTS); }
  }
  function saveState(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
  function update(patch) {
    const s = getState();
    Object.assign(s, patch);
    saveState(s);
    return s;
  }

  // Score → niveau (1..4) — comme dans l'app desktop
  function levelFromScore(s) {
    if (s >= 100) return 4;
    if (s >= 50) return 3;
    if (s >= 25) return 2;
    return 1;
  }

  // Niveau effectif : si forcé manuellement, on prend ce niveau
  function currentLevel() {
    const s = getState();
    return s.forcedLevel || levelFromScore(s.score);
  }

  // Sprite info pour la page de réglages
  const LEVEL_INFO = {
    1: { label: "Canard de base", min: 0 },
    2: { label: "Canard à lunettes", min: 25 },
    3: { label: "Canard chic", min: 50 },
    4: { label: "Canard diplômé", min: 100 },
  };

  // ─── ÉLÉMENTS DOM ───
  let container = null;
  let imgEl = null;
  let fallbackEl = null;
  let badgeEl = null;
  let bubbleEl = null;
  let timerId = null;
  let movementTimerId = null;
  let movementMode = "still"; // still | walking
  let currentQuestion = null;
  let answered = false;

  // Durées (réduites pour la web)
  const STILL_MIN_MS = 8 * 1000;
  const STILL_MAX_MS = 25 * 1000;
  const WALK_MIN_MS = 3 * 1000;
  const WALK_MAX_MS = 7 * 1000;

  // ─── RENDER ───
  function ensureDom() {
    if (container) return;

    // Bulle
    bubbleEl = document.createElement("div");
    bubbleEl.id = "duck-bubble";
    bubbleEl.className = "duck-bubble duck-bubble-hidden";
    bubbleEl.innerHTML = `
      <div class="duck-bubble-category">Catégorie</div>
      <div class="duck-bubble-question">Question…</div>
      <div class="duck-bubble-answers"></div>
      <button class="duck-bubble-close" title="Fermer">✕</button>
    `;
    document.body.appendChild(bubbleEl);

    // Container canard
    container = document.createElement("div");
    container.id = "duck-container";
    container.className = "duck-container duck-size-md";
    container.innerHTML = `
      <div class="duck-badge" id="duck-badge">
        <span class="duck-badge-level">N1</span>
        <span class="duck-badge-score">0 pts</span>
      </div>
      <img class="duck-img" id="duck-img" alt="Canard" draggable="false">
      <div class="duck-fallback" id="duck-fallback" style="display:none">🦆</div>
    `;
    document.body.appendChild(container);

    imgEl = container.querySelector(".duck-img");
    fallbackEl = container.querySelector(".duck-fallback");
    badgeEl = container.querySelector(".duck-badge");

    attachInteractions();
  }

  function render() {
    const s = getState();
    if (!s.enabled) {
      if (container) container.style.display = "none";
      if (bubbleEl) bubbleEl.style.display = "none";
      stopTimer();
      stopMovement();
      return;
    }
    ensureDom();
    container.style.display = "";
    container.className = "duck-container duck-size-" + s.size;

    // Position
    if (s.position && typeof s.position.left === "number") {
      container.style.left = s.position.left + "px";
      container.style.top = s.position.top + "px";
      container.style.right = "auto";
      container.style.bottom = "auto";
      container.style.transform = "none";
    } else {
      // Position par défaut : bas-centre
      container.style.left = "";
      container.style.top = "";
      container.style.right = "30px";
      container.style.bottom = "30px";
      container.style.transform = "";
    }

    // Sprite + badge
    refreshDuckSprite();
    startTimer();
    startMovement();
  }

  // ─── SPRITE LOADING avec fallback chain ───
  function setDuckImage(level, mode) {
    if (!imgEl) return;
    const candidates = [];
    for (let lvl = level; lvl >= 1; lvl--) {
      if (mode === "still") {
        candidates.push(`assets/duck-${lvl}.png`);
      } else {
        candidates.push(`assets/duck-${lvl}.webp`, `assets/duck-${lvl}.png`);
      }
    }
    let idx = 0;
    imgEl.style.display = "";
    fallbackEl.style.display = "none";
    imgEl.onerror = () => {
      idx += 1;
      if (idx < candidates.length) {
        imgEl.src = candidates[idx];
      } else {
        imgEl.onerror = null;
        imgEl.style.display = "none";
        fallbackEl.style.display = "flex";
      }
    };
    imgEl.onload = () => {
      const isAnimated = imgEl.currentSrc && imgEl.currentSrc.endsWith(".webp");
      container.classList.toggle("animated", isAnimated);
    };
    imgEl.src = candidates[0];
  }

  function refreshDuckSprite() {
    const lvl = currentLevel();
    setDuckImage(lvl, movementMode);
    if (badgeEl) {
      badgeEl.querySelector(".duck-badge-level").textContent = "N" + lvl;
      badgeEl.querySelector(".duck-badge-score").textContent = getState().score + " pts";
    }
  }

  // ─── MOUVEMENT (alternance marche/immobile) ───
  function startMovement() {
    stopMovement();
    scheduleNextMovementToggle();
  }
  function stopMovement() {
    if (movementTimerId) { clearTimeout(movementTimerId); movementTimerId = null; }
  }
  function scheduleNextMovementToggle() {
    const isStill = movementMode === "still";
    const min = isStill ? STILL_MIN_MS : WALK_MIN_MS;
    const max = isStill ? STILL_MAX_MS : WALK_MAX_MS;
    const delay = min + Math.random() * (max - min);
    movementTimerId = setTimeout(toggleMovement, delay);
  }
  function toggleMovement() {
    movementMode = movementMode === "still" ? "walking" : "still";
    setDuckImage(currentLevel(), movementMode);
    scheduleNextMovementToggle();
  }

  // ─── TIMER QUESTIONS ───
  function startTimer() {
    stopTimer();
    const s = getState();
    if (!s.intervalMin || s.intervalMin === 0) return;
    timerId = setInterval(() => {
      if (!currentQuestion) askQuestion();
    }, s.intervalMin * 60 * 1000);
  }
  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  // ─── INTERACTIONS : drag, clic (caresse), clic droit ───
  const DRAG_THRESHOLD = 4;
  function attachInteractions() {
    let dragStart = null;

    container.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      if (e.target.closest("#duck-bubble")) return;
      dragStart = {
        x: e.clientX, y: e.clientY,
        left: container.offsetLeft, top: container.offsetTop,
        moved: 0,
      };
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!dragStart) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      dragStart.moved = Math.max(dragStart.moved, Math.hypot(dx, dy));
      if (dragStart.moved >= DRAG_THRESHOLD) {
        const newL = Math.max(0, Math.min(window.innerWidth - container.offsetWidth, dragStart.left + dx));
        const newT = Math.max(0, Math.min(window.innerHeight - container.offsetHeight, dragStart.top + dy));
        container.style.left = newL + "px";
        container.style.top = newT + "px";
        container.style.right = "auto";
        container.style.bottom = "auto";
        container.style.transform = "none";
        if (bubbleEl && !bubbleEl.classList.contains("duck-bubble-hidden")) positionBubble();
      }
    });

    document.addEventListener("mouseup", () => {
      if (!dragStart) return;
      const moved = dragStart.moved;
      dragStart = null;
      if (moved < DRAG_THRESHOLD) {
        // Clic court : caresse OU question selon si la bulle est ouverte
        if (currentQuestion) hideBubble();
        else petDuck();
      } else {
        // Drag fini → sauvegarder la position
        update({ position: { left: container.offsetLeft, top: container.offsetTop } });
      }
    });

    // Clic droit = question manuelle
    container.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (!currentQuestion) askQuestion();
    });
  }

  // ─── CARESSE (petted + heart) ───
  function petDuck() {
    container.classList.remove("petted", "happy", "sad");
    void container.offsetWidth; // re-trigger animation
    container.classList.add("petted");
    setTimeout(() => container.classList.remove("petted"), 500);
    spawnHeart();
  }

  function spawnHeart() {
    const heart = document.createElement("div");
    heart.className = "duck-heart";
    heart.textContent = "❤";
    const dx = (Math.random() - 0.5) * 36;
    const scale = 0.85 + Math.random() * 0.3;
    heart.style.setProperty("--dx", dx.toFixed(1) + "px");
    heart.style.setProperty("--s", scale.toFixed(2));
    // Position relative au canard
    const rect = container.getBoundingClientRect();
    heart.style.left = (rect.left + rect.width / 2) + "px";
    heart.style.top = (rect.top - 10) + "px";
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 1400);
  }

  // ─── RÉACTIONS ───
  function reactHappy() {
    container.classList.remove("sad");
    container.classList.add("happy");
    setTimeout(() => container.classList.remove("happy"), 700);
  }
  function reactSad() {
    container.classList.remove("happy");
    container.classList.add("sad");
    setTimeout(() => container.classList.remove("sad"), 700);
  }
  function flashBadge() {
    if (!badgeEl) return;
    badgeEl.classList.add("show");
    setTimeout(() => badgeEl.classList.remove("show"), 1800);
  }

  // ─── QUESTION (QCM depuis FLASHCARD_PACKS) ───
  function pickQuestion() {
    if (typeof FLASHCARD_PACKS === "undefined") return null;
    const allCards = [];
    FLASHCARD_PACKS.forEach((p) => {
      p.cards.forEach((c) => {
        if (c.front && c.back && c.back.length < 80) {
          allCards.push({ q: c.front, r: c.back, pack: p.name });
        }
      });
    });
    if (allCards.length === 0) return null;
    const card = allCards[Math.floor(Math.random() * allCards.length)];
    const wrongs = [];
    const tries = allCards.slice().sort(() => Math.random() - 0.5);
    for (const c of tries) {
      if (wrongs.length >= 3) break;
      if (c.r !== card.r && !wrongs.includes(c.r) && Math.abs(c.r.length - card.r.length) < 25) {
        wrongs.push(c.r);
      }
    }
    const answers = [card.r, ...wrongs].sort(() => Math.random() - 0.5);
    const correctIdx = answers.indexOf(card.r);
    return { question: card.q, answers, correct: correctIdx, category: card.pack };
  }

  function askQuestion() {
    const q = pickQuestion();
    if (!q) return;
    currentQuestion = q;
    answered = false;

    bubbleEl.querySelector(".duck-bubble-category").textContent = q.category || "—";
    bubbleEl.querySelector(".duck-bubble-question").textContent = q.question;

    const answersDiv = bubbleEl.querySelector(".duck-bubble-answers");
    answersDiv.innerHTML = "";
    q.answers.forEach((text, idx) => {
      const btn = document.createElement("button");
      btn.className = "duck-answer-btn";
      btn.type = "button";
      btn.textContent = text;
      btn.addEventListener("click", () => onAnswer(idx));
      answersDiv.appendChild(btn);
    });

    bubbleEl.querySelector(".duck-bubble-close").onclick = hideBubble;
    bubbleEl.classList.remove("duck-bubble-hidden");
    positionBubble();
  }

  function onAnswer(idx) {
    if (answered) return;
    answered = true;
    const q = currentQuestion;
    const btns = bubbleEl.querySelectorAll(".duck-answer-btn");
    btns.forEach((b, i) => {
      b.disabled = true;
      if (i === q.correct) b.classList.add("correct");
      else if (i === idx) b.classList.add("wrong");
    });
    if (idx === q.correct) {
      const s = getState();
      const newScore = s.score + 1;
      update({ score: newScore });
      reactHappy();
      flashBadge();
      refreshDuckSprite();
      if (typeof window.refreshDuckUI === "function") window.refreshDuckUI();
    } else {
      reactSad();
    }
    setTimeout(hideBubble, 2200);
  }

  function hideBubble() {
    bubbleEl.classList.add("duck-bubble-hidden");
    currentQuestion = null;
    answered = false;
  }

  function positionBubble() {
    if (!container || !bubbleEl) return;
    const rect = container.getBoundingClientRect();
    const bubbleW = 240;
    // Par défaut : au-dessus du canard, centré
    let left = rect.left + rect.width / 2 - bubbleW / 2;
    let top = rect.top - 170;
    // Si déborde à gauche
    if (left < 10) left = 10;
    // Si déborde à droite
    if (left + bubbleW > window.innerWidth - 10) left = window.innerWidth - bubbleW - 10;
    // Si déborde en haut → placer sous le canard
    if (top < 10) top = rect.bottom + 14;
    bubbleEl.style.left = left + "px";
    bubbleEl.style.top = top + "px";
  }

  // ─── API PUBLIQUE ───
  window.Duck = {
    getState, update,
    show: () => { update({ enabled: true }); render(); },
    hide: () => { update({ enabled: false }); render(); },
    ask: askQuestion,
    pet: petDuck,
    resetScore: () => { update({ score: 0 }); render(); },
    resetPosition: () => { update({ position: null }); render(); },
    levelFromScore, currentLevel,
    LEVEL_INFO,
    render,
  };

  // ─── INIT ───
  // Force la désactivation : on ne veut PAS de canard sur le site par défaut.
  // L'app desktop est la source de vérité.
  // Le code reste intact pour pouvoir réactiver plus tard si besoin.
  function forceDisable() {
    update({ enabled: false });
  }

  function init() {
    forceDisable();
    // Appel render() défensif : si du DOM canard est resté d'une version précédente,
    // il sera caché. Pas de création vu que enabled=false.
    try { render(); } catch (e) {}
    // Sécurité ultime : retire tout DOM canard résiduel
    setTimeout(() => {
      const d = document.getElementById("duck-container");
      if (d) d.style.display = "none";
      const b = document.getElementById("duck-bubble");
      if (b) b.style.display = "none";
    }, 50);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 100);
  }
})();
