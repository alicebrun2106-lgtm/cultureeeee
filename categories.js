// Catégories grand public pour l'onglet "Explorer"
// 9 catégories simples, lisibles, accessibles

const CATEGORIES = [
  {
    id: "geographie",
    name: "Géographie",
    icon: "🌍",
    color: "#3498db",
    description: "Pays, capitales, fleuves, régions",
    packIds: [
      "chefs-lieux", "regions-france", "fleuves-france", "fleuves-monde",
      "capitales-monde", "geo-pdf", "geo-bases", "geo-avancee", "geo-insolite",
      "monuments-france", "monuments-monde", "monnaies-monde", "geologie-geo",
      "gentiles-geographie",
    ],
  },
  {
    id: "histoire",
    name: "Histoire",
    icon: "📜",
    color: "#c0392b",
    description: "Rois, guerres, dates, civilisations",
    packIds: [
      "histoire-france-bases", "histoire-dates", "histoire-dates-cles",
      "histoire-divers-pdf", "histoire-ancienne-mytho",
      "geopolitique-monde", "presidents-francais", "presidents-usa",
      "alexandre-le-grand",
    ],
  },
  {
    id: "sciences",
    name: "Sciences",
    icon: "🧬",
    color: "#16a085",
    description: "Corps humain, maths, physique, inventions",
    packIds: [
      "termes-medicaux", "suffixes-medicaux", "sciences-medecine-quiz", "sciences-medecine-pdf",
      "sciences-etonnantes", "corps-humain", "corps-humain-insolite", "os-anatomie",
      "quiz-confirme-medecine-anatomie", "quiz-confirme-psychologie-societe",
      "mathematiques-celebres", "maths-sciences-bases",
      "inventions", "inventions-objets-quotidien", "inventeurs-celebres",
      "daily-black-holes",
    ],
  },
  {
    id: "art",
    name: "Art",
    icon: "🎨",
    color: "#8e44ad",
    description: "Peintres, tableaux, architecture",
    packIds: [
      "peintres", "tableaux-celebres", "arts-architecture", "arts-bases",
      "compositeurs", "compositeurs-essentiels",
    ],
  },
  {
    id: "litterature",
    name: "Littérature",
    icon: "📖",
    color: "#d35400",
    description: "Auteurs, romans, mots & expressions",
    packIds: [
      "litterature", "litterature-auteurs", "litterature-bases", "romans-auteurs",
      "theatre",
      "figures-style", "expressions-origines", "expressions-bases",
      "etymologie", "langue-francaise",
      "comment-appelle-t-on", "vocabulaire-12-coups", "vocabulaire-rare", "vrais-noms",
      "termes-techniques", "prefixes-grecs", "racines-grecques", "racines-latines",
      "suffixes-utiles", "abreviations", "homonymes",
      "appellations-insolites", "metiers-appellations", "noms-peu-connus",
    ],
  },
  {
    id: "politique",
    name: "Politique",
    icon: "🏛️",
    color: "#2c3e50",
    description: "France, monde, institutions",
    packIds: [
      "politique-france-recente", "presidents-francais", "presidents-usa",
      "institutions-france", "institutions-internationales",
      "geopolitique-monde", "philosophie", "etudes-societales-recentes",
    ],
  },
  {
    id: "sport",
    name: "Sport",
    icon: "🏆",
    color: "#27ae60",
    description: "JO, foot, tennis, F1, NBA",
    packIds: [
      "sports-records-jo", "sport-bases", "sport-pdf",
      "football-culture", "tour-de-france", "marathon-course",
    ],
  },
  {
    id: "pop",
    name: "Culture pop",
    icon: "🎬",
    color: "#e91e63",
    description: "Cinéma, séries, musique, célébrités",
    packIds: [
      "cinema-realisateurs-cultes", "cinema-series", "cinema-tv-pdf",
      "films-cultes", "prix-cinema", "personnages-principaux",
      "cinema-francais", "acteurs-cultes-monde", "alien-prometheus",
      "quiz-confirme-series-tv", "quiz-confirme-cinema-acteurs",
      "musique-tubes-artistes", "musique-albums-cles", "musique-vrais-prenoms",
      "musique-paroles-celebres", "musique-culture-liens",
      "beatles", "rolling-stones", "instruments-musique",
      "musique-pop", "musique-bases", "musique-classique", "musique-classique-variete",
      "musique-groupes", "chansons-francaises",
      "pop-culture-fr", "pop-culture-bases", "actu-societe",
    ],
  },
  {
    id: "curiosites",
    name: "Animaux & curiosités",
    icon: "🐾",
    color: "#f39c12",
    description: "Records, fun facts, animaux, vie quotidienne",
    packIds: [
      "animaux-insolites", "animaux-insolites-2", "animaux-noms-alternatifs", "familles-animaux",
      "botanique", "botanique-plantes-fruits",
      "trivia-curiosites-monde", "records-chiffres-insolites", "records-stats",
      "funfacts-culture-g", "questions-pieges", "tissus-divers", "idees-recues-misconceptions",
      "quiz-confirme-culture-generale",
      "vie-quotidienne-admin", "stats-france",
      "gastronomie", "gastronomie-pdf", "gastronomie-techniques", "vins-cepages",
      "navigation-maritime", "voile-regates",
      "mythologie", "mythologie-monde",
      "12-coups-midi",
    ],
  },
];

// Build a quick lookup: packId → categoryId
const PACK_TO_CATEGORY = {};
CATEGORIES.forEach((cat) => {
  cat.packIds.forEach((pid) => {
    if (!PACK_TO_CATEGORY[pid]) PACK_TO_CATEGORY[pid] = cat.id;
  });
});

function getCategoryForPack(packId) {
  return PACK_TO_CATEGORY[packId] || "curiosites";
}
