// The holding page shown before her birthday (phase "construction" in clock.js).
//
// Secret preview, for us: tap or click the period after "Under construction" three times within
// 1.5 seconds. It plays the birthday and then opens the homepage, as on the day. Nothing on the
// page hints at it; reloading brings the holding page back.

import { $ } from "./dom.js";

const TAPS = 3, WITHIN = 1500;  // taps needed, and the time they must fall in (ms)

export function showConstruction(onSecret) {
  const box = $("#construction");
  box.hidden = false;
  let taps = [];
  $("[data-secret]", box).addEventListener("click", () => {
    const now = performance.now();
    taps = taps.filter((t) => now - t < WITHIN);
    taps.push(now);
    if (taps.length < TAPS) return;
    taps = [];
    box.hidden = true;
    onSecret();
  });
}
