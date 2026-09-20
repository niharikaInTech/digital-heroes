import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-cream/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-cream/60 sm:flex-row sm:items-center sm:justify-between">
        <p>digital.Heroes. Sample assignment build, 2026.</p>
        <div className="flex gap-5">
          <Link href="/charities" className="hover:text-cream">Charities</Link>
          <Link href="/signup" className="hover:text-cream">Subscribe</Link>
          <Link href="/login" className="hover:text-cream">Log in</Link>
          <Link href="/admin/login" className="hover:text-cream">Admin</Link>
        </div>
      </div>
    </footer>
  );
}
