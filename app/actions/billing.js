'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth';
import { getStripe, siteUrl } from '@/lib/stripe';
import { MIN_DONATION } from '@/lib/config';

const PRICE_IDS = () => ({
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  yearly: process.env.STRIPE_PRICE_YEARLY,
});

// Start a Stripe Checkout subscription for the logged-in user.
export async function startCheckout(formData) {
  const { user, profile } = await requireUser();
  const plan = String(formData.get('plan'));
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

// Stripe-hosted page where the user can cancel or update their card.
export async function openBillingPortal() {
  const { profile } = await requireUser();
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
