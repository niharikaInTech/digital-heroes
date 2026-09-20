'use client';

import { useState } from 'react';
import {
  PLANS,
  MIN_CHARITY_PERCENT,
  MAX_CHARITY_PERCENT,
  PRIZE_POOL_PERCENT,
} from '@/lib/config';
import { inr } from '@/lib/format';

// The hero's interactive moment: drag the slider and see where a fee goes.
export default function SplitDemo() {
  const [percent, setPercent] = useState(20);
  const fee = PLANS.monthly.price;
  const charity = (fee * percent) / 100;
  const prize = (fee * PRIZE_POOL_PERCENT) / 100;
  const platform = fee - charity - prize;

  const rows = [
    { label: 'Your charity', value: charity, pct: percent, bar: 'bg-sage' },
    { label: 'Monthly prize pool', value: prize, pct: PRIZE_POOL_PERCENT, bar: 'bg-copper' },
    { label: 'Running the platform', value: platform, pct: 100 - percent - PRIZE_POOL_PERCENT, bar: 'bg-cream/40' },
  ];

  return (
    <div className="panel">
      <p className="muted text-sm">Where a {inr(fee)} monthly fee goes</p>

      <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-ink" aria-hidden="true">
        {rows.map((r) => (
          <div
            key={r.label}
            className={`${r.bar} transition-[width] duration-300 ease-out`}
            style={{ width: `${r.pct}%` }}
          />
        ))}
      </div>

      <ul className="mt-5 space-y-3">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${r.bar}`} />
              {r.label}
            </span>
            <span className="tabular-nums">{inr(r.value)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <label htmlFor="split" className="label">
          Share to your charity: <span className="text-cream">{percent}%</span>
        </label>
        <input
          id="split"
          type="range"
          min={MIN_CHARITY_PERCENT}
          max={MAX_CHARITY_PERCENT}
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
          className="w-full accent-[#6b9e78]"
        />
        <p className="muted mt-1 text-xs">The minimum is {MIN_CHARITY_PERCENT}%. You can raise it any time.</p>
      </div>
    </div>
  );
}
