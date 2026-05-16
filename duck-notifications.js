// duck-notifications.js
// Notifications du canard sur mobile (PWA) — Phase 1 : sans backend.
//
// Fonctionnement :
//   - L'user active les notifications, choisit une fréquence (30min, 1h, 2h, 4h)
//   - Tant que l'app est ouverte (ou dans les apps récentes), le canard ping
//   - Chaque ping = une question random tirée des paquets que l'user joue
//   - Tap sur la notif → ouvre l'app sur la session du paquet
//
// Limitations :
//   - Si l'app est totalement fermée (pas dans recent apps), ça s'arrête
//   - Pour du push 24/7 even quand le tel est verrouillé : besoin d'un backend

(function () {
  const STORAGE_KEY = "qpuc-duck-notif";

  const DEFAULTS = {
    enabled: false,
    intervalMin: 60,   // 30 / 60 / 120 / 240
    lastPingAt: 0,
  };

  function loadState() {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; }
    catch { return { ...DEFAULTS }; }
  }
  function saveState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

  let timerId = null;

  // Picks a random question from the user's added packs
  function pickRandomQuestion() {
    try {
      if (typeof FLASHCARD_PACKS === "undefined") return null;
      const addedIds = JSON.parse(localStorage.getItem("qpuc-added-packs") || "[]");
      const myPacks = FLASHCARD_PACKS.filter((p) => addedIds.includes(p.id));
      const pool = myPacks.length ? myPacks : FLASHCARD_PACKS.slice(0, 10);
      if (!pool.length) return null;
      const pack = pool[Math.floor(Math.random() * pool.length)];
      if (!pack.cards || !pack.cards.length) return null;
      const card = pack.cards[Math.floor(Math.random() * pack.cards.length)];
      return { pack, card };
    } catch { return null; }
  }

  // Envoie une notification système via le service worker
  async function sendDuckPing() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const q = pickRandomQuestion();
    if (!q) return;

    const title = "🦆 Le canard a une question";
    const body = q.card.front;
    const data = { url: "/?openSession=" + encodeURIComponent(q.pack.id), packId: q.pack.id };

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: "assets/icon-192.png",
          badge: "assets/icon-192.png",
          tag: "duck-ping",
          renotify: true,
          data,
          actions: [
            { action: "open", title: "Répondre" },
            { action: "dismiss", title: "Plus tard" }
          ]
        });
      } else {
        // Fallback : notification basic sans SW (moins riche)
        new Notification(title, { body, icon: "assets/icon-192.png" });
      }
      const s = loadState();
      s.lastPingAt = Date.now();
      saveState(s);
    } catch (e) {
      console.warn("Duck notification failed:", e);
    }
  }

  // Programme le prochain ping selon la fréquence
  function scheduleNext() {
    if (timerId) clearTimeout(timerId);
    const s = loadState();
    if (!s.enabled) return;
    const intervalMs = s.intervalMin * 60 * 1000;
    const elapsed = Date.now() - (s.lastPingAt || 0);
    const wait = Math.max(5000, intervalMs - elapsed); // au moins 5s pour pas spammer
    timerId = setTimeout(async () => {
      await sendDuckPing();
      scheduleNext();
    }, wait);
  }

  function stop() {
    if (timerId) { clearTimeout(timerId); timerId = null; }
  }

  // ─── API publique ───
  async function enable(intervalMin) {
    if (!("Notification" in window)) {
      alert("Ton navigateur ne supporte pas les notifications.");
      return false;
    }
    let perm = Notification.permission;
    if (perm === "default") {
      perm = await Notification.requestPermission();
    }
    if (perm !== "granted") {
      alert("Notifications refusées. Tu peux les réactiver dans les réglages du navigateur.");
      return false;
    }
    const s = loadState();
    s.enabled = true;
    s.intervalMin = intervalMin || s.intervalMin || 60;
    saveState(s);
    scheduleNext();
    // Premier ping pour confirmer que ça marche
    setTimeout(sendDuckPing, 2000);
    return true;
  }

  function disable() {
    const s = loadState();
    s.enabled = false;
    saveState(s);
    stop();
  }

  function setInterval_(intervalMin) {
    const s = loadState();
    s.intervalMin = intervalMin;
    saveState(s);
    if (s.enabled) scheduleNext();
  }

  function getStatus() {
    const s = loadState();
    return {
      enabled: s.enabled,
      intervalMin: s.intervalMin,
      permission: ("Notification" in window) ? Notification.permission : "unsupported",
      lastPingAt: s.lastPingAt
    };
  }

  // ─── UI sur la page CANARD ───
  function wireUI() {
    const enabledBlock = document.getElementById("duck-notif-enabled");
    const disabledBlock = document.getElementById("duck-notif-disabled");
    if (!enabledBlock || !disabledBlock) return;

    function refreshUI() {
      const st = getStatus();
      if (st.enabled && st.permission === "granted") {
        disabledBlock.style.display = "none";
        enabledBlock.style.display = "";
        const label = ({30: "30 min", 60: "1 heure", 120: "2 heures", 240: "4 heures"})[st.intervalMin] || (st.intervalMin + " min");
        const lbl = document.getElementById("duck-notif-interval-label");
        if (lbl) lbl.textContent = label;
        document.querySelectorAll(".duck-notif-int-btn").forEach((b) => {
          b.classList.toggle("on", parseInt(b.dataset.int, 10) === st.intervalMin);
        });
      } else {
        disabledBlock.style.display = "";
        enabledBlock.style.display = "none";
        const perm = document.getElementById("duck-notif-perm");
        if (perm) {
          if (st.permission === "denied") perm.textContent = "⛔ Refusé (réactiver dans les réglages navigateur)";
          else if (st.permission === "granted") perm.textContent = "✅ Autorisé (active pour démarrer)";
          else if (st.permission === "unsupported") perm.textContent = "❌ Non supporté par ce navigateur";
          else perm.textContent = "À autoriser au prochain clic";
        }
      }
    }

    const btnEnable = document.getElementById("btn-enable-duck-notif");
    if (btnEnable) btnEnable.onclick = async () => { await enable(60); refreshUI(); };

    const btnDisable = document.getElementById("btn-disable-duck-notif");
    if (btnDisable) btnDisable.onclick = () => { disable(); refreshUI(); };

    const btnTest = document.getElementById("btn-test-duck-notif");
    if (btnTest) btnTest.onclick = () => sendDuckPing();

    document.querySelectorAll(".duck-notif-int-btn").forEach((b) => {
      b.onclick = () => { setInterval_(parseInt(b.dataset.int, 10)); refreshUI(); };
    });

    refreshUI();
  }

  // Démarre auto au chargement si déjà activé
  function init() {
    const s = loadState();
    if (s.enabled && "Notification" in window && Notification.permission === "granted") {
      scheduleNext();
    }
    // L'UI est sur la page CANARD ; on la wire à chaque changement d'onglet
    wireUI();
    // Hook : si goToTab existe, on re-wire quand on revient sur canard
    const origGoTab = window.goToTab;
    if (typeof origGoTab === "function" && !window.__duckNotifHook) {
      window.__duckNotifHook = true;
      window.goToTab = function (tab) {
        const r = origGoTab.apply(this, arguments);
        if (tab === "canard") setTimeout(wireUI, 80);
        return r;
      };
    }
  }

  window.DuckNotif = {
    enable, disable, setInterval: setInterval_, getStatus,
    sendNow: sendDuckPing
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
