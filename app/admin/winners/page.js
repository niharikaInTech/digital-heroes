import { createClient } from '@/lib/supabase/server';
import { reviewWinner, markPaid } from '../actions';
import { fmtMonth, inr } from '@/lib/format';

export const metadata = { title: 'Winners - Admin' };

const VERIFY = {
  awaiting_proof: ['Waiting for proof', 'badge-copper'],
  submitted: ['Needs review', 'badge-grey'],
  approved: ['Approved', 'badge-green'],
  rejected: ['Rejected', 'badge-red'],
};

export default async function WinnersPage() {
  const supabase = createClient();
  const { data: winners } = await supabase
    .from('winners')
    .select('*, profiles(full_name, email), draws(draw_month)')
    .order('created_at', { ascending: false });

  // Proofs live in a private bucket, so each link is a 1-hour signed URL.
  const withLinks = await Promise.all(
    (winners ?? []).map(async (w) => {
      if (!w.proof_path) return { ...w, proofUrl: null };
      const { data } = await supabase.storage.from('proofs').createSignedUrl(w.proof_path, 3600);
      return { ...w, proofUrl: data?.signedUrl ?? null };
    })
  );

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr><th>Winner</th><th>Draw</th><th>Prize</th><th>Proof</th><th>Verification</th><th>Payment</th></tr>
        </thead>
        <tbody>
          {withLinks.map((w) => {
            const [label, cls] = VERIFY[w.verification_status];
            return (
              <tr key={w.id}>
                <td>
                  <p className="font-medium">{w.profiles?.full_name || '-'}</p>
                  <p className="muted text-xs">{w.profiles?.email}</p>
                </td>
                <td>{fmtMonth(w.draws?.draw_month)}<p className="muted text-xs">{w.match_type} numbers</p></td>
                <td className="text-copper">{inr(w.prize_amount)}</td>
                <td>
                  {w.proofUrl ? (
                    <a href={w.proofUrl} target="_blank" rel="noopener noreferrer" className="text-sage hover:text-cream">View screenshot</a>
                  ) : <span className="muted">None yet</span>}
                </td>
                <td>
                  <span className={`badge ${cls}`}>{label}</span>
                  {w.verification_status === 'submitted' && (
                    <form action={reviewWinner} className="mt-2 flex gap-2">
                      <input type="hidden" name="id" value={w.id} />
                      <button name="decision" value="approved" className="btn btn-primary !px-3 !py-1">Approve</button>
                      <button name="decision" value="rejected" className="btn btn-danger !px-3 !py-1">Reject</button>
                    </form>
                  )}
                </td>
                <td>
                  <span className={`badge ${w.payment_status === 'paid' ? 'badge-green' : 'badge-grey'}`}>{w.payment_status}</span>
                  {w.verification_status === 'approved' && w.payment_status === 'pending' && (
                    <form action={markPaid} className="mt-2">
                      <input type="hidden" name="id" value={w.id} />
                      <button className="btn btn-copper !px-3 !py-1">Mark as paid</button>
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
          {withLinks.length === 0 && (
            <tr><td colSpan={6} className="muted py-8 text-center">No winners yet. Publish a draw to create them.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
