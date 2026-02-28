/* audio.js — typerun sound effects + procedural techno music engine */
(function () {
  let _ac = null;
  let _noiseBuf = null;

  function getAC() {
    if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
    if (_ac.state === 'suspended') _ac.resume();
    return _ac;
  }

  // Pre-baked noise buffer (1 s, reused for drums)
  function noise() {
    if (_noiseBuf) return _noiseBuf;
    const ac   = getAC();
    _noiseBuf  = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const data = _noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return _noiseBuf;
  }

  // ── SFX helpers ───────────────────────────────────────────────────────────
  function tone(freq, type, dur, vol, delay) {
    const ac   = getAC();
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    const t    = ac.currentTime + (delay || 0);
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t); osc.stop(t + dur + 0.01);
  }

  function sweep(f0, f1, type, dur, vol, delay) {
    const ac   = getAC();
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    const t    = ac.currentTime + (delay || 0);
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = type || 'sawtooth';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t); osc.stop(t + dur + 0.01);
  }

  // ── Music engine ──────────────────────────────────────────────────────────
  //
  // 2-bar (32 × 16th-note) loop in A minor.
  // Patterns use 1/0; bass/arp use frequency arrays (0 = rest).
  //
  const STEPS = 32;

  // drum patterns
  const P_KICK = [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0,
                  1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0];
  const P_CLAP = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0,
                  0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
  const P_HHC  = [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0,
                  0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0];
  const P_HHO  = [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1,
                  0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1];

  // bass line — A minor, two bars
  const [A1,C2,D2,E2,G1,Bb1] = [55, 65.4, 73.4, 82.4, 49, 58.3];
  const P_BASS = [
    A1, A1, 0,   0,   E2,  0,   D2,  0,   A1,  0,   C2,  0,   G1,  G1,  0,   0,
    A1, A1, A1,  0,   E2,  D2,  0,   0,   A1,  0,   0,   C2,  G1,  0,   A1,  0,
  ];

  // arp — octaves above the bass, sparse
  const [A3,C4,D4,E4,G3,F4] = [220, 261.6, 293.7, 329.6, 196, 349.2];
  const P_ARP = [
    0,  0,  A3, 0,   0,  0,  E4, 0,   0,  A3, 0,  0,   D4, 0,  0,  0,
    0,  0,  0,  C4,  0,  0,  G3, 0,   A3, 0,  0,  0,   E4, 0,  D4, 0,
  ];

  let _m = {
    playing: false, paused: false, muted: false,
    step: 0, nextTime: 0, timerId: null,
    masterGain: null, bpm: 130,
  };

  function _stepDur() { return 60 / (_m.bpm * 4); }

  function _kick(t) {
    const ac = getAC();
    // Tone sweep
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.connect(g); g.connect(_m.masterGain);
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.07);
    g.gain.setValueAtTime(1.0, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.start(t); osc.stop(t + 0.36);
    // Transient click
    const src = ac.createBufferSource(), cg = ac.createGain();
    src.buffer = noise(); src.connect(cg); cg.connect(_m.masterGain);
    cg.gain.setValueAtTime(0.5, t);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
    src.start(t); src.stop(t + 0.014);
  }

  function _clap(t) {
    const ac = getAC();
    const src = ac.createBufferSource(), flt = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noise(); src.connect(flt); flt.connect(g); g.connect(_m.masterGain);
    flt.type = 'bandpass'; flt.frequency.value = 1200; flt.Q.value = 0.65;
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    src.start(t); src.stop(t + 0.12);
  }

  function _hihat(t, open) {
    const ac = getAC();
    const src = ac.createBufferSource(), flt = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noise(); src.connect(flt); flt.connect(g); g.connect(_m.masterGain);
    flt.type = 'highpass'; flt.frequency.value = open ? 7000 : 9000;
    const dur = open ? 0.16 : 0.034;
    g.gain.setValueAtTime(open ? 0.20 : 0.11, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.start(t); src.stop(t + dur + 0.005);
  }

  function _bass(t, freq) {
    if (!freq) return;
    const ac = getAC();
    const osc = ac.createOscillator(), flt = ac.createBiquadFilter(), g = ac.createGain();
    osc.connect(flt); flt.connect(g); g.connect(_m.masterGain);
    osc.type = 'sawtooth'; osc.frequency.value = freq;
    flt.type = 'lowpass'; flt.Q.value = 10;
    const sd = _stepDur();
    flt.frequency.setValueAtTime(2000, t);
    flt.frequency.exponentialRampToValueAtTime(150, t + sd * 1.6);
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + sd * 1.9);
    osc.start(t); osc.stop(t + sd * 2);
  }

  function _arp(t, freq) {
    if (!freq) return;
    const ac = getAC();
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.connect(g); g.connect(_m.masterGain);
    osc.type = 'square'; osc.frequency.value = freq;
    const sd = _stepDur();
    g.gain.setValueAtTime(0.048, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + sd * 0.7);
    osc.start(t); osc.stop(t + sd * 0.8);
  }

  function _schedule() {
    if (!_m.playing || _m.paused) return;
    const ac = getAC();
    while (_m.nextTime < ac.currentTime + 0.12) {
      const s = _m.step % STEPS, t = _m.nextTime;
      if (P_KICK[s]) _kick(t);
      if (P_CLAP[s]) _clap(t);
      if (P_HHC[s])  _hihat(t, false);
      if (P_HHO[s])  _hihat(t, true);
      _bass(t, P_BASS[s]);
      _arp(t, P_ARP[s]);
      _m.nextTime += _stepDur();
      _m.step = (_m.step + 1) % STEPS;
    }
    _m.timerId = setTimeout(_schedule, 25);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.TYPERUN_AUDIO = {

    // ── SFX ──────────────────────────────────────────────────────────────────
    playKeyCorrect()          { tone(1100, 'sine',     0.055, 0.07); },
    playKeyWrong()            { sweep(180, 100, 'square', 0.07, 0.06); },
    playWordDestroy(perfect)  {
      const notes = perfect ? [523,659,784,1047,1319] : [523,659,784];
      notes.forEach((f, i) => tone(f, 'sine', 0.18, perfect ? 0.13 : 0.09, i * 0.06));
    },
    playMiss()                { sweep(220, 55, 'sawtooth', 0.28, 0.22); sweep(100, 40, 'square', 0.20, 0.10, 0.05); },
    playHazardDodge()         { sweep(800, 80, 'square', 0.16, 0.12); tone(200, 'sine', 0.1, 0.05, 0.05); },
    playLevelUp()             {
      [523,659,784,1047,1319].forEach((f, i) => tone(f, 'sine', 0.22, 0.11, i * 0.08));
      [2093,2637].forEach((f, i) => tone(f, 'sine', 0.12, 0.06, 0.44 + i * 0.06));
    },
    playStreakMilestone()      { [784,988,1175,1480,1976].forEach((f, i) => tone(f, 'sine', 0.14, 0.09, i * 0.045)); },
    playGameOver()            { [330,247,196,147,110].forEach((f, i) => sweep(f * 1.05, f, 'sawtooth', 0.30, 0.16, i * 0.14)); },

    // ── Music ─────────────────────────────────────────────────────────────────
    startMusic(bpm) {
      if (_m.playing) return;
      const ac      = getAC();
      _m.masterGain = ac.createGain();
      _m.masterGain.gain.setValueAtTime(0, ac.currentTime);
      _m.masterGain.gain.linearRampToValueAtTime(0.55, ac.currentTime + 1.8);
      _m.masterGain.connect(ac.destination);
      _m.bpm      = bpm || 130;
      _m.step     = 0;
      _m.nextTime = ac.currentTime + 0.1;
      _m.playing  = true;
      _m.paused   = false;
      _m.muted    = false;
      _schedule();
    },

    stopMusic(fadeSecs) {
      clearTimeout(_m.timerId); _m.timerId = null;
      const fade = fadeSecs || 0;
      if (fade && _m.masterGain) {
        const ac = getAC();
        _m.masterGain.gain.cancelScheduledValues(ac.currentTime);
        _m.masterGain.gain.linearRampToValueAtTime(0, ac.currentTime + fade);
      }
      setTimeout(() => { _m.playing = false; _m.paused = false; }, fade * 1000 + 200);
    },

    pauseMusic() {
      if (!_m.playing || _m.paused) return;
      _m.paused = true;
      clearTimeout(_m.timerId); _m.timerId = null;
      if (_m.masterGain) {
        const ac = getAC();
        _m.masterGain.gain.cancelScheduledValues(ac.currentTime);
        _m.masterGain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.15);
      }
    },

    resumeMusic() {
      if (!_m.playing || !_m.paused) return;
      _m.paused = false;
      const ac = getAC();
      _m.nextTime = ac.currentTime + 0.05;
      if (_m.masterGain) {
        _m.masterGain.gain.cancelScheduledValues(ac.currentTime);
        _m.masterGain.gain.linearRampToValueAtTime(_m.muted ? 0 : 0.55, ac.currentTime + 0.35);
      }
      _schedule();
    },

    setBPM(bpm) {
      _m.bpm = Math.min(Math.max(Math.round(bpm), 118), 158);
    },

    toggleMute() {
      _m.muted = !_m.muted;
      if (_m.masterGain) {
        const ac = getAC();
        _m.masterGain.gain.cancelScheduledValues(ac.currentTime);
        _m.masterGain.gain.linearRampToValueAtTime(_m.muted ? 0 : 0.55, ac.currentTime + 0.12);
      }
      return _m.muted;
    },

    isMuted() { return _m.muted; },
  };
})();
