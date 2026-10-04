// Run: node --test tests/
// The birthday window happens once; these pin its edges.

import { test } from "node:test";
import assert from "node:assert/strict";
import { BIRTHDAY_START, BIRTHDAY_END, phaseAt, decidePhase, isPinned } from "../js/clock.js";

const at = (iso) => Date.parse(iso);

test("the window starts at midnight in Tokyo on October 14", () => {
  assert.equal(BIRTHDAY_START, at("2026-10-14T00:00:00+09:00"));
  assert.equal(phaseAt(BIRTHDAY_START - 1), "construction");
  assert.equal(phaseAt(BIRTHDAY_START), "birthday");
});

test("Beijing midnight and the whole day in Atlanta are inside", () => {
  assert.equal(phaseAt(at("2026-10-14T00:00:00+08:00")), "birthday");
  assert.equal(phaseAt(at("2026-10-14T00:00:00-04:00")), "birthday");
  assert.equal(phaseAt(at("2026-10-14T23:59:59-04:00")), "birthday");
});

test("the window ends at midnight in New York, October 15", () => {
  assert.equal(BIRTHDAY_END, at("2026-10-15T00:00:00-04:00"));
  assert.equal(phaseAt(BIRTHDAY_END - 1), "birthday");
  assert.equal(phaseAt(BIRTHDAY_END), "site");
});

test("today and long after", () => {
  assert.equal(phaseAt(at("2026-10-04T12:00:00Z")), "construction");
  assert.equal(phaseAt(at("2027-06-01T00:00:00Z")), "site");
});

test("?preview forces a phase and wins over ?now", () => {
  const now = at("2026-10-04T12:00:00Z");
  assert.equal(decidePhase(now, "?preview=birthday"), "birthday");
  assert.equal(decidePhase(now, "?preview=site"), "site");
  assert.equal(decidePhase(now, "?preview=birthday&now=2027-01-01T00:00:00Z"), "birthday");
  assert.equal(decidePhase(now, "?preview=nonsense"), "construction");
});

test("?now pretends a moment; a bad value is ignored", () => {
  const now = at("2026-10-04T12:00:00Z");
  assert.equal(decidePhase(now, "?now=2026-10-14T09:00:00%2B09:00"), "birthday");
  assert.equal(decidePhase(now, "?now=2026-10-20"), "site");
  assert.equal(decidePhase(now, "?now=tomorrow"), "construction");
  assert.equal(decidePhase(now, ""), "construction");
});

test("only a valid ?preview or ?now pins the phase", () => {
  assert.equal(isPinned(""), false);
  assert.equal(isPinned("?draft"), false);
  assert.equal(isPinned("?preview=nonsense"), false);
  assert.equal(isPinned("?preview="), false);
  assert.equal(isPinned("?now=tomorrow"), false);
  assert.equal(isPinned("?preview=site"), true);
  assert.equal(isPinned("?now=2026-10-14"), true);
});
