// canard-settings.js — UI de la page "🦆 CANARD"
// Bouton "Je veux le canard sur mon écran" + tous les contrôles (skin, taille, timer, visibilité)

(function () {
  const LEGACY_DESKTOP_ACTIVE_KEY = "qpuc-desktop-active";
  const DESKTOP_LAUNCH_AT_KEY = "qpuc-desktop-launch-at";
  const RECENT_LAUNCH_MS = 2 * 60 * 1000;
  const DOWNLOADS = {
    windows: "https://github.com/alicebrun2106-lgtm/cultureeeee/releases/download/v1.0.0/Canard.de.bureau-1.0.0-win-x64.zip"
  };

  function detectedDownload() {
    const platform = String(
      (navigator.userAgentData && navigator.userAgentData.platform) ||
      navigator.platform ||
      navigator.userAgent ||
      ""
    ).toLowerCase();

    if (platform.includes("win")) {
      return { url: DOWNLOADS.windows, label: "TÉLÉCHARGER POUR WINDOWS", unavailable: false };
    }

    if (platform.includes("mac")) {
      return { url: "", label: "VERSION MAC EN COURS DE CERTIFICATION", unavailable: true };
    }

    return { url: "", label: "CHOISIS TA VERSION CI-DESSOUS", unavailable: true };
  }

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

  function clearFakeDesktopActiveState() {
    localStorage.removeItem(LEGACY_DESKTOP_ACTIVE_KEY);
  }

  function getRecentLaunchAttempt() {
    const ts = Number(localStorage.getItem(DESKTOP_LAUNCH_AT_KEY) || 0);
    return Number.isFinite(ts) && ts > 0 && Date.now() - ts < RECENT_LAUNCH_MS;
  }

  function setLaunchButtonIdle(btn) {
    btn.textContent = getRecentLaunchAttempt()
      ? "RELANCER LE CANARD SUR LE BUREAU"
      : "J'AI DÉJÀ L'APP : OUVRIR";
    btn.classList.toggle("duck-launching", getRecentLaunchAttempt());
    btn.classList.remove("duck-launched");
    btn.disabled = false;
  }

  function refresh() {
    clearFakeDesktopActiveState();
    const duck = window.Duck;
    if (!duck) {
      const launchBtn = document.getElementById("btn-launch-desktop-duck");
      if (launchBtn && launchBtn.dataset.launching !== "1") {
        setLaunchButtonIdle(launchBtn);
      }
      return;
    }
    const s = duck.getState();
    const LEVEL = duck.LEVEL_INFO;
    const currentLvl = duck.currentLevel();
    const autoLvl = duck.levelFromScore(s.score);

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
          duck.update({ forcedLevel: i });
          duck.render();
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
        if (autoEl.checked) duck.update({ forcedLevel: null });
        duck.render();
        refresh();
      };
    }

    // Size
    document.querySelectorAll(".duck-size-btn").forEach((b) => {
      b.classList.toggle("on", b.dataset.size === s.size);
      b.onclick = () => {
        duck.update({ size: b.dataset.size });
        duck.render();
        triggerCanard("canard://size-" + b.dataset.size);
        refresh();
      };
    });

    // Interval
    document.querySelectorAll(".duck-interval-btn").forEach((b) => {
      const val = parseInt(b.dataset.interval, 10);
      b.classList.toggle("on", val === s.intervalMin);
      b.onclick = () => {
        duck.update({ intervalMin: val });
        duck.render();
        triggerCanard("canard://interval-" + val);
        refresh();
      };
    });

    // Nom du canard
    const nameEl = document.getElementById("duck-name-input");
    if (nameEl) {
      nameEl.value = s.name || "";
      nameEl.oninput = () => {
        duck.update({ name: nameEl.value.trim() });
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
        duck.resetScore();
        triggerCanard("canard://reset-score");
        refresh();
      };
    }

    // Désactiver le canard
    const deactivateBtn = document.getElementById("btn-deactivate-duck");
    if (deactivateBtn) {
      deactivateBtn.onclick = () => {
        if (!confirm("Désactiver le canard ? (ferme l'app desktop)")) return;
        duck.update({ enabled: false });
        duck.render();
        triggerCanard("canard://quit");
        clearFakeDesktopActiveState();
        localStorage.removeItem(DESKTOP_LAUNCH_AT_KEY);
        // Reset bouton launch
        const launchBtn = document.getElementById("btn-launch-desktop-duck");
        if (launchBtn) {
          setLaunchButtonIdle(launchBtn);
        }
      };
    }

    // Bouton launch : ne jamais afficher "actif" sans confirmation desktop.
    const launchBtn = document.getElementById("btn-launch-desktop-duck");
    if (launchBtn && launchBtn.dataset.launching !== "1") {
      setLaunchButtonIdle(launchBtn);
    }
  }

  window.refreshDuckUI = refresh;

  function setupDownloadButton() {
    const btn = document.getElementById("btn-download-desktop-duck");
    if (!btn) return;
    const download = detectedDownload();
    btn.textContent = download.label;
    btn.classList.toggle("duck-dl-disabled", download.unavailable);
    btn.setAttribute("aria-disabled", download.unavailable ? "true" : "false");
    if (download.url) btn.href = download.url;
    else btn.removeAttribute("href");

    const macNote = document.getElementById("duck-mac-certification");
    if (macNote) macNote.hidden = !download.unavailable || !String(navigator.platform || navigator.userAgent || "").toLowerCase().includes("mac");

    btn.onclick = (event) => {
      if (download.unavailable) {
        event.preventDefault();
        return;
      }
      const hint = document.getElementById("duck-launch-hint");
      if (hint) hint.style.display = "";
      btn.classList.add("duck-download-started");
      setTimeout(() => btn.classList.remove("duck-download-started"), 1800);
    };
  }

  // Ce bouton sert uniquement après installation ; le bouton principal télécharge l'app.
  function setupLaunchButton() {
    const btn = document.getElementById("btn-launch-desktop-duck");
    if (!btn) return;
    btn.onclick = () => {
      const hint = document.getElementById("duck-launch-hint");
      clearFakeDesktopActiveState();
      localStorage.setItem(DESKTOP_LAUNCH_AT_KEY, String(Date.now()));
      triggerCanard("canard://launch");
      // Cache le canard web (le desktop prend le relais)
      if (window.Duck) {
        window.Duck.update({ enabled: false });
        window.Duck.render();
      }
      if (hint) hint.style.display = "";
      btn.dataset.launching = "1";
      btn.disabled = true;
      btn.textContent = "OUVERTURE DU CANARD...";
      btn.classList.add("duck-launching");
      btn.classList.remove("duck-launched");
      setTimeout(() => {
        delete btn.dataset.launching;
        refresh();
      }, 1400);
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
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(refresh, 200);
      setupDownloadButton();
      setupLaunchButton();
    });
  } else {
    setTimeout(() => { refresh(); setupDownloadButton(); setupLaunchButton(); }, 200);
  }
  setTimeout(() => { setupDownloadButton(); setupLaunchButton(); refresh(); }, 1000);
})();
