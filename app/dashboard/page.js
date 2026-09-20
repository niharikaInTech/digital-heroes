import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireUser, isActive } from '@/lib/auth';
import { addScore, updateScore, deleteScore, saveCharity, uploadProof } from './actions';
import { openBillingPortal } from '@/app/actions/billing';
import { AddScoreForm, ScoreList } from '@/components/dashboard/ScoreManager';
import CharityPicker from '@/components/dashboard/CharityPicker';
import ProofForm from '@/components/dashboard/ProofForm';
import { PLANS } from '@/lib/config';
import { fmtDate, fmtMonth, inr } from '@/lib/format';

export const metadata = { title: 'Dashboard - Digital Heroes' };

const VERIFY_LABEL = {
  awaiting_proof: ['Upload proof', 'badge-copper'],
  submitted: ['Under review', 'badge-grey'],
  approved: ['Approved', 'badge-green'],
  rejected: ['Rejected - upload again', 'badge-red'],
};

export default async function Dashboard({ searchParams }) {
  const { user, profile } = await requireUser();
  const supabase = createClient();
  const active = isActive(profile); // checked fresh on every request

  const [scoresRes, charitiesRes, entriesRes, winsRes, lastDrawRes] = await Promise.all([
    supabase.from('scores').select('*').eq('user_id', user.id).order('played_on', { ascending: false }),
    supabase.from('charities').select('id, name').order('name'),
    supabase
      .from('draw_entries')
      .select('match_count, scores, draws(draw_month, winning_numbers)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('winners').select('*, draws(draw_month)').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('draws').select('draw_month').order('draw_month', { ascending: false }).limit(1),
  ]);

  const scores = scoresRes.data ?? [];
  const entries = entriesRes.data ?? [];
  const wins = winsRes.data ?? [];

  // "Upcoming draw" = this month, or next month if this month's is already out.
  const now = new Date();
  const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const latest = lastDrawRes.data?.[0]?.draw_month;
  const upcoming =
    latest && new Date(latest) >= thisMonth
      ? new Date(Date.UTC(thisMonth.getUTCFullYear(), thisMonth.getUTCMonth() + 1, 1))
      : thisMonth;

  const totalWon = wins.reduce((s, w) => s + Number(w.prize_amount), 0);
  const totalPaid = wins.filter((w) => w.payment_status === 'paid').reduce((s, w) => s + Number(w.prize_amount), 0);

  const statusBadge = active
    ? ['Active', 'badge-green']
    : profile.subscription_status === 'past_due'
      ? ['Payment failed', 'badge-red']
      : profile.subscription_status === 'canceled'
        ? ['Cancelled', 'badge-grey']
        : ['Not subscribed', 'badge-grey'];

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="text-3xl font-semibold sm:text-4xl">Hi, {profile.full_name?.split(' ')[0] || 'there'}</h1>

      {searchParams?.subscribed && !active && (
        <p className="success mt-5" role="status">
          Payment received. Your subscription can take a few seconds to show as active - refresh the page in a moment.
        </p>
      )}
      {!active && (
        <div className="panel mt-6 flex flex-wrap items-center justify-between gap-4 !border-copper/50">
          <p>Subscribe to enter scores and join the monthly draw.</p>
          <Link href="/subscribe" className="btn btn-copper">Choose a plan</Link>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* ---------- LEFT COLUMN ---------- */}
        <div className="space-y-6">
          <section className="panel">
            <h2 className="text-xl font-semibold">Your scores</h2>
            <p className="muted mb-5 mt-1 text-sm">Your five latest rounds, newest first. These are matched against the draw.</p>
            <AddScoreForm action={addScore} disabled={!active} />
            <div className="mt-6">
              <ScoreList scores={scores} updateAction={updateScore} deleteAction={deleteScore} disabled={!active} />
            </div>
          </section>

          <section className="panel">
            <h2 className="text-xl font-semibold">Draw participation</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="muted text-sm">Draws entered</p>
                <p className="text-3xl font-semibold">{entries.length}</p>
              </div>
              <div>
                <p className="muted text-sm">Next draw</p>
                <p className="text-xl font-semibold">{active ? fmtMonth(upcoming) : 'Subscribe to enter'}</p>
              </div>
            </div>
            {entries.length > 0 && (
              <ul className="mt-5 divide-y divide-cream/10 text-sm">
                {entries.slice(0, 6).map((e, i) => (
                  <li key={i} className="flex items-center justify-between py-2.5">
                    <span>{fmtMonth(e.draws?.draw_month)}</span>
                    <span className="muted">Drawn: {e.draws?.winning_numbers?.join(', ')}</span>
                    <span className={`badge ${e.match_count >= 3 ? 'badge-green' : 'badge-grey'}`}>
                      {e.match_count} matched
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ---------- RIGHT COLUMN ---------- */}
        <div className="space-y-6">
          <section className="panel">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Subscription</h2>
              <span className={`badge ${statusBadge[1]}`}>{statusBadge[0]}</span>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="muted">Plan</dt><dd>{profile.plan ? PLANS[profile.plan].label : '-'}</dd></div>
              <div className="flex justify-between"><dt className="muted">{active ? 'Renews on' : 'Ended on'}</dt><dd>{fmtDate(profile.current_period_end)}</dd></div>
            </dl>
            {profile.stripe_customer_id ? (
              <form action={openBillingPortal}>
                <button className="btn btn-ghost mt-5 w-full">Manage or cancel plan</button>
              </form>
            ) : (
              <Link href="/subscribe" className="btn btn-primary mt-5 w-full">Choose a plan</Link>
            )}
          </section>

          <section className="panel">
            <h2 className="mb-4 text-xl font-semibold">Your charity</h2>
            <CharityPicker
              action={saveCharity}
              charities={charitiesRes.data ?? []}
              currentId={profile.charity_id}
              currentPercent={profile.charity_percent}
              plan={profile.plan}
            />
          </section>

          <section className="panel">
            <h2 className="text-xl font-semibold">Winnings</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div><p className="muted text-sm">Total won</p><p className="text-2xl font-semibold text-copper">{inr(totalWon)}</p></div>
              <div><p className="muted text-sm">Paid out</p><p className="text-2xl font-semibold">{inr(totalPaid)}</p></div>
            </div>

            {wins.length === 0 ? (
              <p className="muted mt-4 text-sm">No wins yet. Match three or more numbers in a draw to win.</p>
            ) : (
              <ul className="mt-5 space-y-4">
                {wins.map((w) => {
                  const [label, cls] = VERIFY_LABEL[w.verification_status];
                  return (
                    <li key={w.id} className="rounded-xl border border-cream/10 p-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{fmtMonth(w.draws?.draw_month)} - {w.match_type} numbers</span>
                        <span className="text-copper">{inr(w.prize_amount)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`badge ${cls}`}>{label}</span>
                        <span className={`badge ${w.payment_status === 'paid' ? 'badge-green' : 'badge-grey'}`}>
                          Payment {w.payment_status}
                        </span>
                      </div>
                      {['awaiting_proof', 'rejected'].includes(w.verification_status) && (
                        <ProofForm action={uploadProof} winnerId={w.id} />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
