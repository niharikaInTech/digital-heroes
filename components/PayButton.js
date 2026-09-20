'use client';

import { useFormStatus } from 'react-dom';

// Submit button that shows "Processing..." while the server action runs.
export default function PayButton({ children }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-copper w-full !py-3 text-base" disabled={pending}>
      {pending ? 'Processing payment...' : children}
    </button>
  );
}
