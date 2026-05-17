// canard-settings.js — UI de la page "🦆 CANARD"
// Bouton "Je veux le canard sur mon écran" + tous les contrôles (skin, taille, timer, visibilité)

(function () {
  // Déclencheur fiable du protocole canard:// — l'iframe est bloquée par
  // certains navigateurs depuis HTTPS, donc on clique sur un <a> caché.
  function triggerCanard(url) {
    const a = document.createElement("a");
    a.href = url;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 500);
  }

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
    if (labelEl && LEVEL[currentLvl]) {
      if (s.name && s.name.trim()) {
        labelEl.textContent = s.name.trim() + " — " + LEVEL[currentLvl].label;
      } else {
        labelEl.textContent = LEVEL[currentLvl].label;
      }
    }

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
      b.onclick = () => {
        Duck.update({ size: b.dataset.size });
        Duck.render();
        triggerCanard("canard://size-" + b.dataset.size);
        refresh();
      };
    });

    // Interval
    document.querySelectorAll(".duck-interval-btn").forEach((b) => {
      const val = parseInt(b.dataset.interval, 10);
      b.classList.toggle("on", val === s.intervalMin);
      b.onclick = () => {
        Duck.update({ intervalMin: val });
        Duck.render();
        triggerCanard("canard://interval-" + val);
        refresh();
      };
    });

    // Nom du canard
    const nameEl = document.getElementById("duck-name-input");
    if (nameEl) {
      nameEl.value = s.name || "";
      nameEl.oninput = () => {
        Duck.update({ name: nameEl.value.trim() });
        // Update label preview si nom donné
        const lbl = document.getElementById("duck-skin-label");
        if (lbl) {
          if (nameEl.value.trim()) lbl.textContent = nameEl.value.trim() + " — " + (LEVEL[currentLvl] ? LEVEL[currentLvl].label : "Canard");
          else if (LEVEL[currentLvl]) lbl.textContent = LEVEL[currentLvl].label;
        }
      };
    }

    // Reset score button
    const resetBtn = document.getElementById("btn-reset-score");
    if (resetBtn) {
      resetBtn.onclick = () => {
        if (!confirm("Reset le score à 0 ? (web + bureau)")) return;
        Duck.resetScore();
        triggerCanard("canard://reset-score");
        refresh();
      };
    }

    // Désactiver le canard
    const deactivateBtn = document.getElementById("btn-deactivate-duck");
    if (deactivateBtn) {
      deactivateBtn.onclick = () => {
        if (!confirm("Désactiver le canard ? (ferme l'app desktop)")) return;
        Duck.update({ enabled: false });
        Duck.render();
        triggerCanard("canard://quit");
        localStorage.removeItem("qpuc-desktop-active");
        // Reset bouton launch
        const launchBtn = document.getElementById("btn-launch-desktop-duck");
        if (launchBtn) {
          launchBtn.textContent = "JE VEUX LE CANARD SUR MON ÉCRAN";
          launchBtn.classList.remove("duck-launched");
        }
      };
    }

    // Bouton launch : update label si desktop actif
    const launchBtn = document.getElementById("btn-launch-desktop-duck");
    if (launchBtn) {
      if (localStorage.getItem("qpuc-desktop-active") === "1") {
        launchBtn.textContent = "✓ CANARD ACTIF SUR LE BUREAU";
        launchBtn.classList.add("duck-launched");
      } else {
        launchBtn.textContent = "JE VEUX LE CANARD SUR MON ÉCRAN";
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
      triggerCanard("canard://launch");
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
