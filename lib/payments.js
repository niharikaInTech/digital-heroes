// Payments run in DEMO mode by default: a demo checkout page, then a
// "Payment successful" page. No Stripe account and no env variable needed.
// To use real Stripe (test mode), set USE_STRIPE=true and add the Stripe keys.
export const isDemoPayments = () => process.env.USE_STRIPE !== 'true';
