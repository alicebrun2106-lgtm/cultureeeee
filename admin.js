// admin.js — private owner dashboard backed by protected Supabase RPCs.
(function () {
  let allowed = false;
  let checking = false;
  let dashboard = null;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function number(value) {
    return new Intl.NumberFormat("fr-FR").format(Number(value) || 0);
  }

  function shortDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
    }).format(date);
  }

  function dayLabel(value) {
    const date = new Date(value + "T12:00:00");
    return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(date);
  }

  function showLinks(show) {
    document.querySelectorAll("[data-admin-link]").forEach((link) => {
      link.hidden = !show;
      link.style.display = show ? "" : "none";
    });
  }

  function metric(label, value, note) {
    return `
      <div class="admin-metric">
        <strong>${number(value)}</strong>
        <span>${escapeHtml(label)}</span>
        ${note ? `<small>${escapeHtml(note)}</small>` : ""}
      </div>`;
  }

  function renderChart(points) {
    const values = (Array.isArray(points) ? points : []).map((point) => Number(point.count) || 0);
    const max = Math.max(1, ...values);
    return `
      <div class="admin-chart" role="img" aria-label="Nouveaux comptes sur les 14 derniers jours">
        ${(Array.isArray(points) ? points : []).map((point) => {
          const count = Number(point.count) || 0;
          const height = count ? Math.max(12, Math.round((count / max) * 100)) : 3;
          return `<div class="admin-bar-col" title="${escapeHtml(dayLabel(point.day))} : ${count}">
            <span class="admin-bar-count">${count || ""}</span>
            <span class="admin-bar" style="height:${height}%"></span>
            <small>${escapeHtml(dayLabel(point.day))}</small>
          </div>`;
        }).join("")}
      </div>`;
  }

  function renderAccounts(accounts) {
    if (!Array.isArray(accounts) || !accounts.length) {
      return `<p class="admin-empty">Aucun compte créé pour le moment.</p>`;
    }
    return `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Compte</th><th>Connexion</th><th>Créé</th><th>Dernière activité</th><th>État</th></tr></thead>
          <tbody>
            ${accounts.map((account) => {
              const name = account.display_name || account.handle || "Sans pseudo";
              const activity = account.last_seen_at || account.last_sign_in_at;
              return `<tr>
                <td><strong>${escapeHtml(name)}</strong><small>${escapeHtml(account.email || "—")}</small></td>
                <td>${escapeHtml(account.provider === "google" ? "Google" : "Email")}</td>
                <td>${escapeHtml(shortDate(account.created_at))}</td>
                <td>${escapeHtml(shortDate(activity))}</td>
                <td><span class="admin-status ${account.confirmed ? "ok" : "wait"}">${account.confirmed ? "CONFIRMÉ" : "À CONFIRMER"}</span></td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>`;
  }

  async function checkAccess() {
    if (checking) return allowed;
    if (!window.CultureAuth || !window.CultureAuth.isSignedIn()) {
      allowed = false;
      showLinks(false);
      return false;
    }
    checking = true;
    try {
      const result = await window.CultureAuth.rpc("is_admin");
      allowed = !result.error && result.data === true;
    } catch {
      allowed = false;
    } finally {
      checking = false;
      showLinks(allowed);
    }
    return allowed;
  }

  async function loadDashboard(force) {
    if (!force && dashboard) return dashboard;
    const result = await window.CultureAuth.rpc("get_admin_dashboard");
    if (result.error) throw result.error;
    dashboard = result.data;
    return dashboard;
  }

  async function render(force) {
    const root = document.getElementById("admin-content");
    if (!root) return;
    root.innerHTML = `<div class="admin-loading frame">CHARGEMENT DES STATISTIQUES...</div>`;

    if (!await checkAccess()) {
      root.innerHTML = `<div class="admin-denied frame"><strong>ACCÈS PRIVÉ</strong><p>Cette page est réservée au compte administrateur.</p></div>`;
      return;
    }

    try {
      const data = await loadDashboard(force);
      const m = data && data.metrics ? data.metrics : {};
      const catalogCount = Array.isArray(window.FLASHCARD_PACKS) ? window.FLASHCARD_PACKS.length : 0;
      root.innerHTML = `
        <div class="admin-toolbar">
          <div><strong>VUE D'ENSEMBLE</strong><span>Mis à jour ${escapeHtml(shortDate(data.generated_at))}</span></div>
          <button class="btn btn-y" type="button" id="admin-refresh">ACTUALISER</button>
        </div>

        <section class="admin-block">
          <h3>COMPTES & ACTIVITÉ</h3>
          <div class="admin-metrics">
            ${metric("Comptes créés", m.total_accounts)}
            ${metric("Créés aujourd'hui", m.new_today)}
            ${metric("Nouveaux sur 7 jours", m.new_7d)}
            ${metric("Actifs sur 24 h", m.active_24h, "comptes connectés")}
            ${metric("Actifs sur 7 jours", m.active_7d, "comptes connectés")}
            ${metric("Actifs sur 30 jours", m.active_30d, "comptes connectés")}
            ${metric("Comptes confirmés", m.confirmed_accounts)}
            ${metric("Connexions Google", m.google_accounts)}
            ${metric("Connexions email", m.email_accounts)}
            ${metric("Visites suivies", m.tracked_visits, "sessions de 30 min")}
          </div>
        </section>

        <section class="admin-block">
          <h3>NOUVEAUX COMPTES · 14 JOURS</h3>
          ${renderChart(data.signups)}
        </section>

        <section class="admin-block">
          <h3>UTILISATION DES FLASHCARDS</h3>
          <div class="admin-metrics">
            ${metric("Paquets du catalogue", catalogCount)}
            ${metric("Paquets ajoutés", m.added_packs)}
            ${metric("Paquets créés", m.personal_packs)}
            ${metric("Cartes travaillées", m.reviewed_cards)}
            ${metric("XP cumulés", m.total_xp)}
            ${metric("Profils enregistrés", m.profiles)}
            ${metric("Sauvegardes cloud", m.cloud_backups)}
          </div>
        </section>

        <section class="admin-block">
          <h3>COMPTES RÉCENTS</h3>
          ${renderAccounts(data.recent_accounts)}
        </section>`;

      document.getElementById("admin-refresh")?.addEventListener("click", () => render(true));
    } catch (error) {
      root.innerHTML = `<div class="admin-denied frame"><strong>STATISTIQUES INDISPONIBLES</strong><p>${escapeHtml(error && error.message ? error.message : "Réessaie dans un instant.")}</p></div>`;
    }
  }

  window.CultureAdmin = { render, checkAccess };
  window.addEventListener("culture:auth-changed", () => {
    dashboard = null;
    checkAccess();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(checkAccess, 300));
  } else {
    setTimeout(checkAccess, 300);
  }
})();
