// explorer.js — Onglet "Explorer" : catégories simplifiées
(function () {
  const SRS_KEY = "qpuc-srs";
  let currentCategory = null;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  }

  function getCardKey(packId, idx) { return packId + ":" + idx; }
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
    let started = false;
    for (const k in data) { if (k.startsWith(packId + ":")) { started = true; break; } }
    return started;
  }

  // Returns { due, newCards }: due = cards needing review NOW, newCards = unseen cards
  function getPackDue(packId, totalCards) {
    const data = SRS.getData(SRS_KEY) || {};
    let due = 0, newCards = 0;
    const now = Date.now();
    for (let i = 0; i < totalCards; i++) {
      const st = data[getCardKey(packId, i)];
      if (!st) newCards++;
      else if ((st.next || 0) <= now) due++;
    }
    return { due, newCards };
  }

  // Get last activity timestamp for this pack (from tracking module)
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

  // A pack is "done today" if : already reviewed today AND no due cards left right now
  function isPackDoneToday(pack) {
    const total = pack.cards.length;
    const { due } = getPackDue(pack.id, total);
    if (due > 0) return false;
    return isToday(getPackLastPlayed(pack.id));
  }

  // ---------- INIT ----------
  window.initExplorer = function () {
    const container = document.getElementById("explorer-content");
    if (!container) return;
    container.innerHTML = "";

    if (currentCategory) {
      renderCategoryDetail(container, currentCategory);
    } else {
      renderCategoryList(container);
    }
  };

  function renderCategoryList(container) {
    const header = document.createElement("div");
    header.className = "explorer-header";
    header.innerHTML = `
      <h1 class="explorer-title">Explorer</h1>
      <p class="explorer-sub">Choisis un thème et apprends à ton rythme.</p>
    `;
    container.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "category-grid";
    CATEGORIES.forEach((cat) => grid.appendChild(buildCategoryCard(cat)));
    container.appendChild(grid);
  }

  function buildCategoryCard(cat) {
    const allPacks = (typeof FLASHCARD_PACKS !== "undefined" ? FLASHCARD_PACKS : []);
    const packs = allPacks.filter((p) => cat.packIds.includes(p.id));
    let mastered = 0, total = packs.length;
    packs.forEach((p) => { if (getMastery(p.id, p.cards.length) >= 100) mastered++; });

    const card = document.createElement("button");
    card.className = "category-card";
    card.style.setProperty("--cat-color", cat.color);
    card.onclick = () => { currentCategory = cat.id; window.initExplorer(); };
    card.innerHTML = `
      <div class="category-card-icon">${cat.icon}</div>
      <div class="category-card-name">${cat.name}</div>
      <div class="category-card-desc">${cat.description}</div>
      <div class="category-card-progress">
        <span class="category-card-mastered">${mastered}/${total}</span>
        <span class="category-card-mastered-lbl">paquets maîtrisés</span>
      </div>
    `;
    return card;
  }

  function renderCategoryDetail(container, catId) {
    const cat = CATEGORIES.find((c) => c.id === catId);
    if (!cat) { currentCategory = null; window.initExplorer(); return; }

    const back = document.createElement("button");
    back.className = "explorer-back-btn";
    back.innerHTML = "← Catégories";
    back.onclick = () => { currentCategory = null; window.initExplorer(); };
    container.appendChild(back);

    const head = document.createElement("div");
    head.className = "category-detail-header";
    head.style.setProperty("--cat-color", cat.color);
    head.innerHTML = `
      <div class="category-detail-icon">${cat.icon}</div>
      <h1 class="category-detail-title">${cat.name}</h1>
      <p class="category-detail-desc">${cat.description}</p>
    `;
    container.appendChild(head);

    const allPacks = (typeof FLASHCARD_PACKS !== "undefined" ? FLASHCARD_PACKS : []);
    const packs = allPacks.filter((p) => cat.packIds.includes(p.id));

    // Sort by difficulty (debutant first)
    const order = { debutant: 0, intermediaire: 1, expert: 2 };
    packs.sort((a, b) => {
      const da = order[a.difficulty] ?? 1, db = order[b.difficulty] ?? 1;
      if (da !== db) return da - db;
      return a.name.localeCompare(b.name, "fr");
    });

    // Split: à faire / fait aujourd'hui / maîtrisés
    const todo = [], doneToday = [], mastered = [];
    packs.forEach((p) => {
      if (getMastery(p.id, p.cards.length) >= 100) mastered.push(p);
      else if (isPackDoneToday(p)) doneToday.push(p);
      else todo.push(p);
    });

    addPackSection(container, "À faire", "📚", todo, false);
    addPackSection(container, "Fait aujourd'hui", "✅", doneToday, false, { todayDone: true });
    addPackSection(container, "Maîtrisés", "⭐", mastered, mastered.length > 4);
  }

  function addPackSection(container, title, icon, packs, collapsed, opts = {}) {
    if (packs.length === 0) return;
    const section = document.createElement("div");
    section.className = "pack-section" + (opts.todayDone ? " pack-section-done-today" : "");
    const header = document.createElement("div");
    header.className = "pack-section-header";
    header.innerHTML = `<span class="pack-section-title">${icon} ${title}</span><span class="pack-section-count">${packs.length}</span>`;
    if (collapsed) {
      header.classList.add("pack-section-collapsible");
      header.onclick = () => {
        section.classList.toggle("pack-section-collapsed");
        header.classList.toggle("pack-section-open");
      };
      section.classList.add("pack-section-collapsed");
    }
    section.appendChild(header);
    const list = document.createElement("div");
    list.className = "pack-list";
    packs.forEach((p) => list.appendChild(buildPackRow(p, opts)));
    section.appendChild(list);
    container.appendChild(section);
  }

  function buildPackRow(pack, opts = {}) {
    const total = pack.cards.length;
    const mastery = getMastery(pack.id, total);
    const started = getStarted(pack.id);
    const doneToday = isPackDoneToday(pack);

    const diffLabels = { debutant: "Débutant", intermediaire: "Intermédiaire", expert: "Avancé" };
    const diffColors = { debutant: "#2ecc71", intermediaire: "#f0c040", expert: "#e74c3c" };
    const dLabel = diffLabels[pack.difficulty] || "Intermédiaire";
    const dColor = diffColors[pack.difficulty] || "#f0c040";

    const row = document.createElement("button");
    row.className = "pack-row";
    if (mastery >= 100) row.classList.add("pack-row-mastered-state");
    else if (doneToday) row.classList.add("pack-row-done-today");
    row.onclick = () => {
      if (typeof startFlashcardSession === "function") {
        startFlashcardSession(pack.id);
      }
    };

    let badge = "";
    let cta = "Apprendre →";
    if (mastery >= 100) { badge = '<span class="pack-row-star">⭐</span>'; cta = "Refaire →"; }
    else if (doneToday) { badge = '<span class="pack-row-check">✓</span>'; cta = "Refaire →"; }
    else if (started) cta = "Continuer →";

    row.innerHTML = `
      <div class="pack-row-icon">${escapeHtml(pack.icon || "📚")}</div>
      <div class="pack-row-info">
        <div class="pack-row-name">${escapeHtml(pack.name)}${badge}</div>
        <div class="pack-row-meta">
          <span class="pack-row-diff" style="background:${dColor}33;color:${dColor}">${dLabel}</span>
          <span class="pack-row-cards">${total} cartes</span>
          ${doneToday && mastery < 100 ? '<span class="pack-row-today-tag">Fait aujourd\'hui</span>' : ""}
        </div>
        <div class="pack-row-progress"><div class="pack-row-progress-fill" style="width:${mastery}%"></div></div>
      </div>
      <div class="pack-row-cta">${cta}</div>
    `;
    return row;
  }
})();
