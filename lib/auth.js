import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

// Returns the logged-in user and their profile (or nulls).
export async function getSessionProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, charities(id, name)')
    .eq('id', user.id)
    .single();

  return { user, profile };
}

export async function requireUser() {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect('/login');
  return { user, profile };
}

export async function requireAdmin() {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect('/admin/login');
  if (profile.role !== 'admin') redirect('/dashboard');
  return { user, profile };
}

// Subscription is "active" only if Stripe says so AND the paid period
// hasn't run out. Checked on every request, not cached.
export function isActive(profile) {
  if (!profile || profile.subscription_status !== 'active') return false;
  if (!profile.current_period_end) return true;
  return new Date(profile.current_period_end) > new Date();
}
