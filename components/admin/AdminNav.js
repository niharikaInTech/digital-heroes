'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/admin', label: 'Reports' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/draws', label: 'Draws' },
  { href: '/admin/charities', label: 'Charities' },
  { href: '/admin/winners', label: 'Winners' },
];

// Sidebar links with the current section highlighted.
export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin sections" className="mt-6 flex gap-1 overflow-x-auto md:flex-col">
      {tabs.map((t) => {
        const active = t.href === '/admin' ? pathname === '/admin' : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
              active ? 'bg-copper/20 text-copper' : 'text-cream/75 hover:bg-cream/10'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
