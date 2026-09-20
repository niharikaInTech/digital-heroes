import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser, isActive } from '@/lib/auth';
import { PLANS } from '@/lib/config';
import { fmtDate, inr } from '@/lib/format';

export const metadata = { title: 'Payment successful - Digital Heroes' };

export default async function PaymentSuccess() {
  const { profile } = await requireUser();
  // Someone opening this URL without paying must not see a fake success.
  if (!isActive(profile) || !PLANS[profile.plan]) redirect('/subscribe');

  const plan = PLANS[profile.plan];
  const charity = (plan.price * profile.charity_percent) / 100;

  return (
    <div className="mx-auto max-w-lg px-5 py-20 text-center">
      <div className="rise mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sage/20">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6b9e78" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>

      <h1 className="rise mt-6 text-4xl font-semibold" style={{ animationDelay: '100ms' }}>Payment successful</h1>
      <p className="rise muted mt-3" style={{ animationDelay: '180ms' }}>
        Your subscription is active. This was a demo payment, so no money was charged.
      </p>

      <dl className="rise panel mt-8 space-y-3 text-left text-sm" style={{ animationDelay: '260ms' }}>
        <div className="flex justify-between"><dt className="muted">Plan</dt><dd>{plan.label}</dd></div>
        <div className="flex justify-between"><dt className="muted">Amount</dt><dd>{inr(plan.price)}</dd></div>
        <div className="flex justify-between"><dt className="muted">Renews on</dt><dd>{fmtDate(profile.current_period_end)}</dd></div>
        <div className="flex justify-between">
          <dt className="muted">Given to {profile.charities?.name ?? 'your charity'}</dt>
          <dd className="text-sage">{inr(charity)}</dd>
        </div>
      </dl>

      <Link href="/dashboard" className="btn btn-primary mt-8 !px-8 !py-3 text-base">Go to your dashboard</Link>
      <p className="muted mt-4 text-sm">Next step: add your latest golf scores to enter this month's draw.</p>
    </div>
  );
}
