/* Static figures computed from real data + deck wiring (reveal.js, KaTeX, 3Dmol, animations). */
(function () {
  "use strict";
  const T = window.TTR;
  const { mulberry32, gaussian } = window.foldUtil;

  /* ---------- slide 3: illustrative MSA built around the real TTR sequence ---------- */
  function buildMSA(el) {
    const q = T.seq.slice(8, 26);                     // 18 residues of the real query
    const rows = [{ s: q, tag: "this protein", q: true }];
    const names = ["human", "mouse", "chicken", "frog", "zebrafish"];
    // columns 4 and 13 co-vary: when one changes, so does the other (the signal MSAs exploit)
    const coA = 4, coB = 13, subs = "ILVFMKREDNQSTAG";
    const rng = mulberry32(3);
    names.forEach((n, r) => {
      const s = q.split("");
      for (let k = 0; k < s.length; k++) if (k !== coA && k !== coB && rng() < 0.18) s[k] = subs[Math.floor(rng() * subs.length)];
      if (r % 2 === 0) { s[coA] = "K"; s[coB] = "E"; }
      rows.push({ s: s.join(""), tag: n, ref: q });
    });
    el.innerHTML = rows.map((row) => {
      const chars = row.s.split("").map((c, k) => {
        const cls = [];
        if (k === coA || k === coB) cls.push("colA");
        if (!row.q && c !== row.ref[k]) cls.push("mut");
        return cls.length ? `<span class="${cls.join(" ")}">${c}</span>` : c;
      }).join("");
      return `<div class="row${row.q ? " q" : ""}">${chars}<span class="tag">${row.tag}</span></div>`;
    }).join("");
  }

  /* ---------- slide 3: real pairwise CA distance map of the TTR prediction ---------- */
  function drawDistanceMap(canvas) {
    const ca = T.atoms.filter((a) => a[5] === "CA");
    const n = ca.length, size = 400, dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr; canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cell = size / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const d = Math.hypot(ca[i][0] - ca[j][0], ca[i][1] - ca[j][1], ca[i][2] - ca[j][2]);
      const u = Math.min(1, d / 30);                  // 0 A dark rust -> 30+ A paper
      const c0 = [180, 72, 44], c1 = [250, 250, 247], g = Math.pow(u, 0.6);
      ctx.fillStyle = `rgb(${c0[0] + (c1[0] - c0[0]) * g | 0},${c0[1] + (c1[1] - c0[1]) * g | 0},${c0[2] + (c1[2] - c0[2]) * g | 0})`;
      ctx.fillRect(i * cell, j * cell, cell + 0.5, cell + 0.5);
    }
  }

  /* ---------- slide 5: same interpolant on an image and on a protein ---------- */
  function noisyImageFrames(img, canvases) {
    const S = 128;
    const src = document.createElement("canvas"); src.width = S; src.height = S;
    const sctx = src.getContext("2d"); sctx.drawImage(img, 0, 0, S, S);
    const base = sctx.getImageData(0, 0, S, S).data;
    const rng = mulberry32(9);
    const eps = new Float32Array(S * S * 3).map(() => gaussian(rng));
    canvases.forEach((cv) => {
      const t = parseFloat(cv.dataset.t);
      cv.width = S; cv.height = S;
      const ctx = cv.getContext("2d"), out = ctx.createImageData(S, S);
      for (let p = 0, q = 0; p < S * S * 4; p += 4, q += 3) {
        for (let c = 0; c < 3; c++) {
          const x = base[p + c] / 127.5 - 1;           // image scaled to [-1, 1], like image diffusion models
          const v = t * x + (1 - t) * eps[q + c];
          out.data[p + c] = Math.max(0, Math.min(255, (v + 1) * 127.5));
        }
        out.data[p + 3] = 255;
      }
      ctx.putImageData(out, 0, 0);
    });
  }
  function proteinFrames(scene, canvases) {
    canvases.forEach((cv) => {
      const t = parseFloat(cv.dataset.t), s = 200, dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = s * dpr; cv.height = s * dpr;
      const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      window.renderFold(ctx, s, s, scene, t, 0.6, { fit: 0.46, dot: 7, line: 9 });
    });
  }

  /* ---------- slide 2: 3D cartoon of the prediction ---------- */
  let mol = null;
  function initMol(el) {
    if (mol || !window.$3Dmol) return;
    mol = $3Dmol.createViewer(el, { backgroundColor: "#fafaf7", antialias: true });
    mol.addModel(T.pred_pdb, "pdb");
    mol.setStyle({}, { cartoon: { colorfunc: (atom) => rampHex(atom.resi), thickness: 0.6 } });
    mol.zoomTo(); mol.zoom(1.15); mol.render();
    mol.spin("y", 0.35);
  }
  function rampHex(resi) {
    const RAMP = [[143, 208, 200], [14, 124, 123], [24, 58, 88]];
    const f = Math.max(0, Math.min(1, (resi - 1) / (T.nres - 1))), s = f * 2, i = Math.min(1, Math.floor(s)), u = s - i;
    const c = RAMP[i].map((v, k) => Math.round(v + (RAMP[i + 1][k] - v) * u));
    return (c[0] << 16) | (c[1] << 8) | c[2];
  }

  /* ---------- wiring ---------- */
  function texAll() {
    document.querySelectorAll(".tex").forEach((el) => {
      katex.render(el.dataset.tex || el.textContent, el, { throwOnError: false, displayMode: false });
    });
  }

  function init() {
    texAll();
    buildMSA(document.getElementById("msa"));
    drawDistanceMap(document.getElementById("distmap"));
    document.getElementById("seq").textContent = T.seq;

    const scene = new FoldScene(T, 11);
    proteinFrames(scene, document.querySelectorAll(".pframes canvas"));
    const img = new Image();
    img.onload = () => noisyImageFrames(img, document.querySelectorAll(".iframes canvas"));
    img.src = window.WAVE_PNG;   // data URL: avoids canvas tainting when opened from file://

    const tLabel = (id) => (t) => { document.getElementById(id).textContent = t.toFixed(2); };
    const hook = new FoldAnim(document.getElementById("hook-canvas"), scene, { onT: tLabel("hook-t"), fit: 0.4 });
    const end = new FoldAnim(document.getElementById("end-canvas"), scene, { onT: tLabel("end-t"), fit: 0.4 });
    const toy = new FlowToy(document.getElementById("toy"));

    function onSlide(ev) {
      const id = ev.currentSlide.id;
      hook.stop(); end.stop();
      if (id === "s-hook") { hook.start(); }
      if (id === "s-end") { end.setT(0); end.start(); setTimeout(() => end.play(5000), 600); }
      if (id === "s-problem") {
        if (mol) { mol.resize(); mol.render(); mol.spin("y", 0.35); } else initMol(document.getElementById("mol"));
      } else if (mol) mol.spin(false);   // a spinning viewer on a hidden slide renders into a zero-size buffer
    }
    Reveal.on("ready", onSlide);
    Reveal.on("slidechanged", onSlide);
    Reveal.on("fragmentshown", (ev) => { if (ev.fragment.dataset.fold === "play") hook.play(4800); });
    Reveal.on("fragmenthidden", (ev) => { if (ev.fragment.dataset.fold === "play") hook.setT(0); });
    document.getElementById("hook-canvas").addEventListener("click", () => hook.play(4800));
    document.getElementById("end-canvas").addEventListener("click", () => end.play(4800));
    Reveal.on("resize", () => { hook.resize(); end.resize(); });

    Reveal.initialize({
      width: 1920, height: 1080, margin: 0, minScale: 0.1, maxScale: 2,
      center: false, hash: true, history: false, controls: false, progress: true,
      slideNumber: "c/t", transition: "fade", transitionSpeed: "fast", backgroundTransition: "none",
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
