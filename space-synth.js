/* ==========================================================================
   SPACE TEXTURE — quiet D-major atmosphere under the ambient bed
   No arps / leads. Slow drones, open fifths, soft noise wind, rare glints.
   ========================================================================== */
(function () {
  const ROOT_PC = 2; /* D */
  function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function pcHz(pc, oct) { return midiHz(12 * (oct + 1) + pc); }

  /* open voicings that sit with a deep-space drone */
  const VOICINGS = [
    [0, 7],           /* D–A */
    [0, 7, 12],       /* D–A–D */
    [0, 5, 7],        /* D–G–A (sus) */
    [0, 7, 16],       /* D–A–F# */
    [0, 3, 7],        /* Dm colour, sparse */
    [0, 7, 14]        /* D–A–E */
  ];

  if (typeof AFRAME === 'undefined') return;

  AFRAME.registerComponent('space-synth', {
    init: function () {
      this.on = true;
      this.ready = false;
      this.voiceI = 0;
      this.nextMorph = 0;
      this.nextGlint = 0;
      this.phase = 0;
      SHIP.synth = { on: true, note: 50, chord: 0, energy: 0, key: 'D major' };

      const kick = () => this.begin();
      ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(ev =>
        window.addEventListener(ev, kick));
      this.el.addEventListener('enter-vr', kick);
      setTimeout(kick, 900);

      window.addEventListener('keydown', e => {
        if (e.key.toLowerCase() === 'm') {
          this.on = !this.on;
          SHIP.synth.on = this.on;
          if (this.master) {
            this.master.gain.setTargetAtTime(this.on ? this.level : 0, AC().currentTime, 0.3);
          }
        }
      });
    },

    begin: function () {
      if (this.ready || this.starting) return;
      this.starting = true;
      let ctx;
      try { ctx = AC(); } catch (e) { this.starting = false; return; }
      ctx.resume();

      this.level = 0.14;
      this.master = ctx.createGain();
      this.master.gain.value = 0;
      this.master.gain.setTargetAtTime(this.level, ctx.currentTime, 1.2);

      /* gentle wash — long delay, low feedback, dark */
      this.delay = ctx.createDelay(2.5);
      this.delay.delayTime.value = 1.35;
      this.fb = ctx.createGain();
      this.fb.gain.value = 0.38;
      this.delayFilter = ctx.createBiquadFilter();
      this.delayFilter.type = 'lowpass';
      this.delayFilter.frequency.value = 1600;
      this.wet = ctx.createGain();
      this.wet.gain.value = 0.45;
      this.dry = ctx.createGain();
      this.dry.gain.value = 0.55;

      this.bus = ctx.createGain();
      this.bus.connect(this.dry);
      this.dry.connect(this.master);
      this.bus.connect(this.delay);
      this.delay.connect(this.delayFilter);
      this.delayFilter.connect(this.fb);
      this.fb.connect(this.delay);
      this.delayFilter.connect(this.wet);
      this.wet.connect(this.master);
      this.master.connect(ctx.destination);

      const audio = this.el.components['audio-react'];
      if (audio && audio.an) {
        try { this.master.connect(audio.an); } catch (e) {}
      }

      /* --- sub drone (D1/D2) --- */
      this.drone = this.makePartial(ctx, pcHz(ROOT_PC, 1), 'sine', 0.045);
      this.droneOct = this.makePartial(ctx, pcHz(ROOT_PC, 2), 'sine', 0.028);
      this.droneFifth = this.makePartial(ctx, pcHz((ROOT_PC + 7) % 12, 2), 'sine', 0.018);

      /* --- soft pad voices (3) --- */
      this.pads = [];
      for (let i = 0; i < 3; i++) {
        const p = this.makePartial(ctx, pcHz(ROOT_PC, 3), 'sine', 0.0001);
        p.osc.type = i === 1 ? 'triangle' : 'sine';
        this.pads.push(p);
      }

      /* --- space wind: filtered noise --- */
      const nLen = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, nLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < nLen; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
      this.noise = ctx.createBufferSource();
      this.noise.buffer = buf;
      this.noise.loop = true;
      this.noiseFilter = ctx.createBiquadFilter();
      this.noiseFilter.type = 'bandpass';
      this.noiseFilter.frequency.value = 420;
      this.noiseFilter.Q.value = 0.6;
      this.noiseGain = ctx.createGain();
      this.noiseGain.gain.value = 0.012;
      this.noise.connect(this.noiseFilter);
      this.noiseFilter.connect(this.noiseGain);
      this.noiseGain.connect(this.bus);
      this.noise.start();

      this.ctx = ctx;
      this.ready = true;
      this.starting = false;
      this.nextMorph = ctx.currentTime + 8;
      this.nextGlint = ctx.currentTime + 12;
      this.applyVoicing(VOICINGS[0], ctx.currentTime, 6);

      const note = document.querySelector('#audionote');
      if (note && /Deep Space|live score|seamless/i.test(note.innerHTML || '')) {
        note.innerHTML = 'Deep Space Rumble + soft D atmosphere';
      }
    },

    makePartial: function (ctx, hz, type, gain) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      osc.type = type;
      osc.frequency.value = hz;
      f.type = 'lowpass';
      f.frequency.value = 900;
      g.gain.value = gain;
      osc.connect(f);
      f.connect(g);
      g.connect(this.bus);
      osc.start();
      return { osc: osc, gain: g, filter: f };
    },

    applyVoicing: function (voicing, when, glide) {
      const baseOct = 3;
      for (let i = 0; i < this.pads.length; i++) {
        const pad = this.pads[i];
        if (i >= voicing.length) {
          pad.gain.gain.setTargetAtTime(0.0001, when, 1.5);
          continue;
        }
        const pc = (ROOT_PC + voicing[i]) % 12;
        const oct = baseOct + Math.floor((ROOT_PC + voicing[i]) / 12);
        const hz = pcHz(pc, oct + (i === 2 ? 1 : 0));
        pad.osc.frequency.setTargetAtTime(hz, when, Math.max(0.4, glide * 0.25));
        const level = 0.012 + (i === 0 ? 0.01 : 0) + SHIP.audio.bass * 0.01;
        pad.gain.gain.setTargetAtTime(level, when, 1.2);
        pad.filter.frequency.setTargetAtTime(700 + i * 200, when, 1);
        SHIP.synth.note = 12 * (oct + 1) + pc;
      }
      SHIP.synth.chord = this.voiceI;
    },

    scheduleGlint: function (when) {
      /* rare, distant high partial — not a melody */
      const ctx = this.ctx;
      const partials = [19, 24, 28, 31]; /* overtones-ish above D */
      const midi = 50 + partials[(Math.random() * partials.length) | 0];
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      osc.type = 'sine';
      osc.frequency.value = midiHz(midi);
      f.type = 'lowpass';
      f.frequency.value = 2800;
      const dur = 4 + Math.random() * 5;
      const peak = 0.008 + Math.random() * 0.006;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(peak, when + 1.2);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      osc.connect(f); f.connect(g); g.connect(this.bus);
      osc.start(when); osc.stop(when + dur + 0.1);
      SHIP.synth.energy = Math.min(1, SHIP.synth.energy + 0.25);
    },

    tick: function (time, delta) {
      if (!this.ready || !this.on) {
        SHIP.synth.energy *= 0.95;
        return;
      }
      const ctx = this.ctx;
      if (ctx.state !== 'running') ctx.resume();
      const now = ctx.currentTime;
      const dt = Math.min(delta / 1000, 0.05);
      this.phase += dt;

      /* drone breathes with ship thrust / bass */
      const breath = 0.035 + SHIP.thrust * 0.02 + SHIP.audio.bass * 0.03
        + Math.sin(this.phase * 0.11) * 0.008;
      this.drone.gain.gain.setTargetAtTime(breath, now, 0.5);
      this.droneOct.gain.gain.setTargetAtTime(breath * 0.55, now, 0.5);
      this.droneFifth.gain.gain.setTargetAtTime(breath * 0.35 + SHIP.warp * 0.02, now, 0.5);

      /* noise wind follows warp / alert gently */
      const wind = 0.008 + SHIP.warp * 0.04 + SHIP.alert * 0.015
        + Math.sin(this.phase * 0.07) * 0.003;
      this.noiseGain.gain.setTargetAtTime(wind, now, 0.6);
      this.noiseFilter.frequency.setTargetAtTime(
        280 + SHIP.warp * 900 + Math.sin(this.phase * 0.13) * 80, now, 0.8);

      /* darken / open delay with scene */
      this.delayFilter.frequency.setTargetAtTime(900 + SHIP.nebInt * 500, now, 1);

      if (now >= this.nextMorph) {
        this.voiceI = (this.voiceI + 1) % VOICINGS.length;
        /* pick voicing biased by act */
        if (SHIP.act === 3) this.voiceI = 4;      /* debris → minor colour */
        else if (SHIP.act === 4) this.voiceI = 2; /* fold → sus */
        else if (SHIP.act === 5) this.voiceI = 1; /* drift → pure fifths */
        this.applyVoicing(VOICINGS[this.voiceI], now, 8 + Math.random() * 6);
        this.nextMorph = now + 14 + Math.random() * 18;
      }

      if (now >= this.nextGlint) {
        if (Math.random() < 0.7) this.scheduleGlint(now + 0.05);
        this.nextGlint = now + 16 + Math.random() * 24;
      }

      SHIP.synth.energy = damp(SHIP.synth.energy, wind * 8 + breath * 4, 1.2, dt);
    }
  });
})();
