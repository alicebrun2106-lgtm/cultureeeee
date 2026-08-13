// Mini-leçons rotatives par date — une chaque jour
// Format : { title, hook, body, factoids: [3 punchlines à retenir] }
// La rotation se fait par jour de l'année % nombre de leçons

const DAILY_LESSONS = [
  {
    slug: "trous-noirs",
    packId: "daily-black-holes",
    title: "Aujourd'hui, tu comprends les trous noirs",
    hook: "🕳️ Pas un trou. Pas vraiment noir. Mais terrifiant quand même.",
    body: "Un trou noir, c'est un objet si dense que même la lumière n'arrive plus à s'échapper. Imagine compresser le Soleil dans une bille de 6 km : ça donnerait un trou noir. Ce qu'on appelle l'« horizon des événements » est la frontière au-delà de laquelle tout retour est impossible. La 1re photo d'un trou noir date de 2019 (M87*).",
    visual: {
      tag: "[fig.1.1] — TROU NOIR",
      caption: "Trou noir supermassif · l'horizon piège même la lumière.",
    },
    factoids: [
      "Sagittarius A* est le trou noir au centre de notre galaxie (4 millions de fois la masse du Soleil)",
      "Einstein les a prédits dès 1915 avec sa relativité générale",
      "Stephen Hawking a montré qu'ils s'évaporent (très lentement) — c'est le rayonnement de Hawking",
    ],
    resources: {
      articles: [
        { label: "NASA — What Are Black Holes?", url: "https://www.nasa.gov/universe/what-are-black-holes/" },
        { label: "Event Horizon Telescope — 1re image de M87*", url: "https://eventhorizontelescope.org/press-release-april-10-2019-astronomers-capture-first-image-black-hole" },
        { label: "NASA Science — First Image of a Black Hole", url: "https://science.nasa.gov/resource/first-image-of-a-black-hole/" },
      ],
      videos: [
        { label: "NASA Goddard — Basic Black Holes", url: "https://science.nasa.gov/resource/black-hole-field-guide-episode-1-basic-black-holes/" },
        { label: "YouTube NASA — What is a Black Hole?", url: "https://www.youtube.com/watch?v=EJXTZ5jpSmk" },
        { label: "PBS Space Time — Black Holes Explained", url: "https://www.pbs.org/video/black-holes-explained-for-15-hours-wmxukj/" },
      ],
      books: [
        { label: "Kip Thorne — Black Holes & Time Warps", url: "https://wwnorton.co.uk/books/9780393312768-black-holes-time-warps" },
        { label: "Stephen Hawking — A Brief History of Time", url: "https://www.penguinrandomhouse.com/books/77010/a-brief-history-of-time-by-stephen-hawking/" },
        { label: "Janna Levin — Black Hole Blues", url: "https://www.penguinrandomhouseretail.com/book/?isbn=9780307948489" },
        { label: "Brian Cox & Jeff Forshaw — Black Holes", url: "https://www.harperacademic.com/book/9780062936714/black-holes" },
      ],
    },
  },
  {
    title: "Aujourd'hui, tu comprends l'impressionnisme",
    hook: "🎨 Ils peignaient si vite que les critiques ont cru à des brouillons.",
    body: "L'impressionnisme naît à Paris en 1874. Monet, Renoir, Pissarro, Sisley peignent en plein air, vite, pour capter la lumière qui change. Le mot « impressionniste » vient d'une moquerie sur le tableau Impression, soleil levant de Monet. Ils refusent les contours nets et préfèrent les touches courtes.",
    factoids: [
      "Le Salon des Refusés (1863) a précédé le mouvement",
      "Monet a peint 250 fois ses Nymphéas",
      "Cézanne, considéré post-impressionniste, ouvrira la voie au cubisme",
    ],
  },
  {
    title: "Aujourd'hui, tu comprends la Révolution française",
    hook: "🇫🇷 En 10 ans, la France passe de la monarchie absolue à l'Empire.",
    body: "Tout commence en 1789 avec les États généraux et la prise de la Bastille (14 juillet). La Déclaration des droits de l'homme est votée le 26 août. Louis XVI est guillotiné en 1793, suivi par la Terreur (Robespierre). Le coup d'État du 18 brumaire (1799) amène Bonaparte au pouvoir.",
    factoids: [
      "La Bastille ne contenait que 7 prisonniers le jour de la prise",
      "Le calendrier républicain a duré 12 ans (1793-1805)",
      "Marie-Antoinette a été guillotinée 9 mois après son mari",
    ],
  },
  {
    title: "Aujourd'hui, tu comprends l'ADN",
    hook: "🧬 Une molécule en double hélice contient toute l'information du vivant.",
    body: "L'ADN (acide désoxyribonucléique) est une molécule en forme de double hélice, découverte en 1953 par Watson et Crick (avec les images cruciales de Rosalind Franklin). 4 lettres seulement : A, T, G, C, qui s'apparient deux à deux. Le génome humain compte 3 milliards de paires de bases.",
    factoids: [
      "Si on déroulait l'ADN d'une seule cellule, il ferait 2 mètres de long",
      "On partage 50% de notre ADN avec une banane (gènes basiques de la vie)",
      "Le projet du génome humain a été achevé en 2003",
    ],
  },
  {
    title: "Aujourd'hui, tu comprends le Big Bang",
    hook: "💥 L'univers a 13,8 milliards d'années — et il grandit toujours.",
    body: "Le Big Bang n'est PAS une explosion : c'est une expansion. Tout l'univers tenait dans un point infiniment dense, puis a commencé à s'étendre il y a 13,8 milliards d'années. C'est l'astrophysicien Georges Lemaître (un prêtre belge) qui a proposé l'idée en 1927, confirmée par Hubble.",
    factoids: [
      "Le rayonnement fossile à 2,7 K est le « bruit » du Big Bang",
      "Edwin Hubble a montré en 1929 que les galaxies s'éloignent",
      "L'expansion s'accélère à cause de l'énergie noire (Nobel 2011)",
    ],
  },
  {
    title: "Aujourd'hui, tu comprends Picasso",
    hook: "🐂 Il a inventé le cubisme et a peint pendant 80 ans sans s'arrêter.",
    body: "Pablo Picasso (1881-1973) est espagnol mais a passé sa vie en France. Il a traversé plusieurs périodes : bleue, rose, africaine, cubiste (avec Braque, vers 1907), classique, surréaliste. Son chef-d'œuvre : Guernica (1937), peint après le bombardement de la ville basque.",
    factoids: [
      "Il aurait produit ~50 000 œuvres dans sa vie",
      "Son nom complet fait 23 mots (tradition espagnole)",
      "Les Demoiselles d'Avignon (1907) marque la naissance du cubisme",
    ],
  },
  {
    title: "Aujourd'hui, tu comprends la Ve République",
    hook: "🏛️ Née en 1958 d'une crise. Toujours en vigueur aujourd'hui.",
    body: "La Ve République est créée en 1958 par De Gaulle en pleine crise algérienne. Spécificité : un président très puissant, élu directement depuis 1962. Le quinquennat remplace le septennat en 2000. Aujourd'hui, Emmanuel Macron est le 8e président de la Ve.",
    factoids: [
      "L'article 49.3 permet de faire passer un texte sans vote",
      "L'article 16 donne les pleins pouvoirs au président en cas de crise",
      "Charles de Gaulle a été le 1er président, élu en 1958",
    ],
  },
  {
    title: "Aujourd'hui, tu comprends les océans",
    hook: "🌊 71% de la Terre est sous l'eau. Et on connaît mieux Mars.",
    body: "5 océans : Pacifique (le plus vaste), Atlantique, Indien, Arctique, Austral. Le point le plus profond est la fosse des Mariannes (~11 000 m). Les océans absorbent 30% du CO₂ humain et produisent 50% de l'oxygène (via le phytoplancton).",
    factoids: [
      "Seulement 5% des océans sont cartographiés en haute résolution",
      "Le Pacifique fait 165 millions de km², plus grand que tous les continents réunis",
      "Le Gulf Stream réchauffe l'Europe — sans lui, Paris aurait le climat de Montréal",
    ],
  },
  {
    title: "Aujourd'hui, tu comprends Shakespeare",
    hook: "📜 Il a inventé 1700 mots en anglais. Personne ne sait à quoi il ressemblait.",
    body: "William Shakespeare (1564-1616) est l'auteur de 39 pièces et 154 sonnets. Hamlet, Roméo et Juliette, Macbeth, Le Roi Lear : tous écrits en moins de 25 ans. Il a inventé des mots toujours utilisés (lonely, eyeball, bedroom). On ne possède aucun portrait certifié de lui.",
    factoids: [
      "Hamlet a 4 042 lignes, c'est son plus long texte",
      "Il est mort le même jour que Cervantès (23 avril 1616)",
      "Le Globe Theatre, son théâtre, a brûlé en 1613 puis a été reconstruit",
    ],
  },
  {
    title: "Aujourd'hui, tu comprends Mozart",
    hook: "🎼 Il composait à 5 ans. Mort à 35. 626 œuvres derrière lui.",
    body: "Wolfgang Amadeus Mozart (1756-1791) est né à Salzbourg. Enfant prodige, il joue devant les cours d'Europe à 6 ans. Il maîtrise opéra, symphonie, concerto. Ses chefs-d'œuvre : Les Noces de Figaro, Don Giovanni, La Flûte enchantée, le Requiem (inachevé à sa mort).",
    factoids: [
      "Il aurait composé sa 1re œuvre à 5 ans (Menuet K1)",
      "Le Requiem a été commandé par un mystérieux comte (Walsegg)",
      "On ne sait pas où il est enterré exactement — fosse commune à Vienne",
    ],
  },
  {
    title: "Aujourd'hui, tu comprends les volcans",
    hook: "🌋 1500 volcans actifs sur Terre. Et on en découvre toujours.",
    body: "Un volcan, c'est un point où le magma de la Terre remonte à la surface. Trois types principaux : effusif (laves coulantes, type Hawaii), explosif (type Vésuve, Pinatubo), et fissural (Islande). L'échelle d'explosivité va de 0 à 8 (l'éruption du Toba il y a 74 000 ans = 8).",
    factoids: [
      "Le Stromboli est en éruption permanente depuis 2 000 ans",
      "L'éruption du Krakatoa (1883) a été entendue à 4 800 km",
      "Le Yellowstone est un super-volcan : sa caldeira fait 70 km de long",
    ],
  },
  {
    title: "Aujourd'hui, tu comprends Napoléon",
    hook: "🗡️ De Corse à empereur. De empereur à Sainte-Hélène. En 20 ans.",
    body: "Napoléon Bonaparte (1769-1821) est né en Corse. Général brillant, il prend le pouvoir par le coup du 18 brumaire (1799), se sacre empereur en 1804. Il refait l'Europe avec ses victoires (Austerlitz, Iéna), puis chute après la Russie (1812) et Waterloo (1815). Exil à Sainte-Hélène jusqu'à sa mort.",
    factoids: [
      "Il faisait 1m68, taille moyenne pour l'époque (le « petit caporal » est un mythe)",
      "Le Code civil de 1804 régit toujours le droit français",
      "Il a vécu seulement 100 jours après son retour de l'île d'Elbe",
    ],
  },
  {
    title: "Aujourd'hui, tu comprends l'évolution",
    hook: "🐒 Toi, le chimpanzé et la banane partagez un ancêtre commun.",
    body: "Charles Darwin publie L'Origine des espèces en 1859. L'idée : les espèces évoluent par sélection naturelle (les mieux adaptés survivent et se reproduisent plus). Pas de but, pas de plan : juste du temps et des mutations aléatoires. La preuve la plus claire : l'ADN partagé entre toutes les espèces.",
    factoids: [
      "L'humain et le chimpanzé partagent ~98,8% de leur ADN",
      "Le mot « évolution » n'apparaît qu'à la fin de la 1re édition de Darwin",
      "La théorie a été co-formulée par Alfred Russel Wallace (oublié injustement)",
    ],
  },
  {
    title: "Aujourd'hui, tu comprends la Guerre froide",
    hook: "❄️ 45 ans de tension nucléaire entre USA et URSS, sans guerre directe.",
    body: "Après 1945, deux blocs s'affrontent sans se taper dessus directement : USA (capitaliste) vs URSS (communiste). Berlin coupé en deux par un mur (1961-1989). Course à l'espace, course aux armes nucléaires, guerres « chaudes » par procuration (Corée, Vietnam, Afghanistan). Fin officielle : chute de l'URSS en 1991.",
    factoids: [
      "Crise des missiles de Cuba (1962) : 13 jours au bord de la guerre nucléaire",
      "Le Téléphone rouge entre Maison Blanche et Kremlin existe depuis 1963",
      "Le mur de Berlin est tombé le 9 novembre 1989 — par accident administratif !",
    ],
  },
  {
    title: "Aujourd'hui, tu comprends le cerveau humain",
    hook: "🧠 86 milliards de neurones. 20 watts. Plus efficace qu'un supercalculateur.",
    body: "Le cerveau humain pèse ~1,3 kg (2% du corps) mais consomme 20% de l'énergie. Il est divisé en 4 lobes : frontal (décision), pariétal (sensations), temporal (mémoire), occipital (vision). Le cervelet gère l'équilibre. Les neurones communiquent via des synapses (~100 trillions au total).",
    factoids: [
      "On utilise bien 100% de notre cerveau (le mythe des 10% est faux)",
      "Le cerveau finit de se développer vers 25 ans",
      "Les neurones du cervelet représentent 50% du total mais 10% du volume",
    ],
  },
];

const DAILY_LESSON_PACKS = {
  "daily-black-holes": {
    id: "daily-black-holes",
    name: "Leçon du jour : trous noirs",
    icon: "🕳️",
    description: "Horizon, singularité, M87*, Sagittarius A* et bases des trous noirs",
    difficulty: "intermediaire",
    cards: [
      { front: "Qu'est-ce qu'un trou noir ?", back: "Un objet si dense que rien ne peut s'en échapper, pas même la lumière.", memo: "La frontière de non-retour s'appelle l'horizon des événements." },
      { front: "Comment s'appelle la frontière de non-retour d'un trou noir ?", back: "L'horizon des événements.", memo: "Au-delà, la vitesse nécessaire pour s'échapper dépasse celle de la lumière." },
      { front: "Quel trou noir a été photographié pour la première fois en 2019 ?", back: "M87*.", memo: "L'image a été produite par l'Event Horizon Telescope." },
      { front: "Quel trou noir se trouve au centre de la Voie lactée ?", back: "Sagittarius A*.", memo: "Il pèse environ 4 millions de masses solaires." },
      { front: "Comment naît souvent un trou noir stellaire ?", back: "Par l'effondrement du coeur d'une étoile massive après une supernova.", memo: "Tous les trous noirs ne sont pas supermassifs." },
      { front: "Qu'est-ce qu'un disque d'accrétion ?", back: "Un disque de matière chauffée qui tourne autour d'un objet compact.", memo: "Cette matière peut briller fortement avant de tomber." },
      { front: "Que désigne la singularité dans le modèle classique d'un trou noir ?", back: "Une région centrale où la courbure de l'espace-temps devient extrême.", memo: "C'est un signal que nos théories atteignent une limite." },
      { front: "Quel effet ralentit le temps près d'un trou noir vu de loin ?", back: "La dilatation gravitationnelle du temps.", memo: "Plus la gravité est forte, plus le temps paraît ralenti pour un observateur distant." },
      { front: "Qu'est-ce que la spaghettification ?", back: "L'étirement par les forces de marée près d'un objet très compact.", memo: "Les pieds et la tête ne subissent pas exactement la même gravité." },
      { front: "Quel physicien est associé au rayonnement théorique des trous noirs ?", back: "Stephen Hawking.", memo: "Le rayonnement de Hawking implique une évaporation extrêmement lente." },
      { front: "Pourquoi l'Event Horizon Telescope est-il si puissant ?", back: "Il combine des radiotélescopes du monde entier comme un télescope de taille terrestre.", memo: "La technique s'appelle l'interférométrie à très longue base, ou VLBI." },
      { front: "Que peuvent révéler les ondes gravitationnelles sur les trous noirs ?", back: "Des fusions de trous noirs.", memo: "LIGO a détecté directement ce type de signal en 2015." },
    ],
  },
};

const DAILY_LESSON_START_OFFSET = 5; // 2026-06-09 démarre sur l'exemple "trous noirs".

function slugifyDailyLesson(value) {
  return String(value || "lesson")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "lesson";
}

function getLessonPackId(lesson) {
  return lesson && (lesson.packId || ("daily-" + slugifyDailyLesson(lesson.slug || lesson.title)));
}

function makeAutoLessonPack(lesson) {
  const id = getLessonPackId(lesson);
  const subject = String(lesson.title || "Sujet du jour")
    .replace(/^Aujourd'hui,\s*tu comprends\s*/i, "")
    .trim();
  const firstSentence = String(lesson.body || "").split(".")[0].trim();
  const cards = [
    { front: "Quel est le sujet de la leçon du jour ?", back: subject, memo: "Le paquet est généré depuis la mini-leçon quotidienne." },
    { front: "Quelle est l'idée principale à retenir ?", back: firstSentence || lesson.hook || subject, memo: lesson.body || "" },
    { front: "Quel détail rend ce sujet mémorable ?", back: lesson.hook || subject, memo: "Le hook donne l'angle simple pour s'en souvenir." },
  ];
  (lesson.factoids || []).forEach((fact, i) => {
    cards.push({
      front: "À retenir #" + (i + 1) + " sur " + subject,
      back: fact,
      memo: "Carte générée depuis les faits clés de la leçon.",
    });
  });
  return {
    id,
    name: "Leçon du jour : " + subject,
    icon: "📌",
    description: "Paquet généré depuis la mini-leçon quotidienne",
    difficulty: "intermediaire",
    cards: cards.slice(0, 8),
  };
}

function getAllDailyLessonPacks() {
  return DAILY_LESSONS.map((lesson) => {
    const id = getLessonPackId(lesson);
    return DAILY_LESSON_PACKS[id] || makeAutoLessonPack(lesson);
  });
}

function getStoredAddedDailyPackIds() {
  try {
    const added = JSON.parse(localStorage.getItem("qpuc-added-packs") || "[]");
    if (!Array.isArray(added)) return [];
    const dailyIds = new Set(getAllDailyLessonPacks().map((pack) => pack.id));
    return added.filter((id) => dailyIds.has(id));
  } catch {
    return [];
  }
}

function registerDailyPackById(id) {
  if (typeof FLASHCARD_PACKS === "undefined" || !id) return;
  if (FLASHCARD_PACKS.find((p) => p.id === id)) return;
  const pack = getAllDailyLessonPacks().find((p) => p.id === id);
  if (pack) FLASHCARD_PACKS.push(pack);
}

function registerDailyLessonPacks() {
  if (typeof FLASHCARD_PACKS === "undefined") return;
  const lesson = getTodayLesson();
  const id = getLessonPackId(lesson);
  getStoredAddedDailyPackIds().forEach(registerDailyPackById);
  if (!id || FLASHCARD_PACKS.find((p) => p.id === id)) return;
  registerDailyPackById(id);
}

// Get the lesson for today (rotates daily)
function getTodayLesson() {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d - start) / 86400000);
  return DAILY_LESSONS[(dayOfYear + DAILY_LESSON_START_OFFSET) % DAILY_LESSONS.length];
}

function getTodayLessonPack() {
  const lesson = getTodayLesson();
  if (!lesson || typeof FLASHCARD_PACKS === "undefined") return null;
  const id = getLessonPackId(lesson);
  return FLASHCARD_PACKS.find((p) => p.id === id) || DAILY_LESSON_PACKS[id] || makeAutoLessonPack(lesson);
}

function escapeDailyHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function renderDailyResourceGroup(title, items) {
  if (!items || !items.length) return "";
  return `
    <div class="daily-resource-group">
      <div class="daily-resource-title">${escapeDailyHtml(title)}</div>
      ${items.map((item) => `
        <a class="daily-resource-link" href="${escapeDailyHtml(item.url)}" target="_blank" rel="noopener noreferrer">
          ${escapeDailyHtml(item.label)}
        </a>
      `).join("")}
    </div>
  `;
}

let dailyLearningOpen = false;

function getDailyLessonSubject(lesson) {
  return String((lesson && lesson.title) || "Sujet du jour")
    .replace(/^Aujourd'hui,\s*tu comprends\s*/i, "")
    .trim();
}

const DAILY_VISUAL_META = {
  blackHoles: {
    words: ["trous noirs", "trou noir"],
    tag: "[fig.1.1] — TROU NOIR",
    caption: "Trou noir supermassif · l'horizon piège même la lumière.",
    image: "assets/daily/black-hole.jpg",
    alt: "Première image d'un trou noir, au centre de la galaxie Messier 87",
    credit: "Event Horizon Telescope Collaboration · CC BY 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Black_hole_-_Messier_87.jpg",
    position: "center center",
  },
  impressionism: {
    words: ["impressionnisme"],
    tag: "[fig.1.1] — IMPRESSION",
    caption: "Monet, lumière changeante et touches rapides.",
    image: "assets/daily/impressionism.jpg",
    alt: "Impression, soleil levant, tableau de Claude Monet",
    credit: "Claude Monet · domaine public",
    source: "https://commons.wikimedia.org/wiki/File:Monet_-_Impression,_Sunrise.jpg",
    position: "center center",
  },
  revolution: {
    words: ["revolution francaise", "révolution française"],
    tag: "[fig.1.1] — 1789",
    caption: "La Bastille, les droits et la chute de l'Ancien Régime.",
    image: "assets/daily/french-revolution.jpg",
    alt: "La prise de la Bastille le 14 juillet 1789, peinture de Charles Thévenin",
    credit: "Charles Thévenin · The Met · CC0",
    source: "https://commons.wikimedia.org/wiki/File:The_Storming_of_the_Bastille_on_14_July_1789_(Prise_de_la_Bastille_le_14_juillet_1789)_MET_DP820481.jpg",
    position: "center center",
  },
  dna: {
    words: ["adn"],
    tag: "[fig.1.1] — DOUBLE HÉLICE",
    caption: "Quatre lettres pour coder l'information du vivant.",
    image: "assets/daily/dna-model.jpg",
    alt: "Pièce originale du modèle moléculaire d'ADN de Crick et Watson, 1953",
    credit: "Science Museum, Londres · CC BY-SA 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Template_from_Crick_and_Watson%E2%80%99s_DNA_molecular_model,_1953._(9660573227).jpg",
    position: "center center",
  },
  bigBang: {
    words: ["big bang"],
    tag: "[fig.1.1] — EXPANSION",
    caption: "L'univers grandit depuis 13,8 milliards d'années.",
    image: "assets/daily/deep-field.jpg",
    alt: "Champ ultra-profond de Hubble montrant des milliers de galaxies",
    credit: "NASA et ESA · domaine public",
    source: "https://commons.wikimedia.org/wiki/File:Hubble_ultra_deep_field.jpg",
    position: "center center",
  },
  picasso: {
    words: ["picasso"],
    tag: "[fig.1.1] — CUBISME",
    caption: "Pablo Picasso photographié en 1908, au début du cubisme.",
    image: "assets/daily/picasso.jpg",
    alt: "Portrait photographique de Pablo Picasso en 1908",
    credit: "Auteur inconnu, 1908 · domaine public",
    source: "https://commons.wikimedia.org/wiki/File:Portrait_de_Picasso,_1908.jpg",
    position: "center 24%",
  },
  republic: {
    words: ["ve republique", "ve république"],
    tag: "[fig.1.1] — VE RÉPUBLIQUE",
    caption: "Un président fort, une Constitution née en 1958.",
    image: "assets/daily/de-gaulle.jpg",
    alt: "Portrait photographique du général Charles de Gaulle",
    credit: "U.S. Office of War Information · domaine public",
    source: "https://commons.wikimedia.org/wiki/File:De_Gaulle-OWI_(cropped)-(c).jpg",
    position: "center 24%",
  },
  oceans: {
    words: ["oceans", "océans"],
    tag: "[fig.1.1] — ABYSSES",
    caption: "Les océans couvrent 71% de la planète.",
    image: "assets/daily/oceans.jpg",
    alt: "La Terre et ses océans photographiés par l'équipage d'Apollo 17",
    credit: "NASA / équipage d'Apollo 17 · domaine public",
    source: "https://commons.wikimedia.org/wiki/File:The_Earth_seen_from_Apollo_17.jpg",
    position: "center center",
  },
  shakespeare: {
    words: ["shakespeare"],
    tag: "[fig.1.1] — GLOBE",
    caption: "Théâtre, sonnets et mots inventés.",
    image: "assets/daily/shakespeare.jpg",
    alt: "Portrait Chandos de William Shakespeare",
    credit: "Attribué à John Taylor · domaine public",
    source: "https://commons.wikimedia.org/wiki/File:Shakespeare.jpg",
    position: "center 20%",
  },
  mozart: {
    words: ["mozart"],
    tag: "[fig.1.1] — K.626",
    caption: "Prodige, opéras et Requiem inachevé.",
    image: "assets/daily/mozart.jpg",
    alt: "Portrait de Wolfgang Amadeus Mozart peint par Barbara Krafft",
    credit: "Barbara Krafft, 1819 · domaine public",
    source: "https://commons.wikimedia.org/wiki/File:Barbara_Krafft_-_Portr%C3%A4t_Wolfgang_Amadeus_Mozart_(1819).jpg",
    position: "center 18%",
  },
  volcanoes: {
    words: ["volcans", "volcan"],
    tag: "[fig.1.1] — MAGMA",
    caption: "La Terre respire par ses volcans.",
    image: "assets/daily/volcano.jpg",
    alt: "Panache de l'éruption du mont Saint Helens le 18 mai 1980",
    credit: "Donald A. Swanson / USGS · domaine public",
    source: "https://commons.wikimedia.org/wiki/File:MSH80_eruption_mount_st_helens_plume_05-18-80-edit.jpg",
    position: "center center",
  },
  napoleon: {
    words: ["napoleon", "napoléon"],
    tag: "[fig.1.1] — EMPIRE",
    caption: "Du 18 brumaire à Waterloo.",
    image: "assets/daily/napoleon.jpg",
    alt: "Napoléon dans son cabinet de travail, peinture de Jacques-Louis David",
    credit: "Jacques-Louis David · domaine public",
    source: "https://commons.wikimedia.org/wiki/File:Jacques-Louis_David_-_The_Emperor_Napoleon_in_His_Study_at_the_Tuileries_-_Google_Art_Project.jpg",
    position: "center 22%",
  },
  evolution: {
    words: ["evolution", "évolution"],
    tag: "[fig.1.1] — SÉLECTION",
    caption: "Des mutations, du temps, et la sélection naturelle.",
    image: "assets/daily/darwin.jpg",
    alt: "Portrait photographique de Charles Darwin vers 1875",
    credit: "Elliott & Fry · domaine public",
    source: "https://commons.wikimedia.org/wiki/File:Charles_Darwin_photograph_by_Elliott_and_Fry,_circa_1875.jpg",
    position: "center 18%",
  },
  coldWar: {
    words: ["guerre froide"],
    tag: "[fig.1.1] — BLOC EST/OUEST",
    caption: "Deux blocs, Berlin, l'espace et la dissuasion nucléaire.",
    image: "assets/daily/berlin-wall.jpg",
    alt: "Le mur de Berlin photographié en novembre 1961",
    credit: "U.S. National Archives · domaine public",
    source: "https://commons.wikimedia.org/wiki/File:Berlin_Wall_1961-11-20.jpg",
    position: "center center",
  },
  brain: {
    words: ["cerveau"],
    tag: "[fig.1.1] — SYNAPSES",
    caption: "86 milliards de neurones pour penser et apprendre.",
    image: "assets/daily/brain-mri.jpg",
    alt: "Coupe sagittale d'un cerveau humain observée par IRM",
    credit: "everyone's idle · CC BY-SA 2.0",
    source: "https://commons.wikimedia.org/wiki/File:MRI_brain_sagittal_section.jpg",
    position: "center center",
  },
};

function normalizeDailyVisualText(value) {
  return String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getDailyVisualKey(lesson) {
  if (lesson && lesson.visual && lesson.visual.key) return lesson.visual.key;
  const text = normalizeDailyVisualText([
    lesson && lesson.slug,
    getDailyLessonSubject(lesson),
    lesson && lesson.title,
  ].join(" "));
  for (const [key, meta] of Object.entries(DAILY_VISUAL_META)) {
    if ((meta.words || []).some((word) => text.includes(normalizeDailyVisualText(word)))) return key;
  }
  return "generic";
}

function baseDailySvg(content, background) {
  return `
    <svg viewBox="0 0 600 460" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges" aria-hidden="true">
      <rect width="600" height="460" fill="${background || "#0a0a0a"}"/>
      ${content}
    </svg>
  `;
}

function renderDailyVisualSvg(key) {
  if (key === "impressionism") {
    return baseDailySvg(`
      <rect x="48" y="54" width="504" height="328" fill="#fff8e8" stroke="#0a0a0a" stroke-width="6"/>
      <rect x="74" y="82" width="452" height="118" fill="#ffd7e8"/>
      <rect x="74" y="200" width="452" height="150" fill="#a9e4ff"/>
      <circle cx="420" cy="132" r="34" fill="#ffd84a"/>
      <g fill="#0a0a0a">
        <rect x="102" y="238" width="82" height="8"/><rect x="214" y="260" width="110" height="8"/><rect x="348" y="236" width="132" height="8"/>
        <rect x="120" y="288" width="130" height="7"/><rect x="290" y="306" width="160" height="7"/><rect x="92" y="326" width="86" height="7"/>
      </g>
      <g fill="#ff8fb0">
        <rect x="96" y="112" width="70" height="8"/><rect x="190" y="134" width="88" height="8"/><rect x="292" y="104" width="64" height="8"/>
        <rect x="122" y="212" width="112" height="7"/><rect x="268" y="226" width="132" height="7"/><rect x="420" y="218" width="70" height="7"/>
      </g>
      <g fill="#c8e85b">
        <rect x="96" y="260" width="78" height="6"/><rect x="196" y="284" width="118" height="6"/><rect x="344" y="274" width="134" height="6"/>
      </g>
      <g fill="#0a0a0a" font-family="Space Mono, monospace" font-size="14">
        <text x="74" y="406">TOUCHES RAPIDES → lumière qui change</text>
      </g>
    `, "#fff8e8");
  }

  if (key === "blackHoles") {
    return baseDailySvg(`
      <g fill="#fff">
        <rect x="40" y="40" width="3" height="3"/><rect x="120" y="22" width="2" height="2"/><rect x="220" y="58" width="2" height="2"/><rect x="360" y="44" width="3" height="3"/><rect x="480" y="78" width="2" height="2"/><rect x="550" y="36" width="3" height="3"/><rect x="80" y="160" width="2" height="2"/><rect x="500" y="180" width="3" height="3"/><rect x="60" y="290" width="2" height="2"/><rect x="160" y="350" width="3" height="3"/><rect x="260" y="410" width="2" height="2"/><rect x="420" y="370" width="2" height="2"/><rect x="520" y="320" width="3" height="3"/><rect x="580" y="240" width="2" height="2"/><rect x="320" y="40" width="2" height="2"/><rect x="20" y="220" width="2" height="2"/><rect x="540" y="420" width="2" height="2"/>
      </g>
      <g transform="translate(300 240)">
        <ellipse rx="220" ry="58" fill="none" stroke="#ffd84a" stroke-width="6"/>
        <ellipse rx="200" ry="42" fill="none" stroke="#ff8fb0" stroke-width="4"/>
        <ellipse rx="180" ry="30" fill="none" stroke="#c8e85b" stroke-width="2"/>
        <ellipse rx="110" ry="110" fill="#0a0a0a" stroke="#fff" stroke-width="2"/>
      </g>
      <g shape-rendering="crispEdges">
        <rect x="430" y="120" width="120" height="4" fill="#ffd84a"/>
        <rect x="430" y="120" width="4" height="60" fill="#ffd84a"/>
        <rect x="426" y="180" width="12" height="4" fill="#ffd84a"/>
      </g>
      <g font-family="Space Mono, monospace" fill="#fff" font-size="12">
        <text x="438" y="112">SINGULARITÉ →</text>
      </g>
    `, "#0a0a0a");
  }

  if (key === "revolution") {
    return baseDailySvg(`
      <rect x="74" y="84" width="452" height="280" fill="#fff8e8" stroke="#0a0a0a" stroke-width="6"/>
      <g fill="#0a0a0a"><rect x="118" y="152" width="62" height="162"/><rect x="220" y="124" width="62" height="190"/><rect x="322" y="152" width="62" height="162"/><rect x="424" y="124" width="62" height="190"/><rect x="104" y="314" width="396" height="18"/></g>
      <rect x="118" y="96" width="82" height="56" fill="#6fb7ff"/><rect x="200" y="96" width="82" height="56" fill="#fff"/><rect x="282" y="96" width="82" height="56" fill="#ff8fb0"/>
      <g fill="#ffd84a" font-family="Space Mono, monospace" font-size="18"><text x="388" y="98">14 JUILLET</text></g>
    `, "#101010");
  }

  if (key === "dna") {
    return baseDailySvg(`
      <g fill="none" stroke-width="6">
        <path d="M180 54 C420 120,180 210,420 286 C480 324,420 386,180 418" stroke="#ff8fb0"/>
        <path d="M420 54 C180 120,420 210,180 286 C120 324,180 386,420 418" stroke="#c8e85b"/>
      </g>
      <g stroke="#fff" stroke-width="4">
        <line x1="212" y1="86" x2="388" y2="86"/><line x1="164" y1="150" x2="436" y2="150"/><line x1="198" y1="220" x2="402" y2="220"/><line x1="170" y1="300" x2="430" y2="300"/><line x1="210" y1="374" x2="390" y2="374"/>
      </g>
      <g fill="#fff" font-family="Space Mono, monospace" font-size="20"><text x="84" y="402">A · T · G · C</text></g>
    `, "#111827");
  }

  if (key === "bigBang") {
    return baseDailySvg(`
      <circle cx="300" cy="230" r="18" fill="#fff"/>
      <circle cx="300" cy="230" r="64" fill="none" stroke="#ffd84a" stroke-width="6"/>
      <circle cx="300" cy="230" r="124" fill="none" stroke="#ff8fb0" stroke-width="5"/>
      <circle cx="300" cy="230" r="190" fill="none" stroke="#c8e85b" stroke-width="4"/>
      <g fill="#fff"><rect x="116" y="86" width="4" height="4"/><rect x="488" y="110" width="4" height="4"/><rect x="82" y="312" width="4" height="4"/><rect x="516" y="342" width="4" height="4"/></g>
      <g fill="#fff" font-family="Space Mono, monospace" font-size="18"><text x="84" y="420">EXPANSION, PAS EXPLOSION</text></g>
    `, "#0a0a0a");
  }

  if (key === "picasso") {
    return baseDailySvg(`
      <rect x="124" y="58" width="352" height="340" fill="#fff8e8" stroke="#0a0a0a" stroke-width="6"/>
      <polygon points="286,94 442,178 320,230" fill="#ffd84a" stroke="#0a0a0a" stroke-width="5"/>
      <polygon points="162,142 314,96 288,270 168,310" fill="#ff8fb0" stroke="#0a0a0a" stroke-width="5"/>
      <polygon points="298,232 454,202 410,354 240,372" fill="#c8e85b" stroke="#0a0a0a" stroke-width="5"/>
      <circle cx="254" cy="180" r="12" fill="#0a0a0a"/><circle cx="362" cy="210" r="12" fill="#0a0a0a"/>
      <rect x="286" y="250" width="84" height="7" fill="#0a0a0a"/>
    `, "#fff8e8");
  }

  if (key === "republic") {
    return baseDailySvg(`
      <g fill="#fff8e8" stroke="#0a0a0a" stroke-width="6"><rect x="96" y="164" width="408" height="178"/><polygon points="300,80 520,164 80,164"/></g>
      <g fill="#0a0a0a"><rect x="138" y="188" width="34" height="120"/><rect x="220" y="188" width="34" height="120"/><rect x="302" y="188" width="34" height="120"/><rect x="384" y="188" width="34" height="120"/><rect x="88" y="342" width="424" height="18"/></g>
      <rect x="430" y="76" width="18" height="86" fill="#ffd84a"/><rect x="448" y="76" width="18" height="86" fill="#fff"/><rect x="466" y="76" width="18" height="86" fill="#ff8fb0"/>
      <g fill="#fff8e8" font-family="Space Mono, monospace" font-size="18"><text x="114" y="416">1958 → CONSTITUTION</text></g>
    `, "#101010");
  }

  if (key === "oceans") {
    return baseDailySvg(`
      <rect x="0" y="0" width="600" height="460" fill="#b7e8ff"/>
      <path d="M0 210 C70 170,130 250,200 210 C270 170,330 250,400 210 C470 170,530 250,600 210 L600 460 L0 460 Z" fill="#2f80ed"/>
      <path d="M0 272 C70 232,130 312,200 272 C270 232,330 312,400 272 C470 232,530 312,600 272 L600 460 L0 460 Z" fill="#1456b8"/>
      <path d="M0 338 C70 298,130 378,200 338 C270 298,330 378,400 338 C470 298,530 378,600 338 L600 460 L0 460 Z" fill="#0a2d66"/>
      <g fill="#fff" font-family="Space Mono, monospace" font-size="18"><text x="58" y="94">71% DE LA TERRE</text><text x="372" y="404">ABYSSES ↓</text></g>
    `, "#b7e8ff");
  }

  if (key === "shakespeare") {
    return baseDailySvg(`
      <rect x="86" y="96" width="428" height="256" fill="#fff8e8" stroke="#0a0a0a" stroke-width="6"/>
      <path d="M112 352 C150 270,220 248,300 306 C380 248,450 270,488 352" fill="none" stroke="#0a0a0a" stroke-width="8"/>
      <rect x="150" y="128" width="300" height="58" fill="#0a0a0a"/>
      <g fill="#fff8e8" font-family="Space Mono, monospace" font-size="22"><text x="206" y="166">THE GLOBE</text></g>
      <g fill="#ff8fb0"><rect x="176" y="226" width="54" height="76"/><rect x="274" y="210" width="54" height="92"/><rect x="372" y="226" width="54" height="76"/></g>
    `, "#0a0a0a");
  }

  if (key === "mozart") {
    return baseDailySvg(`
      <g stroke="#fff8e8" stroke-width="6"><line x1="86" y1="148" x2="514" y2="148"/><line x1="86" y1="190" x2="514" y2="190"/><line x1="86" y1="232" x2="514" y2="232"/><line x1="86" y1="274" x2="514" y2="274"/><line x1="86" y1="316" x2="514" y2="316"/></g>
      <g fill="#ffd84a"><circle cx="212" cy="292" r="24"/><rect x="232" y="124" width="10" height="166"/><circle cx="390" cy="208" r="24"/><rect x="410" y="88" width="10" height="118"/></g>
      <path d="M242 124 C314 72,354 116,420 88" fill="none" stroke="#ff8fb0" stroke-width="8"/>
      <g fill="#fff8e8" font-family="Space Mono, monospace" font-size="20"><text x="90" y="404">REQUIEM · K.626</text></g>
    `, "#111827");
  }

  if (key === "volcanoes") {
    return baseDailySvg(`
      <polygon points="150,390 300,120 450,390" fill="#5b3924" stroke="#fff8e8" stroke-width="6"/>
      <polygon points="268,176 300,120 332,176" fill="#ff8fb0"/>
      <path d="M300 120 C250 70,338 70,300 26 C390 56,420 118,332 176" fill="#ffd84a"/>
      <path d="M286 176 L250 390" stroke="#ff8fb0" stroke-width="10"/><path d="M316 176 L370 390" stroke="#ffd84a" stroke-width="10"/>
      <g fill="#fff" font-family="Space Mono, monospace" font-size="18"><text x="84" y="86">MAGMA ↑</text></g>
    `, "#0a0a0a");
  }

  if (key === "napoleon") {
    return baseDailySvg(`
      <rect x="130" y="278" width="340" height="76" fill="#fff8e8" stroke="#0a0a0a" stroke-width="6"/>
      <path d="M126 246 C198 132,402 132,474 246 C396 214,204 214,126 246 Z" fill="#0a0a0a" stroke="#ffd84a" stroke-width="8"/>
      <rect x="292" y="104" width="16" height="250" fill="#ffd84a"/>
      <rect x="308" y="104" width="82" height="52" fill="#ff8fb0"/><rect x="308" y="156" width="82" height="52" fill="#fff8e8"/>
      <g fill="#fff8e8" font-family="Space Mono, monospace" font-size="18"><text x="96" y="414">AUSTERLITZ → WATERLOO</text></g>
    `, "#111827");
  }

  if (key === "evolution") {
    return baseDailySvg(`
      <g fill="none" stroke="#fff8e8" stroke-width="8"><path d="M300 386 V240"/><path d="M300 240 C214 210,174 160,146 86"/><path d="M300 240 C386 210,426 160,454 86"/><path d="M300 282 C220 300,166 342,108 394"/><path d="M300 282 C380 300,434 342,492 394"/></g>
      <g fill="#ffd84a"><circle cx="300" cy="386" r="24"/><circle cx="146" cy="86" r="24"/><circle cx="454" cy="86" r="24"/><circle cx="108" cy="394" r="24"/><circle cx="492" cy="394" r="24"/></g>
      <g fill="#fff8e8" font-family="Space Mono, monospace" font-size="18"><text x="92" y="46">ANCÊTRE COMMUN</text></g>
    `, "#0a0a0a");
  }

  if (key === "coldWar") {
    return baseDailySvg(`
      <rect x="0" y="0" width="300" height="460" fill="#1d4ed8"/><rect x="300" y="0" width="300" height="460" fill="#991b1b"/>
      <g fill="#0a0a0a"><rect x="282" y="0" width="36" height="460"/><rect x="252" y="78" width="96" height="18"/><rect x="252" y="178" width="96" height="18"/><rect x="252" y="278" width="96" height="18"/><rect x="252" y="378" width="96" height="18"/></g>
      <g fill="#fff8e8"><polygon points="120,356 146,88 172,356"/><polygon points="428,356 454,88 480,356"/></g>
      <g fill="#fff8e8" font-family="Space Mono, monospace" font-size="18"><text x="82" y="414">BERLIN · ESPACE · NUCLÉAIRE</text></g>
    `, "#0a0a0a");
  }

  if (key === "brain") {
    return baseDailySvg(`
      <path d="M212 134 C166 132,138 170,154 214 C116 246,132 312,192 318 C204 376,282 382,304 332 C338 386,430 366,426 300 C486 284,494 204,438 184 C430 126,348 100,302 142 C278 118,238 116,212 134 Z" fill="#ff8fb0" stroke="#fff8e8" stroke-width="6"/>
      <g fill="none" stroke="#0a0a0a" stroke-width="5"><path d="M210 160 C260 178,250 222,204 234"/><path d="M302 142 C298 198,330 230,386 218"/><path d="M194 286 C250 268,276 300,264 348"/><path d="M340 300 C372 268,410 284,426 300"/></g>
      <g fill="#ffd84a"><circle cx="206" cy="160" r="8"/><circle cx="386" cy="218" r="8"/><circle cx="264" cy="348" r="8"/><circle cx="426" cy="300" r="8"/></g>
      <g fill="#fff8e8" font-family="Space Mono, monospace" font-size="18"><text x="92" y="414">SYNAPSES → 20 WATTS</text></g>
    `, "#111827");
  }

  return baseDailySvg(`
    <rect x="96" y="86" width="408" height="288" fill="#fff8e8" stroke="#0a0a0a" stroke-width="6"/>
    <g fill="#0a0a0a"><rect x="150" y="142" width="300" height="18"/><rect x="150" y="202" width="220" height="18"/><rect x="150" y="262" width="270" height="18"/></g>
    <g fill="#ffd84a" font-family="Space Mono, monospace" font-size="20"><text x="132" y="414">APPRENTISSAGE DU JOUR</text></g>
  `, "#101010");
}

function getDailyLessonVisual(lesson) {
  const key = getDailyVisualKey(lesson);
  const meta = DAILY_VISUAL_META[key] || {
    tag: "[fig.1.1] — APPRENTISSAGE",
    caption: "Une figure générée depuis le sujet du jour.",
  };
  const custom = (lesson && lesson.visual) || {};
  return {
    key,
    tag: custom.tag || meta.tag,
    caption: custom.caption || meta.caption,
    image: custom.image || meta.image || "",
    alt: custom.alt || meta.alt || getDailyLessonSubject(lesson),
    credit: custom.credit || meta.credit || "",
    source: custom.source || meta.source || "",
    position: custom.position || meta.position || "center center",
    svg: custom.svg || renderDailyVisualSvg(key),
  };
}

function isSafeDailyImagePosition(value) {
  return /^(?:left|center|right|\d{1,3}%)(?:\s+(?:top|center|bottom|\d{1,3}%))?$/.test(String(value || "").trim().toLowerCase());
}

function renderDailyHeroVisual(art, visualData) {
  if (!art) return;
  const image = String(visualData.image || "").trim();
  if (!image) {
    art.setAttribute("aria-hidden", "true");
    art.innerHTML = visualData.svg;
    return;
  }

  const position = isSafeDailyImagePosition(visualData.position) ? visualData.position : "center center";
  art.removeAttribute("aria-hidden");
  art.style.setProperty("--daily-image-position", position);
  art.innerHTML = `
    <img class="daily-visual-photo" src="${escapeDailyHtml(image)}" alt="${escapeDailyHtml(visualData.alt)}" decoding="async" fetchpriority="high">
    <div class="daily-visual-fallback" aria-hidden="true" hidden>${visualData.svg}</div>
  `;

  const img = art.querySelector(".daily-visual-photo");
  const fallback = art.querySelector(".daily-visual-fallback");
  if (img && fallback) {
    img.addEventListener("error", () => {
      img.hidden = true;
      fallback.hidden = false;
      art.setAttribute("aria-hidden", "true");
    }, { once: true });
  }
}

function setDailyLearningOpen(open, shouldScroll) {
  dailyLearningOpen = !!open;
  const slot = document.getElementById("daily-learning-slot");
  if (slot) {
    slot.hidden = !dailyLearningOpen;
    slot.classList.toggle("is-open", dailyLearningOpen);
    if (dailyLearningOpen && shouldScroll) {
      setTimeout(() => slot.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
    }
  }
}

function openDailyLearningDetail() {
  setDailyLearningOpen(true, true);
}

function closeDailyLearningDetail() {
  const visual = document.getElementById("daily-visual-card");
  setDailyLearningOpen(false, false);
  if (visual) setTimeout(() => visual.scrollIntoView({ behavior: "smooth", block: "center" }), 40);
}

function refreshDailyPackButtons() {
  const pack = getTodayLessonPack();
  const generated = !!(pack && typeof window.isPackAdded === "function" && window.isPackAdded(pack.id));
  document.querySelectorAll("[data-daily-pack-action]").forEach((btn) => {
    btn.textContent = generated ? "✓ PAQUET DANS MES PAQUETS" : "GÉNÉRER LE PAQUET FLASHCARDS";
    btn.classList.toggle("daily-pack-added", generated);
  });
}

function renderDailyLearning() {
  registerDailyLessonPacks();
  const lesson = getTodayLesson();
  const slot = document.getElementById("daily-learning-slot");
  if (!slot || !lesson) return;

  const pack = getTodayLessonPack();
  const resources = lesson.resources || {};
  const resourceHtml = [
    renderDailyResourceGroup("Articles reconnus", resources.articles),
    renderDailyResourceGroup("Vidéos à regarder", resources.videos),
    renderDailyResourceGroup("Livres pour aller plus loin", resources.books),
  ].join("");
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const subject = getDailyLessonSubject(lesson);
  const visualData = getDailyLessonVisual(lesson);

  slot.innerHTML = `
    <div class="daily-learning-panel">
      <div class="daily-learning-head">
        <div class="hero-eyebrow">APPRENTISSAGE DU JOUR · ${escapeDailyHtml(today)}</div>
        <button class="btn daily-learning-close" type="button" onclick="window.closeDailyLearningDetail()">FERMER</button>
      </div>
      <div class="daily-learning-content">
        <h2 class="daily-learning-title">${escapeDailyHtml(lesson.title)}</h2>
        <p class="daily-learning-hook">${escapeDailyHtml(lesson.hook)}</p>
        <p class="daily-learning-body">${escapeDailyHtml(lesson.body)}</p>
        <div class="daily-learning-facts">
          ${(lesson.factoids || []).map((fact) => `<div class="daily-learning-fact">→ ${escapeDailyHtml(fact)}</div>`).join("")}
        </div>
        ${visualData.credit && visualData.source ? `
          <a class="daily-learning-image-source" href="${escapeDailyHtml(visualData.source)}" target="_blank" rel="noopener noreferrer">
            IMAGE DU JOUR · ${escapeDailyHtml(visualData.credit)}
          </a>
        ` : ""}
        <div class="daily-learning-resources">${resourceHtml}</div>
        <div class="daily-pack-box">
          <div>
            <div class="daily-pack-label">PAQUET FLASHCARDS DU JOUR</div>
            <div class="daily-pack-name">${pack ? escapeDailyHtml(pack.name) : "Paquet à préparer"}</div>
            <div class="daily-pack-count">${pack ? pack.cards.length : 0} cartes prêtes à réviser</div>
          </div>
          <div class="daily-pack-actions">
            <button class="btn btn-y" data-daily-pack-action onclick="window.addTodayLessonPack()">GÉNÉRER LE PAQUET FLASHCARDS</button>
            <button class="btn" onclick="window.startTodayLessonPack()">RÉVISER MAINTENANT</button>
          </div>
        </div>
      </div>
    </div>
  `;
  setDailyLearningOpen(dailyLearningOpen, false);

  const tag = document.getElementById("daily-visual-tag");
  if (tag) tag.textContent = visualData.tag;
  const art = document.getElementById("daily-visual-art");
  renderDailyHeroVisual(art, visualData);
  const visualTitle = document.getElementById("daily-visual-title");
  if (visualTitle) visualTitle.textContent = subject;
  const visual = document.getElementById("daily-visual-card");
  if (visual) visual.setAttribute("aria-label", "Apprendre plus sur " + subject);
  const caption = document.getElementById("daily-visual-caption");
  if (caption) {
    const credit = visualData.credit && visualData.source
      ? `<a class="daily-visual-credit" href="${escapeDailyHtml(visualData.source)}" target="_blank" rel="noopener noreferrer">Photo : ${escapeDailyHtml(visualData.credit)}</a>`
      : "";
    caption.innerHTML = `<span><strong>fig.1.1</strong> &nbsp;·&nbsp; ${escapeDailyHtml(visualData.caption)}</span>${credit}`;
    const creditLink = caption.querySelector(".daily-visual-credit");
    if (creditLink) {
      creditLink.addEventListener("click", (event) => event.stopPropagation());
      creditLink.addEventListener("keydown", (event) => event.stopPropagation());
    }
  }
  refreshDailyPackButtons();
}

function addTodayLessonPack() {
  registerDailyLessonPacks();
  const pack = getTodayLessonPack();
  if (!pack || typeof window.addPack !== "function") return;
  window.addPack(pack.id);
  refreshDailyPackButtons();
  if (typeof window.renderTrouver === "function") window.renderTrouver();
  if (typeof window.renderMesPaquets === "function") window.renderMesPaquets();
}

function startTodayLessonPack() {
  const pack = getTodayLessonPack();
  if (!pack) return;
  addTodayLessonPack();
  if (typeof window.startFlashcardSession === "function") {
    window.startFlashcardSession(pack.id);
  }
}

registerDailyLessonPacks();
window.getTodayLesson = getTodayLesson;
window.getTodayLessonPack = getTodayLessonPack;
window.renderDailyLearning = renderDailyLearning;
window.openDailyLearningDetail = openDailyLearningDetail;
window.closeDailyLearningDetail = closeDailyLearningDetail;
window.addTodayLessonPack = addTodayLessonPack;
window.startTodayLessonPack = startTodayLessonPack;
