// Entry point. Builds the homepage, asks the clock which face to show, and starts the right one:
//
//   construction  the holding page; its secret plays the birthday, then opens the homepage
//   birthday      the birthday plays over the homepage, then lifts
//   site          the homepage
//
// <html data-phase> tells the CSS which face is up; the homepage stays hidden until it is set.
// ?draft shows empty content fields as gray slots (see render.js); ?preview and ?now are in clock.js.

import { SITE, BIRTHDAY } from "./content.js";
import { render } from "./render.js";
import { startRouter } from "./router.js";
import { wireCopyEmail } from "./copy-email.js";
import { mountHero } from "./hero/view.js";
import { decidePhase } from "./clock.js";
import { showConstruction } from "./construction.js";
import { playBirthday } from "./birthday.js";

const root = document.documentElement;
const setPhase = (phase) => { root.dataset.phase = phase; };
const startHero = () => mountHero(document.getElementById("pf"));

render(SITE, { draft: new URLSearchParams(location.search).has("draft") });
startRouter();
wireCopyEmail(SITE.email);

function birthday() {
  setPhase("birthday");
  playBirthday(BIRTHDAY, { onReveal: startHero, onDone: () => setPhase("site") });
}

const phase = decidePhase(Date.now(), location.search);
if (phase === "construction") {
  setPhase("construction");
  showConstruction(birthday);
} else if (phase === "birthday") {
  birthday();
} else {
  setPhase("site");
  startHero();
}
