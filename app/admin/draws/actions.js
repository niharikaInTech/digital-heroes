'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { prizeContribution } from '@/lib/config';
import { randomNumbers, weightedNumbers, settleDraw } from '@/lib/draw.mjs';

// "2026-09" from <input type="month"> -> "2026-09-01"
function monthToDate(month) {
  return /^\d{4}-\d{2}$/.test(month || '') ? `${month}-01` : null;
}

// Load everything the engine needs for a given month.
async function loadInputs(supabase, monthDate) {
  const { data: rows, error } = await supabase.rpc('draw_inputs');
  if (error) throw new Error(error.message);

  const entries = rows.map((r) => ({
    userId: r.user_id,
    name: r.name,
    scores: r.scores,
    plan: r.plan,
  }));
  const totalContribution = entries.reduce((sum, e) => sum + prizeContribution(e.plan), 0);

  // Jackpot left over from the most recent earlier draw
  const { data: prev } = await supabase
    .from('draws')
    .select('jackpot_carry_out')
    .lt('draw_month', monthDate)
    .order('draw_month', { ascending: false })
    .limit(1);

  return {
    entries,
    totalContribution,
    jackpotCarryIn: Number(prev?.[0]?.jackpot_carry_out ?? 0),
  };
}

function summarise(settled, entries, month, logic, numbers, jackpotCarryIn) {
  return {
    month,
    logic,
    numbers,
    participants: entries.length,
    pools: settled.pools,
    tierCounts: settled.tierCounts,
    jackpotCarryIn,
    jackpotCarryOut: settled.jackpotCarryOut,
    winners: settled.winners.map((w) => ({
      name: w.name,
      matchType: w.matchType,
      prize: w.prize,
    })),
  };
}

// ---- Step 1: simulate. Nothing is saved. -----------------------------
export async function simulateDraw(prev, formData) {
  await requireAdmin();
  const month = String(formData.get('month'));
  const logic = String(formData.get('logic'));
  const monthDate = monthToDate(month);
  if (!monthDate) return { error: 'Pick a month.' };
  if (!['random', 'algorithmic'].includes(logic)) return { error: 'Pick a draw logic.' };

  const supabase = createClient();

  const { data: existing } = await supabase
    .from('draws')
    .select('id')
    .eq('draw_month', monthDate);
  if (existing?.length) return { error: 'A draw for this month is already published.' };

  const inputs = await loadInputs(supabase, monthDate);
  if (inputs.entries.length === 0) return { error: 'No active subscribers yet - nobody to draw for.' };

  const numbers =
    logic === 'algorithmic'
      ? weightedNumbers(inputs.entries.flatMap((e) => e.scores))
      : randomNumbers();

  const settled = settleDraw({
    entries: inputs.entries,
    winning: numbers,
    totalContribution: inputs.totalContribution,
    jackpotCarryIn: inputs.jackpotCarryIn,
  });

  return { result: summarise(settled, inputs.entries, month, logic, numbers, inputs.jackpotCarryIn) };
}

// ---- Step 2: publish the SAME numbers the admin just saw. ------------
export async function publishDraw(prev, formData) {
  await requireAdmin();
  const month = String(formData.get('month'));
  const logic = String(formData.get('logic'));
  const monthDate = monthToDate(month);
  const numbers = String(formData.get('numbers') || '')
    .split(',')
    .map(Number);

  if (!monthDate || !['random', 'algorithmic'].includes(logic)) return { error: 'Invalid draw.' };
  if (numbers.length !== 5 || new Set(numbers).size !== 5 || numbers.some((n) => !(n >= 1 && n <= 45))) {
    return { error: 'Invalid winning numbers.' };
  }

  const supabase = createClient();
  // Recompute with live data in case subscribers/scores changed since the simulation.
  const inputs = await loadInputs(supabase, monthDate);
  const settled = settleDraw({
    entries: inputs.entries,
    winning: numbers,
    totalContribution: inputs.totalContribution,
    jackpotCarryIn: inputs.jackpotCarryIn,
  });

  const { data: draw, error } = await supabase
    .from('draws')
    .insert({
      draw_month: monthDate,
      logic,
      winning_numbers: numbers,
      participants: inputs.entries.length,
      prize_pool: settled.pools.total,
      tier5_pool: settled.pools[5],
      tier4_pool: settled.pools[4],
      tier3_pool: settled.pools[3],
      jackpot_carry_in: inputs.jackpotCarryIn,
      jackpot_carry_out: settled.jackpotCarryOut,
    })
    .select('id')
    .single();

  // unique(draw_month) protects against double-clicking Publish
  if (error) return { error: error.code === '23505' ? 'This month was already published.' : 'Could not publish the draw.' };

  await supabase.from('draw_entries').insert(
    settled.results.map((r) => ({
      draw_id: draw.id,
      user_id: r.userId,
      scores: r.scores,
      match_count: r.matchCount,
    }))
  );

  if (settled.winners.length) {
    await supabase.from('winners').insert(
      settled.winners.map((w) => ({
        draw_id: draw.id,
        user_id: w.userId,
        match_type: w.matchType,
        prize_amount: w.prize,
      }))
    );
  }

  revalidatePath('/admin/draws');
  revalidatePath('/admin/winners');
  revalidatePath('/dashboard');
  return { ok: true, message: `Published. ${settled.winners.length} winner(s) created.` };
}
