import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BOX_INTERVALS_DAYS,
  DAY_MS,
  MAX_BOX,
  buildQueue,
  formatDue,
  gradeCard,
  partitionByDueness,
  type CardProgress,
} from "./srs.ts";

const T0 = 1_700_000_000_000;

describe("gradeCard", () => {
  it("starts an unseen card in box 2 after a correct answer", () => {
    const p = gradeCard(undefined, true, T0);
    assert.equal(p.box, 2);
    assert.equal(p.correct, 1);
    assert.equal(p.wrong, 0);
    assert.equal(p.streak, 1);
    assert.equal(p.due, T0 + (BOX_INTERVALS_DAYS[1] as number) * DAY_MS);
  });

  it("keeps an unseen card in box 1 after a miss", () => {
    const p = gradeCard(undefined, false, T0);
    assert.equal(p.box, 1);
    assert.equal(p.wrong, 1);
    assert.equal(p.due, T0 + (BOX_INTERVALS_DAYS[0] as number) * DAY_MS);
  });

  it("promotes one box at a time and caps at the top box", () => {
    let p = gradeCard(undefined, true, T0);
    for (let i = 0; i < 10; i++) p = gradeCard(p, true, T0);
    assert.equal(p.box, MAX_BOX);
    assert.equal(p.due, T0 + (BOX_INTERVALS_DAYS[MAX_BOX - 1] as number) * DAY_MS);
  });

  it("drops straight to box 1 on a miss, however high the card was", () => {
    let p = gradeCard(undefined, true, T0);
    for (let i = 0; i < 5; i++) p = gradeCard(p, true, T0);
    assert.equal(p.box, MAX_BOX);

    const missed = gradeCard(p, false, T0);
    assert.equal(missed.box, 1);
    assert.equal(missed.streak, 0);
    // Counts accumulate rather than reset.
    assert.equal(missed.correct, p.correct);
    assert.equal(missed.wrong, 1);
  });
});

describe("partitionByDueness", () => {
  const cards = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("splits unseen, due and scheduled cards", () => {
    const progress: Record<string, CardProgress> = {
      b: { box: 2, due: T0 - DAY_MS, lastReviewed: T0 - 2 * DAY_MS, correct: 1, wrong: 0, streak: 1 },
      c: { box: 3, due: T0 + 5 * DAY_MS, lastReviewed: T0, correct: 2, wrong: 0, streak: 2 },
    };
    const { fresh, due, later } = partitionByDueness(cards, progress, T0);
    assert.deepEqual(fresh.map((c) => c.id), ["a"]);
    assert.deepEqual(due.map((c) => c.id), ["b"]);
    assert.deepEqual(later.map((c) => c.id), ["c"]);
  });
});

describe("buildQueue", () => {
  const cards = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

  it("puts due cards before new ones, most overdue first", () => {
    const progress: Record<string, CardProgress> = {
      c: { box: 1, due: T0 - 10 * DAY_MS, lastReviewed: 0, correct: 0, wrong: 1, streak: 0 },
      d: { box: 1, due: T0 - DAY_MS, lastReviewed: 0, correct: 0, wrong: 1, streak: 0 },
    };
    const queue = buildQueue(cards, progress, T0, { shuffle: (x) => x });
    assert.deepEqual(queue.map((c) => c.id), ["c", "d", "a", "b"]);
  });

  it("omits cards scheduled for later unless asked for them", () => {
    const progress: Record<string, CardProgress> = {
      a: { box: 4, due: T0 + 20 * DAY_MS, lastReviewed: T0, correct: 4, wrong: 0, streak: 4 },
      b: { box: 4, due: T0 + 20 * DAY_MS, lastReviewed: T0, correct: 4, wrong: 0, streak: 4 },
      c: { box: 4, due: T0 + 20 * DAY_MS, lastReviewed: T0, correct: 4, wrong: 0, streak: 4 },
      d: { box: 4, due: T0 + 20 * DAY_MS, lastReviewed: T0, correct: 4, wrong: 0, streak: 4 },
    };
    assert.equal(buildQueue(cards, progress, T0, { shuffle: (x) => x }).length, 0);
    assert.equal(buildQueue(cards, progress, T0, { includeNotDue: true, shuffle: (x) => x }).length, 4);
  });

  it("respects a limit", () => {
    const queue = buildQueue(cards, {}, T0, { limit: 2, shuffle: (x) => x });
    assert.equal(queue.length, 2);
  });
});

describe("formatDue", () => {
  it("reports a card one interval out as due tomorrow, not in two days", () => {
    // The clock has advanced slightly by the time this renders, which is what
    // used to push a 1-day card into "due in 2 days".
    assert.equal(formatDue(T0 + DAY_MS, T0 - 30_000), "due tomorrow");
    assert.equal(formatDue(T0 + DAY_MS, T0), "due tomorrow");
  });

  it("reports overdue cards as due now", () => {
    assert.equal(formatDue(T0 - DAY_MS, T0), "due now");
  });

  it("scales the wording with the interval", () => {
    assert.equal(formatDue(T0 + 3 * DAY_MS, T0), "due in 3 days");
    assert.equal(formatDue(T0 + 21 * DAY_MS, T0), "due in 3 weeks");
    assert.equal(formatDue(T0 + 60 * DAY_MS, T0), "due in 2 months");
  });
});
