import { createClient } from '@/lib/supabase/server';
import DrawConsole from '@/components/admin/DrawConsole';
import { simulateDraw, publishDraw } from './actions';
import { fmtMonth, inr } from '@/lib/format';

export const metadata = { title: 'Draws - Admin' };

export default async function DrawsPage() {
  const supabase = createClient();
  const { data: draws } = await supabase.from('draws').select('*').order('draw_month', { ascending: false });

  const now = new Date();
  const defaultMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-4 text-xl font-semibold">Run a draw</h2>
        <DrawConsole simulate={simulateDraw} publish={publishDraw} defaultMonth={defaultMonth} />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Published draws</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Month</th><th>Numbers</th><th>Logic</th><th>Players</th><th>Pool</th><th>Jackpot carried out</th></tr></thead>
            <tbody>
              {(draws ?? []).map((d) => (
                <tr key={d.id}>
                  <td className="font-medium">{fmtMonth(d.draw_month)}</td>
                  <td>{d.winning_numbers.join(', ')}</td>
                  <td>{d.logic}</td>
                  <td>{d.participants}</td>
                  <td>{inr(Number(d.tier5_pool) + Number(d.tier4_pool) + Number(d.tier3_pool))}</td>
                  <td>{inr(d.jackpot_carry_out)}</td>
                </tr>
              ))}
              {(draws ?? []).length === 0 && (
                <tr><td colSpan={6} className="muted py-8 text-center">No draws published yet. Run a simulation above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
