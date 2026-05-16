// feedback-survey.js
// Sondage "I would pay for X" — fake door test pour valider la demande
// avant de coder les vraies features payantes.
//
// Comportement :
//   - Affiche un modal au clic sur une feature "coming soon"
//   - 3 questions : usage, prix, commentaire
//   - Sauvegarde dans localStorage (pour l'user) + POST vers Formspree (pour Alice)
//   - Toast "Merci !" puis fermeture

(function () {
  // 🔑 ENDPOINT FORMSPREE — chaque vote arrive par email à Alice
  const FORMSPREE_ENDPOINT = "https://formspree.io/f/mvzyppza";

  const VOTES_KEY = "qpuc-feature-votes";

  // ─── Stockage des votes ───
  function loadVotes() {
    try { return JSON.parse(localStorage.getItem(VOTES_KEY) || "[]"); } catch { return []; }
  }
  function saveVote(vote) {
    const all = loadVotes();
    all.push(vote);
    localStorage.setItem(VOTES_KEY, JSON.stringify(all));
  }

  // ─── Ouverture du modal de sondage ───
  // featureKey : id unique (ex: "livre-cartes")
  // featureName : titre lisible
  // featureDesc : description courte
  // priceProposed : prix qu'on TEST (ex: "4,99€/mois" ou "0,99€ par livre")
  // priceSub : prix abo alternatif (optionnel, ex: "Inclus dans Premium 4,99€/mois")
  function openSurvey(featureKey, featureName, featureDesc, priceProposed, priceSub) {
    closeSurvey();

    const priceBlock = priceSub
      ? `<div class="fb-price-main">${escapeHtml(priceProposed)}</div>
         <div class="fb-price-sub">ou ${escapeHtml(priceSub)}</div>`
      : `<div class="fb-price-main">${escapeHtml(priceProposed)}</div>`;

    const modal = document.createElement("div");
    modal.id = "fb-survey-modal";
    modal.className = "mock-modal-backdrop fb-modal";
    modal.innerHTML = `
      <div class="mock-modal frame fb-modal-inner">
        <button class="mock-close" onclick="window.fbCloseSurvey()">×</button>

        <div class="fb-coming-tag">🔜 BIENTÔT</div>
        <h2 class="mock-title">${escapeHtml(featureName)}</h2>
        <p class="mock-sub">${escapeHtml(featureDesc)}</p>

        <div class="fb-price-card">
          <div class="fb-price-label">💰 PRIX</div>
          ${priceBlock}
        </div>

        <div class="fb-divider"></div>

        <p class="fb-intro">
          <strong>À ce prix, tu prendrais ?</strong>
        </p>

        <div class="fb-question">
          <div class="fb-options fb-options-vert">
            <button type="button" class="fb-opt" data-q="reaction" data-v="oui">👍 Oui, à ce prix je prends</button>
            <button type="button" class="fb-opt" data-q="reaction" data-v="peut-etre">🤔 Peut-être, j'essaierais</button>
            <button type="button" class="fb-opt" data-q="reaction" data-v="trop-cher">💸 Intéressé(e), mais trop cher</button>
            <button type="button" class="fb-opt" data-q="reaction" data-v="pas-interesse">👎 Pas intéressé(e) même gratuit</button>
          </div>
        </div>

        <div class="fb-question">
          <label class="fb-label">Une question ou un commentaire ?</label>
          <textarea id="fb-comment" class="mock-input fb-textarea" placeholder="Ex : je préférerais payer une fois sans abonnement / je veux essayer avant de payer / …"></textarea>
        </div>

        <div class="fb-actions">
          <button class="btn btn-y fb-submit" onclick="window.fbSubmitSurvey('${featureKey}', '${escapeJs(priceProposed)}')">💌 ENVOYER</button>
        </div>

        <p class="fb-foot">Tes réponses sont anonymes. Aide-nous à coder ce qui te sert vraiment.</p>
      </div>
    `;
    modal.addEventListener("click", (e) => { if (e.target === modal) closeSurvey(); });
    document.body.appendChild(modal);

    // Wire les boutons d'option (toggle "on")
    modal.querySelectorAll(".fb-opt").forEach((b) => {
      b.addEventListener("click", () => {
        const q = b.dataset.q;
        modal.querySelectorAll(`.fb-opt[data-q="${q}"]`).forEach((o) => o.classList.remove("on"));
        b.classList.add("on");
      });
    });
  }

  function closeSurvey() {
    const m = document.getElementById("fb-survey-modal");
    if (m) m.remove();
  }

  async function submitSurvey(featureKey, priceTested) {
    const modal = document.getElementById("fb-survey-modal");
    if (!modal) return;
    const reaction = modal.querySelector('.fb-opt[data-q="reaction"].on');
    const comment = (modal.querySelector("#fb-comment") || {}).value || "";

    if (!reaction) {
      toast("Choisis une réponse pour valider.");
      return;
    }

    const vote = {
      feature: featureKey,
      price_tested: priceTested,
      reaction: reaction.dataset.v,
      comment: comment.trim(),
      timestamp: new Date().toISOString(),
      ua: navigator.userAgent
    };

    // Sauvegarde locale (pour que l'user revoit ses votes)
    saveVote(vote);

    // POST vers Formspree (si configuré)
    if (FORMSPREE_ENDPOINT) {
      try {
        await fetch(FORMSPREE_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(vote)
        });
      } catch (e) {
        console.warn("Formspree POST failed:", e);
        // On garde quand même le vote local
      }
    }

    closeSurvey();
    toast("Merci ! Ton avis est précieux 🦆");
  }

  // ─── Admin : visualiser tous les votes locaux ───
  function showAdminVotes() {
    const all = loadVotes();
    if (!all.length) {
      alert("Aucun vote local pour l'instant.");
      return;
    }
    const txt = "VOTES LOCAUX (" + all.length + ") :\n\n" + all.map((v, i) =>
      `[${i+1}] ${v.feature}\n  Prix testé: ${v.price_tested || "n/a"} → ${v.reaction || v.usage || "?"}\n  ` + (v.comment ? `Commentaire: ${v.comment}\n  ` : "") + `Date: ${v.timestamp}`
    ).join("\n\n");
    alert(txt);
  }

  function escapeJs(s) {
    return String(s || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }

  function toast(msg) {
    const existing = document.querySelector(".mock-toast");
    if (existing) existing.remove();
    const el = document.createElement("div");
    el.className = "mock-toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // Exports globaux
  window.openFeatureSurvey = openSurvey;
  window.fbCloseSurvey = closeSurvey;
  window.fbSubmitSurvey = submitSurvey;
  window.fbShowAdminVotes = showAdminVotes;
})();
