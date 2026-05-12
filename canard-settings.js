// canard-settings.js — UI de la page "🦆 CANARD"
// Synchronise les contrôles avec window.Duck

(function () {
  function refresh() {
    if (typeof Duck === "undefined") return;
    const s = Duck.getState();
    const SKINS = Duck.SKINS;

    // Score display
    const scoreEl = document.getElementById("duck-score-display");
    if (scoreEl) scoreEl.textContent = "SCORE " + s.score;

    // Preview
    const skin = SKINS[s.skin] || SKINS[1];
    const previewEmoji = document.querySelector("#duck-preview-big .duck-emoji-big");
    const previewAcc = document.querySelector("#duck-preview-big .duck-accessory-big");
    if (previewEmoji) previewEmoji.textContent = skin.duck;
    if (previewAcc) previewAcc.textContent = skin.accessory;
    const labelEl = document.getElementById("duck-skin-label");
    if (labelEl) labelEl.textContent = skin.label;

    // Skin grid
    const skinRow = document.getElementById("duck-skin-row");
    if (skinRow) {
      skinRow.innerHTML = "";
      const autoMax = s.autoUnlock ? Duck.autoSkinFromScore(s.score) : 5;
      for (let i = 1; i <= 5; i++) {
        const sk = SKINS[i];
        const btn = document.createElement("button");
        const locked = s.autoUnlock && i > autoMax;
        btn.className = "duck-skin-card" + (s.skin === i ? " on" : "") + (locked ? " locked" : "");
        const thresholds = [0, 10, 25, 50, 100];
        btn.innerHTML = `
          <div class="duck-skin-mini">
            <div class="duck-mini-emoji">${sk.duck}</div>
            <div class="duck-mini-acc">${sk.accessory}</div>
          </div>
          <div class="duck-skin-lbl">${sk.label}</div>
          <div class="duck-skin-thresh">${locked ? "🔒 " + thresholds[i-1] + " pts" : "✓"}</div>
        `;
        btn.onclick = () => {
          if (locked) return;
          Duck.update({ skin: i });
          Duck.render();
          refresh();
        };
        skinRow.appendChild(btn);
      }
    }

    // Auto unlock checkbox
    const autoEl = document.getElementById("duck-auto-unlock");
    if (autoEl) {
      autoEl.checked = !!s.autoUnlock;
      autoEl.onchange = () => {
        Duck.update({ autoUnlock: autoEl.checked });
        refresh();
      };
    }

    // Size buttons
    document.querySelectorAll(".duck-size-btn").forEach((b) => {
      b.classList.toggle("on", b.dataset.size === s.size);
      b.onclick = () => {
        Duck.update({ size: b.dataset.size });
        Duck.render();
        refresh();
      };
    });

    // Interval buttons
    document.querySelectorAll(".duck-interval-btn").forEach((b) => {
      const val = parseInt(b.dataset.interval, 10);
      b.classList.toggle("on", val === s.intervalMin);
      b.onclick = () => {
        Duck.update({ intervalMin: val });
        Duck.render();
        refresh();
      };
    });

    // Enabled toggle
    const enEl = document.getElementById("duck-enabled");
    if (enEl) {
      enEl.checked = !!s.enabled;
      enEl.onchange = () => {
        Duck.update({ enabled: enEl.checked });
        Duck.render();
        refresh();
      };
    }
  }

  window.refreshDuckUI = refresh;

  // Hook into goToTab so when CANARD is shown, we refresh
  const origGoTab = window.goToTab;
  window.goToTab = function (tab) {
    if (typeof origGoTab === "function") origGoTab(tab);
    // Also handle "canard" tab here (not in culture-app map)
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

  // Initial refresh
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(refresh, 200));
  } else {
    setTimeout(refresh, 200);
  }
})();
