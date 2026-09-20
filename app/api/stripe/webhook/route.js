import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { PRIZE_POOL_PERCENT } from '@/lib/config';

export const runtime = 'nodejs';

// Stripe -> our database. This is the ONLY place subscription state changes,
// so the app never trusts the browser about who has paid.

const STATUS_MAP = {
  active: 'active',
  trialing: 'active',
  past_due: 'past_due',
  unpaid: 'past_due',
  canceled: 'canceled',
  incomplete_expired: 'canceled',
};

async function syncSubscription(admin, sub) {
  const item = sub.items?.data?.[0];
  // Newer Stripe API versions moved current_period_end onto the item.
  const periodEnd = sub.current_period_end ?? item?.current_period_end;
  const plan = item?.price?.id === process.env.STRIPE_PRICE_YEARLY ? 'yearly' : 'monthly';

  const patch = {
    subscription_status: STATUS_MAP[sub.status] ?? 'inactive',
    plan,
    stripe_subscription_id: sub.id,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  };

  const userId = sub.metadata?.user_id;
  const query = admin.from('profiles').update(patch);
  const { error } = userId
    ? await query.eq('id', userId)
    : await query.eq('stripe_customer_id', sub.customer);
  if (error) throw error;
}

// Every paid invoice is split into charity / prize pool for the reports.
async function recordPayment(admin, invoice) {
  const { data: profile } = await admin
    .from('profiles')
    .select('id, charity_id, charity_percent')
    .eq('stripe_customer_id', invoice.customer)
    .single();
  if (!profile) return;

  const amount = invoice.amount_paid / 100;
  const { error } = await admin.from('payments').upsert(
    {
      user_id: profile.id,
      charity_id: profile.charity_id,
      stripe_invoice_id: invoice.id,
      amount,
      charity_amount: +((amount * profile.charity_percent) / 100).toFixed(2),
      prize_amount: +((amount * PRIZE_POOL_PERCENT) / 100).toFixed(2),
    },
    { onConflict: 'stripe_invoice_id', ignoreDuplicates: true } // Stripe may retry
  );
  if (error) throw error;
}

export async function POST(request) {
  const stripe = getStripe();
  const body = await request.text(); // raw body is needed to verify the signature
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object;
        if (s.mode === 'subscription') {
          const sub = await stripe.subscriptions.retrieve(s.subscription);
          await syncSubscription(admin, sub);
        }
        if (s.mode === 'payment' && s.metadata?.type === 'donation') {
          await admin.from('donations').upsert(
            {
              charity_id: s.metadata.charity_id,
              donor_id: s.metadata.donor_id || null,
              amount: s.amount_total / 100,
              stripe_session_id: s.id,
            },
            { onConflict: 'stripe_session_id', ignoreDuplicates: true }
          );
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(admin, event.data.object);
        break;
      case 'invoice.paid':
        await recordPayment(admin, event.data.object);
        break;
      default:
        break; // ignore events we don't care about
    }
  } catch (err) {
    console.error('Webhook handler failed', event.type, err);
    return new Response('Handler error', { status: 500 }); // Stripe will retry
  }

  return Response.json({ received: true });
}
