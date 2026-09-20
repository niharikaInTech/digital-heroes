'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { clampPercent } from '@/lib/config';

// Only allow redirects to pages inside our own site.
function safePath(next) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

export async function signIn(prev, formData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  if (!email || !password) return { error: 'Enter your email and password.' };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'Email or password is incorrect.' };

  redirect(safePath(formData.get('next')));
}

export async function signUp(prev, formData) {
  const full_name = String(formData.get('full_name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const charity_id = String(formData.get('charity_id') || '');
  const charity_percent = clampPercent(formData.get('charity_percent'));

  if (!full_name) return { error: 'Enter your name.' };
  if (!email) return { error: 'Enter your email.' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };
  if (!charity_id) return { error: 'Choose a charity to support.' };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // these land in auth.users.raw_user_meta_data and the DB trigger copies them to profiles
    options: { data: { full_name, charity_id, charity_percent } },
  });

  if (error) return { error: error.message };

  // If "Confirm email" is ON in Supabase there is no session yet.
  if (!data.session) {
    return { message: 'Check your inbox and confirm your email, then log in.' };
  }
  redirect('/subscribe');
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/');
}
