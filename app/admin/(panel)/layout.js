import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { adminSignOut } from '@/app/actions/auth';
import AdminNav from '@/components/admin/AdminNav';

// The admin area is its own app shell: sidebar, no public navbar or footer.
// requireAdmin() runs for every page inside this group.
export default async function AdminLayout({ children }) {
  const { profile } = await requireAdmin();

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-copper/20 bg-forest/40 p-5 md:min-h-screen md:border-b-0 md:border-r">
        <Link href="/admin" className="text-lg font-semibold tracking-tight">
          digital.<span className="font-serif text-xl italic text-sage">Heroes</span>.
        </Link>
        <p className="mt-1 text-xs text-copper">Admin console</p>

        <AdminNav />

        <div className="mt-6 space-y-3 md:mt-10">
          <p className="muted hidden truncate text-xs md:block">{profile.email}</p>
          <Link href="/" className="block text-sm text-sage hover:text-cream">View public site</Link>
          <form action={adminSignOut}>
            <button className="btn btn-ghost w-full !py-1.5">Sign out</button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 p-6 md:p-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </div>
    </div>
  );
}
