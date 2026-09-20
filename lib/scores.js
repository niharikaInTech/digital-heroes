import { SCORE_MIN, SCORE_MAX } from './config';

// Shared validation for the user dashboard and the admin panel.
export function validateScore(rawScore, rawDate) {
  const score = Number(rawScore);
  if (!Number.isInteger(score) || score < SCORE_MIN || score > SCORE_MAX) {
    return { error: `Score must be a whole number from ${SCORE_MIN} to ${SCORE_MAX}.` };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate || '') || Number.isNaN(Date.parse(rawDate))) {
    return { error: 'Pick a valid date.' };
  }
  const today = new Date().toISOString().slice(0, 10);
  if (rawDate > today) {
    return { error: "The date can't be in the future." };
  }
  return { score, played_on: rawDate };
}
