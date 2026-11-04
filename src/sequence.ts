export type Side = 'left' | 'right';

// A coin flip gives long runs of one side often enough that the player stops
// reading and just taps the same side again. Three in a row is the most we
// allow.
const MAX_RUN = 3;

function otherSide(side: Side): Side {
  return side === 'left' ? 'right' : 'left';
}

function runLength(sides: Side[]): number {
  const last = sides.at(-1);
  let count = 0;
  for (
    let index = sides.length - 1;
    index >= 0 && sides[index] === last;
    index--
  ) {
    count++;
  }
  return count;
}

// For the open-ended modes: a coin flip, except after MAX_RUN of one side.
export function getNextSide(previous: Side[]): Side {
  const last = previous.at(-1);
  if (last && runLength(previous) >= MAX_RUN) {
    return otherSide(last);
  }
  return Math.random() < 0.5 ? 'left' : 'right';
}

// For a fixed round: equal counts of each side (one apart for an odd length)
// in a random order that never runs past MAX_RUN. Each step picks at random
// between the sides that are still allowed, and a side is only allowed if
// what's left over can still be placed without breaking the run limit.
export function getRound(length: number): Side[] {
  const remaining = {
    left: Math.floor(length / 2),
    right: Math.floor(length / 2),
  };
  if (length % 2 === 1) {
    remaining[Math.random() < 0.5 ? 'left' : 'right']++;
  }

  const sides: Side[] = [];
  while (sides.length < length) {
    const allowed = (['left', 'right'] as const).filter((side) =>
      canPlace(side, sides, remaining),
    );
    const side = allowed[Math.floor(Math.random() * allowed.length)];
    sides.push(side);
    remaining[side]--;
  }
  return sides;
}

function canPlace(
  side: Side,
  sides: Side[],
  remaining: Record<Side, number>,
): boolean {
  if (remaining[side] === 0) {
    return false;
  }
  const run = sides.at(-1) === side ? runLength(sides) + 1 : 1;
  if (run > MAX_RUN) {
    return false;
  }

  // After placing this one, what's left has to fit both ways round. The
  // other side's prompts break up the rest of this side into stretches of
  // MAX_RUN, less what the current run already used. And this side's
  // prompts have to break up the other side the same way.
  const sameLeft = remaining[side] - 1;
  const otherLeft = remaining[otherSide(side)];
  return (
    sameLeft <= (otherLeft + 1) * MAX_RUN - run
    && otherLeft <= (sameLeft + 1) * MAX_RUN
  );
}
