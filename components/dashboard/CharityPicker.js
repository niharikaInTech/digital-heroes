'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { MIN_CHARITY_PERCENT, MAX_CHARITY_PERCENT, monthlyFee } from '@/lib/config';
import { inr } from '@/lib/format';

function Save() {
  const { pending } = useFormStatus();
  return <button className="btn btn-primary" disabled={pending}>{pending ? 'Saving...' : 'Save charity'}</button>;
}

export default function CharityPicker({ action, charities, currentId, currentPercent, plan }) {
  const [state, formAction] = useFormState(action, { error: null, ok: false });
  const [percent, setPercent] = useState(currentPercent);
  const perMonth = (monthlyFee(plan) * percent) / 100;

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="charity_id" className="label">Charity</label>
        <select id="charity_id" name="charity_id" defaultValue={currentId ?? ''} className="field" required>
          <option value="" disabled>Choose a charity</option>
          {charities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="pct" className="label">Share of your fee: <span className="text-cream">{percent}%</span></label>
        <input
          id="pct" name="charity_percent" type="range"
          min={MIN_CHARITY_PERCENT} max={MAX_CHARITY_PERCENT} value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
          className="w-full accent-[#6b9e78]"
        />
        <p className="muted mt-1 text-xs">About {inr(perMonth)} a month goes to your charity.</p>
      </div>
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      {state?.ok && <p className="success" role="status">Charity saved.</p>}
      <Save />
    </form>
  );
}
