// auth.js — compte utilisateur + sauvegarde cloud Supabase
(function () {
  const SNAPSHOT_KEYS = [
    "qpuc-added-packs",
    "qpuc-user-packs",
    "qpuc-pack-extras",
    "qpuc-deleted-cards",
    "qpuc-srs-v2",
    "qpuc-srs",
    "qpuc-revisions",
    "qpuc-tracking",
    "qpuc-stats",
    "qpuc-streak",
    "qpuc-xp",
    "qpuc-mastery-history",
    "qpuc-social-my-name",
    "qpuc-prog",
    "qpuc-prog-srs",
  ];
  const RAW_STRING_KEYS = new Set(["qpuc-social-my-name"]);
  const SYNC_TABLE = "user_state";
  const PRODUCTION_ORIGIN = "https://canardculture.com";
  const MAX_BACKUP_BYTES = 1024 * 1024;
  const MAX_PACKS = 500;
  const MAX_CARDS_PER_PACK = 1000;
  const MAX_TEXT_LENGTH = 6000;
  const LOCAL_OWNER_KEY = "qpuc-local-owner";
  const ACCOUNT_CACHE_PREFIX = "qpuc-account-cache:";

  let clientPromise = null;
  let session = null;
  let profile = null;
  let statusMessage = "";
  let isBusy = false;
  let authMode = "signup";
  let autoSyncedSessionId = "";

  function getConfig() {
    const cfg = window.CULTURE_SUPABASE || {};
    const url = String(cfg.url || "").trim();
    const anonKey = String(cfg.anonKey || "").trim();
    return { url, anonKey, ready: !!url && !!anonKey };
  }

  async function getClient() {
    const cfg = getConfig();
    if (!cfg.ready) throw new Error("Supabase n'est pas encore configuré.");
    if (!clientPromise) {
      clientPromise = Promise.resolve().then(() => {
        if (!window.supabase || typeof window.supabase.createClient !== "function") {
          throw new Error("La bibliothèque de connexion locale n'a pas chargé.");
        }
        return window.supabase.createClient(cfg.url, cfg.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: "pkce",
          },
        });
      });
    }
    return clientPromise;
  }

  function readStoredValue(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      if (RAW_STRING_KEYS.has(key)) return raw;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeStoredValue(key, value) {
    if (value === undefined || value === null) localStorage.removeItem(key);
    else if (RAW_STRING_KEYS.has(key)) localStorage.setItem(key, String(value));
    else localStorage.setItem(key, JSON.stringify(value));
  }

  function buildLocalSnapshot() {
    const state = {};
    SNAPSHOT_KEYS.forEach((key) => { state[key] = readStoredValue(key, null); });
    return sanitizeSnapshot({
      version: 1,
      savedAt: new Date().toISOString(),
      state,
    });
  }

  function sanitizeText(value, maxLength = MAX_TEXT_LENGTH) {
    return String(value == null ? "" : value)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .slice(0, maxLength);
  }

  function sanitizeCard(card) {
    if (!card || typeof card !== "object") return null;
    const front = sanitizeText(card.front, 1000).trim();
    const back = sanitizeText(card.back, 2000).trim();
    if (!front || !back) return null;
    return {
      front,
      back,
      memo: sanitizeText(card.memo, 2000).trim(),
      _extra: card._extra === true,
    };
  }

  function sanitizePack(pack) {
    if (!pack || typeof pack !== "object") return null;
    const cards = (Array.isArray(pack.cards) ? pack.cards : [])
      .slice(0, MAX_CARDS_PER_PACK)
      .map(sanitizeCard)
      .filter(Boolean);
    if (!cards.length) return null;
    const wantsPublic = pack.visibility === "public" || pack.isPublic === true;
    const safety = window.CultureContentSafety;
    const publicationAllowed = wantsPublic && safety && typeof safety.checkPack === "function" && safety.checkPack({
      name: sanitizeText(pack.name, 60).trim(),
      description: sanitizeText(pack.description, 500).trim(),
      cards,
    }).ok;
    // Un fichier local ne constitue jamais une validation serveur.
    const visibility = "private";
    return {
      id: sanitizeText(pack.id, 120).replace(/[^a-zA-Z0-9_-]/g, "-") || ("user-" + Date.now()),
      name: sanitizeText(pack.name, 60).trim() || "Paquet sans nom",
      icon: sanitizeText(pack.icon, 8).trim() || "📦",
      description: sanitizeText(pack.description, 500).trim(),
      difficulty: "perso",
      reversible: pack.reversible !== false,
      isUserPack: true,
      visibility,
      requestedVisibility: publicationAllowed ? "public" : "private",
      publicationStatus: publicationAllowed ? "pending" : "private",
      isPublic: false,
      cards,
    };
  }

  function sanitizeSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object" || !snapshot.state || typeof snapshot.state !== "object") {
      throw new Error("Sauvegarde cloud invalide.");
    }
    const clean = { version: 1, savedAt: new Date().toISOString(), state: {} };
    SNAPSHOT_KEYS.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(snapshot.state, key)) return;
      const value = snapshot.state[key];
      if (key === "qpuc-user-packs") {
        clean.state[key] = (Array.isArray(value) ? value : [])
          .slice(0, MAX_PACKS)
          .map(sanitizePack)
          .filter(Boolean);
      } else if (key === "qpuc-pack-extras") {
        const extras = {};
        if (value && typeof value === "object" && !Array.isArray(value)) {
          Object.entries(value).slice(0, MAX_PACKS).forEach(([packId, cards]) => {
            const safeId = sanitizeText(packId, 120).replace(/[^a-zA-Z0-9_-]/g, "-");
            if (!safeId) return;
            extras[safeId] = (Array.isArray(cards) ? cards : [])
              .slice(0, MAX_CARDS_PER_PACK)
              .map(sanitizeCard)
              .filter(Boolean);
          });
        }
        clean.state[key] = extras;
      } else if (key === "qpuc-social-my-name") {
        clean.state[key] = sanitizeText(value, 32).trim();
      } else {
        clean.state[key] = sanitizeJsonValue(value);
      }
    });
    const encoded = new TextEncoder().encode(JSON.stringify(clean));
    if (encoded.byteLength > MAX_BACKUP_BYTES) {
      throw new Error("Sauvegarde refusée : elle dépasse la limite sécurisée de 1 Mo.");
    }
    return clean;
  }

  function sanitizeJsonValue(value, depth = 0) {
    if (depth > 8) return null;
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") return sanitizeText(value, MAX_TEXT_LENGTH);
    if (Array.isArray(value)) {
      return value.slice(0, 5000).map((item) => sanitizeJsonValue(item, depth + 1));
    }
    if (!value || typeof value !== "object") return null;
    const clean = Object.create(null);
    Object.entries(value).slice(0, 5000).forEach(([key, item]) => {
      if (["__proto__", "prototype", "constructor"].includes(key)) return;
      const safeKey = sanitizeText(key, 160);
      if (safeKey) clean[safeKey] = sanitizeJsonValue(item, depth + 1);
    });
    return clean;
  }

  function restoreSnapshot(snapshot) {
    const cleanSnapshot = sanitizeSnapshot(snapshot);
    SNAPSHOT_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(cleanSnapshot.state, key)) {
        writeStoredValue(key, cleanSnapshot.state[key]);
      }
    });
  }

  function clearSnapshotStorage() {
    SNAPSHOT_KEYS.forEach((key) => localStorage.removeItem(key));
  }

  function accountCacheKey(userId) {
    return ACCOUNT_CACHE_PREFIX + sanitizeText(userId, 80).replace(/[^a-zA-Z0-9-]/g, "");
  }

  function cacheSnapshotForUser(userId, snapshot) {
    if (!userId) return false;
    try {
      const clean = sanitizeSnapshot(snapshot || buildLocalSnapshot());
      localStorage.setItem(accountCacheKey(userId), JSON.stringify(clean));
      return true;
    } catch {
      return false;
    }
  }

  function readAccountCache(userId) {
    if (!userId) return null;
    try {
      const raw = localStorage.getItem(accountCacheKey(userId));
      return raw ? sanitizeSnapshot(JSON.parse(raw)) : null;
    } catch {
      localStorage.removeItem(accountCacheKey(userId));
      return null;
    }
  }

  function activateUserLocalContext(userId) {
    if (!userId) return false;
    const ownerId = localStorage.getItem(LOCAL_OWNER_KEY) || "";
    if (ownerId === userId) return false;

    let currentSnapshot = null;
    let currentHasData = false;
    try {
      currentSnapshot = buildLocalSnapshot();
      currentHasData = hasMeaningfulSnapshot(currentSnapshot);
    } catch {
      currentHasData = true;
    }
    if (ownerId && ownerId !== userId) {
      if (currentHasData) cacheSnapshotForUser(ownerId, currentSnapshot);
      clearSnapshotStorage();
    }

    let restored = false;
    if (ownerId || !currentHasData) {
      const cached = readAccountCache(userId);
      if (cached && hasMeaningfulSnapshot(cached)) {
        restoreSnapshot(cached);
        restored = true;
      }
    }
    localStorage.setItem(LOCAL_OWNER_KEY, userId);
    return restored || (!!ownerId && ownerId !== userId);
  }

  function removeAllAccountCaches() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(ACCOUNT_CACHE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  }

  function setStatus(message) {
    statusMessage = message || "";
    const status = document.querySelector("#account-content .account-status");
    if (status) status.textContent = statusMessage;
    else renderAccount();
  }

  function setBusy(value) {
    isBusy = !!value;
    const panel = document.querySelector("#account-content .account-panel");
    if (panel) {
      panel.setAttribute("aria-busy", isBusy ? "true" : "false");
      panel.querySelectorAll("button, input").forEach((control) => {
        control.disabled = isBusy;
      });
    } else {
      renderAccount();
    }
  }

  function configuredNotice() {
    return `
      <div class="account-panel frame">
        <div class="account-kicker">CONFIGURATION</div>
        <h3 class="account-title">Connexion pas encore branchée</h3>
        <p class="account-text">Crée un projet Supabase, puis remplis <strong>supabase-config.js</strong> avec l'URL du projet et l'anon key publique.</p>
        <p class="account-text">Le site continue de marcher localement en attendant : paquets, progression et révisions restent stockés sur cet appareil.</p>
      </div>
    `;
  }

  function accountSummaryHtml() {
    const added = readStoredValue("qpuc-added-packs", []);
    const userPacks = readStoredValue("qpuc-user-packs", []);
    const srs = readStoredValue("qpuc-srs-v2", {});
    const xp = readStoredValue("qpuc-xp", { total: 0 });
    return `
      <div class="account-stats">
        <div><strong>${Array.isArray(added) ? added.length : 0}</strong><span>paquets ajoutés</span></div>
        <div><strong>${Array.isArray(userPacks) ? userPacks.length : 0}</strong><span>paquets perso</span></div>
        <div><strong>${srs && typeof srs === "object" ? Object.keys(srs).length : 0}</strong><span>cartes suivies</span></div>
        <div><strong>${xp && xp.total ? xp.total : 0}</strong><span>XP</span></div>
      </div>
    `;
  }

  function renderAccount() {
    const root = document.getElementById("account-content");
    if (!root) return;
    refreshLandingNudge();
    const cfg = getConfig();
    const email = session && session.user ? session.user.email : "";
    const provider = getProviderLabel();
    const disabled = isBusy ? "disabled" : "";

    if (!cfg.ready) {
      root.innerHTML = configuredNotice() + accountSummaryHtml();
      return;
    }

    if (!session) {
      const isSignup = authMode === "signup";
      root.innerHTML = `
        <div class="account-panel frame">
          <div class="account-kicker">COMPTE</div>
          <div class="account-tabs" role="tablist" aria-label="Compte">
            <button type="button" class="account-tab ${isSignup ? "on" : ""}" onclick="window.CultureAuth.setMode('signup')" ${disabled}>CRÉER MON COMPTE</button>
            <button type="button" class="account-tab ${!isSignup ? "on" : ""}" onclick="window.CultureAuth.setMode('login')" ${disabled}>J'AI DÉJÀ UN COMPTE</button>
          </div>
          <h3 class="account-title">${isSignup ? "Crée ton compte" : "Bon retour !"}</h3>
          <p class="account-text">${isSignup
            ? "Choisis comment créer ton compte. Il gardera tes paquets et ta progression sur tous tes appareils."
            : "Utilise la même méthode que lors de la création de ton compte."}</p>
          ${isSignup ? `
            <label class="account-create-confirm">
              <input type="checkbox" id="account-create-confirm">
              <span>Je confirme vouloir créer un compte Canard Culture.</span>
            </label>
          ` : `
            <label class="account-create-confirm account-google-confirm">
              <input type="checkbox" id="account-google-confirm">
              <span>Je comprends que Google créera mon compte si cette adresse n'existe pas encore.</span>
            </label>
          `}
          <button type="button" class="btn account-google-btn" onclick="window.CultureAuth.signInWithGoogle()" ${disabled}>
            ${isSignup ? "CRÉER AVEC GOOGLE" : "SE CONNECTER AVEC GOOGLE"}
          </button>
          <p class="account-method-note">${isSignup
            ? "Avec Google, le compte est créé automatiquement après ton autorisation. Tu n'as pas de mot de passe supplémentaire à choisir."
            : "Pour un compte créé avec Google."}</p>
          <div class="account-divider"><span>${isSignup ? "OU CRÉER AVEC TON EMAIL" : "OU AVEC TON EMAIL"}</span></div>
          <form class="account-form account-form-stack" id="account-password-form">
            ${isSignup ? `
              <label class="account-field-label" for="account-handle">IDENTIFIANT PUBLIC</label>
              <input type="text" id="account-handle" class="account-input" placeholder="ex : alice" autocomplete="username" maxlength="24" required>
            ` : ""}
            <label class="account-field-label" for="account-email">EMAIL</label>
            <input type="email" id="account-email" class="account-input" placeholder="ton@email.com" autocomplete="email" required>
            <label class="account-field-label" for="account-password">MOT DE PASSE</label>
            <input type="password" id="account-password" class="account-input" placeholder="${isSignup ? "10 caractères, majuscule, minuscule et chiffre" : "ton mot de passe"}" autocomplete="${isSignup ? "new-password" : "current-password"}" ${isSignup ? 'minlength="10"' : ""} required>
            ${isSignup ? `
              <label class="account-field-label" for="account-password-confirm">CONFIRMER LE MOT DE PASSE</label>
              <input type="password" id="account-password-confirm" class="account-input" placeholder="retape ton mot de passe" autocomplete="new-password" minlength="10" required>
            ` : ""}
            <button class="btn btn-y account-submit-btn" type="submit" ${disabled}>${isSignup ? "CRÉER AVEC EMAIL + MOT DE PASSE" : "SE CONNECTER"}</button>
          </form>
          <div class="account-secondary-actions">
            ${!isSignup ? `<button type="button" class="account-link-btn" onclick="window.CultureAuth.resetPassword()" ${disabled}>MOT DE PASSE OUBLIÉ</button>` : ""}
            <button type="button" class="account-link-btn" onclick="window.CultureAuth.sendMagicLink()" ${disabled}>${isSignup ? "CRÉER AVEC UN LIEN EMAIL" : "ME CONNECTER AVEC UN LIEN EMAIL"}</button>
          </div>
          <p class="account-method-note">Le lien email permet d'utiliser le compte sans mot de passe.</p>
          <details class="account-details account-backup-login">
            <summary>Sauvegarde locale</summary>
            <p class="account-text account-details-text">À utiliser seulement si tu veux déplacer une sauvegarde à la main.</p>
            <div class="account-local-tools">
              <button type="button" class="btn" onclick="window.CultureAuth.exportLocalBackup()" ${disabled}>EXPORT LOCAL</button>
              <button type="button" class="btn" onclick="document.getElementById('account-import-backup').click()" ${disabled}>IMPORT</button>
              <button type="button" class="btn" onclick="window.CultureAuth.clearDeviceData()" ${disabled}>EFFACER CET APPAREIL</button>
              <input id="account-import-backup" type="file" accept="application/json,.json" hidden>
            </div>
          </details>
          <div class="account-status">${escapeHtml(statusMessage)}</div>
        </div>
        ${accountSummaryHtml()}
      `;
      const form = document.getElementById("account-password-form");
      if (form) form.onsubmit = handlePasswordAuth;
      const importInput = document.getElementById("account-import-backup");
      if (importInput) importInput.onchange = importLocalBackup;
      return;
    }

    root.innerHTML = `
      <div class="account-panel frame">
        <div class="account-kicker">CONNECTÉ</div>
        <h3 class="account-title">Ton compte est prêt</h3>
        <div class="account-profile-card">
          <div><span>Email</span><strong>${escapeHtml(email)}</strong></div>
          <div><span>Identifiant public</span><strong>${escapeHtml(profile && profile.handle ? "@" + profile.handle : "à choisir")}</strong></div>
          <div><span>Méthode de connexion</span><strong>${escapeHtml(provider)}</strong></div>
        </div>
        <p class="account-text">Le compte sert juste à garder tes paquets et ta progression entre tes appareils.</p>
        <p class="account-method-note">À la déconnexion, les données de ce compte sont retirées de l'écran sur cet appareil.</p>
        <div class="account-actions account-main-actions">
          <button class="btn btn-y" onclick="window.CultureAuth.syncNow()" ${disabled}>SAUVEGARDER MA PROGRESSION</button>
          <button class="btn" onclick="window.CultureAuth.restoreFromCloud()" ${disabled}>RÉCUPÉRER LE CLOUD</button>
        </div>
        <div class="account-status">${escapeHtml(statusMessage)}</div>
        <details class="account-details">
          <summary>Profil public</summary>
          <form class="account-form account-form-stack account-profile-form" id="account-profile-form">
            <input type="text" id="account-profile-name" class="account-input" value="${escapeAttr(profile && profile.display_name ? profile.display_name : localStorage.getItem("qpuc-social-my-name") || "")}" placeholder="nom affiché" autocomplete="nickname" maxlength="32">
            <input type="text" id="account-profile-handle" class="account-input" value="${escapeAttr(profile && profile.handle ? profile.handle : "")}" placeholder="identifiant public, ex : alice" autocomplete="username" maxlength="24">
            <button class="btn" type="submit" ${disabled}>ENREGISTRER LE PROFIL</button>
          </form>
        </details>
        <details class="account-details">
          <summary>Sauvegarde locale</summary>
          <p class="account-text account-details-text">À utiliser seulement en secours pour déplacer les données à la main.</p>
          <div class="account-local-tools">
            <button class="btn" onclick="window.CultureAuth.exportLocalBackup()" ${disabled}>EXPORT LOCAL</button>
            <button class="btn" onclick="document.getElementById('account-import-backup').click()" ${disabled}>IMPORT</button>
            <button class="btn" onclick="window.CultureAuth.clearDeviceData()" ${disabled}>EFFACER CET APPAREIL</button>
          </div>
        </details>
        <details class="account-details">
          <summary>Connexion</summary>
          <div class="account-local-tools">
            <button class="btn" onclick="window.CultureAuth.signOut()" ${disabled}>DÉCONNEXION</button>
            <button class="btn" onclick="window.CultureAuth.signOutEverywhere()" ${disabled}>DÉCONNECTER TOUS MES APPAREILS</button>
          </div>
          <form class="account-form account-form-stack account-password-update" id="account-change-password-form">
            <input type="password" id="account-new-password" class="account-input" placeholder="10 caractères, majuscule, minuscule et chiffre" autocomplete="new-password" minlength="10">
            <button class="btn" type="submit" ${disabled}>CHANGER LE MOT DE PASSE</button>
          </form>
        </details>
        <input id="account-import-backup" type="file" accept="application/json,.json" hidden>
      </div>
      ${accountSummaryHtml()}
    `;
    const profileForm = document.getElementById("account-profile-form");
    if (profileForm) profileForm.onsubmit = updateProfile;
    const importInput = document.getElementById("account-import-backup");
    if (importInput) importInput.onchange = importLocalBackup;
    const passwordForm = document.getElementById("account-change-password-form");
    if (passwordForm) passwordForm.onsubmit = updatePassword;
  }

  function setMode(mode) {
    authMode = mode === "signup" ? "signup" : "login";
    statusMessage = "";
    renderAccount();
  }

  function refreshLandingNudge() {
    if (typeof window.refreshLandingAuthNudge === "function") {
      setTimeout(window.refreshLandingAuthNudge, 0);
    }
  }

  function getAuthFields() {
    return {
      email: (document.getElementById("account-email")?.value || "").trim(),
      password: document.getElementById("account-password")?.value || "",
      passwordConfirm: document.getElementById("account-password-confirm")?.value || "",
      handle: normalizeHandle(document.getElementById("account-handle")?.value || ""),
    };
  }

  function creationConfirmed() {
    return !!document.getElementById("account-create-confirm")?.checked;
  }

  function requireCreationConfirmation() {
    if (authMode !== "signup" || creationConfirmed()) return true;
    setStatus("Confirme d'abord que tu veux créer un compte Canard Culture.");
    return false;
  }

  function requireGoogleConfirmation() {
    if (authMode === "signup") return requireCreationConfirmation();
    if (document.getElementById("account-google-confirm")?.checked) return true;
    setStatus("Confirme le fonctionnement de Google avant de continuer.");
    return false;
  }

  function getRedirectTo() {
    if (window.location.hostname === "canardculture.com" || window.location.hostname === "www.canardculture.com") {
      return PRODUCTION_ORIGIN + "/";
    }
    return window.location.origin + window.location.pathname;
  }

  async function assertSupabaseReachable() {
    const cfg = getConfig();
    let url;
    try {
      url = new URL(cfg.url);
    } catch {
      throw new Error("URL Supabase invalide. Remets la Project URL exacte dans supabase-config.js.");
    }
    if (!/^https?:$/.test(url.protocol)) {
      throw new Error("URL Supabase invalide. Elle doit commencer par https://");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    try {
      await fetch(url.origin + "/auth/v1/health?culture_check=" + Date.now(), {
        method: "GET",
        mode: "no-cors",
        cache: "no-store",
        signal: controller.signal,
      });
    } catch {
      throw new Error("Supabase introuvable (" + url.host + "). Copie la vraie Project URL Supabase dans supabase-config.js, puis recharge le site.");
    } finally {
      clearTimeout(timeout);
    }
  }

  function snapshotScore(snapshot) {
    const state = snapshot && snapshot.state ? snapshot.state : {};
    let score = 0;
    const added = state["qpuc-added-packs"];
    const userPacks = state["qpuc-user-packs"];
    const srs = state["qpuc-srs-v2"];
    const extras = state["qpuc-pack-extras"];
    const tracking = state["qpuc-tracking"];
    if (Array.isArray(added)) score += added.length * 10;
    if (Array.isArray(userPacks)) score += userPacks.length * 30;
    if (srs && typeof srs === "object") score += Object.keys(srs).length * 2;
    if (extras && typeof extras === "object") score += Object.keys(extras).length * 5;
    if (tracking && typeof tracking === "object") score += Object.keys(tracking).length;
    return score;
  }

  function hasMeaningfulSnapshot(snapshot) {
    return snapshotScore(snapshot) > 0;
  }

  async function loadCloudSnapshot(client) {
    const { data, error } = await client
      .from(SYNC_TABLE)
      .select("state, updated_at")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function saveSnapshotToCloud(client, snapshot) {
    const { error } = await client
      .from(SYNC_TABLE)
      .upsert({
        user_id: session.user.id,
        state: snapshot,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    if (error) throw error;
  }

  async function syncLocalAfterLogin(defaultMessage) {
    if (!session || !session.user) return false;
    if (autoSyncedSessionId === session.user.id) return false;
    autoSyncedSessionId = session.user.id;

    activateUserLocalContext(session.user.id);
    const localSnapshot = buildLocalSnapshot();
    if (!hasMeaningfulSnapshot(localSnapshot)) {
      statusMessage = defaultMessage;
      return false;
    }

    try {
      const client = await getClient();
      const cloud = await loadCloudSnapshot(client);
      const cloudSnapshot = cloud && cloud.state;
      const localScore = snapshotScore(localSnapshot);
      const cloudScore = snapshotScore(cloudSnapshot);

      if (!hasMeaningfulSnapshot(cloudSnapshot)) {
        await saveSnapshotToCloud(client, localSnapshot);
        cacheSnapshotForUser(session.user.id, localSnapshot);
        statusMessage = defaultMessage + " Tes données locales ont été sauvegardées dans ton compte.";
        return true;
      }

      if (localScore > cloudScore) {
        statusMessage = defaultMessage + " Cet appareil contient plus de données que le cloud : clique SAUVEGARDER pour les pousser.";
        return false;
      }

      statusMessage = defaultMessage;
      return false;
    } catch {
      statusMessage = defaultMessage + " Synchro cloud à relancer avec SAUVEGARDER.";
      return false;
    }
  }

  async function handlePasswordAuth(e) {
    e.preventDefault();
    const fields = getAuthFields();
    if (!requireCreationConfirmation()) return;
    if (!fields.email || !fields.password) return setStatus("Email et mot de passe obligatoires.");
    if (authMode === "signup" && !isStrongPassword(fields.password)) {
      return setStatus("Choisis au moins 10 caractères avec une majuscule, une minuscule et un chiffre.");
    }
    if (authMode === "signup" && fields.password !== fields.passwordConfirm) {
      return setStatus("Les deux mots de passe ne correspondent pas.");
    }
    try {
      setBusy(true);
      const client = await getClient();
      if (authMode === "signup") {
        const handle = fields.handle || normalizeHandle(fields.email.split("@")[0]);
        if (!isValidHandle(handle)) return setStatus("Choisis un identifiant public de 2 à 24 lettres, chiffres ou underscores.");
        const displayName = handle;
        if (!isSafePublicProfile(displayName, handle)) {
          return setStatus("Cet identifiant public contient un terme non autorisé.");
        }
        localStorage.setItem("qpuc-social-my-name", displayName);
        const { data, error } = await client.auth.signUp({
          email: fields.email,
          password: fields.password,
          options: {
            emailRedirectTo: getRedirectTo(),
            data: { display_name: displayName, handle },
          },
        });
        if (error) throw error;
        session = data && data.session;
        if (session) {
          activateUserLocalContext(session.user.id);
          await ensureProfile(displayName, handle);
          await syncLocalAfterLogin("Compte créé.");
        } else {
          authMode = "login";
          setStatus("Compte créé. Confirme ton email, puis reconnecte-toi.");
        }
      } else {
        const { data, error } = await client.auth.signInWithPassword({
          email: fields.email,
          password: fields.password,
        });
        if (error) throw error;
        session = data && data.session;
        activateUserLocalContext(session.user.id);
        await ensureProfile();
        await loadProfile();
        await syncLocalAfterLogin("Connecté.");
      }
    } catch (err) {
      setStatus((err && err.message) || "Connexion impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMagicLink(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!requireCreationConfirmation()) return;
    const email = getAuthFields().email;
    if (!email) return setStatus("Entre ton email avant de demander un lien magique.");
    try {
      setBusy(true);
      const client = await getClient();
      const { error } = await client.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: getRedirectTo(),
          shouldCreateUser: authMode === "signup",
        },
      });
      if (error) throw error;
      setStatus(authMode === "signup"
        ? "Lien de création envoyé. Ouvre ton email pour terminer la création du compte."
        : "Lien de connexion envoyé. Ouvre ton email sur ce téléphone ou cet ordinateur.");
    } catch (err) {
      setStatus(err.message || "Impossible d'envoyer le lien.");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    if (!requireGoogleConfirmation()) return;
    try {
      setBusy(true);
      statusMessage = "Vérification de Supabase...";
      renderAccount();
      await assertSupabaseReachable();
      const client = await getClient();
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getRedirectTo() },
      });
      if (error) throw error;
      setStatus(authMode === "signup"
        ? "Redirection vers Google pour créer le compte..."
        : "Redirection vers Google pour te connecter...");
    } catch (err) {
      setStatus((err && err.message) || "Connexion Google indisponible. Vérifie le provider Google dans Supabase.");
      setBusy(false);
    }
  }

  async function resetPassword() {
    const email = getAuthFields().email;
    if (!email) return setStatus("Entre ton email avant de réinitialiser le mot de passe.");
    try {
      setBusy(true);
      const client = await getClient();
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: getRedirectTo(),
      });
      if (error) throw error;
      setStatus("Email de réinitialisation envoyé.");
    } catch (err) {
      setStatus((err && err.message) || "Impossible d'envoyer la réinitialisation.");
    } finally {
      setBusy(false);
    }
  }

  async function updatePassword(e) {
    e.preventDefault();
    const password = document.getElementById("account-new-password")?.value || "";
    if (!isStrongPassword(password)) {
      return setStatus("Choisis au moins 10 caractères avec une majuscule, une minuscule et un chiffre.");
    }
    try {
      setBusy(true);
      const client = await getClient();
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      setStatus("Mot de passe mis à jour.");
    } catch (err) {
      setStatus((err && err.message) || "Impossible de changer le mot de passe.");
    } finally {
      setBusy(false);
    }
  }

  async function loadProfile() {
    if (!session || !session.user) return;
    try {
      const client = await getClient();
      const { data, error } = await client
        .from("profiles")
        .select("display_name, handle, avatar_url")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!error && data) {
        profile = data;
        if (data.display_name) localStorage.setItem("qpuc-social-my-name", data.display_name);
      }
    } catch {
      profile = profile || null;
    }
  }

  async function ensureProfile(displayName, handle) {
    if (!session || !session.user) return;
    try {
      const client = await getClient();
      const name = sanitizeText(
        displayName ||
        localStorage.getItem("qpuc-social-my-name") ||
        session.user.user_metadata?.display_name ||
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        session.user.email?.split("@")[0] ||
        "TOI",
        32
      ).trim() || "TOI";
      const candidateHandle =
        normalizeHandle(handle) ||
        normalizeHandle(profile && profile.handle) ||
        normalizeHandle(session.user.user_metadata?.handle) ||
        normalizeHandle(session.user.email?.split("@")[0]) ||
        null;
      const publicHandle = isValidHandle(candidateHandle) ? candidateHandle : null;
      const safeProfile = isSafePublicProfile(name, publicHandle || "membre");
      const safeName = safeProfile ? name : "Membre";
      const safeHandle = safeProfile ? publicHandle : ("membre_" + session.user.id.replace(/-/g, "").slice(0, 8));
      const { data } = await client
        .from("profiles")
        .upsert({
          user_id: session.user.id,
          display_name: safeName,
          handle: safeHandle,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })
        .select("display_name, handle, avatar_url")
        .maybeSingle();
      if (data) profile = data;
    } catch {
      // Le profil public ne doit jamais bloquer la connexion.
    }
  }

  async function updateProfile(e) {
    e.preventDefault();
    if (!session || !session.user) return setStatus("Connecte-toi d'abord.");
    const displayName = sanitizeText(document.getElementById("account-profile-name")?.value || "", 32).trim();
    const handle = normalizeHandle(document.getElementById("account-profile-handle")?.value || "");
    if (!displayName) return setStatus("Choisis un nom affiché.");
    if (!isValidHandle(handle)) return setStatus("Choisis un identifiant public de 2 à 24 lettres, chiffres ou underscores.");
    if (!isSafePublicProfile(displayName, handle)) {
      return setStatus("Ce profil public contient un terme ou un lien non autorisé.");
    }
    try {
      setBusy(true);
      const client = await getClient();
      const { data, error } = await client
        .from("profiles")
        .upsert({
          user_id: session.user.id,
          display_name: displayName,
          handle,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })
        .select("display_name, handle, avatar_url")
        .maybeSingle();
      if (error) throw error;
      profile = data || { display_name: displayName, handle };
      localStorage.setItem("qpuc-social-my-name", displayName);
      setStatus("Profil mis à jour.");
    } catch (err) {
      const message = err && err.message && err.message.includes("duplicate")
        ? "Ce user id est déjà pris."
        : ((err && err.message) || "Impossible d'enregistrer le profil.");
      setStatus(message);
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    try {
      setBusy(true);
      const client = await getClient();
      const { data: current } = await client.auth.getSession();
      session = current && current.session;
      if (!session || !session.user) throw new Error("Connecte-toi d'abord.");
      const snapshot = buildLocalSnapshot();
      if (!hasMeaningfulSnapshot(snapshot)) {
        const ok = confirm("Ta sauvegarde locale semble vide. La sauvegarder dans le cloud peut remplacer une ancienne sauvegarde utile. Continuer ?");
        if (!ok) {
          setStatus("Sauvegarde annulée : état local vide.");
          return;
        }
      }
      await saveSnapshotToCloud(client, snapshot);
      cacheSnapshotForUser(session.user.id, snapshot);
      setStatus("Progression sauvegardée.");
    } catch (err) {
      setStatus((err && err.message) || "Sauvegarde impossible. Vérifie la table Supabase.");
    } finally {
      setBusy(false);
    }
  }

  async function restoreFromCloud() {
    if (!confirm("Restaurer la sauvegarde cloud sur cet appareil ?")) return;
    try {
      setBusy(true);
      const client = await getClient();
      const { data: current } = await client.auth.getSession();
      session = current && current.session;
      if (!session || !session.user) throw new Error("Connecte-toi d'abord.");
      const data = await loadCloudSnapshot(client);
      if (!data || !data.state) throw new Error("Aucune sauvegarde cloud trouvée.");
      const localSnapshot = buildLocalSnapshot();
      if (!hasMeaningfulSnapshot(data.state)) {
        throw new Error("La sauvegarde cloud est vide. Je ne remplace pas tes données locales avec du vide.");
      }
      if (hasMeaningfulSnapshot(localSnapshot) && snapshotScore(data.state) < snapshotScore(localSnapshot)) {
        const ok = confirm("La sauvegarde cloud semble contenir moins de données que cet appareil. Restaurer quand même ?");
        if (!ok) {
          setStatus("Restauration annulée.");
          return;
        }
      }
      restoreSnapshot(data.state);
      cacheSnapshotForUser(session.user.id, data.state);
      setStatus("Sauvegarde restaurée. La page va se rafraîchir.");
      setTimeout(() => window.location.reload(), 700);
    } catch (err) {
      setStatus((err && err.message) || "Restauration impossible.");
    } finally {
      setBusy(false);
    }
  }

  function exportLocalBackup() {
    try {
      const snapshot = buildLocalSnapshot();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = "culture-backup-" + date + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus("Export local créé.");
    } catch (err) {
      setStatus((err && err.message) || "Export impossible.");
    }
  }

  function importLocalBackup(e) {
    const file = e && e.target && e.target.files ? e.target.files[0] : null;
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setStatus("Import refusé : la sauvegarde dépasse 1 Mo.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const snapshot = JSON.parse(String(reader.result || ""));
        if (!hasMeaningfulSnapshot(snapshot)) throw new Error("Ce fichier ne contient pas de sauvegarde CULTURE valide.");
        restoreSnapshot(snapshot);
        if (session && session.user) cacheSnapshotForUser(session.user.id, snapshot);
        setStatus("Import terminé. La page va se rafraîchir.");
        setTimeout(() => window.location.reload(), 600);
      } catch (err) {
        setStatus((err && err.message) || "Import impossible.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function signOut() {
    try {
      setBusy(true);
      const client = await getClient();
      const userId = session && session.user ? session.user.id : "";
      if (userId) cacheSnapshotForUser(userId);
      await client.auth.signOut({ scope: "local" });
      clearSnapshotStorage();
      localStorage.removeItem(LOCAL_OWNER_KEY);
      session = null;
      profile = null;
      autoSyncedSessionId = "";
      window.location.reload();
    } catch (err) {
      setStatus((err && err.message) || "Déconnexion impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function signOutEverywhere() {
    if (!confirm("Déconnecter ce compte de tous les appareils ?")) return;
    try {
      setBusy(true);
      const client = await getClient();
      const userId = session && session.user ? session.user.id : "";
      if (userId) cacheSnapshotForUser(userId);
      const { error } = await client.auth.signOut({ scope: "global" });
      if (error) throw error;
      clearSnapshotStorage();
      localStorage.removeItem(LOCAL_OWNER_KEY);
      session = null;
      profile = null;
      autoSyncedSessionId = "";
      window.location.reload();
    } catch (err) {
      setStatus((err && err.message) || "Déconnexion globale impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function clearDeviceData() {
    if (!confirm("Effacer de cet appareil les paquets, la progression et les caches de comptes ? Les données déjà sauvegardées dans le cloud resteront disponibles.")) return;
    try {
      setBusy(true);
      if (session) {
        const client = await getClient();
        await client.auth.signOut({ scope: "local" });
      }
      clearSnapshotStorage();
      removeAllAccountCaches();
      localStorage.removeItem(LOCAL_OWNER_KEY);
      session = null;
      profile = null;
      window.location.reload();
    } catch (err) {
      setStatus((err && err.message) || "Impossible d'effacer les données de cet appareil.");
    } finally {
      setBusy(false);
    }
  }

  async function initAuth() {
    renderAccount();
    if (!getConfig().ready) return;
    try {
      const client = await getClient();
      const { data } = await client.auth.getSession();
      session = data && data.session;
      if (session) {
        activateUserLocalContext(session.user.id);
        await ensureProfile();
        await loadProfile();
        await syncLocalAfterLogin("Connecté.");
      }
      client.auth.onAuthStateChange(async (event, nextSession) => {
        session = nextSession;
        if (event === "PASSWORD_RECOVERY") {
          statusMessage = "Choisis un nouveau mot de passe.";
          renderAccount();
        } else if (session) {
          activateUserLocalContext(session.user.id);
          await ensureProfile();
          await loadProfile();
          await syncLocalAfterLogin("Connecté.");
          renderAccount();
        } else {
          profile = null;
          renderAccount();
        }
      });
      renderAccount();
    } catch (err) {
      setStatus(err.message || "Connexion indisponible.");
    }
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/`/g, "&#96;");
  }

  function normalizeHandle(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/^@+/, "")
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 24);
  }

  function isStrongPassword(value) {
    const password = String(value || "");
    return password.length >= 10 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
  }

  function isValidHandle(value) {
    return /^[a-z0-9_]{2,24}$/.test(String(value || ""));
  }

  function isSafePublicProfile(displayName, handle) {
    const safety = window.CultureContentSafety;
    if (!safety || typeof safety.checkPack !== "function") return false;
    return safety.checkPack({ name: displayName, description: handle, cards: [] }).ok;
  }

  function getProviderLabel() {
    if (!session || !session.user) return "";
    const identities = session.user.identities || [];
    const provider = identities[0] && identities[0].provider;
    if (provider === "google") return "Google";
    if (provider === "email") return "Email + mot de passe";
    return provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : "Compte";
  }

  window.CultureAuth = {
    render: renderAccount,
    setMode,
    isSignedIn: () => !!(session && session.user),
    signInWithGoogle,
    sendMagicLink,
    resetPassword,
    syncNow,
    restoreFromCloud,
    exportLocalBackup,
    signOut,
    signOutEverywhere,
    clearDeviceData,
    buildLocalSnapshot,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuth);
  } else {
    initAuth();
  }
})();
