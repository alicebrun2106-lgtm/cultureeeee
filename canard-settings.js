// canard-settings.js — Gère le bouton "Je veux le canard sur mon écran"
// Plus de skin/size/timer sur le web : tout est géré par l'app desktop.

(function () {
  function setupLaunchButton() {
    const btn = document.getElementById("btn-launch-desktop-duck");
    if (!btn) return;
    // Si l'user a déjà cliqué auparavant, label "✓ déjà lancé"
    if (localStorage.getItem("qpuc-desktop-active") === "1") {
      btn.textContent = "✓ CANARD ACTIF SUR LE BUREAU";
      btn.classList.add("duck-launched");
    }
    btn.onclick = () => {
      const hint = document.getElementById("duck-launch-hint");
      // Lance l'app desktop via protocole custom canard://
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = "canard://launch";
      document.body.appendChild(iframe);
      setTimeout(() => iframe.remove(), 1000);
      // Marque le desktop comme actif
      localStorage.setItem("qpuc-desktop-active", "1");
      // Met à jour le bouton
      btn.textContent = "✓ CANARD LANCÉ SUR LE BUREAU";
      btn.classList.add("duck-launched");
      // Affiche le fallback
      if (hint) hint.style.display = "";
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupLaunchButton);
  } else {
    setTimeout(setupLaunchButton, 100);
  }
})();
