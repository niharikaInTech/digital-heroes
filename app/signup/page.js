import Link from 'next/link';
import AuthForm from '@/components/AuthForm';
import { signUp } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Create account - Digital Heroes' };

export default async function SignupPage() {
  const supabase = createClient();
  const { data, error } = await supabase.from('charities').select('id, name').order('name');
  const charities = data ?? [];

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-3xl font-semibold">Create your account</h1>
      <p className="muted mb-6 mt-2">Choose your charity now. Next you'll pick a plan.</p>

      {/* Say WHY the list is empty instead of failing silently */}
      {error && (
        <p className="error mb-5" role="alert">
          Couldn't load charities: {error.message}. Check the Supabase URL and key in .env.local, then restart the dev server.
        </p>
      )}
      {!error && charities.length === 0 && (
        <p className="error mb-5" role="alert">
          No charities found. Run supabase/schema.sql in the Supabase SQL Editor, or add a charity in the admin panel.
        </p>
      )}

      <AuthForm mode="signup" action={signUp} charities={charities} />
      <p className="muted mt-5 text-center text-sm">
        Already have an account? <Link href="/login" className="text-sage hover:text-cream">Log in</Link>
      </p>
    </div>
  );
}
