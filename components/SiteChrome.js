'use client';

import { usePathname } from 'next/navigation';

// Wraps the public navbar/footer and hides them on admin pages,
// which have their own layout.
export default function SiteChrome({ children }) {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;
  return children;
}
