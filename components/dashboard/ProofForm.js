'use client';

import { useFormState, useFormStatus } from 'react-dom';

function Send() {
  const { pending } = useFormStatus();
  return <button className="btn btn-copper !py-1.5" disabled={pending}>{pending ? 'Uploading...' : 'Upload proof'}</button>;
}

// Winner uploads a screenshot of their golf-platform scores.
export default function ProofForm({ action, winnerId }) {
  const [state, formAction] = useFormState(action, { error: null, ok: false });
  return (
    <form action={formAction} className="mt-3 space-y-2">
      <input type="hidden" name="winner_id" value={winnerId} />
      <input
        name="proof" type="file" accept="image/*" required
        className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-cream/10 file:px-4 file:py-1.5 file:text-cream"
        aria-label="Screenshot of your scores"
      />
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <Send />
    </form>
  );
}
