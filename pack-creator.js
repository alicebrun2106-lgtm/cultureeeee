// pack-creator.js — Création + édition de paquets perso
// Stockage : localStorage 'qpuc-user-packs' (séparé du mock IA)
// Aussi : ajout de cartes à un paquet auto-généré ('qpuc-pack-extras')

(function () {
  const USER_PACKS_KEY = "qpuc-user-packs";
  const PACK_EXTRAS_KEY = "qpuc-pack-extras"; // { packId: [{front, back, memo}, ...] }

  function isLegacyDevPack(pack) {
    const id = String((pack && pack.id) || "").toLowerCase();
    const name = String((pack && pack.name) || "").toLowerCase();
    return id.includes("codex-test") ||
      id.includes("test-paquet-codex") ||
      name === "test paquet codex" ||
      name.includes("test paquet codex");
  }

  function loadUserPacks() {
    try {
      const packs = JSON.parse(localStorage.getItem(USER_PACKS_KEY) || "[]");
      return Array.isArray(packs) ? packs.filter((pack) => !isLegacyDevPack(pack)) : [];
    } catch { return []; }
  }
  function saveUserPacks(packs) { localStorage.setItem(USER_PACKS_KEY, JSON.stringify(packs)); }

  function cleanupLegacyDevPacks() {
    try {
      const raw = JSON.parse(localStorage.getItem(USER_PACKS_KEY) || "[]");
      if (!Array.isArray(raw)) return;
      const cleaned = raw.filter((pack) => !isLegacyDevPack(pack));
      if (cleaned.length !== raw.length) saveUserPacks(cleaned);
    } catch {
      // Rien à nettoyer si l'ancien stockage est illisible.
    }
  }

  function loadExtras() {
    try { return JSON.parse(localStorage.getItem(PACK_EXTRAS_KEY) || "{}"); } catch { return {}; }
  }
  function saveExtras(e) { localStorage.setItem(PACK_EXTRAS_KEY, JSON.stringify(e)); }
  function getGlobalPacks() {
    if (typeof FLASHCARD_PACKS !== "undefined") return FLASHCARD_PACKS;
    if (typeof window.FLASHCARD_PACKS !== "undefined") return window.FLASHCARD_PACKS;
    return null;
  }
  function refreshPackViews() {
    if (typeof window.renderTrouver === "function") window.renderTrouver();
    if (typeof window.renderMesPaquets === "function") window.renderMesPaquets();
  }

  // ─── Modal helper ───
  function openModal(html, opts = {}) {
    closeModal();
    const m = document.createElement("div");
    m.id = "pack-creator-modal";
    m.className = "mock-modal-backdrop";
    m.innerHTML = `<div class="mock-modal frame ${opts.wide ? "pack-modal-wide" : ""}">
      <button class="mock-close" onclick="window.closePackCreator()">×</button>
      ${html}
    </div>`;
    document.body.appendChild(m);
    m.addEventListener("click", (e) => { if (e.target === m) closeModal(); });
  }
  function closeModal() {
    const m = document.getElementById("pack-creator-modal");
    if (m) m.remove();
  }

  // ─── Création d'un paquet ───
  function openCreator(prefill) {
    const draft = normalizeUserPackDraft(prefill || { name: "", icon: "📦", description: "", visibility: "private", cards: [{ front: "", back: "", memo: "" }] });
    renderCreator(draft);
  }

  function renderCreator(draft) {
    const visibility = normalizeVisibility(draft);
    openModal(`
      <h2 class="mock-title">+ CRÉER MON PAQUET</h2>
      <p class="mock-sub">Donne-lui un nom, un emoji, et ajoute tes cartes une par une.</p>

      <label class="mock-label">NOM DU PAQUET</label>
      <input id="pc-name" class="mock-input" value="${escapeAttr(draft.name)}" placeholder="Ex : Mes pièges en histoire" maxlength="60">

      <label class="mock-label">EMOJI</label>
      <input id="pc-icon" class="mock-input pc-icon-input" value="${escapeAttr(draft.icon)}" maxlength="2">

      <label class="mock-label">VISIBILITÉ</label>
      <div class="pc-visibility-row" role="radiogroup" aria-label="Visibilité du paquet">
        <label class="pc-visibility-option">
          <input type="radio" name="pc-visibility" value="private" ${visibility === "private" ? "checked" : ""}>
          <span class="pc-visibility-title">PRIVÉ</span>
          <span class="pc-visibility-sub">Seulement dans tes paquets. Invisible chez les amis et dans les paquets à voler.</span>
        </label>
        <label class="pc-visibility-option">
          <input type="radio" name="pc-visibility" value="public" ${visibility === "public" ? "checked" : ""}>
          <span class="pc-visibility-title">PUBLIC</span>
          <span class="pc-visibility-sub">Visible dans le social et partageable avec les autres joueurs.</span>
        </label>
      </div>
      <p class="pc-safety-note">Les paquets publics sont filtrés automatiquement avant d'être visibles aux autres.</p>

      <label class="mock-label">CARTES</label>
      <div id="pc-cards" class="pc-cards"></div>
      <button class="btn" onclick="window.packCreatorAddCard()">+ AJOUTER UNE CARTE</button>

      <div class="pc-actions">
        <button class="btn" onclick="window.closePackCreator()">ANNULER</button>
        <button class="btn btn-y" onclick="window.packCreatorSave()">✓ SAUVEGARDER</button>
      </div>
    `, { wide: true });

    // Mémoire en cours pendant l'édition
    window.__pcDraft = draft;
    renderCards();
  }

  function renderCards() {
    const draft = window.__pcDraft;
    const c = document.getElementById("pc-cards");
    if (!c) return;
    c.innerHTML = draft.cards.map((card, i) => `
      <div class="pc-card frame">
        <div class="pc-card-head">
          <strong>Carte ${i + 1}</strong>
          ${draft.cards.length > 1 ? `<button class="pc-del" onclick="window.packCreatorRemoveCard(${i})" title="Supprimer">✕</button>` : ""}
        </div>
        <label class="mock-label">RECTO (question)</label>
        <input class="mock-input" data-i="${i}" data-f="front" value="${escapeAttr(card.front)}" oninput="window.packCreatorUpdateCard(${i}, 'front', this.value)" placeholder="Ex : Capitale du Pérou ?">
        <label class="mock-label">VERSO (réponse)</label>
        <input class="mock-input" data-i="${i}" data-f="back" value="${escapeAttr(card.back)}" oninput="window.packCreatorUpdateCard(${i}, 'back', this.value)" placeholder="Ex : Lima">
        <label class="mock-label">MOYEN MNÉMOTECHNIQUE (optionnel)</label>
        <input class="mock-input" data-i="${i}" data-f="memo" value="${escapeAttr(card.memo || '')}" oninput="window.packCreatorUpdateCard(${i}, 'memo', this.value)" placeholder="Astuce pour s'en souvenir">
      </div>
    `).join("");
  }

  function addCard() {
    const draft = window.__pcDraft;
    draft.cards.push({ front: "", back: "", memo: "" });
    renderCards();
  }
  function removeCard(i) {
    const draft = window.__pcDraft;
    draft.cards.splice(i, 1);
    renderCards();
  }
  function updateCard(i, field, value) {
    const draft = window.__pcDraft;
    if (!draft.cards[i]) return;
    draft.cards[i][field] = value;
  }

  function saveCreator() {
    const draft = window.__pcDraft;
    const name = document.getElementById("pc-name").value.trim();
    const icon = document.getElementById("pc-icon").value.trim() || "📦";
    const desc = "";
    const visibilityInput = document.querySelector('input[name="pc-visibility"]:checked');
    const visibility = visibilityInput && visibilityInput.value === "public" ? "public" : "private";

    if (!name) { toast("Donne un nom à ton paquet."); return; }
    const validCards = draft.cards.filter((c) => c.front.trim() && c.back.trim());
    if (!validCards.length) { toast("Ajoute au moins une carte (recto + verso)."); return; }

    const userPacks = loadUserPacks();
    const pack = {
      id: draft.id || ("user-" + Date.now()),
      name,
      icon,
      description: desc,
      difficulty: "perso",
      reversible: true,
      isUserPack: true,
      visibility,
      isPublic: visibility === "public",
      cards: validCards.map((c) => ({
        front: c.front.trim(),
        back: c.back.trim(),
        memo: (c.memo || "").trim()
      }))
    };

    if (visibility === "public") {
      const safetyResult = checkPublicSafety(pack);
      if (!safetyResult.ok) {
        const safety = window.CultureContentSafety;
        toast(safety && typeof safety.summarize === "function"
          ? safety.summarize(safetyResult)
          : "Ce paquet ne peut pas être public. Mets-le en privé ou reformule.");
        return;
      }
    }

    // Update si existant, sinon push
    const idx = userPacks.findIndex((p) => p.id === pack.id);
    if (idx >= 0) userPacks[idx] = pack;
    else userPacks.push(pack);
    saveUserPacks(userPacks);

    // Inject dans FLASHCARD_PACKS pour que tout le reste de l'app le voit
    injectUserPacksIntoGlobal();
    if (typeof window.addPack === "function") window.addPack(pack.id);

    closeModal();
    toast(`Paquet "${name}" sauvegardé en ${visibility === "public" ? "public" : "privé"}.`);
    refreshPackViews();
  }

  // ─── Ajout de cartes à un paquet auto-généré ───
  function openAddCardsTo(packId) {
    const packs = getGlobalPacks();
    if (!packs) return;
    const pack = packs.find((p) => p.id === packId) || loadUserPacks().find((p) => p.id === packId);
    if (!pack) { toast("Paquet introuvable."); return; }

    const extras = loadExtras()[packId] || [];
    const safePackId = escapeJs(packId);

    openModal(`
      <h2 class="mock-title">+ AJOUTER DES CARTES</h2>
      <p class="mock-sub">Paquet : <strong>${escapeHtml(pack.icon || "📦")} ${escapeHtml(pack.name)}</strong></p>
      <p class="mock-muted">Ces cartes s'ajoutent à celles du paquet. Tu peux les ajouter une par une.</p>

      <div id="extras-list">
        ${extras.length === 0 ? `<p class="mock-muted">Aucune carte ajoutée pour l'instant.</p>` : extras.map((c, i) => `
          <div class="extras-item frame">
            <div><strong>${escapeHtml(c.front)}</strong></div>
            <div class="extras-back">→ ${escapeHtml(c.back)}</div>
            ${c.memo ? `<div class="extras-memo">${escapeHtml(c.memo)}</div>` : ""}
            <button class="pc-del" onclick="window.packCreatorRemoveExtra('${safePackId}', ${i})">✕</button>
          </div>
        `).join("")}
      </div>

      <hr class="pc-hr">
      <label class="mock-label">RECTO (question)</label>
      <input id="extra-front" class="mock-input" placeholder="Ex : Année de la chute du Mur de Berlin ?">
      <label class="mock-label">VERSO (réponse)</label>
      <input id="extra-back" class="mock-input" placeholder="Ex : 1989">
      <label class="mock-label">MNÉMO (optionnel)</label>
      <input id="extra-memo" class="mock-input" placeholder="Astuce pour s'en souvenir">

      <div class="pc-actions">
        <button class="btn" onclick="window.closePackCreator()">FERMER</button>
        <button class="btn btn-y" onclick="window.packCreatorSaveExtra('${safePackId}')">+ AJOUTER</button>
      </div>
    `, { wide: true });
  }

  function saveExtra(packId) {
    const front = document.getElementById("extra-front").value.trim();
    const back = document.getElementById("extra-back").value.trim();
    const memo = document.getElementById("extra-memo").value.trim();
    if (!front || !back) { toast("Recto + verso obligatoires."); return; }

    const extras = loadExtras();
    if (!extras[packId]) extras[packId] = [];
    extras[packId].push({ front, back, memo });
    saveExtras(extras);

    // Injecte ces extras dans FLASHCARD_PACKS pour que la session les voie
    injectExtrasIntoGlobal();
    refreshPackViews();

    toast("Carte ajoutée.");
    openAddCardsTo(packId); // refresh
  }
  function removeExtra(packId, i) {
    const extras = loadExtras();
    if (!extras[packId]) return;
    extras[packId].splice(i, 1);
    saveExtras(extras);
    injectExtrasIntoGlobal();
    refreshPackViews();
    openAddCardsTo(packId);
  }

  function deleteUserPack(packId) {
    const packs = loadUserPacks().filter((p) => p.id !== packId);
    saveUserPacks(packs);
    const extras = loadExtras();
    delete extras[packId];
    saveExtras(extras);
    if (typeof window.removePack === "function") window.removePack(packId);
    injectUserPacksIntoGlobal();
    injectExtrasIntoGlobal();
    refreshPackViews();
    toast("Paquet supprimé.");
  }

  // ─── Injection des paquets/extras dans la donnée globale ───
  // Idempotent : on retire d'abord puis on rajoute. Marqueur isUserPack pour le repérer.
  function injectUserPacksIntoGlobal() {
    const packs = getGlobalPacks();
    if (!packs) return;
    // Retire d'anciens paquets perso (marqueur isUserPack)
    for (let i = packs.length - 1; i >= 0; i--) {
      if (packs[i] && packs[i].isUserPack) packs.splice(i, 1);
    }
    // Réinjecte depuis localStorage
    const userPacks = loadUserPacks().map(normalizeUserPackDraft);
    for (const p of userPacks) packs.push(p);
  }
  function injectExtrasIntoGlobal() {
    const packs = getGlobalPacks();
    if (!packs) return;
    const extras = loadExtras();
    for (const pack of packs) {
      // On retire d'abord les anciens extras (marquant via _extra) puis on réinjecte
      pack.cards = pack.cards.filter((c) => !c._extra);
      const list = extras[pack.id];
      if (list && list.length) {
        for (const c of list) {
          pack.cards.push({ front: c.front, back: c.back, memo: c.memo, _extra: true });
        }
      }
    }
  }

  function toast(message) {
    const existing = document.querySelector(".mock-toast");
    if (existing) existing.remove();
    const el = document.createElement("div");
    el.className = "mock-toast";
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/`/g, "&#96;"); }
  function escapeJs(s) {
    return String(s || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
  }
  function normalizeVisibility(pack) {
    if (!pack) return "private";
    if (pack.visibility === "public" || pack.isPublic === true) return "public";
    return "private";
  }
  function normalizeUserPackDraft(pack) {
    const normalized = { ...pack };
    normalized.visibility = normalizeVisibility(normalized);
    normalized.isPublic = normalized.visibility === "public";
    normalized.isUserPack = true;
    normalized.cards = Array.isArray(normalized.cards) && normalized.cards.length
      ? normalized.cards
      : [{ front: "", back: "", memo: "" }];
    return normalized;
  }
  function checkPublicSafety(pack) {
    const safety = window.CultureContentSafety;
    if (!safety || typeof safety.checkPack !== "function") return { ok: true, reasons: [] };
    return safety.checkPack(pack);
  }

  // ─── Exports ───
  window.openPackCreator           = openCreator;
  window.closePackCreator          = closeModal;
  window.packCreatorAddCard        = addCard;
  window.packCreatorRemoveCard     = removeCard;
  window.packCreatorUpdateCard     = updateCard;
  window.packCreatorSave           = saveCreator;
  window.openAddCardsToPack        = openAddCardsTo;
  window.packCreatorSaveExtra      = saveExtra;
  window.packCreatorRemoveExtra    = removeExtra;
  window.deleteUserPack            = deleteUserPack;

  // Au chargement, on injecte ce qui existe en localStorage dans la donnée globale
  function initInject() {
    cleanupLegacyDevPacks();
    injectUserPacksIntoGlobal();
    injectExtrasIntoGlobal();
    refreshPackViews();
    if (typeof window.handleInitialOpenSession === "function") window.handleInitialOpenSession();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initInject);
  } else {
    initInject();
  }
})();
