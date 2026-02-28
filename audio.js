/* audio.js — typerun procedural sound effects via Web Audio API */
(function () {
  let _ac = null;

  function getAC() {
    if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
    if (_ac.state === 'suspended') _ac.resume();
    return _ac;
  }

  // Simple one-shot tone: freq, wavetype, duration (s), volume, delay (s)
  function tone(ac, freq, type, dur, vol, delay) {
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    const t    = ac.currentTime + (delay || 0);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  // Frequency-swept tone (portamento)
  function sweep(ac, f0, f1, type, dur, vol, delay) {
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    const t    = ac.currentTime + (delay || 0);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type || 'sawtooth';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  window.TYPERUN_AUDIO = {

    // Correct keypress — soft bright tick
    playKeyCorrect() {
      const ac = getAC();
      tone(ac, 1100, 'sine', 0.055, 0.07);
    },

    // Wrong keypress — low thud
    playKeyWrong() {
      const ac = getAC();
      sweep(ac, 180, 100, 'square', 0.07, 0.06);
    },

    // Word destroyed — ascending chime (longer/brighter for perfect)
    playWordDestroy(isPerfect) {
      const ac = getAC();
      const notes = isPerfect
        ? [523, 659, 784, 1047, 1319]
        : [523, 659, 784];
      const vol = isPerfect ? 0.13 : 0.09;
      notes.forEach((f, i) => tone(ac, f, 'sine', 0.18, vol, i * 0.06));
    },

    // Life lost — heavy impact thud + descending whine
    playMiss() {
      const ac = getAC();
      sweep(ac, 220, 55,  'sawtooth', 0.28, 0.22);
      sweep(ac, 100, 40,  'square',   0.20, 0.10, 0.05);
    },

    // Hazard word dodges — sci-fi zap
    playHazardDodge() {
      const ac = getAC();
      sweep(ac, 800, 80, 'square', 0.16, 0.12);
      tone(ac, 200, 'sine', 0.1, 0.05, 0.05);
    },

    // Level up — bright ascending fanfare
    playLevelUp() {
      const ac = getAC();
      [523, 659, 784, 1047, 1319].forEach((f, i) => {
        tone(ac, f, 'sine', 0.22, 0.11, i * 0.08);
      });
      // Sparkle tail
      [2093, 2637].forEach((f, i) => {
        tone(ac, f, 'sine', 0.12, 0.06, 0.44 + i * 0.06);
      });
    },

    // Streak milestone (5, 10, 15…) — shimmery burst
    playStreakMilestone() {
      const ac = getAC();
      [784, 988, 1175, 1480, 1976].forEach((f, i) => {
        tone(ac, f, 'sine', 0.14, 0.09, i * 0.045);
      });
    },

    // Game over — dramatic descending dirge
    playGameOver() {
      const ac = getAC();
      [330, 247, 196, 147, 110].forEach((f, i) => {
        sweep(ac, f * 1.05, f, 'sawtooth', 0.30, 0.16, i * 0.14);
      });
    },
  };
})();
