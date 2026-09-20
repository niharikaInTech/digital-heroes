'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser, isActive } from '@/lib/auth';
import { validateScore } from '@/lib/scores';
import { MAX_SCORES, clampPercent } from '@/lib/config';

// ------------------------- SCORES ------------------------------------
// The DB trigger keeps only the latest 5. Everything else (duplicate date,
// too-old date, non-subscriber) is checked here for friendly messages.
// RLS in the database is the second lock behind these checks.

export async function addScore(prev, formData) {
  const { user, profile } = await requireUser();
  if (!isActive(profile)) return { error: 'Subscribe to enter scores.', ok: false };

  const parsed = validateScore(formData.get('score'), formData.get('played_on'));
  if (parsed.error) return { error: parsed.error, ok: false };

  const supabase = createClient();
  const { data: existing } = await supabase
    .from('scores')
    .select('played_on')
    .eq('user_id', user.id)
    .order('played_on', { ascending: false });

  if (existing.some((s) => s.played_on === parsed.played_on)) {
    return { error: 'You already have a score for that date. Edit or delete it instead.', ok: false };
  }
  // A 6th score older than all 5 would be deleted straight away - say so.
  if (existing.length >= MAX_SCORES && parsed.played_on < existing[MAX_SCORES - 1].played_on) {
    return { error: `That date is older than your latest ${MAX_SCORES} rounds, so it wouldn't be kept.`, ok: false };
  }

  const { error } = await supabase
    .from('scores')
    .insert({ user_id: user.id, score: parsed.score, played_on: parsed.played_on });
  if (error) return { error: 'Could not save the score. Try again.', ok: false };

  revalidatePath('/dashboard');
  return { error: null, ok: true };
}

export async function updateScore(prev, formData) {
  const { user, profile } = await requireUser();
  if (!isActive(profile)) return { error: 'Subscribe to edit scores.', ok: false };

  const parsed = validateScore(formData.get('score'), formData.get('played_on'));
  if (parsed.error) return { error: parsed.error, ok: false };

  const id = formData.get('id');
  const supabase = createClient();

  // Changing the date must not collide with another score's date.
  const { data: clash } = await supabase
    .from('scores')
    .select('id')
    .eq('user_id', user.id)
    .eq('played_on', parsed.played_on)
    .neq('id', id);
  if (clash?.length) return { error: 'Another score already uses that date.', ok: false };

  const { error } = await supabase
    .from('scores')
    .update({ score: parsed.score, played_on: parsed.played_on })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) return { error: 'Could not update the score.', ok: false };

  revalidatePath('/dashboard');
  return { error: null, ok: true };
}

export async function deleteScore(formData) {
  const { user } = await requireUser();
  const supabase = createClient();
  await supabase.from('scores').delete().eq('id', formData.get('id')).eq('user_id', user.id);
  revalidatePath('/dashboard');
}

// ------------------------- CHARITY -----------------------------------
export async function saveCharity(prev, formData) {
  const { user } = await requireUser();
  const charityId = String(formData.get('charity_id') || '');
  if (!charityId) return { error: 'Choose a charity.', ok: false };

  // Users have no UPDATE policy on profiles (so they can't make themselves
  // admin) - we update only these two fields with the service client.
  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({ charity_id: charityId, charity_percent: clampPercent(formData.get('charity_percent')) })
    .eq('id', user.id);
  if (error) return { error: 'Could not save your charity.', ok: false };

  revalidatePath('/dashboard');
  return { error: null, ok: true };
}

// ------------------------- WINNER PROOF ------------------------------
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

export async function uploadProof(prev, formData) {
  const { user } = await requireUser();
  const winnerId = String(formData.get('winner_id'));
  const file = formData.get('proof');

  if (!file || typeof file === 'string' || file.size === 0) {
    return { error: 'Choose a screenshot to upload.', ok: false };
  }
  if (!file.type.startsWith('image/')) return { error: 'The proof must be an image.', ok: false };
  if (file.size > MAX_PROOF_BYTES) return { error: 'The image must be under 5 MB.', ok: false };

  // RLS makes this query return nothing if the win belongs to someone else.
  const supabase = createClient();
  const { data: win } = await supabase
    .from('winners')
    .select('id, verification_status')
    .eq('id', winnerId)
    .eq('user_id', user.id)
    .single();
  if (!win) return { error: 'Win not found.', ok: false };
  if (!['awaiting_proof', 'rejected'].includes(win.verification_status)) {
    return { error: 'Proof was already submitted for this win.', ok: false };
  }

  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${user.id}/${winnerId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('proofs')
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: 'Upload failed. Try again.', ok: false };

  const admin = createAdminClient();
  await admin
    .from('winners')
    .update({ proof_path: path, verification_status: 'submitted' })
    .eq('id', winnerId);

  revalidatePath('/dashboard');
  return { error: null, ok: true };
}
