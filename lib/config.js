// One place for every business rule from the PRD.
// Change a number here and the whole app follows.

export const PLANS = {
  monthly: { id: 'monthly', label: 'Monthly', price: 999, months: 1 },
  yearly: { id: 'yearly', label: 'Yearly', price: 9999, months: 12 }, // discounted
};

export const MIN_CHARITY_PERCENT = 10; // PRD 08.1
export const MAX_CHARITY_PERCENT = 50; // our choice; platform keeps the rest
export const PRIZE_POOL_PERCENT = 40; // share of each fee that goes to the prize pool

export const SCORE_MIN = 1; // Stableford range, PRD 05
export const SCORE_MAX = 45;
export const MAX_SCORES = 5;

export const MIN_DONATION = 100;

// What one subscriber adds to the prize pool per month.
// A yearly plan is spread over 12 months so pools stay comparable.
export function monthlyFee(plan) {
  const p = PLANS[plan] ?? PLANS.monthly;
  return p.price / p.months;
}

export function prizeContribution(plan) {
  return (monthlyFee(plan) * PRIZE_POOL_PERCENT) / 100;
}

export function clampPercent(value) {
  const n = Math.round(Number(value));
  if (Number.isNaN(n)) return MIN_CHARITY_PERCENT;
  return Math.min(MAX_CHARITY_PERCENT, Math.max(MIN_CHARITY_PERCENT, n));
}
