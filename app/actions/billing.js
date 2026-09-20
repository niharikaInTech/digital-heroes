'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth';
import { getStripe, siteUrl } from '@/lib/stripe';
import { MIN_DONATION, PLANS, PRIZE_POOL_PERCENT } from '@/lib/config';
import { isDemoPayments } from '@/lib/payments';

// DEMO MODE (default): no Stripe. The user sees a demo checkout page, then
// "Payment successful". Real Stripe is used only when USE_STRIPE=true.
const DEMO = isDemoPayments;

async function demoActivate(user, profile, plan) {
  const admin = createAdminClient();
  const end = new Date();
  end.setUTCMonth(end.getUTCMonth() + PLANS[plan].months);

  await admin
    .from('profiles')
    .update({ subscription_status: 'active', plan, current_period_end: end.toISOString() })
    .eq('id', user.id);

  // record the "payment" so the admin reports show charity totals
  const amount = PLANS[plan].price;
  await admin.from('payments').insert({
    user_id: user.id,
    charity_id: profile.charity_id,
    stripe_invoice_id: `demo_${user.id}_${Date.now()}`,
    amount,
    charity_amount: +((amount * profile.charity_percent) / 100).toFixed(2),
    prize_amount: +((amount * PRIZE_POOL_PERCENT) / 100).toFixed(2),
  });
}

const PRICE_IDS = () => ({
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  yearly: process.env.STRIPE_PRICE_YEARLY,
});

// Start a Stripe Checkout subscription for the logged-in user.
export async function startCheckout(formData) {
  const { user, profile } = await requireUser();
  const plan = String(formData.get('plan'));
  if (!PLANS[plan]) redirect('/subscribe?error=plan');

  if (DEMO()) redirect(`/subscribe/checkout?plan=${plan}`);

  const priceId = PRICE_IDS()[plan];
  if (!priceId) redirect('/subscribe?error=plan');

  const stripe = getStripe();
  const admin = createAdminClient();

  // Reuse the same Stripe customer every time.
  let customerId = profile.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile.full_name || undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl()}/dashboard?subscribed=1`,
    cancel_url: `${siteUrl()}/subscribe`,
    // the webhook reads this to know which user paid
    subscription_data: { metadata: { user_id: user.id, plan } },
    metadata: { user_id: user.id, plan },
  });

  redirect(session.url);
}

// Demo checkout: the "Pay" button on /subscribe/checkout. Nothing is charged.
export async function confirmDemoPayment(formData) {
  const { user, profile } = await requireUser();
  const plan = String(formData.get('plan'));
  if (!DEMO() || !PLANS[plan]) redirect('/subscribe');

  await demoActivate(user, profile, plan);
  redirect(`/subscribe/success?plan=${plan}`);
}

// Stripe-hosted page where the user can cancel or update their card.
export async function openBillingPortal() {
  const { user, profile } = await requireUser();

  if (DEMO()) {
    // demo cancel: takes effect immediately
    await createAdminClient()
      .from('profiles')
      .update({ subscription_status: 'canceled' })
      .eq('id', user.id);
    redirect('/dashboard');
  }

  if (!profile.stripe_customer_id) redirect('/subscribe');

  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${siteUrl()}/dashboard`,
  });
  redirect(session.url);
}

// One-off donation, not linked to gameplay (PRD 08.1). Visitors can donate too.
export async function donate(formData) {
  const charityId = String(formData.get('charity_id'));
  const amount = Math.round(Number(formData.get('amount')));
  if (!amount || amount < MIN_DONATION) {
    redirect(`/charities/${charityId}?error=amount`);
  }

  const supabase = createClient();
  const { data: charity } = await supabase
    .from('charities')
    .select('id, name')
    .eq('id', charityId)
    .single();
  if (!charity) redirect('/charities');

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (DEMO()) {
    await createAdminClient().from('donations').insert({
      charity_id: charity.id,
      donor_id: user?.id ?? null,
      amount,
      stripe_session_id: `demo_${Date.now()}`,
    });
    redirect(`/charities/${charity.id}?thanks=1`);
  }

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'inr',
          unit_amount: amount * 100, // Stripe uses the smallest unit (paise)
          product_data: { name: `Donation to ${charity.name}` },
        },
        quantity: 1,
      },
    ],
    success_url: `${siteUrl()}/charities/${charity.id}?thanks=1`,
    cancel_url: `${siteUrl()}/charities/${charity.id}`,
    metadata: { type: 'donation', charity_id: charity.id, donor_id: user?.id ?? '' },
  });

  redirect(session.url);
}
