import Link from 'next/link';
import { redirect } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { adminSignIn } from '@/app/actions/auth';
import { getSessionProfile } from '@/lib/auth';

export const metadata = { title: 'Admin sign in - Digital Heroes' };

// Lives OUTSIDE the (panel) group, so the admin layout's login check
// doesn't apply to it (otherwise it would redirect to itself forever).
export default async function AdminLoginPage() {
  const { profile } = await getSessionProfile();
  if (profile?.role === 'admin') redirect('/admin');

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <p className="text-sm text-copper">Admin console</p>
        <h1 className="mt-1 text-3xl font-semibold">Admin sign in</h1>
        <p className="muted mb-6 mt-2 text-sm">
          Restricted area. Accounts without admin rights are refused.
        </p>
        <AuthForm mode="admin" action={adminSignIn} />
        <Link href="/" className="muted mt-5 block text-center text-sm hover:text-cream">
          Back to the public site
        </Link>
      </div>
    </div>
  );
}
