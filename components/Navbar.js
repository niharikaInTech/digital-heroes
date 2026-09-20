import Link from 'next/link';
import { getSessionProfile } from '@/lib/auth';
import { signOut } from '@/app/actions/auth';

export default async function Navbar() {
  const { user, profile } = await getSessionProfile();

  return (
    <header className="sticky top-0 z-40 border-b border-cream/10 bg-ink/85 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          digital.<span className="font-serif text-xl italic text-sage">Heroes</span>.
        </Link>

        <div className="flex items-center gap-4 text-sm sm:gap-6">
          <Link href="/charities" className="hover:text-sage">Charities</Link>
          <Link href="/#how" className="hidden hover:text-sage sm:inline">How it works</Link>
          {profile?.role === 'admin' && (
            <Link href="/admin" className="text-copper hover:text-cream">Admin</Link>
          )}
          {user ? (
            <>
              <Link href="/dashboard" className="hover:text-sage">Dashboard</Link>
              <form action={signOut}>
                <button className="btn btn-ghost !px-4 !py-1.5">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-sage">Log in</Link>
              <Link href="/signup" className="btn btn-primary !px-4 !py-1.5">Subscribe</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
