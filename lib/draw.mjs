// =====================================================================
// Draw engine + prize maths. Pure functions only (no database here),
// which makes them easy to test - see tests/draw.test.mjs
// =====================================================================

export const NUMBER_MIN = 1;
export const NUMBER_MAX = 45;
export const PICK_COUNT = 5;

// PRD 07: share of the pool for each match type
export const POOL_SPLIT = { 5: 0.4, 4: 0.35, 3: 0.25 };

const round2 = (n) => Math.round(n * 100) / 100;
const byNumber = (a, b) => a - b;

/** Standard lottery: 5 different numbers between 1 and 45. */
export function randomNumbers(rng = Math.random) {
  const picked = new Set();
  while (picked.size < PICK_COUNT) {
    picked.add(NUMBER_MIN + Math.floor(rng() * (NUMBER_MAX - NUMBER_MIN + 1)));
  }
  return [...picked].sort(byNumber);
}

/**
 * Algorithmic draw: numbers that appear more often in players' scores are
 * more likely to be drawn. Every number keeps a base weight of 1, so even a
 * score nobody has entered can still come up.
 */
export function weightedNumbers(allScores, rng = Math.random) {
  const weight = {};
  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n++) weight[n] = 1;
  for (const s of allScores) if (weight[s] !== undefined) weight[s] += 1;

  const picked = [];
  while (picked.length < PICK_COUNT) {
    const pool = Object.keys(weight)
      .map(Number)
      .filter((n) => !picked.includes(n)); // no duplicates
    const total = pool.reduce((sum, n) => sum + weight[n], 0);
    let roll = rng() * total;
    const before = picked.length;
    for (const n of pool) {
      roll -= weight[n];
      if (roll < 0) {
        picked.push(n);
        break;
      }
    }
    // safety net for floating point edge cases
    if (picked.length === before) picked.push(pool[pool.length - 1]);
  }
  return picked.sort(byNumber);
}

/** How many DIFFERENT score values of the player appear in the draw. */
export function countMatches(userScores, winning) {
  const drawn = new Set(winning);
  return [...new Set(userScores)].filter((s) => drawn.has(s)).length;
}

/**
 * Split this month's money into the three tiers.
 * The 5-match tier also receives any jackpot carried in from last month.
 */
export function calculatePools(totalContribution, jackpotCarryIn = 0) {
  return {
    total: round2(totalContribution),
    5: round2(totalContribution * POOL_SPLIT[5] + jackpotCarryIn),
    4: round2(totalContribution * POOL_SPLIT[4]),
    3: round2(totalContribution * POOL_SPLIT[3]),
  };
}

/**
 * Run a whole draw.
 * entries: [{ userId, name, scores: [12, 30, ...] }]
 * returns pools, every player's match count, the winners with prize
 * amounts, and how much jackpot rolls over to next month.
 */
export function settleDraw({
  entries,
  winning,
  totalContribution,
  jackpotCarryIn = 0,
}) {
  const pools = calculatePools(totalContribution, jackpotCarryIn);

  const results = entries.map((e) => ({
    ...e,
    matchCount: countMatches(e.scores, winning),
  }));

  const winners = [];
  const tierCounts = { 5: 0, 4: 0, 3: 0 };

  for (const tier of [5, 4, 3]) {
    const inTier = results.filter((r) => r.matchCount === tier);
    tierCounts[tier] = inTier.length;
    if (inTier.length === 0) continue;

    // equal split; round DOWN so we never pay out more than the pool
    const share = Math.floor((pools[tier] * 100) / inTier.length) / 100;
    for (const r of inTier) {
      winners.push({
        userId: r.userId,
        name: r.name,
        matchType: tier,
        prize: share,
      });
    }
  }

  // PRD: only the 5-match jackpot rolls over. 3/4 tiers with no winner do not.
  const jackpotCarryOut = tierCounts[5] === 0 ? pools[5] : 0;

  return { pools, results, winners, tierCounts, jackpotCarryOut };
}
