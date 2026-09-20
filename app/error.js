'use client';

// Shown when something unexpected crashes a page.
export default function Error({ reset }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="text-3xl font-semibold">Something went wrong</h1>
      <p className="muted mt-3">The page couldn't load. Try again, and if it keeps happening, come back in a few minutes.</p>
      <button onClick={reset} className="btn btn-primary mt-6">Try again</button>
    </div>
  );
}
