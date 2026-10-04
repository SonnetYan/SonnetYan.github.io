// Entry point. Builds the homepage, asks the clock which face to show, and starts the right one:
//
//   construction  the holding page; its secret plays the birthday, then opens the homepage.
//                 If the page is left open, it moves on by itself when the birthday starts.
//   birthday      the birthday plays over the homepage, then lifts
//   site          the homepage
//
// <html data-phase> tells the CSS which face is up; the homepage is not shown until it is set.
// While the birthday plays, the homepage underneath is inert (no focus, no clicks); afterwards focus
// goes to the heading of the view on screen.
// ?draft shows empty content fields as gray slots (render.js); ?preview and ?now are in clock.js.

import { SITE, BIRTHDAY } from "./content.js";
import { render } from "./render.js";
import { startRouter } from "./router.js";
import { wireCopyEmail } from "./copy-email.js";
import { mountHero } from "./hero/view.js";
import { BIRTHDAY_START, decidePhase, isPinned } from "./clock.js";
import { showConstruction } from "./construction.js";
import { playBirthday } from "./birthday.js";

const root = document.documentElement;
const page = document.querySelector(".page");
const setPhase = (phase) => { root.dataset.phase = phase; };
const startHero = () => mountHero(document.getElementById("pf"));
const focusView = () => document.querySelector(".view:not([hidden]) h1")?.focus({ preventScroll: true });

render(SITE, { draft: new URLSearchParams(location.search).has("draft") });
startRouter();
wireCopyEmail(SITE.email);

function birthday() {
  setPhase("birthday");
  page.inert = true;
  playBirthday(BIRTHDAY, {
    onReveal: startHero,
    onDone: () => { page.inert = false; setPhase("site"); focusView(); }
  });
}

function site() {
  setPhase("site");
  startHero();
}

// A holding page left open: switch when the birthday starts (a timer, plus a check whenever the tab
// comes back, since background timers may be late). Not when a valid ?preview or ?now pins the phase.
function watchClock(hide) {
  if (isPinned(location.search)) return;
  const check = () => {
    if (root.dataset.phase !== "construction") return;
    const phase = decidePhase(Date.now());
    if (phase === "construction") return;
    hide();
    if (phase === "birthday") birthday(); else site();
  };
  setTimeout(check, Math.min(Math.max(0, BIRTHDAY_START - Date.now()) + 250, 2 ** 31 - 1));  // timers cap at about 24 days
  document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
}

const phase = decidePhase(Date.now(), location.search);
if (phase === "construction") {
  setPhase("construction");
  watchClock(showConstruction(birthday));
} else if (phase === "birthday") {
  birthday();
} else {
  site();
}
