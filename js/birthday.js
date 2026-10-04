// Her birthday (phase "birthday" in clock.js): fireworks over a night sky while the greeting fades
// in line by line; then the night lifts and the homepage is underneath. About 14 seconds. A tap,
// click, or key skips ahead. The words come from BIRTHDAY in content.js.
//
// Timeline, in seconds of visible time (it pauses while the tab is hidden):
//   0.3 first rocket   1.6 title   3.6 line   4.5 "Tap to continue"   5.8 signature
//   9.2 finale         10.5 last rocket       13 the night lifts over 1.4 s
// onReveal fires when the night starts to lift (start the homepage animation then);
// onDone fires when it is gone.
// Reduced motion: no fireworks; the words appear at once and the night lifts after 7 s.

import { $ } from "./dom.js";

const SKY = [16, 17, 21];  // the night: a touch darker than the dark theme's paper
const COLORS = ["#f6c560", "#f28fa6", "#f7a77a", "#fff1d6", "#c9a7ff"];  // gold, rose, peach, ivory, lilac
const BEAT = { title: 1.6, line: 3.6, hint: 4.5, from: 5.8, finale: 9.2, lastRocket: 10.5, lift: 13 };
const LIFT = 1.4, SKIP_LIFT = 0.8, STILL_LIFT = 7;  // seconds the night takes to lift; when it lifts with reduced motion
const MAX_SPARKS = 3200;

export function playBirthday(words, { onReveal = () => {}, onDone = () => {} } = {}) {
  const box = $("#birthday");
  const canvas = $("canvas", box);
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const parts = {
    title: $("[data-bd-title]", box), line: $("[data-bd-line]", box),
    from: $("[data-bd-from]", box), hint: $("[data-bd-hint]", box)
  };
  parts.title.textContent = words.title;
  parts.line.textContent = words.line;
  $("[data-bd-from-text]", box).textContent = words.from;
  $("[data-bd-name]", box).textContent = words.name;
  parts.hint.textContent = words.hint;

  let W = 0, H = 0, scale = 1, density = 1;
  let t = 0, last = 0, nextRocket = 0.3, finale = false, liftAt = null, liftFor = LIFT, ended = false;
  const rockets = [], sparks = [];
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const between = (a, b) => a + (b - a) * Math.random();

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.max(Math.min(W, H * 1.4) / 800, 0.65);  // phones get bigger bursts than pure scaling gives
    density = Math.min(1.2, Math.max(0.5, (W * H) / (1280 * 800)));
    ctx.fillStyle = `rgb(${SKY})`;
    ctx.fillRect(0, 0, W, H);
  }

  function launch(x, top, wait = 0) {  // a rocket from below the screen to height top (px), after wait seconds
    const g = 300 * scale, h = H + 6 - top;
    rockets.push({ x, y: H + 6, vx: between(-12, 12) * scale, vy: -Math.sqrt(2 * g * h), g, wait });
  }

  function burst(x, y) {  // a shell opens: a filled sphere, or now and then a ring; some glitter
    const ring = Math.random() < 0.2, glitter = Math.random() < 0.3;
    const main = pick(COLORS), second = Math.random() < 0.45 ? pick(COLORS) : main;
    const n = Math.round(between(150, 230) * density), top = between(170, 260) * scale;
    for (let i = 0; i < n && sparks.length < MAX_SPARKS; i++) {
      const a = 2 * Math.PI * Math.random();
      const s = ring ? top * between(0.97, 1.03) : top * (0.3 + 0.7 * Math.sqrt(Math.random()));
      sparks.push({
        x, y, vx: s * Math.cos(a), vy: s * Math.sin(a), age: 0, life: between(1.3, 2.1),
        color: Math.random() < 0.7 ? main : second, size: between(1.3, 2), glitter, phase: 6 * Math.random()
      });
    }
  }

  function schedule() {  // who goes up when
    if (t >= nextRocket && t < BEAT.lastRocket) {
      const count = Math.random() < 0.45 ? 2 : 1;
      for (let i = 0; i < count; i++) launch(between(0.12, 0.88) * W, between(0.08, 0.4) * H, 0.18 * i);
      nextRocket = t + between(0.45, 0.9);
    }
    if (!finale && t >= BEAT.finale) {
      finale = true;
      for (let i = 0; i < 5; i++) launch((0.14 + 0.18 * i + between(-0.03, 0.03)) * W, between(0.12, 0.3) * H, 0.12 * i);
    }
  }

  function showLines() {  // each line fades in on its beat; with reduced motion, all at once
    for (const key of ["title", "line", "hint", "from"]) if (reduce || t >= BEAT[key]) parts[key].classList.add("on");
  }

  function move(dt) {
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      if (r.wait > 0) { r.wait -= dt; continue; }
      r.vy += r.g * dt; r.x += r.vx * dt; r.y += r.vy * dt;
      if (sparks.length < MAX_SPARKS) {  // a short trail of embers
        sparks.push({ x: r.x + between(-1.5, 1.5), y: r.y + 3, vx: between(-14, 14), vy: between(20, 60), age: 0,
          life: between(0.25, 0.5), color: COLORS[0], size: 0.9, glitter: false, phase: 0, ember: true });
      }
      if (r.vy >= -30 * scale) { burst(r.x, r.y); rockets.splice(i, 1); }
    }
    const drag = Math.exp(-1.5 * dt), g = 110 * scale;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.age += dt;
      if (s.age >= s.life) { sparks[i] = sparks[sparks.length - 1]; sparks.pop(); continue; }
      s.vx *= drag; s.vy = s.vy * drag + g * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
    }
  }

  function draw() {
    ctx.globalCompositeOperation = "source-over";  // the sky, a little see-through: motion leaves trails
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(${SKY}, 0.24)`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (const r of rockets) {
      if (r.wait > 0) continue;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = COLORS[3];
      ctx.beginPath(); ctx.arc(r.x, r.y, 1.7, 0, 2 * Math.PI); ctx.fill();
    }
    for (const s of sparks) {
      const k = s.age / s.life;
      let a = Math.pow(1 - k, 1.4);
      if (s.glitter && k > 0.45) a *= 0.45 + 0.55 * Math.abs(Math.sin(30 * s.age + s.phase));
      ctx.fillStyle = s.color;
      if (!s.ember) {  // a soft halo, so a fresh burst glows
        ctx.globalAlpha = 0.12 * a;
        ctx.beginPath(); ctx.arc(s.x, s.y, 3.2 * s.size, 0, 2 * Math.PI); ctx.fill();
      }
      ctx.globalAlpha = s.ember ? 0.55 * a : a;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  function lift(seconds) {  // the night fades out; the homepage is already underneath
    if (liftAt !== null) return;
    liftAt = t; liftFor = seconds;
    box.style.transitionDuration = `${seconds}s`;
    box.classList.add("lifting");
    onReveal();
  }

  function finish() {
    if (ended) return;
    ended = true;
    box.hidden = true;
    box.classList.remove("lifting");
    document.documentElement.style.overflow = "";
    window.removeEventListener("resize", resize);
    box.removeEventListener("pointerdown", skip);
    window.removeEventListener("keydown", onKey);
    onDone();
  }

  function frame(now) {
    if (ended) return;
    requestAnimationFrame(frame);
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;  // a hidden tab pauses the show
    last = now;
    t += dt;
    if (!reduce) { schedule(); move(dt); draw(); }
    showLines();
    if (liftAt === null && t >= (reduce ? STILL_LIFT : BEAT.lift)) lift(LIFT);
    if (liftAt !== null && t >= liftAt + liftFor) finish();
  }

  function skip() { if (t >= 0.6) lift(SKIP_LIFT); }
  function onKey(event) {
    if (event.key === "Tab") { event.preventDefault(); box.focus({ preventScroll: true }); return; }  // focus stays here
    if (["Enter", " ", "Escape"].includes(event.key)) { event.preventDefault(); skip(); }
  }

  box.hidden = false;
  document.documentElement.style.overflow = "hidden";
  resize();
  window.addEventListener("resize", resize);
  box.addEventListener("pointerdown", skip);
  window.addEventListener("keydown", onKey);
  box.focus({ preventScroll: true });
  requestAnimationFrame(frame);
}
