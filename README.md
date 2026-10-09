# sonnetyan.com

Mingxi Yan's homepage. Plain static files, served by GitHub Pages from the root of `main`.
No framework, no build step, no tracker, and no request to any other site.

## Files

```
index.html            the page skeleton: meta tags, markup the scripts fill in
css/fonts.css         Literata, served from fonts/ (SIL Open Font License, fonts/OFL.txt)
css/site.css          the homepage: theme tokens, layout, hero, detail views, draft slots
css/construction.css  the holding page shown before her birthday
css/birthday.css      the birthday night sky and greeting
js/main.js            entry point: builds the page, asks the clock which face to show
js/content.js         the homepage's content and the birthday greeting; edit them here
js/render.js          builds the homepage from content.js
js/router.js          #research and #making detail views
js/copy-email.js      the Copy button next to the email
js/dom.js             tiny DOM helpers
js/clock.js           which face to show when, and the preview switches
js/construction.js    the holding page and its secret
js/birthday.js        fireworks and the greeting
js/hero/filter.js     the hero's particle filter: math only
js/hero/view.js       the hero on screen: drawing, timing, clicks
tests/clock.test.js   pins the birthday window
cv.pdf                generated from a LaTeX source kept outside this repo; replace it, do not edit it
og.png                the picture shown when a link is shared (1200 x 630): the hero after its opening, made by a
                      screenshot script kept outside this repo; remake it when the hero or the name changes
favicon.svg           the tab icon: the hero in miniature, follows the light or dark theme
.nojekyll             tells Pages to serve the files as they are
```

Each file starts with a comment that says what it does and what it leaves to others.

## Editing content

Change `js/content.js`, then update `updated` there. Empty fields stay off the page.
A project with an empty `link` shows without one; fill in the address when the project has a public home.
The fixed words around the content (section headings, link labels, the holding page, meta tags) are in
`index.html` and `js/render.js`.
Open the page with `?draft` to see every empty field as a gray slot that names what goes there.

## Three faces (js/clock.js)

```
until 2026-10-14 00:00 Tokyo (2026-10-13 15:00 UTC)    holding page: "Under construction."
until 2026-10-15 00:00 New York (2026-10-15 04:00 UTC)  her birthday: fireworks and a greeting, then the homepage
after that                                              the homepage
```

The phase comes from the visitor's clock, compared in UTC, so every time zone switches at the same moment.
A holding page left open switches by itself when the birthday starts.

## Previewing

- `?preview=construction`, `?preview=birthday`, `?preview=site` force a face.
- `?now=2026-10-14T09:00:00%2B09:00` pretends it is that moment (`%2B` is `+` in a URL).
- `?draft` works with any of them.
- On the holding page, three quick taps on the period after "Under construction" play the birthday,
  then open the homepage.

## Running and testing

Browsers do not load modules from `file://`, so serve the folder:

```
python3 -m http.server 8000      # then open http://localhost:8000/
node --test tests/clock.test.js  # Node 22 or newer
```

## Publishing

Commit to `main` and push; Pages updates in about a minute. Commit messages are in English.
`CNAME` holds the custom domain, `sonnetyan.com`; keep it. Its DNS points at GitHub Pages, and
https://sonnetyan.github.io/ redirects there.

## After the birthday

From 2026-10-15 04:00 UTC the clock answers "site" unless `?preview` or `?now` asks otherwise. To remove the
holding page and the birthday, take out all of these together, or the page will not start:
`js/construction.js`, `js/birthday.js`, `css/construction.css`, `css/birthday.css`, `BIRTHDAY` in `js/content.js`;
in `js/main.js` their imports, `birthday()`, `watchClock()` and the first two branches at the end; in `index.html`
their stylesheet and modulepreload links and the `#construction` and `#birthday` markup; and `js/clock.js` with
its test if nothing else needs it.
