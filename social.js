// social.js — Onglet SOCIAL : scoreboard, défis, vol de paquets
// MOCK : 30 faux joueurs seedés une fois dans localStorage.
// Source unique de vérité : qpuc-social-state (joueurs + score perso + paquets volés)

(function () {
  const STORAGE_KEY = "qpuc-social-state";
  const MY_NAME_KEY = "qpuc-social-my-name";

  // Pool de prénoms FR pour les faux joueurs
  const FIRSTNAMES = [
    "Léa", "Hugo", "Manon", "Lucas", "Chloé", "Nathan", "Emma", "Théo", "Camille", "Maxime",
    "Sarah", "Antoine", "Inès", "Jules", "Margaux", "Paul", "Élise", "Arthur", "Zoé", "Louis",
    "Anaïs", "Tom", "Romane", "Ethan", "Léna", "Adrien", "Clara", "Gabriel", "Juliette", "Raphaël",
    "Mathilde", "Noah", "Lola", "Enzo", "Apolline", "Sacha", "Iris", "Maxence", "Olivia", "Léo",
    "Ambre", "Aaron", "Charlotte", "Eliott"
  ];

  const SURNAME_SUFFIXES = ["du Net", "le Sage", "le Vif", "la Curieuse", "le Renard", "la Lune", "le Loup", "la Pivoine", "le Hibou", "la Mésange", ""];

  // ─── État ───
  function loadState() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) return JSON.parse(s);
    } catch {}
    return null;
  }
  function saveState(state) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  function getMyName() {
    return localStorage.getItem(MY_NAME_KEY) || "TOI";
  }
  function setMyName(name) { localStorage.setItem(MY_NAME_KEY, name.trim() || "TOI"); }

  // ─── Calculs de score perso ───
  // On lit qpuc-stats (le système de gamification) pour le score réel.
  function getMyScore() {
    try {
      const stats = JSON.parse(localStorage.getItem("qpuc-stats") || "{}");
      return stats.totalCorrect || stats.xp || 0;
    } catch { return 0; }
  }

  // Récupère MES paquets : ceux de FLASHCARD_PACKS sur lesquels j'ai au moins une carte vue.
  function getMyPackIds() {
    const result = [];
    if (typeof FLASHCARD_PACKS === "undefined") return result;
    try {
      const srs = JSON.parse(localStorage.getItem("qpuc-srs-v2") || "{}");
      for (const pack of FLASHCARD_PACKS) {
        const hasAny = Object.keys(srs).some((k) => k.startsWith(pack.id + ":"));
        if (hasAny) result.push(pack.id);
      }
    } catch {}
    // Si l'utilisateur n'a touché à rien, on lui attribue par défaut les 5 premiers
    // pour que les défis et le filtre "par paquet" aient du sens.
    if (!result.length && typeof FLASHCARD_PACKS !== "undefined") {
      return FLASHCARD_PACKS.slice(0, 5).map((p) => p.id);
    }
    return result;
  }

  // ─── Seed des faux joueurs (une seule fois) ───
  function seedIfNeeded() {
    let state = loadState();
    if (state && state.players && state.players.length) return state;

    const players = [];
    const usedNames = new Set();
    for (let i = 0; i < 30; i++) {
      let name;
      do {
        const first = FIRSTNAMES[Math.floor(Math.random() * FIRSTNAMES.length)];
        const suffix = SURNAME_SUFFIXES[Math.floor(Math.random() * SURNAME_SUFFIXES.length)];
        name = suffix ? `${first} ${suffix}` : first;
      } while (usedNames.has(name));
      usedNames.add(name);

      // Score gaussien autour de 250, avec quelques outliers
      const base = 50 + Math.floor(Math.random() * 600);
      const bonus = Math.random() < 0.15 ? Math.floor(Math.random() * 400) : 0;

      // 1 à 4 paquets random + chance d'avoir un paquet "perso"
      const allPackIds = typeof FLASHCARD_PACKS !== "undefined"
        ? FLASHCARD_PACKS.map((p) => p.id)
        : [];
      const nPacks = 1 + Math.floor(Math.random() * 4);
      const shuffled = [...allPackIds].sort(() => Math.random() - 0.5);
      const packs = shuffled.slice(0, nPacks);

      const customPack = Math.random() < 0.4 ? generateCustomPack(name) : null;

      players.push({
        id: "p" + i,
        name,
        score: base + bonus,
        packs,
        customPack,
        avatar: ["🦊", "🦉", "🐺", "🦦", "🦝", "🐰", "🐬", "🦚", "🐢", "🦜"][i % 10]
      });
    }
    state = { players, stolenPacks: [], lastBoost: 0 };
    saveState(state);
    return state;
  }

  function generateCustomPack(authorName) {
    const themes = [
      { title: "Mes pièges en histoire", desc: "Les questions où je me suis planté(e)", emoji: "📜" },
      { title: "Quizz de la fac", desc: "Notes prises en amphi, jamais relues", emoji: "🎓" },
      { title: "Best of QPUC", desc: "Les meilleures questions du jeu télé", emoji: "📺" },
      { title: "Curiosités scientifiques", desc: "Les trucs qu'on n'apprend pas à l'école", emoji: "🔬" },
      { title: "Capitales obscures", desc: "Tout sauf les évidentes", emoji: "🌍" },
      { title: "Citations à placer", desc: "Pour briller en soirée", emoji: "💬" },
      { title: "Mythologie pratique", desc: "Grecque, romaine, nordique mélangées", emoji: "⚡" },
      { title: "Cinéma de niche", desc: "Films cultes mais oubliés", emoji: "🎬" }
    ];
    const t = themes[Math.floor(Math.random() * themes.length)];
    return {
      id: "custom-" + authorName.replace(/\s+/g, "-").toLowerCase() + "-" + Math.floor(Math.random() * 999),
      title: t.title,
      description: t.desc,
      emoji: t.emoji,
      cardsCount: 8 + Math.floor(Math.random() * 22),
      author: authorName
    };
  }

  // ─── Rendu de l'onglet SOCIAL ───
  function renderSocial() {
    const state = seedIfNeeded();
    // Boost progressif pour donner l'impression que le monde vit
    const now = Date.now();
    if (now - (state.lastBoost || 0) > 60 * 1000) {
      for (const p of state.players) {
        // +0 à +3 pts par minute
        p.score += Math.floor(Math.random() * 4);
      }
      state.lastBoost = now;
      saveState(state);
    }
    // Default tab
    socialSwitchTab("general");
  }

  function socialSwitchTab(tab, btn) {
    document.querySelectorAll(".social-tab").forEach((b) => b.classList.remove("on"));
    const targetBtn = btn || document.querySelector(`.social-tab[data-stab="${tab}"]`);
    if (targetBtn) targetBtn.classList.add("on");

    const c = document.getElementById("social-content");
    if (!c) return;
    if (tab === "general") c.innerHTML = renderScoreboardGeneral();
    else if (tab === "bypack") c.innerHTML = renderScoreboardByPack();
    else if (tab === "defis")  c.innerHTML = renderDefis();
    else if (tab === "steal")  c.innerHTML = renderSteal();
  }

  function rankedRows(players, myScore, myName) {
    // Insère "moi" et trie par score desc
    const me = { id: "me", name: myName, score: myScore, isMe: true, avatar: "🦆" };
    const all = [...players, me].sort((a, b) => b.score - a.score);
    return all.map((p, i) => ({ rank: i + 1, ...p }));
  }

  function renderScoreboardGeneral() {
    const state = loadState();
    const my = { name: getMyName(), score: getMyScore() };
    const rows = rankedRows(state.players, my.score, my.name);

    return `
      <div class="social-board frame">
        <div class="social-board-header">
          <span class="social-h">🏆 SCOREBOARD GÉNÉRAL</span>
          <span class="social-me-rank">
            Ton rang : <strong>#${rows.find((r) => r.isMe).rank}</strong>
            · ${my.score} pts
          </span>
        </div>
        <div class="social-name-row">
          <label>Ton nom dans le classement :</label>
          <input id="social-my-name" class="mock-input" value="${escapeHtml(my.name)}" maxlength="24">
          <button class="btn btn-y" onclick="window.socialSaveMyName()">SAUVEGARDER</button>
        </div>
        <div class="scoreboard">
          ${rows.slice(0, 20).map((r) => rowHtml(r)).join("")}
        </div>
      </div>
    `;
  }

  function renderScoreboardByPack() {
    const state = loadState();
    const my = { name: getMyName(), score: getMyScore() };
    const myPacks = getMyPackIds();
    if (!myPacks.length) {
      return `<div class="social-empty frame">
        <p>Joue d'abord à au moins un paquet pour débloquer le classement par paquet.</p>
      </div>`;
    }
    const packs = typeof FLASHCARD_PACKS !== "undefined"
      ? FLASHCARD_PACKS.filter((p) => myPacks.includes(p.id))
      : [];

    return `
      <div class="social-board frame">
        <div class="social-board-header">
          <span class="social-h">📚 PAR PAQUET (ceux que tu joues)</span>
          <select id="social-pack-select" onchange="window.socialRefreshPackBoard()" class="mock-input social-pack-select">
            ${packs.map((p) => `<option value="${p.id}">${p.icon || "📦"} ${escapeHtml(p.name)}</option>`).join("")}
          </select>
        </div>
        <div id="social-pack-board"></div>
      </div>
    `;
  }

  function refreshPackBoard() {
    const sel = document.getElementById("social-pack-select");
    if (!sel) return;
    const packId = sel.value;
    const state = loadState();
    const my = { name: getMyName(), score: getMyScore() };

    // Joueurs qui ont ce paquet
    const playersWithPack = state.players.filter((p) => p.packs.includes(packId));
    // Score "par paquet" = un sous-ensemble du score total (mock : 30-70%)
    const scaled = playersWithPack.map((p) => ({
      ...p,
      score: Math.floor(p.score * (0.3 + Math.random() * 0.4))
    }));
    // Mon "score par paquet" : on essaie de lire les stats par pack, sinon proxy
    const myPackScore = readMyPackScore(packId) || Math.floor(my.score * 0.4);
    const rows = rankedRows(scaled, myPackScore, my.name);

    const el = document.getElementById("social-pack-board");
    if (el) {
      el.innerHTML = `
        <p class="social-board-sub">Ton rang : <strong>#${rows.find((r) => r.isMe).rank}</strong> sur ce paquet · ${myPackScore} pts</p>
        <div class="scoreboard">
          ${rows.slice(0, 15).map((r) => rowHtml(r)).join("")}
        </div>
      `;
    }
  }

  function readMyPackScore(packId) {
    // Compte les cartes "maîtrisées" du pack via SRS v2
    try {
      const srs = JSON.parse(localStorage.getItem("qpuc-srs-v2") || "{}");
      let count = 0;
      for (const [k, v] of Object.entries(srs)) {
        if (k.startsWith(packId + ":") && v && (v.state === "review" || v.reps >= 2)) count++;
      }
      return count * 5; // 5 pts par carte maîtrisée
    } catch { return 0; }
  }

  function renderDefis() {
    const state = loadState();
    const myPacks = getMyPackIds();

    // Joueurs avec qui je partage au moins un paquet
    const candidates = state.players
      .map((p) => {
        const shared = p.packs.filter((id) => myPacks.includes(id));
        return { ...p, shared };
      })
      .filter((p) => p.shared.length > 0)
      .sort((a, b) => b.shared.length - a.shared.length)
      .slice(0, 12);

    if (!candidates.length) {
      return `<div class="social-empty frame">
        <p>Aucun joueur ne partage tes paquets pour l'instant. Joue à plus de paquets pour débloquer des défis !</p>
      </div>`;
    }

    return `
      <div class="social-board frame">
        <div class="social-h">⚔️ DÉFIS — JOUEURS QUI ONT LES MÊMES PAQUETS QUE TOI</div>
        <p class="social-board-sub">Affronte-les sur un de vos paquets communs. Score à battre = le sien.</p>
        <div class="defi-grid">
          ${candidates.map((p) => `
            <div class="defi-card">
              <div class="defi-head">
                <span class="defi-avatar">${p.avatar}</span>
                <div>
                  <strong>${escapeHtml(p.name)}</strong>
                  <div class="defi-score">${p.score} pts · ${p.shared.length} paquet${p.shared.length > 1 ? "s" : ""} commun${p.shared.length > 1 ? "s" : ""}</div>
                </div>
              </div>
              <button class="btn" onclick="window.socialChallenge('${p.id}')">⚔️ DÉFIER</button>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderSteal() {
    const state = loadState();
    const withCustom = state.players.filter((p) => p.customPack && !state.stolenPacks.includes(p.customPack.id));

    return `
      <div class="social-board frame">
        <div class="social-h">🏴‍☠️ PAQUETS À VOLER</div>
        <p class="social-board-sub">Les paquets personnels créés par les autres joueurs. Vole-les pour les ajouter à tes paquets.</p>
        <div class="steal-grid">
          ${withCustom.length === 0 ? `<p>Tu as déjà tout volé. Reviens plus tard, d'autres joueurs en créeront.</p>` :
            withCustom.map((p) => `
              <div class="steal-card frame">
                <div class="steal-emoji">${p.customPack.emoji}</div>
                <h4 class="mock-card-title">${escapeHtml(p.customPack.title)}</h4>
                <p class="mock-card-desc">${escapeHtml(p.customPack.description)}</p>
                <div class="steal-meta">
                  <span>${p.customPack.cardsCount} cartes</span>
                  <span class="steal-author">par ${escapeHtml(p.name)} ${p.avatar}</span>
                </div>
                <button class="btn btn-y" onclick="window.socialSteal('${p.id}')">🏴‍☠️ VOLER CE PAQUET</button>
              </div>
            `).join("")
          }
        </div>
      </div>
    `;
  }

  // ─── Actions ───
  function challengePlayer(playerId) {
    const state = loadState();
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return;

    // Mini-défi mock : on tire un score random pour "toi" sur un quiz éclair
    const myThrow = Math.floor(50 + Math.random() * 450);
    const theirThrow = Math.floor(player.score * (0.4 + Math.random() * 0.5));
    const won = myThrow > theirThrow;

    if (won) {
      // +20 XP en interne
      try {
        const stats = JSON.parse(localStorage.getItem("qpuc-stats") || "{}");
        stats.totalCorrect = (stats.totalCorrect || 0) + 20;
        localStorage.setItem("qpuc-stats", JSON.stringify(stats));
      } catch {}
    }

    showSocialModal(`
      <h2 class="mock-title">${won ? "🏆 VICTOIRE" : "😶 DÉFAITE"}</h2>
      <div class="defi-vs">
        <div class="defi-vs-side">
          <div class="defi-avatar big">🦆</div>
          <strong>${escapeHtml(getMyName())}</strong>
          <div class="defi-vs-score ${won ? "win" : ""}">${myThrow}</div>
        </div>
        <div class="defi-vs-mid">VS</div>
        <div class="defi-vs-side">
          <div class="defi-avatar big">${player.avatar}</div>
          <strong>${escapeHtml(player.name)}</strong>
          <div class="defi-vs-score ${!won ? "win" : ""}">${theirThrow}</div>
        </div>
      </div>
      <p class="social-board-sub">${won ? "Tu gagnes 20 XP. Le canard est fier." : "Ils étaient meilleurs cette fois. Reviens t'entraîner."}</p>
      <button class="btn btn-y" onclick="window.socialCloseModal()">OK</button>
    `);
  }

  function stealPack(playerId) {
    const state = loadState();
    const player = state.players.find((p) => p.id === playerId);
    if (!player || !player.customPack) return;
    if (state.stolenPacks.includes(player.customPack.id)) return;

    state.stolenPacks.push(player.customPack.id);
    saveState(state);

    // On l'ajoute aussi aux "user packs" pour qu'il apparaisse dans MES PAQUETS
    try {
      const userPacks = JSON.parse(localStorage.getItem("culture_mock_user_packs") || "[]");
      userPacks.push({
        id: player.customPack.id,
        title: player.customPack.title + " (volé à " + player.name + ")",
        description: player.customPack.description,
        emoji: player.customPack.emoji,
        category: "Volé",
        cards: [] // les vraies cartes : à générer au moment d'ouvrir, en mock
      });
      localStorage.setItem("culture_mock_user_packs", JSON.stringify(userPacks));
    } catch {}

    showSocialModal(`
      <h2 class="mock-title">🏴‍☠️ PAQUET VOLÉ</h2>
      <p class="mock-card-desc">Tu as volé <strong>${escapeHtml(player.customPack.title)}</strong> à ${escapeHtml(player.name)}. Il est maintenant dans tes paquets.</p>
      <button class="btn btn-y" onclick="window.socialCloseModal()">OK</button>
    `);
    // Refresh la liste
    setTimeout(() => socialSwitchTab("steal"), 300);
  }

  function saveMyName() {
    const el = document.getElementById("social-my-name");
    if (!el) return;
    setMyName(el.value);
    socialSwitchTab("general");
  }

  // ─── Modal helper ───
  function showSocialModal(html) {
    const existing = document.getElementById("social-modal");
    if (existing) existing.remove();
    const m = document.createElement("div");
    m.id = "social-modal";
    m.className = "mock-modal-backdrop";
    m.innerHTML = `<div class="mock-modal frame social-modal-inner">
      <button class="mock-close" onclick="window.socialCloseModal()">×</button>
      ${html}
    </div>`;
    document.body.appendChild(m);
    m.addEventListener("click", (e) => { if (e.target === m) closeSocialModal(); });
  }
  function closeSocialModal() {
    const m = document.getElementById("social-modal");
    if (m) m.remove();
  }

  function rowHtml(r) {
    const medal = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : "";
    return `
      <div class="sb-row ${r.isMe ? "me" : ""}">
        <div class="sb-rank">${medal || "#" + r.rank}</div>
        <div class="sb-avatar">${r.avatar}</div>
        <div class="sb-name">${escapeHtml(r.name)}${r.isMe ? " (toi)" : ""}</div>
        <div class="sb-score">${r.score} pts</div>
      </div>
    `;
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ─── Exports ───
  window.renderSocial         = renderSocial;
  window.socialSwitchTab      = socialSwitchTab;
  window.socialRefreshPackBoard = refreshPackBoard;
  window.socialChallenge      = challengePlayer;
  window.socialSteal          = stealPack;
  window.socialSaveMyName     = saveMyName;
  window.socialCloseModal     = closeSocialModal;
})();
