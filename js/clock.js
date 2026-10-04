// Which face the site shows, and when. Pure functions of a time and the URL query, so they are easy
// to test (tests/clock.test.js) and the same moment means the same phase for every visitor,
// whatever their time zone.
//
//   construction  before her birthday starts anywhere she might be: a quiet holding page
//   birthday      her birthday, from midnight in Tokyo to midnight in New York: the birthday
//                 animation plays, then the homepage
//   site          afterwards: the homepage
//
// Query overrides, for previewing (a visitor never sees these unless they type them):
//   ?preview=construction|birthday|site   force a phase
//   ?now=2026-10-14T09:00:00+09:00        pretend it is this moment (any format Date.parse reads)
// ?preview wins over ?now; a value that does not parse is ignored.

export const BIRTHDAY_START = Date.UTC(2026, 9, 13, 15, 0, 0);  // 2026-10-14 00:00 in Tokyo (UTC+9)
export const BIRTHDAY_END = Date.UTC(2026, 9, 15, 4, 0, 0);     // 2026-10-15 00:00 in New York (EDT, UTC-4); not included

export const PHASES = ["construction", "birthday", "site"];

export function phaseAt(ms) {
  if (ms < BIRTHDAY_START) return "construction";
  if (ms < BIRTHDAY_END) return "birthday";
  return "site";
}

function overrides(search) {  // the valid ?preview and ?now values, or null for each
  const query = new URLSearchParams(search);
  const preview = query.get("preview");
  const pretend = Date.parse(query.get("now") ?? "");
  return { preview: PHASES.includes(preview) ? preview : null, now: Number.isNaN(pretend) ? null : pretend };
}

export function decidePhase(nowMs, search = "") {
  const { preview, now } = overrides(search);
  return preview ?? phaseAt(now ?? nowMs);
}

// True when the URL fixes the phase (a valid ?preview or ?now), so the page should not follow the clock.
export function isPinned(search = "") {
  const { preview, now } = overrides(search);
  return preview !== null || now !== null;
}
