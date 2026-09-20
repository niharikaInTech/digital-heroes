'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { SCORE_MIN, SCORE_MAX, MAX_SCORES } from '@/lib/config';
import { fmtDate } from '@/lib/format';

function SubmitButton({ children, className = 'btn btn-primary' }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending}>
      {pending ? 'Saving...' : children}
    </button>
  );
}

// ---- Add a new score -------------------------------------------------
export function AddScoreForm({ action, disabled }) {
  const [state, formAction] = useFormState(action, { error: null, ok: false });
  const formRef = useRef(null);
  const today = new Date().toISOString().slice(0, 10);

  // clear the inputs after a successful save
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="score" className="label">Stableford score ({SCORE_MIN} to {SCORE_MAX})</label>
          <input id="score" name="score" type="number" min={SCORE_MIN} max={SCORE_MAX} step="1" className="field" required disabled={disabled} />
        </div>
        <div>
          <label htmlFor="played_on" className="label">Date played</label>
          <input id="played_on" name="played_on" type="date" max={today} className="field" required disabled={disabled} />
        </div>
        <SubmitButton className="btn btn-primary" >Add score</SubmitButton>
      </div>
      {state?.error && <p className="error" role="alert">{state.error}</p>}
    </form>
  );
}

// ---- One row: view / edit / delete -----------------------------------
// Used by both the user dashboard and the admin panel, so the actions
// are passed in as props. `userId` is only set in the admin panel.
export function ScoreRow({ item, updateAction, deleteAction, userId, disabled }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useFormState(updateAction, { error: null, ok: false });

  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  if (editing) {
    return (
      <li className="panel !p-4">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={item.id} />
          {userId && <input type="hidden" name="user_id" value={userId} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="score" type="number" min={SCORE_MIN} max={SCORE_MAX} defaultValue={item.score} className="field" aria-label="Score" required />
            <input name="played_on" type="date" defaultValue={item.played_on} className="field" aria-label="Date played" required />
          </div>
          {state?.error && <p className="error" role="alert">{state.error}</p>}
          <div className="flex gap-2">
            <SubmitButton className="btn btn-primary !py-1.5">Save changes</SubmitButton>
            <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost !py-1.5">Cancel</button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="panel flex items-center justify-between !p-4">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sage/15 text-xl font-semibold text-sage">
          {item.score}
        </span>
        <span className="muted text-sm">{fmtDate(item.played_on)}</span>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setEditing(true)} disabled={disabled} className="btn btn-ghost !px-3 !py-1">Edit</button>
        <form
          action={deleteAction}
          onSubmit={(e) => {
            if (!confirm('Delete this score?')) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={item.id} />
          {userId && <input type="hidden" name="user_id" value={userId} />}
          <button className="btn btn-danger !px-3 !py-1" disabled={disabled}>Delete</button>
        </form>
      </div>
    </li>
  );
}

// ---- The full list (newest first) ------------------------------------
export function ScoreList({ scores, updateAction, deleteAction, userId, disabled }) {
  if (scores.length === 0) {
    return <p className="muted text-sm">No scores yet. Add your latest round above to enter this month's draw.</p>;
  }
  return (
    <>
      <ul className="space-y-3">
        {scores.map((s) => (
          <ScoreRow key={s.id} item={s} updateAction={updateAction} deleteAction={deleteAction} userId={userId} disabled={disabled} />
        ))}
      </ul>
      <p className="muted mt-3 text-xs">
        {scores.length} of {MAX_SCORES} scores saved. Adding a sixth replaces the oldest.
      </p>
    </>
  );
}
