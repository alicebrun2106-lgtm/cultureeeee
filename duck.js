// duck.js — Le canard de CULTURE!!! sur le web
// Quand tu es sur le site, le canard habite là. Drag, clic = question.
// Réglages : skin, taille, intervalle questions, on/off.

(function () {
  const KEY = "qpuc-duck";

  // ─── ÉTAT PERSISTÉ ───
  const DEFAULTS = {
    enabled: true,
    skin: 1,           // 1 → 5
    size: "md",        // sm / md / lg
    intervalMin: 30,   // 0 = off, 5/15/30/60
    score: 0,
    position: null,    // { left, top } en px, ou null = défaut bottom-right
    autoUnlock: true,  // unlock skin selon score
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

  // Score → niveau de skin auto-débloqué
  function autoSkinFromScore(score) {
    if (score >= 100) return 5;
    if (score >= 50) return 4;
    if (score >= 25) return 3;
    if (score >= 10) return 2;
    return 1;
  }

  // Skin = {emoji principal + accessoires + libellé}
  const SKINS = {
    1: { duck: "🦆", accessory: "", label: "Canard de base" },
    2: { duck: "🦆", accessory: "🤓", label: "Canard à lunettes" },
    3: { duck: "🦆", accessory: "🎀", label: "Canard chic" },
    4: { duck: "🦆", accessory: "🎓", label: "Canard diplômé" },
    5: { duck: "🦆", accessory: "👑", label: "Canard roi" },
  };

  // ─── ÉLÉMENTS ───
  let duckEl = null;
  let bubbleEl = null;
  let timerId = null;
  let currentQuestion = null;
  let answered = false;
  let dragging = false;

  function render() {
    const s = getState();
    if (!s.enabled) {
      if (duckEl) duckEl.style.display = "none";
      if (bubbleEl) bubbleEl.style.display = "none";
      stopTimer();
      return;
    }
    ensureDom();
    duckEl.style.display = "";
    duckEl.className = "duck duck-size-" + s.size;
    // Skin
    const skin = SKINS[s.skin] || SKINS[1];
    duckEl.querySelector(".duck-emoji").textContent = skin.duck;
    duckEl.querySelector(".duck-accessory").textContent = skin.accessory;
    // Position
    if (s.position && typeof s.position.left === "number") {
      duckEl.style.left = s.position.left + "px";
      duckEl.style.top = s.position.top + "px";
      duckEl.style.right = "auto";
      duckEl.style.bottom = "auto";
    }
    // Score badge
    duckEl.querySelector(".duck-score").textContent = s.score;
    // Timer
    startTimer();
  }

  function ensureDom() {
    if (duckEl) return;
    duckEl = document.createElement("div");
    duckEl.id = "duck";
    duckEl.className = "duck duck-size-md";
    duckEl.innerHTML = `
      <div class="duck-body" title="Clique pour une question">
        <div class="duck-emoji">🦆</div>
        <div class="duck-accessory"></div>
      </div>
      <div class="duck-score-badge"><span class="duck-score">0</span></div>
    `;
    document.body.appendChild(duckEl);

    bubbleEl = document.createElement("div");
    bubbleEl.id = "duck-bubble";
    bubbleEl.className = "duck-bubble";
    bubbleEl.style.display = "none";
    document.body.appendChild(bubbleEl);

    attachInteractions();
  }

  // ─── INTERACTIONS : drag + click ───
  function attachInteractions() {
    let dragStart = null;
    let didMove = false;

    duckEl.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      dragStart = { x: e.clientX, y: e.clientY, l: duckEl.offsetLeft, t: duckEl.offsetTop };
      didMove = false;
      dragging = true;
      duckEl.classList.add("duck-dragging");
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!dragStart) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) didMove = true;
      if (didMove) {
        const newL = Math.max(0, Math.min(window.innerWidth - duckEl.offsetWidth, dragStart.l + dx));
        const newT = Math.max(0, Math.min(window.innerHeight - duckEl.offsetHeight, dragStart.t + dy));
        duckEl.style.left = newL + "px";
        duckEl.style.top = newT + "px";
        duckEl.style.right = "auto";
        duckEl.style.bottom = "auto";
        if (bubbleEl) positionBubble();
      }
    });

    document.addEventListener("mouseup", () => {
      if (!dragStart) return;
      duckEl.classList.remove("duck-dragging");
      if (didMove) {
        update({ position: { left: duckEl.offsetLeft, top: duckEl.offsetTop } });
      } else {
        // Click → question manuelle (sauf si bulle déjà ouverte)
        if (!currentQuestion) askQuestion();
        else hideBubble();
      }
      dragStart = null;
      dragging = false;
    });

    // Right-click → quick toggle menu
    duckEl.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      askQuestion();
    });
  }

  // ─── TIMER ───
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
    // 3 mauvaises réponses cohérentes (longueur similaire)
    const wrongs = [];
    const tries = allCards.slice().sort(() => Math.random() - 0.5);
    for (const c of tries) {
      if (wrongs.length >= 3) break;
      if (c.r !== card.r && !wrongs.includes(c.r) && Math.abs(c.r.length - card.r.length) < 25) {
        wrongs.push(c.r);
      }
    }
    const choices = [card.r, ...wrongs].sort(() => Math.random() - 0.5);
    return { question: card.q, correct: card.r, choices, pack: card.pack };
  }

  function askQuestion() {
    const q = pickQuestion();
    if (!q) return;
    currentQuestion = q;
    answered = false;
    bubbleEl.innerHTML = `
      <div class="duck-bubble-pack">${q.pack}</div>
      <div class="duck-bubble-q">${escapeHtml(q.question)}</div>
      <div class="duck-bubble-choices">
        ${q.choices.map((c) => `<button class="duck-choice" data-c="${escapeAttr(c)}">${escapeHtml(c)}</button>`).join("")}
      </div>
      <button class="duck-bubble-close" title="Fermer">✕</button>
    `;
    bubbleEl.style.display = "";
    positionBubble();
    bubbleEl.querySelectorAll(".duck-choice").forEach((btn) => {
      btn.onclick = () => answer(btn.dataset.c, btn);
    });
    bubbleEl.querySelector(".duck-bubble-close").onclick = hideBubble;
  }

  function answer(choice, btn) {
    if (answered) return;
    answered = true;
    const correct = choice === currentQuestion.correct;
    if (correct) {
      btn.classList.add("duck-choice-correct");
      duckEl.classList.add("duck-happy");
      const s = getState();
      const newScore = s.score + 1;
      const patch = { score: newScore };
      if (s.autoUnlock) {
        const auto = autoSkinFromScore(newScore);
        if (auto > s.skin) patch.skin = auto;
      }
      update(patch);
      render();
      if (typeof window.refreshDuckUI === "function") window.refreshDuckUI();
      setTimeout(() => duckEl.classList.remove("duck-happy"), 1500);
    } else {
      btn.classList.add("duck-choice-wrong");
      // Highlight the correct one
      bubbleEl.querySelectorAll(".duck-choice").forEach((b) => {
        if (b.dataset.c === currentQuestion.correct) b.classList.add("duck-choice-correct");
      });
      duckEl.classList.add("duck-sad");
      setTimeout(() => duckEl.classList.remove("duck-sad"), 1500);
    }
    // Disable all
    bubbleEl.querySelectorAll(".duck-choice").forEach((b) => { b.disabled = true; });
    setTimeout(hideBubble, 2200);
  }

  function hideBubble() {
    bubbleEl.style.display = "none";
    currentQuestion = null;
  }

  function positionBubble() {
    if (!duckEl || !bubbleEl) return;
    const rect = duckEl.getBoundingClientRect();
    // Try to place bubble to the LEFT of the duck, vertically aligned to top
    const bubbleW = 320;
    let left = rect.left - bubbleW - 14;
    let top = rect.top;
    if (left < 10) {
      // Not enough space on left → place above
      left = Math.max(10, Math.min(window.innerWidth - bubbleW - 10, rect.left));
      top = rect.bottom + 14;
      // If overflows bottom, place above
      if (top + 200 > window.innerHeight) top = Math.max(10, rect.top - 220);
    }
    bubbleEl.style.left = left + "px";
    bubbleEl.style.top = top + "px";
  }

  // ─── HELPERS ───
  function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function escapeAttr(s) { return String(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }

  // ─── API PUBLIQUE ───
  window.Duck = {
    getState, update,
    show: () => update({ enabled: true }) && render(),
    hide: () => update({ enabled: false }) && render(),
    ask: askQuestion,
    resetScore: () => update({ score: 0 }) && render(),
    resetPosition: () => update({ position: null }) && render(),
    SKINS,
    autoSkinFromScore,
    render,
  };

  // ─── INIT ───
  function init() {
    if (typeof FLASHCARD_PACKS === "undefined") {
      // Attendre que les données soient là
      setTimeout(init, 200);
      return;
    }
    render();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 100);
  }
})();
