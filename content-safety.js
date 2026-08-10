// content-safety.js — filtre local pour les paquets publics.
// Important : ce garde-fou doit aussi être reproduit côté serveur avant publication.
(function () {
  const MAX_PUBLIC_TEXT_LENGTH = 6000;

  const rules = [
    {
      id: "violence",
      label: "menaces ou violence ciblée",
      patterns: [
        /\b(j|je|on|nous)\s+(vais|va|allons)\s+(te\s+|le\s+|la\s+|les\s+)?(tuer|buter|egorger|tabasser|frapper)\b/,
        /\b(tue|tuez|bute|buter|frappe|frappez)\s+(toi|le|la|les)\b/,
        /\b(tue toi|va mourir|kill yourself|kys)\b/,
        /\bmort\s+aux?\s+[a-z0-9]{3,}\b/,
      ],
    },
    {
      id: "explicit",
      label: "contenu sexuel explicite",
      patterns: [
        /\b(violer|viol|pedophile|pedophilie|porno|pornographie|nude|nudes|sextape|inceste|zoophilie)\b/,
      ],
    },
    {
      id: "harassment",
      label: "insultes graves ou harcèlement",
      terms: [
        "connard", "connasse", "encule", "enculer", "pute", "salope",
        "batard", "fdp", "nique ta mere", "ntm", "bougnoule", "negre",
        "negro", "youpin", "chintok", "pede", "pd", "tapette",
        "gouine", "mongol", "mongolien", "triso",
      ],
      patterns: [
        /\b(sale|sales|putain de|espece de)\s+(juif|juive|musulman|musulmane|arabe|noir|noire|gay|lesbienne|trans|handicape|asiatique|chretien|chretienne)\b/,
      ],
    },
    {
      id: "danger",
      label: "instructions dangereuses",
      patterns: [
        /\b(comment|recette|fabriquer|faire)\s+(une?\s+)?(bombe|explosif|poison)\b/,
      ],
    },
    {
      id: "personal_data",
      label: "données personnelles",
      rawPatterns: [
        /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
        /(?:\+?\d[\s().-]*){9,}/,
      ],
    },
    {
      id: "external_link",
      label: "lien externe",
      rawPatterns: [
        /\bhttps?:\/\//i,
        /\bwww\./i,
        /\b(discord\.gg|t\.me\/|wa\.me\/)/i,
      ],
    },
    {
      id: "too_long",
      label: "texte trop long pour publication directe",
      test(rawText) {
        return rawText.length > MAX_PUBLIC_TEXT_LENGTH;
      },
    },
  ];

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/0/g, "o")
      .replace(/@/g, "a")
      .replace(/[1!|]/g, "i")
      .replace(/3/g, "e")
      .replace(/4/g, "a")
      .replace(/5|\$/g, "s")
      .replace(/7/g, "t")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function termToRegex(term) {
    const normalized = normalize(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp("\\b" + normalized.replace(/\s+/g, "\\s+") + "\\b");
  }

  function collectPackText(pack) {
    const fields = [
      pack && pack.name,
      pack && pack.description,
      pack && pack.category,
      pack && pack.difficulty,
    ];

    const cards = pack && Array.isArray(pack.cards) ? pack.cards : [];
    cards.forEach((card) => {
      fields.push(card && card.front, card && card.back, card && card.memo);
    });

    return fields.filter((value) => String(value || "").trim());
  }

  function ruleMatches(rule, rawText, normalizedText) {
    if (typeof rule.test === "function" && rule.test(rawText, normalizedText)) return true;
    if (Array.isArray(rule.rawPatterns) && rule.rawPatterns.some((pattern) => pattern.test(rawText))) return true;
    if (Array.isArray(rule.patterns) && rule.patterns.some((pattern) => pattern.test(normalizedText))) return true;
    if (Array.isArray(rule.terms) && rule.terms.some((term) => termToRegex(term).test(normalizedText))) return true;
    return false;
  }

  function checkPack(pack) {
    const reasons = new Map();
    const rawText = collectPackText(pack).join("\n");
    const normalizedText = normalize(rawText);

    for (const rule of rules) {
      if (ruleMatches(rule, rawText, normalizedText)) {
        reasons.set(rule.id, { id: rule.id, label: rule.label });
      }
    }

    return {
      ok: reasons.size === 0,
      reasons: Array.from(reasons.values()),
    };
  }

  function summarize(result) {
    if (!result || result.ok) return "Paquet public validé.";
    const labels = (result.reasons || []).map((reason) => reason.label).filter(Boolean);
    const detail = labels.length ? " : " + labels.slice(0, 3).join(", ") : "";
    return "Ce paquet ne peut pas être public" + detail + ". Mets-le en privé ou reformule.";
  }

  function isPackPublicSafe(pack) {
    return checkPack(pack).ok;
  }

  window.CultureContentSafety = {
    checkPack,
    summarize,
    isPackPublicSafe,
  };
})();
