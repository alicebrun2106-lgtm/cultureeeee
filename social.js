// social.js — Onglet SOCIAL : données réelles/locales seulement.
(function () {
  const LEGACY_STORAGE_KEY = "qpuc-social-state";
  const MY_NAME_KEY = "qpuc-social-my-name";

  function cleanupLegacySocialMocks() {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      const raw = localStorage.getItem("culture_mock_user_packs");
      if (!raw) return;
      const packs = JSON.parse(raw);
      if (!Array.isArray(packs)) return;
      const cleaned = packs.filter((pack) => !String(pack && pack.id || "").startsWith("custom-"));
      if (cleaned.length !== packs.length) {
        localStorage.setItem("culture_mock_user_packs", JSON.stringify(cleaned));
      }
    } catch {}
  }

  function getMyName() {
    return localStorage.getItem(MY_NAME_KEY) || "TOI";
  }

  function setMyName(name) {
    localStorage.setItem(MY_NAME_KEY, String(name || "").trim() || "TOI");
  }

  function getMyScore() {
    try {
      const stats = JSON.parse(localStorage.getItem("qpuc-stats") || "{}");
      const xp = JSON.parse(localStorage.getItem("qpuc-xp") || "{}");
      return Number(stats.totalCorrect || stats.xp || xp.total || 0);
    } catch {
      return 0;
    }
  }

  function readMyPackScore(packId) {
    try {
      const srs = JSON.parse(localStorage.getItem("qpuc-srs-v2") || "{}");
      let count = 0;
      for (const [key, value] of Object.entries(srs)) {
        if (key.startsWith(packId + ":") && value && (value.state === "review" || value.reps >= 2)) {
          count++;
        }
      }
      return count * 5;
    } catch {
      return 0;
    }
  }

  function getAddedPackIds() {
    try {
      const added = JSON.parse(localStorage.getItem("qpuc-added-packs") || "[]");
      return Array.isArray(added) ? added : [];
    } catch {
      return [];
    }
  }

  function getPackById(packId) {
    if (typeof FLASHCARD_PACKS === "undefined") return null;
    return FLASHCARD_PACKS.find((pack) => pack.id === packId) || null;
  }

  function isPublicPack(pack) {
    if (!pack) return false;
    if (pack.visibility === "private" || pack.isPrivate === true || pack.isPublic === false) return false;
    const safety = window.CultureContentSafety;
    if (safety && typeof safety.isPackPublicSafe === "function" && !safety.isPackPublicSafe(pack)) return false;
    return true;
  }

  function getMyPublicPacks() {
    if (typeof FLASHCARD_PACKS === "undefined") return [];
    const added = new Set(getAddedPackIds());
    return FLASHCARD_PACKS.filter((pack) => added.has(pack.id) && isPublicPack(pack));
  }

  function isSignedIn() {
    return !!(window.CultureAuth && typeof window.CultureAuth.isSignedIn === "function" && window.CultureAuth.isSignedIn());
  }

  function renderSocial() {
    cleanupLegacySocialMocks();
    socialSwitchTab("general");
  }

  function socialSwitchTab(tab, btn) {
    document.querySelectorAll(".social-tab").forEach((button) => button.classList.remove("on"));
    const targetBtn = btn || document.querySelector(`.social-tab[data-stab="${tab}"]`);
    if (targetBtn) targetBtn.classList.add("on");

    const container = document.getElementById("social-content");
    if (!container) return;
    if (tab === "general") container.innerHTML = renderScoreboardGeneral();
    else if (tab === "bypack") {
      container.innerHTML = renderScoreboardByPack();
      setTimeout(refreshPackBoard, 0);
    } else if (tab === "steal") {
      container.innerHTML = renderPublicPacks();
    }
  }

  function renderScoreboardGeneral() {
    const my = { name: getMyName(), score: getMyScore(), isMe: true };
    return `
      <div class="social-board frame">
        <div class="social-board-header">
          <span class="social-h">SCOREBOARD GÉNÉRAL</span>
          <span class="social-me-rank">Score local : <strong>${my.score}</strong> pts</span>
        </div>
        <div class="social-name-row">
          <label>Ton nom dans le classement :</label>
          <input id="social-my-name" class="mock-input" value="${escapeAttr(my.name)}" maxlength="24" autocomplete="nickname">
          <button class="btn btn-y" onclick="window.socialSaveMyName()">SAUVEGARDER</button>
        </div>
        ${!isSignedIn() ? `
          <div class="social-secure-note">
            Connecte-toi pour sauvegarder ton identité et préparer ton apparition dans le classement public.
          </div>
        ` : ""}
        <div class="scoreboard">
          ${rowHtml({ rank: 1, ...my })}
        </div>
      </div>
    `;
  }

  function renderScoreboardByPack() {
    const packs = getMyPublicPacks();
    if (!packs.length) {
      return `<div class="social-empty frame">
        <p>Ajoute ou crée un paquet public pour voir ton score par paquet. Les paquets privés restent invisibles ici.</p>
      </div>`;
    }

    return `
      <div class="social-board frame">
        <div class="social-board-header">
          <span class="social-h">PAR PAQUET</span>
          <select id="social-pack-select" onchange="window.socialRefreshPackBoard()" class="mock-input social-pack-select">
            ${packs.map((pack) => `<option value="${escapeAttr(pack.id)}">${escapeHtml(pack.icon || "📦")} ${escapeHtml(pack.name)}</option>`).join("")}
          </select>
        </div>
        <div id="social-pack-board"></div>
      </div>
    `;
  }

  function refreshPackBoard() {
    const select = document.getElementById("social-pack-select");
    if (!select) return;
    const pack = getPackById(select.value);
    const board = document.getElementById("social-pack-board");
    if (!board) return;

    if (!isPublicPack(pack)) {
      board.innerHTML = `<div class="social-empty frame"><p>Ce paquet est privé : il n'apparaît pas dans le social.</p></div>`;
      return;
    }

    const score = readMyPackScore(pack.id);
    board.innerHTML = `
      <p class="social-board-sub">Score local sur ce paquet : <strong>${score}</strong> pts</p>
      <div class="scoreboard">
        ${rowHtml({ rank: 1, name: getMyName(), score, isMe: true })}
      </div>
      <div class="social-secure-note">
        Le classement public par paquet sera alimenté uniquement par des comptes réels.
      </div>
    `;
  }

  function renderPublicPacks() {
    return `
      <div class="social-board frame">
        <div class="social-h">PAQUETS PUBLICS</div>
        <p class="social-board-sub">Les paquets publics des autres utilisateurs apparaîtront ici quand le backend de comptes réels sera branché.</p>
        <div class="social-empty frame">
          <p>Aucun paquet public d'autre utilisateur disponible pour l'instant.</p>
        </div>
      </div>
    `;
  }

  function saveMyName() {
    const input = document.getElementById("social-my-name");
    if (!input) return;
    setMyName(input.value);
    socialSwitchTab("general");
  }

  function rowHtml(row) {
    return `
      <div class="sb-row ${row.isMe ? "me" : ""}">
        <div class="sb-rank">#${row.rank}</div>
        <div class="sb-avatar">☻</div>
        <div class="sb-name">${escapeHtml(row.name)}${row.isMe ? " (toi)" : ""}</div>
        <div class="sb-score">${Number(row.score || 0)} pts</div>
      </div>
    `;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  window.renderSocial = renderSocial;
  window.socialSwitchTab = socialSwitchTab;
  window.socialRefreshPackBoard = refreshPackBoard;
  window.socialSaveMyName = saveMyName;
})();
