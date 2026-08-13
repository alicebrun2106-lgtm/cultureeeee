(function () {
  "use strict";

  const STORAGE_KEY = "culture-sound-enabled";
  let audioContext = null;
  let lastPlayedAt = 0;

  function isEnabled() {
    return localStorage.getItem(STORAGE_KEY) !== "0";
  }

  function getContext() {
    if (!audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      audioContext = new AudioContext();
    }
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    return audioContext;
  }

  function tone(ctx, start, duration, from, to, volume, wave) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = wave || "sine";
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(to || from, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function play(type) {
    if (!isEnabled()) return;
    const nowMs = performance.now();
    if (type === "click" && nowMs - lastPlayedAt < 45) return;
    lastPlayedAt = nowMs;

    try {
      const ctx = getContext();
      if (!ctx) return;
      const now = ctx.currentTime + 0.005;

      if (type === "flip") {
        tone(ctx, now, 0.09, 300, 440, 0.035, "triangle");
      } else if (type === "correct" || type === "good") {
        tone(ctx, now, 0.11, 660, 720, 0.045, "sine");
        tone(ctx, now + 0.085, 0.14, 880, 990, 0.04, "sine");
      } else if (type === "easy" || type === "win") {
        tone(ctx, now, 0.1, 660, 720, 0.04, "sine");
        tone(ctx, now + 0.07, 0.11, 880, 960, 0.04, "sine");
        tone(ctx, now + 0.14, 0.15, 1100, 1250, 0.035, "sine");
      } else if (type === "wrong" || type === "again") {
        tone(ctx, now, 0.2, 230, 155, 0.045, "triangle");
      } else if (type === "hard") {
        tone(ctx, now, 0.12, 350, 315, 0.035, "triangle");
      } else {
        tone(ctx, now, 0.055, 520, 470, 0.025, "sine");
      }
    } catch (_) {}
  }

  function updateToggle() {
    const button = document.getElementById("sound-toggle");
    const icon = document.getElementById("sound-toggle-icon");
    const enabled = isEnabled();
    if (icon) icon.textContent = enabled ? "🔊" : "🔇";
    if (button) {
      button.setAttribute("aria-pressed", String(enabled));
      button.setAttribute("aria-label", enabled ? "Couper les sons" : "Activer les sons");
      button.title = enabled ? "Couper les sons" : "Activer les sons";
    }
  }

  function toggle() {
    const enabled = !isEnabled();
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    updateToggle();
    if (enabled) play("correct");
  }

  function rating(quality) {
    if (quality <= 1) play("again");
    else if (quality === 3) play("hard");
    else if (quality === 4) play("good");
    else play("easy");
  }

  window.CultureSound = { isEnabled, play, rating, toggle, updateToggle };

  document.addEventListener("DOMContentLoaded", updateToggle);
  document.addEventListener("click", (event) => {
    const control = event.target.closest("button, a, [role='button']");
    if (!control || control.disabled || control.id === "sound-toggle") return;
    if (control.matches(".btn-q, .btn-quality, .quiz-choice-btn, .btn-quiz-choice, .duck-answer-btn, #btn-reveal, #fc-flip-btn, #btn-ts-flip")) return;
    play("click");
  });
})();
