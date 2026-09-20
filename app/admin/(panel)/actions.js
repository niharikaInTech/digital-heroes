'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { validateScore } from '@/lib/scores';
import { clampPercent } from '@/lib/config';

// Every action starts with requireAdmin(). The database RLS policies
// (is_admin()) are a second lock in case one is ever forgotten.

// ------------------------- USERS -------------------------------------
export async function updateUser(formData) {
  await requireAdmin();
  const supabase = createClient();
  const id = formData.get('id');
  const status = String(formData.get('subscription_status'));
  if (!['inactive', 'active', 'past_due', 'canceled'].includes(status)) return;

  await supabase
    .from('profiles')
    .update({
      full_name: String(formData.get('full_name') || '').trim(),
      charity_id: formData.get('charity_id') || null,
      charity_percent: clampPercent(formData.get('charity_percent')),
      subscription_status: status,
      plan: formData.get('plan') || null,
    })
    .eq('id', id);

  revalidatePath(`/admin/users/${id}`);
  revalidatePath('/admin/users');
}

export async function adminUpdateScore(prev, formData) {
  await requireAdmin();
  const parsed = validateScore(formData.get('score'), formData.get('played_on'));
  if (parsed.error) return { error: parsed.error, ok: false };

  const supabase = createClient();
  const userId = formData.get('user_id');
  const id = formData.get('id');

  const { data: clash } = await supabase
    .from('scores')
    .select('id')
    .eq('user_id', userId)
    .eq('played_on', parsed.played_on)
    .neq('id', id);
  if (clash?.length) return { error: 'Another score already uses that date.', ok: false };

  const { error } = await supabase
    .from('scores')
    .update({ score: parsed.score, played_on: parsed.played_on })
    .eq('id', id);
  if (error) return { error: 'Could not update the score.', ok: false };

  revalidatePath(`/admin/users/${userId}`);
  return { error: null, ok: true };
}

export async function adminDeleteScore(formData) {
  await requireAdmin();
  const supabase = createClient();
  await supabase.from('scores').delete().eq('id', formData.get('id'));
  revalidatePath(`/admin/users/${formData.get('user_id')}`);
}

// ------------------------- CHARITIES ---------------------------------
// Events are typed one per line:  Title | 2026-11-02 | Location
function parseEvents(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, date, location] = line.split('|').map((s) => s.trim());
      return { title, date: date || null, location: location || '' };
    });
}

function charityFields(formData) {
  return {
    name: String(formData.get('name') || '').trim(),
    description: String(formData.get('description') || '').trim(),
    image_url: String(formData.get('image_url') || '').trim() || null,
    website: String(formData.get('website') || '').trim() || null,
    featured: formData.get('featured') === 'on',
    events: parseEvents(formData.get('events')),
  };
}

export async function createCharity(formData) {
  await requireAdmin();
  const fields = charityFields(formData);
  if (!fields.name) return;
  const supabase = createClient();
  await supabase.from('charities').insert(fields);
  revalidatePath('/admin/charities');
  revalidatePath('/charities');
  revalidatePath('/');
}

export async function updateCharity(formData) {
  await requireAdmin();
  const fields = charityFields(formData);
  if (!fields.name) return;
  const supabase = createClient();
  await supabase.from('charities').update(fields).eq('id', formData.get('id'));
  revalidatePath('/admin/charities');
  revalidatePath('/charities');
  revalidatePath('/');
}

export async function deleteCharity(formData) {
  await requireAdmin();
  const supabase = createClient();
  await supabase.from('charities').delete().eq('id', formData.get('id'));
  revalidatePath('/admin/charities');
  revalidatePath('/charities');
  revalidatePath('/');
}

// ------------------------- WINNERS -----------------------------------
export async function reviewWinner(formData) {
  await requireAdmin();
  const decision = formData.get('decision'); // 'approved' | 'rejected'
  if (!['approved', 'rejected'].includes(decision)) return;
  const supabase = createClient();
  await supabase
    .from('winners')
    .update({ verification_status: decision })
    .eq('id', formData.get('id'))
    .eq('verification_status', 'submitted'); // only reviewable when proof was sent
  revalidatePath('/admin/winners');
}

export async function markPaid(formData) {
  await requireAdmin();
  const supabase = createClient();
  await supabase
    .from('winners')
    .update({ payment_status: 'paid' })
    .eq('id', formData.get('id'))
    .eq('verification_status', 'approved'); // can't pay before approval
  revalidatePath('/admin/winners');
}
