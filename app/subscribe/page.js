import { requireUser, isActive } from '@/lib/auth';
import { startCheckout } from '@/app/actions/billing';
import { PLANS, monthlyFee } from '@/lib/config';
import { inr } from '@/lib/format';
import Link from 'next/link';
import { isDemoPayments } from '@/lib/payments';

export const metadata = { title: 'Choose a plan - Digital Heroes' };

export default async function SubscribePage({ searchParams }) {
  const { profile } = await requireUser();
  const active = isActive(profile);
  const saving = PLANS.monthly.price * 12 - PLANS.yearly.price;

  const plans = [
    { ...PLANS.monthly, per: 'per month', note: 'Cancel any time.' },
    { ...PLANS.yearly, per: 'per year', note: `Save ${inr(saving)} a year (about ${inr(monthlyFee('yearly'))} a month).`, best: true },
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-3xl font-semibold sm:text-4xl">Choose your plan</h1>
      <p className="muted mt-3">
        {profile.charities?.name
          ? `${profile.charity_percent}% of your fee goes to ${profile.charities.name}.`
          : 'Pick a charity from your dashboard after subscribing.'}
      </p>

      {isDemoPayments() && (
        <p className="success mt-6" role="status">Demo checkout: no card is needed and no money is charged.</p>
      )}

      {searchParams?.error && (
        <p className="error mt-6" role="alert">That plan isn't available yet. Check the Stripe price IDs in your environment variables.</p>
      )}

      {active ? (
        <div className="panel mt-8">
          <p>Your subscription is already active.</p>
          <Link href="/dashboard" className="btn btn-primary mt-4">Go to dashboard</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {plans.map((p) => (
            <form key={p.id} action={startCheckout} className={`panel flex flex-col ${p.best ? '!border-copper' : ''}`}>
              <input type="hidden" name="plan" value={p.id} />
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{p.label}</h2>
                {p.best && <span className="badge badge-copper">Best value</span>}
              </div>
              <p className="mt-4 text-4xl font-semibold">{inr(p.price)}</p>
              <p className="muted text-sm">{p.per}</p>
              <p className="muted mt-4 flex-1 text-sm">{p.note}</p>
              <button className={`btn mt-6 ${p.best ? 'btn-copper' : 'btn-primary'}`}>Subscribe {p.label.toLowerCase()}</button>
            </form>
          ))}
        </div>
      )}
      <p className="muted mt-6 text-xs">
        {isDemoPayments()
          ? 'This is a demo. Choosing a plan takes you to a practice checkout.'
          : 'Payments are handled securely by Stripe. We never see your card details.'}
      </p>
    </div>
  );
}
