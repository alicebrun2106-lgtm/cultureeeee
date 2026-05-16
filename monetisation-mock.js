// monetisation-mock.js
// MOCK = version démo sans vraie IA ni vrai paiement.
// Tout est stocké dans le navigateur avec localStorage.
//
// Restylé en CULTURE!!! brutaliste : .frame / .btn / .btn-y, fonds papier,
// ombres dures noires. Même comportement que la version d'origine.

(function () {
  const STORAGE_KEY = "culture_duck_monetisation_mock";

  const defaultState = {
    plan: "free",
    ownedSkins: ["duck-basic"],
    equippedSkin: "duck-basic",
    aiGenerationsUsed: 0,
    documentUploadsUsed: 0,
    generatedPacks: []
  };

  const skins = [
    { id: "duck-basic",     name: "Canard de base",     emoji: "🦆",   rarity: "gratuit", price: "Déjà à toi", description: "Le canard originel. Simple. Efficace. Un peu perdu." },
    { id: "duck-student",   name: "Canard étudiant",    emoji: "🦆🎓", rarity: "commun",  price: "100 XP",      description: "Il révise, mais il procrastine aussi." },
    { id: "duck-historian", name: "Canard historien",   emoji: "🦆📜", rarity: "rare",    price: "2€",          description: "Il connaît trop bien les dates de la Révolution française." },
    { id: "duck-detective", name: "Canard détective",   emoji: "🦆🕵️", rarity: "rare",    price: "3€",          description: "Il trouve les pièges dans les questions." },
    { id: "duck-gold",      name: "Canard doré",        emoji: "🦆✨", rarity: "premium", price: "5€",          description: "Le canard des grands mécènes de la culture gé." }
  ];

  const quota = {
    free:    { aiGenerations: 1,   documentUploads: 1 },
    premium: { aiGenerations: 999, documentUploads: 999 }
  };

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultState, ...JSON.parse(saved) } : { ...defaultState };
    } catch {
      return { ...defaultState };
    }
  }
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  let state = loadState();

  function getEquippedSkin() {
    return skins.find((s) => s.id === state.equippedSkin) || skins[0];
  }

  // ─── Bouton nav "BOUTIQUE ✨" ───
  function injectNavButton() {
    // On ajoute le bouton dans la nav existante, à côté des autres liens.
    const navLinks = document.querySelector(".nav-links");
    if (!navLinks || document.getElementById("btn-boutique-ia")) return;

    const a = document.createElement("a");
    a.href = "#";
    a.id = "btn-boutique-ia";
    a.className = "nav-shop-link";
    a.textContent = "BOUTIQUE ✨";
    a.addEventListener("click", (e) => { e.preventDefault(); openMonetisationHub(); });
    navLinks.appendChild(a);
  }

  // ─── Modal principal ───
  function openMonetisationHub() {
    closeModal();
    const modal = document.createElement("div");
    modal.className = "mock-modal-backdrop";
    modal.id = "mockModal";
    modal.innerHTML = `
      <div class="mock-modal frame">
        <button class="mock-close" onclick="window.closeMonetisationMock()" aria-label="Fermer">×</button>

        <div class="mock-header">
          <div class="mock-big-duck">${getEquippedSkin().emoji}</div>
          <div>
            <h2 class="mock-title">LE COIN DU CANARD</h2>
            <p class="mock-sub">Boutique, soutien, génération de paquets et documents transformés en flashcards.</p>
          </div>
        </div>

        <div class="mock-tabs">
          <button class="mock-tab on" data-tab="shop"     onclick="window.renderMockTab('shop', this)">SKINS</button>
          <button class="mock-tab"    data-tab="donation" onclick="window.renderMockTab('donation', this)">DONATION</button>
          <button class="mock-tab"    data-tab="book"     onclick="window.renderMockTab('book', this)">📚 LIVRE → CARTES</button>
          <button class="mock-tab"    data-tab="ai"       onclick="window.renderMockTab('ai', this)">🪄 PAQUET MAGIQUE</button>
          <button class="mock-tab"    data-tab="document" onclick="window.renderMockTab('document', this)">DOC → CARTES</button>
          <button class="mock-tab"    data-tab="premium"  onclick="window.renderMockTab('premium', this)">PREMIUM</button>
        </div>

        <div id="mockTabContent" class="mock-tab-content"></div>
      </div>
    `;
    document.body.appendChild(modal);
    // Click hors modal = fermer
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    renderTab("shop");
  }

  function closeModal() {
    const existing = document.getElementById("mockModal");
    if (existing) existing.remove();
  }

  function renderTab(tab, btn) {
    // Active visuel sur l'onglet cliqué
    if (btn) {
      document.querySelectorAll(".mock-tab").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
    }
    const container = document.getElementById("mockTabContent");
    if (!container) return;
    if (tab === "shop")     renderShop(container);
    if (tab === "donation") renderDonation(container);
    if (tab === "book")     renderBookComingSoon(container);
    if (tab === "ai")       renderAIComingSoon(container);
    if (tab === "document") renderDocumentComingSoon(container);
    if (tab === "premium")  renderPremiumComingSoon(container);
  }

  // ─── COMING SOON : fake door tests ───
  function renderBookComingSoon(container) {
    container.innerHTML = `
      <div class="coming-soon-card">
        <div class="coming-tag">🔜 BIENTÔT</div>
        <h3 class="mock-h">📚 LIVRE → CARTES</h3>
        <p class="mock-muted">Tape le nom d'un livre, le canard te fabrique un paquet de 20 cartes : intrigue, personnages, dates clés, citations, thèmes. Parfait pour réviser un bouquin ou découvrir un classique.</p>
        <div class="coming-example">
          <strong>Exemples :</strong> <em>« Le Comte de Monte-Cristo », « 1984 », « L'Étranger »</em>
        </div>
        <p class="coming-cta-line"><strong>Tu serais intéressé(e) ?</strong> Dis-le nous, on saura quoi coder en priorité.</p>
        <button class="btn btn-y mock-cta" onclick="window.openFeatureSurvey('livre-cartes', '📚 Livre → cartes', 'Tape le nom d\\'un livre, le canard te fabrique 20 cartes sur l\\'intrigue, les personnages, les thèmes.', '0,99€ par livre', 'inclus dans Premium 4,99€/mois')">💬 CE PRIX TE VA ?</button>
      </div>
    `;
  }

  function renderAIComingSoon(container) {
    container.innerHTML = `
      <div class="coming-soon-card">
        <div class="coming-tag">🔜 BIENTÔT</div>
        <h3 class="mock-h">🪄 PAQUET MAGIQUE</h3>
        <p class="mock-muted">Donne-nous un thème, un niveau, un style — le canard te fabrique un paquet de cartes 100% sur mesure. « Révolution française niveau concours », « Mythologie grecque pour ado »…</p>
        <div class="coming-example">
          <strong>Tu choisis :</strong> thème · niveau (débutant → concours) · style (QPUC, pièges, dates) · nombre de cartes
        </div>
        <p class="coming-cta-line"><strong>Tu serais intéressé(e) ?</strong> Dis-le nous.</p>
        <button class="btn btn-y mock-cta" onclick="window.openFeatureSurvey('paquet-magique', '🪄 Paquet sur mesure', 'Génère un paquet de cartes à partir d\\'un thème, niveau, style libres.', '1,49€ par paquet', 'inclus dans Premium 4,99€/mois')">💬 CE PRIX TE VA ?</button>
      </div>
    `;
  }

  function renderDocumentComingSoon(container) {
    container.innerHTML = `
      <div class="coming-soon-card">
        <div class="coming-tag">🔜 BIENTÔT</div>
        <h3 class="mock-h">📄 DOCUMENT → CARTES</h3>
        <p class="mock-muted">Upload ton cours, ton PDF, ton article — le canard en extrait les notions clés et fabrique automatiquement des cartes de révision.</p>
        <div class="coming-example">
          <strong>Formats :</strong> PDF, Word, image (photo de cours), texte collé
        </div>
        <p class="coming-cta-line"><strong>Tu serais intéressé(e) ?</strong></p>
        <button class="btn btn-y mock-cta" onclick="window.openFeatureSurvey('doc-cartes', '📄 Document → cartes', 'Transforme tes cours/PDFs/photos en flashcards automatiquement.', '1,99€ par document', 'inclus dans Premium 4,99€/mois')">💬 CE PRIX TE VA ?</button>
      </div>
    `;
  }

  function renderPremiumComingSoon(container) {
    container.innerHTML = `
      <div class="coming-soon-card">
        <div class="coming-tag">🔜 BIENTÔT</div>
        <h3 class="mock-h">💎 PREMIUM</h3>
        <p class="mock-muted">Un abonnement pour débloquer les features qui coûtent du calcul (génération de paquets, gros documents, skins exclusifs). Tu paies, on code, on encaisse pas les ronds tant que ça vaut pas le coup.</p>
        <ul class="mock-perks">
          <li>Générations de paquets illimitées</li>
          <li>Documents plus longs (50+ pages)</li>
          <li>Skins premium du canard</li>
          <li>Statistiques avancées de progression</li>
          <li>Mode hors-ligne complet</li>
        </ul>
        <p class="coming-cta-line"><strong>À ce prix, tu prendrais Premium ?</strong></p>
        <button class="btn btn-y mock-cta" onclick="window.openFeatureSurvey('premium', '💎 Premium CULTURE!!!', 'Abonnement qui débloque toutes les générations de paquets + skins + stats + offline + mode hors-ligne.', '4,99€/mois', '39€/an (économise 21€)')">💬 CE PRIX TE VA ?</button>
      </div>
    `;
  }

  function renderShop(container) {
    container.innerHTML = `
      <h3 class="mock-h">VESTIAIRE DU CANARD</h3>
      <p class="mock-muted">Achète ou équipe des skins. Pour l'instant c'est une démo : aucun vrai paiement.</p>

      <div class="mock-grid">
        ${skins.map((skin) => {
          const owned = state.ownedSkins.includes(skin.id);
          const equipped = state.equippedSkin === skin.id;
          return `
            <div class="mock-card frame ${equipped ? "is-equipped" : ""}">
              <div class="mock-skin-emoji">${skin.emoji}</div>
              <h4 class="mock-card-title">${skin.name}</h4>
              <p class="mock-card-desc">${skin.description}</p>
              <div class="mock-card-meta">
                <span class="mock-badge rarity-${skin.rarity}">${skin.rarity}</span>
                <strong>${skin.price}</strong>
              </div>
              ${equipped
                ? `<button class="btn btn-y" disabled>✓ ÉQUIPÉ</button>`
                : owned
                ? `<button class="btn" onclick="window.equipMockSkin('${skin.id}')">ÉQUIPER</button>`
                : `<button class="btn" onclick="window.buyMockSkin('${skin.id}')">ACHETER (MOCK)</button>`}
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderDonation(container) {
    container.innerHTML = `
      <h3 class="mock-h">SOUTENIR LE CANARD</h3>
      <p class="mock-muted">Version mock : ça simule une donation, mais aucun argent ne part vraiment.</p>

      <div class="mock-donate-row">
        <button class="btn btn-y" onclick="window.mockDonate(2)">2€ — UN CAFÉ AU CANARD</button>
        <button class="btn btn-y" onclick="window.mockDonate(5)">5€ — NOURRIR SES RÉVISIONS</button>
        <button class="btn btn-y" onclick="window.mockDonate(10)">10€ — MÉCÈNE DE LA CULTURE GÉ</button>
      </div>

      <div class="mock-box frame">
        <p>Plus tard, tu connecteras ici Stripe, Ko-fi ou Buy Me a Coffee.</p>
      </div>
    `;
  }

  function renderAI(container) {
    const max = quota[state.plan].aiGenerations;
    container.innerHTML = `
      <h3 class="mock-h">GÉNÉRER UN PAQUET AVEC L'IA</h3>
      <p class="mock-muted">Usage aujourd'hui : <strong>${state.aiGenerationsUsed} / ${max === 999 ? "∞" : max}</strong></p>

      <label class="mock-label">THÈME</label>
      <input id="aiTheme" class="mock-input" placeholder="Ex : Révolution française, mythologie grecque, géographie…" />

      <div class="mock-row-3">
        <div>
          <label class="mock-label">NIVEAU</label>
          <select id="aiLevel" class="mock-input">
            <option>Débutant</option><option>Intermédiaire</option><option>Expert</option><option>Concours</option>
          </select>
        </div>
        <div>
          <label class="mock-label">NB DE CARTES</label>
          <select id="aiCount" class="mock-input"><option>10</option><option>20</option><option>30</option></select>
        </div>
        <div>
          <label class="mock-label">STYLE</label>
          <select id="aiStyle" class="mock-input">
            <option>Classique</option><option>QPUC</option><option>Pièges fréquents</option><option>Dates et chiffres</option>
          </select>
        </div>
      </div>

      <button class="btn btn-y mock-cta" onclick="window.generateMockPack()">✨ LE CANARD GÉNÈRE MON PAQUET</button>
      <div id="aiResult" class="mock-result"></div>
    `;
  }

  function renderDocument(container) {
    const max = quota[state.plan].documentUploads;
    container.innerHTML = `
      <h3 class="mock-h">TRANSFORMER UN DOCUMENT EN FLASHCARDS</h3>
      <p class="mock-muted">Usage aujourd'hui : <strong>${state.documentUploadsUsed} / ${max === 999 ? "∞" : max}</strong></p>

      <div class="mock-upload frame">
        <p>Glisse ton document ici, ou choisis un fichier.</p>
        <input id="docInput" type="file" accept=".txt,.pdf,.doc,.docx" />
      </div>

      <label class="mock-label">OU COLLE TON COURS</label>
      <textarea id="docText" class="mock-input mock-textarea" placeholder="Colle ton cours ici…" rows="7"></textarea>

      <button class="btn btn-y mock-cta" onclick="window.generateMockFromDocument()">📄 LE CANARD TRANSFORME ÇA EN CARTES</button>
      <div id="docResult" class="mock-result"></div>
    `;
  }

  function renderPremium(container) {
    const isPremium = state.plan === "premium";
    container.innerHTML = `
      <h3 class="mock-h">PREMIUM DU CANARD</h3>
      <p class="mock-muted">Version mock : le bouton active Premium gratuitement pour tester l'UX.</p>

      <div class="mock-price frame">
        <h4 class="mock-card-title">${isPremium ? "✓ PREMIUM ACTIF" : "PREMIUM"}</h4>
        <p class="mock-big-price">4,99€ / mois</p>
        <ul class="mock-perks">
          <li>Générations IA quasi illimitées</li>
          <li>Documents plus longs</li>
          <li>Skins premium</li>
          <li>Stats avancées plus tard</li>
        </ul>
        ${isPremium
          ? `<button class="btn btn-y" disabled>DÉJÀ PREMIUM ✓</button>`
          : `<button class="btn btn-y mock-cta" onclick="window.activateMockPremium()">ACTIVER PREMIUM (MOCK)</button>`}
      </div>
    `;
  }

  // ─── Actions ───
  function buySkin(id) {
    if (!state.ownedSkins.includes(id)) state.ownedSkins.push(id);
    state.equippedSkin = id;
    saveState();
    renderTab("shop");
    toast("Skin acheté et équipé (mock).");
  }

  function equipSkin(id) {
    if (!state.ownedSkins.includes(id)) { toast("Achète d'abord ce skin."); return; }
    state.equippedSkin = id;
    saveState();
    renderTab("shop");
    toast("Skin équipé.");
  }

  function donate(amount) {
    toast(`Donation mock de ${amount}€ validée. Le canard te remercie 🦆`);
  }

  function activatePremium() {
    state.plan = "premium";
    saveState();
    renderTab("premium");
    toast("Premium activé (mock).");
  }

  function generateMockPack() {
    const max = quota[state.plan].aiGenerations;
    if (state.aiGenerationsUsed >= max) {
      renderPaywall("aiResult", "Le canard a atteint sa limite IA gratuite.");
      return;
    }
    const theme = document.getElementById("aiTheme").value.trim() || "Culture générale";
    const level = document.getElementById("aiLevel").value;
    const count = Number(document.getElementById("aiCount").value);
    const style = document.getElementById("aiStyle").value;

    const result = document.getElementById("aiResult");
    result.innerHTML = `<div class="mock-loading">🦆 Le canard fouille dans la bibliothèque…</div>`;

    setTimeout(() => {
      const pack = createMockPack(theme, level, count, style);
      state.aiGenerationsUsed += 1;
      state.generatedPacks.push(pack);
      saveState();
      result.innerHTML = renderPackPreview(pack);
    }, 900);
  }

  function generateMockFromDocument() {
    const max = quota[state.plan].documentUploads;
    if (state.documentUploadsUsed >= max) {
      renderPaywall("docResult", "Le canard a déjà lu son document gratuit.");
      return;
    }
    const text = document.getElementById("docText").value.trim();
    const fileInput = document.getElementById("docInput");
    const file = fileInput && fileInput.files[0];

    if (!text && !file) { toast("Ajoute un fichier ou colle du texte."); return; }

    const result = document.getElementById("docResult");
    result.innerHTML = `<div class="mock-loading">📄 Le canard lit ton document sans pleurer…</div>`;

    setTimeout(() => {
      const sourceName = file ? file.name : "texte collé";
      const pack = createMockPack(`Document : ${sourceName}`, "Intermédiaire", 10, "Résumé de cours");
      state.documentUploadsUsed += 1;
      state.generatedPacks.push(pack);
      saveState();
      result.innerHTML = renderPackPreview(pack);
    }, 1000);
  }

  function createMockPack(theme, level, count, style) {
    const templates = [
      { q: `Quelle est l'idée essentielle à retenir sur : ${theme} ?`, a: `Une notion centrale de ${theme}, adaptée au niveau ${level}.` },
      { q: `Quel piège fréquent peut tomber sur ${theme} ?`,            a: `Confondre deux notions proches ou retenir une date sans son contexte.` },
      { q: `Comment résumer ${theme} en une phrase ?`,                  a: `${theme} est un thème important qui peut être relié à plusieurs événements, notions ou personnages.` },
      { q: `Quelle question type QPUC pourrait tomber sur ${theme} ?`,  a: `Une question courte demandant une réponse précise liée à ${theme}.` },
      { q: `Pourquoi ${theme} est utile en culture générale ?`,         a: `Parce que ce thème permet de faire des liens entre histoire, société, arts, sciences ou géographie.` }
    ];
    const cards = [];
    for (let i = 0; i < count; i++) {
      const t = templates[i % templates.length];
      cards.push({
        question: t.q,
        answer: t.a,
        explanation: `Carte générée en mock. Plus tard, une vraie IA remplacera cette réponse.`,
        difficulty: level,
        tags: [theme, style]
      });
    }
    return {
      id: `mock-pack-${Date.now()}`,
      title: `${theme} — ${level}`,
      description: `Paquet généré en mode mock. Style : ${style}.`,
      category: "IA mock",
      cards
    };
  }

  function renderPackPreview(pack) {
    return `
      <div class="mock-pack-preview frame">
        <h4 class="mock-card-title">${pack.title}</h4>
        <p class="mock-muted">${pack.description}</p>
        <p><strong>${pack.cards.length}</strong> cartes générées.</p>
        ${pack.cards.slice(0, 5).map((c, i) => `
          <div class="mock-flashcard">
            <strong>${i + 1}. ${c.question}</strong>
            <p>${c.answer}</p>
            <small>${c.explanation}</small>
          </div>
        `).join("")}
        <button class="btn btn-y" onclick="window.saveMockPackToMyPacks('${pack.id}')">+ AJOUTER À MES PAQUETS</button>
      </div>
    `;
  }

  function saveMockPackToMyPacks(packId) {
    const pack = state.generatedPacks.find((p) => p.id === packId);
    if (!pack) { toast("Paquet introuvable."); return; }

    const existingPacks = JSON.parse(localStorage.getItem("culture_mock_user_packs") || "[]");
    existingPacks.push(pack);
    localStorage.setItem("culture_mock_user_packs", JSON.stringify(existingPacks));
    toast("Paquet ajouté à tes paquets (mock).");
  }

  function renderPaywall(targetId, message) {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.innerHTML = `
      <div class="mock-paywall frame">
        <h4 class="mock-card-title">${message}</h4>
        <p>Passe Premium pour continuer à générer plein de cartes.</p>
        <button class="btn btn-y" onclick="window.renderMockTab('premium', document.querySelector('.mock-tab[data-tab=premium]'))">VOIR PREMIUM</button>
      </div>
    `;
  }

  function toast(message) {
    const existing = document.querySelector(".mock-toast");
    if (existing) existing.remove();
    const el = document.createElement("div");
    el.className = "mock-toast";
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  // Exports globaux pour les onclick=
  window.closeMonetisationMock     = closeModal;
  window.renderMockTab             = renderTab;
  window.buyMockSkin               = buySkin;
  window.equipMockSkin             = equipSkin;
  window.mockDonate                = donate;
  window.activateMockPremium       = activatePremium;
  window.generateMockPack          = generateMockPack;
  window.generateMockFromDocument  = generateMockFromDocument;
  window.saveMockPackToMyPacks     = saveMockPackToMyPacks;
  window.openMonetisationMock      = openMonetisationHub;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectNavButton);
  } else {
    injectNavButton();
  }
})();
