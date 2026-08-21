/**
 * Leitner-box spaced repetition.
 *
 * Five boxes with fixed intervals. A correct answer promotes the card one box,
 * a miss drops it straight back to box 1 -- the classic Leitner rule, which
 * suits binary self-grading better than an ease-factor scheme like SM-2 would.
 */

export const BOX_INTERVALS_DAYS = [1, 3, 7, 21, 60] as const;
export const MAX_BOX = BOX_INTERVALS_DAYS.length;

export const DAY_MS = 24 * 60 * 60 * 1000;

export interface CardProgress {
  /** 1..MAX_BOX. A card that has never been seen has no progress entry. */
  box: number;
  /** Epoch ms when the card next becomes due. */
  due: number;
  /** Epoch ms of the most recent review. */
  lastReviewed: number;
  correct: number;
  wrong: number;
  /** Consecutive correct answers; resets to 0 on a miss. */
  streak: number;
}

export function initialProgress(now: number): CardProgress {
  return { box: 1, due: now, lastReviewed: 0, correct: 0, wrong: 0, streak: 0 };
}

export function gradeCard(prev: CardProgress | undefined, correct: boolean, now: number): CardProgress {
  const base = prev ?? initialProgress(now);
  const box = correct ? Math.min(base.box + 1, MAX_BOX) : 1;
  const intervalDays = BOX_INTERVALS_DAYS[box - 1] ?? 1;
  return {
    box,
    due: now + intervalDays * DAY_MS,
    lastReviewed: now,
    correct: base.correct + (correct ? 1 : 0),
    wrong: base.wrong + (correct ? 0 : 1),
    streak: correct ? base.streak + 1 : 0,
  };
}

export function isDue(progress: CardProgress | undefined, now: number): boolean {
  return progress === undefined || progress.due <= now;
}

/** Cards never seen before are "new"; seen cards past their due date are "due". */
export function partitionByDueness<T extends { id: string }>(
  cards: T[],
  progress: Record<string, CardProgress | undefined>,
  now: number,
): { fresh: T[]; due: T[]; later: T[] } {
  const fresh: T[] = [];
  const due: T[] = [];
  const later: T[] = [];
  for (const card of cards) {
    const p = progress[card.id];
    if (!p) fresh.push(card);
    else if (p.due <= now) due.push(card);
    else later.push(card);
  }
  return { fresh, due, later };
}

/**
 * Build a study queue: everything due first (most overdue first), then unseen
 * cards. If both are empty the caller decides whether to study ahead.
 */
export function buildQueue<T extends { id: string }>(
  cards: T[],
  progress: Record<string, CardProgress | undefined>,
  now: number,
  opts: { limit?: number; includeNotDue?: boolean; shuffle?: (items: T[]) => T[] } = {},
): T[] {
  const { fresh, due, later } = partitionByDueness(cards, progress, now);
  due.sort((a, b) => (progress[a.id]?.due ?? 0) - (progress[b.id]?.due ?? 0));
  const shuffled = opts.shuffle ? opts.shuffle(fresh) : fresh;
  const queue = [...due, ...shuffled];
  if (opts.includeNotDue) {
    const rest = opts.shuffle ? opts.shuffle(later) : later;
    queue.push(...rest);
  }
  return typeof opts.limit === "number" ? queue.slice(0, opts.limit) : queue;
}

export function describeInterval(box: number): string {
  const days = BOX_INTERVALS_DAYS[Math.min(Math.max(box, 1), MAX_BOX) - 1] ?? 1;
  if (days === 1) return "tomorrow";
  if (days < 7) return `in ${days} days`;
  if (days === 7) return "in a week";
  if (days < 30) return `in ${Math.round(days / 7)} weeks`;
  return `in ${Math.round(days / 30)} months`;
}

export function formatDue(due: number, now: number): string {
  const delta = due - now;
  if (delta <= 0) return "due now";
  // Round rather than ceil: a card scheduled exactly one interval out is a
  // hair over a whole number of days by the time it is rendered, and ceil
  // would report every 1-day card as "due in 2 days".
  const days = Math.max(1, Math.round(delta / DAY_MS));
  if (days === 1) return "due tomorrow";
  if (days < 7) return `due in ${days} days`;
  if (days < 30) return `due in ${Math.round(days / 7)} weeks`;
  return `due in ${Math.round(days / 30)} months`;
}
