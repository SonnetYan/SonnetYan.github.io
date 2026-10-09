// Builds the homepage from SITE into the markup in index.html. Runs once; knows nothing about
// time, routing, or animation.
//
// Draft view (?draft): every empty field becomes a gray slot that names what goes there, so the
// gaps are easy to see. Normal view: empty fields and empty sections stay off the page.

import { $, filled, put, el } from "./dom.js";

export function render(SITE, { draft = false } = {}) {
  function slot(label) {
    return el("span", { class: "slot", text: label });
  }

  function textOrSlot(tag, attrs, value, label) {  // the value; if it is empty, a slot in draft view, else nothing
    if (filled(value)) return el(tag, { ...attrs, text: value });
    return draft ? el(tag, attrs, slot(label)) : null;
  }

  function fill(node, value, label) {  // the same, for an element already in the markup
    if (filled(value)) node.textContent = value;
    else if (draft) node.replaceChildren(slot(label));
    else node.remove();
  }

  function tile(p, full) {
    const photo = filled(p.photo) ? el("img", { class: "ph", src: p.photo, alt: p.name || "", loading: "lazy" })
      : draft ? el("div", { class: "ph", text: p.kind ? `photo: ${p.kind}` : "photo" }) : null;
    return el("article", { class: "tile" },
      photo,
      filled(p.link) ? el("h3", {}, el("a", { href: p.link, text: p.name })) : textOrSlot("h3", {}, p.name, "project name"),
      textOrSlot("p", {}, full ? p.text : (p.short || p.text), "one line on what it is"),
      full && textOrSlot("p", { class: "meta" }, p.tools, "tools"));
  }

  function emptyTiles(count, full) {  // draft view before any project is in: empty tiles show the shape
    return Array.from({ length: count }, () => tile({}, full));
  }

  function theme(t) {
    return el("li", {},
      el("h3", { text: t.title }),
      el("p", { class: "sub" }, t.text, ...(t.link ? [" ", el("a", { href: t.link[1], text: t.link[0] }), "."] : [])));
  }

  function paper(p) {
    const where = [`<i>${p.venue}</i>${p.volume ? ` ${p.volume}` : ""}`, p.year, p.pages && `pp. ${p.pages}`].filter(Boolean).join(", ");
    const doi = filled(p.doi) ? `https://doi.org/${p.doi}` : "";
    return el("li", {},
      el("p", { class: "t", text: p.title }),
      el("p", { class: "sub", html: p.authors }),
      el("p", { class: "sub", html: where }),
      doi && el("p", { class: "sub doi" }, el("a", { href: doi, text: doi }),
        ...(filled(p.pdf) ? [", ", el("a", { href: p.pdf, text: "PDF" })] : [])),
      (filled(p.contribution) || draft) && el("p", { class: "sub" }, el("i", { text: "My contribution:" }), " ",
        filled(p.contribution) ? p.contribution : slot("what I did in this paper")));
  }

  function talk([title, where, year]) {
    return el("li", {}, el("p", { text: title }), el("p", { class: "sub", html: `<i>${where}</i>, ${year}` }));
  }

  function block(id, title, ...kids) {
    return el("section", { class: "block", id, "aria-labelledby": `${id}-h` },
      el("h2", { id: `${id}-h`, text: title }), ...kids);
  }

  const r = SITE.research, m = SITE.making, now = SITE.now;
  const hasProjects = filled(m.projects), hasNow = now.items.some(([, value]) => filled(value));

  $("[data-name]").textContent = SITE.name;
  $("[data-heading]").textContent = SITE.heading;
  fill($("[data-tagline]"), SITE.tagline, "tagline");
  fill($("[data-field]"), SITE.field, "research field, one line");
  fill($("[data-interests]"), SITE.interests, "interests, one line");
  put($("[data-about]"), ...SITE.about.map((text) => textOrSlot("p", {}, text, "about, one paragraph")));

  put($("[data-door-research]"),
    textOrSlot("p", { class: "lead" }, r.line, "research, one line"),
    el("ul", {}, ...r.highlights.map((text) => el("li", { text }))),
    el("p", {}, el("a", { href: "#research", text: "Research and publications" })));

  if (hasProjects || draft) {
    put($("[data-door-making]"),
      textOrSlot("p", { class: "lead" }, m.line, "making, one line"),
      el("div", { class: "tiles" }, ...(hasProjects ? m.projects.filter((p) => p.home).map((p) => tile(p, false)) : emptyTiles(4, false))),
      el("p", {}, el("a", { href: "#making", text: "All projects" })));
    put($("#making"),
      el("header", {},
        el("h1", { id: "making-h", tabindex: "-1", text: "Making" }),
        textOrSlot("p", { class: "lede" }, m.lede, "making, a sentence or two")),
      el("div", { class: "tiles all" }, ...(hasProjects ? m.projects.map((p) => tile(p, true)) : emptyTiles(6, true))));
  } else {
    $("[data-door-making]").closest(".door").remove();
    $("#making").remove();
  }

  if (hasNow || draft) {
    put($("[data-now]"),
      el("dl", {}, ...now.items.filter(([, value]) => filled(value) || draft)
        .flatMap(([key, value]) => [el("dt", { text: key }), el("dd", {}, filled(value) ? value : slot("one line"))])),
      textOrSlot("p", { class: "meta" }, filled(now.updated) ? `Updated ${now.updated}` : "", "month updated"));
  } else {
    $("[data-now]").closest(".now").remove();
  }

  put($("#research"),
    el("header", {},
      el("h1", { id: "research-h", tabindex: "-1", text: "Research" }),
      textOrSlot("p", { class: "lede" }, r.lede, "research, a sentence or two")),
    block("themes", "Themes", el("ul", { class: "list" }, ...r.themes.map(theme))),
    block("papers", "Publications", el("ol", { class: "list" }, ...r.papers.map(paper))),
    (filled(r.talks) || draft) && block("talks", "Talks", el("ul", { class: "list" },
      ...(filled(r.talks) ? r.talks.map(talk) : [el("li", {}, slot("talk: title, event, year"))]))),
    (filled(r.cv.href) || draft) && block("cv", "CV", el("p", {}, filled(r.cv.text) && `${r.cv.text} `,
      filled(r.cv.href) ? el("a", { href: r.cv.href, text: "CV (PDF)" }) : slot("CV (PDF)"))));

  // Links go in last: an in-page link shows only when its section made it onto the page.
  const link = ([text, href]) => {
    if (!filled(href)) return draft ? slot(text) : null;
    if (href.startsWith("#") && !document.getElementById(href.slice(1))) return null;
    return el("a", { href, text });
  };
  document.querySelectorAll("[data-links]").forEach((nav) => put(nav, ...SITE.links.map(link)));

  $("[data-email]").textContent = SITE.email;
  fill($("[data-updated]"), filled(SITE.updated) ? `Last updated ${SITE.updated}` : "", "last updated");
}
