// feedback-survey.js
// Sondage "I would pay for X" — fake door test pour valider la demande
// avant de coder les vraies features payantes.
//
// Comportement :
//   - Affiche un modal au clic sur une feature "coming soon"
//   - question d'intérêt + commentaire
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
          <strong>Ça t'intéresse ?</strong>
        </p>

        <div class="fb-question">
          <div class="fb-options fb-options-vert">
            <button type="button" class="fb-opt" data-q="reaction" data-v="oui">👍 Oui, je veux tester</button>
            <button type="button" class="fb-opt" data-q="reaction" data-v="peut-etre">🤔 Peut-être</button>
            <button type="button" class="fb-opt" data-q="reaction" data-v="priorite-basse">🕒 Intéressant, mais pas prioritaire</button>
            <button type="button" class="fb-opt" data-q="reaction" data-v="pas-interesse">👎 Pas intéressé(e)</button>
          </div>
        </div>

        <div class="fb-question">
          <label class="fb-label">Une question ou un commentaire ?</label>
          <textarea id="fb-comment" class="mock-input fb-textarea" placeholder="Ex : je veux tester avec mes cours / je veux plutôt une app mobile / cette idée ne me sert pas..."></textarea>
        </div>

        <div class="fb-actions">
          <button class="btn btn-y fb-submit" onclick="window.fbSubmitSurvey('${escapeJs(featureKey)}')">💌 ENVOYER</button>
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

  async function submitSurvey(featureKey) {
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

  function getPremiumFeedbackFields() {
    const selected = document.querySelector(".premium-choice.on");
    return {
      interest: selected ? selected.dataset.interest : "",
      email: (document.getElementById("premium-feedback-email")?.value || "").trim(),
      message: (document.getElementById("premium-feedback-message")?.value || "").trim(),
    };
  }

  function setPremiumFeedbackStatus(message, isError) {
    const el = document.getElementById("premium-feedback-status");
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("is-error", !!isError);
  }

  function premiumSelectInterest(button) {
    document.querySelectorAll(".premium-choice").forEach((b) => b.classList.remove("on"));
    if (button) button.classList.add("on");
    setPremiumFeedbackStatus("");
  }

  async function submitPremiumFeedback(event) {
    if (event && event.preventDefault) event.preventDefault();
    const fields = getPremiumFeedbackFields();
    if (!fields.interest) {
      setPremiumFeedbackStatus("Choisis d'abord ton niveau d'intérêt.", true);
      return;
    }
    if (!fields.message) {
      setPremiumFeedbackStatus("Écris au moins une phrase de feedback.", true);
      return;
    }

    const vote = {
      feature: "premium-general-feedback",
      reaction: fields.interest,
      email: fields.email,
      comment: fields.message,
      timestamp: new Date().toISOString(),
      page: location.href,
      ua: navigator.userAgent,
    };
    saveVote(vote);
    setPremiumFeedbackStatus("Envoi en cours...");

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(vote),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      setPremiumFeedbackStatus("Merci, c'est envoyé.");
      const form = document.getElementById("premium-feedback-form");
      if (form) form.reset();
      document.querySelectorAll(".premium-choice").forEach((b) => b.classList.remove("on"));
      toast("Feedback envoyé. Merci !");
    } catch (e) {
      const subject = encodeURIComponent("Feedback Premium CULTURE!!!");
      const body = encodeURIComponent(
        "Intérêt : " + fields.interest + "\n" +
        "Email : " + (fields.email || "-") + "\n\n" +
        fields.message
      );
      const mailto = "mailto:alicebrun2106@gmail.com?subject=" + subject + "&body=" + body;
      const el = document.getElementById("premium-feedback-status");
      if (el) {
        el.textContent = "Envoi auto bloqué. ";
        el.classList.add("is-error");
        const link = document.createElement("a");
        link.href = mailto;
        link.textContent = "Envoyer par email";
        el.appendChild(link);
      }
    }
  }

  // ─── Admin : visualiser tous les votes locaux ───
  function showAdminVotes() {
    const all = loadVotes();
    if (!all.length) {
      alert("Aucun vote local pour l'instant.");
      return;
    }
    const txt = "VOTES LOCAUX (" + all.length + ") :\n\n" + all.map((v, i) =>
      `[${i+1}] ${v.feature}\n  Réaction: ${v.reaction || v.usage || "?"}\n  ` + (v.comment ? `Commentaire: ${v.comment}\n  ` : "") + `Date: ${v.timestamp}`
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
  window.premiumSelectInterest = premiumSelectInterest;
  window.submitPremiumFeedback = submitPremiumFeedback;
})();
