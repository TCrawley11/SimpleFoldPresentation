/* 2D flow-matching toy (slide 6).
 *
 * Data: 2D points in two clusters, standing in for "two valid conformations".
 * Noise: Gaussian. Path: x_t = t*x + (1-t)*eps, target velocity x - eps (paper Eq. 2.1-2.2).
 *
 * "Training" mode draws random (noise, data) pairs: straight lines, constant arrows x - eps.
 * "Sampling" mode integrates the velocity field a perfect network would learn for this dataset.
 * For a finite dataset that field is exact:
 *   v*(x, t) = (E[x_data | x_t = x] - x) / (1 - t),
 * with posterior weights w_i proportional to exp(-|x - t*x_i - (1-t)*mu|^2 / (2 (1-t)^2 sigma^2)).
 * Trajectories curve, never cross, and split between the clusters: different noise -> different valid sample.
 */
(function () {
  "use strict";
  const { mulberry32, gaussian } = window.foldUtil;

  const W = 980, H = 640;
  const VIEW = { x0: -4.6, x1: 4.6, y0: -3.0, y1: 3.0 };
  const MU = [-2.4, 0], SIGMA = 0.75;               // noise distribution N(MU, SIGMA^2 I)
  const CLUSTERS = [[2.5, 1.25], [2.5, -1.25]];       // two "conformations"
  const COLORS = { ink: "#17191e", muted: "#676b73", faint: "#c9cbcf", teal: "#0e7c7b", rust: "#b4482c" };

  function sx(x) { return (x - VIEW.x0) / (VIEW.x1 - VIEW.x0) * W; }
  function sy(y) { return H - (y - VIEW.y0) / (VIEW.y1 - VIEW.y0) * H; }

  function makeData(rng) {
    const pts = [];
    CLUSTERS.forEach((c) => {
      for (let i = 0; i < 40; i++) {
        // little arcs rather than blobs, so the clusters read as "shapes"
        const a = (i / 39 - 0.5) * 2.2 + gaussian(rng) * 0.05;
        pts.push([c[0] + 0.45 * Math.sin(a) + gaussian(rng) * 0.06, c[1] + 0.45 * Math.cos(a) * Math.sign(c[1]) * -1 + gaussian(rng) * 0.06]);
      }
    });
    return pts;
  }

  function velocity(data, x, y, t) {
    const tt = Math.min(t, 0.995), s2 = 2 * (1 - tt) * (1 - tt) * SIGMA * SIGMA;
    let wsum = 0, mx = 0, my = 0, best = -Infinity;
    const logw = new Float64Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const dx = x - tt * data[i][0] - (1 - tt) * MU[0], dy = y - tt * data[i][1] - (1 - tt) * MU[1];
      logw[i] = -(dx * dx + dy * dy) / s2;
      if (logw[i] > best) best = logw[i];
    }
    for (let i = 0; i < data.length; i++) {
      const w = Math.exp(logw[i] - best); wsum += w; mx += w * data[i][0]; my += w * data[i][1];
    }
    return [(mx / wsum - x) / (1 - tt), (my / wsum - y) / (1 - tt)];
  }

  function arrow(ctx, x0, y0, x1, y1, color, width) {
    const a = Math.atan2(y1 - y0, x1 - x0), hl = 9 + width * 1.5;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * hl * 0.6, y1 - Math.sin(a) * hl * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - hl * Math.cos(a - 0.4), y1 - hl * Math.sin(a - 0.4));
    ctx.lineTo(x1 - hl * Math.cos(a + 0.4), y1 - hl * Math.sin(a + 0.4));
    ctx.closePath(); ctx.fill();
  }
  function dot(ctx, x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); }

  class FlowToy {
    constructor(root) {
      this.root = root;
      this.canvas = root.querySelector("canvas");
      this.ctx = this.canvas.getContext("2d");
      this.slider = root.querySelector("input[type=range]");
      this.tread = root.querySelector(".tread");
      this.modeBtns = root.querySelectorAll("[data-mode]");
      this.playBtn = root.querySelector("[data-play]");
      const rng = mulberry32(5);
      this.data = makeData(rng);
      this.pairs = Array.from({ length: 16 }, () => ({
        e: [MU[0] + gaussian(rng) * SIGMA, MU[1] + gaussian(rng) * SIGMA],
        x: this.data[Math.floor(rng() * this.data.length)],
      }));
      this.trajs = this._integrate(Array.from({ length: 70 }, () => [MU[0] + gaussian(rng) * SIGMA, MU[1] + gaussian(rng) * SIGMA]));
      this.mode = "train"; this.t = 0.35; this.tween = null;
      this.reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.canvas.width = W * dpr; this.canvas.height = H * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this.slider.addEventListener("input", () => { this.tween = null; this.t = this.slider.value / 1000; this.draw(); });
      // Hand arrow keys back to reveal.js after using the slider.
      this.slider.addEventListener("change", () => this.slider.blur());
      this.slider.addEventListener("pointerup", () => this.slider.blur());
      this.modeBtns.forEach((b) => b.addEventListener("click", () => { this.setMode(b.dataset.mode); b.blur(); }));
      this.playBtn.addEventListener("click", () => { this.play(); this.playBtn.blur(); });
      this.setMode("train");
    }
    _integrate(starts) {
      const STEPS = 240;
      return starts.map((p) => {
        const path = [[p[0], p[1]]];
        let x = p[0], y = p[1];
        for (let k = 0; k < STEPS; k++) {
          // plain Euler on a uniform grid (the paper uses Euler-Maruyama with log-spaced steps)
          const t0 = k / STEPS, t1 = (k + 1) / STEPS;
          const v = velocity(this.data, x, y, t0);
          x += v[0] * (t1 - t0); y += v[1] * (t1 - t0);
          path.push([x, y]);
        }
        return path;
      });
    }
    setMode(m) {
      this.mode = m;
      this.modeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
      this.root.querySelector(".toy-cap").innerHTML = m === "train"
        ? "<b>Training:</b> random (noise, structure) pairs on straight lines. The red arrow x \u2212 \u03b5 is the target the network learns."
        : "<b>Sampling:</b> no x given. Fresh noise follows the learned field (the average target) and lands on one of the shapes.";
      this.draw();
    }
    play() {
      if (this.reduced) { this.t = 1; this.draw(); return; }
      this.tween = { start: performance.now(), dur: 3600 };
      const step = (now) => {
        if (!this.tween) return;
        const u = Math.min(1, (now - this.tween.start) / this.tween.dur);
        this.t = u; this.draw();
        if (u < 1) requestAnimationFrame(step); else this.tween = null;
      };
      this.t = 0; requestAnimationFrame(step);
    }
    draw() {
      const ctx = this.ctx, t = this.t;
      this.slider.value = Math.round(t * 1000);
      this.tread.textContent = "t = " + t.toFixed(2);
      ctx.clearRect(0, 0, W, H);

      // noise region + data points (always visible, faint)
      ctx.strokeStyle = COLORS.faint; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.ellipse(sx(MU[0]), sy(MU[1]), 2 * SIGMA / (VIEW.x1 - VIEW.x0) * W, 2 * SIGMA / (VIEW.y1 - VIEW.y0) * H, 0, 0, 2 * Math.PI); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "20px 'Plex Mono', monospace"; ctx.fillStyle = COLORS.muted;
      ctx.fillText("noise  \u03b5 ~ N(0, I)", sx(MU[0]) - 105, sy(-2.15));
      ctx.fillText("data  x  (two valid shapes)", sx(1.25), sy(-2.15));
      this.data.forEach((p) => dot(ctx, sx(p[0]), sy(p[1]), 4, "rgba(14,124,123,0.35)"));

      if (this.mode === "train") {
        this.pairs.forEach(({ e, x }) => {
          ctx.strokeStyle = "rgba(23,25,30,0.13)"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(sx(e[0]), sy(e[1])); ctx.lineTo(sx(x[0]), sy(x[1])); ctx.stroke();
          dot(ctx, sx(e[0]), sy(e[1]), 4, COLORS.faint);
        });
        this.pairs.forEach(({ e, x }) => {
          const xt = [t * x[0] + (1 - t) * e[0], t * x[1] + (1 - t) * e[1]];
          const v = [x[0] - e[0], x[1] - e[1]], k = 0.13;
          arrow(ctx, sx(xt[0]), sy(xt[1]), sx(xt[0] + k * v[0]), sy(xt[1] + k * v[1]), COLORS.rust, 2.5);
          dot(ctx, sx(xt[0]), sy(xt[1]), 6, COLORS.ink);
        });
      } else {
        // faint field at the current t
        const tt = Math.min(t, 0.97);
        for (let gx = VIEW.x0 + 0.4; gx < VIEW.x1; gx += 0.55) {
          for (let gy = VIEW.y0 + 0.35; gy < VIEW.y1; gy += 0.55) {
            const v = velocity(this.data, gx, gy, tt), m = Math.hypot(v[0], v[1]) || 1, L = 0.22;
            arrow(ctx, sx(gx), sy(gy), sx(gx + L * v[0] / m), sy(gy + L * v[1] / m), "rgba(23,25,30,0.12)", 1.2);
          }
        }
        const idx = Math.round(t * (this.trajs[0].length - 1));
        this.trajs.forEach((path) => {
          ctx.strokeStyle = "rgba(14,124,123,0.45)"; ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(sx(path[0][0]), sy(path[0][1]));
          for (let k = 1; k <= idx; k++) ctx.lineTo(sx(path[k][0]), sy(path[k][1]));
          ctx.stroke();
          dot(ctx, sx(path[idx][0]), sy(path[idx][1]), 5.5, COLORS.ink);
        });
      }
    }
  }

  window.FlowToy = FlowToy;
})();
