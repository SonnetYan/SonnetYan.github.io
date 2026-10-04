// Views: #research and #making are detail views shown in place of the home view; any other anchor
// scrolls within the view that holds it. The top bar shows only on detail views.

import { $, $$ } from "./dom.js";

function route() {
  const views = $$(".view");
  const id = location.hash.slice(1);
  const target = id ? document.getElementById(id) : null;
  const shown = views.find((v) => !v.hidden) || views[0];
  const owner = target && (target.classList.contains("view") ? target : target.closest(".view"));
  const next = owner || (target ? shown : views[0]);
  views.forEach((v) => { v.hidden = v !== next; });
  $("#topbar").hidden = next.id === "home";
  if (target && target !== next) target.scrollIntoView();
  else window.scrollTo(0, 0);
  if (next !== shown) $("h1", next)?.focus({ preventScroll: true });
}

export function startRouter() {
  route();
  window.addEventListener("hashchange", route);
}
