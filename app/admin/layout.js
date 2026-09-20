import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';

const tabs = [
  { href: '/admin', label: 'Reports' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/draws', label: 'Draws' },
  { href: '/admin/charities', label: 'Charities' },
  { href: '/admin/winners', label: 'Winners' },
];

// Every /admin page goes through this check first.
export default async function AdminLayout({ children }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="text-3xl font-semibold">Admin</h1>
      <nav className="mt-5 flex flex-wrap gap-2 border-b border-cream/10 pb-4" aria-label="Admin sections">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="badge badge-grey !px-4 !py-1.5 text-sm hover:bg-sage/20 hover:text-sage">
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-8">{children}</div>
    </div>
  );
}
