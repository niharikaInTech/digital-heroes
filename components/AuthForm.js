'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { MIN_CHARITY_PERCENT, MAX_CHARITY_PERCENT } from '@/lib/config';

function Submit({ children }) {
  const { pending } = useFormStatus(); // true while the server action runs
  return (
    <button className="btn btn-primary w-full !py-3" disabled={pending}>
      {pending ? 'Please wait...' : children}
    </button>
  );
}

// One form for both login and signup.
export default function AuthForm({ mode, action, charities = [], next = '' }) {
  const [state, formAction] = useFormState(action, { error: null, message: null });
  const [percent, setPercent] = useState(MIN_CHARITY_PERCENT);
  const isSignup = mode === 'signup';

  return (
    <form action={formAction} className="panel space-y-4">
      <input type="hidden" name="next" value={next} />

      {isSignup && (
        <div>
          <label htmlFor="full_name" className="label">Full name</label>
          <input id="full_name" name="full_name" className="field" autoComplete="name" required />
        </div>
      )}

      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" className="field" autoComplete="email" required />
      </div>

      <div>
        <label htmlFor="password" className="label">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          minLength={isSignup ? 8 : undefined}
          className="field"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          required
        />
        {isSignup && <p className="muted mt-1 text-xs">At least 8 characters.</p>}
      </div>

      {isSignup && (
        <>
          <div>
            <label htmlFor="charity_id" className="label">Charity you want to support</label>
            <select id="charity_id" name="charity_id" className="field" defaultValue="" required>
              <option value="" disabled>Choose a charity</option>
              {charities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="charity_percent" className="label">
              Share of your fee to charity: <span className="text-cream">{percent}%</span>
            </label>
            <input
              id="charity_percent"
              name="charity_percent"
              type="range"
              min={MIN_CHARITY_PERCENT}
              max={MAX_CHARITY_PERCENT}
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
              className="w-full accent-[#6b9e78]"
            />
          </div>
        </>
      )}

      {state?.error && <p className="error" role="alert">{state.error}</p>}
      {state?.message && <p className="success" role="status">{state.message}</p>}

      <Submit>{isSignup ? 'Create account' : 'Log in'}</Submit>
    </form>
  );
}
