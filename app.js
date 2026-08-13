// ============================================
// 12 Coups de Midi — Core utilities
// ============================================

let stats = JSON.parse(localStorage.getItem("qpuc-stats") || '{"games":0,"correct":0,"total":0,"quizzes":0,"quizCorrect":0,"quizTotal":0}');

// --- Utilities ---
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(str) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function checkAnswer(userAnswer, correctAnswer) {
  const u = normalize(userAnswer);
  const c = normalize(correctAnswer);
  if (!u) return false;
  if (u === c) return true;
  const stripArticles = (s) => s.replace(/^(le |la |les |l |un |une |des |du |de la |de l )/g, "").trim();
  const us = stripArticles(u), cs = stripArticles(c);
  if (us === cs) return true;
  if (cs.length > 3 && u.includes(cs)) return true;
  if (us.length > 3 && cs.includes(us)) return true;
  const altMatch = correctAnswer.match(/\(([^)]+)\)/);
  if (altMatch) {
    const alt = normalize(altMatch[1]), altS = stripArticles(alt);
    if (u === alt || us === altS || u.includes(alt) || alt.includes(us)) return true;
  }
  if (correctAnswer.includes("/")) {
    const parts = correctAnswer.split("/").map(p => normalize(p.trim()));
    for (const part of parts) { const partS = stripArticles(part); if (u === part || us === partS || (partS.length > 3 && u.includes(partS))) return true; }
  }
  if (cs.length >= 5) { const dist = levenshtein(us, cs); if (dist <= Math.floor(cs.length * 0.2)) return true; }
  return false;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const el = document.getElementById("screen-" + id);
  if (el) el.classList.add("active");
}

function updateStats() {
  const gamesEl = document.getElementById("stat-games");
  const correctEl = document.getElementById("stat-correct");
  const rateEl = document.getElementById("stat-rate");
  if (gamesEl) gamesEl.textContent = (stats.games || 0) + (stats.quizzes || 0);
  if (correctEl) correctEl.textContent = (stats.correct || 0) + (stats.quizCorrect || 0);
  const total = (stats.total || 0) + (stats.quizTotal || 0);
  const correct = (stats.correct || 0) + (stats.quizCorrect || 0);
  if (rateEl) rateEl.textContent = total > 0 ? Math.round((correct / total) * 100) + "%" : "-";
  localStorage.setItem("qpuc-stats", JSON.stringify(stats));
}

function playSound(type) {
  if (window.CultureSound) window.CultureSound.play(type);
}

// --- Navigation ---
function goHome() {
  goToTab("today");
}

// 3-tab navigation
function goToTab(tab) {
  // Hide all screens
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  // Show the right tab screen
  const map = { today: "screen-today", explorer: "screen-explorer", cartes: "screen-cartes" };
  const el = document.getElementById(map[tab]);
  if (el) el.classList.add("active");
  // Update bottom nav active state
  document.querySelectorAll(".bottom-nav-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  // Show bottom nav
  const nav = document.getElementById("bottom-nav");
  if (nav) nav.style.display = "";
  // Init the right module
  if (tab === "today" && typeof initToday === "function") initToday();
  else if (tab === "explorer" && typeof initExplorer === "function") initExplorer();
}

// Hide bottom nav during sub-screens
function hideBottomNav() {
  const nav = document.getElementById("bottom-nav");
  if (nav) nav.style.display = "none";
}

// Override showScreen to hide bottom nav on non-tab screens
const _origShowScreen = showScreen;
showScreen = function (id) {
  _origShowScreen(id);
  const tabIds = ["today", "explorer", "cartes"];
  const nav = document.getElementById("bottom-nav");
  if (nav) {
    nav.style.display = tabIds.includes(id) ? "" : "none";
  }
};

// --- Init ---
updateStats();
if (typeof updateRevisionBadge === "function") updateRevisionBadge();
// Open today tab on load
document.addEventListener("DOMContentLoaded", function () {
  if (typeof initToday === "function") initToday();
});
// Fallback in case DOMContentLoaded already fired
setTimeout(function () { if (typeof initToday === "function") initToday(); }, 50);
