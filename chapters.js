// Chapters mapping — regroupe les packs par thèmes pour le parcours Duolingo-style
// Un pack peut appartenir à 1 chapitre. Si un pack n'est pas mappé, il va dans "Autres".

const CHAPTERS = [
  {
    id: "france",
    name: "France",
    icon: "🏛️",
    description: "Géographie, histoire, institutions et culture française",
    packIds: [
      "chefs-lieux", "regions-france", "fleuves-france", "geo-pdf", "geo-bases", "geo-avancee",
      "monuments-france", "presidents-francais", "institutions-france",
      "histoire-france-bases", "histoire-dates", "histoire-dates-cles", "histoire-divers-pdf",
      "gastronomie", "gastronomie-pdf", "gastronomie-techniques", "vins-cepages",
      "vie-quotidienne-admin", "gentiles-geographie", "geo-insolite",
      "pop-culture-fr", "pop-culture-bases", "stats-france", "actu-societe",
      "politique-france-recente", "etudes-societales-recentes",
    ],
  },
  {
    id: "monde",
    name: "Monde",
    icon: "🌍",
    description: "Pays, capitales, géopolitique et histoire mondiale",
    packIds: [
      "capitales-monde", "fleuves-monde", "monuments-monde", "monnaies-monde",
      "presidents-usa", "geopolitique-monde", "institutions-internationales",
      "histoire-ancienne-mytho",
    ],
  },
  {
    id: "sciences",
    name: "Sciences & Nature",
    icon: "🧬",
    description: "Corps humain, médecine, maths, animaux, inventions",
    packIds: [
      "termes-medicaux", "suffixes-medicaux", "sciences-medecine-quiz", "sciences-medecine-pdf",
      "sciences-etonnantes", "corps-humain", "corps-humain-insolite", "os-anatomie",
      "mathematiques-celebres", "maths-sciences-bases",
      "inventions", "inventions-objets-quotidien", "inventeurs-celebres",
      "botanique", "geologie-geo",
      "animaux-insolites", "animaux-insolites-2", "animaux-noms-alternatifs", "familles-animaux",
    ],
  },
  {
    id: "musique",
    name: "Musique",
    icon: "🎵",
    description: "Tubes, albums, artistes, classique et compositeurs",
    packIds: [
      "musique-tubes-artistes", "musique-albums-cles", "musique-vrais-prenoms",
      "musique-paroles-celebres", "musique-culture-liens",
      "beatles", "rolling-stones", "instruments-musique",
      "musique-pop", "musique-bases", "musique-classique", "musique-classique-variete",
      "musique-groupes", "compositeurs", "compositeurs-essentiels",
      "chansons-francaises",
    ],
  },
  {
    id: "cinema",
    name: "Cinéma & TV",
    icon: "🎬",
    description: "Réalisateurs, films cultes, séries, prix",
    packIds: [
      "cinema-realisateurs-cultes", "cinema-series", "cinema-tv-pdf",
      "films-cultes", "prix-cinema", "personnages-principaux",
      "cinema-francais",
    ],
  },
  {
    id: "sport",
    name: "Sport",
    icon: "🏆",
    description: "JO, Coupes du monde, tennis, F1, NBA",
    packIds: [
      "sports-records-jo", "sport-bases", "sport-pdf",
      "football-culture", "tour-de-france", "marathon-course",
    ],
  },
  {
    id: "arts-litt",
    name: "Arts & Littérature",
    icon: "🎭",
    description: "Peintres, écrivains, théâtre, tableaux célèbres",
    packIds: [
      "peintres", "tableaux-celebres", "arts-architecture", "arts-bases",
      "litterature", "litterature-auteurs", "litterature-bases", "romans-auteurs",
      "theatre",
    ],
  },
  {
    id: "langue",
    name: "Langue française",
    icon: "📖",
    description: "Vocabulaire, expressions, étymologie, figures de style",
    packIds: [
      "figures-style", "expressions-origines", "expressions-bases",
      "etymologie", "langue-francaise",
      "comment-appelle-t-on", "vocabulaire-12-coups", "vocabulaire-rare", "vrais-noms",
      "termes-techniques", "prefixes-grecs", "racines-grecques", "racines-latines",
      "suffixes-utiles", "abreviations", "homonymes",
      "appellations-insolites", "metiers-appellations", "noms-peu-connus",
    ],
  },
  {
    id: "philo-mytho",
    name: "Philo & Mythologie",
    icon: "🧠",
    description: "Penseurs, dieux et grands concepts",
    packIds: ["philosophie", "mythologie", "mythologie-monde"],
  },
  {
    id: "maritime",
    name: "Maritime & Voile",
    icon: "⚓",
    description: "Navigation, vocabulaire maritime, régates",
    packIds: ["navigation-maritime", "voile-regates"],
  },
  {
    id: "trivia",
    name: "Trivia & Records",
    icon: "🌐",
    description: "Questions pièges, records mondiaux, fun facts",
    packIds: [
      "trivia-curiosites-monde", "records-chiffres-insolites", "records-stats",
      "funfacts-culture-g", "questions-pieges", "tissus-divers",
      "idees-recues-misconceptions",
    ],
  },
  {
    id: "douze-coups",
    name: "12 Coups de Midi",
    icon: "📺",
    description: "Questions et fun facts du jeu de Jean-Luc Reichmann",
    packIds: ["12-coups-midi"],
  },
];

// Build a quick lookup: packId → chapterId
const PACK_TO_CHAPTER = {};
CHAPTERS.forEach((ch) => {
  ch.packIds.forEach((pid) => {
    PACK_TO_CHAPTER[pid] = ch.id;
  });
});

// Get chapter for a pack (fallback "Autres")
function getChapterForPack(packId) {
  return PACK_TO_CHAPTER[packId] || "autres";
}
