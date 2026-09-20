'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { inr, fmtMonth } from '@/lib/format';

function Btn({ children, className = 'btn btn-primary', busy = 'Working...' }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending}>{pending ? busy : children}</button>;
}

// Two steps: 1) simulate (saves nothing)  2) publish the same numbers.
export default function DrawConsole({ simulate, publish, defaultMonth }) {
  const [sim, simAction] = useFormState(simulate, null);
  const [pub, pubAction] = useFormState(publish, null);
  const r = sim?.result;

  return (
    <div className="space-y-6">
      <form action={simAction} className="panel grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="month" className="label">Draw month</label>
          <input id="month" name="month" type="month" defaultValue={defaultMonth} className="field" required />
        </div>
        <div>
          <label htmlFor="logic" className="label">Draw logic</label>
          <select id="logic" name="logic" className="field" defaultValue="random">
            <option value="random">Random (standard lottery)</option>
            <option value="algorithmic">Algorithmic (weighted by score frequency)</option>
          </select>
        </div>
        <Btn busy="Simulating...">Run simulation</Btn>
      </form>

      {sim?.error && <p className="error" role="alert">{sim.error}</p>}

      {r && (
        <section className="panel space-y-6">
          <div>
            <p className="muted text-sm">Simulated result for {fmtMonth(`${r.month}-01`)}. Nothing is saved yet.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {r.numbers.map((n) => (
                <span key={n} className="flex h-14 w-14 items-center justify-center rounded-full bg-copper text-xl font-semibold text-ink">{n}</span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div><p className="muted text-sm">Participants</p><p className="text-2xl font-semibold">{r.participants}</p></div>
            <div><p className="muted text-sm">New pool</p><p className="text-2xl font-semibold">{inr(r.pools.total)}</p></div>
            <div><p className="muted text-sm">Jackpot carried in</p><p className="text-2xl font-semibold">{inr(r.jackpotCarryIn)}</p></div>
            <div><p className="muted text-sm">Jackpot carrying out</p><p className="text-2xl font-semibold">{inr(r.jackpotCarryOut)}</p></div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Tier</th><th>Pool</th><th>Winners</th><th>Each wins</th></tr></thead>
              <tbody>
                {[5, 4, 3].map((t) => {
                  const each = r.winners.find((w) => w.matchType === t)?.prize;
                  return (
                    <tr key={t}>
                      <td>{t} numbers</td>
                      <td>{inr(r.pools[t])}</td>
                      <td>{r.tierCounts[t]}</td>
                      <td>{each !== undefined ? inr(each) : t === 5 ? 'Rolls over' : 'Unclaimed'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {r.winners.length > 0 && (
            <ul className="muted text-sm">
              {r.winners.map((w, i) => (
                <li key={i}>{w.name} - {w.matchType} numbers - {inr(w.prize)}</li>
              ))}
            </ul>
          )}

          {pub?.ok ? (
            <p className="success" role="status">{pub.message}</p>
          ) : (
            <form action={pubAction} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="month" value={r.month} />
              <input type="hidden" name="logic" value={r.logic} />
              <input type="hidden" name="numbers" value={r.numbers.join(',')} />
              <Btn className="btn btn-copper" busy="Publishing...">Publish these results</Btn>
              <span className="muted text-xs">Publishing creates the winners and can't be undone. Run the simulation again to draw new numbers.</span>
            </form>
          )}
          {pub?.error && <p className="error" role="alert">{pub.error}</p>}
        </section>
      )}
    </div>
  );
}
