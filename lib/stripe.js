import Stripe from 'stripe';

// Created on demand so `next build` doesn't crash when env vars are missing.
export function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
