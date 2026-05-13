// culture-app.js — Orchestre la nouvelle app CULTURE!!!
// - Navigation entre pages (Trouver / Mes paquets / Cartes / Session / Result)
// - Rendu des decks à partir de FLASHCARD_PACKS
// - Session flashcard (utilise SRS existant + gamification)

(function () {
  const SRS_KEY = "qpuc-srs";

  // ─── DECK SVG ILLUSTRATIONS — 8 designs EXACTS du zip Claude Design ───
  const SVG_DESIGNS = {
    // [fig.2.1] Colonnes — Histoire / Antiquité
    columns: '<g fill="#0a0a0a"><rect x="32" y="14" width="36" height="6"/><rect x="28" y="20" width="44" height="6"/><rect x="38" y="26" width="6" height="40"/><rect x="56" y="26" width="6" height="40"/><rect x="28" y="66" width="44" height="6"/><rect x="32" y="72" width="36" height="6"/></g>',
    // [fig.2.2] Livres empilés — Histoire / Révolutions
    books: '<g fill="#0a0a0a" stroke="none"><rect x="20" y="30" width="60" height="4"/><rect x="20" y="44" width="60" height="4"/><rect x="20" y="58" width="60" height="4"/><rect x="26" y="34" width="10" height="10"/><rect x="46" y="34" width="10" height="10"/><rect x="66" y="34" width="10" height="10"/><rect x="36" y="48" width="10" height="10"/><rect x="56" y="48" width="10" height="10"/></g>',
    // [fig.2.3] Globe boussole — Géographie
    globe: '<circle cx="50" cy="45" r="30" fill="none" stroke="#0a0a0a" stroke-width="3"/><path d="M20 45 H80 M50 15 V75 M28 28 L72 62 M28 62 L72 28" stroke="#0a0a0a" stroke-width="2" fill="none"/>',
    // [fig.2.4] Atomes orbites — Sciences / Trous noirs
    atoms: '<g fill="none" stroke="#0a0a0a" stroke-width="3"><ellipse cx="50" cy="45" rx="32" ry="14"/><ellipse cx="50" cy="45" rx="32" ry="14" transform="rotate(60 50 45)"/><ellipse cx="50" cy="45" rx="32" ry="14" transform="rotate(-60 50 45)"/></g><rect x="46" y="41" width="8" height="8" fill="#0a0a0a"/>',
    // [fig.2.5] Cadre peinture — Arts / Cinéma
    frame: '<g fill="#0a0a0a"><rect x="20" y="22" width="60" height="46" fill="none" stroke="#0a0a0a" stroke-width="3"/><rect x="26" y="28" width="10" height="10"/><rect x="40" y="28" width="10" height="10"/><rect x="54" y="28" width="10" height="10"/><rect x="68" y="28" width="6" height="10"/><rect x="28" y="48" width="40" height="14"/></g>',
    // [fig.2.6] Livre ouvert avec lignes — Littérature / Langue
    book: '<g fill="#0a0a0a"><rect x="30" y="20" width="40" height="50" fill="none" stroke="#0a0a0a" stroke-width="3"/><rect x="36" y="28" width="28" height="2"/><rect x="36" y="36" width="28" height="2"/><rect x="36" y="44" width="22" height="2"/><rect x="36" y="52" width="28" height="2"/><rect x="36" y="60" width="18" height="2"/></g>',
    // [fig.2.7] Bar chart — Économie / Sport / Trivia / Musique
    bars: '<g fill="#0a0a0a"><rect x="22" y="56" width="6" height="14"/><rect x="34" y="46" width="6" height="24"/><rect x="46" y="34" width="6" height="36"/><rect x="58" y="22" width="6" height="48"/><rect x="70" y="14" width="6" height="56"/><rect x="20" y="74" width="60" height="3"/></g>',
    // [fig.2.8] Temple noir — Philosophie (variante k, blanche sur noir)
    temple: '<g fill="#fff"><rect x="40" y="22" width="20" height="4"/><rect x="36" y="26" width="28" height="4"/><rect x="32" y="30" width="36" height="4"/><rect x="28" y="34" width="44" height="4"/><rect x="44" y="38" width="12" height="32"/></g>',
  };

  // ─── MAPPING CHAPITRE → SVG + COULEURS ───
  // Toujours sur les 8 designs originaux
  const CHAPTER_STYLE = {
    france: { svg: "columns", colors: ["y", "w", "l"] },
    monde: { svg: "globe", colors: ["m", "v", "w"] },
    sciences: { svg: "atoms", colors: ["v", "m", "p"] },
    musique: { svg: "bars", colors: ["p", "l", "y"] },
    cinema: { svg: "frame", colors: ["p", "k", "v"] },
    sport: { svg: "bars", colors: ["y", "m", "l"] },
    "arts-litt": { svg: "frame", colors: ["p", "v", "w"] },
    langue: { svg: "book", colors: ["w", "y", "m"] },
    "philo-mytho": { svg: "temple", colors: ["k", "k", "k"] },
    maritime: { svg: "globe", colors: ["m", "v", "w"] },
    trivia: { svg: "bars", colors: ["g", "y", "p"] },
    "douze-coups": { svg: "books", colors: ["y", "p", "l"] },
  };

  function deckStyleFor(packId) {
    const chId = (typeof PACK_TO_CHAPTER !== "undefined" && PACK_TO_CHAPTER[packId]) || "trivia";
    const style = CHAPTER_STYLE[chId] || CHAPTER_STYLE.trivia;
    // Pick a color variant based on hash of pack id
    let h = 0;
    for (let i = 0; i < packId.length; i++) h = (h * 31 + packId.charCodeAt(i)) | 0;
    const color = style.colors[Math.abs(h) % style.colors.length];
    return { color, svg: style.svg };
  }

  // ─── HELPERS DATA ───
  function getCardKey(pid, idx) { return pid + ":" + idx; }

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

  /**
   * Source unique de vérité pour la maîtrise d'un pack.
   * Retourne :
   *   - totalCards    : nb total de cartes
   *   - seenCards     : cartes vues au moins une fois
   *   - newCards      : cartes jamais vues
   *   - dueToday      : cartes vues + due maintenant (à réviser)
   *   - masteredCards : cartes solides (reps ≥ 3 et pas due)
   *   - weakCards     : cartes vues mais faibles (reps < 2 ou ef bas) — souvent dues
   *   - masteryPercent: score 0-100 (moyenne pondérée)
   *   - statusLabel   : "Nouveau" / "En cours" / "À consolider" / "Solide" / "Maîtrisé"
   *   - isDoneForToday: true si pas de cartes dues + activité aujourd'hui
   *   - lastPlayed    : timestamp dernière session
   */
  window.getPackMastery = function (packId) {
    const pack = (typeof FLASHCARD_PACKS !== "undefined") ? FLASHCARD_PACKS.find((p) => p.id === packId) : null;
    if (!pack) return null;
    const rawTotal = pack.cards.length;
    const deletedSet = getDeletedSet();
    let total = 0;
    for (let i = 0; i < rawTotal; i++) {
      if (!deletedSet.has(packId + ":" + i)) total++;
    }
    const srs = SRS.getData(SRS_KEY) || {};
    const now = Date.now();
    let seen = 0, due = 0, mastered = 0, weak = 0;
    let scoreSum = 0;
    for (let i = 0; i < rawTotal; i++) {
      if (deletedSet.has(packId + ":" + i)) continue;
      const st = srs[getCardKey(packId, i)];
      if (!st) continue; // never seen
      seen++;
      const isDue = (st.next || 0) <= now;
      if (isDue) due++;
      // Per-card mastery score (0-100) :
      // reps=0 et vu → ~10 ; reps=1 → 30 ; reps=2 → 55 ; reps=3 → 80 ; reps≥4 → 95
      // bonus si ef élevé (jusqu'à +5), malus si due maintenant (-15)
      let cardScore = 0;
      if (st.reps >= 4) cardScore = 95;
      else if (st.reps === 3) cardScore = 80;
      else if (st.reps === 2) cardScore = 55;
      else if (st.reps === 1) cardScore = 30;
      else cardScore = 10; // reps 0 mais vue
      const efBonus = Math.max(0, Math.min(5, (st.ef - 2.5) * 5));
      cardScore += efBonus;
      if (isDue) cardScore -= 15;
      cardScore = Math.max(0, Math.min(100, Math.round(cardScore)));
      scoreSum += cardScore;
      // Master / weak
      if (st.reps >= 3 && !isDue) mastered++;
      if (st.reps < 2 || (st.ef && st.ef < 2.0)) weak++;
    }
    const newCards = total - seen;
    // Mastery percent : moyenne des scores cartes + pénalité pour les non-vues
    const seenAvg = seen > 0 ? scoreSum / seen : 0;
    const coverage = total > 0 ? seen / total : 0;
    // mastery = avg des cartes vues * coverage (les non-vues comptent 0)
    const masteryPercent = Math.round(seenAvg * coverage);

    // Status label
    let statusLabel;
    if (seen === 0) statusLabel = "Nouveau";
    else if (masteryPercent >= 90) statusLabel = "Maîtrisé";
    else if (masteryPercent >= 65) statusLabel = "Solide";
    else if (masteryPercent >= 30) statusLabel = "À consolider";
    else statusLabel = "En cours";

    const lastPlayed = getPackLastPlayed(packId);
    const isDoneForToday = (seen > 0 && due === 0 && isToday(lastPlayed));

    return {
      totalCards: total,
      seenCards: seen,
      newCards,
      dueToday: due,
      masteredCards: mastered,
      weakCards: weak,
      masteryPercent,
      statusLabel,
      isDoneForToday,
      lastPlayed,
      isStarted: seen > 0,
    };
  };

  // Compat wrappers (utilisés par d'autres modules)
  function getMastery(packId, total) {
    const m = window.getPackMastery(packId);
    return m ? m.masteryPercent : 0;
  }
  function getStarted(packId) {
    const m = window.getPackMastery(packId);
    return m ? m.isStarted : false;
  }
  function isPackDoneToday(pack) {
    const m = window.getPackMastery(pack.id);
    return m ? m.isDoneForToday : false;
  }
  function getPackChapter(packId) {
    if (typeof PACK_TO_CHAPTER !== "undefined" && PACK_TO_CHAPTER[packId]) {
      const id = PACK_TO_CHAPTER[packId];
      const ch = CHAPTERS && CHAPTERS.find ? CHAPTERS.find((c) => c.id === id) : null;
      return ch ? ch.name : id;
    }
    return "Divers";
  }

  // ─── COLLECTION : packs ajoutés à "Mes paquets" ───
  const ADDED_KEY = "qpuc-added-packs";
  function getAddedPacks() {
    try {
      const arr = JSON.parse(localStorage.getItem(ADDED_KEY));
      return Array.isArray(arr) ? arr : null;
    } catch { return null; }
  }
  function saveAddedPacks(arr) {
    localStorage.setItem(ADDED_KEY, JSON.stringify(arr));
  }
  // Migration : si pas encore initialisé, ajoute auto tous les packs déjà commencés
  function ensureAddedPacksInit() {
    if (getAddedPacks() !== null) return;
    if (typeof FLASHCARD_PACKS === "undefined") return;
    const auto = FLASHCARD_PACKS.filter((p) => getStarted(p.id)).map((p) => p.id);
    saveAddedPacks(auto);
  }
  function isPackAdded(packId) {
    const arr = getAddedPacks();
    if (arr === null) {
      // Fallback : tant que non initialisé, on considère "ajouté" si démarré
      return getStarted(packId);
    }
    return arr.includes(packId);
  }
  function addPack(packId) {
    ensureAddedPacksInit();
    const arr = getAddedPacks() || [];
    if (!arr.includes(packId)) {
      arr.push(packId);
      saveAddedPacks(arr);
    }
  }
  function removePack(packId) {
    ensureAddedPacksInit();
    const arr = (getAddedPacks() || []).filter((id) => id !== packId);
    saveAddedPacks(arr);
  }
  window.isPackAdded = isPackAdded;
  window.addPack = addPack;
  window.removePack = removePack;

  // ─── CARTES SUPPRIMÉES ───
  // L'utilisateur peut supprimer des cartes trop simples. On garde un set d'IDs
  // (packId:idx) dans localStorage. Ces cartes sont exclues des sessions.
  const DELETED_KEY = "qpuc-deleted-cards";
  function getDeletedSet() {
    try {
      const arr = JSON.parse(localStorage.getItem(DELETED_KEY));
      return new Set(Array.isArray(arr) ? arr : []);
    } catch { return new Set(); }
  }
  function saveDeletedSet(set) {
    localStorage.setItem(DELETED_KEY, JSON.stringify([...set]));
  }
  function isCardDeleted(packId, idx) {
    return getDeletedSet().has(packId + ":" + idx);
  }
  function markCardDeleted(packId, idx) {
    const set = getDeletedSet();
    set.add(packId + ":" + idx);
    saveDeletedSet(set);
  }
  function unmarkCardDeleted(packId, idx) {
    const set = getDeletedSet();
    set.delete(packId + ":" + idx);
    saveDeletedSet(set);
  }
  window.isCardDeleted = isCardDeleted;
  window.markCardDeleted = markCardDeleted;
  window.unmarkCardDeleted = unmarkCardDeleted;

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
  function buildDeck(pack, opts) {
    opts = opts || {};
    const showAddBtn = !!opts.showAddBtn; // visible sur Trouver
    const added = isPackAdded(pack.id);
    const m = window.getPackMastery(pack.id);
    const cat = getPackChapter(pack.id).toUpperCase();
    const style = deckStyleFor(pack.id);
    const color = style.color;
    const svg = SVG_DESIGNS[style.svg] || SVG_DESIGNS.book;
    const mastery = m.masteryPercent;
    // Mastery in 10 segments
    const segs = Math.round(mastery / 10);
    let metaHtml = "";
    for (let i = 0; i < 10; i++) metaHtml += `<span class="seg${i < segs ? " on" : ""}"></span>`;

    // Foot right : status with smart label
    let footRight;
    if (m.isDoneForToday) footRight = "✓ DONE";
    else if (m.dueToday > 0) footRight = m.dueToday + " À REVOIR";
    else if (m.statusLabel === "Maîtrisé") footRight = "✓ MAÎTRISÉ";
    else if (m.statusLabel === "Nouveau") footRight = "NOUVEAU";
    else footRight = mastery + "%";

    const niv = Math.min(5, 1 + Math.floor(mastery / 20));
    const name = pack.name.toUpperCase();
    const titleHtml = name.length > 18 ? name.split(/[ —–-]/).slice(0, 3).join("<br>") : name;

    const isInk = color === "k";
    const svgFill = isInk ? svg.replace(/#0a0a0a/g, "#ffffff") : svg;
    const figStyle = isInk ? 'style="background:#0a0a0a; color:#fff; border-color:#fff;"' : '';
    const dotStyle = isInk ? 'style="background:#0a0a0a; border-color:#fff;"' : '';

    let h = 0;
    for (let i = 0; i < pack.id.length; i++) h = (h * 31 + pack.id.charCodeAt(i)) | 0;
    const figNum = "fig." + (Math.abs(h) % 9 + 1) + "." + (Math.abs(h >> 8) % 9 + 1);

    const div = document.createElement("button");
    div.className = "deck " + color;
    if (m.isDoneForToday) div.classList.add("deck-done-today");
    if (mastery >= 90) div.classList.add("deck-mastered");
    if (added) div.classList.add("deck-added");

    div.onclick = (e) => {
      // Ignore le clic si on a tapé sur le bouton AJOUTER
      if (e.target.closest(".deck-add-btn")) return;
      startFlashcardSession(pack.id);
    };

    // Done overlay badge
    const doneBadge = m.isDoneForToday ? '<div class="deck-done-overlay">✓ DONE</div>' : "";
    // Add button (only on Trouver tab)
    const addBtnHtml = showAddBtn
      ? (added
        ? '<div class="deck-add-btn deck-added-check" title="Dans tes paquets">✓ AJOUTÉ</div>'
        : '<div class="deck-add-btn" title="Ajouter à mes paquets">+ AJOUTER</div>')
      : "";

    // Status pill (only when started)
    const statusPill = m.isStarted
      ? `<span class="deck-status deck-status-${slugify(m.statusLabel)}">${m.statusLabel}</span>`
      : "";

    // Mini stats line (only when started)
    const miniStats = m.isStarted
      ? `<div class="deck-mini-stats">
           <span>👁 ${m.seenCards}/${m.totalCards}</span>
           ${m.dueToday > 0 ? `<span class="deck-mini-due">🔁 ${m.dueToday}</span>` : ""}
           ${m.masteredCards > 0 ? `<span class="deck-mini-mastered">⭐ ${m.masteredCards}</span>` : ""}
         </div>`
      : `<div class="deck-mini-stats"><span>${m.totalCards} cartes</span></div>`;

    div.innerHTML = `
      ${doneBadge}
      ${addBtnHtml}
      <div class="deck-img">
        <span class="fig" ${figStyle}>[${figNum}]</span>
        <span class="dot-circ" ${dotStyle}></span>
        <svg viewBox="0 0 100 90" style="position:absolute; inset:0; width:100%; height:100%;" shape-rendering="crispEdges">
          ${svgFill}
        </svg>
      </div>
      <div class="deck-body">
        <div class="deck-cat">${cat}${statusPill}</div>
        <div class="deck-title">${titleHtml}</div>
        <div class="deck-meta">${metaHtml}</div>
        ${miniStats}
        <div class="deck-foot"><span>NIV.${niv}</span><span>${footRight}</span></div>
      </div>
    `;

    // Wire add button
    if (showAddBtn && !added) {
      const addBtn = div.querySelector(".deck-add-btn");
      if (addBtn) {
        addBtn.onclick = (e) => {
          e.stopPropagation();
          addPack(pack.id);
          // Animation
          div.classList.add("deck-just-added");
          addBtn.textContent = "✓ AJOUTÉ";
          addBtn.classList.add("deck-added-check");
          // Confetti mini
          spawnAddBurst(div);
          setTimeout(() => {
            div.classList.remove("deck-just-added");
            // Re-render the deck card in place to update all visuals
            const replacement = buildDeck(pack, { showAddBtn: true });
            replacement.classList.add("deck-fade-in");
            div.replaceWith(replacement);
          }, 900);
        };
      }
    }
    return div;
  }

  // Petite explosion d'étoiles à côté du deck ajouté
  function spawnAddBurst(deckEl) {
    const rect = deckEl.getBoundingClientRect();
    const burst = document.createElement("div");
    burst.className = "add-burst";
    burst.style.left = (rect.left + rect.width / 2) + "px";
    burst.style.top = (rect.top + 20) + "px";
    const emojis = ["✨", "⭐", "🦆", "✓", "★"];
    for (let i = 0; i < 8; i++) {
      const s = document.createElement("span");
      s.className = "add-burst-piece";
      s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 40 + Math.random() * 40;
      s.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      s.style.setProperty("--dy", Math.sin(angle) * dist + "px");
      s.style.animationDelay = (Math.random() * 0.1) + "s";
      burst.appendChild(s);
    }
    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), 1200);
  }

  function slugify(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
  }

  // ─── TROUVER PAGE ───
  let currentFilter = "all";
  let visibleCount = 24;
  // Seed pour ordonner aléatoirement mais de façon stable pendant la session
  let trouverSeed = Math.floor(Math.random() * 100000) + 1;
  window.shuffleTrouver = function () { trouverSeed = Math.floor(Math.random() * 100000) + 1; visibleCount = 24; renderTrouver(); };

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

    // Order : non-ajoutés en premier (variety), puis ajoutés à la fin
    // À l'intérieur de chaque groupe : ordre stable par hash du pack id (variété par session)
    const seed = trouverSeed; // stable seed during this session of Trouver browsing
    function pseudoHash(id) {
      let h = seed;
      for (let i = 0; i < id.length; i++) h = ((h * 31 + id.charCodeAt(i)) | 0);
      return Math.abs(h);
    }
    packs.sort((a, b) => {
      const aa = isPackAdded(a.id), bb = isPackAdded(b.id);
      if (aa !== bb) return aa ? 1 : -1; // non-ajoutés d'abord
      return pseudoHash(a.id) - pseudoHash(b.id);
    });

    const total = packs.length;
    document.getElementById("banner-count-trouver").textContent = total + " PAQUETS";
    document.getElementById("nav-stats").textContent = FLASHCARD_PACKS.length + " PAQUETS";

    const slice = packs.slice(0, visibleCount);
    slice.forEach((p) => grid.appendChild(buildDeck(p, { showAddBtn: true })));

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

    ensureAddedPacksInit();
    const mine = FLASHCARD_PACKS.filter((p) => isPackAdded(p.id));
    document.getElementById("banner-count-mine").textContent =
      mine.length + " PAQUET" + (mine.length > 1 ? "S" : "") + " DANS TA COLLECTION";

    if (mine.length === 0) {
      container.innerHTML = `
        <div class="frame" style="padding: 40px; text-align: center;">
          <div style="font-size: 56px; margin-bottom: 16px;">📭</div>
          <h3 class="pixel" style="font-size:16px; margin-bottom:14px;">TA COLLECTION EST VIDE</h3>
          <p class="mono" style="font-size:14px; margin-bottom:20px; font-style:italic;">Ajoute tes premiers paquets depuis l'onglet TROUVER.</p>
          <a href="#" class="btn btn-y" onclick="goToTab('trouver'); return false;">EXPLORER LES PAQUETS</a>
        </div>
      `;
      return;
    }

    // Compute mastery for all my packs
    const enriched = mine.map((p) => ({ pack: p, m: window.getPackMastery(p.id) })).filter((x) => x.m);

    // ── DAILY REVIEW BLOCK (top, very visible) ──
    const totalDue = enriched.reduce((s, x) => s + x.m.dueToday, 0);
    const dailyBlock = document.createElement("div");
    dailyBlock.className = "daily-review-block";
    if (totalDue > 0) {
      dailyBlock.innerHTML = `
        <div class="daily-review-left">
          <div class="daily-review-eyebrow">RÉVISION DU JOUR</div>
          <div class="daily-review-title">${totalDue} CARTE${totalDue > 1 ? "S" : ""}<br>À REVOIR</div>
          <div class="daily-review-sub">Toutes les cartes dues, mélangées entre paquets</div>
        </div>
        <button class="btn btn-y btn-big" id="btn-daily-review">▶ COMMENCER</button>
      `;
    } else {
      dailyBlock.innerHTML = `
        <div class="daily-review-left">
          <div class="daily-review-eyebrow">✓ TOUT EST FAIT</div>
          <div class="daily-review-title">PAS DE CARTES<br>EN ATTENTE</div>
          <div class="daily-review-sub">Tu peux explorer un nouveau paquet ou revenir demain</div>
        </div>
        <a href="#" class="btn btn-l" onclick="goToTab('trouver'); return false;">EXPLORER →</a>
      `;
    }
    container.appendChild(dailyBlock);
    if (totalDue > 0) {
      setTimeout(() => {
        const b = document.getElementById("btn-daily-review");
        if (b) b.onclick = startDailyMixedReview;
      }, 0);
    }

    // ── DASHBOARD INTELLIGENT ──
    renderDashboard(container, enriched);

    // ── SECTIONS À FAIRE / DONE ──
    const todo = enriched.filter((x) => !x.m.isDoneForToday);
    const done = enriched.filter((x) => x.m.isDoneForToday);

    // Sort todo : dueToday desc, then mastery asc (priorité aux plus en retard / faibles)
    todo.sort((a, b) => {
      if (a.m.dueToday !== b.m.dueToday) return b.m.dueToday - a.m.dueToday;
      return a.m.masteryPercent - b.m.masteryPercent;
    });
    // Sort done : most recently played first
    done.sort((a, b) => b.m.lastPlayed - a.m.lastPlayed);

    // À faire section
    if (todo.length > 0) {
      const section = document.createElement("div");
      section.className = "pack-section";
      section.innerHTML = `
        <div class="section-banner pack-section-banner">
          <h2>À FAIRE AUJOURD'HUI</h2>
          <div class="bar"></div>
          <span class="fig fig-todo">${todo.length} PAQUET${todo.length > 1 ? "S" : ""}</span>
        </div>
        <div class="deck-grid four"></div>
      `;
      const grid = section.querySelector(".deck-grid");
      todo.forEach((x) => grid.appendChild(buildDeck(x.pack)));
      container.appendChild(section);
    }

    // Done section
    if (done.length > 0) {
      const section = document.createElement("div");
      section.className = "pack-section pack-section-done";
      section.innerHTML = `
        <div class="section-banner pack-section-banner">
          <h2>✓ TERMINÉ AUJOURD'HUI</h2>
          <div class="bar"></div>
          <span class="fig fig-done">${done.length} ✓</span>
        </div>
        <div class="deck-grid four done-grid"></div>
      `;
      const grid = section.querySelector(".deck-grid");
      done.forEach((x) => grid.appendChild(buildDeck(x.pack)));
      container.appendChild(section);
    }
  }

  // ── DASHBOARD : Top packs / À bosser / Presque maîtrisé ──
  function renderDashboard(container, enriched) {
    // Top packs : mastery >= 60, sorted desc
    const top = enriched.filter((x) => x.m.masteryPercent >= 60)
      .sort((a, b) => b.m.masteryPercent - a.m.masteryPercent)
      .slice(0, 3);
    // À bosser : packs avec le plus de cartes faibles + dues
    const work = enriched.filter((x) => x.m.weakCards > 0 || x.m.dueToday > 0)
      .sort((a, b) => (b.m.weakCards + b.m.dueToday) - (a.m.weakCards + a.m.dueToday))
      .slice(0, 3);
    // Presque maîtrisé : 70-90%
    const almost = enriched.filter((x) => x.m.masteryPercent >= 70 && x.m.masteryPercent < 95)
      .sort((a, b) => b.m.masteryPercent - a.m.masteryPercent)
      .slice(0, 3);

    if (top.length === 0 && work.length === 0 && almost.length === 0) return;

    const dash = document.createElement("div");
    dash.className = "dashboard-block";
    let html = `<div class="dashboard-row">`;

    if (top.length > 0) {
      html += `<div class="dashboard-col"><div class="dash-title">⭐ TES MEILLEURS</div><ul class="dash-list">`;
      top.forEach((x) => {
        html += `<li onclick="startFlashcardSession('${x.pack.id}')"><span class="dash-pack-name">${x.pack.name}</span><span class="dash-pack-pct">${x.m.masteryPercent}%</span></li>`;
      });
      html += `</ul></div>`;
    }
    if (work.length > 0) {
      html += `<div class="dashboard-col dash-col-work"><div class="dash-title">🔥 À BOSSER</div><ul class="dash-list">`;
      work.forEach((x) => {
        html += `<li onclick="startFlashcardSession('${x.pack.id}')"><span class="dash-pack-name">${x.pack.name}</span><span class="dash-pack-due">${x.m.dueToday > 0 ? x.m.dueToday + " due" : x.m.weakCards + " faibles"}</span></li>`;
      });
      html += `</ul></div>`;
    }
    if (almost.length > 0) {
      html += `<div class="dashboard-col dash-col-almost"><div class="dash-title">🎯 PRESQUE MAÎTRISÉ</div><ul class="dash-list">`;
      almost.forEach((x) => {
        html += `<li onclick="startFlashcardSession('${x.pack.id}')"><span class="dash-pack-name">${x.pack.name}</span><span class="dash-pack-pct">${x.m.masteryPercent}%</span></li>`;
      });
      html += `</ul></div>`;
    }
    html += `</div>`;
    dash.innerHTML = html;
    container.appendChild(dash);
  }

  // ── DAILY MIXED REVIEW SESSION ──
  // Mélange toutes les cartes dues aujourd'hui, à travers tous les paquets,
  // qui ont été vues au moins une fois. Exclut les cartes totalement nouvelles.
  function startDailyMixedReview() {
    if (typeof FLASHCARD_PACKS === "undefined") return;
    const srsData = SRS.getData(SRS_KEY) || {};
    const now = Date.now();
    const due = [];
    const deletedSet = getDeletedSet();
    FLASHCARD_PACKS.forEach((pack) => {
      pack.cards.forEach((card, idx) => {
        const key = pack.id + ":" + idx;
        if (deletedSet.has(key)) return; // carte supprimée
        const st = srsData[key];
        if (!st) return; // jamais vue → exclue
        if ((st.next || 0) <= now) {
          due.push({
            front: card.front, back: card.back, memo: card.memo || null,
            srsKey: key, cardIdx: idx,
            pack, packId: pack.id,
          });
        }
      });
    });
    if (due.length === 0) return;
    shuffle(due);

    session = {
      pack: null,           // multi-pack
      packId: "__daily__",
      isDailyReview: true,
      allCards: due,
      queue: due.map((_, i) => i),
      index: 0,
      flipped: false,
      results: { again: 0, hard: 0, good: 0, easy: 0 },
      masteryStart: 0,
    };
    if (typeof GAM !== "undefined" && GAM.resetCombo) GAM.resetCombo();

    document.getElementById("session-title").textContent = "RÉVISION DU JOUR";
    goToTab("session");
    showCard();
  }
  window.startDailyMixedReview = startDailyMixedReview;

  // ─── SESSION FLASHCARD ───
  let session = null;
  const NEW_PER_SESSION = 15;

  window.startFlashcardSession = function (packId) {
    const pack = FLASHCARD_PACKS.find((p) => p.id === packId);
    if (!pack) return;
    const srsData = SRS.getData(SRS_KEY) || {};
    const deletedSet = getDeletedSet();
    const allCards = pack.cards.map((c, i) => ({
      front: c.front, back: c.back, memo: c.memo || null,
      srsKey: getCardKey(packId, i), cardIdx: i,
      deleted: deletedSet.has(getCardKey(packId, i)),
    }));

    const due = [], fresh = [];
    allCards.forEach((c, i) => {
      if (c.deleted) return; // ignorer les supprimées
      const st = srsData[c.srsKey];
      if (!st) fresh.push(i);
      else if ((st.next || 0) <= Date.now()) due.push(i);
    });
    shuffle(due); shuffle(fresh);
    let queue = [...due, ...fresh.slice(0, NEW_PER_SESSION)];
    if (queue.length === 0) {
      const all = allCards.map((_, i) => i).filter((i) => !allCards[i].deleted);
      shuffle(all);
      queue = all.slice(0, 10);
    }
    if (queue.length === 0) return; // tout est supprimé

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

  // Supprime la carte courante de la session : la sort de la queue + marque deleted
  window.deleteCurrentCard = function () {
    if (!session) return;
    const c = session.allCards[session.queue[session.index]];
    if (!c) return;
    // Pour les sessions daily review, c.packId est sur l'item ; sinon, session.packId
    const packId = c.packId || session.packId;
    const cardIdx = c.cardIdx;
    if (!confirm("Supprimer définitivement cette carte de tes paquets ?\n\n« " + c.front.substring(0, 80) + (c.front.length > 80 ? "…" : "") + " »")) return;
    markCardDeleted(packId, cardIdx);
    // Retire toutes les occurrences de cette carte de la queue
    const queue = session.queue;
    const cardSrsKey = c.srsKey;
    for (let i = queue.length - 1; i >= 0; i--) {
      if (i === session.index) continue; // on garde l'actuel, on avance après
      const otherCard = session.allCards[queue[i]];
      if (otherCard && otherCard.srsKey === cardSrsKey) {
        queue.splice(i, 1);
        if (i < session.index) session.index--;
      }
    }
    // Petite confirmation visuelle
    const toast = document.createElement("div");
    toast.className = "card-delete-toast";
    toast.textContent = "Carte supprimée ✓";
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 300); }, 1500);

    // Passer à la suivante (ou finir)
    session.index++;
    if (session.index >= session.queue.length) showResult();
    else showCard();
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

    // Pack badge for daily mixed review
    let badge = document.getElementById("session-pack-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "session-pack-badge";
      badge.className = "session-pack-badge";
      const card = document.getElementById("session-card");
      if (card) card.insertBefore(badge, card.firstChild);
    }
    if (session.isDailyReview && c.pack) {
      badge.textContent = c.pack.name;
      badge.style.display = "";
    } else {
      badge.style.display = "none";
    }
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
    // Track : pour daily review, on track sur le packId réel de la carte
    const trackPackId = session.isDailyReview ? c.packId : session.packId;
    try {
      const tracking = JSON.parse(localStorage.getItem("qpuc-tracking") || "{}");
      if (!tracking[trackPackId]) tracking[trackPackId] = { attempts: 0, correct: 0, wrong: 0, cards: {}, lastPlayed: 0 };
      const tp = tracking[trackPackId];
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

    // Check mastery jump (only for single-pack sessions)
    if (!session.isDailyReview && session.pack) {
      const newMastery = getMastery(session.packId, session.pack.cards.length);
      if (session.masteryStart < 100 && newMastery >= 100 && typeof GAM !== "undefined") {
        if (GAM.recordMastery(session.packId) && GAM.celebratePackMastered) {
          GAM.celebratePackMastered(session.pack.name);
        }
        session.masteryStart = 100;
      }
    }

    session.index++;
    if (session.index >= session.queue.length) showResult();
    else showCard();
  };

  function showResult() {
    const r = session.results;
    const total = r.again + r.hard + r.good + r.easy;
    const xp = r.hard * 1 + r.good * 2 + r.easy * 3;
    document.getElementById("result-total").textContent = total;
    document.getElementById("result-good").textContent = r.good + r.easy;
    document.getElementById("result-xp").textContent = "+" + xp;

    if (session.isDailyReview) {
      document.getElementById("result-mastery").textContent = "MIX";
      document.getElementById("result-emoji").textContent = r.again === 0 ? "🔥" : "👍";
      document.getElementById("result-title").textContent = "Révision du jour terminée !";
    } else {
      const mastery = getMastery(session.packId, session.pack.cards.length);
      document.getElementById("result-mastery").textContent = mastery + "%";
      document.getElementById("result-emoji").textContent = mastery >= 100 ? "⭐" : (r.again === 0 ? "🎉" : "👍");
      document.getElementById("result-title").textContent = mastery >= 100 ? "Pack maîtrisé !" : "Session terminée !";
    }
    goToTab("result");
  }

  // Back button on session screen
  document.addEventListener("DOMContentLoaded", function () {
    const back = document.getElementById("btn-session-back");
    if (back) back.onclick = () => goToTab("mes-paquets");
    // Wire delete button
    const delBtn = document.getElementById("card-delete-btn");
    if (delBtn) delBtn.onclick = (e) => { e.stopPropagation(); window.deleteCurrentCard(); };
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
