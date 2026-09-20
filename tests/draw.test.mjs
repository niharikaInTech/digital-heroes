import test from 'node:test';
import assert from 'node:assert/strict';
import {
  randomNumbers,
  weightedNumbers,
  countMatches,
  calculatePools,
  settleDraw,
} from '../lib/draw.mjs';

test('random draw gives 5 different numbers between 1 and 45', () => {
  for (let i = 0; i < 200; i++) {
    const nums = randomNumbers();
    assert.equal(nums.length, 5);
    assert.equal(new Set(nums).size, 5);
    assert.ok(nums.every((n) => n >= 1 && n <= 45));
  }
});

test('weighted draw favours frequent scores', () => {
  // everyone scored 30 -> 30 should be drawn far more often than chance
  const scores = Array(500).fill(30);
  let hits = 0;
  for (let i = 0; i < 300; i++) if (weightedNumbers(scores).includes(30)) hits++;
  assert.ok(hits > 250, `30 appeared only ${hits}/300 times`);
});

test('weighted draw never repeats a number', () => {
  for (let i = 0; i < 200; i++) {
    assert.equal(new Set(weightedNumbers([1, 1, 2, 3])).size, 5);
  }
});

test('countMatches ignores duplicate scores', () => {
  assert.equal(countMatches([10, 10, 20, 30, 40], [10, 20, 5, 6, 7]), 2);
});

test('pool tiers split 40 / 35 / 25', () => {
  const p = calculatePools(1000);
  assert.deepEqual([p[5], p[4], p[3]], [400, 350, 250]);
});

test('jackpot carry-in is added to the 5-match tier only', () => {
  const p = calculatePools(1000, 500);
  assert.equal(p[5], 900);
  assert.equal(p[4], 350);
});

test('prize is split equally between winners in the same tier', () => {
  const entries = [
    { userId: 'a', name: 'A', scores: [1, 2, 3, 40, 41] },
    { userId: 'b', name: 'B', scores: [1, 2, 3, 42, 43] },
    { userId: 'c', name: 'C', scores: [9, 9, 9, 9, 9] },
  ];
  const r = settleDraw({ entries, winning: [1, 2, 3, 4, 5], totalContribution: 1000 });
  const threeMatch = r.winners.filter((w) => w.matchType === 3);
  assert.equal(threeMatch.length, 2);
  assert.equal(threeMatch[0].prize, 125); // 250 / 2
});

test('unclaimed jackpot rolls over; unclaimed 3/4 tiers do not', () => {
  const entries = [{ userId: 'a', name: 'A', scores: [1, 2, 3, 40, 41] }];
  const r = settleDraw({ entries, winning: [1, 2, 3, 4, 5], totalContribution: 1000, jackpotCarryIn: 100 });
  assert.equal(r.jackpotCarryOut, 500); // 400 + 100 carried in
});

test('a 5-number match takes the jackpot and nothing rolls over', () => {
  const entries = [{ userId: 'a', name: 'A', scores: [1, 2, 3, 4, 5] }];
  const r = settleDraw({ entries, winning: [1, 2, 3, 4, 5], totalContribution: 1000 });
  assert.equal(r.winners[0].matchType, 5);
  assert.equal(r.winners[0].prize, 400);
  assert.equal(r.jackpotCarryOut, 0);
});

test('never pays out more than the pool (rounding)', () => {
  const entries = ['a', 'b', 'c'].map((id) => ({ userId: id, name: id, scores: [1, 2, 3, 30, 31] }));
  const r = settleDraw({ entries, winning: [1, 2, 3, 4, 5], totalContribution: 100 });
  const paid = r.winners.reduce((s, w) => s + w.prize, 0);
  assert.ok(paid <= 25 + 1e-9);
});
