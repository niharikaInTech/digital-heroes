import Link from 'next/link';
import AuthForm from '@/components/AuthForm';
import { signIn } from '@/app/actions/auth';

export const metadata = { title: 'Log in - Digital Heroes' };

export default function LoginPage({ searchParams }) {
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-3xl font-semibold">Welcome back</h1>
      <p className="muted mb-6 mt-2">Log in to update your scores and see your draws.</p>
      <AuthForm mode="login" action={signIn} next={searchParams?.next || ''} />
      <p className="muted mt-5 text-center text-sm">
        New here? <Link href="/signup" className="text-sage hover:text-cream">Create an account</Link>
      </p>
    </div>
  );
}
