// The hero's particle filter: the math only. No canvas, no DOM, no clock; the view calls step()
// once per fixed STEP and reads the state to draw it. Everything between PF-CORE-START and
// PF-CORE-END is the filter exactly as first published; change it only on purpose.
//
// State the view reads: N particles at (px, py), each drawn at (px + ox, py + oy) so dots glide;
// obs (data marks), clicks, ana (the estimate after each observation: x, y, spread triples),
// t (seconds), camX (left edge of the view, world units), WD (view width), click (a click being weighed).

export function createFilter() {
  // PF-CORE-START
  // A particle filter in the classic data assimilation setup: the model knows how the system moves,
  // but not where it is, and the truth runs the same model (an identical-twin experiment).
  // Act 1, 9 s: a known path; the cloud narrows like a funnel.
  // Act 2, endless: the path wanders (a damped spring driven by noise) and the filter models that noise.
  // The view scrolls; now and then a blind spell or a sharp turn tests the filter.
  // Each observation is assimilated in a few gentle sub-steps (tempering).
  // A click is an observation too, noisier than the data: the cloud listens a little, then trusts the data.
  // World units are hero heights; the view is WD heights wide.
  const T = 9;                 // length of act 1, seconds
  const STEP = 1 / 60;         // fixed simulation step, seconds
  const R = 0.2;               // data observation noise (standard deviation): each observation says little
  const DRIFT = 0.012;         // model error in position: a small random walk, per square-root second
  const PARTS = 4;             // sub-steps per data observation
  const JITTER = 0.1;          // Liu-West jitter after each resample: same mean and spread, more variety
  const PRIOR = 0.17;          // prior: a soft round cloud near the start of the path
  const GAPS = [0.9, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3];  // act 1: the first observations come slowly
  const GAP = 0.25;            // then one every GAP seconds
  const THETA = 0.15, KAPPA = 0.25, SIGMA = 0.025;  // act 2 wander: damping, spring, noise on vertical speed
  const R2 = 0.1;              // act 2 data noise, reached over 4 s: better data, so losing it matters
  const MODEL_X = 0.015, MODEL_Y = 0.035;  // act 2 position noise, the same for the truth and the model
  const SLOW = 0.75;           // act 2 moves at 75% of act 1's speed
  const KEEP = 0.7;            // the view keeps the estimate at 70% of its width
  const CLICK_R = 0.25;        // a click is noisier than the data
  const HOLD = 0.4;            // seconds a click's weights stay visible before the resample

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let rand = mulberry32(1), spare = null;
  function gauss() {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u = 0; while (u === 0) u = rand();
    const v = rand(), m = Math.sqrt(-2 * Math.log(u));
    spare = m * Math.sin(2 * Math.PI * v);
    return m * Math.cos(2 * Math.PI * v);
  }

  let N = 700, WD = 2.5, X0 = 0.4, X1 = 2.3, V0 = 0.2;
  let px, py, vy, zx, zy, ox, oy, w, back, lw, idx;  // particles, a second set for resampling, scratch
  let obs, ana, clicks, t, stepNo, obsCount, nextObs, pending, click, done;
  let tx, ty, tvy, camX, camV, nextEvent, blindUntil, turnUntil, turnAcc, lam;

  function truth(time) {  // act 1: the hidden path; the filter never sees it
    const u = Math.min(time / T, 1);
    return { x: X0 + (X1 - X0) * u, y: 0.5 + 0.14 * Math.sin(2 * Math.PI * u + 0.3) };
  }

  function flow(time) {  // act 1: the known model, how any state moves during one step
    const a = truth(time), b = truth(time + STEP);
    return { x: b.x - a.x, y: b.y - a.y };
  }

  function speed(time) {  // act 2: horizontal speed, easing down from act 1's
    const k = Math.min(Math.max((time - T) / 2.5, 0), 1);
    return V0 * (1 - (1 - SLOW) * k * k * (3 - 2 * k));
  }

  function noiseAt(time) {  // data noise: R in act 1, easing to R2 in act 2; the filter always knows it
    const k = Math.min(Math.max((time - T) / 4, 0), 1);
    return R - (R - R2) * k * k * (3 - 2 * k);
  }

  function pull(y, v) {  // act 2: damping and a spring toward the middle, with soft walls near the edges
    return -THETA * v - KAPPA * (y - 0.5) - 6 * (Math.max(0, y - 0.8) - Math.max(0, 0.2 - y));
  }

  function alloc() {
    const f = () => new Float64Array(N);
    return { px: f(), py: f(), vy: f(), zx: f(), zy: f(), ox: f(), oy: f() };
  }

  function init(aspect, count) {
    N = count;
    WD = Math.min(Math.max(aspect, 1.3), 3.4);
    X0 = Math.min(0.42, 0.25 * WD); X1 = WD - 0.16; V0 = (X1 - X0) / T;
    rand = mulberry32(20260926); spare = null;
    ({ px, py, vy, zx, zy, ox, oy } = alloc());
    back = alloc();
    w = new Float64Array(N).fill(1 / N); lw = new Float64Array(N); idx = new Int32Array(N);
    const s = truth(0);
    for (let i = 0; i < N; i++) {  // prior: a round Gaussian cloud, a little off the truth
      px[i] = s.x + 0.04 + PRIOR * gauss();
      py[i] = s.y - 0.05 + PRIOR * gauss();
    }
    zx.set(px); zy.set(py);
    obs = []; ana = []; clicks = [];
    t = 0; stepNo = 0; obsCount = 0; nextObs = GAPS[0]; pending = null; click = null; done = false;
    camX = 0; camV = 0;
  }

  function mean() {
    let mx = 0, my = 0;
    for (let i = 0; i < N; i++) { mx += w[i] * px[i]; my += w[i] * py[i]; }
    return { x: mx, y: my };
  }

  function cloudSize() {  // spread of the cloud: RMS distance from its mean, per axis
    const m = mean();
    let v = 0;
    for (let i = 0; i < N; i++) v += w[i] * ((px[i] - m.x) ** 2 + (py[i] - m.y) ** 2);
    return Math.sqrt(v / 2);
  }

  // Systematic resampling. glide: each dot slides from where it was drawn to its new state.
  // split (clicks): the unlucky dots vanish and each survivor's copies start where it is drawn.
  function resample(split) {
    const u0 = rand() / N;
    let c = w[0], j = 0;
    for (let i = 0; i < N; i++) {
      const u = u0 + i / N;
      while (u > c && j < N - 1) { j++; c += w[j]; }
      idx[i] = j;
    }
    const b = back;
    for (let i = 0; i < N; i++) {
      const k = idx[i];
      b.px[i] = px[k]; b.py[i] = py[k]; b.vy[i] = vy[k]; b.zx[i] = zx[k]; b.zy[i] = zy[k];
      b.ox[i] = split ? ox[k] : px[i] + ox[i] - px[k];
      b.oy[i] = split ? oy[k] : py[i] + oy[i] - py[k];
    }
    back = { px, py, vy, zx, zy, ox, oy };
    ({ px, py, vy, zx, zy, ox, oy } = b);
    w.fill(1 / N);
  }

  // Liu-West jitter: shrink toward the mean and add noise, keeping the mean and the spread.
  function jitter() {
    const a = Math.sqrt(1 - JITTER * JITTER);
    const dims = [[px, ox, zx], [py, oy, zy]];
    if (done) dims.push([vy, null, null]);
    for (const [pos, off, seen] of dims) {
      let m = 0, v = 0;
      for (let i = 0; i < N; i++) m += pos[i];
      m /= N;
      for (let i = 0; i < N; i++) v += (pos[i] - m) ** 2;
      const s = JITTER * Math.sqrt(v / N);
      for (let i = 0; i < N; i++) {
        const d = (a - 1) * (pos[i] - m) + s * gauss();
        pos[i] += d;
        if (off) { seen[i] += d; off[i] -= d; }
      }
    }
  }

  function weigh(z, noise, parts, fromSeen) {  // multiply weights by the likelihood to the power 1/parts; return ESS / N
    const k = 1 / (2 * noise * noise * parts), ax = fromSeen ? zx : px, ay = fromSeen ? zy : py;
    let top = -Infinity, sum = 0, s2 = 0;
    for (let i = 0; i < N; i++) {
      const dx = ax[i] - z.x, dy = ay[i] - z.y;  // data are judged where each particle was when z was seen
      lw[i] = Math.log(w[i]) - (dx * dx + dy * dy) * k;
      if (lw[i] > top) top = lw[i];
    }
    for (let i = 0; i < N; i++) { w[i] = Math.exp(lw[i] - top); sum += w[i]; }
    for (let i = 0; i < N; i++) { w[i] /= sum; s2 += w[i] * w[i]; }
    return 1 / s2 / N;
  }

  function subStep() {  // one gentle sub-step of a data observation: weigh, resample, jitter
    weigh(pending.z, pending.noise, PARTS, true);
    resample(false);
    jitter();
    pending.next += pending.every;
    if (--pending.left === 0) {
      const m = mean();
      ana.push(m.x, m.y, cloudSize());
      pending = null;
    }
  }

  // Adaptive inflation, as in ensemble data assimilation: if the data keep landing farther from the
  // forecast than its spread explains, the filter trusts its forecast less and widens the cloud.
  function inflate(z, r) {
    const m = mean();
    let vxx = 0, vyy = 0, mv = 0;
    for (let i = 0; i < N; i++) { vxx += (px[i] - m.x) ** 2; vyy += (py[i] - m.y) ** 2; mv += vy[i]; }
    mv /= N;
    const surprise = ((z.x - m.x) ** 2 + (z.y - m.y) ** 2) / 2 / ((vxx + vyy) / 2 / N + r * r);
    lam = Math.max(1, 0.8 * lam + 0.2 * surprise);
    const f = Math.sqrt(1 + Math.max(0, lam - 1.6));
    if (f < 1.001) return;
    for (let i = 0; i < N; i++) {
      const dx = (f - 1) * (px[i] - m.x), dy = (f - 1) * (py[i] - m.y);
      px[i] += dx; py[i] += dy; ox[i] -= dx; oy[i] -= dy;
      vy[i] = mv + f * (vy[i] - mv);
    }
  }

  function observe(z) {
    inflate(z, noiseAt(t));
    obs.push(z);
    zx.set(px); zy.set(py);
    pending = { z, noise: noiseAt(t), left: PARTS, every: Math.max(1, Math.floor(GAP / STEP / PARTS)), next: stepNo };
  }

  // A click: a far click is a surprise, so the cloud first widens (adaptive inflation, Gaussian),
  // then is weighed by the click's likelihood. The weights stay visible for HOLD seconds, then resample.
  function clickAt(z) {
    if (click) resolveClick();
    while (pending) subStep();
    const m = mean(), s = Math.min(0.35 * Math.hypot(z.x - m.x, z.y - m.y), 0.3);
    for (let i = 0; i < N; i++) {
      const dx = s * gauss(), dy = s * gauss();
      px[i] += dx; py[i] += dy; ox[i] -= dx; oy[i] -= dy;
    }
    weigh(z, CLICK_R, 1, false);
    click = { z, until: t + HOLD };
    clicks.push({ x: z.x, y: z.y, t });
    if (clicks.length > 40) clicks.shift();
  }

  function resolveClick() {
    resample(true);
    jitter();
    const m = mean();
    ana.push(m.x, m.y, cloudSize());
    if (nextObs < t + 0.1) nextObs = t + 0.1;
    click = null;
  }

  function startAct2() {  // the path turns random from here; every particle takes the known vertical speed
    done = true;
    const a = truth(T), b = truth(T - STEP);
    tx = a.x; ty = a.y; tvy = (a.y - b.y) / STEP;
    for (let i = 0; i < N; i++) vy[i] = tvy + 0.01 * gauss();
    nextEvent = T + 14 + 10 * rand();
    blindUntil = 0; turnUntil = 0; turnAcc = 0; lam = 1;
  }

  function events() {  // now and then: a blind spell (no data) or a sharp turn the model does not expect
    if (t < nextEvent) return;
    nextEvent = t + 15 + 15 * rand();
    if (rand() < 0.5) { blindUntil = t + 2 + rand(); return; }
    const away = ty - 0.5;
    turnAcc = (Math.abs(away) > 0.05 ? -Math.sign(away) : (rand() < 0.5 ? -1 : 1)) * 0.45;
    turnUntil = t + 0.6;
  }

  function camera() {  // keep the estimate near KEEP of the view: a smooth, critically damped follow
    const target = mean().x - KEEP * WD, wn = 0.8;
    camV += (wn * wn * (target - camX) + 2 * wn * (speed(t) - camV)) * STEP;
    camX += camV * STEP;
  }

  function prune() {  // forget what has scrolled out of view, so memory stays flat
    const edge = camX - 0.3;
    while (obs.length && (obs[0].x < edge || obs.length > 200)) obs.shift();
    while (clicks.length && clicks[0].x < edge) clicks.shift();
    while (ana.length > 6 && (ana[3] < edge || ana.length > 900)) ana.splice(0, 3);
  }

  function step() {  // move every particle with the model; assimilate what is due
    const q = DRIFT * Math.sqrt(STEP);
    if (!done) {
      const f = flow(t);
      for (let i = 0; i < N; i++) {
        px[i] += f.x + q * gauss();
        py[i] += f.y + q * gauss();
      }
    } else {
      const v = speed(t) * STEP, g = SIGMA * Math.sqrt(STEP), mx = MODEL_X * Math.sqrt(STEP), my = MODEL_Y * Math.sqrt(STEP);
      tvy += (pull(ty, tvy) + (t < turnUntil ? turnAcc : 0)) * STEP + g * gauss();
      tx += v + mx * gauss();
      ty += tvy * STEP + my * gauss();
      for (let i = 0; i < N; i++) {
        vy[i] += pull(py[i], vy[i]) * STEP + g * gauss();
        px[i] += v + mx * gauss();
        py[i] += vy[i] * STEP + my * gauss();
      }
    }
    t += STEP; stepNo++;
    if (click && t >= click.until) resolveClick();
    if (!click && !done) {
      if (t >= nextObs - 1e-9 && nextObs < T - 0.3) {
        while (pending) subStep();
        const s = truth(t), z = { x: s.x + R * gauss(), y: s.y + R * gauss() };
        const gap = obsCount + 1 < GAPS.length ? GAPS[obsCount + 1] : GAP;
        obs.push(z);
        zx.set(px); zy.set(py);
        pending = { z, noise: R, left: PARTS, every: Math.max(1, Math.floor(gap / STEP / PARTS)), next: stepNo };
        obsCount++; nextObs += gap;
      }
    } else if (!click && t >= nextObs - 1e-9) {
      nextObs += GAP;
      if (t >= blindUntil) { const r = noiseAt(t); observe({ x: tx + r * gauss(), y: ty + r * gauss() }); }
      else { const m = mean(); ana.push(m.x, m.y, cloudSize()); }  // blind: the forecast is the estimate
    }
    if (pending && stepNo >= pending.next) subStep();
    if (done) { events(); camera(); prune(); }
    if (!done && t >= T - 1e-9) {
      if (click) resolveClick();
      while (pending) subStep();
      startAct2();
    }
  }
  // PF-CORE-END

  // Drawn dots glide toward their state: the offsets shrink with a 0.3 s time constant.
  function relax(dt) {
    const k = Math.exp(-dt / 0.3);
    for (let i = 0; i < N; i++) { ox[i] *= k; oy[i] *= k; }
  }

  function settle() {  // drawn dots jump to their state (reduced motion)
    ox.fill(0); oy.fill(0);
  }

  return {
    STEP, CLICK_R,
    init, step, clickAt, resolveClick, mean, cloudSize, relax, settle,
    get N() { return N; }, get WD() { return WD; }, get t() { return t; }, get camX() { return camX; },
    get done() { return done; }, get click() { return click; },
    get px() { return px; }, get py() { return py; }, get ox() { return ox; }, get oy() { return oy; },
    get obs() { return obs; }, get ana() { return ana; }, get clicks() { return clicks; },
  };
}
