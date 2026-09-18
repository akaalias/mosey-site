/* Mosey — the ring and the living field, for the web.
   A port of RoundDial (the ensō painter) and LivingBackdrop from the
   app's DesignSystem.swift. Same math, same rhythms: the choreography
   smoothed with a circular Gaussian, ten bristles each on its own
   clock, a walker's dot that breathes at ~3.4 s, and a 3×3 mesh of
   drifting colour whose visitor washes through about once a minute. */
(function (global) {
  'use strict';

  // ---------- The ring ----------
  const N = 360;
  const BRISTLES = [
    { lane: -0.82, share: 0.14, seed: 1.3,  laneRate: 0.50, laneSwing: 0.38, waveRate: 0.83, inkRate: 7.14 },
    { lane: -0.60, share: 0.18, seed: 2.9,  laneRate: 0.37, laneSwing: 0.49, waveRate: 1.11, inkRate: -5.27 },
    { lane: -0.38, share: 0.16, seed: 4.1,  laneRate: 0.66, laneSwing: 0.32, waveRate: 0.72, inkRate: 9.69 },
    { lane: -0.16, share: 0.20, seed: 5.6,  laneRate: 0.30, laneSwing: 0.57, waveRate: 0.99, inkRate: -4.08 },
    { lane:  0.06, share: 0.18, seed: 7.2,  laneRate: 0.56, laneSwing: 0.41, waveRate: 1.24, inkRate: 6.12 },
    { lane:  0.28, share: 0.16, seed: 8.4,  laneRate: 0.43, laneSwing: 0.46, waveRate: 0.78, inkRate: -10.71 },
    { lane:  0.50, share: 0.18, seed: 9.9,  laneRate: 0.70, laneSwing: 0.35, waveRate: 1.06, inkRate: 4.76 },
    { lane:  0.70, share: 0.14, seed: 11.3, laneRate: 0.34, laneSwing: 0.51, waveRate: 0.89, inkRate: -8.16 },
    { lane:  0.88, share: 0.12, seed: 12.8, laneRate: 0.61, laneSwing: 0.30, waveRate: 1.35, inkRate: 6.63 },
    { lane:  0.00, share: 0.10, seed: 14.7, laneRate: 0.46, laneSwing: 0.81, waveRate: 0.93, inkRate: -8.84 },
  ];

  function tremor(t, seed, drift) {
    drift = drift || 0;
    return 0.5 * Math.sin(2 * Math.PI * 3 * t + seed + drift)
         + 0.3 * Math.sin(2 * Math.PI * 7 * t + 2.1 * seed - 0.7 * drift)
         + 0.2 * Math.sin(2 * Math.PI * 13 * t + 3.7 * seed + 1.3 * drift);
  }

  /** The choreography, sampled and smoothed once per round. */
  function prepare(round, duration) {
    const beats = round.beats;
    function at(sec, key) {
      let v = 0;
      for (const b of beats) { if (b.t <= sec) v = b[key]; }
      return v;
    }
    const raw = { speed: [], incline: [] };
    for (let i = 0; i < N; i++) {
      const s = (i / N) * duration;
      raw.speed.push(at(s, 'speed'));
      raw.incline.push(at(s, 'incline'));
    }
    const sigma = N * 0.022, reach = Math.floor(sigma * 3);
    const w = [];
    let total = 0;
    for (let k = -reach; k <= reach; k++) { const x = Math.exp(-(k * k) / (2 * sigma * sigma)); w.push(x); total += x; }
    function smooth(v) {
      const out = new Array(N);
      for (let i = 0; i < N; i++) {
        let acc = 0;
        for (let k = 0; k < w.length; k++) acc += w[k] * v[((i + k - reach) % N + N) % N];
        out[i] = acc / total;
      }
      return out;
    }
    const speeds = smooth(raw.speed), inclines = smooth(raw.incline);
    const minS = Math.min.apply(null, speeds), maxS = Math.max(Math.max.apply(null, speeds), minS + 0.05);
    const maxI = Math.max(Math.max.apply(null, inclines), 1);
    return { speeds, inclines, minS, maxS, maxI };
  }

  /** Round.walkerColor: HSB brightness 0.97, saturation clamped 0.42–0.62; returns [r,g,b] 0–255. */
  function walkerColor(rgb) {
    const r = rgb[0], g = rgb[1], b = rgb[2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d > 0) {
      if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    const sat = max > 0 ? d / max : 0;
    const S = Math.max(0.42, Math.min(0.62, sat)), V = 0.97;
    const c = V * S, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = V - c;
    let q;
    if (h < 60) q = [c, x, 0]; else if (h < 120) q = [x, c, 0]; else if (h < 180) q = [0, c, x];
    else if (h < 240) q = [0, x, c]; else if (h < 300) q = [x, 0, c]; else q = [c, 0, x];
    return q.map((v) => Math.round((v + m) * 255));
  }

  class Ring {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {object} round  one entry of rounds.json
     * @param {object} opts   { duration, fraction, loopSeconds, still, opacity, walker }
     */
    constructor(canvas, round, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.opts = Object.assign({ duration: 1500, fraction: 0, loopSeconds: 0, still: false, walker: true, duet: null, dpr: Math.min(2, global.devicePixelRatio || 1) }, opts || {});
      // Two on the ring (the app, 2026-09-04): the human's ink is the round's
      // visitor colour lifted — bright, a little less saturated.
      this.humanColor = walkerColor(round.colors && round.colors[3] ? round.colors[3] : [0.9, 0.8, 0.6]);
      this.joinedLoop = -1;
      // The v3 book: every round carries its own duration; the option is the fallback.
      this.data = prepare(round, round.duration || this.opts.duration);
      // Rings on a page drift out of step with each other by a phase offset —
      // except a duet, which must begin at the beginning: the guide setting off.
      this.t0 = performance.now() / 1000 + (this.opts.duet ? 0 : (round.id ? round.id.length * 1.7 : 0));
      this.running = false;
      this._frame = this._frame.bind(this);
      this.resize();
    }
    resize() {
      const r = this.canvas.getBoundingClientRect();
      const dpr = this.opts.dpr;
      const side = Math.max(1, Math.min(r.width, r.height));
      this.canvas.width = Math.round(side * dpr);
      this.canvas.height = Math.round(side * dpr);
      this.side = side;
    }
    start() { if (!this.running) { this.running = true; requestAnimationFrame(this._frame); } }
    stop() { this.running = false; }
    _frame() {
      if (!this.running) return;
      this.draw();
      requestAnimationFrame(this._frame);
    }
    draw(now) {
      const time = (now === undefined ? performance.now() / 1000 : now) - this.t0;
      const o = this.opts;
      let fraction = o.fraction;
      if (o.loopSeconds > 0) fraction = ((time / o.loopSeconds) % 1 + 1) % 1;
      const ctx = this.ctx, dpr = o.dpr, side = this.side;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, side, side);
      const cx = side / 2, cy = side / 2;
      const R = side / 2 - Math.max(4, side * 0.03);
      const d = this.data;
      const still = o.still;
      const T = still ? 7.3 : time;
      // The duet: the guide walks from the start; the human waits at twelve,
      // then sweeps to catch up and keeps step — the bowl at the join.
      let human = -1;
      if (o.duet && o.loopSeconds > 0 && !still) {
        const loopIndex = Math.floor(time / o.loopSeconds);
        const tl = ((time % o.loopSeconds) + o.loopSeconds) % o.loopSeconds;
        const wait = o.duet.waitSeconds, catchUp = o.duet.catchSeconds;
        if (tl < wait) human = 0;
        else if (tl < wait + catchUp) { const u = (tl - wait) / catchUp; human = fraction * (1 - Math.pow(1 - u, 3)); }
        else human = fraction;
        if (tl >= wait + catchUp && this.joinedLoop !== loopIndex) {
          this.joinedLoop = loopIndex;
          if (typeof o.duet.onJoin === 'function') o.duet.onJoin();
        }
      }
      const HC = this.humanColor;

      const angle = (t) => -Math.PI / 2 + t * 2 * Math.PI;
      const point = (t, r) => [cx + r * Math.cos(angle(t)), cy + r * Math.sin(angle(t))];
      const baseWidth = Math.max(1.2, R * 0.020), climbWidth = R * 0.104;
      const radius = (x) => {
        const i = Math.floor(x) % N, j = (i + 1) % N, f = x - Math.floor(x);
        const s = d.speeds[i] * (1 - f) + d.speeds[j] * f;
        return R * 0.76 + (s - d.minS) / (d.maxS - d.minS) * R * 0.18;
      };
      const halfWidth = (x) => {
        const i = Math.floor(x) % N, j = (i + 1) % N, f = x - Math.floor(x);
        const inc = d.inclines[i] * (1 - f) + d.inclines[j] * f;
        const ragged = 1 + 0.10 * tremor(x / N, 0.3);
        return (baseWidth + inc / d.maxI * climbWidth) / 2 * ragged;
      };
      const xs = (a, b) => { const arr = []; for (let x = a; x < b; x += 1) arr.push(x); arr.push(b); return arr; };

      function outline(a, b) {
        const p = new Path2D();
        if (b <= a + 0.5) return p;
        const s = xs(a, b);
        let q = point(s[0] / N, radius(s[0]) + halfWidth(s[0])); p.moveTo(q[0], q[1]);
        for (let k = 1; k < s.length; k++) { q = point(s[k] / N, radius(s[k]) + halfWidth(s[k])); p.lineTo(q[0], q[1]); }
        for (let k = s.length - 1; k >= 0; k--) { q = point(s[k] / N, radius(s[k]) - halfWidth(s[k])); p.lineTo(q[0], q[1]); }
        p.closePath();
        return p;
      }
      function strand(br, a, b) {
        const p = new Path2D();
        if (b <= a + 0.5) return p;
        const s = xs(a, b);
        const lane = Math.max(-1, Math.min(1, br.lane + br.laneSwing * Math.sin(T * br.laneRate + br.seed)));
        const share = br.share * (1 + 0.40 * Math.sin(T * 0.55 + 2.2 * br.seed));
        const edge = (x, sign) => {
          const hw = halfWidth(x);
          const ripple = 1 + 0.42 * tremor(x / N, br.seed, T * br.waveRate);
          const lo = lane * (1 - share) * ripple;
          return point(x / N, radius(x) + hw * (lo + sign * share * ripple));
        };
        let q = edge(s[0], 1); p.moveTo(q[0], q[1]);
        for (let k = 1; k < s.length; k++) { q = edge(s[k], 1); p.lineTo(q[0], q[1]); }
        for (let k = s.length - 1; k >= 0; k--) { q = edge(s[k], -1); p.lineTo(q[0], q[1]); }
        p.closePath();
        return p;
      }
      const WHITE = [255, 255, 255];
      const rgba = (c, al) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + al + ')';
      function ink(br, opacity, color) {
        const g = ctx.createConicGradient ? ctx.createConicGradient((-90 + T * br.inkRate) * Math.PI / 180, cx, cy) : null;
        if (!g) return rgba(color, opacity * 0.7);
        for (let k = 0; k <= 48; k++) {
          const t = k / 48;
          const load = 0.55 + 0.45 * tremor(t, br.seed + 5.0, T * 0.09 * (br.seed % 1.7));
          const dry = load < 0.22 ? 0.25 : 1.0;
          g.addColorStop(t, rgba(color, Math.max(0, Math.min(1, opacity * Math.max(0, load) * dry))));
        }
        return g;
      }
      // color: the ink; pick: which bristles (the guide's are the even ones,
      // the human's the odd — interleaved across the lanes, as in the app).
      function paint(a, b, opacity, color, pick, washScale) {
        color = color || WHITE; washScale = washScale === undefined ? 1 : washScale;
        const body = outline(a, b);
        // The wash: no canvas filters (Safari), so widen the body with soft strokes instead.
        ctx.lineJoin = 'round';
        for (const [w, al] of [[R * 0.06, 0.04], [R * 0.035, 0.06], [R * 0.016, 0.10]]) {
          ctx.lineWidth = w; ctx.strokeStyle = rgba(color, opacity * al * washScale); ctx.stroke(body);
        }
        ctx.fillStyle = rgba(color, opacity * 0.12 * washScale); ctx.fill(body);
        BRISTLES.forEach((br, i) => { if (pick && !pick(i)) return; ctx.fillStyle = ink(br, opacity * 0.48, color); ctx.fill(strand(br, a, b)); });
      }

      paint(0, N, still ? 0.62 : (o.opacity || 0.22));
      const nowX = Math.min(N, Math.max(0, fraction * N));
      const humanX = human < 0 ? -1 : Math.min(N, Math.max(0, human * N));
      if (!still) {
        if (humanX < 0) paint(0, nowX, 0.78);
        else {
          paint(0, nowX, 0.78, WHITE, (i) => i % 2 === 0);
          paint(0, humanX, 0.85, HC, (i) => i % 2 === 1, 0.6);
        }
      }

      function walker(x, color, scale, breathPhase) {
        const breath = (Math.sin(time * 2 * Math.PI / 3.4 + breathPhase) + 1) / 2;
        const [nx, ny] = point(x / N, radius(x));
        const core = Math.max(2.8, R * 0.022) * (1 + breath * 0.18) * scale;
        const halo = core * (1.6 + breath * 1.6);
        const dot = (r, al) => { ctx.beginPath(); ctx.arc(nx, ny, r, 0, Math.PI * 2); ctx.fillStyle = rgba(color, al); ctx.fill(); };
        const glow = ctx.createRadialGradient(nx, ny, 0, nx, ny, halo * 2.2);
        glow.addColorStop(0, rgba(color, 0.10 + breath * 0.16)); glow.addColorStop(1, rgba(color, 0));
        ctx.beginPath(); ctx.arc(nx, ny, halo * 2.2, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();
        dot(halo, 0.10 + (1 - breath) * 0.16);
        dot(core, 0.95);
      }
      if (o.walker && !still) {
        // The guide's core a little larger, the human drawn over it — together
        // they read as one coloured heart in a white halo (2026-09-04).
        walker(nowX, WHITE, humanX < 0 ? 1 : 1.35, 0);
        if (humanX >= 0) walker(humanX, HC, 1, 0.6);
      }
    }
  }

  // ---------- The living field ----------
  class Field {
    /** @param {HTMLCanvasElement} canvas  @param {number[][]} colors  [light, accent, dark, visitor] as [r,g,b] 0–1 */
    constructor(canvas, colors) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d');
      this.setColors(colors);
      this.running = false; this._frame = this._frame.bind(this);
      this.resize();
      global.addEventListener('resize', () => this.resize());
    }
    setColors(colors) {
      const c = colors.map((v) => v.map((x) => Math.round(x * 255)));
      this.light = c[0]; this.accent = c[1] || c[0]; this.base = c[2] || c[c.length - 1]; this.visitor = c[3] || this.accent;
    }
    resize() {
      const r = this.canvas.getBoundingClientRect();
      this.w = this.canvas.width = Math.max(1, Math.round(r.width / 4));
      this.h = this.canvas.height = Math.max(1, Math.round(r.height / 4));
    }
    start() { if (!this.running) { this.running = true; requestAnimationFrame(this._frame); } }
    stop() { this.running = false; }
    _frame() { if (!this.running) return; this.draw(); requestAnimationFrame(this._frame); }
    draw() {
      const t = performance.now() / 1000;
      const osc = (p, ph) => (Math.sin(t * 2 * Math.PI / p + ph) + 1) / 2;
      const drift = (p, ph, amp) => amp * Math.sin(t * 2 * Math.PI / p + ph);
      const visit = (ph) => { const s = Math.sin(t * 2 * Math.PI / 47 + ph); return s > 0 ? s * s * s : 0; };
      const mix = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
      const L = this.light, A = this.accent, B = this.base, V = this.visitor;
      const nodes = [
        mix(L, A, 0.15 + 0.55 * osc(13, 0.7)),
        mix(L, V, 0.40 * visit(1.2)),
        mix(L, A, 0.15 + 0.55 * osc(17, 3.9)),
        mix(mix(A, L, 0.35 * osc(15, 1.7)), V, 0.50 * visit(0.6)),
        mix(mix(A, B, 0.15 + 0.40 * osc(9, 5.0)), V, 0.45 * visit(0.0)),
        mix(mix(A, B, 0.30 + 0.40 * osc(12, 2.2)), V, 0.40 * visit(-0.6)),
        B, mix(B, A, 0.15 + 0.35 * osc(14, 4.4)), B,
      ];
      const pts = [
        [0, 0], [0.5 + drift(16, 0.0, 0.22), 0], [1, 0],
        [0, 0.45 + drift(19, 1.1, 0.16)], [0.42 + drift(11, 2.3, 0.26), 0.52 + drift(14, 4.0, 0.24)], [1, 0.55 + drift(17, 5.2, 0.16)],
        [0, 1], [0.5 + drift(21, 3.1, 0.22), 1], [1, 1],
      ];
      const ctx = this.ctx, w = this.w, h = this.h;
      ctx.fillStyle = 'rgb(' + B.join(',') + ')'; ctx.fillRect(0, 0, w, h);
      const rad = Math.max(w, h) * 0.62;
      for (let i = 0; i < 9; i++) {
        const [x, y] = [pts[i][0] * w, pts[i][1] * h];
        const c = nodes[i].map(Math.round);
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, 'rgba(' + c.join(',') + ',0.85)');
        g.addColorStop(1, 'rgba(' + c.join(',') + ',0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
    }
  }

  // ---------- The joining bowl ----------
  // Bell.swift on the web: the CC0 bowl (Freesound #193022) struck three
  // times, the later strikes re-pitched into one of five small phrases,
  // never the same twice running. Browsers need a gesture before sound:
  // call unlock() from a click, then play() whenever the human joins.
  class Bowl {
    constructor(url) {
      this.url = url; this.ctx = null; this.buffer = null; this.last = -1; this.enabled = false;
      this.phrases = [
        [[1, 0], [1.2599, 0.55], [1.4983, 1.10]],
        [[1, 0], [1.3348, 0.55], [1.6818, 1.10]],
        [[1, 0], [1.4983, 0.55], [2.0, 1.10]],
        [[1, 0], [1.4983, 0.55], [1.2599, 1.10]],
        [[1, 0], [1.1225, 0.55], [1.3348, 1.10]],
      ];
    }
    unlock() {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return Promise.resolve(false);
      if (!this.ctx) this.ctx = new AC();
      const resume = this.ctx.state === 'suspended' ? this.ctx.resume() : Promise.resolve();
      const load = this.buffer ? Promise.resolve() : fetch(this.url).then((r) => r.arrayBuffer()).then((ab) => this.ctx.decodeAudioData(ab)).then((b) => { this.buffer = b; });
      return Promise.all([resume, load]).then(() => true).catch(() => false);
    }
    play() {
      if (!this.enabled || !this.ctx || !this.buffer) return;
      let i = Math.floor(Math.random() * this.phrases.length);
      while (i === this.last) i = Math.floor(Math.random() * this.phrases.length);
      this.last = i;
      const master = this.ctx.createGain(); master.gain.value = 0.35; master.connect(this.ctx.destination);
      const t0 = this.ctx.currentTime + 0.02;
      this.phrases[i].forEach((strike, k) => {
        const src = this.ctx.createBufferSource(); src.buffer = this.buffer; src.playbackRate.value = strike[0];
        const g = this.ctx.createGain(); g.gain.value = k === 0 ? 1 : 0.85;
        src.connect(g); g.connect(master); src.start(t0 + strike[1]);
      });
    }
  }


  /** The walk window: the app's walk screen for one round — the field drawn once, the ring live while
   *  `start()`ed, the meters read off the round's beats at the ring's own point in its 60-second loop. */
  function WalkWindow(round, opts) {
    opts = Object.assign({ duration: round.duration || 1500, reduce: false, duet: true }, opts || {});
    const el = document.createElement('div'); el.className = 'walk-window';
    el.innerHTML = '<canvas class="field" aria-hidden="true"></canvas>'
      + '<div class="meters" aria-hidden="true"><div class="meter"><b class="kmh">2.0</b><span>km/h</span></div><div class="meter"><b class="climb">0</b><span>climb level</span></div></div>'
      + '<div class="meter togo" aria-hidden="true"><b class="left">' + round.minutes + '</b><span>min to go</span></div>'
      + '<div class="stage" aria-hidden="true"><div class="kicker"></div><h3></h3><p></p></div>'
      + '<canvas class="ring" width="640" height="640" aria-hidden="true"></canvas>';
    el.querySelector('.kicker').textContent = ((round.kicker || 'Anywhere') + ' · ' + round.minutes + ' min').toUpperCase();
    el.querySelector('h3').textContent = round.title;
    el.querySelector('p').textContent = round.subtitle;
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', round.title + ' as Mosey shows it during the walk: its name and its reason inside the ring — radius is pace, thickness is the hill, light is how far you have come — pace and climb top right, minutes to go bottom right.');
    const reduce = opts.reduce, dur = opts.duration;
    let field = null, ring = null, timer = null;
    function beatAt(sec, key) { let v = 0; (round.beats || []).forEach((b) => { if (b.t <= sec) v = b[key]; }); return v; }
    function readouts() {
      const f = reduce || !ring ? 0 : ((((performance.now() / 1000) - ring.t0) / 60) % 1 + 1) % 1;
      const sec = f * dur;
      el.querySelector('.kmh').textContent = beatAt(sec, 'speed').toFixed(1);
      el.querySelector('.climb').textContent = beatAt(sec, 'incline');
      el.querySelector('.left').textContent = Math.max(1, Math.ceil((dur - sec) / 60));
    }
    // Built lazily: the canvases need their laid-out size, so the window is mounted first, then `mount()`ed.
    function mount() {
      if (field) return;
      field = new Field(el.querySelector('.field'), round.colors); field.draw();
      ring = new Ring(el.querySelector('.ring'), round, { duration: dur, loopSeconds: 60, duet: (opts.duet && !reduce) ? { waitSeconds: 9, catchSeconds: 4 } : null });
      ring.draw(); readouts();
    }
    return {
      el,
      mount,
      start() { mount(); if (reduce) { ring.draw(); readouts(); return; } ring.start(); readouts(); if (!timer) timer = setInterval(readouts, 500); },
      stop() { if (ring) ring.stop(); if (timer) { clearInterval(timer); timer = null; } },
      resize() { if (field) { field.resize(); field.draw(); } if (ring) { ring.resize(); ring.draw(); } },
    };
  }

  global.Mosey = { Ring, Field, Bowl, WalkWindow, prepare, walkerColor };
})(window);
