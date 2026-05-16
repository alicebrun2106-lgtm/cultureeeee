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
  // 🔑 ENDPOINT FORMSPREE — à remplacer par l'URL de ton form
  // Tant que c'est vide, on saute le POST et on stocke seulement en localStorage.
  const FORMSPREE_ENDPOINT = ""; // ← coller ici l'URL "https://formspree.io/f/xxxx"

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
  // featureKey : id unique (ex: "livre-ia")
  // featureName : titre lisible (ex: "📚 Livre → cartes IA")
  // featureDesc : description courte de ce que ça fera
  function openSurvey(featureKey, featureName, featureDesc) {
    closeSurvey();

    const modal = document.createElement("div");
    modal.id = "fb-survey-modal";
    modal.className = "mock-modal-backdrop fb-modal";
    modal.innerHTML = `
      <div class="mock-modal frame fb-modal-inner">
        <button class="mock-close" onclick="window.fbCloseSurvey()">×</button>

        <div class="fb-coming-tag">🔜 BIENTÔT</div>
        <h2 class="mock-title">${escapeHtml(featureName)}</h2>
        <p class="mock-sub">${escapeHtml(featureDesc)}</p>

        <div class="fb-divider"></div>

        <p class="fb-intro">
          On veut savoir si on doit vraiment la coder. <strong>Dis-nous</strong> :
        </p>

        <div class="fb-question">
          <label class="fb-label">1. Tu utiliserais ça ?</label>
          <div class="fb-options fb-options-3">
            <button type="button" class="fb-opt" data-q="usage" data-v="oui">👍 Oui carrément</button>
            <button type="button" class="fb-opt" data-q="usage" data-v="peut-etre">🤔 Peut-être</button>
            <button type="button" class="fb-opt" data-q="usage" data-v="non">👎 Non</button>
          </div>
        </div>

        <div class="fb-question">
          <label class="fb-label">2. Combien tu paierais pour un accès illimité ?</label>
          <div class="fb-options">
            <button type="button" class="fb-opt" data-q="prix" data-v="0">0€ — gratuit seulement</button>
            <button type="button" class="fb-opt" data-q="prix" data-v="1-3-mois">1-3€ / mois</button>
            <button type="button" class="fb-opt" data-q="prix" data-v="4-7-mois">4-7€ / mois</button>
            <button type="button" class="fb-opt" data-q="prix" data-v="8plus-mois">8€+ / mois</button>
            <button type="button" class="fb-opt" data-q="prix" data-v="5-oneshot">Une fois 5€</button>
            <button type="button" class="fb-opt" data-q="prix" data-v="10plus-oneshot">Une fois 10-20€</button>
          </div>
        </div>

        <div class="fb-question">
          <label class="fb-label">3. Commentaire (optionnel)</label>
          <textarea id="fb-comment" class="mock-input fb-textarea" placeholder="Ex : je veux vraiment ce truc parce que…"></textarea>
        </div>

        <div class="fb-actions">
          <button class="btn btn-y fb-submit" onclick="window.fbSubmitSurvey('${featureKey}')">💌 ENVOYER MON AVIS</button>
        </div>

        <p class="fb-foot">Tes réponses sont anonymes. Aide-nous à coder les bons trucs.</p>
      </div>
    `;
    modal.addEventListener("click", (e) => { if (e.target === modal) closeSurvey(); });
    document.body.appendChild(modal);

    // Wire les boutons d'option (toggle "on")
    modal.querySelectorAll(".fb-opt").forEach((b) => {
      b.addEventListener("click", () => {
        // Désactive les autres de la même question
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

  async function submitSurvey(featureKey) {
    const modal = document.getElementById("fb-survey-modal");
    if (!modal) return;
    const usage = modal.querySelector('.fb-opt[data-q="usage"].on');
    const prix  = modal.querySelector('.fb-opt[data-q="prix"].on');
    const comment = (modal.querySelector("#fb-comment") || {}).value || "";

    if (!usage || !prix) {
      toast("Réponds aux 2 premières questions pour valider.");
      return;
    }

    const vote = {
      feature: featureKey,
      usage: usage.dataset.v,
      prix: prix.dataset.v,
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
      `[${i+1}] ${v.feature}\n  Usage: ${v.usage} · Prix: ${v.prix}\n  ` + (v.comment ? `Commentaire: ${v.comment}\n  ` : "") + `Date: ${v.timestamp}`
    ).join("\n\n");
    alert(txt);
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
