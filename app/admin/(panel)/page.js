import { createClient } from '@/lib/supabase/server';
import { prizeContribution } from '@/lib/config';
import { inr } from '@/lib/format';

export const metadata = { title: 'Reports - Admin' };

function Stat({ label, value, hint }) {
  return (
    <div className="panel !p-5">
      <p className="muted text-sm">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
      {hint && <p className="muted mt-1 text-xs">{hint}</p>}
    </div>
  );
}

export default async function Reports() {
  const supabase = createClient();
  // one SQL function does all the aggregating (see supabase/schema.sql)
  const { data: r, error } = await supabase.rpc('admin_report');
  if (error) return <p className="error">Could not load the report: {error.message}</p>;

  const activeTotal = r.active_monthly + r.active_yearly;
  const nextPool =
    r.active_monthly * prizeContribution('monthly') +
    r.active_yearly * prizeContribution('yearly') +
    Number(r.jackpot_carry);

  const charityRows = r.charity_totals;
  const charityTotal = charityRows.reduce((s, c) => s + Number(c.subscriptions) + Number(c.donations), 0);
  const maxRow = Math.max(1, ...charityRows.map((c) => Number(c.subscriptions) + Number(c.donations)));

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-4 text-xl font-semibold">Users</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Total users" value={r.total_users} />
          <Stat label="Active subscribers" value={activeTotal} hint={`${r.active_monthly} monthly, ${r.active_yearly} yearly`} />
          <Stat label="Conversion" value={r.total_users ? `${Math.round((activeTotal / r.total_users) * 100)}%` : '0%'} hint="Users with an active plan" />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Prize pool</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Estimated next pool" value={inr(nextPool)} hint="Active subscribers plus jackpot carried over" />
          <Stat label="Paid into pools so far" value={inr(r.total_pool_paid_in)} hint={`${r.draws_published} draws published`} />
          <Stat label="Jackpot carrying over" value={inr(r.jackpot_carry)} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Draw statistics</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Winners" value={r.total_winners} />
          <Stat label="Prizes awarded" value={inr(r.prizes_awarded)} />
          <Stat label="Prizes paid out" value={inr(r.prizes_paid)} hint={`${inr(r.prizes_awarded - r.prizes_paid)} still pending`} />
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-xl font-semibold">Charity contributions</h2>
        <p className="muted mb-4 text-sm">Total raised: {inr(charityTotal)} (subscriptions plus direct donations)</p>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Charity</th><th>From subscriptions</th><th>Donations</th><th className="w-1/3">Share</th></tr></thead>
            <tbody>
              {charityRows.map((c) => {
                const total = Number(c.subscriptions) + Number(c.donations);
                return (
                  <tr key={c.id}>
                    <td className="font-medium">{c.name}</td>
                    <td>{inr(c.subscriptions)}</td>
                    <td>{inr(c.donations)}</td>
                    <td><div className="h-2 rounded-full bg-ink"><div className="h-full rounded-full bg-sage" style={{ width: `${(total / maxRow) * 100}%` }} /></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
