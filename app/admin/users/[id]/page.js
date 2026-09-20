import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateUser, adminUpdateScore, adminDeleteScore } from '../../actions';
import { ScoreList } from '@/components/dashboard/ScoreManager';
import { MIN_CHARITY_PERCENT, MAX_CHARITY_PERCENT } from '@/lib/config';

export default async function AdminUserPage({ params }) {
  const supabase = createClient();
  const [{ data: user }, { data: charities }, { data: scores }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', params.id).single(),
    supabase.from('charities').select('id, name').order('name'),
    supabase.from('scores').select('*').eq('user_id', params.id).order('played_on', { ascending: false }),
  ]);
  if (!user) notFound();

  return (
    <div>
      <Link href="/admin/users" className="text-sm text-sage hover:text-cream">Back to users</Link>
      <h2 className="mt-3 text-2xl font-semibold">{user.full_name || user.email}</h2>
      <p className="muted text-sm">{user.email}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <form action={updateUser} className="panel space-y-4">
          <h3 className="text-lg font-semibold">Profile and subscription</h3>
          <input type="hidden" name="id" value={user.id} />
          <div>
            <label htmlFor="full_name" className="label">Name</label>
            <input id="full_name" name="full_name" defaultValue={user.full_name ?? ''} className="field" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="subscription_status" className="label">Subscription status</label>
              <select id="subscription_status" name="subscription_status" defaultValue={user.subscription_status} className="field">
                {['inactive', 'active', 'past_due', 'canceled'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="plan" className="label">Plan</label>
              <select id="plan" name="plan" defaultValue={user.plan ?? ''} className="field">
                <option value="">None</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="charity_id" className="label">Charity</label>
              <select id="charity_id" name="charity_id" defaultValue={user.charity_id ?? ''} className="field">
                <option value="">None</option>
                {(charities ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="charity_percent" className="label">Charity share (%)</label>
              <input id="charity_percent" name="charity_percent" type="number" min={MIN_CHARITY_PERCENT} max={MAX_CHARITY_PERCENT} defaultValue={user.charity_percent} className="field" />
            </div>
          </div>
          <button className="btn btn-primary">Save changes</button>
          <p className="muted text-xs">Changing the status here overrides Stripe until the next Stripe event arrives.</p>
        </form>

        <section className="panel">
          <h3 className="mb-4 text-lg font-semibold">Golf scores</h3>
          <ScoreList scores={scores ?? []} updateAction={adminUpdateScore} deleteAction={adminDeleteScore} userId={user.id} />
        </section>
      </div>
    </div>
  );
}
