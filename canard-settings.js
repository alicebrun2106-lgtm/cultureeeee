// canard-settings.js — UI de la page "🦆 CANARD"
// Bouton "Je veux le canard sur mon écran" + tous les contrôles (skin, taille, timer, visibilité)

(function () {
  function refresh() {
    if (typeof Duck === "undefined") return;
    const s = Duck.getState();
    const LEVEL = Duck.LEVEL_INFO;
    const currentLvl = Duck.currentLevel();
    const autoLvl = Duck.levelFromScore(s.score);

    // Score display
    const scoreEl = document.getElementById("duck-score-display");
    if (scoreEl) scoreEl.textContent = "SCORE " + s.score;

    // Preview image
    const previewImg = document.getElementById("duck-preview-img");
    if (previewImg) {
      previewImg.onerror = function () {
        if (previewImg.src.endsWith(".webp")) {
          previewImg.src = "assets/duck-" + currentLvl + ".png";
        }
      };
      previewImg.src = "assets/duck-" + currentLvl + ".webp";
    }
    const labelEl = document.getElementById("duck-skin-label");
    if (labelEl && LEVEL[currentLvl]) labelEl.textContent = LEVEL[currentLvl].label;

    // Grille des 4 niveaux avec sprites
    const row = document.getElementById("duck-skin-row");
    if (row) {
      row.innerHTML = "";
      for (let i = 1; i <= 4; i++) {
        const info = LEVEL[i];
        const locked = i > autoLvl && i !== s.forcedLevel;
        const card = document.createElement("button");
        card.className = "duck-level-card" + (currentLvl === i ? " on" : "") + (locked ? " locked" : "");
        card.innerHTML = `
          <img class="duck-level-mini-img" src="assets/duck-${i}.png" alt="Niveau ${i}">
          <div class="duck-level-lbl">${info.label}</div>
          <div class="duck-level-thresh">${i === 1 ? "✓" : (locked ? "🔒 " + info.min + " pts" : "✓ Débloqué")}</div>
        `;
        card.onclick = () => {
          if (locked) return;
          Duck.update({ forcedLevel: i });
          Duck.render();
          refresh();
        };
        row.appendChild(card);
      }
    }

    // Auto unlock
    const autoEl = document.getElementById("duck-auto-unlock");
    if (autoEl) {
      autoEl.checked = !s.forcedLevel;
      autoEl.onchange = () => {
        if (autoEl.checked) Duck.update({ forcedLevel: null });
        Duck.render();
        refresh();
      };
    }

    // Size
    document.querySelectorAll(".duck-size-btn").forEach((b) => {
      b.classList.toggle("on", b.dataset.size === s.size);
      b.onclick = () => { Duck.update({ size: b.dataset.size }); Duck.render(); refresh(); };
    });

    // Interval
    document.querySelectorAll(".duck-interval-btn").forEach((b) => {
      const val = parseInt(b.dataset.interval, 10);
      b.classList.toggle("on", val === s.intervalMin);
      b.onclick = () => { Duck.update({ intervalMin: val }); Duck.render(); refresh(); };
    });

    // Enabled
    const enEl = document.getElementById("duck-enabled");
    if (enEl) {
      enEl.checked = !!s.enabled;
      enEl.onchange = () => {
        Duck.update({ enabled: enEl.checked });
        Duck.render();
        if (enEl.checked) localStorage.removeItem("qpuc-desktop-active");
        refresh();
      };
    }

    // Bouton launch : update label si desktop actif
    const launchBtn = document.getElementById("btn-launch-desktop-duck");
    if (launchBtn) {
      if (localStorage.getItem("qpuc-desktop-active") === "1") {
        launchBtn.textContent = "✓ CANARD ACTIF SUR LE BUREAU";
        launchBtn.classList.add("duck-launched");
      } else {
        launchBtn.textContent = "▶ JE VEUX LE CANARD SUR MON ÉCRAN";
        launchBtn.classList.remove("duck-launched");
      }
    }
  }

  window.refreshDuckUI = refresh;

  // Bouton launch → lance l'app desktop + cache le canard web
  function setupLaunchButton() {
    const btn = document.getElementById("btn-launch-desktop-duck");
    if (!btn) return;
    btn.onclick = () => {
      const hint = document.getElementById("duck-launch-hint");
      // Lance via protocole canard://
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = "canard://launch";
      document.body.appendChild(iframe);
      setTimeout(() => iframe.remove(), 1000);
      // Cache le canard web (le desktop prend le relais)
      if (typeof Duck !== "undefined") {
        Duck.update({ enabled: false });
        Duck.render();
      }
      localStorage.setItem("qpuc-desktop-active", "1");
      if (hint) hint.style.display = "";
      btn.textContent = "✓ CANARD LANCÉ SUR LE BUREAU";
      btn.classList.add("duck-launched");
      setTimeout(refresh, 100);
    };
  }

  // Hook sur goToTab pour gérer l'onglet "canard"
  const origGoTab = window.goToTab;
  window.goToTab = function (tab) {
    if (typeof origGoTab === "function") origGoTab(tab);
    if (tab === "canard") {
      document.querySelectorAll(".page-section").forEach((s) => s.classList.remove("active"));
      const el = document.getElementById("page-canard");
      if (el) el.classList.add("active");
      document.querySelectorAll(".nav-links a").forEach((a) => {
        a.classList.toggle("active", a.dataset.tab === "canard");
      });
      setTimeout(refresh, 50);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { setTimeout(refresh, 200); setupLaunchButton(); });
  } else {
    setTimeout(() => { refresh(); setupLaunchButton(); }, 200);
  }
})();
