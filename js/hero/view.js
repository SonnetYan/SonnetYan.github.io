// The hero on screen: draws the filter on a canvas, runs it in real time, and turns a click or tap
// into an observation. The math lives in filter.js; this file only shows it.
//
// - Starts when the canvas first has a size, so it can be mounted while hidden and starts on reveal.
// - Pauses when the canvas scrolls out of view or the tab is hidden; resumes where it left off.
// - Reduced motion: one still frame, the end of act 1. A click still adds an observation.
// - Colors come from the CSS tokens and follow theme changes.

import { createFilter } from "./filter.js";

const WIDE = 0.11, TIGHT = 0.045;  // cloud sizes where the estimate line is faintest and fully dark
const SHADES = [[0.8, 0.95, 2.1], [0.55, 0.75, 1.8], [0.3, 0.5, 1.5], [0.12, 0.3, 1.25], [0, 0.12, 1.1]];  // click: weight, alpha, radius

export function mountHero(canvas) {
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const f = createFilter();
  const { STEP, CLICK_R } = f;
  let W = 0, H = 0, started = false, running = false, visible = true, last = 0, acc = 0, lastClick = -1e9;
  let colors = null, shade = null;

  function readColors() {
    const css = getComputedStyle(document.documentElement), get = (name) => css.getPropertyValue(name).trim();
    colors = { ink: get("--ink"), ink2: get("--ink-2"), ink3: get("--ink-3") };
  }

  function confidence(size) {  // 0 while the cloud is wide, 1 once it is tight
    const c = Math.min(1, Math.max(0, (WIDE - size) / (WIDE - TIGHT)));
    return c * c;
  }

  function rgba(hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha.toFixed(3)})`;
  }

  function controls(p0, p1, p2, p3) {  // centripetal Catmull-Rom as Bezier handles: no loops, no cusps
    const d1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const d2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const d3 = Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
    const a1 = Math.sqrt(d1), a2 = Math.sqrt(d2), a3 = Math.sqrt(d3);
    const c1 = d1 < 1e-9 ? p1 : [0, 1].map((k) => (d1 * p2[k] - d2 * p0[k] + (2 * d1 + 3 * a1 * a2 + d2) * p1[k]) / (3 * a1 * (a1 + a2)));
    const c2 = d3 < 1e-9 ? p2 : [0, 1].map((k) => (d3 * p1[k] - d2 * p3[k] + (2 * d3 + 3 * a3 * a2 + d2) * p2[k]) / (3 * a3 * (a3 + a2)));
    return [c1, c2];
  }

  function dot(x, y, r) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 2 * Math.PI); }

  function cross(x, y, a) {
    ctx.beginPath();
    ctx.moveTo(x - a, y - a); ctx.lineTo(x + a, y + a);
    ctx.moveTo(x + a, y - a); ctx.lineTo(x - a, y + a);
    ctx.stroke();
  }

  function draw() {
    if (!W || !H) return;
    if (!colors) readColors();
    const { N, WD, px, py, ox, oy, obs, ana, clicks, click, camX, t } = f;
    const sx = W / WD, sy = H, X = (x) => (x - camX) * sx;
    const fade = (x) => Math.min(1, Math.max(0, (x / W - 0.02) / 0.2));  // things fade out before the left edge
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = colors.ink3;  // particles; while a click is weighed, each is shaded by its likelihood
    if (click) {
      if (!shade || shade.length !== N) shade = new Float64Array(N);
      const k = 1 / (2 * CLICK_R * CLICK_R);
      let top = 0;
      for (let i = 0; i < N; i++) {
        const dx = px[i] + ox[i] - click.z.x, dy = py[i] + oy[i] - click.z.y;
        shade[i] = Math.exp(-(dx * dx + dy * dy) * k);
        if (shade[i] > top) top = shade[i];
      }
      let hi = Infinity;
      for (const [lo, alpha, r] of SHADES) {
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        for (let i = 0; i < N; i++) {
          const v = shade[i] / top;
          if (v >= lo && v < hi) dot(X(px[i] + ox[i]), (py[i] + oy[i]) * sy, r);
        }
        ctx.fill();
        hi = lo;
      }
    } else {
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      for (let i = 0; i < N; i++) dot(X(px[i] + ox[i]), (py[i] + oy[i]) * sy, 1.3);
      ctx.fill();
    }

    ctx.strokeStyle = colors.ink3;  // data: small and light; older ones fade
    ctx.lineWidth = 1;
    obs.forEach((o, k) => {
      const x = X(o.x);
      ctx.globalAlpha = (0.3 + 0.55 * Math.exp(-(obs.length - 1 - k) / 6)) * fade(x);
      if (ctx.globalAlpha > 0.01) cross(x, o.y * sy, 2.5);
    });

    for (const c of clicks) {  // clicks: darker; a ring opens and fades as they land
      const x = X(c.x), y = c.y * sy, age = t - c.t, fx = fade(x);
      if (fx < 0.01) continue;
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = (0.5 + 0.4 * Math.exp(-age / 4)) * fx;
      cross(x, y, 3.5);
      if (age < 0.5) {
        ctx.strokeStyle = colors.ink2;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.55 * (1 - age / 0.5) * fx;
        ctx.beginPath();
        ctx.arc(x, y, 3 + 22 * (age / 0.5), 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    const pts = [];  // the estimate after each observation, then the live head; darker when the cloud is tight
    for (let k = 0; k < ana.length; k += 3) pts.push([X(ana[k]), ana[k + 1] * sy, ana[k + 2]]);
    if (pts.length) { const m = f.mean(); pts.push([X(m.x), m.y * sy, f.cloudSize()]); }
    if (pts.length < 2) return;
    const x0 = Math.min(...pts.map((p) => p[0])), span = Math.max(Math.max(...pts.map((p) => p[0])) - x0, 1);
    const grad = ctx.createLinearGradient(x0, 0, x0 + span, 0);
    let at = 0;
    for (const p of pts) {
      at = Math.max(at, (p[0] - x0) / span);
      grad.addColorStop(Math.min(at, 1), rgba(colors.ink, (0.1 + 0.9 * confidence(p[2])) * fade(p[0])));
    }
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < pts.length - 1; i++) {
      const [c1, c2] = controls(pts[Math.max(i - 1, 0)], pts[i], pts[i + 1], pts[Math.min(i + 2, pts.length - 1)]);
      ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], pts[i + 1][0], pts[i + 1][1]);
    }
    ctx.stroke();
  }

  function frame(now) {
    if (!visible || document.hidden) { running = false; last = 0; return; }  // paused off screen
    requestAnimationFrame(frame);
    if (last && now - last < 15) return;  // at most about 60 frames a second
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    acc += dt;
    while (acc >= STEP) { f.step(); acc -= STEP; }
    f.relax(dt);
    draw();
  }

  function kick() {
    if (running || reduce || !started || !visible || document.hidden) return;
    running = true;
    last = 0;
    requestAnimationFrame(frame);
  }

  // A click (or tap) is an observation: an x where you clicked, then the weighing, then the resample.
  canvas.addEventListener("click", (event) => {
    const now = performance.now();
    if (!started || now - lastClick < 300) return;
    lastClick = now;
    const box = canvas.getBoundingClientRect();
    f.clickAt({ x: f.camX + ((event.clientX - box.left) / box.width) * f.WD, y: (event.clientY - box.top) / box.height });
    if (reduce) { f.resolveClick(); f.settle(); }
    draw();
  });

  function resize() {
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = box.width; H = box.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!started) {
      started = true;
      f.init(W / H, W < 600 ? 400 : 700);
      if (reduce) { while (!f.done) f.step(); f.settle(); }  // reduced motion: the end of act 1, still
    }
    draw();
    kick();
  }

  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
  else { window.addEventListener("resize", resize); resize(); }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; kick(); }).observe(canvas);
  }
  document.addEventListener("visibilitychange", kick);
  const retheme = () => { readColors(); draw(); };
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", retheme);
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}
