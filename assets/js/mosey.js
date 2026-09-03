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

  class Ring {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {object} round  one entry of rounds.json
     * @param {object} opts   { duration, fraction, loopSeconds, still, opacity, walker }
     */
    constructor(canvas, round, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.opts = Object.assign({ duration: 1500, fraction: 0, loopSeconds: 0, still: false, walker: true, dpr: Math.min(2, global.devicePixelRatio || 1) }, opts || {});
      this.data = prepare(round, this.opts.duration);
      this.t0 = performance.now() / 1000 + (round.id ? round.id.length * 1.7 : 0);
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
      function ink(br, opacity) {
        const g = ctx.createConicGradient ? ctx.createConicGradient((-90 + T * br.inkRate) * Math.PI / 180, cx, cy) : null;
        if (!g) return 'rgba(255,255,255,' + (opacity * 0.7) + ')';
        for (let k = 0; k <= 48; k++) {
          const t = k / 48;
          const load = 0.55 + 0.45 * tremor(t, br.seed + 5.0, T * 0.09 * (br.seed % 1.7));
          const dry = load < 0.22 ? 0.25 : 1.0;
          g.addColorStop(t, 'rgba(255,255,255,' + Math.max(0, Math.min(1, opacity * Math.max(0, load) * dry)) + ')');
        }
        return g;
      }
      function paint(a, b, opacity) {
        const body = outline(a, b);
        // The wash: no canvas filters (Safari), so widen the body with soft strokes instead.
        ctx.lineJoin = 'round';
        for (const [w, al] of [[R * 0.06, 0.04], [R * 0.035, 0.06], [R * 0.016, 0.10]]) {
          ctx.lineWidth = w; ctx.strokeStyle = 'rgba(255,255,255,' + (opacity * al) + ')'; ctx.stroke(body);
        }
        ctx.fillStyle = 'rgba(255,255,255,' + (opacity * 0.12) + ')'; ctx.fill(body);
        for (const br of BRISTLES) { ctx.fillStyle = ink(br, opacity * 0.48); ctx.fill(strand(br, a, b)); }
      }

      paint(0, N, still ? 0.62 : (o.opacity || 0.22));
      const nowX = Math.min(N, Math.max(0, fraction * N));
      if (!still) paint(0, nowX, 0.78);

      if (o.walker && !still) {
        const breath = (Math.sin(time * 2 * Math.PI / 3.4) + 1) / 2;
        const [nx, ny] = point(nowX / N, radius(nowX));
        const core = Math.max(2.8, R * 0.022) * (1 + breath * 0.18);
        const halo = core * (1.6 + breath * 1.6);
        const dot = (r, al) => { ctx.beginPath(); ctx.arc(nx, ny, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,' + al + ')'; ctx.fill(); };
        const glow = ctx.createRadialGradient(nx, ny, 0, nx, ny, halo * 2.2);
        glow.addColorStop(0, 'rgba(255,255,255,' + (0.10 + breath * 0.16) + ')'); glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath(); ctx.arc(nx, ny, halo * 2.2, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();
        dot(halo, 0.10 + (1 - breath) * 0.16);
        dot(core, 0.95);
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

  global.Mosey = { Ring, Field, prepare };
})(window);
