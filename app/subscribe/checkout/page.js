import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser, isActive } from '@/lib/auth';
import { confirmDemoPayment } from '@/app/actions/billing';
import { isDemoPayments } from '@/lib/payments';
import { PLANS, PRIZE_POOL_PERCENT } from '@/lib/config';
import { inr } from '@/lib/format';
import PayButton from '@/components/PayButton';

export const metadata = { title: 'Checkout - Digital Heroes' };

// Demo checkout. It asks for no card details on purpose.
export default async function DemoCheckout({ searchParams }) {
  const { profile } = await requireUser();
  const plan = PLANS[searchParams?.plan];
  if (!plan || !isDemoPayments()) redirect('/subscribe');
  if (isActive(profile)) redirect('/dashboard');

  const charity = (plan.price * profile.charity_percent) / 100;
  const prize = (plan.price * PRIZE_POOL_PERCENT) / 100;
  const platform = plan.price - charity - prize;

  return (
    <div className="mx-auto max-w-lg px-5 py-16">
      <Link href="/subscribe" className="text-sm text-sage hover:text-cream">Change plan</Link>
      <h1 className="mt-4 text-3xl font-semibold">Confirm your subscription</h1>

      <p className="success mt-5" role="status">
        Demo checkout. No card is needed and no money is charged.
      </p>

      <div className="panel mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">{plan.label} plan</h2>
          <p className="text-2xl font-semibold">{inr(plan.price)}</p>
        </div>
        <p className="muted text-sm">Billed {plan.id === 'yearly' ? 'once a year' : 'every month'}.</p>

        <ul className="mt-5 space-y-2 border-t border-cream/10 pt-5 text-sm">
          <li className="flex justify-between">
            <span>{profile.charities?.name ?? 'Your charity'} ({profile.charity_percent}%)</span>
            <span className="tabular-nums text-sage">{inr(charity)}</span>
          </li>
          <li className="flex justify-between">
            <span>Prize pool ({PRIZE_POOL_PERCENT}%)</span>
            <span className="tabular-nums text-copper">{inr(prize)}</span>
          </li>
          <li className="flex justify-between">
            <span className="muted">Running the platform</span>
            <span className="muted tabular-nums">{inr(platform)}</span>
          </li>
        </ul>

        <form action={confirmDemoPayment} className="mt-6">
          <input type="hidden" name="plan" value={plan.id} />
          <PayButton>Pay {inr(plan.price)} (demo)</PayButton>
        </form>
      </div>
    </div>
  );
}
