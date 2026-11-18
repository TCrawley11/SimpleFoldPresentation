/* Noise -> structure animation for the hook and closing slides.
 *
 * What is real: the end point is SimpleFold-3B's released prediction for CAMEO22 target 7RLK chain D
 * (wallaby transthyretin), 920 heavy atoms, from Apple's cameo22_predictions.zip.
 * What is schematic: the path. We draw the flow-matching training interpolant
 *   x_t = t * x + (1 - t) * eps,  eps ~ N(0, I) in the model's units,
 * which is a straight line per atom. SimpleFold's actual sampler (Euler-Maruyama SDE, paper Eq. 2.5)
 * follows a curved, noisy path between the same end points.
 */
(function () {
  "use strict";

  // SimpleFold scales coordinates by 1/16 (paper App. 6), so unit Gaussian noise is ~16 Angstrom in real space.
  const NOISE_ANGSTROM = 16;

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gaussian(rng) {
    let u = 0;
    while (u === 0) u = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
  }
  function percentileRadius(xs, ys, zs, q) {
    const r = Array.from(xs, (_, i) => Math.hypot(xs[i], ys[i], zs[i])).sort((a, b) => a - b);
    return r[Math.floor(q * (r.length - 1))];
  }

  // Residue-index colour ramp (N-terminus light teal -> C-terminus deep blue-green), one hue family.
  const RAMP = [[143, 208, 200], [14, 124, 123], [24, 58, 88]];
  function rampColor(f) {
    const s = f * (RAMP.length - 1), i = Math.min(RAMP.length - 2, Math.floor(s)), u = s - i;
    const a = RAMP[i], b = RAMP[i + 1];
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  }

  class FoldScene {
    constructor(data, seed) {
      const n = data.atoms.length;
      this.n = n;
      this.x = new Float32Array(n); this.y = new Float32Array(n); this.z = new Float32Array(n);
      this.ex = new Float32Array(n); this.ey = new Float32Array(n); this.ez = new Float32Array(n);
      this.col = new Array(n);
      this.ca = [];
      const rng = mulberry32(seed || 11);
      data.atoms.forEach((a, i) => {
        this.x[i] = a[0]; this.y[i] = a[1]; this.z[i] = a[2];
        this.ex[i] = gaussian(rng) * NOISE_ANGSTROM;
        this.ey[i] = gaussian(rng) * NOISE_ANGSTROM;
        this.ez[i] = gaussian(rng) * NOISE_ANGSTROM;
        this.col[i] = rampColor(a[3] / (data.nres - 1));
        if (a[5] === "CA") this.ca.push(i);
      });
      this.rData = percentileRadius(this.x, this.y, this.z, 0.97);
      this.rNoise = percentileRadius(this.ex, this.ey, this.ez, 0.97);
      this.px = new Float32Array(n); this.py = new Float32Array(n); this.pz = new Float32Array(n);
      this.order = new Uint16Array(n).map((_, i) => i);
    }
  }

  function smoothstep(a, b, v) {
    const s = Math.min(1, Math.max(0, (v - a) / (b - a)));
    return s * s * (3 - 2 * s);
  }

  // Draw the scene at flow time t, rotated by `angle` around the vertical axis.
  function renderFold(ctx, w, h, scene, t, angle, opts) {
    opts = opts || {};
    const tilt = 0.3, ca = Math.cos(angle), sa = Math.sin(angle), ct = Math.cos(tilt), st = Math.sin(tilt);
    const n = scene.n;
    // Expected spread of x_t, used as an automatic camera zoom so the cloud and the protein both fill the frame.
    const R = Math.hypot((1 - t) * scene.rNoise, t * scene.rData);
    const fit = (opts.fit || 0.42) * Math.min(w, h) / R;
    const cam = 4 * R;
    for (let i = 0; i < n; i++) {
      const X = t * scene.x[i] + (1 - t) * scene.ex[i];
      const Y = t * scene.y[i] + (1 - t) * scene.ey[i];
      const Z = t * scene.z[i] + (1 - t) * scene.ez[i];
      const x1 = ca * X + sa * Z, z1 = -sa * X + ca * Z;
      const y2 = ct * Y - st * z1, z2 = st * Y + ct * z1;
      const p = cam / (cam - z2);
      scene.px[i] = w / 2 + x1 * fit * p;
      scene.py[i] = h / 2 - y2 * fit * p;
      scene.pz[i] = z2 / R;
    }
    scene.order.sort((a, b) => scene.pz[a] - scene.pz[b]);
    ctx.clearRect(0, 0, w, h);

    const s = smoothstep(0.82, 1.0, t);           // how "folded" it looks: fade dots back, bring the chain forward
    const dotR = (opts.dot || 4.2) * Math.min(w, h) / 900;
    const dotAlpha = 0.9 - 0.72 * s;
    for (let k = 0; k < n; k++) {
      const i = scene.order[k], d = 0.55 + 0.45 * (scene.pz[i] + 1) / 2, c = scene.col[i];
      ctx.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${dotAlpha * d})`;
      ctx.beginPath();
      ctx.arc(scene.px[i], scene.py[i], dotR * (0.7 + 0.5 * d), 0, 2 * Math.PI);
      ctx.fill();
    }
    if (s > 0) {
      // Smooth backbone trace through the CA atoms: one quadratic piece per residue, drawn back-to-front.
      const lw = (opts.line || 7) * Math.min(w, h) / 900;
      const ca = scene.ca, m = ca.length;
      const mid = (a, b) => [(scene.px[a] + scene.px[b]) / 2, (scene.py[a] + scene.py[b]) / 2];
      const segs = [];
      for (let k = 0; k < m; k++) segs.push(k);
      segs.sort((a, b) => scene.pz[ca[a]] - scene.pz[ca[b]]);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (const k of segs) {
        const i = ca[k], c = scene.col[i], d = 0.6 + 0.4 * (scene.pz[i] + 1) / 2;
        const p0 = k > 0 ? mid(ca[k - 1], i) : [scene.px[i], scene.py[i]];
        const p1 = k < m - 1 ? mid(i, ca[k + 1]) : [scene.px[i], scene.py[i]];
        ctx.strokeStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${s})`;
        ctx.lineWidth = lw * (0.75 + 0.45 * d);
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(scene.px[i], scene.py[i], p1[0], p1[1]); ctx.stroke();
      }
    }
  }

  // Live canvas: slow rotation, t controlled by play()/setT().
  class FoldAnim {
    constructor(canvas, scene, opts) {
      this.canvas = canvas; this.scene = scene; this.opts = opts || {};
      this.ctx = canvas.getContext("2d");
      this.t = this.opts.t0 || 0; this.angle = 0.6; this.running = false; this.tween = null;
      this.reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this._frame = this._frame.bind(this);
    }
    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (!w || !h) return;
      this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.w = w; this.h = h;
    }
    start() { if (this.running) return; this.running = true; this.resize(); this.last = performance.now(); requestAnimationFrame(this._frame); }
    stop() { this.running = false; }
    setT(t) { this.tween = null; this.t = t; this._report(); }
    play(ms) {
      if (this.reduced) { this.setT(1); return; }
      this.tween = { from: this.t >= 1 ? 0 : this.t, start: performance.now(), dur: ms || 4200 };
    }
    _report() { if (this.opts.onT) this.opts.onT(this.t); }
    _frame(now) {
      if (!this.running) return;
      const dt = Math.min(64, now - this.last); this.last = now;
      if (!this.reduced) this.angle += dt * 0.00018;
      if (this.tween) {
        const u = Math.min(1, (now - this.tween.start) / this.tween.dur);
        const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;   // ease in-out on wall-clock, t itself stays the flow time
        this.t = this.tween.from + (1 - this.tween.from) * e;
        this._report();
        if (u >= 1) this.tween = null;
      }
      if (!this.w) this.resize();
      if (this.w) renderFold(this.ctx, this.w, this.h, this.scene, this.t, this.angle, this.opts);
      requestAnimationFrame(this._frame);
    }
  }

  window.FoldScene = FoldScene;
  window.FoldAnim = FoldAnim;
  window.renderFold = renderFold;
  window.foldUtil = { mulberry32, gaussian, NOISE_ANGSTROM };
})();
