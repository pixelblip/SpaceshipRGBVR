/* ==========================================================================
   SPACE SYNTH — generative D-major soundtrack over the ambient bed
   Root key detected from track.mp3 (Krumhansl): D major @ ~53 BPM
   Arps, filter sweeps, lead lines → stereo delays
   ========================================================================== */
(function () {
  const ROOT = 2; /* D */
  const BPM = 53;
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixo: [0, 2, 4, 5, 7, 9, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    pent: [0, 2, 4, 7, 9]
  };

  /* progression in scale degrees (I vi IV V ii iii) — stays in D family */
  const PROGS = [
    [0, 5, 3, 4],       /* I vi IV V */
    [0, 3, 4, 0],       /* I IV V I */
    [0, 5, 0, 4],       /* I vi I V */
    [5, 3, 0, 4],       /* vi IV I V */
    [0, 2, 3, 4]        /* I iii IV V */
  ];

  const ARP_SHAPES = [
    [0, 2, 4, 7, 4, 2],
    [0, 4, 7, 9, 7, 4],
    [0, 2, 4, 2, 7, 4],
    [7, 4, 2, 0, 2, 4],
    [0, 4, 9, 7, 4, 0],
    [0, 2, 7, 9, 7, 11]
  ];

  function midiToHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  /* scientific pitch: octave 4 → C4 = MIDI 60 */
  function noteMidi(rootPc, scale, degree, octave) {
    const len = scale.length;
    let deg = degree;
    let oct = octave;
    while (deg < 0) { deg += len; oct -= 1; }
    const octOff = Math.floor(deg / len);
    const idx = deg % len;
    return 12 * (oct + 1 + octOff) + rootPc + scale[idx];
  }

  if (typeof AFRAME === 'undefined') return;

  AFRAME.registerComponent('space-synth', {
    init: function () {
      this.on = true;
      this.ready = false;
      this.nextT = 0;
      this.beat = 0;
      this.bar = 0;
      this.progI = 0;
      this.chordI = 0;
      this.arpI = 0;
      this.scaleName = 'major';
      this.pattern = 0;
      this.leadNext = 0;
      this.sweepPhase = 0;
      this.pending = [];
      SHIP.synth = { on: true, note: 0, chord: 0, energy: 0, key: 'D major' };

      const kick = () => this.begin();
      ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(ev =>
        window.addEventListener(ev, kick, { once: false }));
      this.el.addEventListener('enter-vr', kick);
      setTimeout(kick, 800);

      window.addEventListener('keydown', e => {
        if (e.key.toLowerCase() === 'm') {
          this.on = !this.on;
          SHIP.synth.on = this.on;
          if (this.master) this.master.gain.setTargetAtTime(this.on ? this.level : 0, AC().currentTime, 0.08);
        }
      });
    },

    begin: function () {
      if (this.ready || this.starting) return;
      this.starting = true;
      let ctx;
      try { ctx = AC(); } catch (e) { this.starting = false; return; }
      ctx.resume();

      this.level = 0.2;
      this.master = ctx.createGain();
      this.master.gain.value = 0;
      this.master.gain.setTargetAtTime(this.level, ctx.currentTime, 0.4);

      /* lush parallel delays */
      this.delayL = ctx.createDelay(1.5);
      this.delayR = ctx.createDelay(1.5);
      this.delayL.delayTime.value = 0.42;
      this.delayR.delayTime.value = 0.63;
      this.fbL = ctx.createGain(); this.fbL.gain.value = 0.48;
      this.fbR = ctx.createGain(); this.fbR.gain.value = 0.42;
      this.delayMix = ctx.createGain(); this.delayMix.gain.value = 0.55;
      this.dry = ctx.createGain(); this.dry.gain.value = 0.7;

      this.filter = ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 1200;
      this.filter.Q.value = 0.9;

      this.leadFilter = ctx.createBiquadFilter();
      this.leadFilter.type = 'lowpass';
      this.leadFilter.frequency.value = 2400;
      this.leadFilter.Q.value = 1.2;

      const merger = ctx.createChannelMerger(2);
      this.filter.connect(this.dry);
      this.dry.connect(this.master);
      this.filter.connect(this.delayL);
      this.filter.connect(this.delayR);
      this.delayL.connect(this.fbL); this.fbL.connect(this.delayR);
      this.delayR.connect(this.fbR); this.fbR.connect(this.delayL);
      this.delayL.connect(merger, 0, 0);
      this.delayR.connect(merger, 0, 1);
      merger.connect(this.delayMix);
      this.delayMix.connect(this.master);

      this.leadFilter.connect(this.delayL);
      this.leadFilter.connect(this.delayR);
      this.leadFilter.connect(this.dry);

      this.master.connect(ctx.destination);

      /* tap into shared analyser if present so visuals react to synth too */
      const audio = this.el.components['audio-react'];
      if (audio && audio.an) {
        try { this.master.connect(audio.an); } catch (e) {}
      }

      this.ctx = ctx;
      this.ready = true;
      this.starting = false;
      this.nextT = ctx.currentTime + 0.3;
      this.leadNext = ctx.currentTime + 2.5;

      const note = document.querySelector('#audionote');
      if (note && note.classList.contains('on')) {
        note.innerHTML = note.innerHTML.replace(/seamless loop[^<]*/, 'D major live score · looping');
      }
    },

    chordRootDegree: function () {
      const prog = PROGS[this.progI % PROGS.length];
      return prog[this.chordI % prog.length];
    },

    pickScale: function () {
      const a = SHIP.act;
      if (a === 4) return 'lydian';       /* fold — floaty */
      if (a === 3) return 'dorian';       /* debris — tense */
      if (a === 5) return 'pent';         /* drift — sparse */
      if (a === 6) return 'mixo';         /* sunfall — warm */
      return this.bar % 16 < 8 ? 'major' : 'lydian';
    },

    scheduleArp: function (when) {
      const ctx = this.ctx;
      const scale = SCALES[this.scaleName] || SCALES.major;
      const chordDeg = this.chordRootDegree();
      const shape = ARP_SHAPES[this.pattern % ARP_SHAPES.length];
      const step = shape[this.arpI % shape.length];
      const deg = chordDeg + step;
      const oct = (SHIP.alert > 0.4 || SHIP.warp > 0.3) ? 4 : 3;
      const midi = noteMidi(ROOT, scale, deg, oct);
      const hz = midiToHz(midi);

      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const types = ['sine', 'triangle', 'sine', 'triangle'];
      osc.type = types[this.pattern % types.length];
      osc.frequency.value = hz;
      /* soft detune twin */
      const osc2 = ctx.createOscillator();
      osc2.type = osc.type;
      osc2.frequency.value = hz * 1.003;
      const g2 = ctx.createGain();
      g2.gain.value = 0.35;

      const beatSec = 60 / BPM;
      const dens = SHIP.warp > 0.2 ? 0.25 : (SHIP.alert > 0.3 ? 0.33 : 0.5);
      const dur = beatSec * dens * 0.85;
      const peak = 0.045 + SHIP.audio.bass * 0.04 + (SHIP.act === 5 ? 0.02 : 0);

      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(peak, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);

      osc.connect(g); osc2.connect(g2); g2.connect(g);
      g.connect(this.filter);
      osc.start(when); osc2.start(when);
      osc.stop(when + dur + 0.05); osc2.stop(when + dur + 0.05);

      SHIP.synth.note = midi;
      SHIP.synth.chord = chordDeg;
      SHIP.synth.energy = Math.min(1, SHIP.synth.energy * 0.7 + peak * 8);

      this.arpI++;
      if (this.arpI % shape.length === 0) {
        this.beat++;
        if (this.beat % 4 === 0) {
          this.chordI++;
          if (this.chordI % 4 === 0) {
            this.bar++;
            if (this.bar % 8 === 0) {
              this.progI = (this.progI + 1) % PROGS.length;
              this.pattern = (this.pattern + 1) % ARP_SHAPES.length;
              this.scaleName = this.pickScale();
            }
          }
        }
      }
      return dens * beatSec;
    },

    scheduleLead: function (when) {
      const ctx = this.ctx;
      const scale = SCALES[this.scaleName] || SCALES.major;
      const chordDeg = this.chordRootDegree();
      const choices = [0, 2, 4, 7, 9, 11, 12, 14];
      const step = choices[(Math.random() * choices.length) | 0];
      const midi = noteMidi(ROOT, scale, chordDeg + step, 5);
      const hz = midiToHz(midi);

      const osc = ctx.createOscillator();
      osc.type = Math.random() < 0.5 ? 'sine' : 'triangle';
      const g = ctx.createGain();
      const len = (60 / BPM) * (2 + (Math.random() * 3) | 0);

      /* glide from previous */
      const prev = this._prevLeadHz || hz * 0.98;
      osc.frequency.setValueAtTime(prev, when);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, hz), when + 0.18);
      this._prevLeadHz = hz;

      const peak = 0.035 + SHIP.audio.mid * 0.05;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(peak, when + 0.12);
      g.gain.setValueAtTime(peak * 0.7, when + len * 0.55);
      g.gain.exponentialRampToValueAtTime(0.0001, when + len);

      osc.connect(g); g.connect(this.leadFilter);
      osc.start(when); osc.stop(when + len + 0.05);

      /* occasional fifth harmony */
      if (Math.random() < 0.35) {
        const o2 = ctx.createOscillator();
        const gH = ctx.createGain();
        o2.type = 'sine';
        o2.frequency.value = hz * 1.5;
        gH.gain.setValueAtTime(0.0001, when);
        gH.gain.exponentialRampToValueAtTime(peak * 0.35, when + 0.15);
        gH.gain.exponentialRampToValueAtTime(0.0001, when + len * 0.9);
        o2.connect(gH); gH.connect(this.leadFilter);
        o2.start(when); o2.stop(when + len + 0.05);
      }
    },

    scheduleSweep: function (when) {
      /* long filter breath — signature ambient move */
      const f0 = 400 + Math.random() * 400;
      const f1 = 1800 + Math.random() * 3200 + SHIP.warp * 2000;
      const dur = 4 + Math.random() * 6;
      this._sweeping = true;
      this.filter.frequency.cancelScheduledValues(when);
      this.filter.frequency.setValueAtTime(f0, when);
      this.filter.frequency.exponentialRampToValueAtTime(Math.max(f0 + 50, f1), when + dur * 0.55);
      this.filter.frequency.exponentialRampToValueAtTime(600 + Math.random() * 500, when + dur);
      clearTimeout(this._sweepTimer);
      this._sweepTimer = setTimeout(() => { this._sweeping = false; }, dur * 1000);

      this.delayL.delayTime.setTargetAtTime(0.35 + Math.random() * 0.35, when, 0.5);
      this.delayR.delayTime.setTargetAtTime(0.5 + Math.random() * 0.45, when, 0.5);
      this.fbL.gain.setTargetAtTime(0.4 + Math.random() * 0.2, when, 0.4);
    },

    tick: function (time, delta) {
      if (!this.ready || !this.on) {
        SHIP.synth.energy *= 0.92;
        return;
      }
      const ctx = this.ctx;
      if (ctx.state !== 'running') ctx.resume();

      const now = ctx.currentTime;
      /* schedule ~0.6s ahead */
      while (this.nextT < now + 0.55) {
        const step = this.scheduleArp(this.nextT);
        this.nextT += step;
      }
      if (now >= this.leadNext) {
        this.scheduleLead(now + 0.05);
        this.leadNext = now + (60 / BPM) * (4 + ((Math.random() * 4) | 0));
        if (Math.random() < 0.55) this.scheduleSweep(now);
      }

      /* slow living filter even between sweeps */
      this.sweepPhase += delta * 0.001;
      const lfo = 900 + Math.sin(this.sweepPhase * 0.7) * 500 + SHIP.audio.high * 800 + SHIP.warp * 1500;
      if (!this._sweeping) {
        this.filter.frequency.setTargetAtTime(lfo, now, 0.25);
      }
      this.leadFilter.frequency.setTargetAtTime(1600 + SHIP.audio.mid * 2000, now, 0.2);

      SHIP.synth.energy *= 0.96;
    }
  });
})();
