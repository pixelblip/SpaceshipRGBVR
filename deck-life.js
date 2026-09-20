/* ==========================================================================
   DECK LIFE — keep the galaxy + cockpit visually alive between acts
   ========================================================================== */
AFRAME.registerComponent('deck-life', {
  init: function () {
    SHIP.mood = { pulse: 0, flare: 0, scramble: 0, hue: 0, comet: 0, msg: '' };
    this.nextEvent = 4 + Math.random() * 4;
    this.camWander = 0;
    this.msgs = [
      'NAV LOCK DRIFT', 'METEOR WATCH', 'COMM BURST RX', 'FUEL CELL TRIM',
      'SOLAR WIND +12%', 'TRANSPONDER PING', 'GRAV WAKE AHEAD', 'CABIN PRESS OK',
      'SENSOR SWEEP', 'BEACON ACQUIRED', 'DARK MATTER HAZE', 'COURSE CORRECT'
    ];
    this.tmpC = new T.Color();
  },

  fire: function (kind) {
    const M = SHIP.mood;
    if (kind === 'flare') {
      M.flare = 1;
      SHIP.sunInt = Math.min(SHIP.sunInt + 1.4, 7);
    } else if (kind === 'scramble') {
      M.scramble = 1;
      M.msg = this.msgs[(Math.random() * this.msgs.length) | 0];
    } else if (kind === 'hue') {
      M.hue = 1;
      const hues = ['#3a5cff', '#ff9a50', '#40c8ff', '#ff58c0', '#8b6cff', '#7dff9a'];
      SHIP.cabin.set(hues[(Math.random() * hues.length) | 0]);
    } else if (kind === 'comet') {
      M.comet = 1;
      this.spawnComet();
    } else if (kind === 'bank') {
      SHIP.shake = Math.min(1, SHIP.shake + 0.35);
    } else if (kind === 'cam' && !SHIP.cinema) {
      const d = this.el.components.director;
      if (d && Math.random() < 0.5) d.nextCam();
    }
  },

  spawnComet: function () {
    const space = document.querySelector('#exterior');
    if (!space || !space.object3D) return;
    const T3 = AFRAME.THREE;
    if (!this._comet) {
      const g = new T3.BufferGeometry();
      const n = 48;
      const pos = new Float32Array(n * 3);
      g.setAttribute('position', new T3.BufferAttribute(pos, 3));
      const m = new T3.Points(g, new T3.PointsMaterial({
        size: 1.4, color: new T3.Color(2.5, 2.2, 1.6),
        transparent: true, opacity: 0.9, depthWrite: false,
        blending: T3.AdditiveBlending, toneMapped: false, sizeAttenuation: true
      }));
      m.frustumCulled = false;
      space.object3D.add(m);
      this._comet = { mesh: m, pos: pos, n: n, alive: 0, vx: 0, vy: 0, vz: 0, x: 0, y: 0, z: 0 };
    }
    const c = this._comet;
    c.alive = 1;
    c.x = rnd(-80, 80); c.y = rnd(-40, 50); c.z = rnd(-200, -80);
    c.vx = rnd(-40, 40); c.vy = rnd(-15, 15); c.vz = rnd(180, 320);
    c.mesh.visible = true;
  },

  tick: function (time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    const M = SHIP.mood;
    const au = SHIP.audio;
    const syn = SHIP.synth || { energy: 0 };

    M.pulse = damp(M.pulse, 0.35 + au.bass * 0.8 + syn.energy * 0.6, 3, dt);
    M.flare = Math.max(0, M.flare - dt * 0.55);
    M.scramble = Math.max(0, M.scramble - dt * 0.4);
    M.hue = Math.max(0, M.hue - dt * 0.25);
    M.comet = Math.max(0, M.comet - dt * 0.2);

    this.nextEvent -= dt;
    if (this.nextEvent <= 0) {
      const kinds = ['flare', 'scramble', 'hue', 'comet', 'bank', 'cam', 'scramble', 'comet'];
      this.fire(kinds[(Math.random() * kinds.length) | 0]);
      this.nextEvent = 6 + Math.random() * 10;
    }

    /* nebula / sun handled in space tick — mood drives pulse values only */

    /* comet trail */
    if (this._comet && this._comet.alive > 0) {
      const c = this._comet;
      c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
      c.alive -= dt * 0.35;
      for (let i = 0; i < c.n; i++) {
        const u = i / c.n;
        c.pos[i * 3] = c.x - c.vx * u * 0.12;
        c.pos[i * 3 + 1] = c.y - c.vy * u * 0.12;
        c.pos[i * 3 + 2] = c.z - c.vz * u * 0.12;
      }
      c.mesh.geometry.attributes.position.needsUpdate = true;
      c.mesh.material.opacity = Math.max(0, c.alive);
      if (c.alive <= 0 || c.z > 60) { c.alive = 0; c.mesh.visible = false; }
    }

    /* gentle auto camera wander when cinema is off */
    if (!SHIP.cinema) {
      this.camWander += dt;
      if (this.camWander > 22) {
        this.camWander = 0;
        const d = this.el.components.director;
        if (d && Math.random() < 0.65) d.nextCam();
      }
    }

    /* keep autoplay on so scenes keep evolving */
    if (SHIP.auto === false && SHIP.t > 2 && !this._autoNudged) {
      /* don't force — just leave; user may have toggled */
    }
  }
});
